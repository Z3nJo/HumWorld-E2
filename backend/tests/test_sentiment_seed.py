from decimal import Decimal

from app.seeds.sentiment import SENTIMENT_LEXICON


def test_starter_lexicon_has_thirty_comparable_pairs_with_valid_values() -> None:
    assert len(SENTIMENT_LEXICON) == 30
    assert len({(spanish, english) for spanish, english, _ in SENTIMENT_LEXICON}) == 30

    for spanish, english, raw_value in SENTIMENT_LEXICON:
        value = Decimal(raw_value)
        assert spanish
        assert english
        assert Decimal("-10") <= value <= Decimal("10")
        assert value == value.quantize(Decimal("0.1"))
