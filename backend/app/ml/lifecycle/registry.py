# app/ml/lifecycle/registry.py
"""
Model registry — tracks active model versions in MongoDB.
Ensures only one model of each type is marked active at a time.
"""
import os
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import Collections
from app.core.logging import get_logger
from app.models.ml_metadata import ModelType, new_model_metadata_doc

logger = get_logger(__name__)


class ModelRegistry:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db[Collections.MODEL_METADATA]

    async def register(
        self,
        model_type: str,
        version: str,
        file_path: str,
        metrics: Optional[dict] = None,
        user_id: Optional[str] = None,
        triggered_by: str = "scheduled",
    ) -> str:
        """Register a new model version and deactivate the previous one."""
        # Deactivate old active model of same type
        await self.col.update_many(
            {"model_type": model_type, "user_id": user_id, "is_active": True},
            {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc)}},
        )
        doc = new_model_metadata_doc(
            model_type=model_type,
            version=version,
            file_path=file_path,
            metrics=metrics,
            user_id=user_id,
            triggered_by=triggered_by,
        )
        result = await self.col.insert_one(doc)
        logger.info("Model registered", extra={
            "type": model_type, "version": version, "user": user_id
        })
        return str(result.inserted_id)

    async def get_active(
        self,
        model_type: str,
        user_id: Optional[str] = None,
    ) -> Optional[dict]:
        return await self.col.find_one(
            {"model_type": model_type, "user_id": user_id, "is_active": True}
        )

    async def list_versions(self, model_type: str, limit: int = 10) -> list[dict]:
        cursor = self.col.find({"model_type": model_type}).sort("trained_at", -1).limit(limit)
        docs   = await cursor.to_list(length=limit)
        return [
            {
                "id":           str(d["_id"]),
                "version":      d.get("version"),
                "is_active":    d.get("is_active"),
                "metrics":      d.get("metrics"),
                "triggered_by": d.get("triggered_by"),
                "trained_at":   d["trained_at"].isoformat() if isinstance(d.get("trained_at"), datetime) else d.get("trained_at"),
            }
            for d in docs
        ]

    async def next_version(self, model_type: str) -> str:
        """Auto-increment version string: v1, v2, v3..."""
        count = await self.col.count_documents({"model_type": model_type})
        return f"v{count + 1}"