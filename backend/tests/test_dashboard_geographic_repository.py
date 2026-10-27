from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.models import (
    Base,
    Channel,
    Country,
    CountryAlias,
    News,
    NewsCountry,
    NewsTerm,
    RssSource,
    Term,
)
from app.repositories.dashboards import DashboardRepository


def test_multinational_membership_does_not_duplicate_scope_contributions() -> None:
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    with engine.connect() as connection:
        connection.connection.driver_connection.create_function(
            "timezone", 2, lambda zone, value: value
        )
    Base.metadata.create_all(engine)
    instant = datetime(2026, 10, 1, 12, tzinfo=UTC)
    end = instant + timedelta(days=1)
    with Session(engine) as session:
        countries = [
            Country(codigo_iso2="CL", nombre_es="Chile", nombre_en="Chile", continente="America"),
            Country(codigo_iso2="AR", nombre_es="Argentina", nombre_en="Argentina", continente="America"),
            Country(codigo_iso2="UA", nombre_es="Ucrania", nombre_en="Ukraine", continente="Europa"),
            Country(codigo_iso2="ES", nombre_es="España", nombre_en="Spain", continente="Europa"),
        ]
        session.add_all(countries)
        aliases = []
        for index, country in enumerate(countries, start=1):
            aliases.append(
                CountryAlias(
                    id_alias=index,
                    alias=country.nombre_es,
                    alias_normalizado=country.nombre_es.casefold(),
                    tipo="pais",
                    idioma="es",
                    codigo_pais=country.codigo_iso2,
                    version_catalogo="v1",
                )
            )
        session.add_all(aliases)
        source = RssSource(
            canal=Channel(nombre="Canal España", continente="Europa", pais="ES"),
            nombre="Fuente",
            url_feed="https://example.com/feed.xml",
            categoria_iptc="society",
            idioma="es",
        )
        fallback_source = RssSource(
            canal=Channel(nombre="Canal América", continente="America", pais=None),
            nombre="Fuente fallback",
            url_feed="https://example.com/fallback.xml",
            categoria_iptc="society",
            idioma="es",
        )
        term = Term(palabra="acuerdo", idioma="es", valor=Decimal("1.0"))
        session.add_all([source, fallback_source, term])
        session.flush()

        news = [
            News(fuente=source, guid_origen="one", titulo="Chile Argentina", url="https://example.com/one", idioma="es", fecha_registro=instant, valor_humor=Decimal("0.600"), fecha_clasificacion_geografica=instant, version_clasificador_geografico="v1"),
            News(fuente=source, guid_origen="two", titulo="Chile Ucrania", url="https://example.com/two", idioma="es", fecha_registro=instant, valor_humor=Decimal("-0.200"), fecha_clasificacion_geografica=instant, version_clasificador_geografico="v1"),
            News(fuente=fallback_source, guid_origen="three", titulo="Sin país", url="https://example.com/three", idioma="es", fecha_registro=instant, valor_humor=Decimal("0.300"), fecha_clasificacion_geografica=instant, version_clasificador_geografico="v1"),
        ]
        session.add_all(news)
        session.flush()
        session.add_all(
            [
                NewsCountry(id_noticia=news[0].id_noticia, codigo_pais="CL", origen="mencion", id_alias=1, campo="titulo"),
                NewsCountry(id_noticia=news[0].id_noticia, codigo_pais="AR", origen="mencion", id_alias=2, campo="titulo"),
                NewsCountry(id_noticia=news[1].id_noticia, codigo_pais="CL", origen="mencion", id_alias=1, campo="titulo"),
                NewsCountry(id_noticia=news[1].id_noticia, codigo_pais="UA", origen="mencion", id_alias=3, campo="titulo"),
                NewsTerm(id_noticia=news[0].id_noticia, id_termino=term.id_termino, ocurrencias=2, aporte_humor=Decimal("2.00")),
                NewsTerm(id_noticia=news[1].id_noticia, id_termino=term.id_termino, ocurrencias=1, aporte_humor=Decimal("1.00")),
            ]
        )
        session.commit()
        repository = DashboardRepository(session)

        countries_result = repository.aggregate_countries(start_at=instant, end_at=end)
        assert {(item.country, item.news_count) for item in countries_result} == {
            ("AR", 1), ("CL", 2), ("UA", 1)
        }
        continents = repository.aggregate(start_at=instant, end_at=end, continent=None, country=None)
        assert {(item.continent, item.news_count) for item in continents} == {
            ("America", 3), ("Europa", 1)
        }
        terms = repository.influential_terms(start_at=instant, end_at=end, continent="America", country=None)
        assert terms[0].frequency == 3
        assert terms[0].total_contribution == Decimal("3.00")
        influential = repository.influential_news(start_at=instant, end_at=end, continent="America", country="CL")
        assert [item.id_noticia for item in influential] == [news[0].id_noticia, news[1].id_noticia]
        assert {(item.continente, item.pais) for item in influential} == {("Europa", "ES")}
    engine.dispose()
