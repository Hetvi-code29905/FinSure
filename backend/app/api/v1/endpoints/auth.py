# app/api/v1/endpoints/auth.py
from fastapi import APIRouter, Depends, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user_id, get_db
from app.schemas.auth import (ChangePasswordRequest, LoginRequest,
                               LogoutRequest, RefreshRequest,
                               RegisterRequest, TokenResponse)
from app.schemas.msg import MsgResponse
from app.services.auth_service import AuthService

router = APIRouter(tags=["Auth"])


def _ip(req: Request) -> str:
    fwd = req.headers.get("X-Forwarded-For")
    return fwd.split(",")[0].strip() if fwd else (req.client.host if req.client else "")


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, req: Request,
                   db: AsyncIOMotorDatabase = Depends(get_db)):
    return await AuthService(db).register(
        body.email, body.password, body.full_name,
        body.currency, body.monthly_income_range, body.pay_cycle, body.basic_goal,
        _ip(req)
    )


@router.post("/login")
async def login(body: LoginRequest, req: Request,
                db: AsyncIOMotorDatabase = Depends(get_db)):
    return await AuthService(db).login(body.email, body.password, _ip(req))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, req: Request,
                  db: AsyncIOMotorDatabase = Depends(get_db)):
    return await AuthService(db).refresh(body.refresh_token, _ip(req))


@router.post("/logout", response_model=MsgResponse)
async def logout(body: LogoutRequest, req: Request,
                 uid: str = Depends(get_current_user_id),
                 db:  AsyncIOMotorDatabase = Depends(get_db)):
    await AuthService(db).logout(uid, body.refresh_token, _ip(req))
    return MsgResponse(message="Logged out successfully.")


@router.post("/change-password", response_model=MsgResponse)
async def change_password(body: ChangePasswordRequest, req: Request,
                           uid: str = Depends(get_current_user_id),
                           db:  AsyncIOMotorDatabase = Depends(get_db)):
    await AuthService(db).change_password(uid, body.current_password, body.new_password, _ip(req))
    return MsgResponse(message="Password changed. Please log in again on all devices.")