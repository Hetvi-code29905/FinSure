# app/repositories/user_repository.py
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import Collections
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, Collections.USERS)

    async def find_by_email(self, email: str) -> Optional[dict]:
        return await self.find_one({"email": email.lower().strip()})

    async def find_active_by_id(self, user_id: str) -> Optional[dict]:
        return await self.find_one({
            "_id":        self.to_oid(user_id),
            "is_active":  True,
            "deleted_at": None,
        })

    async def email_exists(self, email: str, exclude_id: Optional[str] = None) -> bool:
        query: dict = {"email": email.lower().strip()}
        if exclude_id:
            query["_id"] = {"$ne": self.to_oid(exclude_id)}
        return await self.find_one(query) is not None

    async def increment_failed_attempts(self, user_id: str, lock_until: Optional[datetime] = None) -> None:
        update: dict = {"$inc": {"failed_login_attempts": 1}}
        if lock_until:
            update["$set"] = {"locked_until": lock_until}
        await self.collection.update_one({"_id": self.to_oid(user_id)}, update)

    async def reset_login_state(self, user_id: str) -> None:
        await self.collection.update_one(
            {"_id": self.to_oid(user_id)},
            {"$set": {
                "failed_login_attempts": 0,
                "locked_until":          None,
                "last_login_at":         datetime.now(timezone.utc),
            }},
        )

    async def soft_delete(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": self.to_oid(user_id)},
            {"$set": {"is_active": False, "deleted_at": now, "updated_at": now}},
        )

    async def get_all_active_users(self) -> list[dict]:
        cursor = self.collection.find({
            "is_active":    True,
            "deleted_at":   None,
        }, {"_id": 1})
        return await cursor.to_list(length=None)

    async def get_pending_hard_delete(self, older_than_days: int = 30) -> list[dict]:
        cutoff = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        from datetime import timedelta
        cutoff = cutoff - timedelta(days=older_than_days)
        cursor = self.collection.find({
            "is_active":  False,
            "deleted_at": {"$lte": cutoff},
        })
        return await cursor.to_list(length=None)