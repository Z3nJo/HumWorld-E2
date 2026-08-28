from typing import Any

import pytest

from app.models import Channel, RssSource
from app.models.domains import Continent, IptcCategory, Language
from app.repositories import DuplicateRecordError
from app.services.sources import (
    ChannelCreateData,
    ResourceNotFoundError,
    SourceCreateData,
    SourceService,
    SourceUpdateData,
    SourceValidationError,
)


class FakeSourceRepository:
    def __init__(self) -> None:
        self.channels: dict[int, Channel] = {}
        self.sources: dict[int, RssSource] = {}
        self.last_filters: tuple[str | None, bool | None] | None = None
        self.raise_duplicate = False

    def get_channel(self, channel_id: int) -> Channel | None:
        return self.channels.get(channel_id)

    def get_channel_by_name(self, name: str) -> Channel | None:
        return next((item for item in self.channels.values() if item.nombre == name), None)

    def get_source(self, source_id: int) -> RssSource | None:
        return self.sources.get(source_id)

    def get_source_by_url(self, feed_url: str) -> RssSource | None:
        return next(
            (item for item in self.sources.values() if item.url_feed == feed_url),
            None,
        )

    def create_channel_with_sources(
        self,
        channel_data: dict[str, object],
        source_data: list[dict[str, object]],
    ) -> tuple[Channel, list[RssSource]]:
        self._maybe_raise_duplicate()
        channel = Channel(id_canal=len(self.channels) + 1, **channel_data)
        self.channels[channel.id_canal] = channel
        return channel, self._add_source_rows(channel, source_data)

    def add_sources(
        self,
        channel: Channel,
        source_data: list[dict[str, object]],
    ) -> list[RssSource]:
        self._maybe_raise_duplicate()
        return self._add_source_rows(channel, source_data)

    def list_sources(
        self,
        *,
        continent: str | None = None,
        active: bool | None = None,
    ) -> list[RssSource]:
        self.last_filters = continent, active
        return list(self.sources.values())

    def update_source(
        self,
        source: RssSource,
        changes: dict[str, object],
    ) -> RssSource:
        self._maybe_raise_duplicate()
        for key, value in changes.items():
            setattr(source, key, value)
        return source

    def delete_source(self, source: RssSource) -> None:
        del self.sources[source.id_fuente]

    def _add_source_rows(
        self,
        channel: Channel,
        source_data: list[dict[str, object]],
    ) -> list[RssSource]:
        result = []
        for values in source_data:
            source = RssSource(
                id_fuente=len(self.sources) + 1,
                id_canal=channel.id_canal,
                canal=channel,
                **values,
            )
            self.sources[source.id_fuente] = source
            result.append(source)
        return result

    def _maybe_raise_duplicate(self) -> None:
        if self.raise_duplicate:
            raise DuplicateRecordError("duplicado concurrente")


@pytest.fixture
def repository() -> FakeSourceRepository:
    return FakeSourceRepository()


@pytest.fixture
def service(repository: FakeSourceRepository) -> SourceService:
    return SourceService(repository)


def source_data(url: str = "https://example.com/feed.xml") -> SourceCreateData:
    return SourceCreateData(
        nombre="Portada",
        url_feed=url,
        categoria_iptc=IptcCategory.POLITICS,
        idioma=Language.SPANISH,
    )


def channel_data() -> ChannelCreateData:
    return ChannelCreateData(nombre="Medio", continente=Continent.AMERICA)


def test_creates_new_channel_with_multiple_sources(
    service: SourceService,
    repository: FakeSourceRepository,
) -> None:
    channel, sources = service.create_sources(
        channel=channel_data(),
        sources=[source_data(), source_data("https://example.com/sport.xml")],
    )
    assert channel.nombre == "Medio"
    assert len(sources) == 2
    assert {item.id_canal for item in sources} == {channel.id_canal}
    assert all(item.activa for item in sources)
    assert len(repository.channels) == 1


def test_adds_sources_to_existing_channel(
    service: SourceService,
    repository: FakeSourceRepository,
) -> None:
    channel = Channel(id_canal=7, nombre="Existente", continente="Europa")
    repository.channels[7] = channel
    returned, sources = service.create_sources(channel_id=7, sources=[source_data()])
    assert returned is channel
    assert sources[0].id_canal == 7


