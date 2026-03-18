# app/schemas/safety.py
from typing import Optional, List
from pydantic import BaseModel


class UpcomingBill(BaseModel):
    name: str
    amount: float
    expected_date: str          # "YYYY-MM-DD"
    days_until: int
    category: str
    recurrence: str             # "monthly" | "weekly"


class SafetySnapshot(BaseModel):
    # Balance context
    total_balance: float
    currency_code: str

    # Burn rate
    avg_daily_burn: float
    avg_monthly_expense: float
    avg_monthly_income: float
    savings_rate_pct: float     # (income - expense) / income * 100

    # Runway
    runway_days: int
    runway_label: str           # "Stable" | "X days"
    risk_level: str             # "Safe" | "Okay" | "Danger"
    risk_emoji: str

    # Emergency fund
    emergency_fund_target: float        # 3× avg monthly expense
    emergency_fund_target_months: int   # 3
    emergency_fund_progress_pct: float  # balance / target * 100
    days_covered: int                   # how many days of zero income can survive
    monthly_top_up_needed: float        # extra save/mo to hit 3m goal in 6 months

    # Bills
    upcoming_bills: List[UpcomingBill]
    balance_after_upcoming: float       # balance minus all bills due within 30 days
    total_upcoming_30d: float

    # Computed
    computed_at: str


class SafeToSpendRequest(BaseModel):
    amount: float


class SafeToSpendResponse(BaseModel):
    amount: float
    current_balance: float
    balance_after: float
    runway_now: int
    runway_after: int
    runway_change_days: int
    is_safe: bool
    verdict: str
    emoji: str
