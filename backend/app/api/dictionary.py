from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.schemas import (
    ErrorResponse,
    TermCreate,
    TermPatch,
    TermReplace,
    TermResponse,
)
from app.database import get_db
from app.repositories import TermRepository
from app.services.dictionary import DictionaryService, TermCreateData, TermUpdateData

router = APIRouter(prefix="/dictionary", tags=["dictionary"])
ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Solicitud invalida o duplicada"},
    404: {"model": ErrorResponse, "description": "Termino no encontrado"},
    500: {"model": ErrorResponse, "description": "Error interno"},
}


def get_dictionary_service(
    session: Annotated[Session, Depends(get_db)],
) -> DictionaryService:
    return DictionaryService(TermRepository(session))


@router.get(
    "",
    response_model=list[TermResponse],
    summary="Listar o buscar terminos del diccionario",
    responses=ERROR_RESPONSES,
)
def list_terms(
    service: Annotated[DictionaryService, Depends(get_dictionary_service)],
    q: Annotated[
        str | None,
        Query(description="Texto parcial de la palabra; no interpreta comodines"),
    ] = None,
) -> list[TermResponse]:
    return [TermResponse.model_validate(term) for term in service.list_terms(query=q)]


@router.get(
    "/{term_id}",
    response_model=TermResponse,
    summary="Consultar un termino del diccionario",
    responses=ERROR_RESPONSES,
)
def get_term(
    term_id: int,
    service: Annotated[DictionaryService, Depends(get_dictionary_service)],
) -> TermResponse:
    return TermResponse.model_validate(service.get_term(term_id))


@router.post(
    "",
    response_model=TermResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un termino del diccionario",
    responses=ERROR_RESPONSES,
)
def create_term(
    payload: TermCreate,
    service: Annotated[DictionaryService, Depends(get_dictionary_service)],
) -> TermResponse:
    term = service.create_term(
        TermCreateData(
            palabra=payload.palabra,
            idioma=payload.idioma,
            valor=payload.valor,
            activo=payload.activo,
        )
    )
    return TermResponse.model_validate(term)


@router.put(
    "/{term_id}",
    response_model=TermResponse,
    summary="Reemplazar un termino del diccionario",
    responses=ERROR_RESPONSES,
)
def replace_term(
    term_id: int,
    payload: TermReplace,
    service: Annotated[DictionaryService, Depends(get_dictionary_service)],
) -> TermResponse:
    term = service.replace_term(
        term_id,
        TermUpdateData(
            palabra=payload.palabra,
            idioma=payload.idioma,
            valor=payload.valor,
            activo=payload.activo,
        ),
    )
    return TermResponse.model_validate(term)


@router.patch(
    "/{term_id}",
    response_model=TermResponse,
    summary="Actualizar parcialmente un termino del diccionario",
    responses=ERROR_RESPONSES,
)
def patch_term(
    term_id: int,
    payload: TermPatch,
    service: Annotated[DictionaryService, Depends(get_dictionary_service)],
) -> TermResponse:
    term = service.patch_term(
        term_id,
        TermUpdateData(**payload.model_dump(exclude_unset=True)),
    )
    return TermResponse.model_validate(term)


@router.delete(
    "/{term_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Desactivar un termino del diccionario",
    responses=ERROR_RESPONSES,
)
def delete_term(
    term_id: int,
    service: Annotated[DictionaryService, Depends(get_dictionary_service)],
) -> Response:
    service.delete_term(term_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
