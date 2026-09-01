from datetime import UTC

import httpx
import pytest

from app.services.capture import FeedReadError, HttpxFeedparserClient


RSS_DOCUMENT = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Noticias de prueba</title>
    <link>https://example.com</link>
    <description>Feed controlado</description>
    <item>
      <guid>news-1</guid>
      <title>Primera noticia</title>
      <link>https://example.com/news-1</link>
      <description>Resumen</description>
      <pubDate>Tue, 01 Sep 2026 10:30:00 GMT</pubDate>
    </item>
    <item>
      <title>Segunda noticia</title>
      <link>https://example.com/news-2</link>
    </item>
  </channel>
</rss>
"""


def client_for(response: httpx.Response) -> HttpxFeedparserClient:
    def handler(request: httpx.Request) -> httpx.Response:
        return response

    return HttpxFeedparserClient(
        httpx.Client(transport=httpx.MockTransport(handler))
    )


def test_downloads_and_parses_controlled_rss() -> None:
    entries = client_for(httpx.Response(200, content=RSS_DOCUMENT)).fetch(
        "https://example.com/feed.xml"
    )
    assert len(entries) == 2
    assert entries[0].guid == "news-1"
    assert entries[0].description == "Resumen"
    assert entries[0].published_at is not None
    assert entries[0].published_at.tzinfo == UTC
    assert entries[1].guid is None
    assert entries[1].published_at is None


def test_translates_http_error_without_real_network() -> None:
    with pytest.raises(FeedReadError, match="descargar"):
        client_for(httpx.Response(503)).fetch("https://example.com/feed.xml")


def test_rejects_unusable_feed_without_real_network() -> None:
    with pytest.raises(FeedReadError, match="RSS utilizable"):
        client_for(httpx.Response(200, content=b"<not-rss>")).fetch(
            "https://example.com/feed.xml"
        )
