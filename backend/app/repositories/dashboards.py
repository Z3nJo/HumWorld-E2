from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, Select, func, select
from sqlalchemy.orm import Session

from app.models import Channel, News, NewsTerm, RssSource, Term


@dataclass(frozen=True)
class DashboardAggregateRecord:
    continent: str
    country: str | None
    humor: Decimal | None
    news_count: int


@dataclass(frozen=True)
class InfluentialTermRecord:
    term_id: int
    term: str
    language: str
    weight: Decimal
    total_contribution: Decimal
    frequency: int


@dataclass(frozen=True)
class DashboardDayRecord:
    day: date
    humor: Decimal | None
    news_count: int


@dataclass(frozen=True)
class InfluentialNewsRecord:
    id_noticia: int
    titulo: str
    url: str
    canal: str
    continente: str
    pais: str | None
    fecha_registro: datetime
    valor_humor: Decimal


class DashboardRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    @staticmethod
    def _news_query(
        *, start_at: datetime, end_at: datetime,
        continent: str | None, country: str | None,
    ) -> Select[tuple[News]]:
        statement = (
            select(News)
            .join(RssSource, RssSource.id_fuente == News.id_fuente)
            .join(Channel, Channel.id_canal == RssSource.id_canal)
            .where(
                News.fecha_registro >= start_at,
                News.fecha_registro < end_at,
                News.valor_humor.is_not(None),
            )
        )
        if continent is not None:
            statement = statement.where(Channel.continente == continent)
        if country is not None:
            statement = statement.where(Channel.pais == country)
        return statement

    def daily_evolution(
        self, *, start_at: datetime, end_at: datetime,
        continent: str | None, country: str | None,
    ) -> list[DashboardDayRecord]:
        # Convert before grouping so the server/session timezone cannot shift a day.
        day = func.date(func.timezone("UTC", News.fecha_registro), type_=Date)
        statement = self._news_query(
            start_at=start_at, end_at=end_at, continent=continent, country=country,
        ).with_only_columns(
            day.label("day"),
            func.avg(News.valor_humor).label("humor"),
            func.count(News.id_noticia).label("news_count"),
        ).group_by(day).order_by(day)
        return [
            DashboardDayRecord(row.day, Decimal(row.humor), row.news_count)
            for row in self._session.execute(statement)
        ]

    def influential_news(
        self, *, start_at: datetime, end_at: datetime,
        continent: str | None, country: str | None,
    ) -> list[InfluentialNewsRecord]:
        statement = self._news_query(
            start_at=start_at, end_at=end_at, continent=continent, country=country,
        ).with_only_columns(
            News.id_noticia, News.titulo, News.url,
            Channel.nombre.label("canal"), Channel.continente, Channel.pais,
            News.fecha_registro, News.valor_humor,
        ).order_by(
            func.abs(News.valor_humor).desc(),
            News.fecha_registro.desc(),
            News.id_noticia.asc(),
        ).limit(10)
        return [
            InfluentialNewsRecord(**row._mapping)
            for row in self._session.execute(statement)
        ]

    def aggregate_countries(
        self, *, start_at: datetime, end_at: datetime,
    ) -> list[DashboardAggregateRecord]:
        statement = self._news_query(
            start_at=start_at, end_at=end_at, continent=None, country=None,
        ).with_only_columns(
            Channel.continente.label("continent"),
            Channel.pais.label("country"),
            func.avg(News.valor_humor).label("humor"),
            func.count(News.id_noticia).label("news_count"),
        ).where(Channel.pais.is_not(None)).group_by(
            Channel.continente, Channel.pais,
        ).order_by(Channel.continente, Channel.pais)
        return [
            DashboardAggregateRecord(
                continent=row.continent, country=row.country,
                humor=Decimal(row.humor), news_count=int(row.news_count),
            )
            for row in self._session.execute(statement)
        ]

    def aggregate(
        self,
        *,
        start_at: datetime,
        end_at: datetime,
        continent: str | None,
        country: str | None,
    ) -> list[DashboardAggregateRecord]:
        statement = (
            select(
                Channel.continente.label("continent"),
                func.avg(News.valor_humor).label("humor"),
                func.count(News.valor_humor).label("news_count"),
            )
            .select_from(News)
            .join(RssSource, RssSource.id_fuente == News.id_fuente)
            .join(Channel, Channel.id_canal == RssSource.id_canal)
            .where(
                News.fecha_registro >= start_at,
                News.fecha_registro < end_at,
                News.valor_humor.is_not(None),
            )
        )
        if continent is not None:
            statement = statement.where(Channel.continente == continent)
        if country is not None:
            statement = statement.where(Channel.pais == country)

        statement = statement.group_by(Channel.continente)
        if country is not None:
            statement = statement.add_columns(Channel.pais.label("country")).group_by(
                Channel.pais
            )

        rows = self._session.execute(statement).all()
        return [
            DashboardAggregateRecord(
                continent=row.continent,
                country=row.country if country is not None else None,
                humor=Decimal(row.humor) if row.humor is not None else None,
                news_count=int(row.news_count),
            )
            for row in rows
        ]

    def influential_terms(
        self,
        *,
        start_at: datetime,
        end_at: datetime,
        continent: str | None,
        country: str | None,
    ) -> list[InfluentialTermRecord]:
        weight = func.sum(func.abs(NewsTerm.aporte_humor))
        total_contribution = func.sum(NewsTerm.aporte_humor)
        frequency = func.sum(NewsTerm.ocurrencias)
        statement = (
            select(
                Term.id_termino.label("term_id"),
                Term.palabra.label("term"),
                Term.idioma.label("language"),
                weight.label("weight"),
                total_contribution.label("total_contribution"),
                frequency.label("frequency"),
            )
            .select_from(NewsTerm)
            .join(News, News.id_noticia == NewsTerm.id_noticia)
            .join(Term, Term.id_termino == NewsTerm.id_termino)
            .join(RssSource, RssSource.id_fuente == News.id_fuente)
            .join(Channel, Channel.id_canal == RssSource.id_canal)
            .where(
                News.fecha_registro >= start_at,
                News.fecha_registro < end_at,
                News.valor_humor.is_not(None),
            )
        )
        if continent is not None:
            statement = statement.where(Channel.continente == continent)
        if country is not None:
            statement = statement.where(Channel.pais == country)

        rows = self._session.execute(
            statement.group_by(Term.id_termino, Term.palabra, Term.idioma)
            .order_by(weight.desc(), frequency.desc(), Term.id_termino.asc())
            .limit(32)
        ).all()
        return [
            InfluentialTermRecord(
                term_id=row.term_id,
                term=row.term,
                language=row.language,
                weight=Decimal(row.weight),
                total_contribution=Decimal(row.total_contribution),
                frequency=int(row.frequency),
            )
            for row in rows
        ]
