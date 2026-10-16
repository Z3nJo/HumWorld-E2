import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import Channel, RssSource
from app.models.domains import Continent, IptcCategory, Language
from app.seeds.sources import PBS_AMERICA_SOURCE, SOURCE_SEEDS, seed_sources


def test_seed_catalog_covers_domains_with_unique_urls() -> None:
    assert len(SOURCE_SEEDS) == 6
    assert {entry.continent for entry in SOURCE_SEEDS} == set(Continent)
    assert len({entry.channel_name for entry in SOURCE_SEEDS}) == 6
    assert len({entry.feed_url for entry in SOURCE_SEEDS}) == 6


def test_seed_catalog_uses_pbs_for_america() -> None:
    america = next(
        entry for entry in SOURCE_SEEDS if entry.continent is Continent.AMERICA
    )

    assert america is PBS_AMERICA_SOURCE
    assert america.channel_name == "PBS NewsHour"
    assert america.source_name == "PBS NewsHour Headlines"
    assert america.feed_url == "https://www.pbs.org/newshour/feeds/rss/headlines"
    assert america.category is IptcCategory.SOCIETY
    assert america.language is Language.ENGLISH
    assert america.active is True


@pytest.mark.parametrize("entry", SOURCE_SEEDS)
def test_seed_entry_uses_supported_domains(entry) -> None:
    assert isinstance(entry.continent, Continent)
    assert isinstance(entry.category, IptcCategory)
    assert isinstance(entry.language, Language)
    assert entry.active is True
    assert entry.feed_url.startswith("https://")


def test_seed_backfills_known_countries_and_preserves_existing_assignments():
    engine = create_engine("sqlite://")
    Channel.__table__.create(engine)
    RssSource.__table__.create(engine)
    with Session(engine) as session:
        seed_sources(session)
        channels = {channel.nombre: channel for channel in session.scalars(select(Channel))}
        assert channels["PBS NewsHour"].pais == "US"
        assert channels["Channel News Asia"].pais == "SG"
        assert channels["ABC News Australia"].pais == "AU"
        channels["PBS NewsHour"].pais = None
        channels["Deutsche Welle"].pais = "ES"
        session.commit()
        result = seed_sources(session)
        assert result.created_channels == 0
        assert channels["PBS NewsHour"].pais == "US"
        assert channels["Deutsche Welle"].pais == "ES"
        assert channels["Africanews"].pais is None
    engine.dispose()
