# app/services/goals_service.py
from datetime import datetime, timezone
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase
import bson
from fastapi import HTTPException

from app.core.database import Collections
from app.schemas.goals import GoalCreate, GoalUpdate, FutureSimulationRequest


class GoalsService:
    def __init__(self, db: AsyncIOMotorDatabase = None):
        self.db = db
        self.collection = db[Collections.GOALS] if db is not None else None

    async def get_goals(self, user_id: str) -> List[dict]:
        cursor = self.collection.find({"user_id": user_id}).sort("target_date", 1)
        goals = await cursor.to_list(length=100)
        return [self._format_goal(g) for g in goals]

    async def _get_goal_or_404(self, user_id: str, goal_id: str) -> dict:
        if not bson.ObjectId.is_valid(goal_id):
            raise HTTPException(status_code=400, detail="Invalid goal ID format")
        goal = await self.collection.find_one({"_id": bson.ObjectId(goal_id), "user_id": user_id})
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return goal

    async def create_goal(self, user_id: str, data: GoalCreate) -> dict:
        doc = {
            "user_id": user_id,
            "name": data.name,
            "target_amount": data.target_amount,
            "current_amount": 0.0,
            "target_date": data.target_date,
            "category": data.category,
            "icon": data.icon,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return self._format_goal(doc)

    async def update_goal(self, user_id: str, goal_id: str, data: GoalUpdate) -> dict:
        goal = await self._get_goal_or_404(user_id, goal_id)
        updates = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
        if not updates:
            return self._format_goal(goal)
            
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": goal["_id"]},
            {"$set": updates}
        )
        return self._format_goal({**goal, **updates})

    async def fund_goal(self, user_id: str, goal_id: str, amount: float) -> dict:
        goal = await self._get_goal_or_404(user_id, goal_id)
        new_amt = goal.get("current_amount", 0.0) + amount
        new_amt = max(0.0, new_amt)
        
        await self.collection.update_one(
            {"_id": goal["_id"]},
            {"$set": {"current_amount": new_amt, "updated_at": datetime.now(timezone.utc)}}
        )
        goal["current_amount"] = new_amt
        return self._format_goal(goal)

    async def delete_goal(self, user_id: str, goal_id: str) -> bool:
        goal = await self._get_goal_or_404(user_id, goal_id)
        await self.collection.delete_one({"_id": goal["_id"]})
        return True

    def simulate_future(self, data: FutureSimulationRequest) -> dict:
        rate = data.annual_return_pct / 100.0
        monthly_rate = rate / 12.0
        months = data.years * 12
        
        yearly = []
        balance = 0.0
        total_p = 0.0
        
        for m in range(1, months + 1):
            balance += data.monthly_contribution
            total_p += data.monthly_contribution
            interest = balance * monthly_rate
            balance += interest
            
            if m % 12 == 0:
                year_num = m // 12
                yearly.append({
                    "year": year_num,
                    "total_contributed": round(total_p, 2),
                    "total_interest": round(balance - total_p, 2),
                    "balance": round(balance, 2)
                })
                
        return {
            "final_balance": round(balance, 2),
            "total_contributed": round(total_p, 2),
            "total_interest_earned": round(balance - total_p, 2),
            "yearly_breakdown": yearly
        }

    def _format_goal(self, doc: dict) -> dict:
        try:
            target_dt = datetime.strptime(doc["target_date"][:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            delta = target_dt - datetime.now(timezone.utc)
            days_remain = max(0, delta.days)
        except Exception:
            days_remain = 0
            
        months_remain = max(1, days_remain // 30)
        target = float(doc.get("target_amount", 1))
        current = float(doc.get("current_amount", 0))
        shortfall = max(0.0, target - current)
        
        return {
            "id": str(doc["_id"]),
            "name": doc["name"],
            "target_amount": target,
            "current_amount": current,
            "target_date": doc["target_date"],
            "category": doc.get("category", "other"),
            "icon": doc.get("icon", "🎯"),
            "progress_pct": min(100.0, (current / target * 100)) if target > 0 else 100.0,
            "monthly_contribution_needed": round(shortfall / months_remain, 2),
            "days_remaining": days_remain,
            "is_completed": current >= target
        }
