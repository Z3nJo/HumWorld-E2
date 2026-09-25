import logging
import os
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.config import normalize_database_url
from app.database import get_db
from app.main import app
from app.models import Channel, Configuration, News, NewsTerm, RssSource, Term
from app.repositories import ConfigurationRepository, NewsCaptureRepository
from app.seeds.sentiment import (
    SENTIMENT_LEXICON,
    seed_sentiment_configuration,
    seed_sentiment_terms,
)
from app.services.capture import FeedEntry, NewsCaptureService
from app.services.sentiment_configuration import (
    SENTIMENT_SETTINGS,
    SentimentConfigurationService,
    warn_if_scale_differs_from_dictionary,
)

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def engine():
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")
    database_engine = create_engine(normalize_database_url(raw_url), pool_pre_ping=True)
    with database_engine.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
    assert "noticia_termino" in inspect(database_engine).get_table_names()
    yield database_engine
    database_engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(engine):
    with engine.begin() as connection:
        connection.execute(
            text("TRUNCATE noticia, termino, fuente_rss, canal RESTART IDENTITY CASCADE")
        )
    yield
    with engine.begin() as connection:
        connection.execute(
            text("TRUNCATE noticia, termino, fuente_rss, canal RESTART IDENTITY CASCADE")
        )


def _news(
    session: Session,
    guid: str,
    *,
    analyzed: bool = False,
    language: str = "es",
    title: str = "Acuerdo",
) -> News:
    channel = Channel(nombre=f"Canal {guid}", continente="America")
    source = RssSource(
        canal=channel,
        nombre=f"Feed {guid}",
        url_feed=f"https://example.com/{guid}.xml",
        categoria_iptc="society",
        idioma=language,
    )
    news = News(
        fuente=source,
        guid_origen=guid,
        titulo=title,
        url=f"https://example.com/{guid}",
        idioma=language,
        valor_humor=Decimal("0.500") if analyzed else None,
        fecha_analisis=datetime.now(UTC) if analyzed else None,
    )
    session.add(news)
    session.flush()
    return news


def test_news_term_cascades_with_news_but_preserves_inactive_term(engine) -> None:
    with Session(engine) as session:
        news = _news(session, "one", analyzed=True)
        term = Term(palabra="acuerdo", idioma="es", valor=Decimal("5"), activo=False)
        session.add(term)
        session.flush()
        session.add(
            NewsTerm(
                id_noticia=news.id_noticia,
                id_termino=term.id_termino,
                ocurrencias=2,
                aporte_humor=Decimal("10.00"),
            )
        )
        session.commit()

        session.delete(news)
        session.commit()
        assert session.scalar(select(NewsTerm)) is None
        assert session.get(Term, term.id_termino) is not None


