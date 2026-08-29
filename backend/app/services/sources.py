from dataclasses import asdict, dataclass
from typing import Protocol

from app.models import Channel, RssSource
from app.models.domains import Continent, IptcCategory, Language
from app.repositories.sources import DuplicateRecordError


class SourceValidationError(Exception):
    pass


class ResourceNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class ChannelCreateData:
    nombre: str
    continente: Continent


@dataclass(frozen=True)
class SourceCreateData:
    nombre: str
    url_feed: str
    categoria_iptc: IptcCategory
    idioma: Language
    activa: bool = True


@dataclass(frozen=True)
class SourceUpdateData:
    nombre: str | None = None
    url_feed: str | None = None
    categoria_iptc: IptcCategory | None = None
    idioma: Language | None = None
    activa: bool | None = None


class SourceRepositoryProtocol(Protocol):
    def get_channel(self, channel_id: int) -> Channel | None: ...

    def get_channel_by_name(self, name: str) -> Channel | None: ...

    def get_source(self, source_id: int) -> RssSource | None: ...

    def get_source_by_url(self, feed_url: str) -> RssSource | None: ...

    def create_channel_with_sources(
        self, channel_data: dict[str, object], source_data: list[dict[str, object]]
    ) -> tuple[Channel, list[RssSource]]: ...

    def add_sources(
        self, channel: Channel, source_data: list[dict[str, object]]
    ) -> list[RssSource]: ...

    def list_sources(
        self, *, continent: str | None = None, active: bool | None = None
    ) -> list[RssSource]: ...

    def update_source(
        self, source: RssSource, changes: dict[str, object]
    ) -> RssSource: ...

    def delete_source(self, source: RssSource) -> None: ...


class SourceService:
    def __init__(self, repository: SourceRepositoryProtocol) -> None:
        self._repository = repository

    def create_sources(
        self,
        *,
        sources: list[SourceCreateData],
        channel: ChannelCreateData | None = None,
        channel_id: int | None = None,
    ) -> tuple[Channel, list[RssSource]]:
        if (channel is None) == (channel_id is None):
            raise SourceValidationError(
                "Debe indicar exactamente un canal nuevo o channel_id"
            )
        if not sources:
            raise SourceValidationError("Debe incluir al menos una fuente")

        urls = [source.url_feed for source in sources]
        if len(urls) != len(set(urls)):
            raise SourceValidationError("Las URLs de las fuentes deben ser unicas")
        for feed_url in urls:
            if self._repository.get_source_by_url(feed_url) is not None:
                raise SourceValidationError("La URL del feed ya existe")

        source_rows = [self._source_create_values(source) for source in sources]
        try:
            if channel is not None:
                if self._repository.get_channel_by_name(channel.nombre) is not None:
                    raise SourceValidationError("El nombre del canal ya existe")
                return self._repository.create_channel_with_sources(
                    {
                        "nombre": channel.nombre,
                        "continente": channel.continente.value,
                    },
                    source_rows,
                )

            existing_channel = self._repository.get_channel(channel_id)  # type: ignore[arg-type]
            if existing_channel is None:
                raise ResourceNotFoundError("Canal no encontrado")
            return existing_channel, self._repository.add_sources(
                existing_channel, source_rows
            )
        except DuplicateRecordError as error:
            raise SourceValidationError(str(error)) from error

    def list_sources(
        self,
        *,
        continent: Continent | None = None,
        active: bool | None = None,
    ) -> list[RssSource]:
        return self._repository.list_sources(
            continent=continent.value if continent else None,
            active=active,
        )

    def get_source(self, source_id: int) -> RssSource:
        source = self._repository.get_source(source_id)
        if source is None:
            raise ResourceNotFoundError("Fuente RSS no encontrada")
        return source

    def replace_source(
        self, source_id: int, replacement: SourceUpdateData
    ) -> RssSource:
        return self._update_source(source_id, replacement, exclude_none=False)

    def patch_source(self, source_id: int, patch: SourceUpdateData) -> RssSource:
        return self._update_source(source_id, patch, exclude_none=True)

    def delete_source(self, source_id: int) -> None:
        source = self.get_source(source_id)
        self._repository.delete_source(source)

    def _update_source(
        self,
        source_id: int,
        update: SourceUpdateData,
        *,
        exclude_none: bool,
    ) -> RssSource:
        source = self.get_source(source_id)
        changes = asdict(update)
        if exclude_none:
            changes = {key: value for key, value in changes.items() if value is not None}
        if not changes:
            raise SourceValidationError("Debe indicar al menos un campo editable")

        if "url_feed" in changes and changes["url_feed"] != source.url_feed:
            duplicate = self._repository.get_source_by_url(str(changes["url_feed"]))
            if duplicate is not None:
                raise SourceValidationError("La URL del feed ya existe")

        normalized = {
            key: value.value if isinstance(value, (IptcCategory, Language)) else value
            for key, value in changes.items()
        }
        try:
            return self._repository.update_source(source, normalized)
        except DuplicateRecordError as error:
            raise SourceValidationError(str(error)) from error

    @staticmethod
    def _source_create_values(source: SourceCreateData) -> dict[str, object]:
        return {
            "nombre": source.nombre,
            "url_feed": source.url_feed,
            "categoria_iptc": source.categoria_iptc.value,
            "idioma": source.idioma.value,
            "activa": source.activa,
        }
