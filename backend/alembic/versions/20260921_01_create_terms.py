"""Create dictionary term table.

Revision ID: 20260921_01
Revises: 20260901_01
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260921_01"
down_revision: str | None = "20260901_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "termino",
        sa.Column("id_termino", sa.Integer(), nullable=False),
        sa.Column("palabra", sa.String(length=100), nullable=False),
        sa.Column("idioma", sa.String(length=2), nullable=False),
        sa.Column("valor", sa.Numeric(), nullable=False),
        sa.Column(
            "activo",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "fecha_alta",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "fecha_modificacion",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("idioma IN ('es', 'en')", name="ck_termino_idioma"),
        sa.PrimaryKeyConstraint("id_termino"),
        sa.UniqueConstraint("palabra", "idioma", name="uq_termino_palabra_idioma"),
    )


def downgrade() -> None:
    op.drop_table("termino")
