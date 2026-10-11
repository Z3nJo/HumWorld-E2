from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.schemas import (
    ChannelPatch,
    ChannelReplace,
    ChannelResponse,
    ErrorResponse,
)
from app.database import get_db
from app.models.domains import Continent
from app.repositories import ChannelRepository
from app.services.channels import ChannelReplaceData, ChannelService


router = APIRouter(prefix="/channels", tags=["channels"])
ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Solicitud invalida o duplicada"},
    404: {"model": ErrorResponse, "description": "Canal no encontrado"},
    500: {"model": ErrorResponse, "description": "Error interno"},
}


def get_channel_service(
    session: Annotated[Session, Depends(get_db)],
) -> ChannelService:
    return ChannelService(ChannelRepository(session))


@router.get(
    "",
    response_model=list[ChannelResponse],
    summary="Listar canales",
    responses=ERROR_RESPONSES,
)
def list_channels(
    service: Annotated[ChannelService, Depends(get_channel_service)],
    continent: Annotated[Continent | None, Query()] = None,
    country: Annotated[str | None, Query()] = None,
    active: Annotated[bool | None, Query()] = None,
) -> list[ChannelResponse]:
    return [
        ChannelResponse.model_validate(channel)
        for channel in service.list_channels(
            continent=continent,
            country=country,
            active=active,
        )
    ]


@router.get(
    "/{channel_id}",
    response_model=ChannelResponse,
    summary="Consultar un canal",
    responses=ERROR_RESPONSES,
)
def get_channel(
    channel_id: int,
    service: Annotated[ChannelService, Depends(get_channel_service)],
) -> ChannelResponse:
    return ChannelResponse.model_validate(service.get_channel(channel_id))


@router.put(
    "/{channel_id}",
    response_model=ChannelResponse,
    summary="Reemplazar un canal",
    responses=ERROR_RESPONSES,
)
def replace_channel(
    channel_id: int,
    payload: ChannelReplace,
    service: Annotated[ChannelService, Depends(get_channel_service)],
) -> ChannelResponse:
    channel = service.replace_channel(
        channel_id,
        ChannelReplaceData(
            nombre=payload.nombre,
            continente=payload.continente,
            pais=payload.pais,
            url_sitio=str(payload.url_sitio) if payload.url_sitio else None,
            activo=payload.activo,
        ),
    )
    return ChannelResponse.model_validate(channel)


@router.patch(
    "/{channel_id}",
    response_model=ChannelResponse,
    summary="Actualizar parcialmente un canal",
    responses=ERROR_RESPONSES,
)
def patch_channel(
    channel_id: int,
    payload: ChannelPatch,
    service: Annotated[ChannelService, Depends(get_channel_service)],
) -> ChannelResponse:
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("url_sitio") is not None:
        changes["url_sitio"] = str(changes["url_sitio"])
    channel = service.patch_channel(channel_id, changes)
    return ChannelResponse.model_validate(channel)


@router.delete(
    "/{channel_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Desactivar un canal",
    responses=ERROR_RESPONSES,
)
def delete_channel(
    channel_id: int,
    service: Annotated[ChannelService, Depends(get_channel_service)],
) -> Response:
    service.deactivate_channel(channel_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
