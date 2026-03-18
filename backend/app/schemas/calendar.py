# app/schemas/calendar.py
from typing import Optional, List
from pydantic import BaseModel, Field

class CalendarEventBase(BaseModel):
    title: str
    amount: float
    type: str = Field(..., description="'income', 'bill', 'emi', 'subscription', 'other'")
    recurrence: str = Field(..., description="'once', 'monthly', 'yearly'")
    date: str = Field(..., description="YYYY-MM-DD format for the initial date")

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None
    recurrence: Optional[str] = None
    date: Optional[str] = None

class CalendarEventResponse(CalendarEventBase):
    id: str
