from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.news import News


class Country(Base):
    __tablename__ = "pais"
    __table_args__ = (
        CheckConstraint(
            "continente IN ('Africa', 'America', 'Antartida', 'Asia', 'Europa', 'Oceania')",
            name="ck_pais_continente",
        ),
    )

    codigo_iso2: Mapped[str] = mapped_column(String(2), primary_key=True)
    nombre_es: Mapped[str] = mapped_column(String(150), nullable=False)
    nombre_en: Mapped[str] = mapped_column(String(150), nullable=False)
    continente: Mapped[str] = mapped_column(String(10), nullable=False)

    aliases: Mapped[list["CountryAlias"]] = relationship(
        back_populates="pais", passive_deletes=True
    )


class CountryAlias(Base):
    __tablename__ = "pais_alias"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('pais', 'gentilicio', 'ciudad')",
            name="ck_pais_alias_tipo",
        ),
        CheckConstraint("idioma IN ('es', 'en')", name="ck_pais_alias_idioma"),
        UniqueConstraint(
            "idioma", "alias_normalizado", name="uq_pais_alias_idioma_normalizado"
        ),
        Index("ix_pais_alias_idioma_activo", "idioma", "activo"),
        Index("ix_pais_alias_normalizado", "alias_normalizado"),
    )

    id_alias: Mapped[int] = mapped_column(primary_key=True)
    alias: Mapped[str] = mapped_column(String(200), nullable=False)
    alias_normalizado: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(String(12), nullable=False)
    idioma: Mapped[str] = mapped_column(String(2), nullable=False)
    codigo_pais: Mapped[str] = mapped_column(
        ForeignKey("pais.codigo_iso2", ondelete="RESTRICT"), nullable=False
    )
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    version_catalogo: Mapped[str] = mapped_column(String(80), nullable=False)

    pais: Mapped[Country] = relationship(back_populates="aliases")


class NewsCountry(Base):
    __tablename__ = "noticia_pais"
    __table_args__ = (
        CheckConstraint(
            "origen IN ('mencion', 'fuente')", name="ck_noticia_pais_origen"
        ),
        CheckConstraint(
            "campo IS NULL OR campo IN ('titulo', 'descripcion')",
            name="ck_noticia_pais_campo",
        ),
        CheckConstraint(
            "(origen = 'mencion' AND id_alias IS NOT NULL AND campo IS NOT NULL) "
            "OR (origen = 'fuente' AND id_alias IS NULL AND campo IS NULL)",
            name="ck_noticia_pais_evidencia",
        ),
        Index("ix_noticia_pais_codigo_noticia", "codigo_pais", "id_noticia"),
    )

    id_noticia: Mapped[int] = mapped_column(
        ForeignKey("noticia.id_noticia", ondelete="CASCADE"), primary_key=True
    )
    codigo_pais: Mapped[str] = mapped_column(
        ForeignKey("pais.codigo_iso2", ondelete="RESTRICT"), primary_key=True
    )
    origen: Mapped[str] = mapped_column(String(8), nullable=False)
    id_alias: Mapped[int | None] = mapped_column(
        ForeignKey("pais_alias.id_alias", ondelete="RESTRICT"), nullable=True
    )
    campo: Mapped[str | None] = mapped_column(String(11), nullable=True)

    noticia: Mapped["News"] = relationship(back_populates="paises")
    pais: Mapped[Country] = relationship()
    alias: Mapped[CountryAlias | None] = relationship()
