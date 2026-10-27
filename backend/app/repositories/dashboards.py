from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, Select, and_, exists, func, or_, select, union
from sqlalchemy.orm import Session

from app.models import Channel, Country, News, NewsCountry, NewsTerm, RssSource, Term


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
            statement = statement.where(
                DashboardRepository._geographic_filter(
                    continent=continent, country=country
                )
            )
        elif country is not None:
            statement = statement.where(
                DashboardRepository._geographic_filter(
                    continent=None, country=country
                )
            )
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
        candidates = self._news_query(
            start_at=start_at, end_at=end_at, continent=continent, country=country,
        ).with_only_columns(
            News.id_noticia, News.titulo, News.url,
            Channel.nombre.label("canal"), Channel.continente, Channel.pais,
            News.fecha_registro, News.valor_humor,
            func.row_number().over(
                partition_by=News.url,
                order_by=(News.fecha_registro.asc(), News.id_noticia.asc()),
            ).label("url_rank"),
        ).subquery()
        statement = select(
            candidates.c.id_noticia,
            candidates.c.titulo,
            candidates.c.url,
            candidates.c.canal,
            candidates.c.continente,
            candidates.c.pais,
            candidates.c.fecha_registro,
            candidates.c.valor_humor,
        ).where(candidates.c.url_rank == 1).order_by(
            func.abs(candidates.c.valor_humor).desc(),
            candidates.c.fecha_registro.desc(),
            candidates.c.id_noticia.asc(),
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
            Country.continente.label("continent"),
            NewsCountry.codigo_pais.label("country"),
            func.avg(News.valor_humor).label("humor"),
            func.count(News.id_noticia).label("news_count"),
        ).join(
            NewsCountry, NewsCountry.id_noticia == News.id_noticia
        ).join(
            Country, Country.codigo_iso2 == NewsCountry.codigo_pais
        ).group_by(
            Country.continente, NewsCountry.codigo_pais,
        ).order_by(Country.continente, NewsCountry.codigo_pais)
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
        base_filters = (
            News.fecha_registro >= start_at,
            News.fecha_registro < end_at,
            News.valor_humor.is_not(None),
        )
        if country is not None:
            statement = (
                select(
                    Country.continente.label("continent"),
                    NewsCountry.codigo_pais.label("country"),
                    func.avg(News.valor_humor).label("humor"),
                    func.count(News.id_noticia).label("news_count"),
                )
                .select_from(News)
                .join(NewsCountry, NewsCountry.id_noticia == News.id_noticia)
                .join(Country, Country.codigo_iso2 == NewsCountry.codigo_pais)
                .where(*base_filters, NewsCountry.codigo_pais == country)
                .group_by(Country.continente, NewsCountry.codigo_pais)
            )
            if continent is not None:
                statement = statement.where(Country.continente == continent)
        else:
            membership = self._continent_membership()
            statement = (
                select(
                    membership.c.continent.label("continent"),
                    func.avg(News.valor_humor).label("humor"),
                    func.count(News.id_noticia).label("news_count"),
                )
                .select_from(News)
                .join(membership, membership.c.id_noticia == News.id_noticia)
                .where(*base_filters)
                .group_by(membership.c.continent)
            )
            if continent is not None:
                statement = statement.where(membership.c.continent == continent)

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
        geographic_filter = self._geographic_filter(
            continent=continent, country=country
        )
        if geographic_filter is not None:
            statement = statement.where(geographic_filter)

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
    @staticmethod
    def _geographic_filter(
        *, continent: str | None, country: str | None
    ):
        country_membership = exists(
            select(1).where(
                NewsCountry.id_noticia == News.id_noticia,
                NewsCountry.codigo_pais == country,
            )
        ) if country is not None else None
        if continent is None:
            return country_membership
        attributed_continent = exists(
            select(1)
            .select_from(NewsCountry)
            .join(Country, Country.codigo_iso2 == NewsCountry.codigo_pais)
            .where(
                NewsCountry.id_noticia == News.id_noticia,
                Country.continente == continent,
            )
        )
        any_country = exists(
            select(1).where(NewsCountry.id_noticia == News.id_noticia)
        )
        fallback_continent = and_(
            News.fecha_clasificacion_geografica.is_not(None),
            ~any_country,
            Channel.continente == continent,
        )
        continent_membership = or_(attributed_continent, fallback_continent)
        if country_membership is not None:
            return and_(country_membership, continent_membership)
        return continent_membership

    @staticmethod
    def _continent_membership():
        attributed = (
            select(
                NewsCountry.id_noticia.label("id_noticia"),
                Country.continente.label("continent"),
            )
            .join(Country, Country.codigo_iso2 == NewsCountry.codigo_pais)
            .distinct()
        )
        any_country = exists(
            select(1).where(NewsCountry.id_noticia == News.id_noticia)
        )
        fallback = (
            select(
                News.id_noticia.label("id_noticia"),
                Channel.continente.label("continent"),
            )
            .join(RssSource, RssSource.id_fuente == News.id_fuente)
            .join(Channel, Channel.id_canal == RssSource.id_canal)
            .where(News.fecha_clasificacion_geografica.is_not(None), ~any_country)
        )
        return union(attributed, fallback).subquery("pertenencia_continente")
