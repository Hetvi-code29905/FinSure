# app/repositories/transaction_repository.py
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import DESCENDING

from app.core.database import Collections
from app.repositories.base import BaseRepository


class TransactionRepository(BaseRepository):

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, Collections.TRANSACTIONS)

    # ── Queries ───────────────────────────────────────────────

    async def find_for_user(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        anomalies_only: bool = False,
        account_id: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
    ) -> tuple[list[dict], int]:
        query: dict = {"user_id": user_id}

        if date_from or date_to:
            query["date"] = {}
            if date_from:
                query["date"]["$gte"] = date_from
            if date_to:
                query["date"]["$lte"] = date_to

        if category:
            query["category"] = category
        if anomalies_only:
            query["is_anomaly"] = True
        if account_id:
            query["account_id"] = account_id
        if search:
            query["$or"] = [
                {"name":          {"$regex": search, "$options": "i"}},
                {"merchant_name": {"$regex": search, "$options": "i"}},
            ]
        if min_amount is not None or max_amount is not None:
            query["amount"] = {}
            if min_amount is not None:
                query["amount"]["$gte"] = min_amount
            if max_amount is not None:
                query["amount"]["$lte"] = max_amount

        return await self.paginate(query, page, limit, sort=[("date", DESCENDING)])

    async def find_for_ml(self, user_id: str, days: int = 90) -> list[dict]:
        """Fetch recent transactions for ML training/inference."""
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        cursor = self.collection.find(
            {"user_id": user_id, "date": {"$gte": cutoff}, "is_pending": {"$ne": True}},
            {"amount": 1, "date": 1, "category": 1, "name": 1},
        ).sort("date", DESCENDING)
        return await cursor.to_list(length=None)

    async def get_existing_signatures_for_dedup(
        self, user_id: str, date_from: str, date_to: str
    ) -> set[tuple[float, str, str]]:
        """
        Returns a set of (amount, date, name) to prevent duplicate imports 
        from overlapping CSVs or SMS parsing.
        """
        cursor = self.collection.find(
            {
                "user_id": user_id,
                "date": {"$gte": date_from, "$lte": date_to}
            },
            {"amount": 1, "date": 1, "name": 1},
        )
        docs = await cursor.to_list(length=None)
        return {(d["amount"], d["date"], d["name"]) for d in docs}

    # ── Spending summary ──────────────────────────────────────

    async def spending_summary(
        self,
        user_id: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> dict:
        match: dict = {"user_id": user_id, "is_pending": {"$ne": True}}
        if date_from or date_to:
            match["date"] = {}
            if date_from:
                match["date"]["$gte"] = date_from
            if date_to:
                match["date"]["$lte"] = date_to

        pipeline = [
            {"$match": match},
            {"$group": {
                "_id":           "$category",
                "total":         {"$sum": "$amount"},
                "count":         {"$sum": 1},
                "anomaly_count": {"$sum": {"$cond": ["$is_anomaly", 1, 0]}},
            }},
        ]
        result = await self.collection.aggregate(pipeline).to_list(length=None)

        by_category: dict = {}
        total_expenses = 0.0
        total_income   = 0.0
        anomaly_count  = 0

        for row in result:
            cat   = row["_id"] or "Uncategorized"
            total = row["total"]
            by_category[cat] = round(abs(total), 2)
            if total > 0:
                total_expenses += total
            else:
                total_income += abs(total)
            anomaly_count += row["anomaly_count"]

        # Monthly breakdown
        month_pipeline = [
            {"$match": match},
            {"$group": {
                "_id":      {"$substr": ["$date", 0, 7]},   # "YYYY-MM"
                "expenses": {"$sum": {"$cond": [{"$gt": ["$amount", 0]}, "$amount", 0]}},
                "income":   {"$sum": {"$cond": [{"$lt": ["$amount", 0]}, "$amount", 0]}},
                "count":    {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]
        months_raw = await self.collection.aggregate(month_pipeline).to_list(length=None)
        by_month = {
            r["_id"]: {
                "expenses": round(r["expenses"], 2),
                "income":   round(abs(r["income"]), 2),
                "count":    r["count"],
            }
            for r in months_raw
        }

        return {
            "total_expenses": round(total_expenses, 2),
            "total_income":   round(total_income, 2),
            "by_category":    by_category,
            "by_month":       by_month,
            "anomaly_count":  anomaly_count,
            "date_from":      date_from,
            "date_to":        date_to,
        }

    # ── ML helpers ────────────────────────────────────────────

    async def bulk_update_anomaly_scores(
        self,
        updates: list[dict],   # [{"id": "...", "score": 0.7, "is_anomaly": True}]
    ) -> int:
        from pymongo import UpdateOne
        ops = [
            UpdateOne(
                {"_id": self.to_oid(u["id"])},
                {"$set": {
                    "anomaly_score":      u["score"],
                    "is_anomaly":         u["is_anomaly"],
                    "anomaly_flagged_at": datetime.now(timezone.utc),
                    "updated_at":         datetime.now(timezone.utc),
                }},
            )
            for u in updates
        ]
        if not ops:
            return 0
        result = await self.collection.bulk_write(ops, ordered=False)
        return result.modified_count