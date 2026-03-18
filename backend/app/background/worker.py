# app/background/worker.py
"""
APScheduler setup.
Registers all jobs with staggered start times so they don't collide.
Called from main.py lifespan: await start_scheduler() / await stop_scheduler()
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.logging import get_logger

# Import task functions directly — AsyncIOScheduler does NOT support
# string-based job references (those only work with BackgroundScheduler).
from app.background.tasks import (
    task_run_anomaly_detection,
    task_compute_risk_scores,
    task_generate_forecasts,
    task_check_drift,
    task_hard_delete_users,
)

logger    = get_logger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


def _register_jobs() -> None:

    scheduler.add_job(
        task_run_anomaly_detection,
        trigger=IntervalTrigger(hours=settings.TRANSACTION_SYNC_INTERVAL_HOURS,
                                minutes=15),
        id="anomaly_detection", replace_existing=True, misfire_grace_time=300,
    )
    scheduler.add_job(
        task_compute_risk_scores,
        trigger=IntervalTrigger(hours=settings.RISK_SCORE_UPDATE_INTERVAL_HOURS,
                                minutes=30),
        id="risk_scoring", replace_existing=True, misfire_grace_time=300,
    )
    scheduler.add_job(
        task_generate_forecasts,
        trigger=IntervalTrigger(hours=settings.FORECAST_UPDATE_INTERVAL_HOURS),
        id="generate_forecasts", replace_existing=True, misfire_grace_time=600,
    )
    scheduler.add_job(
        task_check_drift,
        trigger=CronTrigger(hour=2, minute=0),
        id="drift_check", replace_existing=True, misfire_grace_time=3600,
    )

    scheduler.add_job(
        task_hard_delete_users,
        trigger=CronTrigger(hour=4, minute=0),
        id="hard_delete_users", replace_existing=True,
    )
    logger.info("Background jobs registered",
                extra={"count": len(scheduler.get_jobs())})


async def start_scheduler() -> None:
    _register_jobs()
    scheduler.start()
    logger.info("APScheduler started")


async def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")