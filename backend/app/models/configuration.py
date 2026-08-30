from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Configuration(Base):
    __tablename__ = "configuracion"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('entero', 'decimal', 'texto', 'booleano')",
            name="ck_configuracion_tipo",
        ),
    )

    clave: Mapped[str] = mapped_column(String(100), primary_key=True)
    valor: Mapped[str] = mapped_column(String(), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(300), nullable=False)
    fecha_modificacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )
