from collections.abc import Mapping, Sequence
from datetime import UTC, datetime

from app.models import Channel, CountryAlias, News, RssSource
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
        self._pending_rows: list[Mapping[str, object]] = []
        self._next_news_id = 1
        self.geographic_results = []
        self.pending_geographic = []
        self.catalog_version = "test-v1"

    def list_active_sources(self) -> list[RssSource]:
        return [
            source
            for source in self.sources
            if source.activa and source.canal.activo
        ]

    def list_sources_by_ids(self, source_ids: Sequence[int]) -> list[RssSource]:
        return [source for source in self.sources if source.id_fuente in source_ids]

    def insert_news(self, news: Sequence[Mapping[str, object]]) -> list[News]:
        rows = list(news)
        self._pending_rows = rows
        inserted: list[News] = []
        for row in rows:
            key = int(row["id_fuente"]), str(row["guid_origen"])
            if key not in self.seen:
                self.seen.add(key)
                inserted.append(News(id_noticia=self._next_news_id, **row))
                self._next_news_id += 1
        return inserted

    def list_active_terms(self, language: str):
        return []

    def get_parameter(self, key: str):
        return None

    def persist_sentiment(self, news, result, analyzed_at):
        news.valor_humor = result.valor_humor
        news.fecha_analisis = analyzed_at

    def load_geographic_catalog(self, language: str):
        return (
            self.catalog_version,
            [
                CountryAlias(
                    id_alias=1,
                    alias="Chile" if language == "es" else "Chile",
                    alias_normalizado="chile",
                    tipo="pais",
                    idioma=language,
                    codigo_pais="CL",
                    activo=True,
                    version_catalogo=self.catalog_version,
                )
            ],
            ["CL"],
        )

    def persist_geographic_attribution(self, news, result, classified_at, version):
        news.fecha_clasificacion_geografica = classified_at
        news.version_clasificador_geografico = version
        self.geographic_results.append((news.id_noticia, result, classified_at, version))

    def update_source_capture(self, source_id: int, captured_at: datetime) -> None:
        self.persisted.append((source_id, self._pending_rows, captured_at))

    def claim_pending_news(self, limit: int):
        return []

    def claim_pending_geographic_news(self, limit: int, version: str, language: str):
        return [
            item
            for item in self.pending_geographic
            if item.idioma == language
            and (
                item.fecha_clasificacion_geografica is None
                or item.version_clasificador_geografico != version
            )
        ][:limit]

    def commit(self) -> None:
        self._pending_rows = []

    def rollback(self) -> None:
        self._pending_rows = []


