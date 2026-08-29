from fastapi.testclient import TestClient

from app.api.sources import get_source_service
from app.main import app


class UnusedService:
    def list_sources(self, **kwargs: object) -> list[object]:
        return []


def test_openapi_documents_required_source_operations_and_errors() -> None:
    schema = app.openapi()
    collection = schema["paths"]["/api/v1/sources"]
    item = schema["paths"]["/api/v1/sources/{source_id}"]
    assert {"get", "post"} <= collection.keys()
    assert {"get", "put", "patch", "delete"} <= item.keys()
    assert collection["post"]["responses"].keys() >= {"201", "400", "404", "500"}
    assert item["delete"]["responses"].keys() >= {"204", "400", "404", "500"}
    for path_item in (collection, item):
        for operation in path_item.values():
            assert "422" not in operation["responses"]


def test_update_schemas_do_not_expose_channel_id() -> None:
    schemas = app.openapi()["components"]["schemas"]
    assert "id_canal" not in schemas["SourceReplace"]["properties"]
    assert "id_canal" not in schemas["SourcePatch"]["properties"]


def test_validation_errors_are_400_not_default_422() -> None:
    app.dependency_overrides[get_source_service] = lambda: UnusedService()
    try:
        with TestClient(app) as client:
            response = client.post("/api/v1/sources", json={"sources": []})
        assert response.status_code == 400
        assert "detail" in response.json()
    finally:
        app.dependency_overrides.clear()


def test_aggregate_model_validation_is_serialized_as_400() -> None:
    app.dependency_overrides[get_source_service] = lambda: UnusedService()
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/sources",
                json={
                    "sources": [
                        {
                            "nombre": "Portada",
                            "url_feed": "https://example.com/rss.xml",
                            "categoria_iptc": "politics",
                            "idioma": "es",
                        }
                    ]
                },
            )
        assert response.status_code == 400
        assert "exactamente" in str(response.json()["detail"])
    finally:
        app.dependency_overrides.clear()


def test_list_is_available_without_authentication() -> None:
    app.dependency_overrides[get_source_service] = lambda: UnusedService()
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/sources")
        assert response.status_code == 200
        assert response.json() == []
    finally:
        app.dependency_overrides.clear()
