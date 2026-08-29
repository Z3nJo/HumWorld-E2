"""Create channel and RSS source tables.

Revision ID: 20260828_01
Revises:
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260828_01"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "canal",
        sa.Column("id_canal", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("continente", sa.String(length=10), nullable=False),
        sa.Column("pais", sa.String(length=2), nullable=True),
        sa.Column("url_sitio", sa.String(length=500), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "fecha_alta",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "continente IN ('Africa', 'America', 'Antartida', 'Asia', 'Europa', 'Oceania')",
            name="ck_canal_continente",
        ),
        sa.PrimaryKeyConstraint("id_canal"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_canal_continente_pais", "canal", ["continente", "pais"])

    op.create_table(
        "fuente_rss",
        sa.Column("id_fuente", sa.Integer(), nullable=False),
        sa.Column("id_canal", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("url_feed", sa.String(length=500), nullable=False),
        sa.Column("categoria_iptc", sa.String(length=50), nullable=False),
        sa.Column("idioma", sa.String(length=2), nullable=False),
        sa.Column("activa", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("fecha_ultima_captura", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "fecha_alta",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "categoria_iptc IN ("
            "'arts/culture/entertainment/media', 'conflict/war/peace', "
            "'crime/law/justice', 'disaster/accident', "
            "'economy/business/finance', 'education', 'environment', 'health', "
            "'human interest', 'labour', 'lifestyle/leisure', 'politics', "
            "'religion', 'science/technology', 'society', 'sport', 'weather'"
            ")",
            name="ck_fuente_rss_categoria_iptc",
        ),
        sa.CheckConstraint("idioma IN ('es', 'en')", name="ck_fuente_rss_idioma"),
        sa.ForeignKeyConstraint(["id_canal"], ["canal.id_canal"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id_fuente"),
        sa.UniqueConstraint("url_feed"),
    )
    op.create_index("ix_fuente_rss_id_canal", "fuente_rss", ["id_canal"])


def downgrade() -> None:
    op.drop_index("ix_fuente_rss_id_canal", table_name="fuente_rss")
    op.drop_table("fuente_rss")
    op.drop_index("ix_canal_continente_pais", table_name="canal")
    op.drop_table("canal")
