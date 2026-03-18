# app/schemas/income.py
from typing import Optional
from pydantic import BaseModel, Field


class IncomeProfileBase(BaseModel):
    income_type:    str             # fixed | freelance | mixed | student
    monthly_amount: float = 0.0
    salary_day:     int = Field(default=1, ge=1, le=31)
    currency_code:  str = "INR"


class IncomeProfileCreate(IncomeProfileBase):
    pass


class IncomeProfileUpdate(BaseModel):
    income_type:    Optional[str] = None
    monthly_amount: Optional[float] = None
    salary_day:     Optional[int] = Field(default=None, ge=1, le=31)
    currency_code:  Optional[str] = None


class IncomeProfileResponse(IncomeProfileBase):
    id: str
