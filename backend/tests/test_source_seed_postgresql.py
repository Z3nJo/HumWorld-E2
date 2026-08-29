import os

import pytest
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session

from app.config import normalize_database_url
from app.models import Channel, RssSource
from app.models.domains import Continent
from app.seeds.sources import SOURCE_SEEDS, SeedConflictError, seed_sources

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def engine():
    value = os.getenv("DATABASE_URL")
    if not value:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    database_engine = create_engine(normalize_database_url(value), pool_pre_ping=True)
    with database_engine.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
    yield database_engine
    database_engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(engine):
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE fuente_rss, canal RESTART IDENTITY CASCADE"))
    yield
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE fuente_rss, canal RESTART IDENTITY CASCADE"))


def _functional_snapshot(session: Session) -> list[tuple[object, ...]]:
    statement = (
        select(
            Channel.nombre,
            Channel.continente,
            RssSource.nombre,
            RssSource.url_feed,
            RssSource.categoria_iptc,
            RssSource.idioma,
            RssSource.activa,
        )
        .join(RssSource, RssSource.id_canal == Channel.id_canal)
        .order_by(Channel.continente)
    )
    return list(session.execute(statement).all())


def test_seed_covers_all_continents_on_clean_postgresql(engine) -> None:
    with Session(engine, expire_on_commit=False) as session:
        result = seed_sources(session)

    assert result.created_channels == 6
    assert result.created_sources == 6
    assert result.existing_sources == 0

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Channel)) == 6
        assert session.scalar(select(func.count()).select_from(RssSource)) == 6
        assert session.scalar(
            select(func.count()).select_from(RssSource).where(RssSource.activa.is_(True))
        ) == 6
        assert set(session.scalars(select(Channel.continente))) == {
            continent.value for continent in Continent
        }


def test_seed_is_idempotent(engine) -> None:
    with Session(engine, expire_on_commit=False) as session:
        seed_sources(session)
    with Session(engine) as session:
        before = _functional_snapshot(session)

    with Session(engine, expire_on_commit=False) as session:
        result = seed_sources(session)

    assert result.created_channels == 0
    assert result.created_sources == 0
    assert result.existing_sources == 6
    with Session(engine) as session:
        assert _functional_snapshot(session) == before


def test_incompatible_collision_rolls_back_entire_seed(engine) -> None:
    conflict = next(seed for seed in SOURCE_SEEDS if seed.channel_name == "Deutsche Welle")
    with Session(engine) as session:
        session.add(
            Channel(
                nombre=conflict.channel_name,
                continente=Continent.ASIA.value,
            )
        )
        session.commit()

    with Session(engine, expire_on_commit=False) as session:
        with pytest.raises(SeedConflictError, match="continente incompatible"):
            seed_sources(session)

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Channel)) == 1
        assert session.scalar(select(func.count()).select_from(RssSource)) == 0
        persisted = session.scalar(select(Channel))
        assert persisted is not None
        assert persisted.nombre == "Deutsche Welle"
        assert persisted.continente == Continent.ASIA.value
