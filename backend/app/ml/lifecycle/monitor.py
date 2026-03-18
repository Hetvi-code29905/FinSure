# app/ml/lifecycle/monitor.py
"""
Drift monitor — detects behavioral drift using PSI (Population Stability Index).
If drift is detected, flags it so the background worker can trigger retraining.
"""
import numpy as np
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import Collections
from app.core.logging import get_logger
from app.repositories.transaction_repository import TransactionRepository

logger = get_logger(__name__)


def _psi(expected: np.ndarray, actual: np.ndarray, buckets: int = 10) -> float:
    """
    Population Stability Index between two distributions.
    PSI < 0.1  = no drift
    PSI < 0.2  = slight drift
    PSI >= 0.2 = significant drift (trigger retrain)
    """
    def _bucketize(arr: np.ndarray) -> np.ndarray:
        arr = arr[~np.isnan(arr)]
        if len(arr) == 0:
            return np.ones(buckets) / buckets
        percentiles = np.percentile(arr, np.linspace(0, 100, buckets + 1))
        counts, _   = np.histogram(arr, bins=percentiles)
        pct         = counts / len(arr)
        pct         = np.where(pct == 0, 1e-6, pct)  # avoid log(0)
        return pct

    exp_pct = _bucketize(expected)
    act_pct = _bucketize(actual)
    return float(np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct)))


class DriftMonitor:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db       = db
        self.txn_repo = TransactionRepository(db)

    async def check_user(self, user_id: str) -> dict:
        """
        Compare spending distribution of the last 30 days vs the prior 60 days.
        Returns drift metrics and whether retraining is recommended.
        """
        recent_txns   = await self.txn_repo.find_for_ml(user_id, days=30)
        baseline_txns = await self.txn_repo.find_for_ml(user_id, days=90)

        # Exclude recent 30 days from baseline
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
        baseline_txns = [t for t in baseline_txns if t.get("date", "") < cutoff]

        if len(recent_txns) < 10 or len(baseline_txns) < 10:
            return {"drift_detected": False, "reason": "insufficient_data",
                    "psi": 0.0, "user_id": user_id}

        recent_amounts   = np.array([t["amount"] for t in recent_txns],   dtype=float)
        baseline_amounts = np.array([t["amount"] for t in baseline_txns], dtype=float)

        psi = _psi(baseline_amounts, recent_amounts)
        drift_detected = psi >= settings.DRIFT_PSI_THRESHOLD

        if drift_detected:
            logger.warning("Drift detected", extra={
                "user_id": user_id, "psi": round(psi, 4)
            })
            # Update behavioral drift score in latest risk document
            await self.db[Collections.RISK_SCORES].update_one(
                {"user_id": user_id},
                {"$set": {"behavioral_drift_score": min(100.0, psi * 200)}},
                sort=[("computed_at", -1)],
            )

        return {
            "drift_detected": drift_detected,
            "psi":            round(psi, 4),
            "threshold":      settings.DRIFT_PSI_THRESHOLD,
            "recent_samples": len(recent_txns),
            "baseline_samples": len(baseline_txns),
            "user_id":        user_id,
        }

    async def check_all_users(self) -> dict:
        """Run drift check for every active Plaid-linked user."""
        from app.repositories.user_repository import UserRepository
        users = await UserRepository(self.db).get_all_active_users()

        total = drift_count = 0
        for u in users:
            try:
                result = await self.check_user(str(u["_id"]))
                if result.get("drift_detected"):
                    drift_count += 1
                total += 1
            except Exception as e:
                logger.error("Drift check failed", extra={
                    "user_id": str(u["_id"]), "error": str(e)
                })

        return {"total_checked": total, "drift_detected_count": drift_count}