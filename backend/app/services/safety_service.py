# app/services/safety_service.py
"""
Safety Net Service
==================
Computes all "Am I safe right now?" metrics using pure math:

1. Runway         = total_balance / avg_daily_burn
2. Emergency fund = total_balance vs (avg_monthly_expense × 3)
3. Savings rate   = (monthly_income - monthly_expense) / monthly_income × 100
4. Bill predictor = cluster recurring transactions by (name similarity + amount + date interval)
5. Safe to Spend  = runway_after = (balance - spend) / avg_daily_burn
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import re
import statistics

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import Collections
from app.core.logging import get_logger
from app.repositories.account_repository import AccountRepository
from app.repositories.transaction_repository import TransactionRepository

logger = get_logger(__name__)


def _slug(name: str) -> str:
    """Normalize merchant name for grouping: lowercase, strip punctuation."""
    return re.sub(r"[^a-z0-9 ]", "", name.lower()).strip()


class SafetyService:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db       = db
        self.acc_repo = AccountRepository(db)
        self.txn_repo = TransactionRepository(db)

    # ── Main snapshot ─────────────────────────────────────────

    async def get_snapshot(self, user_id: str) -> dict:
        total_balance   = await self.acc_repo.total_balance_for_user(user_id)
        txns            = await self.txn_repo.find_for_ml(user_id, days=180)
        currency_code   = await self._get_currency(user_id)
        cal_events      = await self.db[Collections.CALENDAR_EVENTS].find({"user_id": user_id}).to_list(None)

        monthly = self._monthly_averages(txns)
        avg_mo_income  = monthly["avg_monthly_income"]
        avg_mo_expense = monthly["avg_monthly_expense"]
        avg_daily_burn = avg_mo_expense / 30 if avg_mo_expense > 0 else 0

        # Savings rate (clamped 0-100)
        if avg_mo_income > 0:
            savings_rate = max(0.0, min(100.0, (avg_mo_income - avg_mo_expense) / avg_mo_income * 100))
        else:
            savings_rate = 0.0

        # Runway
        if avg_daily_burn > 0:
            runway_days = min(int(total_balance / avg_daily_burn), 9999)
        else:
            runway_days = 9999   # no burn data → safe

        runway_label, risk_level, risk_emoji = self._risk_from_runway(runway_days)

        # Emergency fund (3-month target)
        em_target         = avg_mo_expense * 3
        em_progress       = min(100.0, (total_balance / em_target * 100)) if em_target > 0 else 100.0
        days_covered      = runway_days
        # Extra monthly saving needed to reach 3m target in 6 months
        shortfall         = max(0.0, em_target - total_balance)
        monthly_top_up    = shortfall / 6 if shortfall > 0 else 0.0

        # Bill predictor (AI + manual Calendar events)
        upcoming_bills      = self._detect_recurring(txns)
        upcoming_bills.extend(self._get_upcoming_calendar_events(cal_events))
        # Deduplicate and sort
        upcoming_bills.sort(key=lambda b: b["days_until"])
        
        total_upcoming_30d  = sum(b["amount"] for b in upcoming_bills)
        balance_after_upcoming = total_balance - total_upcoming_30d

        return {
            "total_balance":              round(total_balance, 2),
            "currency_code":              currency_code,
            "avg_daily_burn":             round(avg_daily_burn, 2),
            "avg_monthly_expense":        round(avg_mo_expense, 2),
            "avg_monthly_income":         round(avg_mo_income, 2),
            "savings_rate_pct":           round(savings_rate, 1),
            "runway_days":                runway_days,
            "runway_label":               runway_label,
            "risk_level":                 risk_level,
            "risk_emoji":                 risk_emoji,
            "emergency_fund_target":      round(em_target, 2),
            "emergency_fund_target_months": 3,
            "emergency_fund_progress_pct":  round(em_progress, 1),
            "days_covered":               days_covered,
            "monthly_top_up_needed":      round(monthly_top_up, 2),
            "upcoming_bills":             upcoming_bills,
            "balance_after_upcoming":     round(balance_after_upcoming, 2),
            "total_upcoming_30d":         round(total_upcoming_30d, 2),
            "computed_at":                datetime.now(timezone.utc).isoformat(),
        }

    # ── Safe-to-Spend ─────────────────────────────────────────

    async def safe_to_spend(self, user_id: str, amount: float) -> dict:
        total_balance = await self.acc_repo.total_balance_for_user(user_id)
        txns          = await self.txn_repo.find_for_ml(user_id, days=90)
        monthly       = self._monthly_averages(txns)
        avg_daily_burn = monthly["avg_monthly_expense"] / 30 if monthly["avg_monthly_expense"] > 0 else 1

        runway_now   = min(int(total_balance / avg_daily_burn), 9999)
        balance_after = total_balance - amount
        runway_after  = max(0, min(int(balance_after / avg_daily_burn), 9999)) if balance_after > 0 else 0
        change        = runway_after - runway_now

        # Decision logic
        if balance_after < 0:
            is_safe = False
            emoji   = "🚫"
            verdict = f"You can't afford this. It would push your balance {'-' if balance_after < 0 else ''}₹{abs(balance_after):,.0f} into the red."
        elif runway_after < 7:
            is_safe = False
            emoji   = "⚠️"
            verdict = f"Too risky. After this you'd only have {runway_after} days of runway left."
        elif runway_after < 30:
            is_safe = False
            emoji   = "🟡"
            verdict = f"Caution. This would leave you with just {runway_after} days of runway — less than 1 month buffer."
        elif change < -30:
            is_safe = True
            emoji   = "🤔"
            verdict = f"You can afford it, but it cuts your runway from {runway_now} to {runway_after} days. Think twice."
        else:
            is_safe = True
            emoji   = "✅"
            verdict = f"Yes, you can afford this. You'll still have {runway_after} days of runway after spending."

        return {
            "amount":             round(amount, 2),
            "current_balance":    round(total_balance, 2),
            "balance_after":      round(balance_after, 2),
            "runway_now":         runway_now,
            "runway_after":       runway_after,
            "runway_change_days": change,
            "is_safe":            is_safe,
            "verdict":            verdict,
            "emoji":              emoji,
        }

    # ── Internals ─────────────────────────────────────────────

    def _monthly_averages(self, txns: list) -> dict:
        monthly: dict = {}
        for t in txns:
            m = t.get("date", "")[:7]
            if not m:
                continue
            monthly.setdefault(m, {"inc": 0.0, "exp": 0.0})
            amt      = abs(t.get("amount", 0))
            txn_type = t.get("type", "expense")
            if txn_type == "income" or t.get("amount", 0) < 0:
                monthly[m]["inc"] += amt
            else:
                monthly[m]["exp"] += amt

        months = list(monthly.values())
        avg_i  = statistics.mean([m["inc"] for m in months]) if months else 0.0
        avg_e  = statistics.mean([m["exp"] for m in months]) if months else 0.0
        return {"avg_monthly_income": avg_i, "avg_monthly_expense": avg_e}

    def _detect_recurring(self, txns: list) -> list:
        """
        Detect recurring bills using a simple clustering algorithm:
        - Group expense transactions by slugified merchant name
        - If a group has ≥ 2 transactions within a 28-35 day window → recurring
        - Project next occurrence date
        """
        today      = datetime.now(timezone.utc).date()
        cutoff_30  = today + timedelta(days=30)

        # Only look at expenses
        expenses = [t for t in txns if t.get("type", "expense") != "income" and t.get("amount", 0) > 0]

        # Group by slug name
        groups: dict = {}
        for t in expenses:
            slug = _slug(t.get("name", ""))
            if not slug:
                continue
            groups.setdefault(slug, []).append(t)

        recurring: list = []
        for slug, group in groups.items():
            if len(group) < 2:
                continue

            # Sort by date ascending
            group.sort(key=lambda t: t.get("date", "")[:10])
            dates = [datetime.strptime(t["date"][:10], "%Y-%m-%d").date() for t in group if t.get("date")]
            if len(dates) < 2:
                continue

            # Check intervals between consecutive dates
            intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_interval = statistics.mean(intervals)

            # Monthly recurrence window: 25-35 days
            if 25 <= avg_interval <= 35:
                recurrence = "monthly"
            elif 6 <= avg_interval <= 8:
                recurrence = "weekly"
            else:
                continue   # not a recognisable pattern

            # Project next occurrence from the most recent date
            last_date  = dates[-1]
            next_date  = last_date + timedelta(days=int(round(avg_interval)))

            if next_date > cutoff_30:
                continue   # beyond 30-day window

            days_until = (next_date - today).days
            if days_until < 0:
                next_date += timedelta(days=int(round(avg_interval)))
                days_until = (next_date - today).days

            avg_amount = statistics.mean([abs(t.get("amount", 0)) for t in group])

            recurring.append({
                "name":          group[-1].get("name", slug.title()),
                "amount":        round(avg_amount, 2),
                "expected_date": next_date.isoformat(),
                "days_until":    days_until,
                "category":      group[-1].get("category", "Uncategorized"),
                "recurrence":    recurrence,
            })

        # Sort by nearest first
        recurring.sort(key=lambda b: b["days_until"])
        return recurring

    def _get_upcoming_calendar_events(self, cal_events: list) -> list:
        today = datetime.now(timezone.utc).date()
        cutoff_30 = today + timedelta(days=30)
        upcoming = []

        for e in cal_events:
            # We treat EMIs, bills, and subscriptions as outgoing
            if e.get("type") == "income":
                continue

            try:
                dt = datetime.strptime(e.get("date", "")[:10], "%Y-%m-%d").date()
            except ValueError:
                continue

            # Project next date
            next_date = dt
            if e.get("recurrence") == "monthly":
                # Find the next date that has this day-of-month (or closest)
                while next_date < today:
                    # add ~1 month
                    nxt_mo = next_date.month % 12 + 1
                    nxt_yr = next_date.year + (next_date.month // 12)
                    try:
                        next_date = next_date.replace(year=nxt_yr, month=nxt_mo)
                    except ValueError:
                        # Handle e.g. Jan 31 -> Feb 28
                        next_date = next_date.replace(year=nxt_yr, month=nxt_mo, day=28)
            elif e.get("recurrence") == "yearly":
                while next_date < today:
                    next_date = next_date.replace(year=next_date.year + 1)

            if today <= next_date <= cutoff_30:
                upcoming.append({
                    "name":          e.get("title", "Calendar Event"),
                    "amount":        round(float(e.get("amount", 0)), 2),
                    "expected_date": next_date.isoformat(),
                    "days_until":    (next_date - today).days,
                    "category":      "Calendar",
                    "recurrence":    e.get("recurrence", "once"),
                })
        
        return upcoming

    def _risk_from_runway(self, runway_days: int) -> tuple:
        if runway_days >= 90:
            return "Stable", "Safe", "🟢"
        if runway_days >= 30:
            return f"{runway_days} days", "Okay", "🟡"
        return f"{runway_days} days", "Danger", "🔴"

    async def _get_currency(self, user_id: str) -> str:
        user = await self.db[Collections.USERS].find_one({"_id": __import__('bson').ObjectId(user_id)})
        return user.get("currency_code", "INR") if user else "INR"
