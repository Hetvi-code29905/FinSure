# app/models/ml_metadata.py
from datetime import datetime, timezone
from typing import Optional


class ModelType:
    ISOLATION_FOREST = "isolation_forest"
    PROPHET          = "prophet_forecast"
    RISK_SCORER      = "risk_scorer"


def new_model_metadata_doc(
    model_type: str,
    version: str,
    file_path: str,
    metrics: Optional[dict] = None,
    user_id: Optional[str] = None,
    triggered_by: str = "scheduled",
) -> dict:
    return {
        "model_type":     model_type,
        "version":        version,
        "file_path":      file_path,
        "metrics":        metrics or {},
        "user_id":        user_id,       # None = global model
        "triggered_by":   triggered_by,  # scheduled | drift | manual
        "is_active":      True,
        "trained_at":     datetime.now(timezone.utc),
        "deactivated_at": None,
    }