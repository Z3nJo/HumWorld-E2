import os
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from app.config import normalize_database_url
from app.models import Channel, News, NewsTerm, RssSource, Term
from app.repositories import ConfigurationRepository, DashboardRepository
from app.services.dashboards import DashboardService
from app.services.sentiment_configuration import SentimentConfigurationService

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def engine():
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    database_engine = create_engine(normalize_database_url(raw_url), pool_pre_ping=True)
    with database_engine.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
    assert {"noticia", "noticia_termino", "termino", "fuente_rss", "canal"} <= set(
        inspect(database_engine).get_table_names()
    )
    yield database_engine
    database_engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(engine):
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE noticia, termino, fuente_rss, canal, configuracion "
                "RESTART IDENTITY CASCADE"
            )
        )
    yield
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE noticia, termino, fuente_rss, canal, configuracion "
                "RESTART IDENTITY CASCADE"
            )
        )


def _source(
    session: Session,
    slug: str,
    continent: str,
    country: str | None,
) -> RssSource:
    source = RssSource(
        canal=Channel(
            nombre=f"Canal {slug}",
            continente=continent,
            pais=country,
        ),
        nombre=f"Fuente {slug}",
        url_feed=f"https://example.com/{slug}.xml",
        categoria_iptc="society",
        idioma="es",
    )
    session.add(source)
    session.flush()
    return source


def _news(
    session: Session,
    source: RssSource,
    slug: str,
    registered_at: datetime,
    humor: Decimal | None,
) -> News:
    item = News(
        fuente=source,
        guid_origen=slug,
        titulo=f"Noticia {slug}",
        url=f"https://example.com/news/{slug}",
        idioma="es",
        fecha_registro=registered_at,
        valor_humor=humor,
    )
    session.add(item)
    session.flush()
    return item


def _term(
    session: Session,
    word: str,
    *,
    language: str = "es",
    active: bool = True,
) -> Term:
    term = Term(
        palabra=word,
        idioma=language,
        valor=Decimal("1.0"),
        activo=active,
    )
    session.add(term)
    session.flush()
    return term


def _contribution(
    session: Session,
    news: News,
    term: Term,
    *,
    occurrences: int,
    contribution: Decimal,
) -> None:
    session.add(
        NewsTerm(
            id_noticia=news.id_noticia,
            id_termino=term.id_termino,
            ocurrencias=occurrences,
            aporte_humor=contribution,
        )
    )


def test_repository_aggregates_with_utc_boundaries_nulls_and_geography(engine) -> None:
    start = datetime(2026, 9, 1, tzinfo=UTC)
    end = datetime(2026, 9, 3, tzinfo=UTC)
    with Session(engine, expire_on_commit=False) as session:
        chile = _source(session, "cl", "America", "CL")
        no_country = _source(session, "america", "America", None)
        europe = _source(session, "eu", "Europa", "ES")
        _news(session, chile, "at-start", start, Decimal("0.100"))
        _news(session, chile, "at-end-day", end - timedelta(microseconds=1), Decimal("0.300"))
        _news(session, chile, "null", start + timedelta(hours=2), None)
        _news(session, chile, "before", start - timedelta(microseconds=1), Decimal("1.000"))
        _news(session, chile, "after", end, Decimal("1.000"))
        _news(session, no_country, "no-country", start + timedelta(days=1), Decimal("0.500"))
        _news(session, europe, "europe", start + timedelta(days=1), Decimal("-0.500"))
        session.commit()

        repository = DashboardRepository(session)
        grouped = repository.aggregate(
            start_at=start,
            end_at=end,
            continent=None,
            country=None,
        )
        by_continent = {item.continent: item for item in grouped}
        assert by_continent["America"].humor == Decimal("0.30000000000000000000")
        assert by_continent["America"].news_count == 3
        assert by_continent["Europa"].humor == Decimal("-0.50000000000000000000")
        assert by_continent["Europa"].news_count == 1

        america = repository.aggregate(
            start_at=start,
            end_at=end,
            continent="America",
            country=None,
        )
        assert len(america) == 1
        assert america[0].country is None
        assert america[0].news_count == 3

        chile_only = repository.aggregate(
            start_at=start,
            end_at=end,
            continent="America",
            country="CL",
        )
        assert len(chile_only) == 1
        assert chile_only[0].country == "CL"
        assert chile_only[0].humor == Decimal("0.20000000000000000000")
        assert chile_only[0].news_count == 2


