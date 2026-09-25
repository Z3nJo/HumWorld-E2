import logging
from collections.abc import Callable
from datetime import UTC
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler

from app.database import get_session_factory
from app.repositories import (
    ConfigurationRepository,
    NewsCaptureRepository,
    NewsPurgeRepository,
)
from app.services.capture import HttpxFeedparserClient, NewsCaptureService
from app.services.configuration import ConfigurationService
from app.services.purging import NewsPurgeService

logger = logging.getLogger(__name__)
CAPTURE_JOB_ID = "rss-news-capture"
PURGE_JOB_ID = "news-purging"


def run_capture_job() -> None:
    with get_session_factory()() as session:
        service = NewsCaptureService(
            NewsCaptureRepository(session),
            HttpxFeedparserClient(),
        )
        report = service.capture_active_sources()
        recovered = service.process_pending_news()
    logger.info(
        "RSS capture completed: sources=%s inserted=%s failed=%s recovered=%s",
        len(report.sources),
        report.inserted,
        report.failed_sources,
        recovered,
    )


def run_purge_job() -> int | None:
    with get_session_factory()() as session:
        try:
            retention_days = ConfigurationService(
                ConfigurationRepository(session)
            ).get_runtime_configuration().noticias_caducidad_dias
            deleted = NewsPurgeService(NewsPurgeRepository(session)).purge_expired(
                retention_days
            )
        except Exception:
            session.rollback()
            logger.exception("News purge failed")
            return None
    logger.info("News purge completed: deleted=%s", deleted)
    return deleted


def read_capture_periodicity() -> int:
    with get_session_factory()() as session:
        config = ConfigurationService(
            ConfigurationRepository(session)
        ).get_runtime_configuration()
    return config.captura_periodicidad_minutos


class CaptureScheduler:
    def __init__(
        self,
        job: Callable[[], None] = run_capture_job,
        purge_job: Callable[[], object] = run_purge_job,
        scheduler: BackgroundScheduler | None = None,
    ) -> None:
        self._job = job
        self._purge_job = purge_job
        self._scheduler = scheduler or BackgroundScheduler(timezone=UTC)
        self._started = False

    def start(self, periodicity_minutes: int) -> None:
        self._scheduler.add_job(
            self._job,
            trigger="interval",
            minutes=periodicity_minutes,
            id=CAPTURE_JOB_ID,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        self._scheduler.add_job(
            self._purge_job,
            trigger="interval",
            minutes=periodicity_minutes,
            id=PURGE_JOB_ID,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        self._scheduler.start()
        self._started = True

    def reschedule(self, periodicity_minutes: int) -> None:
        if not self._started:
            raise RuntimeError("El scheduler de captura no esta iniciado")
        self._scheduler.reschedule_job(
            CAPTURE_JOB_ID,
            trigger="interval",
            minutes=periodicity_minutes,
        )
        self._scheduler.reschedule_job(
            PURGE_JOB_ID,
            trigger="interval",
            minutes=periodicity_minutes,
        )

    def shutdown(self) -> None:
        if self._started:
            self._scheduler.shutdown(wait=False)
            self._started = False

    def get_job(self, job_id: str = CAPTURE_JOB_ID) -> Any:
        return self._scheduler.get_job(job_id)
