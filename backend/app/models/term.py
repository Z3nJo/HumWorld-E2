from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class Term(Base):
    __tablename__ = "termino"
    __table_args__ = (
        CheckConstraint("idioma IN ('es', 'en')", name="ck_termino_idioma"),
        UniqueConstraint(
            "palabra",
            "idioma",
            name="uq_termino_palabra_idioma",
        ),
    )

    id_termino: Mapped[int] = mapped_column(primary_key=True)
    palabra: Mapped[str] = mapped_column(String(100), nullable=False)
    idioma: Mapped[str] = mapped_column(String(2), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(), nullable=False)
    activo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    fecha_alta: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )
    fecha_modificacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )
