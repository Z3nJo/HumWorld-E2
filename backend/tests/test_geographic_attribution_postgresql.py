import os
from copy import deepcopy
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.config import normalize_database_url
from app.models import Channel, CountryAlias, News, NewsCountry, RssSource
from app.repositories import ChannelRepository, DashboardRepository, NewsCaptureRepository
from app.seeds.geography import seed_geography
from app.services.capture import FeedEntry, NewsCaptureService

pytestmark = pytest.mark.integration

NOW = datetime(2026, 10, 27, 12, tzinfo=UTC)
CATALOG = {
    "version": "pg-v1",
    "countries": [
        {"codigo_iso2": "AR", "nombre_es": "Argentina", "nombre_en": "Argentina", "continente": "America"},
        {"codigo_iso2": "CL", "nombre_es": "Chile", "nombre_en": "Chile", "continente": "America"},
        {"codigo_iso2": "ES", "nombre_es": "España", "nombre_en": "Spain", "continente": "Europa"},
        {"codigo_iso2": "UA", "nombre_es": "Ucrania", "nombre_en": "Ukraine", "continente": "Europa"},
    ],
    "aliases": [
        {"alias": "Argentina", "alias_normalizado": "argentina", "tipo": "pais", "idioma": "es", "codigo_pais": "AR"},
        {"alias": "Chile", "alias_normalizado": "chile", "tipo": "pais", "idioma": "es", "codigo_pais": "CL"},
        {"alias": "España", "alias_normalizado": "espana", "tipo": "pais", "idioma": "es", "codigo_pais": "ES"},
        {"alias": "Ucrania", "alias_normalizado": "ucrania", "tipo": "pais", "idioma": "es", "codigo_pais": "UA"},
        {"alias": "Argentina", "alias_normalizado": "argentina", "tipo": "pais", "idioma": "en", "codigo_pais": "AR"},
        {"alias": "Chile", "alias_normalizado": "chile", "tipo": "pais", "idioma": "en", "codigo_pais": "CL"},
        {"alias": "Spain", "alias_normalizado": "spain", "tipo": "pais", "idioma": "en", "codigo_pais": "ES"},
        {"alias": "Ukraine", "alias_normalizado": "ukraine", "tipo": "pais", "idioma": "en", "codigo_pais": "UA"},
    ],
}


@pytest.fixture(scope="module")
def engine():
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    value = create_engine(normalize_database_url(raw_url), pool_pre_ping=True)
    with value.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
    yield value
    value.dispose()


@pytest.fixture(autouse=True)
def clean_database(engine):
    statement = text(
        "TRUNCATE noticia, termino, fuente_rss, canal, configuracion, "
        "pais_alias, pais RESTART IDENTITY CASCADE"
    )
    with engine.begin() as connection:
        connection.execute(statement)
    yield
    with engine.begin() as connection:
        connection.execute(statement)


def test_seed_clean_repeat_and_version_update_on_postgresql(engine) -> None:
    with Session(engine) as session:
        first = seed_geography(session, CATALOG)
        second = seed_geography(session, CATALOG)
        v2 = deepcopy(CATALOG)
        v2["version"] = "pg-v2"
        v2["aliases"] = [
            item for item in v2["aliases"] if item["alias_normalizado"] != "argentina"
        ]
        third = seed_geography(session, v2)
        retired = list(
            session.scalars(
                select(CountryAlias).where(CountryAlias.alias_normalizado == "argentina")
            )
        )
        assert (first.aliases_created, second.aliases_created) == (8, 0)
        assert third.aliases_deactivated == 2
        assert retired and all(not item.activo for item in retired)


def _source(session: Session, name: str, continent: str, country: str | None) -> RssSource:
    item = RssSource(
        canal=Channel(nombre=f"Canal {name}", continente=continent, pais=country),
        nombre=f"Fuente {name}",
        url_feed=f"https://example.com/{name}.xml",
        categoria_iptc="society",
        idioma="es",
    )
    session.add(item)
    session.flush()
    return item


def _pending_news(session: Session, source: RssSource, slug: str) -> News:
    item = News(
        fuente=source,
        guid_origen=slug,
        titulo="Ucrania informa",
        url=f"https://example.com/{slug}",
        idioma="es",
        valor_humor=Decimal("0.400"),
        fecha_analisis=NOW,
    )
    session.add(item)
    session.flush()
    return item


def test_pending_claims_skip_locked_and_replacement_is_atomic(engine) -> None:
    with Session(engine) as setup:
        seed_geography(setup, CATALOG)
        source = _source(setup, "locks", "America", "AR")
        first = _pending_news(setup, source, "first")
        second = _pending_news(setup, source, "second")
        setup.add(NewsCountry(id_noticia=first.id_noticia, codigo_pais="AR", origen="fuente"))
        setup.commit()
        first_id, second_id = first.id_noticia, second.id_noticia

    with Session(engine) as one, Session(engine) as two:
        claimed_one = NewsCaptureRepository(one).claim_pending_geographic_news(1, "pg-v1", "es")
        claimed_two = NewsCaptureRepository(two).claim_pending_geographic_news(1, "pg-v1", "es")
        assert [item.id_noticia for item in claimed_one] == [first_id]
        assert [item.id_noticia for item in claimed_two] == [second_id]
        one.rollback()
        two.rollback()

    alias_id = None
    with Session(engine) as session:
        alias_id = session.scalar(
            select(CountryAlias.id_alias).where(
                CountryAlias.idioma == "es", CountryAlias.alias_normalizado == "chile"
            )
        )
        news = session.get(News, first_id)
        assert news is not None and alias_id is not None
        from app.services.geographic_attribution import CountryAttribution, GeographicAttributionResult

        NewsCaptureRepository(session).persist_geographic_attribution(
            news,
            GeographicAttributionResult(
                (CountryAttribution("CL", "mencion", alias_id, "titulo"),)
            ),
            NOW,
            "pg-v1",
        )
        session.flush()
        session.rollback()
    with Session(engine) as verification:
        rows = list(
            verification.scalars(
                select(NewsCountry).where(NewsCountry.id_noticia == first_id)
            )
        )
        assert [(item.codigo_pais, item.origen) for item in rows] == [("AR", "fuente")]


