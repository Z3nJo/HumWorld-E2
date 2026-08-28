from collections.abc import Mapping, Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models import Channel, RssSource


class DuplicateRecordError(Exception):
    pass


class SourceRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_channel(self, channel_id: int) -> Channel | None:
        return self._session.get(Channel, channel_id)

    def get_channel_by_name(self, name: str) -> Channel | None:
        return self._session.scalar(select(Channel).where(Channel.nombre == name))

    def get_source(self, source_id: int) -> RssSource | None:
        statement = (
            select(RssSource)
            .options(joinedload(RssSource.canal))
            .where(RssSource.id_fuente == source_id)
        )
        return self._session.scalar(statement)

    def get_source_by_url(self, feed_url: str) -> RssSource | None:
        return self._session.scalar(
            select(RssSource).where(RssSource.url_feed == feed_url)
        )

    def create_channel_with_sources(
        self,
        channel_data: Mapping[str, Any],
        source_data: Sequence[Mapping[str, Any]],
    ) -> tuple[Channel, list[RssSource]]:
        channel = Channel(**channel_data)
        sources = [RssSource(canal=channel, **item) for item in source_data]
        self._session.add(channel)
        self._session.add_all(sources)
        self._commit_or_raise_duplicate()
        return channel, sources

    def add_sources(
        self,
        channel: Channel,
        source_data: Sequence[Mapping[str, Any]],
    ) -> list[RssSource]:
        sources = [RssSource(canal=channel, **item) for item in source_data]
        self._session.add_all(sources)
        self._commit_or_raise_duplicate()
        return sources

    def list_sources(
        self,
        *,
        continent: str | None = None,
        active: bool | None = None,
    ) -> list[RssSource]:
        statement = select(RssSource).options(joinedload(RssSource.canal))
        if continent is not None:
            statement = statement.join(RssSource.canal).where(
                Channel.continente == continent
            )
        if active is not None:
            statement = statement.where(RssSource.activa.is_(active))
        statement = statement.order_by(RssSource.id_fuente)
        return list(self._session.scalars(statement).all())

    def update_source(
        self,
        source: RssSource,
        changes: Mapping[str, Any],
    ) -> RssSource:
        for field, value in changes.items():
            setattr(source, field, value)
        self._commit_or_raise_duplicate()
        refreshed = self.get_source(source.id_fuente)
        if refreshed is None:  # Defensive: the row cannot disappear in this transaction.
            raise RuntimeError("La fuente actualizada no pudo recuperarse")
        return refreshed

    def delete_source(self, source: RssSource) -> None:
        self._session.delete(source)
        self._session.commit()

    def _commit_or_raise_duplicate(self) -> None:
        try:
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            raise DuplicateRecordError(
                "El nombre del canal o la URL del feed ya existe"
            ) from error
