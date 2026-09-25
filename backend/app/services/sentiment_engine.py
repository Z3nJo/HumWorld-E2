"""Pure sentiment recognition and calculation for captured news."""

import re
import unicodedata
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Protocol, Sequence

TERM_LIMIT = Decimal("10")
TERM_PRECISION = Decimal("0.1")
HUMOR_PRECISION = Decimal("0.001")
CONTRIBUTION_PRECISION = Decimal("0.01")
FORMULAS = frozenset({"promedio_ponderado", "promedio_simple", "suma_acotada"})


class SentimentValidationError(ValueError):
    pass


@dataclass(frozen=True)
class SentimentParameters:
    formula_noticia: str = "promedio_ponderado"
    escala_maxima: Decimal = Decimal("10")
    minimo_noticias_agregacion: int = 3
    saturacion_suma: int = 5

    def __post_init__(self) -> None:
        if self.formula_noticia not in FORMULAS:
            raise SentimentValidationError("Fórmula de humor desconocida")
        if not self.escala_maxima.is_finite() or self.escala_maxima <= 0:
            raise SentimentValidationError("La escala de humor debe ser positiva")
        if self.minimo_noticias_agregacion < 1:
            raise SentimentValidationError("El mínimo de noticias debe ser positivo")
        if self.saturacion_suma < 1:
            raise SentimentValidationError("La saturación debe ser positiva")


@dataclass(frozen=True)
class SentimentTerm:
    id_termino: int
    palabra: str
    idioma: str
    valor: Decimal
    activo: bool


@dataclass(frozen=True)
class RecognizedTerm:
    id_termino: int
    valor: Decimal
    ocurrencias: int


@dataclass(frozen=True)
class TermContribution:
    id_termino: int
    ocurrencias: int
    aporte_humor: Decimal


@dataclass(frozen=True)
class SentimentResult:
    valor_humor: Decimal | None
    contributions: tuple[TermContribution, ...]


class TermRecognizer(Protocol):
    def recognize(
        self,
        *,
        title: str,
        description: str | None,
        language: str,
        terms: Sequence[SentimentTerm],
    ) -> tuple[RecognizedTerm, ...]: ...


def _tokens(value: str) -> tuple[str, ...]:
    folded = unicodedata.normalize("NFKD", value.casefold())
    unaccented = "".join(character for character in folded if not unicodedata.combining(character))
    return tuple(re.findall(r"\w+", unaccented, flags=re.UNICODE))


class ExactTermRecognizer:
    def recognize(
        self,
        *,
        title: str,
        description: str | None,
        language: str,
        terms: Sequence[SentimentTerm],
    ) -> tuple[RecognizedTerm, ...]:
        text = f"{title} {description}" if description is not None else title
        words = _tokens(text)
        recognized: list[RecognizedTerm] = []
        for term in terms:
            if not term.activo or term.idioma != language:
                continue
            pattern = _tokens(term.palabra)
            if not pattern:
                continue
            size = len(pattern)
            occurrences = sum(
                words[index : index + size] == pattern
                for index in range(len(words) - size + 1)
            )
            if occurrences:
                recognized.append(
                    RecognizedTerm(term.id_termino, term.valor, occurrences)
                )
        return tuple(sorted(recognized, key=lambda item: item.id_termino))


def calculate_sentiment(
    recognized: Sequence[RecognizedTerm],
    parameters: SentimentParameters,
) -> SentimentResult:
    contributions: list[TermContribution] = []
    values: list[Decimal] = []
    seen_ids: set[int] = set()
    for item in recognized:
        if item.id_termino in seen_ids:
            raise SentimentValidationError("Un término no puede repetirse en el desglose")
        seen_ids.add(item.id_termino)
        value = item.valor
        if not value.is_finite() or value < -TERM_LIMIT or value > TERM_LIMIT:
            raise SentimentValidationError(
                f"El término {item.id_termino} está fuera de [-10, 10]"
            )
        if value != value.quantize(TERM_PRECISION):
            raise SentimentValidationError(
                f"El término {item.id_termino} excede un decimal de precisión"
            )
        if item.ocurrencias < 1:
            raise SentimentValidationError("Las ocurrencias deben ser positivas")
        values.append(value)
        contributions.append(
            TermContribution(
                id_termino=item.id_termino,
                ocurrencias=item.ocurrencias,
                aporte_humor=(value * item.ocurrencias).quantize(
                    CONTRIBUTION_PRECISION, rounding=ROUND_HALF_UP
                ),
            )
        )

    if not contributions:
        return SentimentResult(None, ())

    scale = parameters.escala_maxima
    if parameters.formula_noticia == "promedio_ponderado":
        numerator = sum((item.aporte_humor for item in contributions), Decimal(0))
        denominator = scale * sum(item.ocurrencias for item in contributions)
        humor = numerator / denominator
    elif parameters.formula_noticia == "promedio_simple":
        humor = sum(values, Decimal(0)) / (scale * len(values))
    else:
        numerator = sum((item.aporte_humor for item in contributions), Decimal(0))
        raw = numerator / (scale * parameters.saturacion_suma)
        humor = max(Decimal(-1), min(Decimal(1), raw))

    if humor < -1 or humor > 1:
        raise SentimentValidationError("El humor calculado está fuera de [-1, 1]")
    rounded = humor.quantize(HUMOR_PRECISION, rounding=ROUND_HALF_UP)
    if rounded == 0:
        rounded = Decimal("0.000")
    return SentimentResult(rounded, tuple(contributions))
