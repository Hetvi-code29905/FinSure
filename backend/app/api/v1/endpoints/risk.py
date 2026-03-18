# app/api/v1/endpoints/risk.py
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user_id, get_db
from app.schemas.msg import MsgResponse
from app.schemas.risk import ComputeRiskRequest, RiskHistoryResponse, RiskScoreResponse
from app.services.risk_service import RiskService

router = APIRouter(tags=["Risk"])


@router.get("/score", response_model=RiskScoreResponse)
async def get_risk_score(
    uid: str = Depends(get_current_user_id),
    db:  AsyncIOMotorDatabase = Depends(get_db),
):
    """Return the latest risk score, computing it on-demand if needed."""
    result = await RiskService(db).compute_and_store(uid)
    if not result:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Risk score (not enough transaction data yet)")
    return result


@router.post("/compute", response_model=RiskScoreResponse)
async def compute_risk(
    body: ComputeRiskRequest,
    uid:  str = Depends(get_current_user_id),
    db:   AsyncIOMotorDatabase = Depends(get_db),
):
    """Force-recompute the risk score."""
    result = await RiskService(db).compute_and_store(uid, force=body.force or True)
    if not result:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Risk score (not enough transaction data yet)")
    return result


@router.get("/history", response_model=RiskHistoryResponse)
async def risk_history(
    limit: int = Query(30, ge=1, le=100),
    uid:   str = Depends(get_current_user_id),
    db:    AsyncIOMotorDatabase = Depends(get_db),
):
    """Return historical risk scores (latest first)."""
    history = await RiskService(db).get_history(uid, limit=limit)
    return RiskHistoryResponse(history=history, total=len(history))