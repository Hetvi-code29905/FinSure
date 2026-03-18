from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def test():
    db = AsyncIOMotorClient("mongodb://127.0.0.1:27017")["finomous"]
    users = await db.users.count_documents({})
    print(f"Users: {users}")
    txns = await db.transactions.count_documents({})
    print(f"Txns: {txns}")
    u = await db.users.find_one()
    if u:
        uid = str(u['_id'])
        user_txns = await db.transactions.find({"user_id": uid}).to_list(100)
        print(f"User Txns: {len(user_txns)}")
        print(user_txns)
        
        # also test risk computation directly
        from app.services.risk_service import RiskService
        svc = RiskService(db)
        scores = await svc.compute_and_store(uid, force=True)
        print("Risk:")
        print(scores)

        # test forecast
        from app.services.forecast_service import ForecastService
        f_svc = ForecastService(db)
        f_scores = await f_svc.generate_and_store(uid, force=True)
        print("Forecast:")
        print(f_scores)

if __name__ == "__main__":
    asyncio.run(test())
