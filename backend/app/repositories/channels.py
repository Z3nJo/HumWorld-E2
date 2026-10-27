from collections.abc import Mapping
from typing import Any

from sqlalchemy import Integer, String, cast, delete, exists, insert, literal, null, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Channel, Country, News, NewsCountry, RssSource
from app.repositories.sources import DuplicateRecordError


class ChannelRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_channel(self, channel_id: int) -> Channel | None:
        return self._session.get(Channel, channel_id)

    def get_channel_by_name(self, name: str) -> Channel | None:
        return self._session.scalar(select(Channel).where(Channel.nombre == name))

    def get_country(self, country_code: str) -> Country | None:
        return self._session.get(Country, country_code)

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
        geographic_change = any(
            field in changes and changes[field] != getattr(channel, field)
            for field in ("pais", "continente")
        )
        for field, value in changes.items():
            setattr(channel, field, value)
        try:
            self._session.flush()
            if geographic_change:
                self._reconcile_source_attributions(channel)
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            raise DuplicateRecordError("El nombre del canal ya existe") from error
        except Exception:
            self._session.rollback()
            raise
        self._session.refresh(channel)
        return channel

    def _reconcile_source_attributions(self, channel: Channel) -> None:
        has_mention = exists(
            select(1).where(
                NewsCountry.id_noticia == News.id_noticia,
                NewsCountry.origen == "mencion",
            )
        )
        eligible = (
            select(News.id_noticia)
            .join(RssSource, RssSource.id_fuente == News.id_fuente)
            .where(RssSource.id_canal == channel.id_canal, ~has_mention)
        )
        self._session.execute(
            delete(NewsCountry).where(
                NewsCountry.id_noticia.in_(eligible),
                NewsCountry.origen == "fuente",
            )
        )
        if channel.pais is not None:
            rows = select(
                News.id_noticia,
                literal(channel.pais),
                literal("fuente"),
                cast(null(), Integer),
                cast(null(), String(11)),
            ).where(News.id_noticia.in_(eligible))
            self._session.execute(
                insert(NewsCountry).from_select(
                    ["id_noticia", "codigo_pais", "origen", "id_alias", "campo"],
                    rows,
                )
            )
