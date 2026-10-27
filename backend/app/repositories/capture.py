from collections.abc import Mapping, Sequence
from datetime import datetime

from sqlalchemy import delete, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Channel,
    Configuration,
    Country,
    CountryAlias,
    News,
    NewsCountry,
    NewsTerm,
    RssSource,
    Term,
)
from app.services.geographic_attribution import GeographicAttributionResult
from app.services.sentiment_engine import SentimentResult


class NewsCaptureRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_active_sources(self) -> list[RssSource]:
        statement = (
            select(RssSource)
            .join(RssSource.canal)
            .options(joinedload(RssSource.canal))
            .where(RssSource.activa.is_(True), Channel.activo.is_(True))
            .order_by(RssSource.id_fuente)
        )
        return self._detached_sources(statement)

    def list_sources_by_ids(self, source_ids: Sequence[int]) -> list[RssSource]:
        statement = (
            select(RssSource)
            .options(joinedload(RssSource.canal))
            .where(RssSource.id_fuente.in_(source_ids))
            .order_by(RssSource.id_fuente)
        )
        return self._detached_sources(statement)

    def _detached_sources(self, statement) -> list[RssSource]:
        sources = list(self._session.scalars(statement).all())
        self._session.expunge_all()
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

    def load_geographic_catalog(
        self, language: str
    ) -> tuple[str, list[CountryAlias], list[str]]:
        aliases = list(
            self._session.scalars(
                select(CountryAlias)
                .where(CountryAlias.activo.is_(True), CountryAlias.idioma == language)
                .order_by(CountryAlias.id_alias)
            ).all()
        )
        versions = {item.version_catalogo for item in aliases}
        if len(versions) != 1:
            version = ""
        else:
            version = versions.pop()
        countries = list(
            self._session.scalars(select(Country.codigo_iso2).order_by(Country.codigo_iso2)).all()
        )
        return version, aliases, countries

    def persist_geographic_attribution(
        self,
        news: News,
        result: GeographicAttributionResult,
        classified_at: datetime,
        version: str,
    ) -> None:
        self._session.execute(
            delete(NewsCountry).where(NewsCountry.id_noticia == news.id_noticia)
        )
        self._session.add_all(
            NewsCountry(
                id_noticia=news.id_noticia,
                codigo_pais=item.codigo_pais,
                origen=item.origen,
                id_alias=item.id_alias,
                campo=item.campo,
            )
            for item in result.countries
        )
        news.fecha_clasificacion_geografica = classified_at
        news.version_clasificador_geografico = version

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
            .with_for_update(skip_locked=True, of=News)
        )
        return list(self._session.scalars(statement).all())

    def claim_pending_geographic_news(
        self, limit: int, version: str, language: str
    ) -> list[News]:
        statement = (
            select(News)
            .join(News.fuente)
            .join(RssSource.canal)
            .options(joinedload(News.fuente).joinedload(RssSource.canal))
            .where(
                News.idioma == language,
                or_(
                    News.fecha_clasificacion_geografica.is_(None),
                    News.version_clasificador_geografico != version,
                )
            )
            .order_by(News.id_noticia)
            .limit(limit)
            .with_for_update(skip_locked=True, of=News)
        )
        return list(self._session.scalars(statement).all())

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()
