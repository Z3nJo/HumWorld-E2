import pytest

from app.models.domains import Continent, IptcCategory, Language
from app.seeds.sources import PBS_AMERICA_SOURCE, SOURCE_SEEDS


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
