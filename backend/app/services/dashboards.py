import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Protocol

from app.models.domains import Continent
from app.repositories.dashboards import DashboardAggregateRecord, InfluentialTermRecord

THREE_DECIMALS = Decimal("0.001")
COUNTRY_PATTERN = re.compile(r"^[A-Za-z]{2}$")


class DashboardValidationError(Exception):
    pass


@dataclass(frozen=True)
class DashboardAggregate:
    continent: Continent
    country: str | None
    humor: Decimal | None
    news_count: int
    sufficient: bool


@dataclass(frozen=True)
class DashboardResult:
    date_from: date
    date_to: date
    continent: Continent | None
    country: str | None
    aggregates: tuple[DashboardAggregate, ...]


@dataclass(frozen=True)
class InfluentialTerm:
    term_id: int
    term: str
    language: str
    weight: Decimal
    total_contribution: Decimal
    frequency: int


@dataclass(frozen=True)
class InfluentialTermsResult:
    date_from: date
    date_to: date
    continent: Continent | None
    country: str | None
    terms: tuple[InfluentialTerm, ...]


@dataclass(frozen=True)
class _ValidatedQuery:
    date_from: date
    date_to: date
    start_at: datetime
    end_at: datetime
    continent: Continent | None
    country: str | None


class DashboardRepositoryProtocol(Protocol):
    def aggregate(
        self,
        *,
        start_at: datetime,
        end_at: datetime,
        continent: str | None,
        country: str | None,
    ) -> list[DashboardAggregateRecord]: ...

    def influential_terms(
        self,
        *,
        start_at: datetime,
        end_at: datetime,
        continent: str | None,
        country: str | None,
    ) -> list[InfluentialTermRecord]: ...


class SentimentConfigurationProtocol(Protocol):
    def resolve(self) -> object: ...


class DashboardService:
    def __init__(
        self,
        repository: DashboardRepositoryProtocol,
        sentiment_configuration: SentimentConfigurationProtocol,
    ) -> None:
        self._repository = repository
        self._sentiment_configuration = sentiment_configuration

    def get_dashboard(
        self,
        *,
        date_from: date,
        date_to: date,
        continent: Continent | None = None,
        country: str | None = None,
    ) -> DashboardResult:
        query = self._validate_query(date_from, date_to, continent, country)
        records = self._repository.aggregate(
            start_at=query.start_at,
            end_at=query.end_at,
            continent=query.continent.value if query.continent else None,
            country=query.country,
        )
        parameters = self._sentiment_configuration.resolve()
        minimum = int(getattr(parameters, "minimo_noticias_agregacion"))
        by_continent = {record.continent: record for record in records}

        if query.continent is None:
            scopes = list(Continent)
        else:
            scopes = [query.continent]

        aggregates = []
        for scope in scopes:
            record = by_continent.get(scope.value)
            count = record.news_count if record else 0
            aggregates.append(
                DashboardAggregate(
                    continent=scope,
                    country=query.country,
                    humor=self._round_humor(record.humor if record else None),
                    news_count=count,
                    sufficient=count >= minimum,
                )
            )
        return DashboardResult(
            date_from=query.date_from,
            date_to=query.date_to,
            continent=query.continent,
            country=query.country,
            aggregates=tuple(aggregates),
        )

    def get_influential_terms(
        self,
        *,
        date_from: date,
        date_to: date,
        continent: Continent | None = None,
        country: str | None = None,
    ) -> InfluentialTermsResult:
        query = self._validate_query(date_from, date_to, continent, country)
        records = self._repository.influential_terms(
            start_at=query.start_at,
            end_at=query.end_at,
            continent=query.continent.value if query.continent else None,
            country=query.country,
        )
        terms = tuple(
            InfluentialTerm(
                term_id=record.term_id,
                term=record.term,
                language=record.language,
                weight=record.weight,
                total_contribution=record.total_contribution,
                frequency=record.frequency,
            )
            for record in records
        )
        return InfluentialTermsResult(
            date_from=query.date_from,
            date_to=query.date_to,
            continent=query.continent,
            country=query.country,
            terms=terms,
        )

    @staticmethod
    def _validate_query(
        date_from: date,
        date_to: date,
        continent: Continent | None,
        country: str | None,
    ) -> _ValidatedQuery:
        if date_from > date_to:
            raise DashboardValidationError(
                "fecha_desde no puede ser posterior a fecha_hasta"
            )
        if country is not None and not COUNTRY_PATTERN.fullmatch(country):
            raise DashboardValidationError("pais debe contener exactamente dos letras")
        if country is not None and continent is None:
            raise DashboardValidationError("pais requiere el filtro continente")

        normalized_country = country.upper() if country is not None else None
        start_at = datetime.combine(date_from, time.min, tzinfo=UTC)
        end_at = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=UTC)
        return _ValidatedQuery(
            date_from=date_from,
            date_to=date_to,
            start_at=start_at,
            end_at=end_at,
            continent=continent,
            country=normalized_country,
        )

    @staticmethod
    def _round_humor(value: Decimal | None) -> Decimal | None:
        if value is None:
            return None
        return value.quantize(THREE_DECIMALS, rounding=ROUND_HALF_UP)
