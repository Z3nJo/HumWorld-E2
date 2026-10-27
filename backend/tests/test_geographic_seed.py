from copy import deepcopy

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import Base, Channel, CountryAlias
from app.seeds.geography import (
    GeographicSeedConflictError,
    diagnose_channels,
    seed_geography,
)


CATALOG = {
    "version": "v1",
    "countries": [
        {"codigo_iso2": "CL", "nombre_es": "Chile", "nombre_en": "Chile", "continente": "America"}
    ],
    "aliases": [
        {"alias": "Chile", "alias_normalizado": "chile", "tipo": "pais", "idioma": "es", "codigo_pais": "CL"}
    ],
}


@pytest.fixture
def session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as value:
        yield value


def test_seed_is_idempotent_and_deactivates_retired_aliases(session: Session) -> None:
    first = seed_geography(session, CATALOG)
    second = seed_geography(session, CATALOG)
    changed = deepcopy(CATALOG)
    changed["version"] = "v2"
    changed["aliases"] = [
        {"alias": "República de Chile", "alias_normalizado": "republica de chile", "tipo": "pais", "idioma": "es", "codigo_pais": "CL"}
    ]
    third = seed_geography(session, changed)
    aliases = list(session.scalars(select(CountryAlias).order_by(CountryAlias.id_alias)))
    assert (first.aliases_created, second.aliases_created, third.aliases_created) == (1, 0, 1)
    assert [(item.alias_normalizado, item.activo) for item in aliases] == [
        ("chile", False),
        ("republica de chile", True),
    ]


def test_seed_rejects_incompatible_persisted_alias(session: Session) -> None:
    seed_geography(session, CATALOG)
    conflict = deepcopy(CATALOG)
    conflict["countries"].append(
        {"codigo_iso2": "AR", "nombre_es": "Argentina", "nombre_en": "Argentina", "continente": "America"}
    )
    conflict["aliases"][0]["codigo_pais"] = "AR"
    with pytest.raises(GeographicSeedConflictError):
        seed_geography(session, conflict)


def test_channel_diagnostic_reports_without_modifying(session: Session) -> None:
    seed_geography(session, CATALOG)
    session.add_all(
        [
            Channel(nombre="Wrong continent", continente="Europa", pais="CL"),
            Channel(nombre="Unknown country", continente="America", pais="ZZ"),
            Channel(nombre="Without country", continente="America", pais=None),
        ]
    )
    session.commit()
    before = [(item.nombre, item.continente, item.pais) for item in session.scalars(select(Channel))]
    diagnostics = diagnose_channels(session)
    after = [(item.nombre, item.continente, item.pais) for item in session.scalars(select(Channel))]
    assert len(diagnostics) == 2
    assert "continente Europa, esperado America" in diagnostics[0]
    assert "ausente del catálogo" in diagnostics[1]
    assert after == before
