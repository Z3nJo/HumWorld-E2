import pytest

from app.services.geographic_attribution import (
    GeographicAlias,
    GeographicAttributionService,
    GeographicCatalogError,
    GeographicMatcher,
)


ALIASES = (
    GeographicAlias(1, "Chile", "es", "CL", "pais"),
    GeographicAlias(2, "chilena", "es", "CL", "gentilicio"),
    GeographicAlias(3, "Santiago", "es", "CL", "ciudad"),
    GeographicAlias(4, "Estados Unidos", "es", "US", "pais"),
    GeographicAlias(5, "Unidos", "es", "ZZ", "pais"),
    GeographicAlias(6, "Ucrania", "es", "UA", "pais"),
    GeographicAlias(7, "New York", "en", "US", "ciudad"),
)


def service() -> GeographicAttributionService:
    return GeographicAttributionService(
        GeographicMatcher(ALIASES, version="test-v1"),
        ["CL", "US", "UA", "ZZ"],
    )


def test_matcher_normalizes_case_accents_and_word_boundaries() -> None:
    matcher = GeographicMatcher(ALIASES, version="test-v1")
    assert [item.codigo_pais for item in matcher.match("CHÍLENA en Chile", "es")] == [
        "CL",
        "CL",
    ]
    assert matcher.match("achilenada", "es") == ()


def test_matcher_prefers_longest_alias_at_same_position() -> None:
    matches = GeographicMatcher(ALIASES, version="test-v1").match(
        "Estados Unidos", "es"
    )
    assert [(item.codigo_pais, item.token_count) for item in matches] == [("US", 2)]


def test_title_has_priority_and_countries_are_deduplicated() -> None:
    result = service().classify(
        title="Santiago mira a Chile y Ucrania",
        description="Estados Unidos",
        language="es",
        source_country="US",
    )
    assert [(item.codigo_pais, item.id_alias, item.campo) for item in result.countries] == [
        ("CL", 1, "titulo"),
        ("UA", 6, "titulo"),
    ]


def test_description_then_source_are_fallbacks() -> None:
    mentioned = service().classify(
        title="Sin lugar", description="Crisis en Ucrania", language="es", source_country="CL"
    )
    fallback = service().classify(
        title="Sin lugar", description=None, language="es", source_country="CL"
    )
    empty = service().classify(
        title="Sin lugar", description=None, language="es", source_country=None
    )
    assert [(item.codigo_pais, item.campo) for item in mentioned.countries] == [
        ("UA", "descripcion")
    ]
    assert [(item.codigo_pais, item.origen) for item in fallback.countries] == [
        ("CL", "fuente")
    ]
    assert empty.countries == ()


def test_invalid_or_ambiguous_catalog_is_rejected() -> None:
    with pytest.raises(GeographicCatalogError):
        GeographicMatcher((), version="v1")
    with pytest.raises(GeographicCatalogError):
        GeographicMatcher(ALIASES, version="")
    with pytest.raises(GeographicCatalogError, match="ambiguo"):
        GeographicMatcher(
            (
                GeographicAlias(1, "Georgia", "en", "GE", "pais"),
                GeographicAlias(2, "Georgia", "en", "US", "ciudad"),
            ),
            version="v1",
        )
