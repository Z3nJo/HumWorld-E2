from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_session_factory
from app.models import Channel, RssSource
from app.models.domains import Continent, IptcCategory, Language


class SeedConflictError(Exception):
    """Raised when persisted data conflicts with the versioned seed catalog."""


@dataclass(frozen=True)
class SourceSeed:
    channel_name: str
    continent: Continent
    source_name: str
    feed_url: str
    category: IptcCategory
    language: Language
    active: bool = True


@dataclass(frozen=True)
class SeedResult:
    created_channels: int
    created_sources: int
    existing_sources: int


SOURCE_SEEDS: tuple[SourceSeed, ...] = (
    SourceSeed(
        channel_name="Africanews",
        continent=Continent.AFRICA,
        source_name="Africanews Latest News",
        feed_url="https://www.africanews.com/feed/rss",
        category=IptcCategory.SOCIETY,
        language=Language.ENGLISH,
    ),
    SourceSeed(
        channel_name="CBC News",
        continent=Continent.AMERICA,
        source_name="CBC News Top Stories",
        feed_url="https://www.cbc.ca/cmlink/rss-topstories",
        category=IptcCategory.SOCIETY,
        language=Language.ENGLISH,
    ),
    SourceSeed(
        channel_name="United States Antarctic Program",
        continent=Continent.ANTARCTICA,
        source_name="USAP News",
        feed_url="https://www.usap.gov/documents/usapnews.xml",
        category=IptcCategory.SCIENCE_TECHNOLOGY,
        language=Language.ENGLISH,
    ),
    SourceSeed(
        channel_name="Channel News Asia",
        continent=Continent.ASIA,
        source_name="CNA Asia",
        feed_url=(
            "https://www.channelnewsasia.com/api/v1/"
            "rss-outbound-feed?_format=xml&category=6511"
        ),
        category=IptcCategory.SOCIETY,
        language=Language.ENGLISH,
    ),
    SourceSeed(
        channel_name="Deutsche Welle",
        continent=Continent.EUROPE,
        source_name="DW English",
        feed_url="https://rss.dw.com/rdf/rss-en-all",
        category=IptcCategory.SOCIETY,
        language=Language.ENGLISH,
    ),
    SourceSeed(
        channel_name="ABC News Australia",
        continent=Continent.OCEANIA,
        source_name="ABC News Top Stories",
        feed_url="https://www.abc.net.au/news/feed/51120/rss.xml",
        category=IptcCategory.SOCIETY,
        language=Language.ENGLISH,
    ),
)


def seed_sources(session: Session) -> SeedResult:
    created_channels = 0
    created_sources = 0
    existing_sources = 0

    try:
        for entry in SOURCE_SEEDS:
            channel = session.scalar(
                select(Channel).where(Channel.nombre == entry.channel_name)
            )
            source = session.scalar(
                select(RssSource).where(RssSource.url_feed == entry.feed_url)
            )

            if channel is not None:
                _ensure_channel_compatible(channel, entry)
            elif source is not None:
                raise SeedConflictError(
                    f"La URL {entry.feed_url!r} ya pertenece a otro canal"
                )
            else:
                channel = Channel(
                    nombre=entry.channel_name,
                    continente=entry.continent.value,
                )
                session.add(channel)
                session.flush()
                created_channels += 1

            if source is not None:
                _ensure_source_compatible(source, channel, entry)
                existing_sources += 1
                continue

            session.add(
                RssSource(
                    canal=channel,
                    nombre=entry.source_name,
                    url_feed=entry.feed_url,
                    categoria_iptc=entry.category.value,
                    idioma=entry.language.value,
                    activa=entry.active,
                )
            )
            created_sources += 1

        session.commit()
    except Exception:
        session.rollback()
        raise

    return SeedResult(
        created_channels=created_channels,
        created_sources=created_sources,
        existing_sources=existing_sources,
    )


def _ensure_channel_compatible(channel: Channel, entry: SourceSeed) -> None:
    if channel.continente != entry.continent.value:
        raise SeedConflictError(
            f"El canal {entry.channel_name!r} existe con un continente incompatible"
        )


def _ensure_source_compatible(
    source: RssSource,
    channel: Channel,
    entry: SourceSeed,
) -> None:
    actual = (
        source.id_canal,
        source.nombre,
        source.categoria_iptc,
        source.idioma,
        source.activa,
    )
    expected = (
        channel.id_canal,
        entry.source_name,
        entry.category.value,
        entry.language.value,
        entry.active,
    )
    if actual != expected:
        raise SeedConflictError(
            f"La fuente {entry.feed_url!r} existe con datos incompatibles"
        )


def main() -> None:
    factory = get_session_factory()
    with factory() as session:
        result = seed_sources(session)
    print(
        "Seed de fuentes RSS completado: "
        f"{result.created_channels} canales creados, "
        f"{result.created_sources} fuentes creadas, "
        f"{result.existing_sources} fuentes existentes."
    )


if __name__ == "__main__":
    main()
