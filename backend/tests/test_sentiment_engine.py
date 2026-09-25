from decimal import Decimal
from itertools import product

import pytest

from app.services.sentiment_engine import (
    ExactTermRecognizer,
    RecognizedTerm,
    SentimentParameters,
    SentimentTerm,
    SentimentValidationError,
    calculate_sentiment,
)


def test_recognizes_repeated_complete_terms_in_title_and_description() -> None:
    terms = [
        SentimentTerm(1, "Alegría", "es", Decimal("8"), True),
        SentimentTerm(2, "gran acuerdo", "es", Decimal("5"), True),
        SentimentTerm(3, "alegría", "en", Decimal("7"), True),
        SentimentTerm(4, "crisis", "es", Decimal("-6"), False),
        SentimentTerm(5, "ale", "es", Decimal("1"), True),
    ]
    recognized = ExactTermRecognizer().recognize(
        title="ALEGRIA por un gran acuerdo",
        description="Otra alegría; la crisis y un gran acuerdo en desalentar.",
        language="es",
        terms=terms,
    )
    assert [(item.id_termino, item.ocurrencias) for item in recognized] == [
        (1, 2),
        (2, 2),
    ]


def test_recognizes_title_without_description() -> None:
    recognized = ExactTermRecognizer().recognize(
        title="Acuerdo firmado",
        description=None,
        language="es",
        terms=[SentimentTerm(1, "acuerdo", "es", Decimal("5"), True)],
    )
    assert recognized == (RecognizedTerm(1, Decimal("5"), 1),)


def test_weighted_formula_persists_auditable_contributions() -> None:
    result = calculate_sentiment(
        [
            RecognizedTerm(1, Decimal("-9"), 2),
            RecognizedTerm(2, Decimal("-6"), 1),
            RecognizedTerm(3, Decimal("5"), 1),
        ],
        SentimentParameters(),
    )
    assert result.valor_humor == Decimal("-0.475")
    assert [item.aporte_humor for item in result.contributions] == [
        Decimal("-18.00"),
        Decimal("-6.00"),
        Decimal("5.00"),
    ]


def test_no_terms_is_null_and_cancellation_is_zero() -> None:
    assert calculate_sentiment([], SentimentParameters()).valor_humor is None
    result = calculate_sentiment(
        [RecognizedTerm(1, Decimal("-5"), 1), RecognizedTerm(2, Decimal("5"), 1)],
        SentimentParameters(),
    )
    assert result.valor_humor == Decimal("0.000")


def test_alternative_formulas_use_same_recognized_terms() -> None:
    terms = [RecognizedTerm(1, Decimal("-10"), 3), RecognizedTerm(2, Decimal("5"), 1)]
    simple = calculate_sentiment(
        terms, SentimentParameters(formula_noticia="promedio_simple")
    )
    bounded = calculate_sentiment(
        terms, SentimentParameters(formula_noticia="suma_acotada")
    )
    assert simple.valor_humor == Decimal("-0.250")
    assert bounded.valor_humor == Decimal("-0.500")
    saturated = calculate_sentiment(
        [RecognizedTerm(1, Decimal("10"), 10)],
        SentimentParameters(formula_noticia="suma_acotada"),
    )
    assert saturated.valor_humor == Decimal("1.000")


def test_round_half_up_in_absolute_value() -> None:
    positive = calculate_sentiment(
        [RecognizedTerm(1, Decimal("1.3"), 1), RecognizedTerm(2, Decimal("0.0"), 19)],
        SentimentParameters(),
    )
    negative = calculate_sentiment(
        [RecognizedTerm(1, Decimal("-1.3"), 1), RecognizedTerm(2, Decimal("0.0"), 19)],
        SentimentParameters(),
    )
    assert positive.valor_humor == Decimal("0.007")
    assert negative.valor_humor == Decimal("-0.007")


@pytest.mark.parametrize("invalid", [Decimal("10.1"), Decimal("-10.1"), Decimal("NaN"), Decimal("1.23")])
def test_rejects_out_of_range_or_excess_precision(invalid) -> None:
    with pytest.raises(SentimentValidationError):
        calculate_sentiment(
            [RecognizedTerm(5, invalid, 1)], SentimentParameters()
        )


def test_weighted_result_stays_in_range_for_valid_inputs() -> None:
    values = [Decimal(value) for value in (-10, -5, 0, 5, 10)]
    for left, right, left_count, right_count in product(values, values, (1, 2, 5), (1, 2, 5)):
        result = calculate_sentiment(
            [RecognizedTerm(1, left, left_count), RecognizedTerm(2, right, right_count)],
            SentimentParameters(),
        )
        assert result.valor_humor is not None
        assert Decimal("-1") <= result.valor_humor <= Decimal("1")
