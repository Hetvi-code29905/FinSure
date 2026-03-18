from motor.motor_asyncio import AsyncIOMotorClient
from app.services.ml_orchestrator import MLOrchestrator
import asyncio

async def test():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["finomous"]
    u = await db.users.find_one()
    if not u:
        print("No users")
        return
    print(f"Testing for user: {u['_id']}")
    orch = MLOrchestrator(db)
    res = await orch.run_full_pipeline(str(u['_id']), force=True)
    print("Forecast:")
    print(res.get("forecast"))
    print("Risk:")
    print(res.get("risk"))

if __name__ == "__main__":
    asyncio.run(test())
