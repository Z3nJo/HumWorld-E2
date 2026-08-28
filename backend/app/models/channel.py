from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.domains import Continent

if TYPE_CHECKING:
    from app.models.source import RssSource


class Channel(Base):
    __tablename__ = "canal"
    __table_args__ = (
        CheckConstraint(
            "continente IN ('Africa', 'America', 'Antartida', 'Asia', 'Europa', 'Oceania')",
            name="ck_canal_continente",
        ),
        Index("ix_canal_continente_pais", "continente", "pais"),
    )

    id_canal: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    continente: Mapped[str] = mapped_column(String(10), nullable=False)
    pais: Mapped[str | None] = mapped_column(String(2), nullable=True)
    url_sitio: Mapped[str | None] = mapped_column(String(500), nullable=True)
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

    fuentes: Mapped[list["RssSource"]] = relationship(
        back_populates="canal",
        passive_deletes=True,
    )

    @property
    def continente_enum(self) -> Continent:
        return Continent(self.continente)
