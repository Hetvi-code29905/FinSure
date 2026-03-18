# app/schemas/subscriptions.py
from typing import Optional
from pydantic import BaseModel, Field


class SubscriptionCreate(BaseModel):
    name: str = Field(..., max_length=100)
    amount: float = Field(..., gt=0)
    billing_cycle: str = Field(..., description="monthly, quarterly, annual")
    next_billing_date: str = Field(..., description="YYYY-MM-DD")
    category: str = Field(default="entertainment", description="entertainment, health, utility, software, other")
    icon: str = Field(default="🔁")


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    billing_cycle: Optional[str] = None
    next_billing_date: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    last_used_date: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: str
    name: str
    amount: float
    billing_cycle: str
    next_billing_date: str
    category: str
    icon: str
    is_active: bool
    last_used_date: Optional[str] = None
    annual_cost: float
    monthly_cost: float
    days_until_due: int
    is_unused_warning: bool