def test_occurrences_must_be_positive(engine) -> None:
    with Session(engine) as session:
        news = _news(session, "two")
        term = Term(palabra="acuerdo", idioma="es", valor=Decimal("5"))
        session.add(term)
        session.flush()
        session.add(
            NewsTerm(
                id_noticia=news.id_noticia,
                id_termino=term.id_termino,
                ocurrencias=0,
                aporte_humor=Decimal("0"),
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()


def test_pending_selector_uses_analysis_date_and_humor_precision(engine) -> None:
    with Session(engine) as session:
        pending = _news(session, "pending")
        _news(session, "analyzed", analyzed=True)
        session.commit()
        selected = list(
            session.scalars(select(News).where(News.fecha_analisis.is_(None))).all()
        )
        assert [item.id_noticia for item in selected] == [pending.id_noticia]

    inspector = inspect(engine)
    humor_column = next(
        column for column in inspector.get_columns("noticia")
        if column["name"] == "valor_humor"
    )
    assert humor_column["type"].precision == 4
    assert humor_column["type"].scale == 3
    indexes = inspector.get_indexes("noticia")
    assert any(index["name"] == "ix_noticia_pendiente_analisis" for index in indexes)


def test_sentiment_seed_is_idempotent_and_keeps_changed_formula(engine) -> None:
    with Session(engine) as session:
        session.execute(text("TRUNCATE configuracion"))
        session.commit()
        seed_sentiment_configuration(session)
        rows = list(session.scalars(select(Configuration)).all())
        assert {row.clave for row in rows} == set(SENTIMENT_SETTINGS)
        assert all(row.descripcion for row in rows)
        assert {row.clave: row.tipo for row in rows} == {
            key: config_type for key, (_, config_type, _) in SENTIMENT_SETTINGS.items()
        }
        formula = session.get(Configuration, "humor.formula_noticia")
        assert formula is not None
        formula.valor = "promedio_simple"
        session.commit()

        seed_sentiment_configuration(session)
        session.refresh(formula)
        assert formula.valor == "promedio_simple"
        assert SentimentConfigurationService(
            ConfigurationRepository(session)
        ).resolve().formula_noticia == "promedio_simple"
        session.execute(text("TRUNCATE configuracion"))
        session.commit()


def test_lexicon_seed_is_idempotent_and_preserves_admin_changes(engine) -> None:
    with Session(engine) as session:
        seed_sentiment_terms(session)

        terms = list(session.scalars(select(Term)).all())
        by_identity = {(term.palabra, term.idioma): term for term in terms}
        assert len(terms) == 60
        for spanish, english, raw_value in SENTIMENT_LEXICON:
            spanish_term = by_identity[(spanish, "es")]
            english_term = by_identity[(english, "en")]
            assert spanish_term.activo is True
            assert english_term.activo is True
            assert spanish_term.valor == english_term.valor == Decimal(raw_value)

        edited = by_identity[("feliz", "es")]
        edited.valor = Decimal("2")
        edited.activo = False
        session.commit()
        edited_id = edited.id_termino

        seed_sentiment_terms(session)
        assert session.scalar(select(func.count()).select_from(Term)) == 60
        preserved = session.get(Term, edited_id)
        assert preserved is not None
        assert preserved.valor == Decimal("2")
        assert preserved.activo is False


def test_startup_scale_warning_ignores_empty_dictionary(engine, caplog, monkeypatch) -> None:
    monkeypatch.setattr(
        logging.getLogger("app.services.sentiment_configuration"), "disabled", False
    )
    with Session(engine) as session:
        parameters = SentimentConfigurationService(
            ConfigurationRepository(session)
        ).resolve()
        assert parameters.escala_maxima == Decimal("10")
        warn_if_scale_differs_from_dictionary(session, parameters)
        assert not caplog.records
        session.add(Term(palabra="acuerdo", idioma="es", valor=Decimal("5")))
        session.commit()
        assert session.scalar(select(func.max(func.abs(Term.valor)))) == Decimal("5")
        warn_if_scale_differs_from_dictionary(session, parameters)
        assert "difiere" in caplog.text


class UnusedFeedClient:
    def fetch(self, url: str):
        raise AssertionError("El procesamiento de pendientes no debe descargar RSS")


def test_backfill_is_bounded_and_preserves_analyzed_snapshots(engine) -> None:
    with Session(engine) as session:
        first = _news(session, "backfill-one")
        second = _news(session, "backfill-two")
        second.titulo = "Sin coincidencias"
        term = Term(palabra="acuerdo", idioma="es", valor=Decimal("5"))
        session.add(term)
        session.commit()
        first_id, second_id = first.id_noticia, second.id_noticia

    with Session(engine) as session:
        service = NewsCaptureService(NewsCaptureRepository(session), UnusedFeedClient())
        assert service.process_pending_news(limit=1) == 1
        assert service.process_pending_news(limit=1) == 1
        assert service.process_pending_news(limit=1) == 0

    with Session(engine) as session:
        first = session.get(News, first_id)
        second = session.get(News, second_id)
        assert first is not None and first.valor_humor == Decimal("0.500")
        assert first.fecha_analisis is not None
        assert second is not None and second.valor_humor is None
        assert second.fecha_analisis is not None
        term = session.scalar(select(Term))
        assert term is not None
        term.valor = Decimal("-5")
        term.activo = False
        session.commit()

    with Session(engine) as session:
        service = NewsCaptureService(NewsCaptureRepository(session), UnusedFeedClient())
        assert service.process_pending_news() == 0
        assert session.get(News, first_id).valor_humor == Decimal("0.500")
        assert session.scalar(select(NewsTerm)).aporte_humor == Decimal("5.00")


def test_bilingual_inflections_persist_against_canonical_terms(engine) -> None:
    with Session(engine) as session:
        spanish_news = _news(
            session,
            "bilingual-es",
            language="es",
            title="Personas felices",
        )
        english_news = _news(
            session,
            "bilingual-en",
            language="en",
            title="Happier people",
        )
        spanish_term = Term(palabra="feliz", idioma="es", valor=Decimal("7"))
        english_term = Term(palabra="happy", idioma="en", valor=Decimal("7"))
        session.add_all([spanish_term, english_term])
        session.commit()
        news_ids = (spanish_news.id_noticia, english_news.id_noticia)
        term_ids = (spanish_term.id_termino, english_term.id_termino)

    with Session(engine) as session:
        service = NewsCaptureService(NewsCaptureRepository(session), UnusedFeedClient())
        assert service.process_pending_news() == 2

    with Session(engine) as session:
        persisted_news = {
            news.idioma: news
            for news in session.scalars(
                select(News).where(News.id_noticia.in_(news_ids))
            ).all()
        }
        contributions = {
            contribution.id_noticia: contribution
            for contribution in session.scalars(
                select(NewsTerm).where(NewsTerm.id_noticia.in_(news_ids))
            ).all()
        }
        assert persisted_news["es"].valor_humor == Decimal("0.700")
        assert persisted_news["en"].valor_humor == Decimal("0.700")
        assert contributions[news_ids[0]].id_termino == term_ids[0]
        assert contributions[news_ids[1]].id_termino == term_ids[1]
        assert contributions[news_ids[0]].ocurrencias == 1
        assert contributions[news_ids[1]].ocurrencias == 1
        assert contributions[news_ids[0]].aporte_humor == Decimal("7.00")
        assert contributions[news_ids[1]].aporte_humor == Decimal("7.00")

        session.get(Term, term_ids[0]).valor = Decimal("-7")
        session.get(Term, term_ids[1]).valor = Decimal("-7")
        session.commit()

    with Session(engine) as session:
        service = NewsCaptureService(NewsCaptureRepository(session), UnusedFeedClient())
        assert service.process_pending_news() == 0
        assert session.get(News, news_ids[0]).valor_humor == Decimal("0.700")
        assert session.get(News, news_ids[1]).valor_humor == Decimal("0.700")


def test_sentiment_endpoint_matches_persisted_news_without_writes(engine) -> None:
    with Session(engine) as session:
        news = _news(
            session,
            "sentiment-endpoint-parity",
            language="es",
            title="Buenas noticias",
        )
        news.descripcion = "La comunidad celebra"
        term = Term(palabra="bueno", idioma="es", valor=Decimal("5"))
        session.add(term)
        session.commit()
        news_id, term_id = news.id_noticia, term.id_termino

    with Session(engine) as session:
        capture_service = NewsCaptureService(
            NewsCaptureRepository(session), UnusedFeedClient()
        )
        assert capture_service.process_pending_news() == 1

    with Session(engine) as session:
        news = session.get(News, news_id)
        contribution = session.scalar(
            select(NewsTerm).where(NewsTerm.id_noticia == news_id)
        )
        assert news is not None and news.valor_humor == Decimal("0.500")
        assert contribution is not None
        assert contribution.id_termino == term_id
        assert contribution.ocurrencias == 1
        assert contribution.aporte_humor == Decimal("5.00")
        expected_humor = news.valor_humor
        expected_analysis_date = news.fecha_analisis
        expected_text = f"{news.titulo} {news.descripcion}"
        before_news_count = session.scalar(select(func.count()).select_from(News))
        before_contribution_count = session.scalar(
            select(func.count()).select_from(NewsTerm)
        )

    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override_get_db():
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/sentiment",
                json={"texto": expected_text, "idioma": "es"},
            )
        assert response.status_code == 200
        body = response.json()
        assert Decimal(body["valor_humor"]) == expected_humor
        assert body["terminos"] == [
            {
                "id_termino": term_id,
                "palabra": "bueno",
                "valor": "5",
                "ocurrencias": 1,
                "aporte_humor": "5.00",
            }
        ]
    finally:
        app.dependency_overrides.clear()

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(News)) == before_news_count
        assert (
            session.scalar(select(func.count()).select_from(NewsTerm))
            == before_contribution_count
        )
        persisted = session.get(News, news_id)
        persisted_contribution = session.scalar(
            select(NewsTerm).where(NewsTerm.id_noticia == news_id)
        )
        assert persisted is not None
        assert persisted.valor_humor == expected_humor
        assert persisted.fecha_analisis == expected_analysis_date
        assert persisted_contribution is not None
        assert persisted_contribution.id_termino == term_id
        assert persisted_contribution.ocurrencias == 1
        assert persisted_contribution.aporte_humor == Decimal("5.00")


