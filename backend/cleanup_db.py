import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB_NAME", "finomous")
    client = AsyncIOMotorClient(uri)
    db = client[db_name]
    
    deleted_accounts = await db["accounts"].delete_many({})
    print(f"Deleted {deleted_accounts.deleted_count} accounts")
    
    deleted_transactions = await db["transactions"].delete_many({})
    print(f"Deleted {deleted_transactions.deleted_count} transactions")

if __name__ == "__main__":
    asyncio.run(main())
