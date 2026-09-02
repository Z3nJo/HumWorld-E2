from collections.abc import Mapping, Sequence
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import News, RssSource


class NewsCaptureRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_active_sources(self) -> list[RssSource]:
        statement = (
            select(RssSource)
            .where(RssSource.activa.is_(True))
            .order_by(RssSource.id_fuente)
        )
        return list(self._session.scalars(statement).all())

    def list_sources_by_ids(self, source_ids: Sequence[int]) -> list[RssSource]:
        statement = (
            select(RssSource)
            .where(RssSource.id_fuente.in_(source_ids))
            .order_by(RssSource.id_fuente)
        )
        return list(self._session.scalars(statement).all())

    def persist_source_capture(
        self,
        source_id: int,
        news: Sequence[Mapping[str, object]],
        captured_at: datetime,
    ) -> int:
        try:
            inserted = 0
            if news:
                statement = (
                    insert(News)
                    .values(list(news))
                    .on_conflict_do_nothing(
                        index_elements=["id_fuente", "guid_origen"]
                    )
                    .returning(News.id_noticia)
                )
                inserted = len(list(self._session.scalars(statement).all()))
            self._session.execute(
                update(RssSource)
                .where(RssSource.id_fuente == source_id)
                .values(fecha_ultima_captura=captured_at)
            )
            self._session.commit()
            return inserted
        except Exception:
            self._session.rollback()
            raise
