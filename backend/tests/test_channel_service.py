from datetime import UTC, datetime
from typing import Any

import pytest

from app.models import Channel, RssSource
from app.models.domains import Continent
from app.repositories import DuplicateRecordError
from app.services.channels import (
    ChannelReplaceData,
    ChannelService,
    ChannelValidationError,
)
from app.services.sources import ResourceNotFoundError


CREATED_AT = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)


class FakeChannelRepository:
    def __init__(self) -> None:
        self.channels: dict[int, Channel] = {}
        self.last_filters: tuple[str | None, str | None, bool | None] | None = None
        self.update_count = 0
        self.raise_duplicate = False

    def get_channel(self, channel_id: int) -> Channel | None:
        return self.channels.get(channel_id)

    def get_channel_by_name(self, name: str) -> Channel | None:
        return next(
            (channel for channel in self.channels.values() if channel.nombre == name),
            None,
        )

    def list_channels(
        self,
        *,
        continent: str | None = None,
        country: str | None = None,
        active: bool | None = None,
    ) -> list[Channel]:
        self.last_filters = continent, country, active
        return list(self.channels.values())

    def update_channel(
        self,
        channel: Channel,
        changes: dict[str, Any],
    ) -> Channel:
        if self.raise_duplicate:
            raise DuplicateRecordError("duplicado concurrente")
        self.update_count += 1
        for field, value in changes.items():
            setattr(channel, field, value)
        return channel


@pytest.fixture
def repository() -> FakeChannelRepository:
    repository = FakeChannelRepository()
    repository.channels[1] = Channel(
        id_canal=1,
        nombre="Medio",
        continente="America",
        pais="CL",
        url_sitio="https://example.com",
        activo=True,
        fecha_alta=CREATED_AT,
    )
    return repository


@pytest.fixture
def service(repository: FakeChannelRepository) -> ChannelService:
    return ChannelService(repository)


def test_list_normalizes_country_and_combines_filters(
    service: ChannelService,
    repository: FakeChannelRepository,
) -> None:
    service.list_channels(
        continent=Continent.AMERICA,
        country=" cl ",
        active=False,
    )
    assert repository.last_filters == ("America", "CL", False)


def test_replace_preserves_identity_and_creation_date(
    service: ChannelService,
) -> None:
    channel = service.replace_channel(
        1,
        ChannelReplaceData(
            nombre="Medio renovado",
            continente=Continent.EUROPE,
            pais="es",
            url_sitio="https://example.org",
            activo=False,
        ),
    )
    assert channel.id_canal == 1
    assert channel.fecha_alta == CREATED_AT
    assert channel.continente == "Europa"
    assert channel.pais == "ES"
    assert channel.activo is False


def test_patch_can_clear_optional_fields(service: ChannelService) -> None:
    channel = service.patch_channel(1, {"pais": None, "url_sitio": None})
    assert channel.pais is None
    assert channel.url_sitio is None


def test_rejects_empty_patch_required_nulls_and_duplicates(
    service: ChannelService,
    repository: FakeChannelRepository,
) -> None:
    with pytest.raises(ChannelValidationError, match="al menos"):
        service.patch_channel(1, {})
    with pytest.raises(ChannelValidationError, match="no aceptan null"):
        service.patch_channel(1, {"activo": None})

    repository.channels[2] = Channel(
        id_canal=2,
        nombre="Otro",
        continente="Europa",
        fecha_alta=CREATED_AT,
    )
    with pytest.raises(ChannelValidationError, match="ya existe"):
        service.patch_channel(1, {"nombre": "Otro"})


def test_deactivation_is_idempotent_and_preserves_source_state(
    service: ChannelService,
    repository: FakeChannelRepository,
) -> None:
    channel = repository.channels[1]
    source = RssSource(
        id_fuente=1,
        canal=channel,
        nombre="Portada",
        url_feed="https://example.com/rss.xml",
        categoria_iptc="politics",
        idioma="es",
        activa=True,
    )

    service.deactivate_channel(1)
    service.deactivate_channel(1)

    assert channel.activo is False
    assert source.activa is True
    assert repository.update_count == 1


def test_missing_channel_and_concurrent_duplicate_are_translated(
    service: ChannelService,
    repository: FakeChannelRepository,
) -> None:
    with pytest.raises(ResourceNotFoundError, match="Canal"):
        service.get_channel(999)
    repository.raise_duplicate = True
    with pytest.raises(ChannelValidationError, match="concurrente"):
        service.patch_channel(1, {"nombre": "Nombre nuevo"})
