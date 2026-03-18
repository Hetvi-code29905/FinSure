# app/api/v1/endpoints/subscriptions.py
from typing import List
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.schemas.subscriptions import SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse
from app.services.subscription_service import SubscriptionService

router = APIRouter()

@router.get("", response_model=List[SubscriptionResponse])
async def get_subscriptions(
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all active and inactive subscriptions."""
    return await SubscriptionService(db).get_all(str(current_user["_id"]))

@router.post("", response_model=SubscriptionResponse)
async def create_subscription(
    body: SubscriptionCreate,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add a new subscription to track."""
    return await SubscriptionService(db).create(str(current_user["_id"]), body)

@router.patch("/{sub_id}", response_model=SubscriptionResponse)
async def update_subscription(
    sub_id: str,
    body: SubscriptionUpdate,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update subscription details or mark as inactive/unused."""
    return await SubscriptionService(db).update(str(current_user["_id"]), sub_id, body)

@router.delete("/{sub_id}")
async def delete_subscription(
    sub_id: str,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a subscription entirely."""
    await SubscriptionService(db).delete(str(current_user["_id"]), sub_id)
    return {"message": "Subscription deleted"}
