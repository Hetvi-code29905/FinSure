# app/models/income.py
from datetime import datetime, timezone


def new_income_profile_doc(
    user_id: str,
    income_type: str,               # fixed | freelance | mixed | student
    monthly_amount: float = 0.0,
    salary_day: int = 1,            # 1-31 (Day of the month they get paid)
    currency_code: str = "INR",
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "user_id":        user_id,
        "income_type":    income_type,
        "monthly_amount": monthly_amount,
        "salary_day":     salary_day,
        "currency_code":  currency_code,
        "created_at":     now,
        "updated_at":     now,
    }


def serialize_income_profile(doc: dict) -> dict:
    return {
        "id":             str(doc["_id"]),
        "income_type":    doc.get("income_type", "fixed"),
        "monthly_amount": doc.get("monthly_amount", 0.0),
        "salary_day":     doc.get("salary_day", 1),
        "currency_code":  doc.get("currency_code", "INR"),
    }
