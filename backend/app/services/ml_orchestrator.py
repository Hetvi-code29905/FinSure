# app/services/ml_orchestrator.py
"""
ML Orchestrator — coordinates anomaly detection, risk scoring, and forecasting.
Called by background tasks and on-demand from endpoints.
"""
from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.logging import get_logger
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.user_repository import UserRepository
from app.services.forecast_service import ForecastService
from app.services.risk_service import RiskService

logger = get_logger(__name__)


class MLOrchestrator:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db       = db
        self.txn_repo = TransactionRepository(db)
        self.usr_repo = UserRepository(db)

    # ── Anomaly detection ─────────────────────────────────────

    async def run_anomaly_detection(self, user_id: str) -> dict:
        """
        Run Isolation Forest on user transactions.
        Updates is_anomaly + anomaly_score fields in place.
        """
        txns = await self.txn_repo.find_for_ml(user_id, days=90)
        if len(txns) < settings.MIN_TRANSACTIONS_FOR_ML:
            return {"status": "skipped", "reason": "insufficient_data", "count": len(txns)}

        try:
            from app.ml.anomaly.detector import AnomalyDetector
            from app.ml.anomaly.processor import AnomalyPreprocessor

            processor  = AnomalyPreprocessor()
            X, ids     = processor.transform(txns)
            detector   = AnomalyDetector()
            scores, flags = detector.predict(X)

            updates = [
                {"id": ids[i], "score": float(scores[i]), "is_anomaly": bool(flags[i])}
                for i in range(len(ids))
            ]
            updated = await self.txn_repo.bulk_update_anomaly_scores(updates)
            anomaly_count = sum(1 for u in updates if u["is_anomaly"])

            logger.info("Anomaly detection complete", extra={
                "user_id": user_id, "updated": updated, "anomalies": anomaly_count
            })
            return {"status": "ok", "updated": updated, "anomalies": anomaly_count}

        except Exception as e:
            logger.error("Anomaly detection failed", extra={"user_id": user_id, "error": str(e)})
            return {"status": "error", "error": str(e)}

    # ── Risk score ────────────────────────────────────────────

    async def run_risk_scoring(self, user_id: str, force: bool = False) -> dict:
        try:
            return await RiskService(self.db).compute_and_store(user_id, force=force)
        except Exception as e:
            logger.error("Risk scoring failed", extra={"user_id": user_id, "error": str(e)})
            return {"status": "error", "error": str(e)}

    # ── Forecast ──────────────────────────────────────────────

    async def run_forecast(self, user_id: str, force: bool = False) -> dict:
        try:
            return await ForecastService(self.db).generate_and_store(user_id, force=force)
        except Exception as e:
            logger.error("Forecast failed", extra={"user_id": user_id, "error": str(e)})
            return {"status": "error", "error": str(e)}

    # ── Full pipeline for one user ────────────────────────────

    async def run_full_pipeline(self, user_id: str, force: bool = False) -> dict:
        """Run anomaly → risk → forecast sequentially for one user."""
        anomaly  = await self.run_anomaly_detection(user_id)
        risk     = await self.run_risk_scoring(user_id, force=force)
        forecast = await self.run_forecast(user_id, force=force)
        return {"anomaly": anomaly, "risk": risk, "forecast": forecast}

    # ── Batch: all plaid-linked users ────────────────────────

    async def run_batch_risk(self) -> dict:
        users    = await self.usr_repo.get_all_active_users()
        success  = failed = 0
        for u in users:
            try:
                await self.run_risk_scoring(str(u["_id"]))
                success += 1
            except Exception:
                failed += 1
        return {"success": success, "failed": failed}

    async def run_batch_forecast(self) -> dict:
        users   = await self.usr_repo.get_all_active_users()
        success = failed = 0
        for u in users:
            try:
                await self.run_forecast(str(u["_id"]))
                success += 1
            except Exception:
                failed += 1
        return {"success": success, "failed": failed}

    async def run_batch_anomaly(self) -> dict:
        users   = await self.usr_repo.get_all_active_users()
        success = failed = 0
        for u in users:
            try:
                await self.run_anomaly_detection(str(u["_id"]))
                success += 1
            except Exception:
                failed += 1
        return {"success": success, "failed": failed}