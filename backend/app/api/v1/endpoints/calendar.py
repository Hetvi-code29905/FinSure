# app/api/v1/endpoints/calendar.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.deps import get_current_user, get_db
from app.services.calendar_service import CalendarService
from app.schemas.calendar import CalendarEventCreate, CalendarEventResponse

router = APIRouter()

@router.get("/events", response_model=List[CalendarEventResponse])
async def list_calendar_events(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Retrieve recurring/fixed events & parse subscriptions automatically."""
    return await CalendarService(db).get_all_events(str(current_user["_id"]))

@router.post("/", response_model=CalendarEventResponse)
async def create_event(
    event_in: CalendarEventCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Create a new manual calendar event (Income/Bill/EMI)."""
    return await CalendarService(db).create_event(str(current_user["_id"]), event_in)

@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Delete a manual event (Cannot delete synthesized Subscriptions directly)."""
    success = await CalendarService(db).delete_event(event_id, str(current_user["_id"]))
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete this event (it may be a synthesized Subscription).")
    return {"message": "Deleted"}
