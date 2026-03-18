# app/models/account.py
from datetime import datetime, timezone
from typing import Optional


def new_account_doc(
    user_id: str,
    name: str,
    account_type: str,  # bank, wallet, cash, credit_card, etc.
    balance: float = 0.0,
    currency_code: str = "INR",
    credit_limit: Optional[float] = None,
    billing_date: Optional[int] = None,
    color: Optional[str] = None
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "user_id":       user_id,
        "name":          name,
        "type":          account_type,
        "balance":       balance,
        "currency_code": currency_code,
        "credit_limit":  credit_limit,
        "billing_date":  billing_date,
        "color":         color,
        "is_active":     True,
        "created_at":    now,
        "updated_at":    now,
    }


def serialize_account(doc: dict) -> dict:
    return {
        "id":            str(doc["_id"]),
        "name":          doc.get("name"),
        "type":          doc.get("type"),
        "balance":       doc.get("balance"),
        "currency_code": doc.get("currency_code", "INR"),
        "credit_limit":  doc.get("credit_limit"),
        "billing_date":  doc.get("billing_date"),
        "color":         doc.get("color"),
        "is_active":     doc.get("is_active", True),
    }