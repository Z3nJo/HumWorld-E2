from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import ConfigReplace, ConfigResponse, ErrorResponse
from app.database import get_db
from app.repositories import ConfigurationRepository
from app.services.configuration import ConfigurationService

router = APIRouter(prefix="/config", tags=["config"])
ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Solicitud invalida"},
    500: {"model": ErrorResponse, "description": "Error interno"},
}


def get_configuration_service(
    session: Annotated[Session, Depends(get_db)],
) -> ConfigurationService:
    return ConfigurationService(ConfigurationRepository(session))


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
    )
    return ConfigResponse(
        captura_periodicidad_minutos=config.captura_periodicidad_minutos,
    )