def test_concurrent_pending_claims_skip_locked_rows(engine) -> None:
    with Session(engine) as setup:
        _news(setup, "locked")
        setup.commit()

    with Session(engine) as first_session, Session(engine) as second_session:
        first = NewsCaptureRepository(first_session).claim_pending_news(1)
        second = NewsCaptureRepository(second_session).claim_pending_news(1)
        assert len(first) == 1
        assert second == []
        first_session.rollback()
        second_session.rollback()


def test_scheduled_capture_recovers_pending_without_active_sources(engine, monkeypatch) -> None:
    from app import scheduler

    with Session(engine) as session:
        news = _news(session, "scheduled")
        news.fuente.activa = False
        session.commit()
        news_id = news.id_noticia

    monkeypatch.setattr(scheduler, "get_session_factory", lambda: lambda: Session(engine))
    scheduler.run_capture_job()

    with Session(engine) as session:
        recovered = session.get(News, news_id)
        assert recovered is not None
        assert recovered.fecha_analisis is not None
        assert recovered.valor_humor is None


def test_capture_reconstructs_weighted_humor_and_uses_changed_formula(engine) -> None:
    class ControlledFeed:
        def __init__(self) -> None:
            self.guid = "weighted-one"

        def fetch(self, url: str):
            return [
                FeedEntry(
                    guid=self.guid,
                    title="Guerra guerra acuerdo",
                    description="Crisis",
                    link=f"https://example.com/{self.guid}",
                    published_at=None,
                )
            ]

    with Session(engine, expire_on_commit=False) as session:
        session.execute(text("TRUNCATE configuracion"))
        session.commit()
        seed_sentiment_configuration(session)
        source = RssSource(
            canal=Channel(nombre="Canal fórmula", continente="America"),
            nombre="Feed fórmula",
            url_feed="https://example.com/formula.xml",
            categoria_iptc="society",
            idioma="es",
        )
        session.add_all(
            [
                source,
                Term(palabra="guerra", idioma="es", valor=Decimal("-9")),
                Term(palabra="crisis", idioma="es", valor=Decimal("-6")),
                Term(palabra="acuerdo", idioma="es", valor=Decimal("5")),
            ]
        )
        session.commit()
        feed = ControlledFeed()
        service = NewsCaptureService(NewsCaptureRepository(session), feed)

        assert service.capture_active_sources().inserted == 1
        first = session.scalar(select(News).where(News.guid_origen == "weighted-one"))
        assert first is not None and first.valor_humor == Decimal("-0.475")
        contributions = list(
            session.scalars(
                select(NewsTerm).where(NewsTerm.id_noticia == first.id_noticia)
            ).all()
        )
        assert len(contributions) == 3
        numerator = sum((item.aporte_humor for item in contributions), Decimal(0))
        occurrences = sum(item.ocurrencias for item in contributions)
        assert numerator / (Decimal(10) * occurrences) == first.valor_humor

        formula = session.get(Configuration, "humor.formula_noticia")
        assert formula is not None
        formula.valor = "promedio_simple"
        session.commit()
        feed.guid = "simple-two"
        assert service.capture_active_sources().inserted == 1
        second = session.scalar(select(News).where(News.guid_origen == "simple-two"))
        assert second is not None and second.valor_humor == Decimal("-0.333")
        assert first.valor_humor == Decimal("-0.475")
        session.execute(text("TRUNCATE configuracion"))
        session.commit()


def test_enabled_startup_seeds_settings_and_warns_about_scale(engine, monkeypatch, caplog) -> None:
    from app import main as main_module

    monkeypatch.setattr(
        logging.getLogger("app.services.sentiment_configuration"), "disabled", False
    )

    class FakeScheduler:
        def start(self, periodicity_minutes: int) -> None:
            assert periodicity_minutes == 60

        def shutdown(self) -> None:
            pass

    with Session(engine) as session:
        session.execute(text("TRUNCATE configuracion"))
        session.add(Term(palabra="acuerdo", idioma="es", valor=Decimal("5")))
        session.commit()

    monkeypatch.setattr(main_module, "CaptureScheduler", FakeScheduler)
    monkeypatch.setattr(
        main_module,
        "get_settings",
        lambda: SimpleNamespace(capture_scheduler_enabled=True),
    )
    with TestClient(main_module.app):
        pass

    with Session(engine) as session:
        keys = {row.clave for row in session.scalars(select(Configuration)).all()}
        assert keys == set(SENTIMENT_SETTINGS)
        assert "difiere" in caplog.text
        session.execute(text("TRUNCATE configuracion"))
        session.commit()
