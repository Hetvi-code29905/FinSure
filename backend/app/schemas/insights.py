# app/schemas/insights.py
from typing import List, Optional
from pydantic import BaseModel

class HealthScoreQuest(BaseModel):
    title: str
    desc: str
    reward: int
    status: str
    action_url: str

class HealthScoreResponse(BaseModel):
    score: int
    rank: str
    next_rank: str
    points_to_next: int
    progress_pct: int
    breakdown: dict
    quests: List[HealthScoreQuest]
    total_ranks: List[str]

class IncomeStabilityResponse(BaseModel):
    is_stable: bool
    variance_pct: float
    message: str

class TaxEstimatorRequest(BaseModel):
    annual_income: float
    investments_80c: float = 0
    medical_80d: float = 0
    home_loan_interest: float = 0

class TaxEstimatorResponse(BaseModel):
    old_regime_tax: float
    new_regime_tax: float
    recommended_regime: str
    tax_savings_possible: float

class NetWorthResponse(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float
    currency: str
