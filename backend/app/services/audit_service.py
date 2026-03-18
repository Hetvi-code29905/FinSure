# app/services/audit_service.py
from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import Collections
from app.core.logging import get_logger
from app.models.audit_log import new_audit_doc

logger = get_logger(__name__)


class AuditService:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db[Collections.AUDIT_LOGS]

    async def log(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        metadata: Optional[dict] = None,
        success: bool = True,
    ) -> None:
        """Write one audit entry. Never raises — failures are logged, not propagated."""
        try:
            await self.col.insert_one(
                new_audit_doc(event_type, user_id, ip_address, metadata, success)
            )
        except Exception as e:
            logger.error("Audit write failed", extra={"event": event_type, "error": str(e)})

    async def get_user_events(
        self,
        user_id: str,
        event_type: Optional[str] = None,
        limit: int = 50,
    ) -> list[dict]:
        query: dict = {"user_id": user_id}
        if event_type:
            query["event_type"] = event_type
        cursor = self.col.find(query).sort("timestamp", -1).limit(limit)
        docs   = await cursor.to_list(length=limit)
        return [
            {
                "event_type": d.get("event_type"),
                "success":    d.get("success"),
                "ip_address": d.get("ip_address"),
                "metadata":   d.get("metadata"),
                "timestamp":  d["timestamp"].isoformat()
                              if isinstance(d.get("timestamp"), datetime)
                              else d.get("timestamp"),
            }
            for d in docs
        ]