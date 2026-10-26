from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Protocol


class NewsPurgeRepositoryProtocol(Protocol):
    def delete_before(self, threshold: datetime) -> int: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...


class RuntimeConfigurationProtocol(Protocol):
    noticias_caducidad_dias: int


class ConfigurationReaderProtocol(Protocol):
    def get_runtime_configuration(self) -> RuntimeConfigurationProtocol: ...


class NewsPurgeExecutorProtocol(Protocol):
    def purge_expired(self, retention_days: int) -> int: ...


class NewsPurgeService:
    def __init__(
        self,
        repository: NewsPurgeRepositoryProtocol,
        *,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._repository = repository
        self._clock = clock or (lambda: datetime.now(UTC))

    def purge_expired(self, retention_days: int) -> int:
        if retention_days < 1:
            raise ValueError("La caducidad de noticias debe ser positiva")
        threshold = self._clock() - timedelta(days=retention_days)
        try:
            deleted = self._repository.delete_before(threshold)
            self._repository.commit()
            return deleted
        except Exception:
            self._repository.rollback()
            raise


class NewsPurgeApplicationService:
    def __init__(
        self,
        configuration_service: ConfigurationReaderProtocol,
        purge_service: NewsPurgeExecutorProtocol,
    ) -> None:
        self._configuration_service = configuration_service
        self._purge_service = purge_service

    def purge_expired(self) -> int:
        retention_days = (
            self._configuration_service.get_runtime_configuration()
            .noticias_caducidad_dias
        )
        return self._purge_service.purge_expired(retention_days)
