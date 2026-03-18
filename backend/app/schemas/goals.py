# app/schemas/goals.py
from typing import List, Optional
from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    name: str = Field(..., max_length=100)
    target_amount: float = Field(..., gt=0)
    target_date: str = Field(..., description="YYYY-MM-DD")
    category: str = Field(default="other", description="emergency, travel, purchase, other")
    icon: str = Field(default="🎯")


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    target_date: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None


class GoalFund(BaseModel):
    amount: float = Field(..., gt=0)


class GoalResponse(BaseModel):
    id: str
    name: str
    target_amount: float
    current_amount: float
    target_date: str
    category: str
    icon: str
    progress_pct: float
    monthly_contribution_needed: float
    days_remaining: int
    is_completed: bool


class FutureSimulationRequest(BaseModel):
    monthly_contribution: float = Field(..., gt=0)
    years: int = Field(..., gt=0, le=40)
    annual_return_pct: float = Field(..., ge=0, le=30)


class SimulationYear(BaseModel):
    year: int
    total_contributed: float
    total_interest: float
    balance: float


class FutureSimulationResponse(BaseModel):
    final_balance: float
    total_contributed: float
    total_interest_earned: float
    yearly_breakdown: List[SimulationYear]
