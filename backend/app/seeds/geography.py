"""Idempotent seed for the generated geographic catalog."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.database import get_session_factory
from app.models import Channel, Country, CountryAlias
from app.services.geographic_input_paths import GeographicInputPathError, validate_geographic_input

DEFAULT_CATALOG = Path(__file__).resolve().parents[2] / "data" / "geography" / "catalog.json"


class GeographicSeedConflictError(ValueError):
    pass


@dataclass(frozen=True)
class GeographicSeedResult:
    version: str
    countries: int
    aliases_created: int
    aliases_updated: int
    aliases_deactivated: int


def load_catalog(path: Path = DEFAULT_CATALOG) -> dict:
    path = validate_geographic_input(path)
    with path.open(encoding="utf-8") as source:
        catalog = json.load(source)
    if not catalog.get("version") or not catalog.get("countries") or not catalog.get("aliases"):
        raise GeographicSeedConflictError("El catálogo geográfico no es utilizable")
    return catalog


def seed_geography(session: Session, catalog: dict) -> GeographicSeedResult:
    version = str(catalog.get("version", "")).strip()
    countries = catalog.get("countries", [])
    aliases = catalog.get("aliases", [])
    if not version or not countries or not aliases:
        raise GeographicSeedConflictError("El catálogo geográfico no es utilizable")

    alias_keys = {
        (item["idioma"], item["alias_normalizado"]): item for item in aliases
    }
    if len(alias_keys) != len(aliases):
        raise GeographicSeedConflictError("El catálogo contiene aliases duplicados")

    existing_aliases = {
        (item.idioma, item.alias_normalizado): item
        for item in session.scalars(select(CountryAlias)).all()
    }
    for key, item in alias_keys.items():
        existing = existing_aliases.get(key)
        if existing is not None and existing.codigo_pais != item["codigo_pais"]:
            raise GeographicSeedConflictError(
                f"El alias {key[0]}:{key[1]} ya pertenece a {existing.codigo_pais}"
            )

    created = 0
    updated = 0
    try:
        for item in countries:
            country = session.get(Country, item["codigo_iso2"])
            if country is None:
                country = Country(codigo_iso2=item["codigo_iso2"])
                session.add(country)
            country.nombre_es = item["nombre_es"]
            country.nombre_en = item["nombre_en"]
            country.continente = item["continente"]
        session.flush()

        for key, item in alias_keys.items():
            alias = existing_aliases.get(key)
            if alias is None:
                alias = CountryAlias(
                    alias=item["alias"],
                    alias_normalizado=item["alias_normalizado"],
                    tipo=item["tipo"],
                    idioma=item["idioma"],
                    codigo_pais=item["codigo_pais"],
                    activo=True,
                    version_catalogo=version,
                )
                session.add(alias)
                created += 1
            else:
                alias.alias = item["alias"]
                alias.tipo = item["tipo"]
                alias.activo = True
                alias.version_catalogo = version
                updated += 1
        session.flush()
        result = session.execute(
            update(CountryAlias)
            .where(CountryAlias.version_catalogo != version, CountryAlias.activo.is_(True))
            .values(activo=False)
        )
        deactivated = result.rowcount or 0
        session.commit()
    except Exception:
        session.rollback()
        raise
    return GeographicSeedResult(version, len(countries), created, updated, deactivated)


def diagnose_channels(session: Session) -> list[str]:
    countries = {item.codigo_iso2: item for item in session.scalars(select(Country)).all()}
    diagnostics: list[str] = []
    for channel in session.scalars(select(Channel).order_by(Channel.id_canal)).all():
        if channel.pais is None:
            continue
        country = countries.get(channel.pais.upper())
        if country is None:
            diagnostics.append(
                f"canal={channel.id_canal} pais={channel.pais}: ausente del catálogo"
            )
        elif country.continente != channel.continente:
            diagnostics.append(
                f"canal={channel.id_canal} pais={channel.pais}: continente "
                f"{channel.continente}, esperado {country.continente}"
            )
    return diagnostics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--diagnose-channels", action="store_true")
    arguments = parser.parse_args()
    try:
        catalog = load_catalog(arguments.catalog)
    except (GeographicInputPathError, GeographicSeedConflictError, OSError, json.JSONDecodeError) as error:
        parser.error(str(error))
    with get_session_factory()() as session:
        result = seed_geography(session, catalog)
        diagnostics = diagnose_channels(session) if arguments.diagnose_channels else []
    print(
        f"Catálogo {result.version}: {result.countries} países, "
        f"{result.aliases_created} aliases creados, {result.aliases_updated} actualizados, "
        f"{result.aliases_deactivated} desactivados"
    )
    for diagnostic in diagnostics:
        print(diagnostic)


if __name__ == "__main__":
    main()
