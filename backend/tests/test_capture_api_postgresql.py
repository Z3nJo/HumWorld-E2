import os
from datetime import UTC, datetime

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.api.sources import get_capture_service
from app.config import normalize_database_url
from app.database import get_db
from app.main import app
from app.models import Channel, News, RssSource
from app.repositories import NewsCaptureRepository
from app.services.capture import FeedEntry, NewsCaptureService

pytestmark = pytest.mark.integration

CAPTURED_AT = datetime(2026, 9, 4, 12, 0, tzinfo=UTC)


class ControlledFeedClient:
    def __init__(self, entries: list[FeedEntry]) -> None:
        self._entries = entries
        self.urls: list[str] = []

    def fetch(self, url: str) -> list[FeedEntry]:
        self.urls.append(url)
        return self._entries


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
    assert {"canal", "fuente_rss", "noticia", "configuracion"} <= set(
        inspect(database_engine).get_table_names()
    )
    yield database_engine
    database_engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(engine):
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE noticia, fuente_rss, canal, configuracion "
                "RESTART IDENTITY CASCADE"
            )
        )
    yield
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE noticia, fuente_rss, canal, configuracion "
                "RESTART IDENTITY CASCADE"
            )
        )


@pytest.fixture()
def capture_client(engine):
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    feed_client = ControlledFeedClient(
        [
            FeedEntry(
                guid="vertical-guid-1",
                title="Noticia de integracion vertical",
                description="Entrada RSS controlada",
                link="https://example.com/vertical-1",
                published_at=CAPTURED_AT,
            ),
            FeedEntry(
                guid=None,
                title=None,
                description="Entrada invalida controlada",
                link=None,
                published_at=None,
            ),
        ]
    )

    def override_db():
        with factory() as session:
            yield session

    def override_capture_service(
        session: Session = Depends(get_db),
    ) -> NewsCaptureService:
        return NewsCaptureService(
            NewsCaptureRepository(session),
            feed_client,
            clock=lambda: CAPTURED_AT,
        )

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_capture_service] = override_capture_service
    try:
        with TestClient(app) as test_client:
            yield test_client, feed_client
    finally:
        app.dependency_overrides.clear()


def create_active_source(engine) -> RssSource:
    with Session(engine, expire_on_commit=False) as session:
        source = RssSource(
            canal=Channel(nombre="Canal vertical", continente="America"),
            nombre="Feed vertical",
            url_feed="https://example.com/vertical.xml",
            categoria_iptc="politics",
            idioma="es",
            activa=True,
        )
        session.add(source)
        session.commit()
        return source


def test_manual_capture_api_persists_and_deduplicates_controlled_feed(
    capture_client,
    engine,
) -> None:
    source = create_active_source(engine)
    client, feed_client = capture_client

    first_response = client.post("/api/v1/sources/capture")
    assert first_response.status_code == 200
    assert first_response.json() == {
        "sources": [
            {
                "source_id": source.id_fuente,
                "inserted": 1,
                "duplicates": 0,
                "invalid": 1,
                "error": None,
            }
        ],
        "skipped_source_ids": [],
        "inserted": 1,
        "failed_sources": 0,
    }

    with Session(engine) as session:
        news = session.scalar(select(News))
        persisted_source = session.get(RssSource, source.id_fuente)
        assert news is not None
        assert persisted_source is not None
        assert news.id_fuente == source.id_fuente
        assert news.guid_origen == "vertical-guid-1"
        assert news.titulo == "Noticia de integracion vertical"
        assert news.url == "https://example.com/vertical-1"
        assert news.idioma == "es"
        assert news.fecha_registro is not None
        assert persisted_source.fecha_ultima_captura == CAPTURED_AT

    second_response = client.post("/api/v1/sources/capture")
    assert second_response.status_code == 200
    assert second_response.json()["sources"] == [
        {
            "source_id": source.id_fuente,
            "inserted": 0,
            "duplicates": 1,
            "invalid": 1,
            "error": None,
        }
    ]
    with Session(engine) as session:
        assert session.scalar(select(text("count(*)")).select_from(News)) == 1
    assert feed_client.urls == [source.url_feed, source.url_feed]


def test_manual_capture_api_rejects_missing_source_without_partial_news(
    capture_client,
    engine,
) -> None:
    source = create_active_source(engine)
    client, feed_client = capture_client

    response = client.post(
        "/api/v1/sources/capture",
        json={"source_ids": [source.id_fuente, 999]},
    )

    assert response.status_code == 404
    with Session(engine) as session:
        assert session.scalar(select(text("count(*)")).select_from(News)) == 0
    assert feed_client.urls == []
