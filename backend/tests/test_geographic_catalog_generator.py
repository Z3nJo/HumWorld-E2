import json
from pathlib import Path

import pytest

from scripts import generate_geographic_catalog as generator
from app.services import geographic_input_paths
from scripts.generate_geographic_catalog import (
    CatalogGenerationError,
    generate,
    write_json,
)


def _inputs(tmp_path: Path, *, collision: bool = False) -> tuple[Path, Path, Path]:
    geography = tmp_path / "backend" / "data" / "geography"
    sources = geography / "sources"
    sources.mkdir(parents=True, exist_ok=True)
    rest = sources / "rest.json"
    cities = sources / "cities.txt"
    curation = geography / "curation.json"
    rest.write_text(
        json.dumps(
            [
                {"cca2": "CL", "name": {"common": "Chile", "official": "Republic of Chile"}, "translations": {"spa": {"common": "Chile", "official": "República de Chile"}}, "region": "Americas", "capital": ["Santiago"]},
                {"cca2": "US", "name": {"common": "United States", "official": "United States of America"}, "translations": {"spa": {"common": "Estados Unidos", "official": "Estados Unidos de América"}}, "region": "Americas", "capital": ["Washington, D.C."]},
                {"cca2": "XK", "name": {"common": "Kosovo", "official": "Kosovo"}, "translations": {}, "region": "Europe", "capital": ["Pristina"]}
            ]
        ),
        encoding="utf-8",
    )
    city_rows = [
        "1\tSantiago\tSantiago\t\t-33\t-70\tP\tPPLC\tCL\t\t\t\t\t\t6000000",
        "2\tSmallville\tSmallville\t\t0\t0\tP\tPPL\tCL\t\t\t\t\t\t99999",
    ]
    if collision:
        city_rows.append("3\tSantiago\tSantiago\t\t0\t0\tP\tPPL\tUS\t\t\t\t\t\t200000")
    cities.write_text("\n".join(city_rows) + "\n", encoding="utf-8")
    curation.write_text(
        json.dumps(
            {
                "catalog_version": "fixture-v1",
                "release_date": "2026-10-27",
                "licenses": {},
                "unofficial_inclusions": [],
                "continent_overrides": {},
                "demonyms": {"CL": {"es": ["chilena"], "en": ["Chilean"]}},
                "excluded_aliases": {"es": [], "en": []},
                "ambiguous_alias_overrides": {"es": {}, "en": {}},
                "additional_aliases": ([{"alias": "Santiago", "idioma": "es", "codigo_pais": "US", "tipo": "pais"}] if collision else []),
            }
        ),
        encoding="utf-8",
    )
    return rest, cities, curation


def test_generator_is_deterministic_filters_and_omits_iso_aliases(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    inputs = _inputs(tmp_path)
    monkeypatch.setattr(geographic_input_paths, "BACKEND_ROOT", tmp_path / "backend")
    first = generate(*inputs)
    second = generate(*inputs)
    assert first == second
    catalog, manifest = first
    assert [item["codigo_iso2"] for item in catalog["countries"]] == ["CL", "US"]
    assert not any(item["alias_normalizado"] in {"cl", "us"} for item in catalog["aliases"])
    assert not any(item["alias_normalizado"] == "smallville" for item in catalog["aliases"])
    assert any(item["alias_normalizado"] == "santiago" for item in catalog["aliases"])
    assert manifest["city_population_threshold"] == 100000

    root = tmp_path / "backend"
    output = root / "data" / "geography"
    monkeypatch.setattr(generator, "PROJECT_ROOT", root)
    monkeypatch.setattr(generator, "OUTPUT_ROOT", output)
    one = output / "one.json"
    two = output / "two.json"
    write_json(one, catalog)
    write_json(two, second[0])
    assert one.read_bytes() == two.read_bytes()


def test_generator_fails_on_unresolved_collision(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(geographic_input_paths, "BACKEND_ROOT", tmp_path / "backend")
    with pytest.raises(CatalogGenerationError, match="ambiguos"):
        generate(*_inputs(tmp_path, collision=True))
