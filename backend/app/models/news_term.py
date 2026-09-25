from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class NewsTerm(Base):
    __tablename__ = "noticia_termino"
    __table_args__ = (
        CheckConstraint("ocurrencias > 0", name="ck_noticia_termino_ocurrencias"),
    )

    id_noticia: Mapped[int] = mapped_column(
        ForeignKey("noticia.id_noticia", ondelete="CASCADE"),
        primary_key=True,
    )
    id_termino: Mapped[int] = mapped_column(
        ForeignKey("termino.id_termino", ondelete="RESTRICT"),
        primary_key=True,
    )
    ocurrencias: Mapped[int] = mapped_column(nullable=False)
    aporte_humor: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
