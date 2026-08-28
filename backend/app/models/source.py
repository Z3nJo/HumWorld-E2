from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.channel import Channel


class RssSource(Base):
    __tablename__ = "fuente_rss"
    __table_args__ = (
        CheckConstraint("idioma IN ('es', 'en')", name="ck_fuente_rss_idioma"),
        CheckConstraint(
            "categoria_iptc IN ("
            "'arts/culture/entertainment/media', 'conflict/war/peace', "
            "'crime/law/justice', 'disaster/accident', "
            "'economy/business/finance', 'education', 'environment', 'health', "
            "'human interest', 'labour', 'lifestyle/leisure', 'politics', "
            "'religion', 'science/technology', 'society', 'sport', 'weather'"
            ")",
            name="ck_fuente_rss_categoria_iptc",
        ),
    )

    id_fuente: Mapped[int] = mapped_column(primary_key=True)
    id_canal: Mapped[int] = mapped_column(
        ForeignKey("canal.id_canal", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    url_feed: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    categoria_iptc: Mapped[str] = mapped_column(String(50), nullable=False)
    idioma: Mapped[str] = mapped_column(String(2), nullable=False)
    activa: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    fecha_ultima_captura: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    fecha_alta: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    canal: Mapped["Channel"] = relationship(back_populates="fuentes")
