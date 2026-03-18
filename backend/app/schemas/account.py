# app/schemas/account.py
from typing import Optional
from pydantic import BaseModel


class AccountBase(BaseModel):
    name:          str
    type:          str
    balance:       float = 0.0
    currency_code: str = "INR"
    credit_limit:  Optional[float] = None
    billing_date:  Optional[int] = None
    color:         Optional[str] = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name:          Optional[str] = None
    type:          Optional[str] = None
    balance:       Optional[float] = None
    credit_limit:  Optional[float] = None
    billing_date:  Optional[int] = None
    color:         Optional[str] = None


class AccountResponse(AccountBase):
    id:            str
    is_active:     bool


class AccountsListResponse(BaseModel):
    accounts: list[AccountResponse]
    total:    int


class AccountBalanceSummary(BaseModel):
    total_balance:    float
    account_count:    int
    currency_code:    str = "INR"