import os

import pytest
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session

from app.config import normalize_database_url
from app.models import Channel, News, RssSource
from app.models.domains import Continent
from app.seeds.sources import (
    LEGACY_AMERICA_SOURCE,
    PBS_AMERICA_SOURCE,
    SOURCE_SEEDS,
    SeedConflictError,
    seed_sources,
)

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
        america = session.scalar(
            select(RssSource)
            .join(Channel)
            .where(Channel.continente == Continent.AMERICA.value)
        )
        assert america is not None
        assert america.nombre == PBS_AMERICA_SOURCE.source_name
        assert america.url_feed == PBS_AMERICA_SOURCE.feed_url
        assert america.categoria_iptc == PBS_AMERICA_SOURCE.category.value
        assert america.idioma == PBS_AMERICA_SOURCE.language.value
        assert america.activa is True


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


def test_seed_reconciles_legacy_cbc_in_place_and_preserves_news(engine) -> None:
    with Session(engine, expire_on_commit=False) as session:
        channel = Channel(
            nombre=LEGACY_AMERICA_SOURCE.channel_name,
            continente=LEGACY_AMERICA_SOURCE.continent.value,
        )
        source = RssSource(
            canal=channel,
            nombre=LEGACY_AMERICA_SOURCE.source_name,
            url_feed=LEGACY_AMERICA_SOURCE.feed_url,
            categoria_iptc=LEGACY_AMERICA_SOURCE.category.value,
            idioma=LEGACY_AMERICA_SOURCE.language.value,
            activa=LEGACY_AMERICA_SOURCE.active,
        )
        session.add(source)
        session.flush()
        session.add(
            News(
                id_fuente=source.id_fuente,
                guid_origen="cbc-guid-1",
                titulo="Noticia CBC existente",
                descripcion="Debe conservar su referencia",
                url="https://example.com/cbc-guid-1",
                idioma="en",
            )
        )
        session.commit()
        channel_id = channel.id_canal
        source_id = source.id_fuente

    with Session(engine, expire_on_commit=False) as session:
        first = seed_sources(session)
    with Session(engine, expire_on_commit=False) as session:
        second = seed_sources(session)

    assert first.created_channels == 5
    assert first.created_sources == 5
    assert first.existing_sources == 1
    assert second.created_channels == 0
    assert second.created_sources == 0
    assert second.existing_sources == 6

    with Session(engine) as session:
        america_channel = session.scalar(
            select(Channel).where(Channel.nombre == PBS_AMERICA_SOURCE.channel_name)
        )
        america_source = session.scalar(
            select(RssSource).where(
                RssSource.url_feed == PBS_AMERICA_SOURCE.feed_url
            )
        )
        news = session.scalar(select(News).where(News.guid_origen == "cbc-guid-1"))

        assert america_channel is not None
        assert america_channel.id_canal == channel_id
        assert america_source is not None
        assert america_source.id_fuente == source_id
        assert america_source.id_canal == channel_id
        assert news is not None
        assert news.id_fuente == source_id
        assert session.scalar(select(func.count()).select_from(Channel)) == 6
        assert session.scalar(select(func.count()).select_from(RssSource)) == 6


def test_cbc_and_pbs_collision_rolls_back_entire_seed(engine) -> None:
    with Session(engine, expire_on_commit=False) as session:
        seed_sources(session)
        legacy_channel = Channel(
            nombre=LEGACY_AMERICA_SOURCE.channel_name,
            continente=LEGACY_AMERICA_SOURCE.continent.value,
        )
        session.add(
            RssSource(
                canal=legacy_channel,
                nombre=LEGACY_AMERICA_SOURCE.source_name,
                url_feed=LEGACY_AMERICA_SOURCE.feed_url,
                categoria_iptc=LEGACY_AMERICA_SOURCE.category.value,
                idioma=LEGACY_AMERICA_SOURCE.language.value,
                activa=True,
            )
        )
        session.commit()

    with Session(engine) as session:
        before = _functional_snapshot(session)

    with Session(engine, expire_on_commit=False) as session:
        with pytest.raises(SeedConflictError, match="CBC y PBS coexisten"):
            seed_sources(session)

    with Session(engine) as session:
        assert _functional_snapshot(session) == before
        assert session.scalar(select(func.count()).select_from(Channel)) == 7
        assert session.scalar(select(func.count()).select_from(RssSource)) == 7
