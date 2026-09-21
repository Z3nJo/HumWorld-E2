from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Protocol

from app.models import Term
from app.models.domains import Language
from app.repositories.dictionary import DuplicateTermError


class DictionaryValidationError(Exception):
    pass


class TermNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class TermCreateData:
    palabra: str
    idioma: Language
    valor: Decimal
    activo: bool = True


@dataclass(frozen=True)
class TermUpdateData:
    palabra: str | None = None
    idioma: Language | None = None
    valor: Decimal | None = None
    activo: bool | None = None


class TermRepositoryProtocol(Protocol):
    def get_term(self, term_id: int) -> Term | None: ...

    def get_by_word_and_language(self, word: str, language: str) -> Term | None: ...

    def list_terms(self, *, query: str | None = None) -> list[Term]: ...

    def create_term(self, values: dict[str, object]) -> Term: ...

    def update_term(self, term: Term, changes: dict[str, object]) -> Term: ...


class DictionaryService:
    def __init__(
        self,
        repository: TermRepositoryProtocol,
        *,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._repository = repository
        self._clock = clock or (lambda: datetime.now(UTC))

    def list_terms(self, *, query: str | None = None) -> list[Term]:
        normalized_query = self._normalize_query(query) if query is not None else None
        return self._repository.list_terms(query=normalized_query)

    def get_term(self, term_id: int) -> Term:
        term = self._repository.get_term(term_id)
        if term is None:
            raise TermNotFoundError("Termino no encontrado")
        return term

    def create_term(self, data: TermCreateData) -> Term:
        word = self._normalize_word(data.palabra)
        value = self._validate_value(data.valor)
        language = self._language_value(data.idioma)
        self._ensure_unique(word, language)
        try:
            return self._repository.create_term(
                {
                    "palabra": word,
                    "idioma": language,
                    "valor": value,
                    "activo": data.activo,
                }
            )
        except DuplicateTermError as error:
            raise DictionaryValidationError(str(error)) from error

    def replace_term(self, term_id: int, replacement: TermUpdateData) -> Term:
        return self._update_term(term_id, replacement, exclude_none=False)

    def patch_term(self, term_id: int, patch: TermUpdateData) -> Term:
        return self._update_term(term_id, patch, exclude_none=True)

    def delete_term(self, term_id: int) -> None:
        term = self.get_term(term_id)
        if not term.activo:
            return
        try:
            self._repository.update_term(
                term,
                {
                    "activo": False,
                    "fecha_modificacion": self._clock(),
                },
            )
        except DuplicateTermError as error:  # Defensive; these fields are not unique.
            raise DictionaryValidationError(str(error)) from error

    def _update_term(
        self,
        term_id: int,
        update: TermUpdateData,
        *,
        exclude_none: bool,
    ) -> Term:
        term = self.get_term(term_id)
        changes = asdict(update)
        if exclude_none:
            changes = {key: value for key, value in changes.items() if value is not None}
        if not changes:
            raise DictionaryValidationError("Debe indicar al menos un campo editable")
        if any(value is None for value in changes.values()):
            raise DictionaryValidationError("Debe indicar todos los campos requeridos")

        word = (
            self._normalize_word(str(changes["palabra"]))
            if "palabra" in changes
            else term.palabra
        )
        language = (
            self._language_value(changes["idioma"])
            if "idioma" in changes
            else term.idioma
        )
        if "valor" in changes:
            changes["valor"] = self._validate_value(changes["valor"])

        if (word, language) != (term.palabra, term.idioma):
            self._ensure_unique(word, language, current_id=term.id_termino)
        if "palabra" in changes:
            changes["palabra"] = word
        if "idioma" in changes:
            changes["idioma"] = language
        changes["fecha_modificacion"] = self._clock()

        try:
            return self._repository.update_term(term, changes)
        except DuplicateTermError as error:
            raise DictionaryValidationError(str(error)) from error

    def _ensure_unique(
        self,
        word: str,
        language: str,
        *,
        current_id: int | None = None,
    ) -> None:
        duplicate = self._repository.get_by_word_and_language(word, language)
        if duplicate is not None and duplicate.id_termino != current_id:
            raise DictionaryValidationError(
                "La palabra ya existe para el idioma indicado"
            )

    @staticmethod
    def _normalize_word(word: str) -> str:
        normalized = word.strip().lower()
        if not 1 <= len(normalized) <= 100:
            raise DictionaryValidationError(
                "La palabra debe contener entre 1 y 100 caracteres"
            )
        return normalized

    @staticmethod
    def _normalize_query(query: str) -> str:
        normalized = query.strip().lower()
        if not normalized:
            raise DictionaryValidationError("La busqueda no puede estar vacia")
        return normalized

    @staticmethod
    def _validate_value(value: object) -> Decimal:
        if not isinstance(value, Decimal) or not value.is_finite():
            raise DictionaryValidationError("El valor debe ser un decimal finito")
        return value

    @staticmethod
    def _language_value(language: object) -> str:
        if not isinstance(language, Language):
            raise DictionaryValidationError("El idioma debe ser es o en")
        return language.value