class ControlledFeed:
    def fetch(self, url: str) -> list[FeedEntry]:
        title = "Chile firma acuerdo" if "spain" in url else "Mercados avanzan"
        return [FeedEntry(url, title, None, f"{url}/article", NOW)]


def test_vertical_capture_backfill_channel_correction_and_dashboard(engine) -> None:
    with Session(engine, expire_on_commit=False) as session:
        seed_geography(session, CATALOG)
        spain = _source(session, "spain", "Europa", "ES")
        argentina = _source(session, "argentina", "America", "AR")
        session.commit()
        service = NewsCaptureService(
            NewsCaptureRepository(session), ControlledFeed(), clock=lambda: NOW
        )
        report = service.capture_active_sources()
        assert report.inserted == 2 and report.failed_sources == 0
        captured = list(session.scalars(select(News).order_by(News.id_noticia)))
        for item in captured:
            item.valor_humor = Decimal("0.500")
            item.fecha_analisis = NOW
        historical_source = _source(session, "historical", "America", "CL")
        historical = _pending_news(session, historical_source, "historical")
        session.commit()

        assert service.process_pending_geographic_news(language="es", version="pg-v1") == 1
        assert historical.valor_humor == Decimal("0.400")
        assert historical.fecha_analisis == NOW

        argentina_channel = session.get(Channel, argentina.id_canal)
        assert argentina_channel is not None
        ChannelRepository(session).update_channel(argentina_channel, {"pais": "CL"})
        session.expire_all()
        associations = {
            item.id_noticia: (item.codigo_pais, item.origen)
            for item in session.scalars(select(NewsCountry))
        }
        spain_news = next(item for item in captured if item.id_fuente == spain.id_fuente)
        argentina_news = next(item for item in captured if item.id_fuente == argentina.id_fuente)
        assert associations[spain_news.id_noticia] == ("CL", "mencion")
        assert associations[argentina_news.id_noticia] == ("CL", "fuente")
        assert associations[historical.id_noticia] == ("UA", "mencion")

        america = DashboardRepository(session).aggregate(
            start_at=datetime(2026, 10, 27, tzinfo=UTC),
            end_at=datetime(2026, 10, 28, tzinfo=UTC),
            continent="America",
            country="CL",
        )
        assert america[0].news_count == 2
        influential = DashboardRepository(session).influential_news(
            start_at=datetime(2026, 10, 27, tzinfo=UTC),
            end_at=datetime(2026, 10, 28, tzinfo=UTC),
            continent="America",
            country="CL",
        )
        assert {item.id_noticia for item in influential} == {
            spain_news.id_noticia,
            argentina_news.id_noticia,
        }
        assert next(item for item in influential if item.id_noticia == spain_news.id_noticia).pais == "ES"

    with Session(engine) as restarted_session:
        assert restarted_session.scalar(select(NewsCountry).where(NewsCountry.id_noticia == historical.id_noticia)) is not None


def test_country_lookup_plan_uses_geographic_index(engine) -> None:
    with Session(engine) as session:
        seed_geography(session, CATALOG)
        source = _source(session, "plan", "America", "CL")
        session.commit()
        with engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO noticia (id_fuente, guid_origen, titulo, url, idioma, fecha_registro, valor_humor, fecha_clasificacion_geografica, version_clasificador_geografico) "
                    "SELECT :source, 'plan-' || value, 'Chile', 'https://example.com/plan/' || value, 'es', :now, 0.1, :now, 'pg-v1' FROM generate_series(1, 5000) value"
                ),
                {"source": source.id_fuente, "now": NOW},
            )
            connection.execute(
                text(
                    "INSERT INTO noticia_pais (id_noticia, codigo_pais, origen) "
                    "SELECT id_noticia, 'CL', 'fuente' FROM noticia WHERE id_fuente = :source"
                ),
                {"source": source.id_fuente},
            )
            plan = connection.scalar(
                text(
                    "EXPLAIN (ANALYZE, FORMAT JSON) SELECT id_noticia FROM noticia_pais "
                    "WHERE codigo_pais = 'CL' AND id_noticia > 4900"
                )
            )
            legacy_plan = connection.scalar(
                text(
                    "EXPLAIN (ANALYZE, FORMAT JSON) SELECT n.id_noticia FROM noticia n "
                    "JOIN fuente_rss f ON f.id_fuente = n.id_fuente "
                    "JOIN canal c ON c.id_canal = f.id_canal "
                    "WHERE c.pais = 'CL' AND n.id_noticia > 4900"
                )
            )

        def index_names(node):
            names = []
            if node.get("Index Name"):
                names.append(node["Index Name"])
            for child in node.get("Plans", []):
                names.extend(index_names(child))
            return names

        root = plan[0]["Plan"]
        used_indexes = index_names(root)
        print(
            f"geographic_plan indexes={used_indexes} "
            f"execution_ms={plan[0]['Execution Time']:.3f} "
            f"legacy_execution_ms={legacy_plan[0]['Execution Time']:.3f}"
        )
        assert "ix_noticia_pais_codigo_noticia" in used_indexes
        assert plan[0]["Execution Time"] < 100
        assert plan[0]["Execution Time"] <= legacy_plan[0]["Execution Time"] * 5 + 1
