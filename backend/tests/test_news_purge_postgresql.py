import os
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session

from app.config import normalize_database_url
from app.models import Channel, Configuration, News, NewsTerm, RssSource, Term
from app.repositories import NewsPurgeRepository
from app.services.configuration import NEWS_RETENTION_KEY


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
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE noticia, termino, fuente_rss, canal, configuracion "
                "RESTART IDENTITY CASCADE"
            )
        )


def test_repository_purges_only_expired_news_and_cascades_contributions(engine) -> None:
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

        deleted = NewsPurgeRepository(session).delete_before(NOW - timedelta(days=30))
        session.commit()

        assert deleted == 1
        remaining_ids = set(session.scalars(select(News.id_noticia)).all())
        assert remaining_ids == {at_threshold.id_noticia, current.id_noticia}
        assert session.scalar(select(NewsTerm)) is None
        assert session.get(RssSource, source.id_fuente) is not None
        assert session.get(Channel, channel.id_canal) is not None
        assert session.get(Term, term.id_termino) is not None
        assert session.get(Configuration, NEWS_RETENTION_KEY) is not None
