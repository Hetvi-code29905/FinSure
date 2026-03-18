# app/api/v1/endpoints/health.py
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_db, require_admin
from app.core.config import settings
from app.core.database import Collections, check_db_connection

router = APIRouter(tags=["Health"])


@router.get("")
async def health():
    return {
        "status":  "ok",
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "env":     settings.ENVIRONMENT,
    }


@router.get("/db")
async def health_db():
    ok = await check_db_connection()
    return {
        "status":    "ok" if ok else "degraded",
        "database":  settings.MONGODB_DB_NAME,
        "connected": ok,
    }


@router.get("/full")
async def health_full(
    _:  dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    db_ok  = await check_db_connection()
    counts = {}
    if db_ok:
        for name in [Collections.USERS, Collections.TRANSACTIONS,
                     Collections.RISK_SCORES, Collections.FORECASTS, Collections.ALERTS]:
            counts[name] = await db[name].count_documents({})

    return {
        "status":      "ok" if db_ok else "degraded",
        "database":    {"connected": db_ok, "name": settings.MONGODB_DB_NAME},
        "collections": counts,
        "environment": settings.ENVIRONMENT,
        "version":     settings.APP_VERSION,
    }