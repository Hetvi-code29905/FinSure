# app/ml/forecasting/processor.py
"""
Time-series preprocessing for Prophet cash flow forecasting.
Aggregates raw transactions into daily net cash flow series.
"""
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd


class ForecastPreprocessor:

    def prepare_prophet_df(
        self,
        transactions: list[dict],
        days: int = 180,
    ) -> pd.DataFrame:
        """
        Convert transaction list → Prophet-ready DataFrame with columns [ds, y].
          ds — date (datetime)
          y  — net daily cash flow (income - expenses)
        Fills missing days with 0 so Prophet has a continuous series.
        """
        if not transactions:
            return pd.DataFrame(columns=["ds", "y"])

        # Aggregate net daily flow
        daily: dict[str, float] = {}
        for t in transactions:
            date   = t.get("date", "")
            amount = float(t.get("amount", 0))
            daily[date] = daily.get(date, 0.0) + (-amount)  # negative = income credit

        # Build date range
        end   = datetime.utcnow().date()
        start = end - timedelta(days=days)
        dates = [start + timedelta(days=i) for i in range(days + 1)]

        rows = []
        for d in dates:
            ds  = d.isoformat()
            val = daily.get(ds, 0.0)
            rows.append({"ds": pd.Timestamp(ds), "y": val})

        df = pd.DataFrame(rows)
        return df

    def compute_avg_daily_spend(self, transactions: list[dict]) -> float:
        expense = [t["amount"] for t in transactions if t.get("amount", 0) > 0]
        if not expense:
            return 0.0
        return sum(expense) / max(len(expense), 1)

    def compute_monthly_averages(self, transactions: list[dict]) -> dict:
        monthly: dict[str, dict] = {}
        for t in transactions:
            month  = t.get("date", "")[:7]
            amount = float(t.get("amount", 0))
            if month not in monthly:
                monthly[month] = {"income": 0.0, "expense": 0.0}
            if amount < 0:
                monthly[month]["income"] += abs(amount)
            else:
                monthly[month]["expense"] += amount

        if not monthly:
            return {"avg_monthly_income": 0.0, "avg_monthly_expense": 0.0}

        months = list(monthly.values())
        return {
            "avg_monthly_income":  round(sum(m["income"] for m in months) / len(months), 2),
            "avg_monthly_expense": round(sum(m["expense"] for m in months) / len(months), 2),
        }