# app/services/budget_service.py
"""
Budget & Spending Service
=========================
All computations are pure math — no ML, no fuzzy logic.

Core formulas:
  50/30/20 drift   = actual / target × 100 − 100
  Weekend mult.    = (weekend_spend / 2) / (weekday_spend / 5)
  Lifestyle creep  = expense_growth > income_growth (when income grows > 5%)
  Month comparison = (this_month − last_month) / last_month × 100
"""
import statistics
from datetime import datetime, timezone, timedelta
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import Collections
from app.core.logging import get_logger
from app.repositories.account_repository import AccountRepository
from app.repositories.transaction_repository import TransactionRepository

logger = get_logger(__name__)

# ── Category → 50/30/20 bucket mapping ──────────────────────────
NEEDS = {
    "Utilities", "Healthcare", "Services", "Education",
    "Bills", "Insurance", "Rent", "Groceries",
}
WANTS = {
    "Food & Dining", "Shopping", "Travel", "Entertainment",
    "Fees & Charges", "Uncategorized", "Subscriptions",
}
# Savings bucket = income transactions going out as savings / transfers
# (we compute it as income minus expenses)

# ── Category emoji map ───────────────────────────────────────────
CATEGORY_EMOJI = {
    "Food & Dining": "🍽️", "Shopping": "🛒", "Travel": "✈️",
    "Entertainment": "🎮", "Services": "⚙️", "Healthcare": "💊",
    "Income": "💰", "Transfers": "🔄", "Utilities": "💡",
    "Education": "📚", "Fees & Charges": "🏦", "Uncategorized": "📦",
    "Bills": "📋", "Subscriptions": "🔁",
}

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class BudgetService:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db       = db
        self.acc_repo = AccountRepository(db)
        self.txn_repo = TransactionRepository(db)

    # ── Main analysis ─────────────────────────────────────────

    async def get_analysis(self, user_id: str, target_savings: float = 0) -> dict:
        """
        Compute the full budget analysis for the current calendar month driven by savings target.
        """
        now         = datetime.now(timezone.utc)
        currency    = await self._get_currency(user_id)

        # Pull 90 days of transactions for patterns + lifestyle creep
        all_txns  = await self.txn_repo.find_for_ml(user_id, days=90)
        # Current month slice
        month_str  = now.strftime("%Y-%m")
        this_month = [t for t in all_txns if t.get("date", "")[:7] == month_str]
        # Last month
        last_month_dt  = (now.replace(day=1) - timedelta(days=1))
        last_month_str = last_month_dt.strftime("%Y-%m")
        last_month_txns = [t for t in all_txns if t.get("date", "")[:7] == last_month_str]

        # ── Income & expense this month ───────────────────────
        inc_this    = sum(abs(t["amount"]) for t in this_month
                         if t.get("type") == "income" or t.get("amount", 0) < 0)
        exp_this    = sum(abs(t["amount"]) for t in this_month
                         if t.get("type") != "income" and t.get("amount", 0) > 0)
        savings_this = max(0.0, inc_this - exp_this)

        # If no income this month, fall back to avg from last 3 months
        if inc_this == 0:
            monthly_avgs = self._monthly_avgs(all_txns)
            inc_this     = monthly_avgs["income"]

        # ── Buckets derived from target_savings ─────────────────────────────────
        expense_txns = [t for t in this_month
                       if t.get("type") != "income" and t.get("amount", 0) > 0]
        by_cat = self._group_by_category(expense_txns)

        needs_actual  = sum(v for k, v in by_cat.items() if k in NEEDS)
        wants_actual  = sum(v for k, v in by_cat.items() if k in WANTS)
        
        # If target_savings > 0, we deduct from inc_this and split the rest 60/40 for Needs/Wants
        if target_savings > 0:
            savings_target = target_savings
        else:
            # Fallback mapping if they don't give a target, assume standard 20%
            savings_target = inc_this * 0.20

        remainder = max(0.0, inc_this - savings_target)
        needs_target = remainder * 0.60
        wants_target = remainder * 0.40

        savings_pct = (savings_target / inc_this * 100) if inc_this > 0 else 0
        needs_pct = (needs_target / inc_this * 100) if inc_this > 0 else 0
        wants_pct = (wants_target / inc_this * 100) if inc_this > 0 else 0

        needs_bucket   = self._make_bucket("Needs",   "🏠", round(needs_pct,1),   needs_target,  needs_actual,  inc_this, by_cat, NEEDS)
        wants_bucket   = self._make_bucket("Wants",   "🛒", round(wants_pct,1),   wants_target,  wants_actual,  inc_this, by_cat, WANTS)
        savings_bucket = self._make_savings_bucket(round(savings_pct,1), savings_target, savings_this, inc_this)
        
        # ── ML Prediction (Rule based forecasting) ──
        savings_prediction = None
        if target_savings > 0:
            historical_avg_expense = self._monthly_avgs(all_txns)["expense"]
            projected_remainder = inc_this - historical_avg_expense
            if projected_remainder >= target_savings:
                savings_prediction = f"Based on your 90-day history (avg spend {historical_avg_expense:.0f}), you are highly likely to hit your target of {target_savings:.0f}! You normally save {projected_remainder:.0f}."
            elif projected_remainder > 0:
                deficit = target_savings - projected_remainder
                savings_prediction = f"You normally save around {projected_remainder:.0f}. To hit your {target_savings:.0f} target, you must reduce your historical average monthly spending by {deficit:.0f}."
            else:
                savings_prediction = f"Hitting {target_savings:.0f} will be challenging. Your past 90 days show you usually spend more than you earn. You need an aggressive cut of {(historical_avg_expense - inc_this) + target_savings:.0f}!"


        # ── Top categories ────────────────────────────────────
        top_cats = sorted(by_cat.items(), key=lambda x: x[1], reverse=True)[:6]
        top_categories = [
            {
                "category": cat,
                "amount":   round(amt, 2),
                "pct_of_total": round(amt / exp_this * 100, 1) if exp_this > 0 else 0,
                "emoji":    CATEGORY_EMOJI.get(cat, "📦"),
            }
            for cat, amt in top_cats
        ]

        # ── Top income categories ─────────────────────────────
        income_txns = [t for t in this_month if t.get("type") == "income" or t.get("amount", 0) < 0]
        inc_by_cat = self._group_by_category(income_txns)
        top_inc_cats = sorted(inc_by_cat.items(), key=lambda x: x[1], reverse=True)[:6]
        top_income_categories = [
            {
                "category": cat,
                "amount":   round(amt, 2),
                "pct_of_total": round(amt / inc_this * 100, 1) if inc_this > 0 else 0,
                "emoji":    CATEGORY_EMOJI.get(cat, "💰"),
            }
            for cat, amt in top_inc_cats
        ]

        # ── Month-over-month comparison ───────────────────────
        by_cat_last    = self._group_by_category([
            t for t in last_month_txns
            if t.get("type") != "income" and t.get("amount", 0) > 0
        ])
        month_comparisons = self._compare_months(by_cat, by_cat_last)

        # ── "Where Did My Money Go?" natural language summary ─
        human_summary = self._generate_summary(top_cats, month_comparisons, exp_this, inc_this)

        # ── Spending patterns (day of week) ───────────────────
        patterns, peak_day, weekend_mult = self._spending_patterns(all_txns)

        # ── Lifestyle creep detection ─────────────────────────
        lc = self._lifestyle_creep(all_txns)

        # ── Drift alerts ──────────────────────────────────────
        alerts = self._build_alerts(needs_bucket, wants_bucket, savings_bucket, savings_this, savings_target)

        return {
            "month_label":             now.strftime("%B %Y"),
            "monthly_income":          round(inc_this, 2),
            "monthly_expense":         round(exp_this, 2),
            "savings_this_month":      round(savings_this, 2),
            "currency_code":           currency,
            "needs":                   needs_bucket,
            "wants":                   wants_bucket,
            "savings_bucket":          savings_bucket,
            "human_summary":           human_summary,
            "top_categories":          top_categories,
            "top_income_categories":   top_income_categories,
            "month_comparisons":       month_comparisons,
            "patterns":                patterns,
            "peak_spending_day":       peak_day,
            "weekend_multiplier":      round(weekend_mult, 2),
            "lifestyle_creep_detected": lc["detected"],
            "income_growth_pct":       lc["income_growth"],
            "expense_growth_pct":      lc["expense_growth"],
            "lifestyle_creep_message": lc["message"],
            "alerts":                  alerts,
            "savings_prediction":      savings_prediction,
            "computed_at":             datetime.now(timezone.utc).isoformat(),
        }

    # ── Helpers ───────────────────────────────────────────────

    def _make_bucket(self, name, emoji, target_pct, target_amount, actual, income, by_cat, cat_set) -> dict:
        if target_amount > 0:
            drift = (actual / target_amount * 100) - 100
        else:
            drift = 0.0

        if actual == 0 and target_amount == 0:
            status, color = "No Data", "#6b7280"
        elif drift <= -10:
            status, color = "Under Budget ✅", "#10b981"
        elif drift <= 10:
            status, color = "On Track 👍", "#3b82f6"
        elif drift <= 30:
            status, color = "Slightly Over ⚠️", "#f59e0b"
        else:
            status, color = "Over Budget 🔴", "#ef4444"

        cats_in_bucket = [(k, v) for k, v in by_cat.items() if k in cat_set]
        cats_in_bucket.sort(key=lambda x: x[1], reverse=True)

        return {
            "name":                name,
            "emoji":               emoji,
            "target_pct":          target_pct,
            "target_amount":       round(target_amount, 2),
            "actual_amount":       round(actual, 2),
            "actual_pct_of_income": round(actual / income * 100, 1) if income > 0 else 0,
            "drift_pct":           round(drift, 1),
            "status":              status,
            "status_color":        color,
            "categories":          [
                {
                    "name": k,
                    "amount": round(v, 2),
                    "pct_of_bucket": round(v / actual * 100, 1) if actual > 0 else 0,
                    "emoji": CATEGORY_EMOJI.get(k, "📦"),
                }
                for k, v in cats_in_bucket[:4]
            ],
        }

    def _make_savings_bucket(self, target_pct, target_amount, actual_savings, income) -> dict:
        if target_amount > 0:
            drift = (actual_savings / target_amount * 100) - 100
        else:
            drift = 0.0

        if actual_savings >= target_amount:
            status, color = "On Track 👍", "#10b981"
        elif drift >= -30:
            status, color = "Slightly Under ⚠️", "#f59e0b"
        else:
            status, color = "Under Target 🔴", "#ef4444"

        return {
            "name":                "Savings",
            "emoji":               "💰",
            "target_pct":          target_pct,
            "target_amount":       round(target_amount, 2),
            "actual_amount":       round(actual_savings, 2),
            "actual_pct_of_income": round(actual_savings / income * 100, 1) if income > 0 else 0,
            "drift_pct":           round(drift, 1),
            "status":              status,
            "status_color":        color,
            "categories":          [],
        }

    def _group_by_category(self, txns: list) -> dict:
        by_cat: dict = {}
        for t in txns:
            cat = t.get("category", "Uncategorized")
            by_cat[cat] = by_cat.get(cat, 0) + abs(t.get("amount", 0))
        return by_cat

    def _compare_months(self, this: dict, last: dict) -> list:
        all_cats = set(this) | set(last)
        result   = []
        for cat in all_cats:
            t = this.get(cat, 0)
            l = last.get(cat, 0)
            if t == 0 and l == 0:
                continue
            change_amt = t - l
            change_pct = ((t - l) / l * 100) if l > 0 else (100.0 if t > 0 else 0.0)
            result.append({
                "category":      cat,
                "this_month":    round(t, 2),
                "last_month":    round(l, 2),
                "change_pct":    round(change_pct, 1),
                "change_amount": round(change_amt, 2),
            })
        result.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
        return result[:6]

    def _generate_summary(self, top_cats, comparisons, exp_this, inc_this) -> str:
        if not top_cats:
            return "No spending data for this month yet. Add transactions to see your breakdown."

        biggest_cat, biggest_amt = top_cats[0]

        lines = []
        if exp_this > 0:
            lines.append(f"Your biggest expense this month is {biggest_cat} at "
                         f"{round(biggest_amt / exp_this * 100)}% of total spending.")

        # Spot the biggest monthly increase
        increases = [c for c in comparisons if c["change_pct"] > 20 and c["last_month"] > 0]
        if increases:
            top_inc = increases[0]
            lines.append(f"You spent {round(top_inc['change_pct'])}% more on "
                         f"{top_inc['category']} vs last month.")

        # Savings comment
        savings = inc_this - exp_this
        if inc_this > 0:
            savings_pct = savings / inc_this * 100
            if savings_pct >= 20:
                lines.append(f"Great job — you saved {round(savings_pct)}% of your income this month!")
            elif savings_pct > 0:
                lines.append(f"You saved {round(savings_pct)}% of income. "
                             f"Aim for 20% for a healthier financial cushion.")
            else:
                lines.append("You spent more than you earned this month. "
                             "Try cutting back on 'Wants' spending.")

        return " ".join(lines) if lines else "Keep tracking your transactions for better insights."

    def _spending_patterns(self, txns: list) -> tuple:
        """
        Returns (patterns_list, peak_day_name, weekend_multiplier)
        """
        day_totals = [0.0] * 7
        day_counts = [0]   * 7

        expenses = [t for t in txns
                   if t.get("type") != "income" and t.get("amount", 0) > 0]

        for t in expenses:
            raw = t.get("date", "")
            if not raw:
                continue
            try:
                dow = datetime.strptime(raw[:10], "%Y-%m-%d").weekday()
                day_totals[dow] += abs(t.get("amount", 0))
                day_counts[dow] += 1
            except ValueError:
                continue

        # Peak spending day
        peak_idx  = day_totals.index(max(day_totals)) if any(day_totals) else 5
        peak_day  = DAYS[peak_idx]

        # Weekday vs weekend
        weekday_total = sum(day_totals[:5])
        weekend_total = sum(day_totals[5:])
        weekday_days  = max(sum(1 for x in day_counts[:5] if x > 0), 1)
        weekend_days  = max(sum(1 for x in day_counts[5:] if x > 0), 1)

        weekday_avg = weekday_total / weekday_days if weekday_days else 0
        weekend_avg = weekend_total / weekend_days if weekend_days else 0
        multiplier  = round(weekend_avg / weekday_avg, 2) if weekday_avg > 0 else 1.0

        patterns = []

        if multiplier > 1.5:
            patterns.append({
                "emoji":    "📅",
                "insight":  f"Weekend spending is {multiplier:.1f}× higher than weekdays",
                "detail":   f"You spend ~{round(weekend_avg)} on weekends vs ~{round(weekday_avg)} on weekdays.",
                "severity": "warn",
            })
        elif multiplier < 0.8 and weekday_avg > 0:
            patterns.append({
                "emoji":    "✅",
                "insight":  "You spend more on weekdays than weekends",
                "detail":   "You tend to control leisure spending well.",
                "severity": "good",
            })

        if peak_day in ("Saturday", "Sunday"):
            patterns.append({
                "emoji":    "🏖️",
                "insight":  f"Your heaviest spending day is {peak_day}",
                "detail":   f"Consider setting a weekend budget to stay on track.",
                "severity": "warn",
            })
        else:
            patterns.append({
                "emoji":    "📌",
                "insight":  f"Your peak spending day is {peak_day}",
                "detail":   "Plan ahead for this day to keep it under control.",
                "severity": "neutral",
            })

        # Check if top category dominates (>50% of spend)
        if expenses:
            by_cat = self._group_by_category(expenses)
            total  = sum(by_cat.values())
            top    = max(by_cat.items(), key=lambda x: x[1])
            if total > 0 and top[1] / total > 0.5:
                patterns.append({
                    "emoji":    "🎯",
                    "insight":  f"{top[0]} dominates your spending",
                    "detail":   f"It accounts for {round(top[1]/total*100)}% of all expenses this period.",
                    "severity": "warn",
                })

        return patterns, peak_day, multiplier

    def _lifestyle_creep(self, txns: list) -> dict:
        """
        Compare average monthly income & expense over 3-month windows.
        Lifestyle creep if expenses grow faster than income when income IS growing.
        """
        now = datetime.now(timezone.utc)
        months_data: dict = {}

        for t in txns:
            m = t.get("date", "")[:7]
            if not m:
                continue
            months_data.setdefault(m, {"inc": 0.0, "exp": 0.0})
            amt = abs(t.get("amount", 0))
            if t.get("type") == "income" or t.get("amount", 0) < 0:
                months_data[m]["inc"] += amt
            else:
                months_data[m]["exp"] += amt

        sorted_months = sorted(months_data.keys())
        if len(sorted_months) < 2:
            return {
                "detected":      False,
                "income_growth": 0.0,
                "expense_growth": 0.0,
                "message":       "Need at least 2 months of data to detect lifestyle creep.",
            }

        # Compare oldest half vs newest half
        mid    = len(sorted_months) // 2
        first  = sorted_months[:mid]
        second = sorted_months[mid:]

        avg_inc_old = statistics.mean([months_data[m]["inc"] for m in first]) if first else 0
        avg_inc_new = statistics.mean([months_data[m]["inc"] for m in second]) if second else 0
        avg_exp_old = statistics.mean([months_data[m]["exp"] for m in first]) if first else 0
        avg_exp_new = statistics.mean([months_data[m]["exp"] for m in second]) if second else 0

        inc_growth = ((avg_inc_new - avg_inc_old) / avg_inc_old * 100) if avg_inc_old > 0 else 0.0
        exp_growth = ((avg_exp_new - avg_exp_old) / avg_exp_old * 100) if avg_exp_old > 0 else 0.0

        # Creep = income grew > 5% AND expenses grew faster than income
        detected = inc_growth > 5 and exp_growth > inc_growth

        if detected:
            msg = (f"Your income grew {round(inc_growth)}% but expenses grew {round(exp_growth)}%. "
                   f"Your spending is eating into your income gains.")
        elif inc_growth > 5 and exp_growth <= inc_growth:
            msg = (f"Income grew {round(inc_growth)}% and expenses only grew {round(exp_growth)}%. "
                   f"Great discipline — you're not inflating your lifestyle!")
        elif inc_growth > 0:
            msg = "Income is growing steadily. Keep an eye on whether expenses follow."
        else:
            msg = "Not enough income variation to detect lifestyle creep yet."

        return {
            "detected":       detected,
            "income_growth":  round(inc_growth, 1),
            "expense_growth": round(exp_growth, 1),
            "message":        msg,
        }

    def _build_alerts(self, needs, wants, savings, savings_actual, savings_target) -> list:
        alerts = []
        for bucket in [needs, wants]:
            d = bucket["drift_pct"]
            if d > 30:
                alerts.append(
                    f"⚠️ You're {round(d)}% over your {bucket['name']} budget this month."
                )
            elif d > 10:
                alerts.append(
                    f"🟡 {bucket['name']} spending is {round(d)}% above target — watch it."
                )
        if savings_actual < savings_target * 0.7:
            shortfall = savings_target - savings_actual
            alerts.append(
                f"💸 You're {round((savings_target - savings_actual) / savings_target * 100)}% short on your savings target this month."
            )
        if not alerts:
            alerts.append("✅ You're within budget across all categories this month. Keep it up!")
        return alerts

    def _monthly_avgs(self, txns: list) -> dict:
        monthly: dict = {}
        for t in txns:
            m = t.get("date", "")[:7]
            if not m:
                continue
            monthly.setdefault(m, {"inc": 0.0, "exp": 0.0})
            amt = abs(t.get("amount", 0))
            if t.get("type") == "income" or t.get("amount", 0) < 0:
                monthly[m]["inc"] += amt
            else:
                monthly[m]["exp"] += amt
        months = list(monthly.values())
        return {
            "income":  statistics.mean([m["inc"] for m in months]) if months else 0.0,
            "expense": statistics.mean([m["exp"] for m in months]) if months else 0.0,
        }

    async def _get_currency(self, user_id: str) -> str:
        import bson
        user = await self.db[Collections.USERS].find_one({"_id": bson.ObjectId(user_id)})
        return user.get("currency_code", "INR") if user else "INR"
