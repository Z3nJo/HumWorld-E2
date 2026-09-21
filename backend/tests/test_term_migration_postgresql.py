import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.config import normalize_database_url

pytestmark = pytest.mark.integration


def test_term_migration_supports_downgrade_and_upgrade() -> None:
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    database_url = normalize_database_url(raw_url)
    if not database_url.startswith("postgresql+psycopg://"):
        pytest.fail("Integration tests require PostgreSQL with psycopg 3")

    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        command.downgrade(config, "base")
        assert set(inspect(engine).get_table_names()) <= {"alembic_version"}

        command.upgrade(config, "20260901_01")
        tables = set(inspect(engine).get_table_names())
        assert "termino" not in tables
        assert {"canal", "fuente_rss", "configuracion", "noticia"} <= tables

        command.upgrade(config, "head")
        assert "termino" in inspect(engine).get_table_names()

        command.downgrade(config, "20260901_01")
        tables = set(inspect(engine).get_table_names())
        assert "termino" not in tables
        assert {"canal", "fuente_rss", "configuracion", "noticia"} <= tables

        command.upgrade(config, "head")
        inspector = inspect(engine)
        assert "termino" in inspector.get_table_names()
        assert {column["name"] for column in inspector.get_columns("termino")} == {
            "id_termino",
            "palabra",
            "idioma",
            "valor",
            "activo",
            "fecha_alta",
            "fecha_modificacion",
        }
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == (
                "20260921_01"
            )
    finally:
        command.upgrade(config, "head")
        engine.dispose()
