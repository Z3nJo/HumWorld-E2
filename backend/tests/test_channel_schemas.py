from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.api.schemas import (
    ChannelCreate,
    ChannelPatch,
    ChannelReplace,
    SourceResponse,
    SourceBatchCreate,
)
from app.models import Channel, RssSource


def test_channel_create_normalizes_country_and_applies_defaults() -> None:
    minimal = ChannelCreate(nombre="Medio", continente="America")
    complete = ChannelCreate(
        nombre="Medio completo",
        continente="Europa",
        pais=" cl ",
        url_sitio="https://example.com",
        activo=False,
    )

    assert minimal.pais is None
    assert minimal.url_sitio is None
    assert minimal.activo is True
    assert complete.pais == "CL"
    assert str(complete.url_sitio) == "https://example.com/"
    assert complete.activo is False


@pytest.mark.parametrize("country", ["C", "CHL", "12", "ÑL", "C-"])
def test_channel_schemas_reject_invalid_country(country: str) -> None:
    with pytest.raises(ValidationError, match="dos letras ASCII"):
        ChannelCreate(nombre="Medio", continente="America", pais=country)


@pytest.mark.parametrize(
    "site_url",
    ["ftp://example.com", "example.com", "mailto:news@example.com", "x" * 501],
)
def test_channel_schemas_reject_invalid_site_url(site_url: str) -> None:
    with pytest.raises(ValidationError, match="HTTP o HTTPS"):
        ChannelCreate(
            nombre="Medio",
            continente="America",
            url_sitio=site_url,
        )


def test_channel_replace_requires_every_editable_field() -> None:
    with pytest.raises(ValidationError):
        ChannelReplace(nombre="Medio", continente="America", activo=True)


def test_channel_patch_distinguishes_absent_and_null_fields() -> None:
    assert ChannelPatch(pais=None).model_dump(exclude_unset=True) == {"pais": None}
    assert ChannelPatch(url_sitio=None).model_dump(exclude_unset=True) == {
        "url_sitio": None
    }
    with pytest.raises(ValidationError, match="al menos"):
        ChannelPatch()
    for field in ("nombre", "continente", "activo"):
        with pytest.raises(ValidationError, match="no aceptan null"):
            ChannelPatch.model_validate({field: None})


@pytest.mark.parametrize("field", ["fecha_alta", "fecha_ultima_captura"])
def test_source_writes_reject_server_managed_dates(field: str) -> None:
    payload = {
        "channel": {"nombre": "Medio", "continente": "America"},
        "sources": [
            {
                "nombre": "Portada",
                "url_feed": "https://example.com/rss.xml",
                "categoria_iptc": "politics",
                "idioma": "es",
                field: "2026-10-10T12:00:00Z",
            }
        ],
    }
    with pytest.raises(ValidationError, match="Extra inputs"):
        SourceBatchCreate.model_validate(payload)


def test_source_response_serializes_complete_channel_and_read_only_dates() -> None:
    created_at = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)
    captured_at = datetime(2026, 10, 10, 13, 0, tzinfo=UTC)
    channel = Channel(
        id_canal=1,
        nombre="Medio",
        continente="America",
        pais="CL",
        url_sitio="https://example.com",
        activo=True,
        fecha_alta=created_at,
    )
    source = RssSource(
        id_fuente=1,
        id_canal=1,
        canal=channel,
        nombre="Portada",
        url_feed="https://example.com/rss.xml",
        categoria_iptc="politics",
        idioma="es",
        activa=True,
        fecha_alta=created_at,
        fecha_ultima_captura=captured_at,
    )

    response = SourceResponse.model_validate(source)

    assert response.fecha_alta == created_at
    assert response.fecha_ultima_captura == captured_at
    assert response.canal.pais == "CL"
    assert response.canal.fecha_alta == created_at
