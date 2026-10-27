from datetime import UTC, date, datetime
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.dashboards import get_dashboard_service
from app.main import app
from app.repositories.dashboards import DashboardRepository
from app.services.dashboards import DashboardService


@pytest.fixture
def client():
    # A private in-memory DB exercises the real repository without touching user data.
    engine = create_engine("sqlite://", poolclass=StaticPool,
                           connect_args={"check_same_thread": False})
    with engine.connect() as connection:
        connection.connection.driver_connection.create_function(
            "timezone", 2,
            lambda zone, value: datetime.fromisoformat(value).replace(tzinfo=UTC).isoformat(),
        )
        connection.execute(text("CREATE TABLE canal (id_canal INT, nombre TEXT, continente TEXT, pais TEXT)"))
        connection.execute(text("CREATE TABLE fuente_rss (id_fuente INT, id_canal INT)"))
        connection.execute(text("CREATE TABLE pais (codigo_iso2 TEXT, continente TEXT)"))
        connection.execute(text("CREATE TABLE noticia (id_noticia INT, id_fuente INT, titulo TEXT, url TEXT, fecha_registro DATETIME, valor_humor NUMERIC, fecha_clasificacion_geografica DATETIME)"))
        connection.execute(text("CREATE TABLE noticia_pais (id_noticia INT, codigo_pais TEXT, origen TEXT)"))
        connection.execute(text("INSERT INTO canal VALUES (1, 'Chile', 'America', 'CL'), (2, 'España', 'Europa', 'ES')"))
        connection.execute(text("INSERT INTO fuente_rss VALUES (1, 1), (2, 2)"))
        connection.execute(text("INSERT INTO pais VALUES ('CL', 'America'), ('ES', 'Europa')"))
        items = [
            (1, 1, '2026-10-01 00:00:00+00:00', -0.9),
            (2, 1, '2026-10-01 23:59:59+00:00', 0.3),
            (3, 1, '2026-10-03 12:00:00+00:00', 0),
            (4, 1, '2026-10-02 12:00:00+00:00', None),
            (5, 2, '2026-10-02 12:00:00+00:00', 1),
            (6, 1, '2026-10-04 00:00:00+00:00', 1),
            (7, 1, '2026-09-30 23:59:59+00:00', 1),
        ]
        items.extend((index, 2, '2026-10-02 12:00:00+00:00', 0.5) for index in range(8, 20))
        items.append((20, 2, '2026-10-03 12:00:00+00:00', 0.5))
        for news_id, source_id, instant, humor in items:
            connection.execute(text("INSERT INTO noticia VALUES (:id, :source, :title, :url, :instant, :humor, :instant)"),
                               dict(id=news_id, source=source_id, title=f"Noticia {news_id}",
                                    url=f"https://example.com/{news_id}",
                                    instant=datetime.fromisoformat(instant).strftime("%Y-%m-%d %H:%M:%S.%f"),
                                    humor=humor))
            connection.execute(
                text("INSERT INTO noticia_pais VALUES (:id, :country, 'fuente')"),
                {"id": news_id, "country": "CL" if source_id == 1 else "ES"},
            )
        connection.commit()
    with Session(engine) as session:
        service = DashboardService(DashboardRepository(session), SimpleNamespace(
            resolve=lambda: SimpleNamespace(minimo_noticias_agregacion=2)))
        app.dependency_overrides[get_dashboard_service] = lambda: service
        try:
            with TestClient(app) as test_client:
                yield test_client
        finally:
            app.dependency_overrides.clear()
    engine.dispose()


FILTERS = {"fecha_desde": "2026-10-01", "fecha_hasta": "2026-10-03",
           "continente": "America", "pais": "cl"}


def test_daily_evolution_fills_gaps_filters_and_counts_evaluable_news(client):
    response = client.get("/api/v1/dashboards/evolucion", params=FILTERS)
    assert response.status_code == 200
    data = response.json()
    assert data["pais"] == "CL"
    assert data["dias"] == [
        {"fecha": "2026-10-01", "humor": "-0.300", "noticias": 2, "suficiente": True},
        {"fecha": "2026-10-02", "humor": None, "noticias": 0, "suficiente": False},
        {"fecha": "2026-10-03", "humor": "0.000", "noticias": 1, "suficiente": False},
    ]


def test_default_evolution_is_30_days_ending_today_utc(client):
    data = client.get("/api/v1/dashboards/evolucion").json()
    assert len(data["dias"]) == 30
    assert data["fecha_hasta"] == datetime.now(UTC).date().isoformat()
    assert (date.fromisoformat(data["fecha_hasta"]) - date.fromisoformat(data["fecha_desde"])).days == 29


def test_influential_news_orders_by_absolute_score_and_respects_filters(client):
    response = client.get("/api/v1/dashboards/noticias-influyentes", params=FILTERS)
    assert response.status_code == 200
    news = response.json()["noticias"]
    assert [item["id_noticia"] for item in news] == [1, 2, 3]
    assert news[0]["valor_humor"] == "-0.900"
    assert news[0]["canal"] == "Chile"
    assert news[0]["url"] == "https://example.com/1"


@pytest.mark.parametrize("path", ["evolucion", "noticias-influyentes"])
@pytest.mark.parametrize("filters", [
    {**FILTERS, "fecha_desde": "2026-10-04"},
    {**FILTERS, "continente": None},
    {**FILTERS, "pais": "X"},
])
def test_invalid_filters_return_400(client, path, filters):
    filters = {key: value for key, value in filters.items() if value is not None}
    assert client.get(f"/api/v1/dashboards/{path}", params=filters).status_code == 400


def test_evolution_limits_range_size(client):
    response = client.get("/api/v1/dashboards/evolucion", params={
        "fecha_desde": "2025-01-01", "fecha_hasta": "2026-10-01"})
    assert response.status_code == 400


def test_ranking_caps_at_ten_and_breaks_ties_by_recency_then_id(client):
    response = client.get("/api/v1/dashboards/noticias-influyentes", params={
        **FILTERS, "continente": "Europa", "pais": "ES"})
    assert response.status_code == 200
    assert [item["id_noticia"] for item in response.json()["noticias"]] == [
        5, 20, 8, 9, 10, 11, 12, 13, 14, 15]


def test_empty_scope_returns_empty_ranking(client):
    response = client.get("/api/v1/dashboards/noticias-influyentes", params={
        **FILTERS, "pais": "AR"})
    assert response.status_code == 200
    assert response.json()["noticias"] == []


def test_geography_returns_continents_and_countries_for_the_same_period(client):
    response = client.get("/api/v1/dashboards/geografia", params={
        "fecha_desde": "2026-10-01", "fecha_hasta": "2026-10-03"})
    assert response.status_code == 200
    aggregates = response.json()["agregados"]
    chile = next(item for item in aggregates if item["pais"] == "CL")
    america = next(item for item in aggregates if item["continente"] == "America" and item["pais"] is None)
    assert chile == {"continente": "America", "pais": "CL", "humor": "-0.200", "noticias": 3, "suficiente": True}
    assert america["noticias"] == 3
    assert america["humor"] == chile["humor"]
    assert any(item["pais"] == "ES" and item["noticias"] == 14 for item in aggregates)


def test_geography_rejects_reversed_dates(client):
    response = client.get("/api/v1/dashboards/geografia", params={
        "fecha_desde": "2026-10-04", "fecha_hasta": "2026-10-03"})
    assert response.status_code == 400
