from datetime import UTC, datetime

import pytest

from app.services.purging import NewsPurgeService


NOW = datetime(2026, 9, 25, 12, 0, tzinfo=UTC)


class FakeNewsPurgeRepository:
    def __init__(self, *, deleted: int = 0, error: Exception | None = None) -> None:
        self.deleted = deleted
        self.error = error
        self.thresholds: list[datetime] = []
        self.commits = 0
        self.rollbacks = 0

    def delete_before(self, threshold: datetime) -> int:
        self.thresholds.append(threshold)
        if self.error is not None:
            raise self.error
        return self.deleted

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def test_purges_before_strict_utc_threshold() -> None:
    repository = FakeNewsPurgeRepository(deleted=3)

    deleted = NewsPurgeService(repository, clock=lambda: NOW).purge_expired(30)

    assert deleted == 3
    assert repository.thresholds == [datetime(2026, 8, 26, 12, 0, tzinfo=UTC)]
    assert repository.commits == 1
    assert repository.rollbacks == 0


@pytest.mark.parametrize("retention_days", [0, -1])
def test_rejects_non_positive_retention_without_accessing_repository(
    retention_days: int,
) -> None:
    repository = FakeNewsPurgeRepository()

    with pytest.raises(ValueError, match="positiva"):
        NewsPurgeService(repository, clock=lambda: NOW).purge_expired(retention_days)

    assert repository.thresholds == []
    assert repository.commits == 0
    assert repository.rollbacks == 0


def test_rolls_back_when_repository_fails() -> None:
    repository = FakeNewsPurgeRepository(error=RuntimeError("database unavailable"))

    with pytest.raises(RuntimeError, match="database unavailable"):
        NewsPurgeService(repository, clock=lambda: NOW).purge_expired(30)

    assert repository.commits == 0
    assert repository.rollbacks == 1
