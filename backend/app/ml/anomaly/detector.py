# app/ml/anomaly/detector.py
"""
Isolation Forest anomaly detector.
Trains a model on the feature matrix produced by AnomalyPreprocessor,
then returns per-transaction anomaly scores and binary flags.
"""
import os
from typing import Optional, Tuple

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

MODEL_PATH  = os.path.join(settings.ML_MODELS_DIR, "isolation_forest.joblib")
SCALER_PATH = os.path.join(settings.ML_MODELS_DIR, "anomaly_scaler.joblib")


class AnomalyDetector:

    def __init__(self):
        self.model:  Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler]  = None
        self._load()

    def _load(self) -> None:
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
                self.model  = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
                logger.info("Isolation Forest model loaded from disk")
        except Exception as e:
            logger.warning("Could not load anomaly model", extra={"error": str(e)})

    def train(self, X: np.ndarray) -> dict:
        """
        Fit a new Isolation Forest on feature matrix X.
        Returns basic proxy metrics (no ground truth labels available).
        """
        if len(X) < 1:
            raise ValueError(f"Need ≥1 samples for training, got {len(X)}.")

        self.scaler = StandardScaler()
        Xs          = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=200,
            contamination=settings.ANOMALY_CONTAMINATION,
            max_features=1.0,
            random_state=42,
            n_jobs=1,
        )
        self.model.fit(Xs)

        os.makedirs(settings.ML_MODELS_DIR, exist_ok=True)
        joblib.dump(self.model,  MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)
        logger.info("Isolation Forest trained and saved", extra={"samples": len(X)})

        scores       = self.model.score_samples(Xs)
        anomaly_rate = float((scores < 0).mean())
        return {
            "samples":      len(X),
            "anomaly_rate": round(anomaly_rate, 4),
            "score_mean":   round(float(scores.mean()), 4),
            "score_std":    round(float(scores.std()), 4),
        }

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict anomaly scores and flags for feature matrix X.
        If no trained model exists, trains on X first (bootstrapping).

        Returns:
          scores  — raw decision scores (more negative = more anomalous)
          flags   — bool array, True = anomaly
        """
        if len(X) == 0:
            return np.array([]), np.array([], dtype=bool)

        if self.model is None or self.scaler is None:
            logger.info("No trained model — bootstrapping on current data")
            self.train(X)

        Xs     = self.scaler.transform(X)
        scores = self.model.score_samples(Xs)   # negative = anomalous
        flags  = self.model.predict(Xs) == -1   # -1 = anomaly in sklearn

        # Hard heuristic for sudden huge spikes (e.g. 60000 healthcare)
        abs_amounts = X[:, 0]
        if len(abs_amounts) >= 3:
            median_amt = np.median(abs_amounts)
            if median_amt > 0:
                for i, amt in enumerate(abs_amounts):
                    if amt > (median_amt * 8) and amt > 5000:
                        flags[i] = True
                        scores[i] = -0.99

        return scores, flags