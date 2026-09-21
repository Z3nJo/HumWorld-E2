from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.dictionary import get_dictionary_service
from app.main import app
from app.services.dictionary import (
    DictionaryValidationError,
    TermNotFoundError,
)


def term(**changes: object) -> SimpleNamespace:
    values = {
        "id_termino": 1,
        "palabra": "alegría",
        "idioma": "es",
        "valor": Decimal("0.75"),
        "activo": True,
        "fecha_alta": datetime(2026, 9, 21, 12, 0, tzinfo=UTC),
        "fecha_modificacion": datetime(2026, 9, 21, 12, 0, tzinfo=UTC),
    }
    values.update(changes)
    return SimpleNamespace(**values)


class FakeDictionaryService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, object]] = []

    def list_terms(self, *, query: str | None = None) -> list[SimpleNamespace]:
        self.calls.append(("list", query))
        return [term()]

    def get_term(self, term_id: int) -> SimpleNamespace:
        self.calls.append(("get", term_id))
        return term(id_termino=term_id)

    def create_term(self, data: object) -> SimpleNamespace:
        self.calls.append(("create", data))
        return term()

    def replace_term(self, term_id: int, data: object) -> SimpleNamespace:
        self.calls.append(("replace", (term_id, data)))
        return term(id_termino=term_id, palabra="calm", idioma="en")

    def patch_term(self, term_id: int, data: object) -> SimpleNamespace:
        self.calls.append(("patch", (term_id, data)))
        return term(id_termino=term_id, activo=False)

    def delete_term(self, term_id: int) -> None:
        self.calls.append(("delete", term_id))


def test_dictionary_endpoints_expose_crud_without_authentication() -> None:
    service = FakeDictionaryService()
    app.dependency_overrides[get_dictionary_service] = lambda: service
    try:
        with TestClient(app) as client:
            listed = client.get("/api/v1/dictionary", params={"q": "ALE"})
            detailed = client.get("/api/v1/dictionary/1")
            created = client.post(
                "/api/v1/dictionary",
                json={"palabra": " Alegría ", "idioma": "es", "valor": "0.75"},
            )
            replaced = client.put(
                "/api/v1/dictionary/1",
                json={
                    "palabra": "calm",
                    "idioma": "en",
                    "valor": -1,
                    "activo": True,
                },
            )
            patched = client.patch(
                "/api/v1/dictionary/1",
                json={"activo": False},
            )
            deleted = client.delete("/api/v1/dictionary/1")

        assert listed.status_code == 200
        assert detailed.status_code == 200
        assert created.status_code == 201
        assert created.json()["valor"] == "0.75"
        assert replaced.status_code == 200
        assert replaced.json()["palabra"] == "calm"
        assert patched.status_code == 200
        assert patched.json()["activo"] is False
        assert deleted.status_code == 204
        assert service.calls[0] == ("list", "ALE")
        assert [name for name, _ in service.calls] == [
            "list",
            "get",
            "create",
            "replace",
            "patch",
            "delete",
        ]
    finally:
        app.dependency_overrides.clear()


def test_dictionary_payload_validation_is_reported_as_400() -> None:
    service = FakeDictionaryService()
    app.dependency_overrides[get_dictionary_service] = lambda: service
    try:
        with TestClient(app) as client:
            empty_patch = client.patch("/api/v1/dictionary/1", json={})
            null_patch = client.patch(
                "/api/v1/dictionary/1",
                json={"palabra": None},
            )
            invalid_decimal = client.post(
                "/api/v1/dictionary",
                json={"palabra": "calma", "idioma": "es", "valor": "NaN"},
            )

        assert empty_patch.status_code == 400
        assert null_patch.status_code == 400
        assert invalid_decimal.status_code == 400
        assert service.calls == []
    finally:
        app.dependency_overrides.clear()


def test_dictionary_domain_errors_map_to_standard_codes() -> None:
    class ErrorService(FakeDictionaryService):
        def create_term(self, data: object) -> SimpleNamespace:
            raise DictionaryValidationError("duplicado")

        def get_term(self, term_id: int) -> SimpleNamespace:
            raise TermNotFoundError("Termino no encontrado")

    app.dependency_overrides[get_dictionary_service] = ErrorService
    try:
        with TestClient(app) as client:
            duplicate = client.post(
                "/api/v1/dictionary",
                json={"palabra": "calma", "idioma": "es", "valor": 1},
            )
            missing = client.get("/api/v1/dictionary/999")

        assert duplicate.status_code == 400
        assert duplicate.json() == {"detail": "duplicado"}
        assert missing.status_code == 404
        assert missing.json() == {"detail": "Termino no encontrado"}
    finally:
        app.dependency_overrides.clear()
