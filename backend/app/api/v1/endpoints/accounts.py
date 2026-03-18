# app/api/v1/endpoints/accounts.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.api.deps import get_current_user, get_db
from app.schemas.account import (
    AccountResponse, 
    AccountCreate, 
    AccountUpdate,
    AccountsListResponse,
    AccountBalanceSummary
)
from app.models.account import new_account_doc, serialize_account
from app.repositories.account_repository import AccountRepository

router = APIRouter()


@router.get("/", response_model=AccountsListResponse)
async def get_accounts(
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get all connected manual wallets/bank accounts."""
    user_id = str(current_user["_id"])
    repo = AccountRepository(db)
    
    docs = await repo.find_by_user(user_id=user_id)
    accounts = [serialize_account(acc) for acc in docs]
    
    return {
        "accounts": accounts,
        "total":    len(accounts),
    }


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Manually add an account (e.g. Wallet, Cash, Savings)."""
    user_id = str(current_user["_id"])
    
    doc = new_account_doc(
        user_id=user_id,
        name=data.name,
        account_type=data.type,
        balance=data.balance,
        currency_code=data.currency_code,
        credit_limit=data.credit_limit,
        billing_date=data.billing_date,
        color=data.color
    )
    
    repo = AccountRepository(db)
    inserted_id = await repo.insert_one(doc)
    doc["_id"] = inserted_id
    
    # Re-run ML pipelines since balance affected runway/risk
    from app.services.ml_orchestrator import MLOrchestrator
    orchestrator = MLOrchestrator(db)
    background_tasks.add_task(orchestrator.run_full_pipeline, user_id, force=True)

    return serialize_account(doc)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    data: AccountUpdate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update account details (e.g. adjust balance manually)."""
    user_id = str(current_user["_id"])
    repo = AccountRepository(db)
    
    # Ownership rules
    acc = await repo.find_by_id(account_id)
    if not acc or acc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Account not found")
        
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
        
    await repo.update_one(account_id, {"$set": update_data})
    
    updated_acc = await repo.find_by_id(account_id)

    # Re-run ML pipelines
    from app.services.ml_orchestrator import MLOrchestrator
    orchestrator = MLOrchestrator(db)
    background_tasks.add_task(orchestrator.run_full_pipeline, user_id, force=True)

    return serialize_account(updated_acc)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete manual account. Gives users data control."""
    user_id = str(current_user["_id"])
    repo = AccountRepository(db)
    
    acc = await repo.find_by_id(account_id)
    if not acc or acc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Account not found")
        
    await repo.delete_one(account_id)

    # Re-run ML pipelines
    from app.services.ml_orchestrator import MLOrchestrator
    orchestrator = MLOrchestrator(db)
    background_tasks.add_task(orchestrator.run_full_pipeline, user_id, force=True)

    return None
