import requests
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def get_test_creds():
    db = AsyncIOMotorClient("mongodb://127.0.0.1:27017")["finomous"]
    u = await db.users.find_one()
    print("User", u['email'])
    return u['email']

def test():
    email = asyncio.run(get_test_creds())
    print("Trying login with common password...")
    # we don't know the password...
    # wait, could we just bypass it by generating a token directly via jose?
    pass

import os
from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = "dev-secret-replace-in-prod"
ALGORITHM = "HS256"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def do():
    db = AsyncIOMotorClient("mongodb://127.0.0.1:27017")["finomous"]
    u = await db.users.find_one()
    token = create_access_token({"sub": str(u['_id'])})
    print("Token:", token)

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "amount": 200.0,
        "date": "2024-03-12",
        "name": "TestTxn",
        "category": "Food",
        "type": "expense",
        "source": "manual",
        "currency_code": "INR"
    }
    r = requests.post("http://localhost:8000/api/v1/transactions/", json=payload, headers=headers)
    print("Status:", r.status_code)
    print("Response:", r.text)

if __name__ == "__main__":
    asyncio.run(do())
