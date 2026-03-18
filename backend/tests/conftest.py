# tests/conftest.py
import pytest
import pytest_asyncio
from mongomock_motor import AsyncMongoMockClient


@pytest_asyncio.fixture
async def db():
    """In-memory MongoDB via mongomock-motor. Fresh DB per test."""
    client = AsyncMongoMockClient()
    database = client["finomous_test"]
    yield database
    client.close()


@pytest_asyncio.fixture
async def test_user(db):
    """Insert a pre-built user document and return it."""
    from app.core.security import hash_password
    from app.models.user import new_user_doc
    doc    = new_user_doc("test@finomous.com", hash_password("Test@1234"), "Test User")
    result = await db["users"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


@pytest_asyncio.fixture
async def auth_tokens(test_user):
    """Return a valid token pair for the test user."""
    from app.core.security import create_token_pair
    return create_token_pair(str(test_user["_id"]))


def make_transaction(user_id: str, amount: float = 50.0, date: str = "2024-06-15",
                     category: str = "Food & Dining", anomaly: bool = False) -> dict:
    """Factory for transaction dicts used in tests."""
    from app.models.transaction import new_transaction_doc
    import uuid
    doc = new_transaction_doc(
        user_id=user_id,
        account_id="acc_test",
        plaid_transaction_id=str(uuid.uuid4()),
        amount=amount,
        date=date,
        name="Test Transaction",
        category=category,
    )
    doc["is_anomaly"] = anomaly
    return doc