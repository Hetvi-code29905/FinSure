# tests/test_webhooks.py
import pytest
from unittest.mock import AsyncMock, patch
from app.models.webhook import new_webhook_doc
from app.core.database import Collections


@pytest.mark.asyncio
async def test_webhook_doc_shape():
    doc = new_webhook_doc(
        webhook_type="TRANSACTIONS",
        webhook_code="DEFAULT_UPDATE",
        item_id="item_abc123",
        raw_payload={"webhook_type": "TRANSACTIONS", "item_id": "item_abc123"},
    )
    assert doc["webhook_type"] == "TRANSACTIONS"
    assert doc["webhook_code"] == "DEFAULT_UPDATE"
    assert doc["processed"] is False
    assert doc["processing_error"] is None
    assert doc["processed_at"] is None
    assert "received_at" in doc


@pytest.mark.asyncio
async def test_webhook_stored_in_db(db):
    doc    = new_webhook_doc("TRANSACTIONS", "INITIAL_UPDATE", "item_xyz", {})
    result = await db[Collections.WEBHOOK_EVENTS].insert_one(doc)
    stored = await db[Collections.WEBHOOK_EVENTS].find_one({"_id": result.inserted_id})
    assert stored is not None
    assert stored["webhook_code"] == "INITIAL_UPDATE"
    assert stored["processed"] is False


@pytest.mark.asyncio
async def test_webhook_mark_processed(db):
    from datetime import datetime, timezone
    doc    = new_webhook_doc("ITEM", "ERROR", "item_err", {})
    result = await db[Collections.WEBHOOK_EVENTS].insert_one(doc)
    now    = datetime.now(timezone.utc)
    await db[Collections.WEBHOOK_EVENTS].update_one(
        {"_id": result.inserted_id},
        {"$set": {"processed": True, "processed_at": now}},
    )
    updated = await db[Collections.WEBHOOK_EVENTS].find_one({"_id": result.inserted_id})
    assert updated["processed"] is True
    assert updated["processed_at"] is not None


@pytest.mark.asyncio
async def test_webhook_with_error_payload(db):
    error_payload = {
        "error_type":    "ITEM_ERROR",
        "error_code":    "INVALID_CREDENTIALS",
        "error_message": "the provided credentials were not valid",
        "display_message": "Your credentials are no longer valid.",
    }
    doc = new_webhook_doc(
        webhook_type="ITEM",
        webhook_code="ERROR",
        item_id="item_err_456",
        raw_payload={"webhook_type": "ITEM", "item_id": "item_err_456"},
        error=error_payload,
    )
    assert doc["error"]["error_code"] == "INVALID_CREDENTIALS"
    result  = await db[Collections.WEBHOOK_EVENTS].insert_one(doc)
    stored  = await db[Collections.WEBHOOK_EVENTS].find_one({"_id": result.inserted_id})
    assert stored["error"]["error_type"] == "ITEM_ERROR"


@pytest.mark.asyncio
async def test_multiple_webhooks_ordered(db):
    """Verify we can retrieve webhooks sorted by received_at descending."""
    from datetime import datetime, timezone, timedelta
    docs = [
        new_webhook_doc("TRANSACTIONS", "DEFAULT_UPDATE", f"item_{i}", {})
        for i in range(3)
    ]
    # Stagger timestamps
    for i, d in enumerate(docs):
        d["received_at"] = datetime.now(timezone.utc) + timedelta(seconds=i)

    await db[Collections.WEBHOOK_EVENTS].insert_many(docs)
    cursor  = db[Collections.WEBHOOK_EVENTS].find({}).sort("received_at", -1)
    results = await cursor.to_list(length=10)
    assert len(results) >= 3
    # Most recent first
    assert results[0]["received_at"] >= results[1]["received_at"]


@pytest.mark.asyncio
async def test_webhook_processing_error_recorded(db):
    doc    = new_webhook_doc("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE", "item_fail", {})
    result = await db[Collections.WEBHOOK_EVENTS].insert_one(doc)
    await db[Collections.WEBHOOK_EVENTS].update_one(
        {"_id": result.inserted_id},
        {"$set": {"processing_error": "SyncService raised ValueError: no accounts found"}},
    )
    stored = await db[Collections.WEBHOOK_EVENTS].find_one({"_id": result.inserted_id})
    assert "SyncService" in stored["processing_error"]
    assert stored["processed"] is False   # not marked processed if errored