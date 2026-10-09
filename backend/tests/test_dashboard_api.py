from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.dashboards import get_dashboard_service
from app.main import app
from app.models.domains import Continent
from app.services.dashboards import (
    DashboardAggregate,
    DashboardResult,
    DashboardService,
    InfluentialTerm,
    InfluentialTermsResult,
)


class FakeDashboardService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []

    def get_dashboard(self, **query: object) -> DashboardResult:
        self.calls.append(("dashboard", query))
        return DashboardResult(
            date_from=query["date_from"],
            date_to=query["date_to"],
            continent=query["continent"],
            country="CL",
            aggregates=(
                DashboardAggregate(
                    continent=Continent.AMERICA,
                    country="CL",
                    humor=Decimal("0.125"),
                    news_count=4,
                    sufficient=True,
                ),
            ),
        )

    def get_influential_terms(self, **query: object) -> InfluentialTermsResult:
        self.calls.append(("influential", query))
        return InfluentialTermsResult(
            date_from=query["date_from"],
            date_to=query["date_to"],
            continent=query["continent"],
            country="CL",
            terms=(
                InfluentialTerm(
                    term_id=8,
                    term="crisis",
                    language="es",
                    weight=Decimal("14.00"),
                    total_contribution=Decimal("-2.00"),
                    frequency=5,
                ),
            ),
        )


def test_dashboard_endpoint_serializes_period_filters_and_aggregates() -> None:
    service = FakeDashboardService()
    app.dependency_overrides[get_dashboard_service] = lambda: service
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/dashboards",
                params={
                    "fecha_desde": "2026-09-01",
                    "fecha_hasta": "2026-09-07",
                    "continente": "America",
                    "pais": "cl",
                },
            )
        assert response.status_code == 200
        assert response.json() == {
            "fecha_desde": "2026-09-01",
            "fecha_hasta": "2026-09-07",
            "continente": "America",
            "pais": "CL",
            "agregados": [
                {
                    "continente": "America",
                    "pais": "CL",
                    "humor": "0.125",
                    "noticias": 4,
                    "suficiente": True,
                }
            ],
        }
        assert service.calls[0][1]["country"] == "cl"
    finally:
        app.dependency_overrides.clear()


def test_influential_terms_endpoint_serializes_all_term_fields() -> None:
    service = FakeDashboardService()
    app.dependency_overrides[get_dashboard_service] = lambda: service
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/dashboards/nube-palabras",
                params={
                    "fecha_desde": "2026-09-01",
                    "fecha_hasta": "2026-09-07",
                    "continente": "America",
                    "pais": "cl",
                },
            )
        assert response.status_code == 200
        assert response.json() == {
            "fecha_desde": "2026-09-01",
            "fecha_hasta": "2026-09-07",
            "continente": "America",
            "pais": "CL",
            "terminos": [
                {
                    "id_termino": 8,
                    "termino": "crisis",
                    "idioma": "es",
                    "peso": "14.00",
                    "aporte_total": "-2.00",
                    "frecuencia": 5,
                }
            ],
        }
    finally:
        app.dependency_overrides.clear()


class NeverCalledRepository:
    def __init__(self) -> None:
        self.calls = 0

    def aggregate(self, **filters: object) -> list[object]:
        self.calls += 1
        return []

    def influential_terms(self, **filters: object) -> list[object]:
        self.calls += 1
        return []


@pytest.mark.parametrize(
    "path", ["/api/v1/dashboards", "/api/v1/dashboards/nube-palabras"]
)
@pytest.mark.parametrize(
    "params",
    [
        {},
        {"fecha_desde": "2026-09-01"},
        {"fecha_hasta": "2026-09-01"},
        {"fecha_desde": "01-09-2026", "fecha_hasta": "2026-09-02"},
        {"fecha_desde": "2026-09-02", "fecha_hasta": "2026-09-01"},
        {
            "fecha_desde": "2026-09-01",
            "fecha_hasta": "2026-09-02",
            "continente": "Atlantida",
        },
        {
            "fecha_desde": "2026-09-01",
            "fecha_hasta": "2026-09-02",
            "continente": "America",
            "pais": "C",
        },
        {
            "fecha_desde": "2026-09-01",
            "fecha_hasta": "2026-09-02",
            "pais": "CL",
        },
    ],
)
def test_invalid_dashboard_queries_return_400_without_repository_call(
    path: str,
    params: dict[str, str],
) -> None:
    repository = NeverCalledRepository()
    service = DashboardService(
        repository,
        SimpleNamespace(
            resolve=lambda: SimpleNamespace(minimo_noticias_agregacion=3)
        ),
    )
    app.dependency_overrides[get_dashboard_service] = lambda: service
    try:
        with TestClient(app) as client:
            response = client.get(path, params=params)
        assert response.status_code == 400
        assert "detail" in response.json()
        assert repository.calls == 0
    finally:
        app.dependency_overrides.clear()
