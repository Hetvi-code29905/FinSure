# app/services/calendar_service.py
from typing import List, Optional
from bson import ObjectId
from pymongo.collection import Collection
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import Collections
from app.schemas.calendar import CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse

class CalendarService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[Collections.CALENDAR_EVENTS] if db is not None else None

    async def get_all_events(self, user_id: str) -> List[dict]:
        cursor = self.collection.find({"user_id": user_id})
        events = await cursor.to_list(length=1000)
        
        # Merge Subscriptions dynamically into calendar events
        sub_cursor = self.db[Collections.SUBSCRIPTIONS].find({"user_id": user_id, "is_active": True})
        subs = await sub_cursor.to_list(length=1000)
        
        parsed_events = []
        for e in events:
            parsed_events.append({**e, "id": str(e.pop("_id"))})
            
        # Treat subs as monthly recurring bills implicitly
        for s in subs:
            # Fake an event for a subscription so it shows up seamlessly
            if "start_date" in s and s["start_date"]:
                parsed_events.append({
                    "id": f"sub_{str(s.get('_id', ''))}",
                    "user_id": user_id,
                    "title": s["name"],
                    "amount": s.get("cost", 0),
                    "type": "subscription",
                    "recurrence": "monthly",
                    "date": s["start_date"][:10] # Grab YYYY-MM-DD
                })
                
        return parsed_events

    async def create_event(self, user_id: str, data: CalendarEventCreate) -> dict:
        doc = data.model_dump()
        doc["user_id"] = user_id
        res = await self.collection.insert_one(doc)
        created = await self.collection.find_one({"_id": res.inserted_id})
        created["id"] = str(created.pop("_id"))
        return created

    async def delete_event(self, event_id: str, user_id: str) -> bool:
        if event_id.startswith("sub_"):
            return False # Cannont delete sub from this window
        res = await self.collection.delete_one({"_id": ObjectId(event_id), "user_id": user_id})
        return res.deleted_count > 0
