import pytest

from app.models import Configuration
from app.services.configuration import (
    CAPTURE_PERIODICITY_KEY,
    CAPTURE_PERIODICITY_TYPE,
    ConfigurationService,
    ConfigurationValidationError,
)


class FakeConfigurationRepository:
    def __init__(self) -> None:
        self.parameters: dict[str, Configuration] = {}

    def get_parameter(self, key: str) -> Configuration | None:
        return self.parameters.get(key)

    def save_parameter(
        self,
        *,
        key: str,
        value: str,
        type_: str,
        description: str,
    ) -> Configuration:
        parameter = self.parameters.get(key)
        if parameter is None:
            parameter = Configuration(
                clave=key,
                valor=value,
                tipo=type_,
                descripcion=description,
            )
            self.parameters[key] = parameter
        else:
            parameter.valor = value
            parameter.tipo = type_
            parameter.descripcion = description
        return parameter


@pytest.fixture
def repository() -> FakeConfigurationRepository:
    return FakeConfigurationRepository()


@pytest.fixture
def service(repository: FakeConfigurationRepository) -> ConfigurationService:
    return ConfigurationService(repository)


def test_returns_default_capture_periodicity_when_missing(
    service: ConfigurationService,
) -> None:
    config = service.get_runtime_configuration()
    assert config.captura_periodicidad_minutos == 60


def test_returns_persisted_capture_periodicity(
    service: ConfigurationService,
    repository: FakeConfigurationRepository,
) -> None:
    repository.parameters[CAPTURE_PERIODICITY_KEY] = Configuration(
        clave=CAPTURE_PERIODICITY_KEY,
        valor="15",
        tipo=CAPTURE_PERIODICITY_TYPE,
        descripcion="Periodicidad",
    )
    config = service.get_runtime_configuration()
    assert config.captura_periodicidad_minutos == 15


def test_updates_and_replaces_capture_periodicity(
    service: ConfigurationService,
    repository: FakeConfigurationRepository,
) -> None:
    created = service.update_runtime_configuration(captura_periodicidad_minutos=30)
    replaced = service.update_runtime_configuration(captura_periodicidad_minutos=45)

    assert created.captura_periodicidad_minutos == 30
    assert replaced.captura_periodicidad_minutos == 45
    assert len(repository.parameters) == 1
    parameter = repository.parameters[CAPTURE_PERIODICITY_KEY]
    assert parameter.valor == "45"
    assert parameter.tipo == CAPTURE_PERIODICITY_TYPE
    assert parameter.descripcion


def test_rejects_invalid_updates_without_changing_previous_state(
    service: ConfigurationService,
    repository: FakeConfigurationRepository,
) -> None:
    service.update_runtime_configuration(captura_periodicidad_minutos=20)

    with pytest.raises(ConfigurationValidationError, match="mayor o igual"):
        service.update_runtime_configuration(captura_periodicidad_minutos=0)

    assert repository.parameters[CAPTURE_PERIODICITY_KEY].valor == "20"


def test_rejects_corrupted_persisted_capture_periodicity(
    service: ConfigurationService,
    repository: FakeConfigurationRepository,
) -> None:
    repository.parameters[CAPTURE_PERIODICITY_KEY] = Configuration(
        clave=CAPTURE_PERIODICITY_KEY,
        valor="no-entero",
        tipo=CAPTURE_PERIODICITY_TYPE,
        descripcion="Periodicidad",
    )

    with pytest.raises(ConfigurationValidationError, match="entero"):
        service.get_runtime_configuration()
