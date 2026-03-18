# app/api/v1/endpoints/safety.py
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.schemas.safety import SafetySnapshot, SafeToSpendRequest, SafeToSpendResponse
from app.services.safety_service import SafetyService

router = APIRouter()


@router.get("/snapshot", response_model=SafetySnapshot)
async def get_safety_snapshot(
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return full Safety Net snapshot — runway, emergency fund, bills, savings rate."""
    user_id = str(current_user["_id"])
    return await SafetyService(db).get_snapshot(user_id)


@router.post("/safe-to-spend", response_model=SafeToSpendResponse)
async def check_safe_to_spend(
    body: SafeToSpendRequest,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Given an amount the user is about to spend, returns:
    - is_safe (bool)
    - runway before and after
    - plain-English verdict
    """
    user_id = str(current_user["_id"])
    return await SafetyService(db).safe_to_spend(user_id, body.amount)
