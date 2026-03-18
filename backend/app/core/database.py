# app/core/database.py
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)



_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


# ── Collection names ──────────────────────────────────────────
class Collections:
    USERS          = "users"

    ACCOUNTS       = "accounts"
    TRANSACTIONS   = "transactions"
    RISK_SCORES    = "risk_scores"
    FORECASTS      = "forecasts"
    MODEL_METADATA  = "model_metadata"
    AUDIT_LOGS      = "audit_logs"
    INCOME_PROFILES = "income_profiles"
    ALERTS          = "alerts"
    REFRESH_TOKENS  = "refresh_tokens"
    GOALS           = "savings_goals"
    SUBSCRIPTIONS   = "subscriptions"
    CALENDAR_EVENTS = "calendar_events"


# ── Accessors ─────────────────────────────────────────────────
def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("DB not initialised — call init_db() at startup.")
    return _client


def get_database() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("DB not initialised — call init_db() at startup.")
    return _db


# ── FastAPI dependency ────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    yield get_database()


# ── Background-job context manager ───────────────────────────
@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    yield get_database()


# ── Indexes ───────────────────────────────────────────────────
async def _create_indexes(db: AsyncIOMotorDatabase) -> None:
    await db[Collections.USERS].create_indexes([
        IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
        IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
    ])

    await db[Collections.ACCOUNTS].create_indexes([
        IndexModel([("user_id", ASCENDING)], name="user_id"),
    ])
    await db[Collections.TRANSACTIONS].create_indexes([
        IndexModel([("user_id", ASCENDING)], name="user_id"),
        IndexModel([("user_id", ASCENDING), ("date", DESCENDING)], name="user_date"),
        IndexModel([("user_id", ASCENDING), ("category", ASCENDING)], name="user_category"),
        IndexModel([("user_id", ASCENDING), ("is_anomaly", ASCENDING)], name="user_anomaly"),
    ])
    await db[Collections.RISK_SCORES].create_indexes([
        IndexModel([("user_id", ASCENDING), ("computed_at", DESCENDING)], name="user_latest"),
    ])
    await db[Collections.FORECASTS].create_indexes([
        IndexModel([("user_id", ASCENDING), ("generated_at", DESCENDING)], name="user_latest"),
    ])
    await db[Collections.AUDIT_LOGS].create_indexes([
        IndexModel([("user_id", ASCENDING)], name="user_id"),
        IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
        IndexModel([("timestamp", ASCENDING)], expireAfterSeconds=63_072_000, name="ttl_2yr"),
    ])

    await db[Collections.ALERTS].create_indexes([
        IndexModel([("user_id", ASCENDING), ("is_read", ASCENDING)], name="user_unread"),
        IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
    ])
    await db[Collections.REFRESH_TOKENS].create_indexes([
        IndexModel([("token_hash", ASCENDING)], unique=True, name="token_hash_unique"),
        IndexModel([("user_id", ASCENDING)], name="user_id"),
        IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0, name="ttl_expiry"),
    ])
    await db[Collections.MODEL_METADATA].create_indexes([
        IndexModel([("model_type", ASCENDING), ("trained_at", DESCENDING)], name="type_latest"),
    ])
    logger.info("MongoDB indexes verified")


# ── Health check ──────────────────────────────────────────────
async def check_db_connection() -> bool:
    try:
        await get_client().admin.command("ping")
        return True
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error("MongoDB ping failed", extra={"error": str(e)})
        return False


# ── Startup / Shutdown ────────────────────────────────────────
async def init_db() -> None:
    global _client, _db
    logger.info("Connecting to MongoDB Atlas...")
    _client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
        maxPoolSize=50,
        minPoolSize=5,
        retryWrites=True,
        w="majority",
    )
    _db = _client[settings.MONGODB_DB_NAME]
    if not await check_db_connection():
        raise RuntimeError(
            "Cannot reach MongoDB Atlas. "
            "Check MONGODB_URI and whitelist your IP in Atlas → Network Access."
        )
    await _create_indexes(_db)
    logger.info("MongoDB Atlas ready", extra={"db": settings.MONGODB_DB_NAME})


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")

# Use get_database() to access the initialised DB handle — do NOT reference _db directly.