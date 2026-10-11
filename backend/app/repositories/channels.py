from collections.abc import Mapping
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Channel
from app.repositories.sources import DuplicateRecordError


class ChannelRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_channel(self, channel_id: int) -> Channel | None:
        return self._session.get(Channel, channel_id)

    def get_channel_by_name(self, name: str) -> Channel | None:
        return self._session.scalar(select(Channel).where(Channel.nombre == name))

    def list_channels(
        self,
        *,
        continent: str | None = None,
        country: str | None = None,
        active: bool | None = None,
    ) -> list[Channel]:
        statement = select(Channel)
        if continent is not None:
            statement = statement.where(Channel.continente == continent)
        if country is not None:
            statement = statement.where(Channel.pais == country)
        if active is not None:
            statement = statement.where(Channel.activo.is_(active))
        return list(
            self._session.scalars(statement.order_by(Channel.id_canal)).all()
        )

    def update_channel(
        self,
        channel: Channel,
        changes: Mapping[str, Any],
    ) -> Channel:
        for field, value in changes.items():
            setattr(channel, field, value)
        try:
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            raise DuplicateRecordError("El nombre del canal ya existe") from error
        self._session.refresh(channel)
        return channel
