from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Protocol


class NewsPurgeRepositoryProtocol(Protocol):
    def delete_before(self, threshold: datetime) -> int: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...


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
