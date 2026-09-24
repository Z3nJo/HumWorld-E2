import os
from decimal import Decimal
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.config import normalize_database_url
from app.models import Channel, News, RssSource

pytestmark = pytest.mark.integration


def test_sentiment_migration_preserves_compatible_news_and_rejects_invalid_data() -> None:
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    engine = create_engine(normalize_database_url(raw_url), pool_pre_ping=True)
    try:
        command.downgrade(config, "20260921_01")
        with engine.begin() as connection:
            connection.execute(
                text("TRUNCATE noticia, fuente_rss, canal RESTART IDENTITY CASCADE")
            )
        with Session(engine) as session:
            source = RssSource(
                canal=Channel(nombre="Canal legado", continente="America"),
                nombre="Feed legado",
                url_feed="https://example.com/legacy-sentiment.xml",
                categoria_iptc="society",
                idioma="es",
            )
            session.add_all(
                [
                    News(
                        fuente=source,
                        guid_origen="compatible",
                        titulo="Titular válido",
                        url="https://example.com/compatible",
                        idioma="es",
                        valor_humor=Decimal("0.5"),
                    ),
                    News(
                        fuente=source,
                        guid_origen="invalid",
                        titulo="Titular inválido",
                        url="https://example.com/invalid",
                        idioma="es",
                        valor_humor=Decimal("1.2"),
                    ),
                ]
            )
            session.commit()

        with pytest.raises(ValueError, match="corregirlas antes"):
            command.upgrade(config, "head")
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == (
                "20260921_01"
            )

        with engine.begin() as connection:
            connection.execute(
                text("DELETE FROM noticia WHERE guid_origen = 'invalid'")
            )
        command.upgrade(config, "head")
        with Session(engine) as session:
            compatible = session.scalar(
                select(News).where(News.guid_origen == "compatible")
            )
            assert compatible is not None
            assert compatible.valor_humor == Decimal("0.500")
    finally:
        command.upgrade(config, "head")
        engine.dispose()
