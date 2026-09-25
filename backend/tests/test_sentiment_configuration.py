from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.services.sentiment_configuration import SentimentConfigurationService
from app.services.sentiment_engine import SentimentValidationError


class FakeRepository:
    def __init__(self, values: dict[str, tuple[str, str]]) -> None:
        self.values = values

    def get_parameter(self, key: str):
        if key not in self.values:
            return None
        value, parameter_type = self.values[key]
        return SimpleNamespace(valor=value, tipo=parameter_type)


def test_resolves_defaults_and_persisted_formula() -> None:
    defaults = SentimentConfigurationService(FakeRepository({})).resolve()
    assert defaults.formula_noticia == "promedio_ponderado"
    assert defaults.escala_maxima == Decimal("10")
    assert defaults.minimo_noticias_agregacion == 3
    assert defaults.saturacion_suma == 5

    changed = SentimentConfigurationService(
        FakeRepository({"humor.formula_noticia": ("promedio_simple", "texto")})
    ).resolve()
    assert changed.formula_noticia == "promedio_simple"


@pytest.mark.parametrize(
    "key,value,parameter_type",
    [
        ("humor.formula_noticia", "desconocida", "texto"),
        ("humor.escala_maxima", "0", "decimal"),
        ("humor.escala_maxima", "NaN", "decimal"),
        ("humor.escala_maxima", "abc", "decimal"),
        ("humor.minimo_noticias_agregacion", "0", "entero"),
        ("humor.saturacion_suma", "-1", "entero"),
        ("humor.saturacion_suma", "5", "texto"),
    ],
)
def test_rejects_invalid_configuration(key, value, parameter_type) -> None:
    with pytest.raises(SentimentValidationError):
        SentimentConfigurationService(
            FakeRepository({key: (value, parameter_type)})
        ).resolve()
