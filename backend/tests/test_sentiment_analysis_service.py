from decimal import Decimal
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Term
from app.repositories.dictionary import TermRepository
from app.services.sentiment_analysis import SentimentAnalysisService
from app.services.sentiment_engine import SentimentParameters


class FakeTermRepository:
    def __init__(self, terms: list[SimpleNamespace]) -> None:
        self.terms = terms
        self.requested_languages: list[str] = []

    def list_active_terms(self, language: str) -> list[SimpleNamespace]:
        self.requested_languages.append(language)
        return [term for term in self.terms if term.idioma == language and term.activo]


class FakeParametersResolver:
    def __init__(self, parameters: SentimentParameters) -> None:
        self.parameters = parameters
        self.calls = 0

    def resolve(self) -> SentimentParameters:
        self.calls += 1
        return self.parameters


def term(
    term_id: int,
    word: str,
    language: str,
    value: str,
    *,
    active: bool = True,
) -> SimpleNamespace:
    return SimpleNamespace(
        id_termino=term_id,
        palabra=word,
        idioma=language,
        valor=Decimal(value),
        activo=active,
    )


@pytest.mark.parametrize(
    ("language", "text", "word"),
    [
        ("es", "Una noticia buena", "bueno"),
        ("en", "Good news", "good"),
    ],
)
def test_analyzes_with_requested_language_and_resolved_parameters(
    language: str,
    text: str,
    word: str,
) -> None:
    repository = FakeTermRepository(
        [term(1, "bueno", "es", "5"), term(2, "good", "en", "5")]
    )
    resolver = FakeParametersResolver(
        SentimentParameters(formula_noticia="promedio_simple")
    )
    service = SentimentAnalysisService(repository, resolver)

    result = service.analyze(text, language)

    assert repository.requested_languages == [language]
    assert resolver.calls == 1
    assert result.valor_humor == Decimal("0.500")
    assert [(item.palabra, item.ocurrencias) for item in result.terminos] == [
        (word, 1)
    ]


def test_returns_null_without_terms_and_zero_for_cancellation() -> None:
    repository = FakeTermRepository(
        [term(1, "bueno", "es", "5"), term(2, "malo", "es", "-5")]
    )
    service = SentimentAnalysisService(
        repository,
        FakeParametersResolver(SentimentParameters()),
    )

    no_matches = service.analyze("palabras sin coincidencias", "es")
    neutral = service.analyze("bueno y malo", "es")

    assert no_matches.valor_humor is None
    assert no_matches.terminos == ()
    assert neutral.valor_humor == Decimal("0.000")
    assert len(neutral.terminos) == 2


def test_maps_contributions_to_canonical_dictionary_terms() -> None:
    repository = FakeTermRepository([term(7, "bueno", "es", "5")])
    service = SentimentAnalysisService(
        repository,
        FakeParametersResolver(SentimentParameters()),
    )

    result = service.analyze("buenas noticias", "es")

    assert result.valor_humor == Decimal("0.500")
    assert len(result.terminos) == 1
    contribution = result.terminos[0]
    assert contribution.id_termino == 7
    assert contribution.palabra == "bueno"
    assert contribution.valor == Decimal("5")
    assert contribution.ocurrencias == 1
    assert contribution.aporte_humor == Decimal("5.00")


def test_service_uses_read_only_repository_interfaces() -> None:
    repository = FakeTermRepository([term(1, "bueno", "es", "5")])
    resolver = FakeParametersResolver(SentimentParameters())
    service = SentimentAnalysisService(repository, resolver)

    result = service.analyze("bueno", "es")

    assert result.valor_humor == Decimal("0.500")
    assert repository.requested_languages == ["es"]


def test_term_repository_filters_active_terms_by_language() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Term.__table__.create(engine)
    try:
        with Session(engine) as session:
            session.add_all(
                [
                    Term(palabra="bueno", idioma="es", valor=Decimal("5"), activo=True),
                    Term(palabra="good", idioma="en", valor=Decimal("5"), activo=True),
                    Term(palabra="malo", idioma="es", valor=Decimal("-5"), activo=False),
                ]
            )
            session.commit()

            terms = TermRepository(session).list_active_terms("es")

        assert [item.palabra for item in terms] == ["bueno"]
    finally:
        engine.dispose()
