"""Application service for read-only analysis of an individual text."""

from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from app.models import Term
from app.services.sentiment_engine import (
    ExactTermRecognizer,
    SentimentParameters,
    SentimentTerm,
    TermRecognizer,
    calculate_sentiment,
)


class ActiveTermRepository(Protocol):
    def list_active_terms(self, language: str) -> list[Term]: ...


class SentimentParametersResolver(Protocol):
    def resolve(self) -> SentimentParameters: ...


@dataclass(frozen=True)
class AnalyzedTerm:
    id_termino: int
    palabra: str
    valor: Decimal
    ocurrencias: int
    aporte_humor: Decimal


@dataclass(frozen=True)
class TextSentimentResult:
    valor_humor: Decimal | None
    terminos: tuple[AnalyzedTerm, ...]


class SentimentAnalysisService:
    def __init__(
        self,
        term_repository: ActiveTermRepository,
        parameters_resolver: SentimentParametersResolver,
        recognizer: TermRecognizer | None = None,
    ) -> None:
        self._term_repository = term_repository
        self._parameters_resolver = parameters_resolver
        self._recognizer = recognizer or ExactTermRecognizer()

    def analyze(self, text: str, language: str) -> TextSentimentResult:
        terms = self._term_repository.list_active_terms(language)
        candidates = tuple(
            SentimentTerm(
                id_termino=term.id_termino,
                palabra=term.palabra,
                idioma=term.idioma,
                valor=term.valor,
                activo=term.activo,
            )
            for term in terms
        )
        recognized = self._recognizer.recognize(
            title=text,
            description=None,
            language=language,
            terms=candidates,
        )
        calculation = calculate_sentiment(
            recognized,
            self._parameters_resolver.resolve(),
        )
        terms_by_id = {term.id_termino: term for term in terms}
        breakdown = tuple(
            AnalyzedTerm(
                id_termino=item.id_termino,
                palabra=terms_by_id[item.id_termino].palabra,
                valor=terms_by_id[item.id_termino].valor,
                ocurrencias=item.ocurrencias,
                aporte_humor=item.aporte_humor,
            )
            for item in calculation.contributions
        )
        return TextSentimentResult(calculation.valor_humor, breakdown)
