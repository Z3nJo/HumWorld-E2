from decimal import Decimal

from sqlalchemy import Numeric, UniqueConstraint

from app.models import Base, Term


def test_term_model_matches_mod_01_minimum_schema() -> None:
    table = Base.metadata.tables["termino"]

    assert set(table.columns.keys()) == {
        "id_termino",
        "palabra",
        "idioma",
        "valor",
        "activo",
        "fecha_alta",
        "fecha_modificacion",
    }
    assert table.c.palabra.type.length == 100
    assert isinstance(table.c.valor.type, Numeric)
    assert table.c.valor.type.precision is None
    assert table.c.valor.type.scale is None
    assert table.c.activo.default.arg is True
    unique_columns = {
        tuple(column.name for column in constraint.columns)
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("palabra", "idioma") in unique_columns


def test_term_accepts_decimal_without_semantic_range() -> None:
    term = Term(
        palabra="calma",
        idioma="es",
        valor=Decimal("123.456"),
    )

    assert term.valor == Decimal("123.456")
