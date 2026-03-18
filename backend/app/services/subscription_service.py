# app/services/subscription_service.py
from datetime import datetime, timezone
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase
import bson
from fastapi import HTTPException

from app.core.database import Collections
from app.schemas.subscriptions import SubscriptionCreate, SubscriptionUpdate

class SubscriptionService:
    def __init__(self, db: AsyncIOMotorDatabase = None):
        self.db = db
        self.collection = db[Collections.SUBSCRIPTIONS] if db is not None else None

    async def get_all(self, user_id: str) -> List[dict]:
        cursor = self.collection.find({"user_id": user_id}).sort("next_billing_date", 1)
        subs = await cursor.to_list(length=100)
        return [self._format_sub(s) for s in subs]

    async def _get_or_404(self, user_id: str, sub_id: str) -> dict:
        if not bson.ObjectId.is_valid(sub_id):
            raise HTTPException(status_code=400, detail="Invalid ID format")
        sub = await self.collection.find_one({"_id": bson.ObjectId(sub_id), "user_id": user_id})
        if not sub:
            raise HTTPException(status_code=404, detail="Subscription not found")
        return sub

    async def create(self, user_id: str, data: SubscriptionCreate) -> dict:
        doc = {
            "user_id": user_id,
            "name": data.name,
            "amount": data.amount,
            "billing_cycle": data.billing_cycle,
            "next_billing_date": data.next_billing_date,
            "category": data.category,
            "icon": data.icon,
            "is_active": True,
            "last_used_date": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return self._format_sub(doc)

    async def update(self, user_id: str, sub_id: str, data: SubscriptionUpdate) -> dict:
        sub = await self._get_or_404(user_id, sub_id)
        updates = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
        if not updates:
            return self._format_sub(sub)
            
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": sub["_id"]},
            {"$set": updates}
        )
        return self._format_sub({**sub, **updates})

    async def delete(self, user_id: str, sub_id: str) -> bool:
        sub = await self._get_or_404(user_id, sub_id)
        await self.collection.delete_one({"_id": sub["_id"]})
        return True

    def _format_sub(self, doc: dict) -> dict:
        cycle = doc.get("billing_cycle", "monthly")
        amt = float(doc.get("amount", 0))

        if cycle == "monthly":
            monthly = amt
            annual = amt * 12
        elif cycle == "annual":
            monthly = amt / 12
            annual = amt
        elif cycle == "quarterly":
            monthly = amt / 3
            annual = amt * 4
        else:
            monthly = amt
            annual = amt * 12

        try:
            target_dt = datetime.strptime(doc["next_billing_date"][:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            delta = target_dt - datetime.now(timezone.utc)
            days_remain = max(0, delta.days)
        except Exception:
            days_remain = 0

        # Unused warning logic: If they marked it unused > 60 days ago
        last_used = doc.get("last_used_date")
        is_unused = False
        if last_used:
            try:
                lu_dt = datetime.strptime(last_used[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if (datetime.now(timezone.utc) - lu_dt).days > 60:
                    is_unused = True
            except Exception:
                pass

        return {
            "id": str(doc["_id"]),
            "name": doc["name"],
            "amount": amt,
            "billing_cycle": cycle,
            "next_billing_date": doc["next_billing_date"],
            "category": doc.get("category", "entertainment"),
            "icon": doc.get("icon", "🔁"),
            "is_active": doc.get("is_active", True),
            "last_used_date": last_used,
            "annual_cost": round(annual, 2),
            "monthly_cost": round(monthly, 2),
            "days_until_due": days_remain,
            "is_unused_warning": is_unused and doc.get("is_active", True)
        }
