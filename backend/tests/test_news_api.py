from fastapi.testclient import TestClient

from app.api.news import get_news_purge_service
from app.main import app


class FakeNewsPurgeService:
    def __init__(self, results: list[int] | None = None) -> None:
        self.results = list(results or [0])
        self.calls = 0

    def purge_expired(self) -> int:
        result = self.results[min(self.calls, len(self.results) - 1)]
        self.calls += 1
        return result


def test_manual_news_purge_returns_empty_204_and_invokes_service_once() -> None:
    service = FakeNewsPurgeService([3])
    app.dependency_overrides[get_news_purge_service] = lambda: service
    try:
        with TestClient(app) as client:
            response = client.delete("/api/v1/news")

        assert response.status_code == 204
        assert response.content == b""
        assert service.calls == 1
    finally:
        app.dependency_overrides.clear()


def test_manual_news_purge_is_idempotent_when_nothing_is_deleted() -> None:
    service = FakeNewsPurgeService([0, 0])
    app.dependency_overrides[get_news_purge_service] = lambda: service
    try:
        with TestClient(app) as client:
            first = client.delete("/api/v1/news")
            repeated = client.delete("/api/v1/news")

        assert first.status_code == repeated.status_code == 204
        assert first.content == repeated.content == b""
        assert service.calls == 2
    finally:
        app.dependency_overrides.clear()


def test_manual_news_purge_maps_unexpected_error_to_500() -> None:
    class ErrorService:
        def purge_expired(self) -> int:
            raise RuntimeError("database unavailable")

    app.dependency_overrides[get_news_purge_service] = ErrorService
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.delete("/api/v1/news")

        assert response.status_code == 500
        assert response.json() == {"detail": "Error interno del servidor"}
    finally:
        app.dependency_overrides.clear()
