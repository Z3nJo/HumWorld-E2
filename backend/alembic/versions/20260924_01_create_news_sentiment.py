"""Persist news sentiment and term contributions.

Revision ID: 20260924_01
Revises: 20260921_01
Create Date: 2026-09-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260924_01"
down_revision: str | None = "20260921_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    incompatible = op.get_bind().scalar(
        sa.text(
            "SELECT count(*) FROM noticia WHERE valor_humor IS NOT NULL AND "
            "(valor_humor < -1 OR valor_humor > 1 OR "
            "valor_humor <> round(valor_humor, 3))"
        )
    )
    if incompatible:
        raise ValueError(
            "Existen noticias con valor_humor fuera de [-1, 1] o con más "
            "de tres decimales; corregirlas antes de aplicar la migración"
        )
    op.create_table(
        "noticia_termino",
        sa.Column("id_noticia", sa.Integer(), nullable=False),
        sa.Column("id_termino", sa.Integer(), nullable=False),
        sa.Column("ocurrencias", sa.Integer(), nullable=False),
        sa.Column("aporte_humor", sa.Numeric(8, 2), nullable=False),
        sa.CheckConstraint(
            "ocurrencias > 0", name="ck_noticia_termino_ocurrencias"
        ),
        sa.ForeignKeyConstraint(
            ["id_noticia"], ["noticia.id_noticia"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["id_termino"], ["termino.id_termino"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id_noticia", "id_termino"),
    )
    op.alter_column(
        "noticia",
        "valor_humor",
        existing_type=sa.Numeric(),
        type_=sa.Numeric(4, 3),
        existing_nullable=True,
    )
    op.create_check_constraint(
        "ck_noticia_valor_humor_rango", "noticia", "valor_humor BETWEEN -1 AND 1"
    )
    op.create_index(
        "ix_noticia_pendiente_analisis",
        "noticia",
        ["id_noticia"],
        postgresql_where=sa.text("fecha_analisis IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_noticia_pendiente_analisis", table_name="noticia")
    op.drop_constraint("ck_noticia_valor_humor_rango", "noticia", type_="check")
    op.alter_column(
        "noticia",
        "valor_humor",
        existing_type=sa.Numeric(4, 3),
        type_=sa.Numeric(),
        existing_nullable=True,
    )
    op.drop_table("noticia_termino")
