# app/models/audit_log.py
from datetime import datetime, timezone
from typing import Optional


class AuditEvent:
    REGISTER         = "user.register"
    LOGIN            = "user.login"
    LOGIN_FAILED     = "user.login_failed"
    LOGOUT           = "user.logout"
    TOKEN_REFRESH    = "user.token_refresh"
    PASSWORD_CHANGE  = "user.password_change"
    ACCOUNT_LOCKED   = "user.account_locked"
    PROFILE_UPDATE   = "user.profile_update"
    ACCOUNT_DELETED  = "user.account_deleted"
    PLAID_LINK       = "plaid.link"
    PLAID_EXCHANGE   = "plaid.exchange"
    PLAID_SYNC       = "plaid.sync"
    PLAID_DISCONNECT = "plaid.disconnect"
    CSV_IMPORT       = "transactions.csv_import"
    RISK_COMPUTED    = "ml.risk_computed"
    FORECAST_GEN     = "ml.forecast_generated"
    MODEL_RETRAINED  = "ml.model_retrained"


def new_audit_doc(
    event_type: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[dict] = None,
    success: bool = True,
) -> dict:
    return {
        "event_type": event_type,
        "user_id":    user_id,
        "ip_address": ip_address,
        "metadata":   metadata or {},
        "success":    success,
        "timestamp":  datetime.now(timezone.utc),
    }