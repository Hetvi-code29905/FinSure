# app/api/v1/endpoints/forecast.py
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user_id, get_db
from app.core.exceptions import NotFoundException
from app.schemas.forecast import ForecastResponse, GenerateForecastRequest
from app.services.forecast_service import ForecastService

router = APIRouter(tags=["Forecast"])


@router.get("", response_model=ForecastResponse)
async def get_forecast(
    uid: str = Depends(get_current_user_id),
    db:  AsyncIOMotorDatabase = Depends(get_db),
):
    """Return the latest cash flow forecast, generating one if none exists."""
    result = await ForecastService(db).generate_and_store(uid)
    if not result:
        raise NotFoundException("Forecast (not enough transaction data yet)")
    return result


@router.post("/generate", response_model=ForecastResponse)
async def generate_forecast(
    body: GenerateForecastRequest,
    uid:  str = Depends(get_current_user_id),
    db:   AsyncIOMotorDatabase = Depends(get_db),
):
    """Force-generate a new cash flow forecast."""
    result = await ForecastService(db).generate_and_store(
        uid, horizon_days=body.horizon_days, force=True
    )
    if not result:
        raise NotFoundException("Forecast (not enough transaction data yet)")
    return result