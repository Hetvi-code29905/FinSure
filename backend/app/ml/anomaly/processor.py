# app/ml/anomaly/processor.py
"""
Feature engineering for Isolation Forest anomaly detection.
Extracts numerical features from raw transaction documents.
"""
import numpy as np
from datetime import datetime


CATEGORY_INDEX = {
    "Food & Dining": 0, "Shopping": 1, "Travel": 2, "Entertainment": 3,
    "Services": 4, "Healthcare": 5, "Income": 6, "Transfers": 7,
    "Utilities": 8, "Education": 9, "Fees & Charges": 10, "Uncategorized": 11,
}


class AnomalyPreprocessor:

    def transform(self, transactions: list[dict]) -> tuple[np.ndarray, list[str]]:
        """
        Convert transaction dicts → feature matrix X and list of doc IDs.

        Features per transaction (6 total):
          0  abs_amount      — absolute spend magnitude (income/expense separated)
          1  amount_log      — log1p(abs_amount) for scale invariance
          2  day_of_week     — 0=Mon … 6=Sun
          3  day_of_month    — 1–31
          4  category_idx    — integer-encoded category
          5  is_income       — 1 if income, 0 if expense (so model evaluates them separately)
        """
        rows: list[list[float]] = []
        ids:  list[str]         = []

        for t in transactions:
            raw_amount = float(t.get("amount", 0))
            txn_type   = t.get("type", "expense")
            date       = t.get("date", "")
            cat        = t.get("category", "Uncategorized")

            # Classify income vs expense using type field first, then sign
            is_income = 1.0 if (txn_type == "income" or raw_amount < 0) else 0.0
            abs_amount = abs(raw_amount)

            try:
                dt = datetime.strptime(date, "%Y-%m-%d")
                dow = dt.weekday()
                dom = dt.day
            except ValueError:
                dow = 0
                dom = 1

            row = [
                abs_amount,
                float(np.log1p(abs_amount)),
                float(dow),
                float(dom),
                float(CATEGORY_INDEX.get(cat, 11)),
                is_income,
            ]
            rows.append(row)
            ids.append(str(t.get("_id", t.get("id", ""))))

        X = np.array(rows, dtype=np.float32) if rows else np.empty((0, 6), dtype=np.float32)
        return X, ids