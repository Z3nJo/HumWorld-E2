from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.api.schemas import (
    SentimentRequest,
    SentimentResponse,
    SentimentTermResponse,
)


@pytest.mark.parametrize("language", ["es", "en"])
def test_sentiment_request_accepts_supported_languages(language: str) -> None:
    request = SentimentRequest(texto="  texto de prueba  ", idioma=language)

    assert request.texto == "  texto de prueba  "
    assert request.idioma == language


@pytest.mark.parametrize("text", ["", " ", " \t\n"])
def test_sentiment_request_rejects_empty_or_blank_text(text: str) -> None:
    with pytest.raises(ValidationError):
        SentimentRequest(texto=text, idioma="es")


def test_sentiment_request_rejects_text_over_10000_characters() -> None:
    with pytest.raises(ValidationError):
        SentimentRequest(texto="a" * 10_001, idioma="es")


def test_sentiment_request_rejects_unsupported_language() -> None:
    with pytest.raises(ValidationError):
        SentimentRequest(texto="valid text", idioma="fr")


def test_sentiment_response_supports_nullable_value_and_canonical_breakdown() -> None:
    response = SentimentResponse(
        valor_humor=Decimal("0.500"),
        terminos=[
            SentimentTermResponse(
                id_termino=1,
                palabra="bueno",
                valor=Decimal("5.0"),
                ocurrencias=1,
                aporte_humor=Decimal("5.00"),
            )
        ],
    )

    assert response.valor_humor == Decimal("0.500")
    assert response.terminos[0].palabra == "bueno"
    assert response.terminos[0].ocurrencias == 1

    no_matches = SentimentResponse(valor_humor=None, terminos=[])
    assert no_matches.valor_humor is None
    assert no_matches.terminos == []
