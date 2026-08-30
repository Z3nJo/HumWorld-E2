from dataclasses import dataclass
from typing import Protocol

from app.models import Configuration


CAPTURE_PERIODICITY_KEY = "captura.periodicidad_minutos"
CAPTURE_PERIODICITY_DEFAULT = 60
CAPTURE_PERIODICITY_TYPE = "entero"
CAPTURE_PERIODICITY_DESCRIPTION = "Periodicidad del cron de captura en minutos"
NEWS_RETENTION_KEY = "noticias.caducidad_dias"
NEWS_RETENTION_DEFAULT = 30
NEWS_RETENTION_TYPE = "entero"
NEWS_RETENTION_DESCRIPTION = "Caducidad de noticias en dias"


class ConfigurationValidationError(Exception):
    pass


@dataclass(frozen=True)
class RuntimeConfiguration:
    captura_periodicidad_minutos: int
    noticias_caducidad_dias: int


class ConfigurationRepositoryProtocol(Protocol):
    def get_parameter(self, key: str) -> Configuration | None: ...

    def save_parameters(
        self,
        parameters: dict[str, dict[str, str]],
    ) -> dict[str, Configuration]: ...


class ConfigurationService:
    def __init__(self, repository: ConfigurationRepositoryProtocol) -> None:
        self._repository = repository

    def get_runtime_configuration(self) -> RuntimeConfiguration:
        return RuntimeConfiguration(
            captura_periodicidad_minutos=self._get_capture_periodicity(),
            noticias_caducidad_dias=self._get_news_retention(),
        )

    def update_runtime_configuration(
        self,
        *,
        captura_periodicidad_minutos: int,
        noticias_caducidad_dias: int,
    ) -> RuntimeConfiguration:
        self._validate_capture_periodicity(captura_periodicidad_minutos)
        self._validate_news_retention(noticias_caducidad_dias)
        self._repository.save_parameters(
            {
                CAPTURE_PERIODICITY_KEY: {
                    "value": str(captura_periodicidad_minutos),
                    "type": CAPTURE_PERIODICITY_TYPE,
                    "description": CAPTURE_PERIODICITY_DESCRIPTION,
                },
                NEWS_RETENTION_KEY: {
                    "value": str(noticias_caducidad_dias),
                    "type": NEWS_RETENTION_TYPE,
                    "description": NEWS_RETENTION_DESCRIPTION,
                },
            }
        )
        return RuntimeConfiguration(
            captura_periodicidad_minutos=captura_periodicidad_minutos,
            noticias_caducidad_dias=noticias_caducidad_dias,
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

    def _get_news_retention(self) -> int:
        parameter = self._repository.get_parameter(NEWS_RETENTION_KEY)
        if parameter is None:
            return NEWS_RETENTION_DEFAULT
        try:
            value = int(parameter.valor)
        except ValueError as error:
            raise ConfigurationValidationError(
                "La caducidad configurada debe ser un entero"
            ) from error
        self._validate_news_retention(value)
        return value

    @staticmethod
    def _validate_capture_periodicity(value: int) -> None:
        if value < 1:
            raise ConfigurationValidationError(
                "La periodicidad de captura debe ser mayor o igual a 1 minuto"
            )

    @staticmethod
    def _validate_news_retention(value: int) -> None:
        if value < 1:
            raise ConfigurationValidationError(
                "La caducidad de noticias debe ser mayor o igual a 1 dia"
            )
