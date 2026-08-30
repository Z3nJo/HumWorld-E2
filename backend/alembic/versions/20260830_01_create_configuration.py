"""Create configuration table.

Revision ID: 20260830_01
Revises: 20260828_01
Create Date: 2026-08-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260830_01"
down_revision: str | None = "20260828_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "configuracion",
        sa.Column("clave", sa.String(length=100), nullable=False),
        sa.Column("valor", sa.String(), nullable=False),
        sa.Column("tipo", sa.String(length=10), nullable=False),
        sa.Column("descripcion", sa.String(length=300), nullable=False),
        sa.Column(
            "fecha_modificacion",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "tipo IN ('entero', 'decimal', 'texto', 'booleano')",
            name="ck_configuracion_tipo",
        ),
        sa.PrimaryKeyConstraint("clave"),
    )


def downgrade() -> None:
    op.drop_table("configuracion")
