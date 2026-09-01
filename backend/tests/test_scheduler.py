from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.scheduler import CaptureScheduler
from app.services.configuration import NullCaptureSchedule


def test_schedules_reschedules_and_shuts_down_without_immediate_run() -> None:
    calls: list[datetime] = []
    scheduler = CaptureScheduler(job=lambda: calls.append(datetime.now(UTC)))
    scheduler.start(15)
    try:
        job = scheduler.get_job()
        assert job is not None
        assert job.trigger.interval.total_seconds() == 15 * 60
        assert job.max_instances == 1
        assert job.coalesce is True
        assert job.next_run_time > datetime.now(UTC)
        assert calls == []

        scheduler.reschedule(5)
        assert scheduler.get_job().trigger.interval.total_seconds() == 5 * 60
        assert scheduler.get_job().next_run_time > datetime.now(UTC)
        assert calls == []
    finally:
        scheduler.shutdown()


def test_rejects_reschedule_before_start() -> None:
    with pytest.raises(RuntimeError, match="no esta iniciado"):
        CaptureScheduler(job=lambda: None).reschedule(5)


def test_fastapi_lifespan_can_disable_scheduler() -> None:
    with TestClient(app):
        assert isinstance(app.state.capture_scheduler, NullCaptureSchedule)
