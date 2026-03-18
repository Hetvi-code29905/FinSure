# app/repositories/account_repository.py
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import Collections
from app.repositories.base import BaseRepository


class AccountRepository(BaseRepository):

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, Collections.ACCOUNTS)

    async def find_by_user(self, user_id: str, active_only: bool = True) -> list[dict]:
        query: dict = {"user_id": user_id}
        if active_only:
            query["is_active"] = True
        return await self.find_many(query, sort=[("created_at", 1)])

    async def find_by_plaid_account_id(self, plaid_account_id_enc: str) -> Optional[dict]:
        return await self.find_one({"plaid_account_id": plaid_account_id_enc})

    async def upsert_account(self, plaid_account_id_enc: str, doc: dict) -> str:
        return await self.upsert({"plaid_account_id": plaid_account_id_enc}, doc)

    async def update_balance(
        self,
        account_id: str,
        current_balance: Optional[float],
        available_balance: Optional[float],
    ) -> None:
        now = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": self.to_oid(account_id)},
            {"$set": {
                "current_balance":   current_balance,
                "available_balance": available_balance,
                "last_synced_at":    now,
                "updated_at":        now,
            }},
        )

    async def total_balance_for_user(self, user_id: str) -> float:
        """
        Sum balances across all active accounts.
        Manual accounts use 'balance'; Plaid-linked accounts use 'current_balance'.
        We use $ifNull to handle both in one pipeline.
        """
        pipeline = [
            {"$match": {"user_id": user_id, "is_active": True}},
            {"$group": {
                "_id": None,
                "total": {"$sum": {
                    "$ifNull": ["$balance", {"$ifNull": ["$current_balance", 0]}]
                }},
            }},
        ]
        result = await self.collection.aggregate(pipeline).to_list(length=1)
        return result[0]["total"] if result else 0.0