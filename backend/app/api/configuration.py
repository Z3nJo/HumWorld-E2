from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.schemas import ConfigReplace, ConfigResponse, ErrorResponse
from app.database import get_db
from app.repositories import ConfigurationRepository
from app.services.configuration import ConfigurationService, NullCaptureSchedule

router = APIRouter(prefix="/config", tags=["config"])
ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Solicitud invalida"},
    500: {"model": ErrorResponse, "description": "Error interno"},
}


def get_configuration_service(
    request: Request,
    session: Annotated[Session, Depends(get_db)],
) -> ConfigurationService:
    schedule = getattr(request.app.state, "capture_scheduler", NullCaptureSchedule())
    return ConfigurationService(ConfigurationRepository(session), schedule)


@router.get(
    "",
    response_model=ConfigResponse,
    summary="Consultar configuracion runtime",
    responses=ERROR_RESPONSES,
)
def get_config(
    service: Annotated[ConfigurationService, Depends(get_configuration_service)],
) -> ConfigResponse:
    config = service.get_runtime_configuration()
    return ConfigResponse(
        captura_periodicidad_minutos=config.captura_periodicidad_minutos,
        noticias_caducidad_dias=config.noticias_caducidad_dias,
    )


@router.put(
    "",
    response_model=ConfigResponse,
    summary="Actualizar configuracion runtime",
    responses=ERROR_RESPONSES,
)
def replace_config(
    payload: ConfigReplace,
    service: Annotated[ConfigurationService, Depends(get_configuration_service)],
) -> ConfigResponse:
    config = service.update_runtime_configuration(
        captura_periodicidad_minutos=payload.captura_periodicidad_minutos,
        noticias_caducidad_dias=payload.noticias_caducidad_dias,
    )
    return ConfigResponse(
        captura_periodicidad_minutos=config.captura_periodicidad_minutos,
        noticias_caducidad_dias=config.noticias_caducidad_dias,
    )
