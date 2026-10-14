from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.api.channels import get_channel_service
from app.main import app
from app.models import Channel
from app.services.sources import ResourceNotFoundError


CREATED_AT = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)


class FakeChannelService:
    def __init__(self) -> None:
        self.channel = Channel(
            id_canal=1,
            nombre="Medio",
            continente="America",
            pais="CL",
            url_sitio="https://example.com",
            activo=True,
            fecha_alta=CREATED_AT,
        )
        self.filters: dict[str, object] | None = None
        self.deactivated: list[int] = []

    def list_channels(self, **filters: object) -> list[Channel]:
        self.filters = filters
        return [self.channel]

    def get_channel(self, channel_id: int) -> Channel:
        return self.channel

    def replace_channel(self, channel_id: int, replacement) -> Channel:
        self.channel.nombre = replacement.nombre
        self.channel.continente = replacement.continente.value
        self.channel.pais = replacement.pais
        self.channel.url_sitio = replacement.url_sitio
        self.channel.activo = replacement.activo
        return self.channel

    def patch_channel(self, channel_id: int, changes: dict[str, object]) -> Channel:
        for field, value in changes.items():
            if hasattr(value, "value"):
                value = value.value
            setattr(self.channel, field, value)
        return self.channel

    def deactivate_channel(self, channel_id: int) -> None:
        self.deactivated.append(channel_id)
        self.channel.activo = False


class MissingChannelService(FakeChannelService):
    def get_channel(self, channel_id: int) -> Channel:
        raise ResourceNotFoundError("Canal no encontrado")


def test_channel_routes_are_available_without_authentication() -> None:
    service = FakeChannelService()
    app.dependency_overrides[get_channel_service] = lambda: service
    try:
        with TestClient(app) as client:
            listing = client.get(
                "/api/v1/channels",
                params={"continent": "America", "country": "cl", "active": True},
            )
            detail = client.get("/api/v1/channels/1")
            replaced = client.put(
                "/api/v1/channels/1",
                json={
                    "nombre": "Medio nuevo",
                    "continente": "Europa",
                    "pais": "es",
                    "url_sitio": "https://example.org",
                    "activo": True,
                },
            )
            patched = client.patch("/api/v1/channels/1", json={"pais": None})
            deleted = client.delete("/api/v1/channels/1")
    finally:
        app.dependency_overrides.clear()

    assert listing.status_code == 200
    assert listing.json()[0]["pais"] == "CL"
    assert service.filters == {
        "continent": "America",
        "country": "cl",
        "active": True,
    }
    assert detail.status_code == 200
    assert replaced.status_code == 200
    assert replaced.json()["continente"] == "Europa"
    assert replaced.json()["pais"] == "ES"
    assert patched.status_code == 200
    assert patched.json()["pais"] is None
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert service.deactivated == [1]


def test_channel_routes_reject_invalid_update_payloads_as_400() -> None:
    app.dependency_overrides[get_channel_service] = lambda: FakeChannelService()
    try:
        with TestClient(app) as client:
            incomplete_put = client.put(
                "/api/v1/channels/1",
                json={"nombre": "Incompleto", "continente": "America"},
            )
            empty_patch = client.patch("/api/v1/channels/1", json={})
            required_null = client.patch(
                "/api/v1/channels/1", json={"activo": None}
            )
    finally:
        app.dependency_overrides.clear()

    assert incomplete_put.status_code == 400
    assert empty_patch.status_code == 400
    assert required_null.status_code == 400


def test_channel_detail_translates_missing_resource_to_404() -> None:
    app.dependency_overrides[get_channel_service] = lambda: MissingChannelService()
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/channels/999")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json() == {"detail": "Canal no encontrado"}
