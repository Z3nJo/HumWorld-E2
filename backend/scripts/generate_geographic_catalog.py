"""Generate the runtime geographic catalog from pinned local source files."""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import json
import os
import sys
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.text_normalization import normalize_text
from app.services.geographic_input_paths import GeographicInputPathError, validate_geographic_input

CONTINENTS = {
    "Africa": "Africa",
    "Americas": "America",
    "Antarctic": "Antartida",
    "Asia": "Asia",
    "Europe": "Europa",
    "Oceania": "Oceania",
}
NON_ISO_REST_CODES = frozenset({"XK"})
TYPE_ORDER = {"pais": 0, "gentilicio": 1, "ciudad": 2}
OUTPUT_ROOT = PROJECT_ROOT / "data" / "geography"


class CatalogGenerationError(ValueError):
    pass


@dataclass(frozen=True)
class Alias:
    text: str
    language: str
    country: str
    kind: str

    @property
    def normalized(self) -> str:
        return normalize_text(self.text)


def checksum(path: Path) -> str:
    path = validate_geographic_input(path)
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> Any:
    path = validate_geographic_input(path)
    with path.open(encoding="utf-8") as source:
        return json.load(source)


@contextlib.contextmanager
def open_text_source(path: Path):
    path = validate_geographic_input(path)
    if path.suffix.casefold() != ".zip":
        with path.open(encoding="utf-8") as source:
            yield source
        return
    with zipfile.ZipFile(path) as archive:
        members = [item for item in archive.namelist() if not item.endswith("/")]
        preferred = [item for item in members if Path(item).stem == path.stem]
        if len(preferred) == 1:
            members = preferred
        if len(members) != 1:
            raise CatalogGenerationError(
                f"El ZIP {path.name} debe contener exactamente un archivo"
            )
        with archive.open(members[0]) as binary_source:
            with io.TextIOWrapper(binary_source, encoding="utf-8") as source:
                yield source


def _country_names(item: dict[str, Any]) -> tuple[str, str, list[Alias]]:
    code = item["cca2"].upper()
    english = item["name"]["common"].strip()
    spanish = item.get("translations", {}).get("spa", {}).get("common", english).strip()
    aliases: list[Alias] = []
    for language, names in (
        ("en", (english, item["name"].get("official"))),
        (
            "es",
            (
                spanish,
                item.get("translations", {}).get("spa", {}).get("official"),
            ),
        ),
    ):
        aliases.extend(
            Alias(str(name).strip(), language, code, "pais")
            for name in names
            if name and str(name).strip()
        )
    return spanish, english, aliases


def _load_cities(
    cities_path: Path,
    alternate_names_path: Path | None,
    capital_names: dict[str, set[str]],
) -> list[Alias]:
    selected: dict[str, tuple[str, str, str]] = {}
    aliases: list[Alias] = []
    with open_text_source(cities_path) as source:
        for raw_line in source:
            fields = raw_line.rstrip("\n").split("\t")
            if len(fields) < 15 or fields[6] != "P":
                continue
            geoname_id, name, ascii_name, country = fields[0], fields[1], fields[2], fields[8].upper()
            population = int(fields[14] or 0)
            is_capital = name in capital_names.get(country, set()) or fields[7] in {
                "PPLC", "PPLG"
            }
            if population < 100_000 and not is_capital:
                continue
            selected[geoname_id] = (country, name, ascii_name)
            for language in ("es", "en"):
                aliases.append(Alias(name, language, country, "ciudad"))
                if ascii_name:
                    aliases.append(Alias(ascii_name, language, country, "ciudad"))

    if alternate_names_path is not None:
        with open_text_source(alternate_names_path) as source:
            for raw_line in source:
                fields = raw_line.rstrip("\n").split("\t")
                if len(fields) < 4 or fields[1] not in selected or fields[2] not in {"es", "en"}:
                    continue
                country = selected[fields[1]][0]
                if fields[3].strip():
                    aliases.append(Alias(fields[3].strip(), fields[2], country, "ciudad"))
    return aliases


