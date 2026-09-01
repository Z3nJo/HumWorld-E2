from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.source import RssSource


class News(Base):
    __tablename__ = "noticia"
    __table_args__ = (
        CheckConstraint("idioma IN ('es', 'en')", name="ck_noticia_idioma"),
        UniqueConstraint(
            "id_fuente",
            "guid_origen",
            name="uq_noticia_fuente_guid",
        ),
        Index("ix_noticia_fecha_registro", "fecha_registro"),
        Index("ix_noticia_valor_humor", "valor_humor"),
    )

    id_noticia: Mapped[int] = mapped_column(primary_key=True)
    id_fuente: Mapped[int] = mapped_column(
        ForeignKey("fuente_rss.id_fuente", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    guid_origen: Mapped[str] = mapped_column(String(500), nullable=False)
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    idioma: Mapped[str] = mapped_column(String(2), nullable=False)
    fecha_publicacion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )
    valor_humor: Mapped[Decimal | None] = mapped_column(Numeric(), nullable=True)
    fecha_analisis: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    fuente: Mapped["RssSource"] = relationship(back_populates="noticias")