@pytest.mark.parametrize(
    ("channel", "channel_id", "sources", "message"),
    [
        (None, None, [source_data()], "exactamente"),
        (channel_data(), 1, [source_data()], "exactamente"),
        (channel_data(), None, [], "al menos"),
    ],
)
def test_rejects_invalid_aggregate_request(
    service: SourceService,
    channel: ChannelCreateData | None,
    channel_id: int | None,
    sources: list[SourceCreateData],
    message: str,
) -> None:
    with pytest.raises(SourceValidationError, match=message):
        service.create_sources(channel=channel, channel_id=channel_id, sources=sources)


def test_rejects_duplicate_urls_in_batch(service: SourceService) -> None:
    with pytest.raises(SourceValidationError, match="unicas"):
        service.create_sources(
            channel=channel_data(),
            sources=[source_data(), source_data()],
        )


def test_rejects_existing_channel_name_and_feed_url(
    service: SourceService,
    repository: FakeSourceRepository,
) -> None:
    service.create_sources(channel=channel_data(), sources=[source_data()])
    with pytest.raises(SourceValidationError, match="URL"):
        service.create_sources(
            channel=ChannelCreateData("Otro", Continent.EUROPE),
            sources=[source_data()],
        )
    with pytest.raises(SourceValidationError, match="canal"):
        service.create_sources(
            channel=channel_data(),
            sources=[source_data("https://another.example/feed.xml")],
        )
    assert len(repository.channels) == 1


def test_missing_existing_channel_returns_not_found(service: SourceService) -> None:
    with pytest.raises(ResourceNotFoundError, match="Canal"):
        service.create_sources(channel_id=999, sources=[source_data()])


def test_list_passes_minimum_filters(
    service: SourceService,
    repository: FakeSourceRepository,
) -> None:
    service.list_sources(continent=Continent.ASIA, active=False)
    assert repository.last_filters == ("Asia", False)


def test_get_update_patch_and_delete_preserve_channel(
    service: SourceService,
) -> None:
    channel, sources = service.create_sources(
        channel=channel_data(), sources=[source_data()]
    )
    source = sources[0]
    assert service.get_source(source.id_fuente) is source

    replaced = service.replace_source(
        source.id_fuente,
        SourceUpdateData(
            nombre="Economia",
            url_feed="https://example.com/economy.xml",
            categoria_iptc=IptcCategory.ECONOMY_BUSINESS_FINANCE,
            idioma=Language.ENGLISH,
            activa=False,
        ),
    )
    assert replaced.id_canal == channel.id_canal
    assert replaced.idioma == "en"
    assert replaced.activa is False

    patched = service.patch_source(
        source.id_fuente,
        SourceUpdateData(nombre="Economia global"),
    )
    assert patched.nombre == "Economia global"
    assert patched.url_feed == "https://example.com/economy.xml"
    assert patched.id_canal == channel.id_canal

    service.delete_source(source.id_fuente)
    with pytest.raises(ResourceNotFoundError):
        service.get_source(source.id_fuente)


def test_rejects_empty_patch_and_duplicate_update(
    service: SourceService,
) -> None:
    _, sources = service.create_sources(
        channel=channel_data(),
        sources=[source_data(), source_data("https://example.com/second.xml")],
    )
    with pytest.raises(SourceValidationError, match="campo"):
        service.patch_source(sources[0].id_fuente, SourceUpdateData())
    with pytest.raises(SourceValidationError, match="URL"):
        service.patch_source(
            sources[0].id_fuente,
            SourceUpdateData(url_feed=sources[1].url_feed),
        )


def test_translates_concurrent_duplicates(
    service: SourceService,
    repository: FakeSourceRepository,
) -> None:
    repository.raise_duplicate = True
    with pytest.raises(SourceValidationError, match="concurrente"):
        service.create_sources(channel=channel_data(), sources=[source_data()])


def test_unknown_source_returns_not_found(service: SourceService) -> None:
    with pytest.raises(ResourceNotFoundError, match="Fuente"):
        service.get_source(404)
