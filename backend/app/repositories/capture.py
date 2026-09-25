from collections.abc import Mapping, Sequence
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import Configuration, News, NewsTerm, RssSource, Term
from app.services.sentiment_engine import SentimentResult


class NewsCaptureRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_active_sources(self) -> list[RssSource]:
        statement = (
            select(RssSource)
            .where(RssSource.activa.is_(True))
            .order_by(RssSource.id_fuente)
        )
        return self._detached_sources(statement)

    def list_sources_by_ids(self, source_ids: Sequence[int]) -> list[RssSource]:
        statement = (
            select(RssSource)
            .where(RssSource.id_fuente.in_(source_ids))
            .order_by(RssSource.id_fuente)
        )
        return self._detached_sources(statement)

    def _detached_sources(self, statement) -> list[RssSource]:
        sources = list(self._session.scalars(statement).all())
        for source in sources:
            self._session.expunge(source)
        self._session.rollback()
        return sources

    def insert_news(self, news: Sequence[Mapping[str, object]]) -> list[News]:
        if not news:
            return []
        statement = (
            insert(News)
            .values(list(news))
            .on_conflict_do_nothing(index_elements=["id_fuente", "guid_origen"])
            .returning(News)
        )
        return list(self._session.scalars(statement).all())

    def list_active_terms(self, language: str) -> list[Term]:
        statement = (
            select(Term)
            .where(Term.activo.is_(True), Term.idioma == language)
            .order_by(Term.id_termino)
        )
        return list(self._session.scalars(statement).all())

    def get_parameter(self, key: str) -> Configuration | None:
        return self._session.get(Configuration, key)

    def persist_sentiment(
        self, news: News, result: SentimentResult, analyzed_at: datetime
    ) -> None:
        news.valor_humor = result.valor_humor
        news.fecha_analisis = analyzed_at
        self._session.add_all(
            NewsTerm(
                id_noticia=news.id_noticia,
                id_termino=item.id_termino,
                ocurrencias=item.ocurrencias,
                aporte_humor=item.aporte_humor,
            )
            for item in result.contributions
        )

    def update_source_capture(self, source_id: int, captured_at: datetime) -> None:
        self._session.execute(
            update(RssSource)
            .where(RssSource.id_fuente == source_id)
            .values(fecha_ultima_captura=captured_at)
        )

    def claim_pending_news(self, limit: int) -> list[News]:
        statement = (
            select(News)
            .where(News.fecha_analisis.is_(None))
            .order_by(News.id_noticia)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        return list(self._session.scalars(statement).all())

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()
