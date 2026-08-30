import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.config import normalize_database_url
from app.database import get_db
from app.main import app
from app.services.configuration import CAPTURE_PERIODICITY_KEY

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def database_url() -> str:
    value = os.getenv("DATABASE_URL")
    if not value:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    normalized = normalize_database_url(value)
    if not normalized.startswith("postgresql+psycopg://"):
        pytest.fail("Integration tests require PostgreSQL with psycopg 3")
    return normalized


@pytest.fixture(scope="module")
def engine(database_url: str):
    database_engine = create_engine(database_url, pool_pre_ping=True)
    with database_engine.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
    assert "configuracion" in set(inspect(database_engine).get_table_names())
    yield database_engine
    database_engine.dispose()


@pytest.fixture()
def client(engine):
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE configuracion"))

    def override_db():
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        with engine.begin() as connection:
            connection.execute(text("TRUNCATE configuracion"))


def test_get_config_returns_default_on_clean_database(client) -> None:
    response = client.get("/api/v1/config")
    assert response.status_code == 200
    assert response.json() == {"captura_periodicidad_minutos": 60}


def test_put_config_persists_and_next_get_returns_value(client, engine) -> None:
    updated = client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 30},
    )
    assert updated.status_code == 200
    assert updated.json() == {"captura_periodicidad_minutos": 30}

    persisted = client.get("/api/v1/config")
    assert persisted.status_code == 200
    assert persisted.json() == {"captura_periodicidad_minutos": 30}

    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT clave, valor, tipo, descripcion, fecha_modificacion "
                "FROM configuracion WHERE clave = :key"
            ),
            {"key": CAPTURE_PERIODICITY_KEY},
        ).one()
    assert row.clave == CAPTURE_PERIODICITY_KEY
    assert row.valor == "30"
    assert row.tipo == "entero"
    assert row.descripcion
    assert row.fecha_modificacion is not None


def test_put_config_replaces_existing_value_without_duplicate(client, engine) -> None:
    assert client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 20},
    ).status_code == 200
    assert client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 25},
    ).status_code == 200

    with engine.connect() as connection:
        count = connection.scalar(text("SELECT count(*) FROM configuracion"))
    assert count == 1
    assert client.get("/api/v1/config").json() == {"captura_periodicidad_minutos": 25}


@pytest.mark.parametrize(
    "payload",
    [
        {"captura_periodicidad_minutos": 0},
        {"captura_periodicidad_minutos": -1},
        {},
        {"captura_periodicidad_minutos": "treinta"},
        {"captura_periodicidad_minutos": "30"},
    ],
)
def test_put_config_rejects_invalid_payload_without_changing_previous_value(
    client,
    payload: dict[str, object],
) -> None:
    assert client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 12},
    ).status_code == 200

    response = client.put("/api/v1/config", json=payload)
    assert response.status_code == 400
    assert client.get("/api/v1/config").json() == {"captura_periodicidad_minutos": 12}
