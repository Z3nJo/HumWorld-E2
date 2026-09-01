import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.config import normalize_database_url
from app.database import get_db
from app.main import app
from app.services.configuration import CAPTURE_PERIODICITY_KEY, NEWS_RETENTION_KEY

pytestmark = pytest.mark.integration


class FakeCaptureSchedule:
    def __init__(self) -> None:
        self.periodicities: list[int] = []

    def reschedule(self, periodicity_minutes: int) -> None:
        self.periodicities.append(periodicity_minutes)


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
    assert response.json() == {
        "captura_periodicidad_minutos": 60,
        "noticias_caducidad_dias": 30,
    }


def test_put_config_persists_and_next_get_returns_value(client, engine) -> None:
    updated = client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 30, "noticias_caducidad_dias": 45},
    )
    assert updated.status_code == 200
    assert updated.json() == {
        "captura_periodicidad_minutos": 30,
        "noticias_caducidad_dias": 45,
    }

    persisted = client.get("/api/v1/config")
    assert persisted.status_code == 200
    assert persisted.json() == {
        "captura_periodicidad_minutos": 30,
        "noticias_caducidad_dias": 45,
    }

    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT clave, valor, tipo, descripcion, fecha_modificacion "
                "FROM configuracion ORDER BY clave"
            )
        ).all()
    by_key = {row.clave: row for row in rows}
    assert by_key[CAPTURE_PERIODICITY_KEY].valor == "30"
    assert by_key[NEWS_RETENTION_KEY].valor == "45"
    assert all(row.tipo == "entero" for row in rows)
    assert all(row.descripcion for row in rows)
    assert all(row.fecha_modificacion is not None for row in rows)


def test_put_config_replaces_existing_value_without_duplicate(client, engine) -> None:
    assert client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 20, "noticias_caducidad_dias": 10},
    ).status_code == 200
    assert client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 25, "noticias_caducidad_dias": 15},
    ).status_code == 200

    with engine.connect() as connection:
        count = connection.scalar(text("SELECT count(*) FROM configuracion"))
    assert count == 2
    assert client.get("/api/v1/config").json() == {
        "captura_periodicidad_minutos": 25,
        "noticias_caducidad_dias": 15,
    }


def test_put_config_reprograms_active_scheduler_without_restart(client) -> None:
    schedule = FakeCaptureSchedule()
    app.state.capture_scheduler = schedule
    response = client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 7, "noticias_caducidad_dias": 30},
    )
    assert response.status_code == 200
    assert schedule.periodicities == [7]


@pytest.mark.parametrize(
    "payload",
    [
        {"captura_periodicidad_minutos": 0},
        {"captura_periodicidad_minutos": -1},
        {"captura_periodicidad_minutos": 12},
        {"captura_periodicidad_minutos": 12, "noticias_caducidad_dias": 0},
        {"captura_periodicidad_minutos": 12, "noticias_caducidad_dias": -1},
        {},
        {"captura_periodicidad_minutos": "treinta"},
        {"captura_periodicidad_minutos": "30"},
        {"captura_periodicidad_minutos": 12, "noticias_caducidad_dias": "30"},
    ],
)
def test_put_config_rejects_invalid_payload_without_changing_previous_values(
    client,
    payload: dict[str, object],
) -> None:
    assert client.put(
        "/api/v1/config",
        json={"captura_periodicidad_minutos": 12, "noticias_caducidad_dias": 20},
    ).status_code == 200

    response = client.put("/api/v1/config", json=payload)
    assert response.status_code == 400
    assert client.get("/api/v1/config").json() == {
        "captura_periodicidad_minutos": 12,
        "noticias_caducidad_dias": 20,
    }
