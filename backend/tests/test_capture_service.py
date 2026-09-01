from collections.abc import Mapping, Sequence
from datetime import UTC, datetime

from app.models import RssSource
from app.services.capture import FeedEntry, NewsCaptureService


CAPTURED_AT = datetime(2026, 9, 1, 12, 0, tzinfo=UTC)


class FakeFeedClient:
    def __init__(self, feeds: dict[str, list[FeedEntry] | Exception]) -> None:
        self.feeds = feeds
        self.requested: list[str] = []

    def fetch(self, url: str) -> list[FeedEntry]:
        self.requested.append(url)
        value = self.feeds[url]
        if isinstance(value, Exception):
            raise value
        return value


class FakeCaptureRepository:
    def __init__(self, sources: list[RssSource]) -> None:
        self.sources = sources
        self.seen: set[tuple[int, str]] = set()
        self.persisted: list[tuple[int, list[Mapping[str, object]], datetime]] = []

    def list_active_sources(self) -> list[RssSource]:
        return [source for source in self.sources if source.activa]

    def persist_source_capture(
        self,
        source_id: int,
        news: Sequence[Mapping[str, object]],
        captured_at: datetime,
    ) -> int:
        rows = list(news)
        self.persisted.append((source_id, rows, captured_at))
        inserted = 0
        for row in rows:
            key = source_id, str(row["guid_origen"])
            if key not in self.seen:
                self.seen.add(key)
                inserted += 1
        return inserted


def source(source_id: int, *, active: bool = True, language: str = "es") -> RssSource:
    return RssSource(
        id_fuente=source_id,
        id_canal=1,
        nombre=f"Fuente {source_id}",
        url_feed=f"https://example.com/{source_id}.xml",
        categoria_iptc="politics",
        idioma=language,
        activa=active,
    )


def entry(
    guid: str | None,
    link: str | None,
    *,
    title: str | None = "Titular",
    published_at: datetime | None = None,
) -> FeedEntry:
    return FeedEntry(guid, title, "Descripcion", link, published_at)


def test_captures_active_sources_normalizes_and_skips_invalid_entries() -> None:
    active = source(1, language="en")
    inactive = source(2, active=False)
    repository = FakeCaptureRepository([active, inactive])
    client = FakeFeedClient(
        {
            active.url_feed: [
                entry("guid-1", "https://example.com/one", published_at=datetime(2026, 9, 1)),
                entry(None, "https://example.com/two"),
                entry("missing-link", None),
                entry("missing-title", "https://example.com/three", title=None),
            ],
            inactive.url_feed: [entry("ignored", "https://example.com/ignored")],
        }
    )
    service = NewsCaptureService(repository, client, clock=lambda: CAPTURED_AT)

    first = service.capture_active_sources()
    second = service.capture_active_sources()

    assert client.requested == [active.url_feed, active.url_feed]
    assert first.sources[0].inserted == 2
    assert first.sources[0].invalid == 2
    assert second.sources[0].inserted == 0
    assert second.sources[0].duplicates == 2
    rows = repository.persisted[0][1]
    assert rows[0]["idioma"] == "en"
    assert rows[0]["valor_humor"] is None
    assert rows[0]["fecha_analisis"] is None
    assert rows[0]["fecha_publicacion"].tzinfo == UTC
    assert rows[1]["guid_origen"] == "https://example.com/two"
    assert repository.persisted[0][2] == CAPTURED_AT


def test_isolates_failed_source_and_continues_with_next_one() -> None:
    failed = source(1)
    healthy = source(2)
    repository = FakeCaptureRepository([failed, healthy])
    client = FakeFeedClient(
        {
            failed.url_feed: RuntimeError("feed caido"),
            healthy.url_feed: [entry("ok", "https://example.com/ok")],
        }
    )

    report = NewsCaptureService(
        repository,
        client,
        clock=lambda: CAPTURED_AT,
    ).capture_active_sources()

    assert report.failed_sources == 1
    assert report.inserted == 1
    assert report.sources[0].error == "feed caido"
    assert report.sources[1].succeeded
    assert [item[0] for item in repository.persisted] == [healthy.id_fuente]


def test_empty_successful_feed_still_records_capture() -> None:
    active = source(1)
    repository = FakeCaptureRepository([active])
    report = NewsCaptureService(
        repository,
        FakeFeedClient({active.url_feed: []}),
        clock=lambda: CAPTURED_AT,
    ).capture_active_sources()
    assert report.sources[0].succeeded
    assert repository.persisted == [(active.id_fuente, [], CAPTURED_AT)]


def test_rejects_values_that_exceed_mod_01_lengths() -> None:
    active = source(1)
    repository = FakeCaptureRepository([active])
    report = NewsCaptureService(
        repository,
        FakeFeedClient(
            {active.url_feed: [entry("x" * 501, "https://example.com/too-long")]}
        ),
    ).capture_active_sources()
    assert report.sources[0].invalid == 1
    assert repository.persisted[0][1] == []
