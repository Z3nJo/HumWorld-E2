from collections import Counter
from decimal import Decimal
import hashlib

import pytest

from app.seeds.sentiment import (
    EXTENDED_SENTIMENT_CATALOG_SHA256,
    EXTENDED_SENTIMENT_TERMS,
    SENTIMENT_LEXICON,
    SENTIMENT_SEED_BATCH_SIZE,
    SENTIMENT_TERMS,
    seed_sentiment_terms,
)
from app.services.text_normalization import normalize_text


def test_starter_lexicon_has_thirty_comparable_pairs_with_valid_values() -> None:
    assert len(SENTIMENT_LEXICON) == 30
    assert len({(spanish, english) for spanish, english, _ in SENTIMENT_LEXICON}) == 30

    for spanish, english, raw_value in SENTIMENT_LEXICON:
        value = Decimal(raw_value)
        assert spanish
        assert english
        assert Decimal("-10") <= value <= Decimal("10")
        assert value == value.quantize(Decimal("0.1"))


def test_extended_lexicon_is_deterministic_unique_and_engine_compatible() -> None:
    counts = Counter(language for _, language, _ in SENTIMENT_TERMS)
    assert counts == {"es": 4_000, "en": 4_000}
    assert len(EXTENDED_SENTIMENT_TERMS) == 7_940
    assert EXTENDED_SENTIMENT_TERMS == tuple(
        sorted(EXTENDED_SENTIMENT_TERMS, key=lambda item: (item[1], item[0]))
    )

    identities = {(word, language) for word, language, _ in SENTIMENT_TERMS}
    match_identities = {
        (normalize_text(word), language) for word, language, _ in SENTIMENT_TERMS
    }
    assert len(identities) == len(SENTIMENT_TERMS)
    assert len(match_identities) == len(SENTIMENT_TERMS)

    for word, language, raw_value in SENTIMENT_TERMS:
        value = Decimal(raw_value)
        assert word == " ".join(word.split()).casefold()
        assert 1 <= len(word) <= 100
        assert normalize_text(word)
        assert language in {"es", "en"}
        assert value.is_finite()
        assert value != 0
        assert Decimal("-10") <= value <= Decimal("10")
        assert value == value.quantize(Decimal("0.1"))

    canonical = "".join(
        f"{word}\t{language}\t{value}\n"
        for word, language, value in EXTENDED_SENTIMENT_TERMS
    )
    assert hashlib.sha256(canonical.encode("utf-8")).hexdigest() == (
        EXTENDED_SENTIMENT_CATALOG_SHA256
    )


class RecordingSession:
    def __init__(self, fail_on_execute: int | None = None) -> None:
        self.fail_on_execute = fail_on_execute
        self.execute_calls = 0
        self.commit_calls = 0
        self.rollback_calls = 0

    def execute(self, statement) -> None:
        self.execute_calls += 1
        if self.execute_calls == self.fail_on_execute:
            raise RuntimeError("controlled batch failure")

    def commit(self) -> None:
        self.commit_calls += 1

    def rollback(self) -> None:
        self.rollback_calls += 1


def test_extended_seed_executes_bounded_batches_and_commits_once() -> None:
    session = RecordingSession()

    seed_sentiment_terms(session)  # type: ignore[arg-type]

    expected_batches = (
        len(SENTIMENT_TERMS) + SENTIMENT_SEED_BATCH_SIZE - 1
    ) // SENTIMENT_SEED_BATCH_SIZE
    assert session.execute_calls == expected_batches
    assert session.commit_calls == 1
    assert session.rollback_calls == 0


def test_extended_seed_rolls_back_without_committing_a_partial_catalog() -> None:
    session = RecordingSession(fail_on_execute=2)

    with pytest.raises(RuntimeError, match="controlled batch failure"):
        seed_sentiment_terms(session)  # type: ignore[arg-type]

    assert session.execute_calls == 2
    assert session.commit_calls == 0
    assert session.rollback_calls == 1