def test_service_represents_empty_scope_and_threshold_boundaries(engine) -> None:
    instant = datetime(2026, 9, 1, 12, tzinfo=UTC)
    with Session(engine) as session:
        source = _source(session, "threshold", "Asia", None)
        for index in range(3):
            _news(
                session,
                source,
                f"threshold-{index}",
                instant + timedelta(minutes=index),
                Decimal("0.200"),
            )
        session.commit()
        service = DashboardService(
            DashboardRepository(session),
            SentimentConfigurationService(ConfigurationRepository(session)),
        )

        all_continents = service.get_dashboard(
            date_from=date(2026, 9, 1),
            date_to=date(2026, 9, 1),
        )
        asia = next(item for item in all_continents.aggregates if item.continent == "Asia")
        africa = next(
            item for item in all_continents.aggregates if item.continent == "Africa"
        )
        assert (asia.humor, asia.news_count, asia.sufficient) == (
            Decimal("0.200"),
            3,
            True,
        )
        assert (africa.humor, africa.news_count, africa.sufficient) == (
            None,
            0,
            False,
        )


def test_influential_terms_aggregate_order_filter_and_limit(engine) -> None:
    start = datetime(2026, 9, 1, tzinfo=UTC)
    end = datetime(2026, 9, 3, tzinfo=UTC)
    with Session(engine, expire_on_commit=False) as session:
        source = _source(session, "ranking", "America", "CL")
        first = _news(session, source, "first", start, Decimal("-0.800"))
        second = _news(
            session,
            source,
            "second",
            end - timedelta(microseconds=1),
            Decimal("0.600"),
        )
        null_news = _news(
            session,
            source,
            "null",
            start + timedelta(hours=1),
            None,
        )
        before = _news(
            session,
            source,
            "before",
            start - timedelta(microseconds=1),
            Decimal("1.000"),
        )
        after = _news(session, source, "after", end, Decimal("1.000"))

        crisis = _term(session, "crisis", active=False)
        _contribution(
            session, first, crisis, occurrences=2, contribution=Decimal("-8.00")
        )
        _contribution(
            session, second, crisis, occurrences=3, contribution=Decimal("6.00")
        )

        frequent_tie = _term(session, "frecuente")
        less_frequent_tie = _term(session, "menos-frecuente")
        same_frequency_later_id = _term(session, "mismo-desempate")
        _contribution(
            session,
            first,
            frequent_tie,
            occurrences=4,
            contribution=Decimal("10.00"),
        )
        _contribution(
            session,
            first,
            less_frequent_tie,
            occurrences=3,
            contribution=Decimal("10.00"),
        )
        _contribution(
            session,
            first,
            same_frequency_later_id,
            occurrences=3,
            contribution=Decimal("10.00"),
        )

        filler_ids = []
        for index in range(33):
            filler = _term(session, f"relleno-{index:02d}")
            filler_ids.append(filler.id_termino)
            _contribution(
                session,
                first,
                filler,
                occurrences=1,
                contribution=Decimal(index + 1) / Decimal("100"),
            )

        excluded = _term(session, "excluido")
        _contribution(
            session, null_news, excluded, occurrences=1, contribution=Decimal("99.00")
        )
        _contribution(
            session, before, excluded, occurrences=1, contribution=Decimal("99.00")
        )
        _contribution(
            session, after, excluded, occurrences=1, contribution=Decimal("99.00")
        )

        europe_source = _source(session, "other", "Europa", "ES")
        europe_news = _news(
            session,
            europe_source,
            "europe",
            start + timedelta(hours=2),
            Decimal("1.000"),
        )
        europe_term = _term(session, "europa")
        _contribution(
            session,
            europe_news,
            europe_term,
            occurrences=1,
            contribution=Decimal("9.00"),
        )
        session.commit()

        records = DashboardRepository(session).influential_terms(
            start_at=start,
            end_at=end,
            continent="America",
            country="CL",
        )

        assert len(records) == 32
        assert [item.term_id for item in records[:4]] == [
            crisis.id_termino,
            frequent_tie.id_termino,
            less_frequent_tie.id_termino,
            same_frequency_later_id.id_termino,
        ]
        assert records[0].term == "crisis"
        assert records[0].weight == Decimal("14.00")
        assert records[0].total_contribution == Decimal("-2.00")
        assert records[0].frequency == 5
        assert crisis.activo is False
        assert excluded.id_termino not in {item.term_id for item in records}
        assert filler_ids[0] not in {item.term_id for item in records}

        smaller_set = DashboardRepository(session).influential_terms(
            start_at=start,
            end_at=end,
            continent="Europa",
            country="ES",
        )
        assert len(smaller_set) == 1
        assert smaller_set[0].term_id == europe_term.id_termino
