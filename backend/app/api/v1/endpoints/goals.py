# app/api/v1/endpoints/goals.py
from typing import List
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.schemas.goals import (
    GoalCreate, GoalUpdate, GoalFund, GoalResponse,
    FutureSimulationRequest, FutureSimulationResponse
)
from app.services.goals_service import GoalsService

router = APIRouter()

@router.get("", response_model=List[GoalResponse])
async def list_goals(
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all goals for the current user."""
    return await GoalsService(db).get_goals(str(current_user["_id"]))

@router.post("", response_model=GoalResponse)
async def create_goal(
    body: GoalCreate,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new savings goal."""
    return await GoalsService(db).create_goal(str(current_user["_id"]), body)

@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    body: GoalUpdate,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update goal target, name, or date."""
    return await GoalsService(db).update_goal(str(current_user["_id"]), goal_id, body)

@router.post("/{goal_id}/fund", response_model=GoalResponse)
async def fund_goal(
    goal_id: str,
    body: GoalFund,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add money to a goal."""
    return await GoalsService(db).fund_goal(str(current_user["_id"]), goal_id, body.amount)

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a goal."""
    await GoalsService(db).delete_goal(str(current_user["_id"]), goal_id)
    return {"message": "Goal deleted"}

@router.post("/simulate", response_model=FutureSimulationResponse)
def simulate_future(body: FutureSimulationRequest):
    """Simulate compound interest for future savings. Does not require auth."""
    return GoalsService(None).simulate_future(body)