def generate(
    rest_countries_path: Path,
    geonames_cities_path: Path,
    curation_path: Path,
    *,
    alternate_names_path: Path | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    # Validate all inputs before reading the first, including optional sources.
    rest_countries_path = validate_geographic_input(rest_countries_path, source=True)
    geonames_cities_path = validate_geographic_input(geonames_cities_path, source=True)
    curation_path = validate_geographic_input(curation_path)
    if alternate_names_path is not None:
        alternate_names_path = validate_geographic_input(alternate_names_path, source=True)
    rest_data = read_json(rest_countries_path)
    curation = read_json(curation_path)
    version = str(curation.get("catalog_version", "")).strip()
    if not version:
        raise CatalogGenerationError("catalog_version es obligatorio")
    unofficial = {code.upper() for code in curation.get("unofficial_inclusions", [])}
    continent_overrides = {
        code.upper(): value for code, value in curation.get("continent_overrides", {}).items()
    }

    countries: list[dict[str, str]] = []
    aliases: list[Alias] = []
    capitals: dict[str, set[str]] = {}
    for item in rest_data:
        code = str(item.get("cca2", "")).upper()
        if len(code) != 2 or not code.isalpha():
            raise CatalogGenerationError(f"Código de país inválido: {code!r}")
        if code in NON_ISO_REST_CODES and code not in unofficial:
            continue
        raw_continent = item.get("region") or "Antarctic"
        continent = continent_overrides.get(code, CONTINENTS.get(raw_continent))
        if continent not in set(CONTINENTS.values()):
            raise CatalogGenerationError(f"Continente no resuelto para {code}")
        spanish, english, country_aliases = _country_names(item)
        countries.append(
            {
                "codigo_iso2": code,
                "nombre_es": spanish,
                "nombre_en": english,
                "continente": continent,
            }
        )
        aliases.extend(country_aliases)
        capitals[code] = {str(value).strip() for value in item.get("capital", []) if str(value).strip()}
        for capital in capitals[code]:
            aliases.extend(
                Alias(capital, language, code, "ciudad") for language in ("es", "en")
            )

    country_codes = {item["codigo_iso2"] for item in countries}
    aliases.extend(
        item
        for item in _load_cities(geonames_cities_path, alternate_names_path, capitals)
        if item.country in country_codes
    )
    for code, translations in curation.get("demonyms", {}).items():
        code = code.upper()
        if code not in country_codes:
            raise CatalogGenerationError(f"Gentilicio para país desconocido: {code}")
        for language in ("es", "en"):
            aliases.extend(
                Alias(value, language, code, "gentilicio")
                for value in translations.get(language, [])
            )
    additional_alias_keys: set[tuple[str, str]] = set()
    for value in curation.get("additional_aliases", []):
        additional_alias_keys.add((value["idioma"], normalize_text(value["alias"])))
        aliases.append(
            Alias(value["alias"], value["idioma"], value["codigo_pais"].upper(), value["tipo"])
        )

    excluded = {
        (language, normalize_text(value))
        for language, values in curation.get("excluded_aliases", {}).items()
        for value in values
    }
    overrides = {
        (language, normalize_text(value)): code.upper()
        for language, mappings in curation.get("ambiguous_alias_overrides", {}).items()
        for value, code in mappings.items()
    }
    resolved: dict[tuple[str, str], Alias] = {}
    collisions: dict[tuple[str, str], list[Alias]] = {}
    for item in aliases:
        normalized = item.normalized
        key = (item.language, normalized)
        if not normalized or key in excluded or normalized == item.country.casefold():
            continue
        if item.country not in country_codes:
            continue
        override = overrides.get(key)
        if override is not None and item.country != override:
            continue
        previous = resolved.get(key)
        if previous is None:
            resolved[key] = item
        elif previous.country != item.country:
            collisions.setdefault(key, [previous]).append(item)
        elif (TYPE_ORDER[item.kind], item.text.casefold()) < (
            TYPE_ORDER[previous.kind], previous.text.casefold()
        ):
            resolved[key] = item
    unresolved = {}
    automatically_excluded: list[str] = []
    for key, candidates in collisions.items():
        if key in overrides:
            continue
        country_aliases = {item.country for item in candidates if item.kind == "pais"}
        if key in additional_alias_keys or len(country_aliases) > 1:
            unresolved[key] = {item.country for item in candidates}
        else:
            resolved.pop(key, None)
            automatically_excluded.append(f"{key[0]}:{key[1]}")
    if unresolved:
        sample = ", ".join(
            f"{language}:{name}=>{'/'.join(sorted(codes))}"
            for (language, name), codes in sorted(unresolved.items())[:10]
        )
        raise CatalogGenerationError(f"Aliases ambiguos sin resolver: {sample}")

    sorted_countries = sorted(countries, key=lambda item: item["codigo_iso2"])
    sorted_aliases = sorted(
        (
            {
                "alias": item.text,
                "alias_normalizado": normalized,
                "tipo": item.kind,
                "idioma": language,
                "codigo_pais": item.country,
            }
            for (language, normalized), item in resolved.items()
        ),
        key=lambda item: (
            item["idioma"],
            item["alias_normalizado"],
            item["codigo_pais"],
            TYPE_ORDER[item["tipo"]],
        ),
    )
    catalog = {
        "version": version,
        "countries": sorted_countries,
        "aliases": sorted_aliases,
    }
    source_paths = [rest_countries_path, geonames_cities_path, curation_path]
    if alternate_names_path is not None:
        source_paths.append(alternate_names_path)
    manifest = {
        "catalog_version": version,
        "release_date": curation.get("release_date"),
        "city_population_threshold": 100000,
        "capitals_always_included": True,
        "sources": [
            {
                "name": path.name,
                "sha256": checksum(path),
                **curation.get("source_metadata", {}).get(path.name, {}),
            }
            for path in source_paths
        ],
        "licenses": curation.get("licenses", {}),
        "counts": {
            "countries": len(sorted_countries),
            "aliases": len(sorted_aliases),
            "capitals_from_rest_countries": sum(map(len, capitals.values())),
            "ambiguous_aliases_excluded": len(automatically_excluded),
        },
    }
    return catalog, manifest


def validate_output_path(path: Path) -> Path:
    """Resolve destinations inside the fixed geographic output directory."""
    try:
        # Keep the lexical root anchored to the installed backend. Resolving an
        # externally redirected root must not authorize its external target.
        expected_root = PROJECT_ROOT / "data" / "geography"
        root = OUTPUT_ROOT.resolve()
        if root != expected_root or OUTPUT_ROOT != expected_root:
            raise CatalogGenerationError("La raíz de salida geográfica está redirigida")
        if root.exists() and not root.is_dir():
            raise CatalogGenerationError("La raíz de salida debe ser un directorio")
        destination = path.resolve()
        if destination == root or not destination.is_relative_to(root):
            raise CatalogGenerationError("La salida debe estar dentro de data/geography del backend")
        if destination.is_dir():
            raise CatalogGenerationError("La salida debe ser un archivo, no un directorio")
        for parent in destination.parents:
            if parent == root:
                break
            if parent.exists() and not parent.is_dir():
                raise CatalogGenerationError("Un padre de la salida no es un directorio")
        return destination
    except (OSError, RuntimeError, ValueError) as error:
        if isinstance(error, CatalogGenerationError):
            raise
        raise CatalogGenerationError("No se puede validar la ruta de salida geográfica") from error


def validate_output_paths(catalog_path: Path, manifest_path: Path) -> tuple[Path, Path]:
    catalog = validate_output_path(catalog_path)
    manifest = validate_output_path(manifest_path)
    if catalog == manifest or (
        catalog.exists() and manifest.exists() and catalog.samefile(manifest)
    ):
        raise CatalogGenerationError("Catálogo y manifiesto deben usar archivos distintos")
    if catalog in manifest.parents or manifest in catalog.parents:
        raise CatalogGenerationError("Una salida no puede ser el directorio padre de la otra")
    return catalog, manifest


def write_json(path: Path, value: Any) -> None:
    destination = validate_output_path(path)
    serialized = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Recheck after mkdir and before publishing; the output tree is operator-owned.
    destination = validate_output_path(destination)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="\n", dir=destination.parent,
            prefix=".geography-", suffix=".json.tmp", delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            temporary.write(serialized)
        checked = validate_output_path(destination)
        if checked != destination:
            raise CatalogGenerationError("La ruta de salida cambió durante la generación")
        os.replace(temporary_path, destination)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rest-countries", type=Path, required=True)
    parser.add_argument("--geonames-cities", type=Path, required=True)
    parser.add_argument("--geonames-alternate-names", type=Path)
    parser.add_argument("--curation", type=Path, required=True)
    parser.add_argument("--catalog-output", type=Path, required=True)
    parser.add_argument("--manifest-output", type=Path, required=True)
    arguments = parser.parse_args()
    try:
        catalog_output, manifest_output = validate_output_paths(
            arguments.catalog_output, arguments.manifest_output,
        )
        catalog, manifest = generate(
            arguments.rest_countries,
            arguments.geonames_cities,
            arguments.curation,
            alternate_names_path=arguments.geonames_alternate_names,
        )
        write_json(catalog_output, catalog)
        write_json(manifest_output, manifest)
    except (CatalogGenerationError, GeographicInputPathError, OSError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
