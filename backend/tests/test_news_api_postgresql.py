import os
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session

from app.api.news import get_news_purge_service
from app.config import normalize_database_url
from app.main import app
from app.models import Channel, Configuration, News, NewsTerm, RssSource, Term
from app.repositories import ConfigurationRepository, NewsPurgeRepository
from app.services.configuration import NEWS_RETENTION_KEY, ConfigurationService
from app.services.purging import NewsPurgeApplicationService, NewsPurgeService


pytestmark = pytest.mark.integration

NOW = datetime(2026, 9, 25, 12, 0, tzinfo=UTC)


@pytest.fixture(scope="module")
def engine():
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    database_engine = create_engine(normalize_database_url(raw_url), pool_pre_ping=True)
    with database_engine.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
    assert {"noticia", "noticia_termino", "configuracion"} <= set(
        inspect(database_engine).get_table_names()
    )
    yield database_engine
    database_engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(engine):
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE noticia, termino, fuente_rss, canal, configuracion "
                "RESTART IDENTITY CASCADE"
            )
        )
    yield
    app.dependency_overrides.clear()
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE noticia, termino, fuente_rss, canal, configuracion "
                "RESTART IDENTITY CASCADE"
            )
        )


def override_purge_service(engine, repository_type=NewsPurgeRepository):
    def override():
        with Session(engine) as session:
            yield NewsPurgeApplicationService(
                ConfigurationService(ConfigurationRepository(session)),
                NewsPurgeService(repository_type(session), clock=lambda: NOW),
            )

    return override


def seed_news_set(engine):
    with Session(engine, expire_on_commit=False) as session:
        channel = Channel(nombre="Canal", continente="America")
        source = RssSource(
            canal=channel,
            nombre="Fuente",
            url_feed="https://example.com/feed.xml",
            categoria_iptc="society",
            idioma="es",
        )
        expired = News(
            fuente=source,
            guid_origen="expired",
            titulo="Vencida",
            url="https://example.com/expired",
            idioma="es",
            fecha_registro=NOW - timedelta(days=31),
        )
        at_threshold = News(
            fuente=source,
            guid_origen="threshold",
            titulo="En el limite",
            url="https://example.com/threshold",
            idioma="es",
            fecha_registro=NOW - timedelta(days=30),
        )
        current = News(
            fuente=source,
            guid_origen="current",
            titulo="Vigente",
            url="https://example.com/current",
            idioma="es",
            fecha_registro=NOW - timedelta(days=29),
        )
        term = Term(palabra="acuerdo", idioma="es", valor=Decimal("5"))
        retention = Configuration(
            clave=NEWS_RETENTION_KEY,
            valor="30",
            tipo="entero",
            descripcion="Caducidad de noticias en dias",
        )
        session.add_all([expired, at_threshold, current, term, retention])
        session.flush()
        session.add(
            NewsTerm(
                id_noticia=expired.id_noticia,
                id_termino=term.id_termino,
                ocurrencias=1,
                aporte_humor=Decimal("5.00"),
            )
        )
        session.commit()
        return {
            "expired_id": expired.id_noticia,
            "threshold_id": at_threshold.id_noticia,
            "current_id": current.id_noticia,
            "source_id": source.id_fuente,
            "channel_id": channel.id_canal,
            "term_id": term.id_termino,
        }


def test_manual_purge_api_deletes_only_expired_news_and_is_idempotent(engine) -> None:
    identifiers = seed_news_set(engine)
    app.dependency_overrides[get_news_purge_service] = override_purge_service(engine)

    with TestClient(app) as client:
        first = client.delete("/api/v1/news")
        repeated = client.delete("/api/v1/news")

    assert first.status_code == repeated.status_code == 204
    assert first.content == repeated.content == b""
    with Session(engine) as session:
        remaining_ids = set(session.scalars(select(News.id_noticia)).all())
        assert remaining_ids == {
            identifiers["threshold_id"],
            identifiers["current_id"],
        }
        assert session.scalar(select(NewsTerm)) is None
        assert session.get(RssSource, identifiers["source_id"]) is not None
        assert session.get(Channel, identifiers["channel_id"]) is not None
        assert session.get(Term, identifiers["term_id"]) is not None
        assert session.get(Configuration, NEWS_RETENTION_KEY) is not None


def test_manual_purge_api_reads_updated_retention_for_each_request(engine) -> None:
    with Session(engine, expire_on_commit=False) as session:
        source = RssSource(
            canal=Channel(nombre="Canal", continente="America"),
            nombre="Fuente",
            url_feed="https://example.com/feed.xml",
            categoria_iptc="society",
            idioma="es",
        )
        news = News(
            fuente=source,
            guid_origen="ten-days-old",
            titulo="Diez dias",
            url="https://example.com/ten-days-old",
            idioma="es",
            fecha_registro=NOW - timedelta(days=10),
        )
        retention = Configuration(
            clave=NEWS_RETENTION_KEY,
            valor="30",
            tipo="entero",
            descripcion="Caducidad de noticias en dias",
        )
        session.add_all([news, retention])
        session.commit()
        news_id = news.id_noticia

    app.dependency_overrides[get_news_purge_service] = override_purge_service(engine)
    with TestClient(app) as client:
        assert client.delete("/api/v1/news").status_code == 204
        with Session(engine) as session:
            assert session.get(News, news_id) is not None
            session.get(Configuration, NEWS_RETENTION_KEY).valor = "7"
            session.commit()
        assert client.delete("/api/v1/news").status_code == 204

    with Session(engine) as session:
        assert session.get(News, news_id) is None


def test_manual_purge_api_rolls_back_when_commit_fails(engine) -> None:
    identifiers = seed_news_set(engine)

    class FailingCommitRepository(NewsPurgeRepository):
        def commit(self) -> None:
            raise RuntimeError("commit failed")

    app.dependency_overrides[get_news_purge_service] = override_purge_service(
        engine,
        FailingCommitRepository,
    )
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.delete("/api/v1/news")

    assert response.status_code == 500
    assert response.json() == {"detail": "Error interno del servidor"}
    with Session(engine) as session:
        assert session.get(News, identifiers["expired_id"]) is not None
        assert session.scalar(select(NewsTerm)) is not None
