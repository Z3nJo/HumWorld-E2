import json
from collections import defaultdict
from pathlib import Path

import pytest

from app.services.geographic_attribution import GeographicAlias, GeographicMatcher
from app.services.text_normalization import normalize_text


DATA_DIRECTORY = Path(__file__).parents[1] / "data" / "geography"
TARGET_COUNTRY_CODES = frozenset(
    """
    AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT
    BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC
    EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU
    ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI
    LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ
    NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW
    SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN
    TO TR TT TV TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW
    """.split()
)
ORIGINAL_DEMONYMS = {
    "AR": {
        "en": {"Argentine", "Argentinian"},
        "es": {"argentino", "argentina", "argentinos", "argentinas"},
    },
    "CL": {
        "en": {"Chilean", "Chileans"},
        "es": {"chileno", "chilena", "chilenos", "chilenas"},
    },
    "ES": {
        "en": {"Spanish"},
        "es": {"español", "española", "españoles", "españolas"},
    },
    "GB": {
        "en": {"British"},
        "es": {"británico", "británica", "británicos", "británicas"},
    },
    "MX": {
        "en": {"Mexican", "Mexicans"},
        "es": {"mexicano", "mexicana", "mexicanos", "mexicanas"},
    },
    "UA": {
        "en": {"Ukrainian", "Ukrainians"},
        "es": {"ucraniano", "ucraniana", "ucranianos", "ucranianas"},
    },
    "US": {
        "en": {"American", "Americans"},
        "es": {"estadounidense", "estadounidenses"},
    },
}
EXPECTED_AMBIGUITIES = {
    ("en", "congolese"): {"CD", "CG"},
    ("en", "dominican"): {"DM", "DO"},
    ("en", "dominicans"): {"DM", "DO"},
    ("es", "congoleno"): {"CD", "CG"},
    ("es", "congolena"): {"CD", "CG"},
    ("es", "congolenos"): {"CD", "CG"},
    ("es", "congolenas"): {"CD", "CG"},
}


def _load_json(name: str) -> dict:
    with (DATA_DIRECTORY / name).open(encoding="utf-8") as source:
        return json.load(source)


def _curated_ambiguities(demonyms: dict) -> dict[tuple[str, str], set[str]]:
    countries_by_alias: defaultdict[tuple[str, str], set[str]] = defaultdict(set)
    for country_code, translations in demonyms.items():
        for language, aliases in translations.items():
            for alias in aliases:
                countries_by_alias[(language, normalize_text(alias))].add(country_code)
    return {
        key: country_codes
        for key, country_codes in countries_by_alias.items()
        if len(country_codes) > 1
    }


def test_curated_demonyms_cover_the_195_target_countries() -> None:
    curation = _load_json("geography-curation.v1.json")
    catalog = _load_json("catalog.json")
    demonyms = curation["demonyms"]
    catalog_country_codes = {item["codigo_iso2"] for item in catalog["countries"]}

    assert set(demonyms) == TARGET_COUNTRY_CODES
    assert TARGET_COUNTRY_CODES <= catalog_country_codes
    for country_code, translations in demonyms.items():
        assert set(translations) == {"en", "es"}, country_code
        for language, aliases in translations.items():
            assert aliases, (country_code, language)
            normalized = [normalize_text(alias) for alias in aliases]
            assert all(normalized), (country_code, language)
            assert len(normalized) == len(set(normalized)), (country_code, language)

    for country_code, translations in ORIGINAL_DEMONYMS.items():
        for language, aliases in translations.items():
            assert aliases <= set(demonyms[country_code][language])


def test_inherently_ambiguous_demonyms_are_not_executable_aliases() -> None:
    curation = _load_json("geography-curation.v1.json")
    catalog = _load_json("catalog.json")
    ambiguities = _curated_ambiguities(curation["demonyms"])
    executable_aliases = {
        (item["idioma"], item["alias_normalizado"]) for item in catalog["aliases"]
    }

    assert ambiguities == EXPECTED_AMBIGUITIES
    assert ambiguities.keys().isdisjoint(executable_aliases)


@pytest.fixture(scope="module")
def catalog_matcher() -> GeographicMatcher:
    catalog = _load_json("catalog.json")
    aliases = tuple(
        GeographicAlias(
            id_alias=index,
            alias=item["alias"],
            idioma=item["idioma"],
            codigo_pais=item["codigo_pais"],
            tipo=item["tipo"],
        )
        for index, item in enumerate(catalog["aliases"], start=1)
    )
    return GeographicMatcher(aliases, version=catalog["version"])


@pytest.mark.parametrize(
    ("text", "language", "expected_country"),
    (
        ("La delegación BRASILEÑA llegó", "es", "BR"),
        ("Los alemanes participaron", "es", "DE"),
        ("Una costarricense ganó", "es", "CR"),
        ("Representantes PERUANOS viajaron", "es", "PE"),
        ("South Korean officials met", "en", "KR"),
        ("Japanese officials met", "en", "JP"),
        ("Canadians participated", "en", "CA"),
        ("South Sudanese representatives met", "en", "SS"),
    ),
)
def test_catalog_matcher_recognizes_representative_demonyms(
    catalog_matcher: GeographicMatcher,
    text: str,
    language: str,
    expected_country: str,
) -> None:
    assert [item.codigo_pais for item in catalog_matcher.match(text, language)] == [
        expected_country
    ]


def test_catalog_matcher_rejects_ambiguous_and_partial_demonyms(
    catalog_matcher: GeographicMatcher,
) -> None:
    assert catalog_matcher.match("Congolese", "en") == ()
    assert catalog_matcher.match("Dominican", "en") == ()
    assert catalog_matcher.match("superuano", "es") == ()
