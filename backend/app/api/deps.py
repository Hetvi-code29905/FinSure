# app/api/deps.py
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import Collections, get_db
from app.core.security import TOKEN_TYPE_ACCESS, decode_token

_bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db:    AsyncIOMotorDatabase          = Depends(get_db),
) -> dict:
    payload = decode_token(creds.credentials, TOKEN_TYPE_ACCESS)
    uid = payload.get("sub", "")
    try:
        oid = ObjectId(uid)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token subject.")

    user = await db[Collections.USERS].find_one(
        {"_id": oid, "is_active": True, "deleted_at": None}
    )
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or deactivated.")
    return user


async def get_current_user_id(user: dict = Depends(get_current_user)) -> str:
    return str(user["_id"])


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required.")
    return user


# Re-export get_db so endpoints only import from app.api.deps
__all__ = ["get_db", "get_current_user", "get_current_user_id", "require_admin"]