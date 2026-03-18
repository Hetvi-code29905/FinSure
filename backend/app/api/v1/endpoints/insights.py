# app/api/v1/endpoints/insights.py
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import get_current_user, get_db
from app.services.insights_service import InsightsService
from app.schemas.insights import HealthScoreResponse, NetWorthResponse, TaxEstimatorRequest, TaxEstimatorResponse

router = APIRouter()

@router.get("/health-score", response_model=HealthScoreResponse)
async def get_health_score(
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Calculates a Gamified Financial Health Score (0-100)."""
    return await InsightsService(db).calculate_health_score(str(current_user["_id"]))

@router.get("/net-worth", response_model=NetWorthResponse)
async def get_net_worth(
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Calculates Net Worth."""
    return await InsightsService(db).get_net_worth(str(current_user["_id"]))

@router.post("/tax", response_model=TaxEstimatorResponse)
async def estimate_tax(
    body: TaxEstimatorRequest,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Estimates India Income Tax based on 80C, 80D."""
    return InsightsService(db).estimate_tax_80c(body.annual_income, body.investments_80c, body.medical_80d, body.home_loan_interest)
