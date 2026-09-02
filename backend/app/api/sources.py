from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.schemas import (
    CaptureRequest,
    CaptureResponse,
    CaptureSourceResponse,
    ErrorResponse,
    SourceBatchCreate,
    SourceBatchResponse,
    SourcePatch,
    SourceReplace,
    SourceResponse,
)
from app.database import get_db
from app.models.domains import Continent
from app.repositories import SourceRepository
from app.repositories import NewsCaptureRepository
from app.services.capture import HttpxFeedparserClient, NewsCaptureService
from app.services.sources import (
    ChannelCreateData,
    SourceCreateData,
    SourceService,
    SourceUpdateData,
)

router = APIRouter(prefix="/sources", tags=["sources"])
ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Solicitud invalida o duplicada"},
    404: {"model": ErrorResponse, "description": "Recurso no encontrado"},
    500: {"model": ErrorResponse, "description": "Error interno"},
}


def get_source_service(
    session: Annotated[Session, Depends(get_db)],
) -> SourceService:
    return SourceService(SourceRepository(session))


def get_capture_service(
    session: Annotated[Session, Depends(get_db)],
) -> NewsCaptureService:
    return NewsCaptureService(NewsCaptureRepository(session), HttpxFeedparserClient())


@router.post(
    "/capture",
    response_model=CaptureResponse,
    summary="Ejecutar captura RSS inmediata",
    responses={
        400: {"model": ErrorResponse, "description": "Solicitud invalida"},
        404: {"model": ErrorResponse, "description": "Fuente no encontrada"},
        500: {"model": ErrorResponse, "description": "Error interno"},
    },
)
def capture_sources(
    service: Annotated[NewsCaptureService, Depends(get_capture_service)],
    payload: CaptureRequest | None = None,
) -> CaptureResponse:
    report = service.capture_sources(payload.source_ids if payload else None)
    return CaptureResponse(
        sources=[CaptureSourceResponse(**item.__dict__) for item in report.sources],
        skipped_source_ids=list(report.skipped_source_ids),
        inserted=report.inserted,
        failed_sources=report.failed_sources,
    )


@router.post(
    "",
    response_model=SourceBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un canal con fuentes o agregar fuentes a un canal",
    responses=ERROR_RESPONSES,
)
def create_sources(
    payload: SourceBatchCreate,
    service: Annotated[SourceService, Depends(get_source_service)],
) -> SourceBatchResponse:
    channel_data = (
        ChannelCreateData(
            nombre=payload.channel.nombre,
            continente=payload.channel.continente,
        )
        if payload.channel
        else None
    )
    source_data = [
        SourceCreateData(
            nombre=item.nombre,
            url_feed=str(item.url_feed),
            categoria_iptc=item.categoria_iptc,
            idioma=item.idioma,
            activa=item.activa,
        )
        for item in payload.sources
    ]
    channel, sources = service.create_sources(
        channel=channel_data,
        channel_id=payload.channel_id,
        sources=source_data,
    )
    return SourceBatchResponse(
        channel=channel,
        sources=[SourceResponse.model_validate(source) for source in sources],
    )


@router.get(
    "",
    response_model=list[SourceResponse],
    summary="Listar fuentes RSS",
    responses=ERROR_RESPONSES,
)
def list_sources(
    service: Annotated[SourceService, Depends(get_source_service)],
    continent: Annotated[Continent | None, Query()] = None,
    active: Annotated[bool | None, Query()] = None,
) -> list[SourceResponse]:
    return [
        SourceResponse.model_validate(source)
        for source in service.list_sources(continent=continent, active=active)
    ]


@router.get(
    "/{source_id}",
    response_model=SourceResponse,
    summary="Consultar una fuente RSS",
    responses=ERROR_RESPONSES,
)
def get_source(
    source_id: int,
    service: Annotated[SourceService, Depends(get_source_service)],
) -> SourceResponse:
    return SourceResponse.model_validate(service.get_source(source_id))


@router.put(
    "/{source_id}",
    response_model=SourceResponse,
    summary="Reemplazar una fuente RSS",
    responses=ERROR_RESPONSES,
)
def replace_source(
    source_id: int,
    payload: SourceReplace,
    service: Annotated[SourceService, Depends(get_source_service)],
) -> SourceResponse:
    updated = service.replace_source(
        source_id,
        SourceUpdateData(
            nombre=payload.nombre,
            url_feed=str(payload.url_feed),
            categoria_iptc=payload.categoria_iptc,
            idioma=payload.idioma,
            activa=payload.activa,
        ),
    )
    return SourceResponse.model_validate(updated)


@router.patch(
    "/{source_id}",
    response_model=SourceResponse,
    summary="Actualizar parcialmente una fuente RSS",
    responses=ERROR_RESPONSES,
)
def patch_source(
    source_id: int,
    payload: SourcePatch,
    service: Annotated[SourceService, Depends(get_source_service)],
) -> SourceResponse:
    values = payload.model_dump(exclude_unset=True)
    if "url_feed" in values:
        values["url_feed"] = str(values["url_feed"])
    updated = service.patch_source(source_id, SourceUpdateData(**values))
    return SourceResponse.model_validate(updated)


@router.delete(
    "/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Eliminar una fuente RSS",
    responses=ERROR_RESPONSES,
)
def delete_source(
    source_id: int,
    service: Annotated[SourceService, Depends(get_source_service)],
) -> Response:
    service.delete_source(source_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
