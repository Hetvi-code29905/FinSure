# app/schemas/auth.py
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email:                EmailStr
    password:             str
    full_name:            str
    currency:             str = "INR"
    monthly_income_range: str = "Not specified"
    pay_cycle:            str = "Monthly"
    basic_goal:           str = "Just track"

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Full name cannot be empty.")
        return v.strip()


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str


class TokenResponse(BaseModel):
    access_token:             str
    refresh_token:            str
    token_type:               str = "bearer"
    expires_in:               int
    refresh_token_expires_at: str