def source(
    source_id: int,
    *,
    active: bool = True,
    channel_active: bool = True,
    language: str = "es",
    country: str | None = None,
) -> RssSource:
    return RssSource(
        id_fuente=source_id,
        canal=Channel(
            id_canal=source_id,
            nombre=f"Canal {source_id}",
            continente="America",
            pais=country,
            activo=channel_active,
        ),
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


def test_captures_selected_sources_and_skips_inactive() -> None:
    active = source(1)
    inactive = source(2, active=False)
    inactive_channel = source(3, channel_active=False)
    repository = FakeCaptureRepository([active, inactive, inactive_channel])
    report = NewsCaptureService(
        repository,
        FakeFeedClient({active.url_feed: [entry("one", "https://example.com/one")]}),
        clock=lambda: CAPTURED_AT,
    ).capture_sources([1, 2, 3])
    assert report.inserted == 1
    assert report.skipped_source_ids == (2, 3)
    assert [item.source_id for item in report.sources] == [1]


def test_full_capture_requires_both_source_and_channel_active() -> None:
    eligible = source(1)
    inactive_source = source(2, active=False)
    inactive_channel = source(3, channel_active=False)
    both_inactive = source(4, active=False, channel_active=False)
    repository = FakeCaptureRepository(
        [eligible, inactive_source, inactive_channel, both_inactive]
    )
    client = FakeFeedClient(
        {eligible.url_feed: [entry("one", "https://example.com/one")]}
    )

    report = NewsCaptureService(repository, client).capture_active_sources()

    assert [item.source_id for item in report.sources] == [eligible.id_fuente]
    assert client.requested == [eligible.url_feed]


def test_rejects_unknown_selected_source() -> None:
    from app.services.capture import CaptureSourceNotFoundError

    try:
        NewsCaptureService(FakeCaptureRepository([]), FakeFeedClient({})).capture_sources([99])
    except CaptureSourceNotFoundError as error:
        assert "99" in str(error)
    else:
        raise AssertionError("Expected CaptureSourceNotFoundError")


def test_capture_attributes_mentions_before_source_fallback() -> None:
    active = source(1, country="CL")
    repository = FakeCaptureRepository([active])
    report = NewsCaptureService(
        repository,
        FakeFeedClient(
            {active.url_feed: [entry("one", "https://example.com/one", title="Chile avanza")]}
        ),
        clock=lambda: CAPTURED_AT,
    ).capture_active_sources()
    result = repository.geographic_results[0][1]
    assert report.inserted == 1
    assert [(item.codigo_pais, item.origen, item.campo) for item in result.countries] == [
        ("CL", "mencion", "titulo")
    ]


def test_pending_geography_does_not_recalculate_existing_sentiment() -> None:
    active = source(1, country="CL")
    repository = FakeCaptureRepository([active])
    news = News(
        id_noticia=9,
        id_fuente=1,
        fuente=active,
        guid_origen="old",
        titulo="Sin mención",
        descripcion=None,
        url="https://example.com/old",
        idioma="es",
        valor_humor="0.500",
        fecha_analisis=CAPTURED_AT,
    )
    repository.pending_geographic = [news]
    processed = NewsCaptureService(
        repository, FakeFeedClient({}), clock=lambda: CAPTURED_AT
    ).process_pending_geographic_news(language="es")
    assert processed == 1
    assert str(news.valor_humor) == "0.500"
    assert news.fecha_analisis == CAPTURED_AT
    assert repository.geographic_results[0][1].countries[0].origen == "fuente"


def test_geographic_backfill_is_idempotent_and_reclassifies_new_version() -> None:
    active = source(1, country="CL")
    repository = FakeCaptureRepository([active])
    news = News(
        id_noticia=10,
        id_fuente=1,
        fuente=active,
        guid_origen="old-v",
        titulo="Sin mención",
        descripcion=None,
        url="https://example.com/old-v",
        idioma="es",
    )
    repository.pending_geographic = [news]
    first_service = NewsCaptureService(repository, FakeFeedClient({}), clock=lambda: CAPTURED_AT)
    assert first_service.process_pending_geographic_news(language="es") == 1
    assert first_service.process_pending_geographic_news(language="es") == 0
    repository.catalog_version = "test-v2"
    second_service = NewsCaptureService(repository, FakeFeedClient({}), clock=lambda: CAPTURED_AT)
    assert second_service.process_pending_geographic_news(language="es") == 1
    assert news.version_clasificador_geografico == "test-v2"


def test_geographic_failure_rolls_back_one_source_and_continues() -> None:
    class FailingGeographyRepository(FakeCaptureRepository):
        def persist_geographic_attribution(self, news, result, classified_at, version):
            if news.id_fuente == 1:
                raise RuntimeError("fallo geográfico")
            super().persist_geographic_attribution(news, result, classified_at, version)

    failed = source(1, country="CL")
    healthy = source(2, language="en", country="CL")
    repository = FailingGeographyRepository([failed, healthy])
    client = FakeFeedClient(
        {
            failed.url_feed: [entry("failed", "https://example.com/failed")],
            healthy.url_feed: [entry("healthy", "https://example.com/healthy")],
        }
    )
    report = NewsCaptureService(repository, client, clock=lambda: CAPTURED_AT).capture_active_sources()
    assert report.failed_sources == 1
    assert report.sources[0].error == "fallo geográfico"
    assert report.sources[1].inserted == 1
    assert [item[0] for item in repository.persisted] == [2]
