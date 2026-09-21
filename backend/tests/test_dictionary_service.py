from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.models import Term
from app.models.domains import Language
from app.repositories import DuplicateTermError
from app.services.dictionary import (
    DictionaryService,
    DictionaryValidationError,
    TermCreateData,
    TermNotFoundError,
    TermUpdateData,
)


class FakeTermRepository:
    def __init__(self) -> None:
        self.terms: dict[int, Term] = {}
        self.last_query: str | None = None
        self.raise_duplicate = False

    def get_term(self, term_id: int) -> Term | None:
        return self.terms.get(term_id)

    def get_by_word_and_language(self, word: str, language: str) -> Term | None:
        return next(
            (
                term
                for term in self.terms.values()
                if term.palabra == word and term.idioma == language
            ),
            None,
        )

    def list_terms(self, *, query: str | None = None) -> list[Term]:
        self.last_query = query
        terms = list(self.terms.values())
        if query is not None:
            terms = [term for term in terms if query in term.palabra]
        return sorted(terms, key=lambda term: (term.palabra, term.idioma, term.id_termino))

    def create_term(self, values: dict[str, object]) -> Term:
        self._maybe_raise_duplicate()
        now = datetime(2026, 9, 21, 12, 0, tzinfo=UTC)
        term = Term(
            id_termino=len(self.terms) + 1,
            fecha_alta=now,
            fecha_modificacion=now,
            **values,
        )
        self.terms[term.id_termino] = term
        return term

    def update_term(self, term: Term, changes: dict[str, object]) -> Term:
        self._maybe_raise_duplicate()
        for field, value in changes.items():
            setattr(term, field, value)
        return term

    def _maybe_raise_duplicate(self) -> None:
        if self.raise_duplicate:
            raise DuplicateTermError("duplicado concurrente")


@pytest.fixture
def repository() -> FakeTermRepository:
    return FakeTermRepository()


@pytest.fixture
def modified_at() -> datetime:
    return datetime(2026, 9, 21, 15, 0, tzinfo=UTC)


@pytest.fixture
def service(
    repository: FakeTermRepository,
    modified_at: datetime,
) -> DictionaryService:
    return DictionaryService(repository, clock=lambda: modified_at)


def term_data(
    word: str = "Alegría",
    *,
    language: Language = Language.SPANISH,
    value: Decimal = Decimal("7.5"),
    active: bool = True,
) -> TermCreateData:
    return TermCreateData(word, language, value, active)


def test_create_normalizes_word_and_preserves_accents(
    service: DictionaryService,
) -> None:
    term = service.create_term(term_data("  Alegría  "))

    assert term.palabra == "alegría"
    assert term.idioma == "es"
    assert term.valor == Decimal("7.5")
    assert term.activo is True


def test_same_word_is_allowed_in_two_languages(service: DictionaryService) -> None:
    service.create_term(term_data("calma", language=Language.SPANISH))
    english = service.create_term(term_data("CALMA", language=Language.ENGLISH))

    assert english.palabra == "calma"
    assert english.idioma == "en"


def test_duplicate_and_concurrent_duplicate_are_validation_errors(
    service: DictionaryService,
    repository: FakeTermRepository,
) -> None:
    service.create_term(term_data())
    with pytest.raises(DictionaryValidationError, match="ya existe"):
        service.create_term(term_data(" ALEGRÍA "))

    repository.raise_duplicate = True
    with pytest.raises(DictionaryValidationError, match="concurrente"):
        service.create_term(term_data("calma"))


@pytest.mark.parametrize(
    ("data", "message"),
    [
        (term_data("   "), "1 y 100"),
        (term_data("a" * 101), "1 y 100"),
        (term_data(value=Decimal("NaN")), "finito"),
        (TermCreateData("calma", "fr", Decimal("1")), "idioma"),  # type: ignore[arg-type]
    ],
)
def test_rejects_invalid_minimum_domain(
    service: DictionaryService,
    data: TermCreateData,
    message: str,
) -> None:
    with pytest.raises(DictionaryValidationError, match=message):
        service.create_term(data)


def test_list_normalizes_query_and_rejects_blank_search(
    service: DictionaryService,
    repository: FakeTermRepository,
) -> None:
    service.create_term(term_data("Alegría"))
    service.create_term(term_data("Calma"))

    assert [term.palabra for term in service.list_terms(query="  ALE ")] == [
        "alegría"
    ]
    assert repository.last_query == "ale"
    with pytest.raises(DictionaryValidationError, match="busqueda"):
        service.list_terms(query="   ")


def test_replace_and_patch_preserve_identity_and_creation_date(
    service: DictionaryService,
    modified_at: datetime,
) -> None:
    term = service.create_term(term_data())
    term_id = term.id_termino
    created_at = term.fecha_alta

    replaced = service.replace_term(
        term_id,
        TermUpdateData(
            palabra="  Calm  ",
            idioma=Language.ENGLISH,
            valor=Decimal("-2.25"),
            activo=False,
        ),
    )
    assert replaced.id_termino == term_id
    assert replaced.fecha_alta == created_at
    assert replaced.fecha_modificacion == modified_at
    assert (replaced.palabra, replaced.idioma, replaced.activo) == (
        "calm",
        "en",
        False,
    )

    patched = service.patch_term(term_id, TermUpdateData(activo=True))
    assert patched.palabra == "calm"
    assert patched.valor == Decimal("-2.25")
    assert patched.activo is True


def test_patch_rejects_empty_and_duplicate_update(service: DictionaryService) -> None:
    first = service.create_term(term_data("alegría"))
    service.create_term(term_data("calma"))

    with pytest.raises(DictionaryValidationError, match="al menos"):
        service.patch_term(first.id_termino, TermUpdateData())
    with pytest.raises(DictionaryValidationError, match="ya existe"):
        service.patch_term(first.id_termino, TermUpdateData(palabra="CALMA"))
    assert first.palabra == "alegría"


def test_delete_is_idempotent_and_missing_term_is_not_found(
    service: DictionaryService,
    modified_at: datetime,
) -> None:
    term = service.create_term(term_data())
    service.delete_term(term.id_termino)
    assert term.activo is False
    assert term.fecha_modificacion == modified_at

    first_modified_at = term.fecha_modificacion
    service.delete_term(term.id_termino)
    assert term.fecha_modificacion == first_modified_at
    assert service.get_term(term.id_termino) is term

    with pytest.raises(TermNotFoundError, match="Termino"):
        service.delete_term(999)
