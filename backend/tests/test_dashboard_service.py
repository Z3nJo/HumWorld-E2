from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.domains import Continent
from app.repositories.dashboards import DashboardAggregateRecord, InfluentialTermRecord
from app.services.dashboards import DashboardService, DashboardValidationError


class FakeDashboardRepository:
    def __init__(self) -> None:
        self.aggregates: list[DashboardAggregateRecord] = []
        self.influential: list[InfluentialTermRecord] = []
        self.aggregate_calls: list[dict[str, object]] = []
        self.influential_calls: list[dict[str, object]] = []

    def aggregate(self, **filters: object) -> list[DashboardAggregateRecord]:
        self.aggregate_calls.append(filters)
        return self.aggregates

    def influential_terms(self, **filters: object) -> list[InfluentialTermRecord]:
        self.influential_calls.append(filters)
        return self.influential


class FakeConfiguration:
    def __init__(self, minimum: int = 3) -> None:
        self.minimum = minimum

    def resolve(self) -> object:
        return SimpleNamespace(minimo_noticias_agregacion=self.minimum)


@pytest.fixture
def repository() -> FakeDashboardRepository:
    return FakeDashboardRepository()


def test_dashboard_completes_continents_rounds_and_calculates_sufficiency(
    repository: FakeDashboardRepository,
) -> None:
    repository.aggregates = [
        DashboardAggregateRecord("America", None, Decimal("0.1235"), 2),
        DashboardAggregateRecord("Europa", None, Decimal("-0.2345"), 3),
        DashboardAggregateRecord("Asia", None, Decimal("0.5000"), 4),
    ]
    service = DashboardService(repository, FakeConfiguration(minimum=3))

    result = service.get_dashboard(
        date_from=date(2026, 9, 1),
        date_to=date(2026, 9, 7),
    )

    assert [item.continent for item in result.aggregates] == list(Continent)
    by_continent = {item.continent: item for item in result.aggregates}
    assert by_continent[Continent.AMERICA].humor == Decimal("0.124")
    assert by_continent[Continent.AMERICA].sufficient is False
    assert by_continent[Continent.EUROPE].humor == Decimal("-0.235")
    assert by_continent[Continent.EUROPE].sufficient is True
    assert by_continent[Continent.ASIA].sufficient is True
    assert by_continent[Continent.AFRICA].humor is None
    assert by_continent[Continent.AFRICA].news_count == 0
    assert by_continent[Continent.AFRICA].sufficient is False


def test_dashboard_normalizes_country_and_builds_inclusive_utc_range(
    repository: FakeDashboardRepository,
) -> None:
    service = DashboardService(repository, FakeConfiguration())
    result = service.get_dashboard(
        date_from=date(2026, 9, 30),
        date_to=date(2026, 10, 2),
        continent=Continent.AMERICA,
        country="cl",
    )

    assert result.country == "CL"
    assert len(result.aggregates) == 1
    assert result.aggregates[0].continent is Continent.AMERICA
    assert result.aggregates[0].country == "CL"
    assert repository.aggregate_calls == [
        {
            "start_at": datetime(2026, 9, 30, tzinfo=UTC),
            "end_at": datetime(2026, 10, 3, tzinfo=UTC),
            "continent": "America",
            "country": "CL",
        }
    ]


def test_influential_terms_preserve_repository_order_fields_and_utc_range(
    repository: FakeDashboardRepository,
) -> None:
    repository.influential = [
        InfluentialTermRecord(
            term_id=7,
            term="crisis",
            language="es",
            weight=Decimal("14.00"),
            total_contribution=Decimal("-2.00"),
            frequency=5,
        )
    ]
    service = DashboardService(repository, FakeConfiguration())

    result = service.get_influential_terms(
        date_from=date(2026, 9, 5),
        date_to=date(2026, 9, 5),
        continent=Continent.AMERICA,
        country="cl",
    )

    assert result.country == "CL"
    assert result.terms[0].term_id == 7
    assert result.terms[0].term == "crisis"
    assert result.terms[0].weight == Decimal("14.00")
    assert result.terms[0].total_contribution == Decimal("-2.00")
    assert result.terms[0].frequency == 5
    assert repository.influential_calls[0]["end_at"] == datetime(
        2026, 9, 6, tzinfo=UTC
    )


@pytest.mark.parametrize(
    ("date_from", "date_to", "continent", "country", "message"),
    [
        (date(2026, 9, 2), date(2026, 9, 1), None, None, "fecha_desde"),
        (date(2026, 9, 1), date(2026, 9, 2), None, "CL", "continente"),
        (date(2026, 9, 1), date(2026, 9, 2), Continent.AMERICA, "C1", "letras"),
    ],
)
def test_invalid_queries_do_not_call_repository(
    repository: FakeDashboardRepository,
    date_from: date,
    date_to: date,
    continent: Continent | None,
    country: str | None,
    message: str,
) -> None:
    service = DashboardService(repository, FakeConfiguration())

    with pytest.raises(DashboardValidationError, match=message):
        service.get_dashboard(
            date_from=date_from,
            date_to=date_to,
            continent=continent,
            country=country,
        )
    with pytest.raises(DashboardValidationError, match=message):
        service.get_influential_terms(
            date_from=date_from,
            date_to=date_to,
            continent=continent,
            country=country,
        )

    assert repository.aggregate_calls == []
    assert repository.influential_calls == []
