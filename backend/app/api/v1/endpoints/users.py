# app/api/v1/endpoints/users.py
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_current_user_id, get_db, require_admin
from app.core.database import Collections
from app.models.audit_log import AuditEvent
from app.models.user import serialize_user
from app.schemas.msg import MsgResponse
from app.schemas.user import UserListResponse, UserResponse, UserUpdateRequest
from app.services.audit_service import AuditService

router = APIRouter(tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdateRequest,
    user: dict = Depends(get_current_user),
    db:   AsyncIOMotorDatabase = Depends(get_db),
):
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if body.full_name is not None:
        updates["full_name"] = body.full_name.strip()
    if body.email is not None:
        exists = await db[Collections.USERS].find_one({
            "email": body.email.lower(),
            "_id":   {"$ne": user["_id"]},
        })
        if exists:
            from app.core.exceptions import ConflictException
            raise ConflictException("Email already in use.")
        updates["email"] = body.email.lower()
        
    for field in ["onboarding_status", "fixed_expenses", "savings", "has_debt", "debt_amount", "behavioral_answers", "currency", "monthly_income_range", "pay_cycle", "basic_goal"]:
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val

    # Currency change wipes data
    if body.currency and body.currency != user.get("currency", "INR"):
        await db[Collections.ACCOUNTS].delete_many({"user_id": str(user["_id"])})
        await db[Collections.TRANSACTIONS].delete_many({"user_id": str(user["_id"])})
        await db[Collections.CALENDAR_EVENTS].delete_many({"user_id": str(user["_id"])})
        await AuditService(db).log(AuditEvent.PROFILE_UPDATE, str(user["_id"]),
                                   metadata={"action": "currency_changed_data_wiped", "new_currency": body.currency})

    await db[Collections.USERS].update_one({"_id": user["_id"]}, {"$set": updates})
    await AuditService(db).log(AuditEvent.PROFILE_UPDATE, str(user["_id"]),
                               metadata={"fields": list(updates.keys())})
    updated = await db[Collections.USERS].find_one({"_id": user["_id"]})
    return serialize_user(updated)


@router.delete("/me", response_model=MsgResponse)
async def delete_me(
    user: dict = Depends(get_current_user),
    db:   AsyncIOMotorDatabase = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    await db[Collections.USERS].update_one(
        {"_id": user["_id"]},
        {"$set": {"is_active": False, "deleted_at": now, "updated_at": now}},
    )
    await db[Collections.REFRESH_TOKENS].delete_many({"user_id": str(user["_id"])})
    await AuditService(db).log(AuditEvent.ACCOUNT_DELETED, str(user["_id"]))
    return MsgResponse(message="Account scheduled for deletion. Access revoked immediately.")


@router.get("/", response_model=UserListResponse)
async def list_users(
    page:  int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _:     dict = Depends(require_admin),
    db:    AsyncIOMotorDatabase = Depends(get_db),
):
    skip  = (page - 1) * limit
    total = await db[Collections.USERS].count_documents({})
    docs  = await db[Collections.USERS].find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return UserListResponse(users=[serialize_user(d) for d in docs], total=total, page=page, limit=limit)


@router.get("/me/audit-log")
async def my_audit_log(
    limit:  int = Query(50, ge=1, le=200),
    uid:    str = Depends(get_current_user_id),
    db:     AsyncIOMotorDatabase = Depends(get_db),
):
    events = await AuditService(db).get_user_events(uid, limit=limit)
    return {"events": events, "total": len(events)}