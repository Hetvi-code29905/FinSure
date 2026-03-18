# app/background/tasks.py
"""
All APScheduler job functions.
Each job is a standalone async function — imported and registered by worker.py.
Every job wraps its logic in try/except so one failure never kills the scheduler.
"""
from app.core.database import get_db_context
from app.core.logging import get_logger

logger = get_logger(__name__)



# ── Anomaly detection (every 6 h, 15 min after sync) ─────────

async def task_run_anomaly_detection() -> None:
    logger.info("TASK: anomaly_detection started")
    success = failed = 0
    async with get_db_context() as db:
        from app.repositories.user_repository import UserRepository
        from app.services.ml_orchestrator import MLOrchestrator
        users = await UserRepository(db).get_all_active_users()
        orch  = MLOrchestrator(db)
        for u in users:
            uid = str(u["_id"])
            try:
                await orch.run_anomaly_detection(uid)
                success += 1
            except Exception as e:
                logger.error("anomaly failed", extra={"user_id": uid, "error": str(e)})
                failed += 1
    logger.info("TASK: anomaly_detection done", extra={"success": success, "failed": failed})


# ── Risk scoring (every 6 h, 30 min after sync) ───────────────

async def task_compute_risk_scores() -> None:
    logger.info("TASK: risk_scoring started")
    async with get_db_context() as db:
        from app.services.ml_orchestrator import MLOrchestrator
        result = await MLOrchestrator(db).run_batch_risk()
    logger.info("TASK: risk_scoring done", extra=result)


# ── Forecast (every 12 h) ─────────────────────────────────────

async def task_generate_forecasts() -> None:
    logger.info("TASK: forecasts started")
    async with get_db_context() as db:
        from app.services.ml_orchestrator import MLOrchestrator
        result = await MLOrchestrator(db).run_batch_forecast()
    logger.info("TASK: forecasts done", extra=result)


# ── Drift detection (daily 2 AM UTC) ─────────────────────────

async def task_check_drift() -> None:
    logger.info("TASK: drift_check started")
    async with get_db_context() as db:
        from app.ml.lifecycle.monitor import DriftMonitor
        result = await DriftMonitor(db).check_all_users()
        if result.get("drift_detected_count", 0) > 0:
            logger.warning("Drift detected — triggering anomaly retraining",
                           extra=result)
            from app.services.ml_orchestrator import MLOrchestrator
            await MLOrchestrator(db).run_batch_anomaly()
    logger.info("TASK: drift_check done", extra=result)



# ── GDPR hard delete (daily 4 AM UTC) ────────────────────────

async def task_hard_delete_users() -> None:
    logger.info("TASK: hard_delete started")
    deleted = 0
    async with get_db_context() as db:
        from app.core.database import Collections
        from app.repositories.user_repository import UserRepository
        users = await UserRepository(db).get_pending_hard_delete(older_than_days=30)
        for u in users:
            uid = str(u["_id"])
            try:
                # Hard delete all user data
                for col in [Collections.TRANSACTIONS, Collections.ACCOUNTS,
                            Collections.RISK_SCORES,
                            Collections.FORECASTS, Collections.ALERTS,
                            Collections.REFRESH_TOKENS]:
                    await db[col].delete_many({"user_id": uid})
                from bson import ObjectId
                await db[Collections.USERS].delete_one({"_id": ObjectId(uid)})
                deleted += 1
            except Exception as e:
                logger.error("hard_delete failed", extra={"user_id": uid, "error": str(e)})
    logger.info("TASK: hard_delete done", extra={"deleted": deleted})