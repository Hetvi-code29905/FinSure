# app/services/risk_service.py
"""
Computes a composite risk score (0–100) across 5 dimensions:
  1. Income stability      — variance in monthly income
  2. Expense volatility    — coefficient of variation in monthly expenses
  3. Savings adequacy      — income vs expense ratio
  4. Debt exposure         — transfers/fees as % of income
  5. Behavioral drift      — PSI against historical baseline (set to 0 if not computed)

Higher score = higher risk.
"""
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import Collections
from app.core.logging import get_logger
from app.repositories.transaction_repository import TransactionRepository

logger = get_logger(__name__)

RISK_THRESHOLDS = {"Low": 34, "Moderate": 67}   # < 34 = Low, 34–67 = Moderate, > 67 = High
RISK_COLORS     = {"Low": "#10b981", "Moderate": "#f59e0b", "High": "#ef4444"}


def _category(score: float) -> str:
    if score < RISK_THRESHOLDS["Low"]:
        return "Low"
    if score < RISK_THRESHOLDS["Moderate"]:
        return "Moderate"
    return "High"


class RiskService:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db       = db
        self.txn_repo = TransactionRepository(db)
        self.col      = db[Collections.RISK_SCORES]

    async def compute_and_store(self, user_id: str, force: bool = False) -> dict:
        # Avoid recompute if done in the last 6 hours
        if not force:
            latest = await self.col.find_one(
                {"user_id": user_id}, sort=[("computed_at", -1)]
            )
            if latest:
                computed_at = latest["computed_at"]
                if computed_at.tzinfo is None:
                    computed_at = computed_at.replace(tzinfo=timezone.utc)
                age_h = (datetime.now(timezone.utc) - computed_at).total_seconds() / 3600
                if age_h < settings.RISK_SCORE_UPDATE_INTERVAL_HOURS:
                    return self._serialize(latest)

        txns = await self.txn_repo.find_for_ml(user_id, days=90)
        if len(txns) < settings.MIN_TRANSACTIONS_FOR_ML:
            logger.info("Not enough transactions for risk score", extra={"user_id": user_id, "count": len(txns)})
            return {}

        scores = self._compute_scores(txns)
        composite = round(np.mean(list(scores.values())), 1)
        cat       = _category(composite)

        doc = {
            "user_id":                  user_id,
            "composite_score":          composite,
            "risk_category":            cat,
            "score_color":              RISK_COLORS[cat],
            **scores,
            "transaction_count":        len(txns),
            "days_analyzed":            90,
            "computed_at":              datetime.now(timezone.utc),
        }
        await self.col.insert_one(doc)
        logger.info("Risk score computed", extra={"user_id": user_id, "score": composite, "category": cat})
        return self._serialize(doc)

    def _compute_scores(self, txns: list[dict]) -> dict:
        amounts = [t["amount"] for t in txns]
        income_txns  = [abs(a) for a in amounts if a < 0]
        expense_txns = [a for a in amounts if a > 0]

        # 1. Income stability (CV of monthly income — higher CV = more risk)
        monthly_income = self._monthly_totals([t for t in txns if t["amount"] < 0])
        income_cv      = self._coefficient_of_variation(list(monthly_income.values()))
        income_score   = min(100, income_cv * 100)

        # 2. Expense volatility (CV of monthly expenses)
        monthly_exp    = self._monthly_totals([t for t in txns if t["amount"] > 0])
        expense_cv     = self._coefficient_of_variation(list(monthly_exp.values()))
        expense_score  = min(100, expense_cv * 80)

        # 3. Savings adequacy (expense / income ratio → 0 = great, 100 = broke)
        total_income   = sum(income_txns) or 1
        total_expense  = sum(expense_txns)
        ratio          = total_expense / total_income
        savings_score  = min(100, max(0, (ratio - 0.5) * 100))

        # 4. Debt / fees exposure (categories as % of income)
        debt_cats     = {"Transfers", "Fees & Charges"}
        debt_total    = sum(t["amount"] for t in txns
                            if t.get("category") in debt_cats and t["amount"] > 0)
        debt_score    = min(100, (debt_total / total_income) * 200)

        # 5. Behavioral drift (placeholder — updated by drift detector)
        drift_score   = 0.0

        return {
            "income_stability_score":   round(income_score, 1),
            "expense_volatility_score": round(expense_score, 1),
            "savings_adequacy_score":   round(savings_score, 1),
            "debt_exposure_score":      round(debt_score, 1),
            "behavioral_drift_score":   round(drift_score, 1),
        }

    @staticmethod
    def _monthly_totals(txns: list[dict]) -> dict[str, float]:
        totals: dict[str, float] = {}
        for t in txns:
            month = t.get("date", "")[:7]   # "YYYY-MM"
            totals[month] = totals.get(month, 0) + abs(t["amount"])
        return totals

    @staticmethod
    def _coefficient_of_variation(values: list[float]) -> float:
        if len(values) < 2:
            return 0.0
        arr  = np.array(values)
        mean = arr.mean()
        if mean == 0:
            return 0.0
        return float(arr.std() / mean)

    @staticmethod
    def _serialize(doc: dict) -> dict:
        return {
            "id":                       str(doc.get("_id", "")),
            "user_id":                  doc.get("user_id"),
            "composite_score":          doc.get("composite_score"),
            "risk_category":            doc.get("risk_category"),
            "score_color":              doc.get("score_color"),
            "income_stability_score":   doc.get("income_stability_score"),
            "expense_volatility_score": doc.get("expense_volatility_score"),
            "savings_adequacy_score":   doc.get("savings_adequacy_score"),
            "debt_exposure_score":      doc.get("debt_exposure_score"),
            "behavioral_drift_score":   doc.get("behavioral_drift_score"),
            "transaction_count":        doc.get("transaction_count"),
            "days_analyzed":            doc.get("days_analyzed"),
            "computed_at":              doc["computed_at"].isoformat()
                                        if isinstance(doc.get("computed_at"), datetime)
                                        else doc.get("computed_at"),
        }

    async def get_history(self, user_id: str, limit: int = 30) -> list[dict]:
        cursor = self.col.find({"user_id": user_id}).sort("computed_at", -1).limit(limit)
        docs   = await cursor.to_list(length=limit)
        return [self._serialize(d) for d in docs]