# app/services/forecast_service.py
"""
Cash flow forecasting service.
Uses Prophet (via ml/forecasting/engine.py) to generate 30-day balance projections.
Falls back to a simple linear trend if insufficient data.
"""
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import Collections
from app.core.logging import get_logger
from app.repositories.account_repository import AccountRepository
from app.repositories.transaction_repository import TransactionRepository

logger = get_logger(__name__)


class ForecastService:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db       = db
        self.txn_repo = TransactionRepository(db)
        self.acc_repo = AccountRepository(db)
        self.col      = db[Collections.FORECASTS]

    async def generate_and_store(
        self,
        user_id: str,
        horizon_days: int = 30,
        force: bool = False,
    ) -> dict:
        # Skip if a recent forecast exists (within 12 hours)
        if not force:
            latest = await self.col.find_one(
                {"user_id": user_id}, sort=[("generated_at", -1)]
            )
            if latest:
                generated_at = latest["generated_at"]
                if generated_at.tzinfo is None:
                    generated_at = generated_at.replace(tzinfo=timezone.utc)
                age_h = (datetime.now(timezone.utc) - generated_at).total_seconds() / 3600
                if age_h < settings.FORECAST_UPDATE_INTERVAL_HOURS:
                    return self._serialize(latest)

        txns = await self.txn_repo.find_for_ml(user_id, days=180)
        if len(txns) < settings.MIN_TRANSACTIONS_FOR_ML:
            logger.info("Not enough data for forecast", extra={"user_id": user_id})
            return {}

        current_balance = await self.acc_repo.total_balance_for_user(user_id)
        result          = await self._run_forecast(txns, current_balance, horizon_days)
        result["user_id"]      = user_id
        result["generated_at"] = datetime.now(timezone.utc)

        await self.col.insert_one(result)
        logger.info("Forecast generated", extra={
            "user_id": user_id,
            "runway":  result.get("estimated_runway_days"),
            "risk":    result.get("risk_alert"),
        })
        return self._serialize(result)

    async def get_latest(self, user_id: str) -> Optional[dict]:
        doc = await self.col.find_one({"user_id": user_id}, sort=[("generated_at", -1)])
        return self._serialize(doc) if doc else None

    async def _run_forecast(
        self,
        txns: list[dict],
        current_balance: float,
        horizon_days: int,
    ) -> dict:
        try:
            from app.ml.forecasting.engine import ForecastEngine
            engine = ForecastEngine()
            return engine.forecast(txns, current_balance, horizon_days)
        except Exception as e:
            logger.warning("Prophet forecast failed, using linear fallback",
                           extra={"error": str(e)})
            return self._linear_fallback(txns, current_balance, horizon_days)

    def _linear_fallback(
        self,
        txns: list[dict],
        current_balance: float,
        horizon_days: int,
    ) -> dict:
        """
        Month-wise cash flow projection.
        Uses the transaction `type` field (income/expense) to correctly classify
        transactions and project balance forward month by month.
        """
        import statistics
        from datetime import timedelta

        # ── 1. Build per-month income & expense sums from transaction history ─
        monthly: dict = {}
        for t in txns:
            raw_date = t.get("date", "")[:7]  # "YYYY-MM"
            if not raw_date:
                continue
            monthly.setdefault(raw_date, {"inc": 0.0, "exp": 0.0})
            amt = abs(t.get("amount", 0))
            txn_type = t.get("type", "expense")
            # Classify: use `type` field first; fall back to sign convention
            if txn_type == "income" or t.get("amount", 0) < 0:
                monthly[raw_date]["inc"] += amt
            else:
                monthly[raw_date]["exp"] += amt

        months_data = list(monthly.values())
        avg_mo_income  = statistics.mean([m["inc"] for m in months_data]) if months_data else 0
        avg_mo_expense = statistics.mean([m["exp"] for m in months_data]) if months_data else 0

        avg_daily_spend  = avg_mo_expense / 30 if avg_mo_expense > 0 else 0
        avg_daily_income = avg_mo_income  / 30 if avg_mo_income  > 0 else 0
        net_daily        = avg_daily_income - avg_daily_spend

        # ── 2. Build month-by-month (day-by-day) projections ─────────────────
        projections = []
        balance     = current_balance
        today       = datetime.now(timezone.utc).date()
        depletion   = None
        shortage_days = 0

        for i in range(1, horizon_days + 1):
            balance  += net_daily
            day_str   = (today + timedelta(days=i)).isoformat()
            if balance <= 0 and depletion is None:
                depletion = day_str
            if balance <= 0:
                shortage_days += 1
            projections.append({
                "date":              day_str,
                "predicted_balance": round(balance, 2),
                "lower_bound":       round(balance * 0.85, 2),
                "upper_bound":       round(balance * 1.15, 2),
                "is_negative":       balance < 0,
            })

        # ── 3. Compute summary metrics ────────────────────────────────────────
        shortage_prob = shortage_days / max(horizon_days, 1)

        # Runway: days until balance hits zero at current net burn
        if net_daily < 0 and current_balance > 0:
            runway = min(int(current_balance / abs(net_daily)), 999)
        elif avg_daily_spend > 0 and net_daily >= 0:
            runway = 999  # income >= spending — sustainable
        else:
            runway = 999  # no spend data — safe default

        return {
            "current_balance":          round(current_balance, 2),
            "daily_projections":        projections,
            "depletion_date":           depletion,
            "shortage_probability":     round(shortage_prob, 4),
            "shortage_probability_pct": round(shortage_prob * 100, 1),
            "estimated_runway_days":    runway,
            "runway_label":             f"{runway} days" if runway < 999 else "Stable",
            "risk_alert":               shortage_prob > 0.3 or depletion is not None,
            "avg_daily_spend":          round(avg_daily_spend, 2),
            "avg_monthly_income":       round(avg_mo_income, 2),
            "avg_monthly_expense":      round(avg_mo_expense, 2),
            "data_points_used":         len(txns),
            "horizon_days":             horizon_days,
        }

    @staticmethod
    def _serialize(doc: dict) -> dict:
        def _iso(v):
            return v.isoformat() if isinstance(v, datetime) else v
        return {
            "id":                       str(doc.get("_id", "")),
            "user_id":                  doc.get("user_id"),
            "current_balance":          doc.get("current_balance"),
            "daily_projections":        doc.get("daily_projections", []),
            "depletion_date":           doc.get("depletion_date"),
            "shortage_probability":     doc.get("shortage_probability"),
            "shortage_probability_pct": doc.get("shortage_probability_pct"),
            "estimated_runway_days":    doc.get("estimated_runway_days"),
            "runway_label":             doc.get("runway_label"),
            "risk_alert":               doc.get("risk_alert"),
            "avg_daily_spend":          doc.get("avg_daily_spend"),
            "avg_monthly_income":       doc.get("avg_monthly_income"),
            "avg_monthly_expense":      doc.get("avg_monthly_expense"),
            "data_points_used":         doc.get("data_points_used"),
            "horizon_days":             doc.get("horizon_days"),
            "generated_at":             _iso(doc.get("generated_at")),
        }