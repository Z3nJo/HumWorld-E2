from dataclasses import dataclass
from typing import Protocol

from app.models import Configuration


CAPTURE_PERIODICITY_KEY = "captura.periodicidad_minutos"
CAPTURE_PERIODICITY_DEFAULT = 60
CAPTURE_PERIODICITY_TYPE = "entero"
CAPTURE_PERIODICITY_DESCRIPTION = "Periodicidad del cron de captura en minutos"


class ConfigurationValidationError(Exception):
    pass


@dataclass(frozen=True)
class RuntimeConfiguration:
    captura_periodicidad_minutos: int


class ConfigurationRepositoryProtocol(Protocol):
    def get_parameter(self, key: str) -> Configuration | None: ...

    def save_parameter(
        self,
        *,
        key: str,
        value: str,
        type_: str,
        description: str,
    ) -> Configuration: ...


class ConfigurationService:
    def __init__(self, repository: ConfigurationRepositoryProtocol) -> None:
        self._repository = repository

    def get_runtime_configuration(self) -> RuntimeConfiguration:
        return RuntimeConfiguration(
            captura_periodicidad_minutos=self._get_capture_periodicity(),
        )

    def update_runtime_configuration(
        self,
        *,
        captura_periodicidad_minutos: int,
    ) -> RuntimeConfiguration:
        self._validate_capture_periodicity(captura_periodicidad_minutos)
        self._repository.save_parameter(
            key=CAPTURE_PERIODICITY_KEY,
            value=str(captura_periodicidad_minutos),
            type_=CAPTURE_PERIODICITY_TYPE,
            description=CAPTURE_PERIODICITY_DESCRIPTION,
        )
        return RuntimeConfiguration(
            captura_periodicidad_minutos=captura_periodicidad_minutos,
        )

    def _get_capture_periodicity(self) -> int:
        parameter = self._repository.get_parameter(CAPTURE_PERIODICITY_KEY)
        if parameter is None:
            return CAPTURE_PERIODICITY_DEFAULT
        try:
            value = int(parameter.valor)
        except ValueError as error:
            raise ConfigurationValidationError(
                "La periodicidad configurada debe ser un entero"
            ) from error
        self._validate_capture_periodicity(value)
        return value

    @staticmethod
    def _validate_capture_periodicity(value: int) -> None:
        if value < 1:
            raise ConfigurationValidationError(
                "La periodicidad de captura debe ser mayor o igual a 1 minuto"
            )
