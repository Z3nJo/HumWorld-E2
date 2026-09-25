"""Idempotent configuration seed for the sentiment engine."""

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import Configuration
from app.services.sentiment_configuration import SENTIMENT_SETTINGS


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
