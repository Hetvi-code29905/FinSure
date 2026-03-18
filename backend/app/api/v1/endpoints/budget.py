# app/api/v1/endpoints/budget.py
from fastapi import APIRouter, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.schemas.budget import BudgetAnalysis
from app.services.budget_service import BudgetService

router = APIRouter()


@router.get("/analysis", response_model=BudgetAnalysis)
async def get_budget_analysis(
    target_savings: float = Query(default=0, ge=0, description="Absolute target saving amount for the month"),
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Full budget analysis for the current calendar month driven by a specific saving goal amount.
    """
    user_id = str(current_user["_id"])
    return await BudgetService(db).get_analysis(user_id, target_savings)

