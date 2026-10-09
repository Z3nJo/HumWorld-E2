from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.schemas import (
    DashboardAggregateResponse,
    DashboardResponse,
    ErrorResponse,
    InfluentialTermResponse,
    InfluentialTermsResponse,
)
from app.database import get_db
from app.models.domains import Continent
from app.repositories import ConfigurationRepository, DashboardRepository
from app.services.dashboards import DashboardService
from app.services.sentiment_configuration import SentimentConfigurationService

dashboard_router = APIRouter(prefix="/dashboards", tags=["dashboards"])
ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Solicitud invalida"},
    500: {"model": ErrorResponse, "description": "Error interno"},
}


def get_dashboard_service(
    session: Annotated[Session, Depends(get_db)],
) -> DashboardService:
    return DashboardService(
        DashboardRepository(session),
        SentimentConfigurationService(ConfigurationRepository(session)),
    )


@dashboard_router.get(
    "",
    response_model=DashboardResponse,
    summary="Consultar humor agregado del dashboard",
    responses=ERROR_RESPONSES,
)
def get_dashboard(
    service: Annotated[DashboardService, Depends(get_dashboard_service)],
    fecha_desde: Annotated[date, Query(description="Primer dia incluido, en UTC")],
    fecha_hasta: Annotated[date, Query(description="Ultimo dia incluido, en UTC")],
    continente: Annotated[Continent | None, Query()] = None,
    pais: Annotated[
        str | None,
        Query(min_length=2, max_length=2, pattern=r"^[A-Za-z]{2}$"),
    ] = None,
) -> DashboardResponse:
    result = service.get_dashboard(
        date_from=fecha_desde,
        date_to=fecha_hasta,
        continent=continente,
        country=pais,
    )
    return DashboardResponse(
        fecha_desde=result.date_from,
        fecha_hasta=result.date_to,
        continente=result.continent,
        pais=result.country,
        agregados=[
            DashboardAggregateResponse(
                continente=item.continent,
                pais=item.country,
                humor=item.humor,
                noticias=item.news_count,
                suficiente=item.sufficient,
            )
            for item in result.aggregates
        ],
    )


@dashboard_router.get(
    "/nube-palabras",
    response_model=InfluentialTermsResponse,
    summary="Consultar los terminos mas influyentes",
    responses=ERROR_RESPONSES,
)
def get_influential_terms(
    service: Annotated[DashboardService, Depends(get_dashboard_service)],
    fecha_desde: Annotated[date, Query(description="Primer dia incluido, en UTC")],
    fecha_hasta: Annotated[date, Query(description="Ultimo dia incluido, en UTC")],
    continente: Annotated[Continent | None, Query()] = None,
    pais: Annotated[
        str | None,
        Query(min_length=2, max_length=2, pattern=r"^[A-Za-z]{2}$"),
    ] = None,
) -> InfluentialTermsResponse:
    result = service.get_influential_terms(
        date_from=fecha_desde,
        date_to=fecha_hasta,
        continent=continente,
        country=pais,
    )
    return InfluentialTermsResponse(
        fecha_desde=result.date_from,
        fecha_hasta=result.date_to,
        continente=result.continent,
        pais=result.country,
        terminos=[
            InfluentialTermResponse(
                id_termino=item.term_id,
                termino=item.term,
                idioma=item.language,
                peso=item.weight,
                aporte_total=item.total_contribution,
                frecuencia=item.frequency,
            )
            for item in result.terms
        ],
    )
