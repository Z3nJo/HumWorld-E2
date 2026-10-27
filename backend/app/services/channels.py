from collections.abc import Mapping
from dataclasses import asdict, dataclass
from typing import Protocol

from app.models import Channel, Country
from app.models.domains import Continent
from app.repositories.sources import DuplicateRecordError
from app.services.sources import ResourceNotFoundError
from app.validation import normalize_country, normalize_site_url


class ChannelValidationError(Exception):
    pass


@dataclass(frozen=True)
class ChannelReplaceData:
    nombre: str
    continente: Continent
    pais: str | None
    url_sitio: str | None
    activo: bool


class ChannelRepositoryProtocol(Protocol):
    def get_channel(self, channel_id: int) -> Channel | None: ...

    def get_channel_by_name(self, name: str) -> Channel | None: ...

    def get_country(self, country_code: str) -> Country | None: ...

    def list_channels(
        self,
        *,
        continent: str | None = None,
        country: str | None = None,
        active: bool | None = None,
    ) -> list[Channel]: ...

    def update_channel(
        self, channel: Channel, changes: Mapping[str, object]
    ) -> Channel: ...


class ChannelService:
    def __init__(self, repository: ChannelRepositoryProtocol) -> None:
        self._repository = repository

    def list_channels(
        self,
        *,
        continent: Continent | None = None,
        country: str | None = None,
        active: bool | None = None,
    ) -> list[Channel]:
        try:
            normalized_country = normalize_country(country)
        except ValueError as error:
            raise ChannelValidationError(str(error)) from error
        return self._repository.list_channels(
            continent=continent.value if continent else None,
            country=normalized_country,
            active=active,
        )

    def get_channel(self, channel_id: int) -> Channel:
        channel = self._repository.get_channel(channel_id)
        if channel is None:
            raise ResourceNotFoundError("Canal no encontrado")
        return channel

    def replace_channel(
        self,
        channel_id: int,
        replacement: ChannelReplaceData,
    ) -> Channel:
        return self._update_channel(channel_id, asdict(replacement))

    def patch_channel(
        self,
        channel_id: int,
        changes: Mapping[str, object],
    ) -> Channel:
        if not changes:
            raise ChannelValidationError("Debe indicar al menos un campo editable")
        if any(
            field in changes and changes[field] is None
            for field in ("nombre", "continente", "activo")
        ):
            raise ChannelValidationError(
                "nombre, continente y activo no aceptan null"
            )
        return self._update_channel(channel_id, changes)

    def deactivate_channel(self, channel_id: int) -> None:
        channel = self.get_channel(channel_id)
        if channel.activo:
            self._repository.update_channel(channel, {"activo": False})

    def _update_channel(
        self,
        channel_id: int,
        changes: Mapping[str, object],
    ) -> Channel:
        channel = self.get_channel(channel_id)
        normalized = dict(changes)
        if "continente" in normalized and isinstance(
            normalized["continente"], Continent
        ):
            normalized["continente"] = normalized["continente"].value
        try:
            if "pais" in normalized:
                normalized["pais"] = normalize_country(normalized["pais"])
            if "url_sitio" in normalized:
                normalized["url_sitio"] = normalize_site_url(
                    normalized["url_sitio"]
                )
        except ValueError as error:
            raise ChannelValidationError(str(error)) from error

        new_name = normalized.get("nombre")
        if new_name is not None and new_name != channel.nombre:
            duplicate = self._repository.get_channel_by_name(str(new_name))
            if duplicate is not None and duplicate.id_canal != channel_id:
                raise ChannelValidationError("El nombre del canal ya existe")
        target_country = normalized.get("pais", channel.pais)
        target_continent = normalized.get("continente", channel.continente)
        if target_country is not None:
            country = self._repository.get_country(str(target_country))
            if country is None:
                raise ChannelValidationError("El país no está soportado por el catálogo")
            if country.continente != target_continent:
                raise ChannelValidationError(
                    "El país no pertenece al continente declarado"
                )
        try:
            return self._repository.update_channel(channel, normalized)
        except DuplicateRecordError as error:
            raise ChannelValidationError(str(error)) from error
