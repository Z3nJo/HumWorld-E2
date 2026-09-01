"""Create news table for automatic RSS capture.

Revision ID: 20260901_01
Revises: 20260830_01
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260901_01"
down_revision: str | None = "20260830_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "noticia",
        sa.Column("id_noticia", sa.Integer(), nullable=False),
        sa.Column("id_fuente", sa.Integer(), nullable=False),
        sa.Column("guid_origen", sa.String(length=500), nullable=False),
        sa.Column("titulo", sa.String(length=500), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("idioma", sa.String(length=2), nullable=False),
        sa.Column("fecha_publicacion", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "fecha_registro",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("valor_humor", sa.Numeric(), nullable=True),
        sa.Column("fecha_analisis", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("idioma IN ('es', 'en')", name="ck_noticia_idioma"),
        sa.ForeignKeyConstraint(
            ["id_fuente"],
            ["fuente_rss.id_fuente"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id_noticia"),
        sa.UniqueConstraint(
            "id_fuente",
            "guid_origen",
            name="uq_noticia_fuente_guid",
        ),
    )
    op.create_index("ix_noticia_id_fuente", "noticia", ["id_fuente"])
    op.create_index("ix_noticia_fecha_registro", "noticia", ["fecha_registro"])
    op.create_index("ix_noticia_valor_humor", "noticia", ["valor_humor"])


def downgrade() -> None:
    op.drop_index("ix_noticia_valor_humor", table_name="noticia")
    op.drop_index("ix_noticia_fecha_registro", table_name="noticia")
    op.drop_index("ix_noticia_id_fuente", table_name="noticia")
    op.drop_table("noticia")
