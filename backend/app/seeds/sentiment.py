"""Idempotent configuration seed for the sentiment engine."""

from decimal import Decimal

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import Configuration, Term
from app.services.sentiment_configuration import SENTIMENT_SETTINGS


# Thirty translated concept pairs share values on ADR-001's [-10, 10] scale.
SENTIMENT_LEXICON = (
    ("alegría", "joy", "8.0"),
    ("feliz", "happy", "7.0"),
    ("esperanza", "hope", "7.0"),
    ("amor", "love", "9.0"),
    ("éxito", "success", "8.0"),
    ("progreso", "progress", "6.0"),
    ("paz", "peace", "6.0"),
    ("confianza", "confidence", "6.0"),
    ("optimismo", "optimism", "7.0"),
    ("libertad", "freedom", "5.0"),
    ("bienestar", "wellbeing", "7.0"),
    ("cooperación", "cooperation", "5.0"),
    ("victoria", "victory", "8.0"),
    ("apoyo", "support", "4.0"),
    ("acuerdo", "agreement", "3.0"),
    ("tristeza", "sadness", "-7.0"),
    ("miedo", "fear", "-7.0"),
    ("odio", "hate", "-9.0"),
    ("fracaso", "failure", "-8.0"),
    ("crisis", "crisis", "-6.0"),
    ("guerra", "war", "-9.0"),
    ("violencia", "violence", "-10.0"),
    ("pérdida", "loss", "-7.0"),
    ("corrupción", "corruption", "-8.0"),
    ("desempleo", "unemployment", "-7.0"),
    ("pobreza", "poverty", "-8.0"),
    ("enfermedad", "illness", "-5.0"),
    ("desastre", "disaster", "-9.0"),
    ("conflicto", "conflict", "-6.0"),
    ("amenaza", "threat", "-6.0"),
)


def seed_sentiment_configuration(session: Session) -> None:
    rows = [
        {
            "clave": key,
            "valor": value,
            "tipo": parameter_type,
            "descripcion": description,
        }
        for key, (value, parameter_type, description) in SENTIMENT_SETTINGS.items()
    ]
    try:
        session.execute(
            insert(Configuration)
            .values(rows)
            .on_conflict_do_nothing(index_elements=["clave"])
        )
        session.commit()
    except Exception:
        session.rollback()
        raise


def seed_sentiment_terms(session: Session) -> None:
    rows = [
        {
            "palabra": word,
            "idioma": language,
            "valor": Decimal(value),
            "activo": True,
        }
        for spanish, english, value in SENTIMENT_LEXICON
        for word, language in ((spanish, "es"), (english, "en"))
    ]
    try:
        session.execute(
            insert(Term)
            .values(rows)
            .on_conflict_do_nothing(constraint="uq_termino_palabra_idioma")
        )
        session.commit()
    except Exception:
        session.rollback()
        raise
