from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import (
    ErrorResponse,
    SentimentRequest,
    SentimentResponse,
    SentimentTermResponse,
)
from app.database import get_db
from app.repositories import ConfigurationRepository, TermRepository
from app.services.sentiment_analysis import SentimentAnalysisService
from app.services.sentiment_configuration import SentimentConfigurationService

router = APIRouter(prefix="/sentiment", tags=["sentiment"])
ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Solicitud invalida"},
    500: {"model": ErrorResponse, "description": "Error interno"},
}


def get_sentiment_analysis_service(
    session: Annotated[Session, Depends(get_db)],
) -> SentimentAnalysisService:
    return SentimentAnalysisService(
        TermRepository(session),
        SentimentConfigurationService(ConfigurationRepository(session)),
    )


@router.post(
    "",
    response_model=SentimentResponse,
    summary="Analizar el humor de un texto puntual",
    responses=ERROR_RESPONSES,
)
def analyze_text(
    payload: SentimentRequest,
    service: Annotated[
        SentimentAnalysisService,
        Depends(get_sentiment_analysis_service),
    ],
) -> SentimentResponse:
    result = service.analyze(payload.texto, payload.idioma.value)
    return SentimentResponse(
        valor_humor=result.valor_humor,
        terminos=[
            SentimentTermResponse(
                id_termino=item.id_termino,
                palabra=item.palabra,
                valor=item.valor,
                ocurrencias=item.ocurrencias,
                aporte_humor=item.aporte_humor,
            )
            for item in result.terminos
        ],
    )
