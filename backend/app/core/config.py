# app/core/config.py
from functools import lru_cache
from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────
    APP_NAME: str = "Finomous"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"        # development | staging | production

    # ── API ──────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    # ── MongoDB Atlas ─────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "finomous"

    # ── JWT ───────────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-replace-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7



    # ── Rate Limiting ─────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 5

    # ── Background Jobs ───────────────────────────────────────
    TRANSACTION_SYNC_INTERVAL_HOURS: int = 6
    FORECAST_UPDATE_INTERVAL_HOURS: int = 12
    RISK_SCORE_UPDATE_INTERVAL_HOURS: int = 6
    DRIFT_CHECK_INTERVAL_HOURS: int = 24

    # ── ML ────────────────────────────────────────────────────
    ML_MODELS_DIR: str = "app/ml/saved_models"
    ANOMALY_CONTAMINATION: float = 0.05
    FORECAST_HORIZON_DAYS: int = 30
    DRIFT_PSI_THRESHOLD: float = 0.2
    MIN_TRANSACTIONS_FOR_ML: int = 1

    # ── Logging ───────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "text"                # text | json

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()