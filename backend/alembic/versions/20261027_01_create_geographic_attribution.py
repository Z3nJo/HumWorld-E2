"""Create versioned geographic catalog and news attribution.

Revision ID: 20261027_01
Revises: 20260924_01
Create Date: 2026-10-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261027_01"
down_revision: str | None = "20260924_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pais",
        sa.Column("codigo_iso2", sa.String(length=2), nullable=False),
        sa.Column("nombre_es", sa.String(length=150), nullable=False),
        sa.Column("nombre_en", sa.String(length=150), nullable=False),
        sa.Column("continente", sa.String(length=10), nullable=False),
        sa.CheckConstraint(
            "continente IN ('Africa', 'America', 'Antartida', 'Asia', 'Europa', 'Oceania')",
            name="ck_pais_continente",
        ),
        sa.PrimaryKeyConstraint("codigo_iso2"),
    )
    op.create_table(
        "pais_alias",
        sa.Column("id_alias", sa.Integer(), nullable=False),
        sa.Column("alias", sa.String(length=200), nullable=False),
        sa.Column("alias_normalizado", sa.String(length=200), nullable=False),
        sa.Column("tipo", sa.String(length=12), nullable=False),
        sa.Column("idioma", sa.String(length=2), nullable=False),
        sa.Column("codigo_pais", sa.String(length=2), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("version_catalogo", sa.String(length=80), nullable=False),
        sa.CheckConstraint(
            "idioma IN ('es', 'en')", name="ck_pais_alias_idioma"
        ),
        sa.CheckConstraint(
            "tipo IN ('pais', 'gentilicio', 'ciudad')", name="ck_pais_alias_tipo"
        ),
        sa.ForeignKeyConstraint(
            ["codigo_pais"], ["pais.codigo_iso2"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id_alias"),
        sa.UniqueConstraint(
            "idioma", "alias_normalizado", name="uq_pais_alias_idioma_normalizado"
        ),
    )
    op.create_index(
        "ix_pais_alias_idioma_activo", "pais_alias", ["idioma", "activo"]
    )
    op.create_index(
        "ix_pais_alias_normalizado", "pais_alias", ["alias_normalizado"]
    )
    op.add_column(
        "noticia",
        sa.Column("fecha_clasificacion_geografica", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "noticia",
        sa.Column("version_clasificador_geografico", sa.String(length=80), nullable=True),
    )
    op.create_index(
        "ix_noticia_clasificacion_geografica",
        "noticia",
        ["fecha_clasificacion_geografica", "version_clasificador_geografico"],
    )
    op.create_table(
        "noticia_pais",
        sa.Column("id_noticia", sa.Integer(), nullable=False),
        sa.Column("codigo_pais", sa.String(length=2), nullable=False),
        sa.Column("origen", sa.String(length=8), nullable=False),
        sa.Column("id_alias", sa.Integer(), nullable=True),
        sa.Column("campo", sa.String(length=11), nullable=True),
        sa.CheckConstraint(
            "campo IS NULL OR campo IN ('titulo', 'descripcion')",
            name="ck_noticia_pais_campo",
        ),
        sa.CheckConstraint(
            "(origen = 'mencion' AND id_alias IS NOT NULL AND campo IS NOT NULL) "
            "OR (origen = 'fuente' AND id_alias IS NULL AND campo IS NULL)",
            name="ck_noticia_pais_evidencia",
        ),
        sa.CheckConstraint(
            "origen IN ('mencion', 'fuente')", name="ck_noticia_pais_origen"
        ),
        sa.ForeignKeyConstraint(
            ["codigo_pais"], ["pais.codigo_iso2"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["id_alias"], ["pais_alias.id_alias"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["id_noticia"], ["noticia.id_noticia"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id_noticia", "codigo_pais"),
    )
    op.create_index(
        "ix_noticia_pais_codigo_noticia",
        "noticia_pais",
        ["codigo_pais", "id_noticia"],
    )


def downgrade() -> None:
    op.drop_index("ix_noticia_pais_codigo_noticia", table_name="noticia_pais")
    op.drop_table("noticia_pais")
    op.drop_index("ix_noticia_clasificacion_geografica", table_name="noticia")
    op.drop_column("noticia", "version_clasificador_geografico")
    op.drop_column("noticia", "fecha_clasificacion_geografica")
    op.drop_index("ix_pais_alias_normalizado", table_name="pais_alias")
    op.drop_index("ix_pais_alias_idioma_activo", table_name="pais_alias")
    op.drop_table("pais_alias")
    op.drop_table("pais")
