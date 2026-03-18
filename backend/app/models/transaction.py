# app/models/transaction.py
from datetime import datetime, timezone
from typing import Optional


def new_transaction_doc(
    user_id: str,
    amount: float,           # Keep logic: positive = expense, negative = income
    date: str,               # "YYYY-MM-DD"
    name: str,               # "Swiggy", "Salary", "Rent"
    source: str = "manual",  # manual | csv | sms 
    account_id: Optional[str] = None, 
    category: str = "Uncategorized",
    type_: str = "expense",  # expense | income | transfer
    note: Optional[str] = None,
    currency_code: str = "INR",
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "user_id":            user_id,
        "account_id":         account_id,
        "amount":             amount,
        "date":               date,
        "name":               name,
        "category":           category,
        "type":               type_,
        "source":             source,
        "note":               note,
        "currency_code":      currency_code,
        # ML / AI fields
        "is_pending":         False,
        "is_anomaly":         False,
        "anomaly_score":      None,
        "anomaly_flagged_at": None,
        "created_at":         now,
        "updated_at":         now,
    }


def serialize_transaction(doc: dict) -> dict:
    return {
        "id":            str(doc["_id"]),
        "account_id":    doc.get("account_id"),
        "amount":        doc.get("amount"),
        "date":          doc.get("date"),
        "name":          doc.get("name"),
        "category":      doc.get("category", "Uncategorized"),
        "type":          doc.get("type", "expense"),
        "source":        doc.get("source", "manual"),
        "note":          doc.get("note"),
        "currency_code": doc.get("currency_code", "INR"),
        "is_anomaly":    doc.get("is_anomaly", False),
        "anomaly_score": doc.get("anomaly_score"),
    }