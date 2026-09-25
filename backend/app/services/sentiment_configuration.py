"""Resolve persisted sentiment settings outside the pure calculation engine."""

import logging
from decimal import Decimal, InvalidOperation
from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Configuration, Term
from app.services.sentiment_engine import SentimentParameters, SentimentValidationError

logger = logging.getLogger(__name__)

SENTIMENT_SETTINGS: dict[str, tuple[str, str, str]] = {
    "humor.formula_noticia": (
        "promedio_ponderado",
        "texto",
        "Fórmula de cálculo del humor por noticia",
    ),
    "humor.escala_maxima": ("10", "decimal", "Escala máxima del diccionario"),
    "humor.minimo_noticias_agregacion": (
        "3",
        "entero",
        "Mínimo de noticias para considerar suficiente un agregado",
    ),
    "humor.saturacion_suma": (
        "5",
        "entero",
        "Número de ocurrencias que satura la fórmula de suma",
    ),
}


class SentimentSettingsRepository(Protocol):
    def get_parameter(self, key: str) -> Configuration | None: ...


class SentimentConfigurationService:
    def __init__(self, repository: SentimentSettingsRepository) -> None:
        self._repository = repository

    def resolve(self) -> SentimentParameters:
        values: dict[str, str] = {}
        for key, (default, expected_type, _) in SENTIMENT_SETTINGS.items():
            record = self._repository.get_parameter(key)
            if record is not None and record.tipo != expected_type:
                raise SentimentValidationError(f"Tipo inválido para {key}")
            values[key] = record.valor if record is not None else default
        try:
            return SentimentParameters(
                formula_noticia=values["humor.formula_noticia"],
                escala_maxima=Decimal(values["humor.escala_maxima"]),
                minimo_noticias_agregacion=int(
                    values["humor.minimo_noticias_agregacion"]
                ),
                saturacion_suma=int(values["humor.saturacion_suma"]),
            )
        except (InvalidOperation, ValueError) as error:
            raise SentimentValidationError(
                "La configuración del humor contiene un valor inválido"
            ) from error


def warn_if_scale_differs_from_dictionary(
    session: Session, parameters: SentimentParameters
) -> None:
    maximum = session.scalar(select(func.max(func.abs(Term.valor))))
    if maximum is not None and Decimal(maximum) != parameters.escala_maxima:
        logger.warning(
            "La escala de humor configurada (%s) difiere del mayor valor absoluto "
            "del diccionario (%s)",
            parameters.escala_maxima,
            maximum,
        )
