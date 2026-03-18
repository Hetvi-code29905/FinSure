# app/models/user.py
from datetime import datetime, timezone


class UserRole:
    USER  = "user"
    ADMIN = "admin"


def new_user_doc(email: str, hashed_password: str, full_name: str,
                 currency: str = "INR", monthly_income_range: str = "Not specified",
                 pay_cycle: str = "Monthly", basic_goal: str = "Just track",
                 role: str = UserRole.USER) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "email":                  email.lower().strip(),
        "hashed_password":        hashed_password,
        "full_name":              full_name.strip(),
        "currency":               currency,
        "monthly_income_range":   monthly_income_range,
        "pay_cycle":              pay_cycle,
        "basic_goal":             basic_goal,
        "role":                   role,
        "is_active":              True,
        "plaid_linked":           False,
        "onboarding_status":      "pending_tier2",
        "fixed_expenses":         [],
        "savings":                None,
        "has_debt":               None,
        "debt_amount":            None,
        "behavioral_answers":     {},
        "failed_login_attempts":  0,
        "locked_until":           None,
        "last_login_at":          None,
        "deleted_at":             None,
        "created_at":             now,
        "updated_at":             now,
    }


def serialize_user(doc: dict) -> dict:
    def _iso(v):
        return v.isoformat() if isinstance(v, datetime) else v

    return {
        "id":           str(doc["_id"]),
        "email":        doc.get("email"),
        "full_name":    doc.get("full_name"),
        "currency":     doc.get("currency", "INR"),
        "monthly_income_range": doc.get("monthly_income_range", "Not specified"),
        "pay_cycle":    doc.get("pay_cycle", "Monthly"),
        "basic_goal":   doc.get("basic_goal", "Just track"),
        "role":         doc.get("role", UserRole.USER),
        "is_active":    doc.get("is_active", True),
        "plaid_linked": doc.get("plaid_linked", False),
        "onboarding_status": doc.get("onboarding_status", "pending_tier2"),
        "fixed_expenses": doc.get("fixed_expenses", []),
        "savings":      doc.get("savings"),
        "has_debt":     doc.get("has_debt"),
        "debt_amount":  doc.get("debt_amount"),
        "behavioral_answers": doc.get("behavioral_answers", {}),
        "created_at":   _iso(doc.get("created_at")),
        "last_login_at":_iso(doc.get("last_login_at")),
    }