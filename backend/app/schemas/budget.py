# app/schemas/budget.py
from typing import List, Optional
from pydantic import BaseModel


class BudgetBucket(BaseModel):
    name: str                     # "Needs", "Wants", "Savings"
    emoji: str
    target_pct: float             # 50 / 30 / 20
    target_amount: float          # income × target_pct/100
    actual_amount: float          # what was actually spent
    actual_pct_of_income: float   # actual / income × 100
    drift_pct: float              # actual_amount/target_amount × 100 - 100 (+ = over)
    status: str                   # "On Track" | "Over Budget" | "Under Budget" | "No Data"
    status_color: str             # hex
    categories: List[dict]        # [{name, amount, pct_of_bucket}]


class MonthComparison(BaseModel):
    category: str
    this_month: float
    last_month: float
    change_pct: float             # positive = you spent more
    change_amount: float


class SpendingPattern(BaseModel):
    insight: str                  # human readable
    detail: str
    emoji: str
    severity: str                 # "good" | "warn" | "neutral"


class BudgetAnalysis(BaseModel):
    # Context
    month_label: str              # "March 2026"
    monthly_income: float
    monthly_expense: float
    savings_this_month: float
    currency_code: str

    # 50/30/20 buckets (or custom)
    needs: BudgetBucket
    wants: BudgetBucket
    savings_bucket: BudgetBucket

    # "Where Did My Money Go?" natural language summary
    human_summary: str
    top_categories: List[dict]    # [{category, amount, pct_of_total, emoji}]
    top_income_categories: List[dict] # [{category, amount, pct_of_total, emoji}]

    # Month vs last month
    month_comparisons: List[MonthComparison]

    # Spending patterns
    patterns: List[SpendingPattern]
    peak_spending_day: str
    weekend_multiplier: float     # 1.0 = same as weekday

    # Lifestyle creep
    lifestyle_creep_detected: bool
    income_growth_pct: float
    expense_growth_pct: float
    lifestyle_creep_message: str

    # Budget drift alerts (plain English)
    alerts: List[str]
    
    # ML Prediction on saving target possibility
    savings_prediction: Optional[str] = None

    computed_at: str
