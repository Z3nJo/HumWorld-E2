from datetime import UTC, datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import (
    Base,
    Channel,
    Country,
    CountryAlias,
    News,
    NewsCountry,
    RssSource,
)
from app.repositories.channels import ChannelRepository


def test_channel_country_change_only_reconciles_source_attributions() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    now = datetime(2026, 10, 27, tzinfo=UTC)
    with Session(engine) as session:
        session.add_all(
            [
                Country(codigo_iso2="CL", nombre_es="Chile", nombre_en="Chile", continente="America"),
                Country(codigo_iso2="AR", nombre_es="Argentina", nombre_en="Argentina", continente="America"),
            ]
        )
        alias = CountryAlias(
            id_alias=1,
            alias="Chile",
            alias_normalizado="chile",
            tipo="pais",
            idioma="es",
            codigo_pais="CL",
            version_catalogo="v1",
        )
        channel = Channel(nombre="Canal", continente="America", pais="CL")
        source = RssSource(
            canal=channel,
            nombre="Fuente",
            url_feed="https://example.com/feed.xml",
            categoria_iptc="society",
            idioma="es",
        )
        session.add_all([alias, source])
        session.flush()
        source_news = News(
            fuente=source, guid_origen="source", titulo="Sin mención",
            url="https://example.com/source", idioma="es", fecha_registro=now,
            fecha_clasificacion_geografica=now, version_clasificador_geografico="v1",
        )
        mentioned_news = News(
            fuente=source, guid_origen="mention", titulo="Chile",
            url="https://example.com/mention", idioma="es", fecha_registro=now,
            fecha_clasificacion_geografica=now, version_clasificador_geografico="v1",
        )
        session.add_all([source_news, mentioned_news])
        session.flush()
        session.add_all(
            [
                NewsCountry(id_noticia=source_news.id_noticia, codigo_pais="CL", origen="fuente"),
                NewsCountry(id_noticia=mentioned_news.id_noticia, codigo_pais="CL", origen="mencion", id_alias=1, campo="titulo"),
            ]
        )
        session.commit()

        repository = ChannelRepository(session)
        repository.update_channel(channel, {"pais": "AR"})
        rows = list(session.scalars(select(NewsCountry).order_by(NewsCountry.id_noticia)))
        assert [(item.id_noticia, item.codigo_pais, item.origen) for item in rows] == [
            (source_news.id_noticia, "AR", "fuente"),
            (mentioned_news.id_noticia, "CL", "mencion"),
        ]

        repository.update_channel(channel, {"pais": None})
        rows = list(session.scalars(select(NewsCountry)))
        assert [(item.id_noticia, item.codigo_pais, item.origen) for item in rows] == [
            (mentioned_news.id_noticia, "CL", "mencion")
        ]
    engine.dispose()
