import pytest

from app.models.domains import Continent, IptcCategory, Language
from app.seeds.sources import SOURCE_SEEDS


def test_seed_catalog_covers_domains_with_unique_urls() -> None:
    assert len(SOURCE_SEEDS) == 6
    assert {entry.continent for entry in SOURCE_SEEDS} == set(Continent)
    assert len({entry.channel_name for entry in SOURCE_SEEDS}) == 6
    assert len({entry.feed_url for entry in SOURCE_SEEDS}) == 6


@pytest.mark.parametrize("entry", SOURCE_SEEDS)
def test_seed_entry_uses_supported_domains(entry) -> None:
    assert isinstance(entry.continent, Continent)
    assert isinstance(entry.category, IptcCategory)
    assert isinstance(entry.language, Language)
    assert entry.active is True
    assert entry.feed_url.startswith("https://")
