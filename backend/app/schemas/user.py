# app/schemas/user.py
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id:            str
    email:         str
    full_name:     str
    role:          str
    currency:      str
    monthly_income_range: str
    pay_cycle:     str
    basic_goal:    str
    is_active:     bool
    plaid_linked:  bool
    onboarding_status: str
    fixed_expenses: Optional[list[str]] = None
    savings:        Optional[str] = None
    has_debt:       Optional[bool] = None
    debt_amount:    Optional[str] = None
    behavioral_answers: Optional[dict] = None
    created_at:    Optional[str]
    last_login_at: Optional[str] = None


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email:     Optional[EmailStr] = None
    currency:  Optional[str] = None
    monthly_income_range: Optional[str] = None
    pay_cycle: Optional[str] = None
    basic_goal: Optional[str] = None
    onboarding_status: Optional[str] = None
    fixed_expenses: Optional[list[str]] = None
    savings:        Optional[str] = None
    has_debt:       Optional[bool] = None
    debt_amount:    Optional[str] = None
    behavioral_answers: Optional[dict] = None


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page:  int
    limit: int


# Aliases to match what __init__.py and other files expect
User = UserResponse
UserOut = UserResponse
UserCreate = UserResponse # If you don't have a specific Create class yet, this acts as a placeholder
UserUpdate = UserUpdateRequest