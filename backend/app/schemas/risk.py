# app/schemas/risk.py
from typing import Optional
from pydantic import BaseModel


class RiskScoreResponse(BaseModel):
    id:                       str
    user_id:                  str
    composite_score:          float       # 0–100
    risk_category:            str         # Low | Moderate | High
    score_color:              str         # hex colour
    income_stability_score:   float
    expense_volatility_score: float
    savings_adequacy_score:   float
    debt_exposure_score:      float
    behavioral_drift_score:   float
    transaction_count:        int
    days_analyzed:            int
    computed_at:              str


class RiskHistoryResponse(BaseModel):
    history: list[RiskScoreResponse]
    total:   int


class ComputeRiskRequest(BaseModel):
    force: bool = False