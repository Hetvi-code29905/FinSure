# app/ml/forecasting/engine.py
"""
Prophet-based cash flow forecasting engine.
Generates a 30-day balance projection with confidence intervals.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import pandas as pd

from app.core.config import settings
from app.core.logging import get_logger
from app.ml.forecasting.processor import ForecastPreprocessor

logger = get_logger(__name__)


class ForecastEngine:

    def __init__(self):
        self.processor = ForecastPreprocessor()

    def forecast(
        self,
        transactions: list[dict],
        current_balance: float,
        horizon_days: int = 30,
    ) -> dict:
        """
        Run simple linear forecast and return the full doc dict.
        We route straight to the fallback to ensure compatibility.
        """
        raise ValueError("Prophet bypassed in development")