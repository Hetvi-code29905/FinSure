# app/api/v1/endpoints/transactions.py
from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Any
from datetime import datetime

from app.api.deps import get_current_user, get_db
from app.schemas.transaction import (
    TransactionListResponse, 
    TransactionCreate, 
    TransactionResponse,
    SpendingSummary
)
from app.models.transaction import serialize_transaction, new_transaction_doc
from app.repositories.transaction_repository import TransactionRepository

router = APIRouter()


@router.get("/", response_model=TransactionListResponse)
async def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    anomalies_only: bool = False,
    account_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch paginated transactions."""
    user_id = str(current_user["_id"])
    repo = TransactionRepository(db)
    
    docs, total = await repo.find_for_user(
        user_id=user_id,
        page=page,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
        category=category,
        search=search,
        anomalies_only=anomalies_only,
        account_id=account_id
    )

    transactions = [serialize_transaction(t) for t in docs]
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "transactions": transactions,
        "total":        total,
        "page":         page,
        "limit":        limit,
        "total_pages":  total_pages,
    }


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Manually add a single transaction (MVP Input)."""
    user_id = str(current_user["_id"])
    
    doc = new_transaction_doc(
        user_id=user_id,
        amount=data.amount,
        date=data.date,
        name=data.name,
        category=data.category,
        type_=data.type,
        source=data.source,
        account_id=data.account_id,
        note=data.note,
        currency_code=data.currency_code
    )
    
    repo = TransactionRepository(db)
    inserted_id = await repo.insert_one(doc)
    doc["_id"] = inserted_id
    # Update associated account balance
    if doc.get("account_id"):
        from app.repositories.account_repository import AccountRepository
        acc_repo = AccountRepository(db)
        account = await acc_repo.find_by_id(doc["account_id"])
        if account:
            # Expense (amount > 0) reduces balance, Income (amount < 0) increases balance
            new_balance = account.get("balance", 0.0) - doc["amount"]
            await acc_repo.update_one(doc["account_id"], {"$set": {"balance": new_balance}})

    # Trigger ML pipelines in the background to update risk/forecast seamlessly
    from app.services.ml_orchestrator import MLOrchestrator
    orchestrator = MLOrchestrator(db)
    background_tasks.add_task(orchestrator.run_full_pipeline, user_id, force=True)

    return serialize_transaction(doc)


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    tx_id: str,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a transaction to give users control over their data."""
    user_id = str(current_user["_id"])
    repo = TransactionRepository(db)
    
    # Verify ownership before deletion
    tx = await repo.find_by_id(tx_id)
    if not tx or tx.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Revert associated account balance before deleting
    if tx.get("account_id"):
        from app.repositories.account_repository import AccountRepository
        acc_repo = AccountRepository(db)
        account = await acc_repo.find_by_id(tx["account_id"])
        if account:
            # Revert: add amount back (if expense, adds it back. if income, subtracts it back)
            new_balance = account.get("balance", 0.0) + tx["amount"]
            await acc_repo.update_one(tx["account_id"], {"$set": {"balance": new_balance}})

    await repo.delete_one(tx_id)

    # Re-run ML pipelines after deletion
    from app.services.ml_orchestrator import MLOrchestrator
    orchestrator = MLOrchestrator(db)
    background_tasks.add_task(orchestrator.run_full_pipeline, user_id, force=True)

    return None


@router.get("/summary", response_model=SpendingSummary)
async def get_spending_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get spending broken down by category/month."""
    user_id = str(current_user["_id"])
    repo = TransactionRepository(db)
    
    summary = await repo.spending_summary(user_id, date_from, date_to)
    return summary