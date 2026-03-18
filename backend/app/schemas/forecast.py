# app/schemas/forecast.py
from typing import Optional
from pydantic import BaseModel


class DailyProjection(BaseModel):
    date:              str
    predicted_balance: float
    lower_bound:       float
    upper_bound:       float
    is_negative:       bool


class ForecastResponse(BaseModel):
    id:                       str
    user_id:                  str
    current_balance:          float
    daily_projections:        list[DailyProjection]
    depletion_date:           Optional[str]
    shortage_probability:     float
    shortage_probability_pct: float
    estimated_runway_days:    int
    runway_label:             str
    risk_alert:               bool
    avg_daily_spend:          float
    avg_monthly_income:       Optional[float]
    avg_monthly_expense:      Optional[float]
    data_points_used:         int
    horizon_days:             int
    generated_at:             str


class GenerateForecastRequest(BaseModel):
    horizon_days: int  = 30
    force:        bool = False