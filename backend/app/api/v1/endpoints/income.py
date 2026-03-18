# app/api/v1/endpoints/income.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

from app.api.deps import get_current_user, get_db
from app.schemas.income import IncomeProfileResponse, IncomeProfileCreate, IncomeProfileUpdate
from app.models.income import new_income_profile_doc, serialize_income_profile
from app.core.database import Collections

router = APIRouter()


@router.get("/", response_model=Optional[IncomeProfileResponse])
async def get_income_profile(
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get the user's income profile (baseline config)."""
    user_id = str(current_user["_id"])
    doc = await db[Collections.INCOME_PROFILES].find_one({"user_id": user_id})
    return serialize_income_profile(doc) if doc else None


@router.post("/", response_model=IncomeProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_income_profile(
    data: IncomeProfileCreate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Setup income profile (e.g. 'amount: $4000', 'type: fixed', 'salary_day: 1')."""
    user_id = str(current_user["_id"])
    
    # Check if one already exists
    existing = await db[Collections.INCOME_PROFILES].find_one({"user_id": user_id})
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Income profile already exists. Use PUT /income to update it."
        )

    doc = new_income_profile_doc(
        user_id=user_id,
        income_type=data.income_type,
        monthly_amount=data.monthly_amount,
        salary_day=data.salary_day,
        currency_code=data.currency_code
    )
    
    from app.repositories.base import BaseRepository
    repo = BaseRepository(db, Collections.INCOME_PROFILES)
    inserted_id = await repo.insert_one(doc)
    doc["_id"] = inserted_id
    
    # Re-run ML pipelines
    from app.services.ml_orchestrator import MLOrchestrator
    orchestrator = MLOrchestrator(db)
    background_tasks.add_task(orchestrator.run_full_pipeline, user_id, force=True)

    return serialize_income_profile(doc)


@router.put("/{profile_id}", response_model=IncomeProfileResponse)
async def update_income_profile(
    profile_id: str,
    data: IncomeProfileUpdate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update income configurations."""
    user_id = str(current_user["_id"])
    from app.repositories.base import BaseRepository
    repo = BaseRepository(db, Collections.INCOME_PROFILES)
    
    profile = await repo.find_by_id(profile_id)
    if not profile or profile.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Income profile not found")
        
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await repo.update_one(profile_id, {"$set": update_data})
        
    updated = await repo.find_by_id(profile_id)
    
    # Re-run ML pipelines
    from app.services.ml_orchestrator import MLOrchestrator
    orchestrator = MLOrchestrator(db)
    background_tasks.add_task(orchestrator.run_full_pipeline, user_id, force=True)

    return serialize_income_profile(updated)
