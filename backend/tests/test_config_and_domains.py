import pytest
from pydantic import ValidationError

from app.config import Settings, normalize_database_url
from app.models import News
from app.models.domains import Continent, IptcCategory, Language


def test_normalizes_generic_postgresql_url_for_psycopg3() -> None:
    assert normalize_database_url(
        "postgresql://user:pass@localhost/database"
    ) == "postgresql+psycopg://user:pass@localhost/database"


def test_preserves_explicit_psycopg_url() -> None:
    explicit = "postgresql+psycopg://user:pass@localhost/database"
    assert normalize_database_url(explicit) == explicit


def test_settings_exposes_normalized_sqlalchemy_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("CAPTURE_SCHEDULER_ENABLED", raising=False)
    settings = Settings(
        database_url="postgresql://user:pass@localhost/database",
        _env_file=None,
    )
    assert settings.sqlalchemy_database_url.startswith("postgresql+psycopg://")
    assert settings.capture_scheduler_enabled is True


def test_settings_can_disable_capture_scheduler() -> None:
    settings = Settings(
        database_url="postgresql://user:pass@localhost/database",
        capture_scheduler_enabled=False,
        _env_file=None,
    )
    assert settings.capture_scheduler_enabled is False


def test_missing_database_url_fails_clearly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError, match="database_url"):
        Settings(_env_file=None)


def test_domains_match_mod_01() -> None:
    assert {item.value for item in Continent} == {
        "Africa",
        "America",
        "Antartida",
        "Asia",
        "Europa",
        "Oceania",
    }
    assert {item.value for item in Language} == {"es", "en"}
    assert len(IptcCategory) == 17
    assert IptcCategory.ARTS_CULTURE_ENTERTAINMENT_MEDIA.value == (
        "arts/culture/entertainment/media"
    )
    assert IptcCategory.WEATHER.value == "weather"


def test_news_model_matches_mod_01_constraints() -> None:
    table = News.__table__
    assert set(table.columns.keys()) == {
        "id_noticia",
        "id_fuente",
        "guid_origen",
        "titulo",
        "descripcion",
        "url",
        "idioma",
        "fecha_publicacion",
        "fecha_registro",
        "valor_humor",
        "fecha_analisis",
    }
    assert table.c.fecha_registro.nullable is False
    assert table.c.valor_humor.nullable is True
    assert table.c.fecha_analisis.nullable is True
    source_fk = next(iter(table.c.id_fuente.foreign_keys))
    assert source_fk.ondelete == "CASCADE"
    assert any(
        constraint.name == "uq_noticia_fuente_guid"
        for constraint in table.constraints
    )
