from decimal import Decimal

from fastapi.testclient import TestClient

from app.api.sentiment import get_sentiment_analysis_service
from app.main import app
from app.services.sentiment_analysis import AnalyzedTerm, TextSentimentResult


class FakeSentimentService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    def analyze(self, text: str, language: str) -> TextSentimentResult:
        self.calls.append((text, language))
        if text == "no matches":
            return TextSentimentResult(None, ())
        word = "bueno" if language == "es" else "good"
        contributions = (
            AnalyzedTerm(1, word, Decimal("5"), 1, Decimal("5.00")),
        )
        if text == "neutral":
            return TextSentimentResult(Decimal("0.000"), contributions)
        return TextSentimentResult(Decimal("0.500"), contributions)


def test_sentiment_endpoint_returns_value_and_canonical_breakdown() -> None:
    service = FakeSentimentService()
    app.dependency_overrides[get_sentiment_analysis_service] = lambda: service
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/sentiment",
                json={"texto": "Una buena noticia", "idioma": "es"},
            )
            english_response = client.post(
                "/api/v1/sentiment",
                json={"texto": "Good news", "idioma": "en"},
            )

        assert response.status_code == 200
        assert response.json() == {
            "valor_humor": "0.500",
            "terminos": [
                {
                    "id_termino": 1,
                    "palabra": "bueno",
                    "valor": "5",
                    "ocurrencias": 1,
                    "aporte_humor": "5.00",
                }
            ],
        }
        assert service.calls == [
            ("Una buena noticia", "es"),
            ("Good news", "en"),
        ]
        assert english_response.status_code == 200
        assert english_response.json()["terminos"][0]["palabra"] == "good"
    finally:
        app.dependency_overrides.clear()


def test_sentiment_endpoint_distinguishes_no_matches_from_neutrality() -> None:
    service = FakeSentimentService()
    app.dependency_overrides[get_sentiment_analysis_service] = lambda: service
    try:
        with TestClient(app) as client:
            no_matches = client.post(
                "/api/v1/sentiment",
                json={"texto": "no matches", "idioma": "en"},
            )
            neutral = client.post(
                "/api/v1/sentiment",
                json={"texto": "neutral", "idioma": "es"},
            )

        assert no_matches.status_code == 200
        assert no_matches.json() == {"valor_humor": None, "terminos": []}
        assert neutral.status_code == 200
        assert neutral.json()["valor_humor"] == "0.000"
        assert len(neutral.json()["terminos"]) == 1
    finally:
        app.dependency_overrides.clear()


def test_sentiment_endpoint_rejects_invalid_payloads_with_400() -> None:
    service = FakeSentimentService()
    app.dependency_overrides[get_sentiment_analysis_service] = lambda: service
    try:
        with TestClient(app) as client:
            missing_language = client.post(
                "/api/v1/sentiment", json={"texto": "valid text"}
            )
            unsupported_language = client.post(
                "/api/v1/sentiment",
                json={"texto": "valid text", "idioma": "fr"},
            )
            empty = client.post(
                "/api/v1/sentiment", json={"texto": " \t ", "idioma": "es"}
            )
            too_long = client.post(
                "/api/v1/sentiment",
                json={"texto": "a" * 10_001, "idioma": "es"},
            )

        assert [
            missing_language.status_code,
            unsupported_language.status_code,
            empty.status_code,
            too_long.status_code,
        ] == [400, 400, 400, 400]
        assert service.calls == []
    finally:
        app.dependency_overrides.clear()


def test_sentiment_endpoint_maps_unexpected_error_to_500() -> None:
    class ErrorService:
        def analyze(self, text: str, language: str) -> TextSentimentResult:
            raise RuntimeError("unexpected")

    app.dependency_overrides[get_sentiment_analysis_service] = ErrorService
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/sentiment",
                json={"texto": "valid text", "idioma": "en"},
            )

        assert response.status_code == 500
        assert response.json() == {"detail": "Error interno del servidor"}
    finally:
        app.dependency_overrides.clear()
