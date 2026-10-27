import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import normalize_database_url
from app.database import get_db
from app.main import app
from app.models import Channel, RssSource
from app.repositories import NewsCaptureRepository
from app.seeds.geography import load_catalog, seed_geography


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
    assert {"canal", "fuente_rss"} <= set(
        inspect(database_engine).get_table_names()
    )
    with Session(database_engine) as session:
        seed_geography(session, load_catalog())
    yield database_engine
    database_engine.dispose()


@pytest.fixture()
def client(engine):
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE fuente_rss, canal RESTART IDENTITY CASCADE"))

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
            connection.execute(
                text("TRUNCATE fuente_rss, canal RESTART IDENTITY CASCADE")
            )


def create_channel_with_source(
    client: TestClient,
    *,
    name: str = "Agencia Chile",
    country: str = "cl",
    source_active: bool = True,
) -> dict[str, object]:
    response = client.post(
        "/api/v1/sources",
        json={
            "channel": {
                "nombre": name,
                "continente": "Europa" if country.upper() in {"ES", "PT"} else "America",
                "pais": country,
                "url_sitio": "https://example.com",
                "activo": True,
            },
            "sources": [
                {
                    "nombre": "Portada",
                    "url_feed": f"https://example.com/{name.lower().replace(' ', '-')}.xml",
                    "categoria_iptc": "politics",
                    "idioma": "es",
                    "activa": source_active,
                }
            ],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_channel_crud_filters_and_logical_deactivation(client, engine) -> None:
    first = create_channel_with_source(client)
    second = create_channel_with_source(
        client,
        name="Agencia España",
        country="es",
    )
    first_id = first["channel"]["id_canal"]
    second_id = second["channel"]["id_canal"]
    first_created_at = first["channel"]["fecha_alta"]

    listing = client.get("/api/v1/channels")
    assert listing.status_code == 200
    assert [item["id_canal"] for item in listing.json()] == [first_id, second_id]
    assert client.get(
        "/api/v1/channels",
        params={"continent": "America", "country": "cl", "active": True},
    ).json() == [first["channel"]]
    assert client.get(f"/api/v1/channels/{first_id}").json() == first["channel"]

    replaced = client.put(
        f"/api/v1/channels/{first_id}",
        json={
            "nombre": "Agencia renovada",
            "continente": "Europa",
            "pais": "pt",
            "url_sitio": "https://renovada.example.com",
            "activo": False,
        },
    )
    assert replaced.status_code == 200
    assert replaced.json()["id_canal"] == first_id
    assert replaced.json()["fecha_alta"] == first_created_at
    assert replaced.json()["pais"] == "PT"

    cleared = client.patch(
        f"/api/v1/channels/{first_id}",
        json={"pais": None, "url_sitio": None, "activo": True},
    )
    assert cleared.status_code == 200
    assert cleared.json()["pais"] is None
    assert cleared.json()["url_sitio"] is None

    duplicate = client.patch(
        f"/api/v1/channels/{first_id}",
        json={"nombre": second["channel"]["nombre"]},
    )
    assert duplicate.status_code == 400
    assert client.patch(f"/api/v1/channels/{first_id}", json={}).status_code == 400
    assert client.patch(
        f"/api/v1/channels/{first_id}", json={"nombre": None}
    ).status_code == 400
    assert client.get("/api/v1/channels/999").status_code == 404
    assert client.put(
        "/api/v1/channels/999",
        json={
            "nombre": "Inexistente",
            "continente": "Asia",
            "pais": None,
            "url_sitio": None,
            "activo": True,
        },
    ).status_code == 404

    deleted = client.delete(f"/api/v1/channels/{first_id}")
    repeated = client.delete(f"/api/v1/channels/{first_id}")
    assert deleted.status_code == repeated.status_code == 204
    assert deleted.content == repeated.content == b""
    with Session(engine) as session:
        channel = session.get(Channel, first_id)
        source = session.scalar(
            select(RssSource).where(RssSource.id_canal == first_id)
        )
        assert channel is not None and channel.activo is False
        assert source is not None and source.activa is True


def test_channel_state_controls_capture_without_changing_source_state(
    client,
    engine,
) -> None:
    created = create_channel_with_source(client)
    channel_id = created["channel"]["id_canal"]
    source_id = created["sources"][0]["id_fuente"]

    assert client.delete(f"/api/v1/channels/{channel_id}").status_code == 204
    with Session(engine) as session:
        assert NewsCaptureRepository(session).list_active_sources() == []
        assert session.get(RssSource, source_id).activa is True

    reactivated = client.patch(
        f"/api/v1/channels/{channel_id}", json={"activo": True}
    )
    assert reactivated.status_code == 200
    with Session(engine) as session:
        eligible = NewsCaptureRepository(session).list_active_sources()
        assert [source.id_fuente for source in eligible] == [source_id]

    assert client.patch(
        f"/api/v1/sources/{source_id}", json={"activa": False}
    ).status_code == 200
    assert client.delete(f"/api/v1/channels/{channel_id}").status_code == 204
    assert client.patch(
        f"/api/v1/channels/{channel_id}", json={"activo": True}
    ).status_code == 200
    with Session(engine) as session:
        assert NewsCaptureRepository(session).list_active_sources() == []
        assert session.get(RssSource, source_id).activa is False
