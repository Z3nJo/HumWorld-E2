import calendar
import logging
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from time import struct_time
from typing import Any, Protocol

import feedparser
import httpx

from app.models import RssSource

logger = logging.getLogger(__name__)
MAX_NEWS_TEXT_LENGTH = 500
DEFAULT_FEED_TIMEOUT_SECONDS = 10.0


class FeedReadError(Exception):
    pass


class CaptureSourceNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class FeedEntry:
    guid: str | None
    title: str | None
    description: str | None
    link: str | None
    published_at: datetime | None


@dataclass(frozen=True)
class SourceCaptureReport:
    source_id: int
    inserted: int = 0
    duplicates: int = 0
    invalid: int = 0
    error: str | None = None

    @property
    def succeeded(self) -> bool:
        return self.error is None


@dataclass(frozen=True)
class CaptureRunReport:
    sources: tuple[SourceCaptureReport, ...]
    skipped_source_ids: tuple[int, ...] = ()

    @property
    def inserted(self) -> int:
        return sum(item.inserted for item in self.sources)

    @property
    def failed_sources(self) -> int:
        return sum(not item.succeeded for item in self.sources)


class FeedClientProtocol(Protocol):
    def fetch(self, url: str) -> list[FeedEntry]: ...


class CaptureRepositoryProtocol(Protocol):
    def list_active_sources(self) -> list[RssSource]: ...

    def list_sources_by_ids(self, source_ids: Sequence[int]) -> list[RssSource]: ...

    def persist_source_capture(
        self,
        source_id: int,
        news: Sequence[Mapping[str, object]],
        captured_at: datetime,
    ) -> int: ...


class HttpxFeedparserClient:
    def __init__(
        self,
        client: httpx.Client | None = None,
        *,
        timeout_seconds: float = DEFAULT_FEED_TIMEOUT_SECONDS,
    ) -> None:
        self._client = client
        self._timeout_seconds = timeout_seconds

    def fetch(self, url: str) -> list[FeedEntry]:
        try:
            if self._client is not None:
                response = self._client.get(url, timeout=self._timeout_seconds)
            else:
                with httpx.Client(follow_redirects=True) as client:
                    response = client.get(url, timeout=self._timeout_seconds)
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise FeedReadError(f"No fue posible descargar el feed: {url}") from error

        parsed = feedparser.parse(response.content)
        if parsed.bozo and not parsed.entries:
            raise FeedReadError(f"El contenido no es un feed RSS utilizable: {url}")
        return [self._to_entry(item) for item in parsed.entries]

    @classmethod
    def _to_entry(cls, item: Any) -> FeedEntry:
        return FeedEntry(
            guid=cls._optional_text(item.get("id") or item.get("guid")),
            title=cls._optional_text(item.get("title")),
            description=cls._optional_text(
                item.get("summary") or item.get("description")
            ),
            link=cls._optional_text(item.get("link")),
            published_at=cls._published_at(item),
        )

    @staticmethod
    def _optional_text(value: object) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @staticmethod
    def _published_at(item: Any) -> datetime | None:
        parsed_time: struct_time | None = item.get("published_parsed") or item.get(
            "updated_parsed"
        )
        if parsed_time is None:
            return None
        return datetime.fromtimestamp(calendar.timegm(parsed_time), tz=UTC)


class NewsCaptureService:
    def __init__(
        self,
        repository: CaptureRepositoryProtocol,
        feed_client: FeedClientProtocol,
        *,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._repository = repository
        self._feed_client = feed_client
        self._clock = clock or (lambda: datetime.now(UTC))

    def capture_active_sources(self) -> CaptureRunReport:
        return self.capture_sources()

    def capture_sources(self, source_ids: Sequence[int] | None = None) -> CaptureRunReport:
        skipped: tuple[int, ...] = ()
        if source_ids is None:
            sources = self._repository.list_active_sources()
        else:
            requested = list(dict.fromkeys(source_ids))
            selected = self._repository.list_sources_by_ids(requested)
            found_ids = {source.id_fuente for source in selected}
            missing = sorted(set(requested) - found_ids)
            if missing:
                raise CaptureSourceNotFoundError(
                    f"Fuentes RSS no encontradas: {', '.join(map(str, missing))}"
                )
            skipped = tuple(source.id_fuente for source in selected if not source.activa)
            sources = [source for source in selected if source.activa]
        reports = [self._capture_source(source) for source in sources]
        return CaptureRunReport(tuple(reports), skipped_source_ids=skipped)

    def _capture_source(self, source: RssSource) -> SourceCaptureReport:
        try:
            entries = self._feed_client.fetch(source.url_feed)
            normalized: list[Mapping[str, object]] = []
            invalid = 0
            for entry in entries:
                news = self._normalize_entry(source, entry)
                if news is None:
                    invalid += 1
                else:
                    normalized.append(news)
            captured_at = self._clock()
            inserted = self._repository.persist_source_capture(
                source.id_fuente,
                normalized,
                captured_at,
            )
            return SourceCaptureReport(
                source_id=source.id_fuente,
                inserted=inserted,
                duplicates=len(normalized) - inserted,
                invalid=invalid,
            )
        except Exception as error:
            logger.warning(
                "RSS capture failed for source %s (%s): %s",
                source.id_fuente,
                source.url_feed,
                error,
            )
            return SourceCaptureReport(source_id=source.id_fuente, error=str(error))

    @staticmethod
    def _normalize_entry(
        source: RssSource,
        entry: FeedEntry,
    ) -> Mapping[str, object] | None:
        link = (entry.link or "").strip()
        title = (entry.title or "").strip()
        guid = (entry.guid or "").strip() or link
        if not link or not title or not guid:
            return None
        if any(len(value) > MAX_NEWS_TEXT_LENGTH for value in (link, title, guid)):
            return None
        published_at = entry.published_at
        if published_at is not None and published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=UTC)
        return {
            "id_fuente": source.id_fuente,
            "guid_origen": guid,
            "titulo": title,
            "descripcion": entry.description,
            "url": link,
            "idioma": source.idioma,
            "fecha_publicacion": published_at,
            "valor_humor": None,
            "fecha_analisis": None,
        }
