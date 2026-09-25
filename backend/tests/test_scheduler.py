from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import scheduler as scheduler_module
from app.scheduler import CAPTURE_JOB_ID, PURGE_JOB_ID, CaptureScheduler
from app.services.configuration import NullCaptureSchedule


def test_schedules_reschedules_and_shuts_down_without_immediate_run() -> None:
    capture_calls: list[datetime] = []
    purge_calls: list[datetime] = []
    scheduler = CaptureScheduler(
        job=lambda: capture_calls.append(datetime.now(UTC)),
        purge_job=lambda: purge_calls.append(datetime.now(UTC)),
    )
    scheduler.start(15)
    try:
        for job_id in (CAPTURE_JOB_ID, PURGE_JOB_ID):
            job = scheduler.get_job(job_id)
            assert job is not None
            assert job.trigger.interval.total_seconds() == 15 * 60
            assert job.max_instances == 1
            assert job.coalesce is True
            assert job.next_run_time > datetime.now(UTC)
        assert capture_calls == []
        assert purge_calls == []

        scheduler.reschedule(5)
        for job_id in (CAPTURE_JOB_ID, PURGE_JOB_ID):
            job = scheduler.get_job(job_id)
            assert job is not None
            assert job.trigger.interval.total_seconds() == 5 * 60
            assert job.next_run_time > datetime.now(UTC)
        assert capture_calls == []
        assert purge_calls == []
    finally:
        scheduler.shutdown()


def test_rejects_reschedule_before_start() -> None:
    with pytest.raises(RuntimeError, match="no esta iniciado"):
        CaptureScheduler(job=lambda: None).reschedule(5)


def test_fastapi_lifespan_can_disable_scheduler() -> None:
    with TestClient(app):
        assert isinstance(app.state.capture_scheduler, NullCaptureSchedule)


class FakeSession:
    def __init__(self) -> None:
        self.rollbacks = 0

    def __enter__(self) -> "FakeSession":
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        return None

    def rollback(self) -> None:
        self.rollbacks += 1


def test_purge_job_uses_current_retention_and_logs_deleted_count(monkeypatch) -> None:
    session = FakeSession()
    deleted_values: list[int] = []

    class FakeLogger:
        def __init__(self) -> None:
            self.infos: list[tuple[str, tuple[object, ...]]] = []

        def info(self, message: str, *args: object) -> None:
            self.infos.append((message, args))

        def exception(self, message: str) -> None:
            raise AssertionError(f"Unexpected logged exception: {message}")

    logger = FakeLogger()

    class FakeConfigurationService:
        def __init__(self, repository) -> None:
            pass

        def get_runtime_configuration(self):
            return SimpleNamespace(noticias_caducidad_dias=12)

    class FakePurgeService:
        def __init__(self, repository) -> None:
            pass

        def purge_expired(self, retention_days: int) -> int:
            deleted_values.append(retention_days)
            return 4

    monkeypatch.setattr(scheduler_module, "get_session_factory", lambda: lambda: session)
    monkeypatch.setattr(scheduler_module, "ConfigurationService", FakeConfigurationService)
    monkeypatch.setattr(scheduler_module, "NewsPurgeService", FakePurgeService)
    monkeypatch.setattr(scheduler_module, "logger", logger)

    assert scheduler_module.run_purge_job() == 4
    assert deleted_values == [12]
    assert session.rollbacks == 0
    assert logger.infos == [("News purge completed: deleted=%s", (4,))]


def test_purge_job_rolls_back_and_logs_failure(monkeypatch) -> None:
    session = FakeSession()

    class FakeLogger:
        def __init__(self) -> None:
            self.exceptions: list[str] = []

        def info(self, message: str, *args: object) -> None:
            raise AssertionError(f"Unexpected info log: {message}")

        def exception(self, message: str) -> None:
            self.exceptions.append(message)

    logger = FakeLogger()

    class FakeConfigurationService:
        def __init__(self, repository) -> None:
            pass

        def get_runtime_configuration(self):
            return SimpleNamespace(noticias_caducidad_dias=30)

    class FailingPurgeService:
        def __init__(self, repository) -> None:
            pass

        def purge_expired(self, retention_days: int) -> int:
            raise RuntimeError("database unavailable")

    monkeypatch.setattr(scheduler_module, "get_session_factory", lambda: lambda: session)
    monkeypatch.setattr(scheduler_module, "ConfigurationService", FakeConfigurationService)
    monkeypatch.setattr(scheduler_module, "NewsPurgeService", FailingPurgeService)
    monkeypatch.setattr(scheduler_module, "logger", logger)

    assert scheduler_module.run_purge_job() is None
    assert session.rollbacks == 1
    assert logger.exceptions == ["News purge failed"]


def test_purge_job_does_not_delete_when_retention_configuration_is_invalid(
    monkeypatch,
) -> None:
    session = FakeSession()
    purge_calls: list[int] = []

    class InvalidConfigurationService:
        def __init__(self, repository) -> None:
            pass

        def get_runtime_configuration(self):
            raise ValueError("caducidad invalida")

    class FakePurgeService:
        def __init__(self, repository) -> None:
            pass

        def purge_expired(self, retention_days: int) -> int:
            purge_calls.append(retention_days)
            return 0

    monkeypatch.setattr(scheduler_module, "get_session_factory", lambda: lambda: session)
    monkeypatch.setattr(
        scheduler_module, "ConfigurationService", InvalidConfigurationService
    )
    monkeypatch.setattr(scheduler_module, "NewsPurgeService", FakePurgeService)

    assert scheduler_module.run_purge_job() is None
    assert purge_calls == []
    assert session.rollbacks == 1
