import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import normalize_database_url
from app.database import get_db
from app.main import app

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
    assert {"canal", "fuente_rss"} <= set(inspect(database_engine).get_table_names())
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
            connection.execute(text("TRUNCATE fuente_rss, canal RESTART IDENTITY CASCADE"))


def new_channel_payload() -> dict[str, object]:
    return {
        "channel": {"nombre": "Agencia Mundo", "continente": "America"},
        "sources": [
            {
                "nombre": "Portada",
                "url_feed": "https://example.com/main.xml",
                "categoria_iptc": "politics",
                "idioma": "es",
            },
            {
                "nombre": "Deportes",
                "url_feed": "https://example.com/sports.xml",
                "categoria_iptc": "sport",
                "idioma": "en",
                "activa": False,
            },
        ],
    }


def test_full_crud_filters_existing_channel_and_persistence(client, engine) -> None:
    created = client.post("/api/v1/sources", json=new_channel_payload())
    assert created.status_code == 201, created.text
    body = created.json()
    channel_id = body["channel"]["id_canal"]
    first_id = body["sources"][0]["id_fuente"]
    original_channel_id = body["sources"][0]["id_canal"]
    assert len(body["sources"]) == 2

    added = client.post(
        "/api/v1/sources",
        json={
            "channel_id": channel_id,
            "sources": [
                {
                    "nombre": "Ciencia",
                    "url_feed": "https://example.com/science.xml",
                    "categoria_iptc": "science/technology",
                    "idioma": "es",
                }
            ],
        },
    )
    assert added.status_code == 201
    assert added.json()["channel"]["id_canal"] == channel_id

    listing = client.get("/api/v1/sources", params={"continent": "America", "active": True})
    assert listing.status_code == 200
    assert len(listing.json()) == 2

    detail = client.get(f"/api/v1/sources/{first_id}")
    assert detail.status_code == 200
    assert detail.json()["canal"]["continente"] == "America"

    replaced = client.put(
        f"/api/v1/sources/{first_id}",
        json={
            "nombre": "Portada global",
            "url_feed": "https://example.com/global.xml",
            "categoria_iptc": "economy/business/finance",
            "idioma": "en",
            "activa": True,
        },
    )
    assert replaced.status_code == 200
    assert replaced.json()["id_canal"] == original_channel_id

    patched = client.patch(
        f"/api/v1/sources/{first_id}",
        json={"activa": False},
    )
    assert patched.status_code == 200
    assert patched.json()["nombre"] == "Portada global"
    assert patched.json()["id_canal"] == original_channel_id

    with TestClient(app) as restarted_client:
        persisted = restarted_client.get(f"/api/v1/sources/{first_id}")
    assert persisted.status_code == 200
    assert persisted.json()["nombre"] == "Portada global"

    deleted = client.delete(f"/api/v1/sources/{first_id}")
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get(f"/api/v1/sources/{first_id}").status_code == 404
    with Session(engine) as session:
        assert session.scalar(
            text("SELECT count(*) FROM canal WHERE id_canal = :channel_id"),
            {"channel_id": channel_id},
        ) == 1


def test_atomic_rollback_duplicates_and_validation_errors(client, engine) -> None:
    invalid = new_channel_payload()
    invalid["channel"] = {"nombre": "No debe persistir", "continente": "Europa"}
    sources = invalid["sources"]
    assert isinstance(sources, list)
    sources[1]["url_feed"] = sources[0]["url_feed"]
    response = client.post("/api/v1/sources", json=invalid)
    assert response.status_code == 400
    with Session(engine) as session:
        assert session.scalar(
            text("SELECT count(*) FROM canal WHERE nombre = 'No debe persistir'")
        ) == 0

    assert client.post(
        "/api/v1/sources",
        json={"channel": {"nombre": "Sin fuentes", "continente": "Asia"}, "sources": []},
    ).status_code == 400
    assert client.post(
        "/api/v1/sources",
        json={
            "channel": {"nombre": "Mal continente", "continente": "Atlantida"},
            "sources": [new_channel_payload()["sources"][0]],
        },
    ).status_code == 400


def test_not_found_and_duplicate_database_constraints(client) -> None:
    assert client.get("/api/v1/sources/999").status_code == 404
    assert client.put(
        "/api/v1/sources/999",
        json={
            "nombre": "Nada",
            "url_feed": "https://example.com/nothing.xml",
            "categoria_iptc": "weather",
            "idioma": "es",
            "activa": True,
        },
    ).status_code == 404
    assert client.delete("/api/v1/sources/999").status_code == 404

    assert client.post("/api/v1/sources", json=new_channel_payload()).status_code == 201
    duplicate = new_channel_payload()
    duplicate["channel"] = {"nombre": "Otro", "continente": "Europa"}
    assert client.post("/api/v1/sources", json=duplicate).status_code == 400
