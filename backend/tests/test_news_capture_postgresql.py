import os
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session

from app.config import normalize_database_url
from app.models import Channel, News, RssSource
from app.repositories import NewsCaptureRepository

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
    assert "noticia" in set(inspect(database_engine).get_table_names())
    yield database_engine
    database_engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(engine):
    with engine.begin() as connection:
        connection.execute(
            text("TRUNCATE noticia, fuente_rss, canal RESTART IDENTITY CASCADE")
        )
    yield
    with engine.begin() as connection:
        connection.execute(
            text("TRUNCATE noticia, fuente_rss, canal RESTART IDENTITY CASCADE")
        )


def create_source(session: Session, *, active: bool = True) -> RssSource:
    channel = Channel(nombre="Canal captura", continente="America")
    source = RssSource(
        canal=channel,
        nombre="Feed captura",
        url_feed="https://example.com/capture.xml",
        categoria_iptc="politics",
        idioma="es",
        activa=active,
    )
    session.add(source)
    session.commit()
    return source


def news_values(source_id: int, guid: str = "guid-1") -> dict[str, object]:
    return {
        "id_fuente": source_id,
        "guid_origen": guid,
        "titulo": "Noticia persistida",
        "descripcion": "Resumen",
        "url": f"https://example.com/{guid}",
        "idioma": "es",
        "fecha_publicacion": None,
        "valor_humor": None,
        "fecha_analisis": None,
    }


def test_lists_only_active_sources_and_persists_idempotently(engine) -> None:
    captured_at = datetime(2026, 9, 1, 14, 0, tzinfo=UTC)
    with Session(engine, expire_on_commit=False) as session:
        active = create_source(session)
        inactive = RssSource(
            id_canal=active.id_canal,
            nombre="Feed inactivo",
            url_feed="https://example.com/inactive.xml",
            categoria_iptc="weather",
            idioma="en",
            activa=False,
        )
        session.add(inactive)
        session.commit()
        repository = NewsCaptureRepository(session)

        assert [item.id_fuente for item in repository.list_active_sources()] == [
            active.id_fuente
        ]
        assert repository.persist_source_capture(
            active.id_fuente,
            [news_values(active.id_fuente)],
            captured_at,
        ) == 1
        later = captured_at + timedelta(minutes=5)
        assert repository.persist_source_capture(
            active.id_fuente,
            [news_values(active.id_fuente)],
            later,
        ) == 0

        rows = list(session.scalars(select(News)).all())
        session.refresh(active)
        assert len(rows) == 1
        assert rows[0].fecha_registro is not None
        assert rows[0].valor_humor is None
        assert rows[0].fecha_analisis is None
        assert active.fecha_ultima_captura == later


def test_failed_persistence_rolls_back_news_and_capture_timestamp(engine) -> None:
    original = datetime(2026, 8, 31, 10, 0, tzinfo=UTC)
    with Session(engine, expire_on_commit=False) as session:
        source = create_source(session)
        source.fecha_ultima_captura = original
        session.commit()
        invalid = news_values(source.id_fuente)
        invalid["idioma"] = "fr"

        with pytest.raises(Exception):
            NewsCaptureRepository(session).persist_source_capture(
                source.id_fuente,
                [invalid],
                original + timedelta(hours=1),
            )

        session.refresh(source)
        assert source.fecha_ultima_captura == original
        assert session.scalar(select(text("count(*)")).select_from(News)) == 0


def test_deleting_source_cascades_captured_news(engine) -> None:
    with Session(engine, expire_on_commit=False) as session:
        source = create_source(session)
        NewsCaptureRepository(session).persist_source_capture(
            source.id_fuente,
            [news_values(source.id_fuente)],
            datetime.now(UTC),
        )
        session.delete(source)
        session.commit()
        assert session.scalar(select(text("count(*)")).select_from(News)) == 0
