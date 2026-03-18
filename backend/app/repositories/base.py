# app/repositories/base.py
"""
BaseRepository — common MongoDB CRUD helpers.
All repositories inherit from this. Services call repositories directly.
"""
from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class BaseRepository:

    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self.db         = db
        self.collection = db[collection_name]

    # ── Helpers ───────────────────────────────────────────────

    @staticmethod
    def to_oid(id_str: str) -> ObjectId:
        try:
            return ObjectId(id_str)
        except Exception:
            raise ValueError(f"Invalid ObjectId: {id_str}")

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    # ── Core CRUD ─────────────────────────────────────────────

    async def insert_one(self, doc: dict) -> str:
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)

    async def insert_many(self, docs: list[dict]) -> int:
        if not docs:
            return 0
        result = await self.collection.insert_many(docs, ordered=False)
        return len(result.inserted_ids)

    async def find_by_id(self, id_str: str) -> Optional[dict]:
        return await self.collection.find_one({"_id": self.to_oid(id_str)})

    async def find_one(self, query: dict) -> Optional[dict]:
        return await self.collection.find_one(query)

    async def find_many(
        self,
        query: dict,
        sort: Optional[list] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> list[dict]:
        cursor = self.collection.find(query)
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
        return await cursor.to_list(length=limit or None)

    async def count(self, query: dict) -> int:
        return await self.collection.count_documents(query)

    async def update_one(self, id_str: str, updates: dict) -> bool:
        updates.setdefault("$set", {})["updated_at"] = self._now()
        result = await self.collection.update_one(
            {"_id": self.to_oid(id_str)}, updates
        )
        return result.modified_count > 0

    async def update_by_query(self, query: dict, updates: dict) -> int:
        updates.setdefault("$set", {})["updated_at"] = self._now()
        result = await self.collection.update_many(query, updates)
        return result.modified_count

    async def delete_one(self, id_str: str) -> bool:
        result = await self.collection.delete_one({"_id": self.to_oid(id_str)})
        return result.deleted_count > 0

    async def delete_by_query(self, query: dict) -> int:
        result = await self.collection.delete_many(query)
        return result.deleted_count

    async def upsert(self, query: dict, doc: dict) -> str:
        result = await self.collection.update_one(query, {"$set": doc}, upsert=True)
        if result.upserted_id:
            return str(result.upserted_id)
        existing = await self.collection.find_one(query, {"_id": 1})
        return str(existing["_id"]) if existing else ""

    # ── Pagination helper ─────────────────────────────────────

    async def paginate(
        self,
        query: dict,
        page: int = 1,
        limit: int = 20,
        sort: Optional[list] = None,
    ) -> tuple[list[dict], int]:
        """Returns (docs, total_count)."""
        total  = await self.count(query)
        skip   = (page - 1) * limit
        docs   = await self.find_many(query, sort=sort, skip=skip, limit=limit)
        return docs, total