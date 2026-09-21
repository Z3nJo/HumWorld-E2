from collections.abc import Mapping
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Term


class DuplicateTermError(Exception):
    pass


class TermRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_term(self, term_id: int) -> Term | None:
        return self._session.get(Term, term_id)

    def get_by_word_and_language(self, word: str, language: str) -> Term | None:
        return self._session.scalar(
            select(Term).where(Term.palabra == word, Term.idioma == language)
        )

    def list_terms(self, *, query: str | None = None) -> list[Term]:
        statement = select(Term)
        if query is not None:
            statement = statement.where(Term.palabra.contains(query, autoescape=True))
        statement = statement.order_by(Term.palabra, Term.idioma, Term.id_termino)
        return list(self._session.scalars(statement).all())

    def create_term(self, values: Mapping[str, Any]) -> Term:
        term = Term(**values)
        self._session.add(term)
        self._commit_or_raise_duplicate()
        self._session.refresh(term)
        return term

    def update_term(self, term: Term, changes: Mapping[str, Any]) -> Term:
        for field, value in changes.items():
            setattr(term, field, value)
        self._commit_or_raise_duplicate()
        self._session.refresh(term)
        return term

    def _commit_or_raise_duplicate(self) -> None:
        try:
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            raise DuplicateTermError(
                "La palabra ya existe para el idioma indicado"
            ) from error
