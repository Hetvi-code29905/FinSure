# app/services/insights_service.py
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import Collections

class InsightsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def calculate_health_score(self, user_id: str) -> Dict[str, Any]:
        """Calculates a gamified 0-1000 financial health score with ranks and quests."""
        xp = 0
        quests = []
        breakdown = {}
        
        # 1. Total Balance and Debt vs Income setup
        # Base logic on actual linked accounts if available
        acc_cursor = self.db[Collections.ACCOUNTS].find({"user_id": user_id})
        accounts = await acc_cursor.to_list(length=100)
        total_balance = sum(float(a.get("balance", 0)) for a in accounts if a.get("type", "") not in ["credit_card"])
        total_cc_debt = sum(abs(float(a.get("balance", 0))) for a in accounts if a.get("type", "") == "credit_card")
        
        # Calculate recent spend
        txn_cursor = self.db[Collections.TRANSACTIONS].find({
            "user_id": user_id, "amount": {"$gt": 0}, "type": {"$ne": "income"}
        }).sort("date", -1).limit(60)
        recent_txns = await txn_cursor.to_list(length=60)
        recent_spend = sum(float(t.get("amount", 0)) for t in recent_txns)
        
        income_prof = await self.db[Collections.INCOME_PROFILES].find_one({"user_id": user_id})
        monthly_income = income_prof.get("monthly_amount", 0) if income_prof else 0
        
        if monthly_income <= 0:
            user = await self.db[Collections.USERS].find_one({"_id": __import__('bson').ObjectId(user_id)})
            range_map = {"₹0–25k": 20000, "₹25k–50k": 40000, "₹50k–1L": 75000, "₹1L+": 150000, "Not specified": 20000}
            monthly_income = range_map.get(user.get("monthly_income_range") if user else "₹0–25k", 20000)

        # ----- LIQUIDITY PENALTY -----
        # Critical alert: spending far outpaces balance (e.g. 60k spent but 5k in account)
        if total_balance < (recent_spend * 0.3) and recent_spend > 5000:
            quests.append({"title": "Critical Alert", "desc": "Your recent spending far exceeds your liquid balance! Stop discretionary spending immediately.", "reward": 500, "status": "open", "action_url": "/budget"})
            breakdown["liquidity"] = 0
            xp += 0
        elif total_balance < monthly_income:
            quests.append({"title": "Buffer Building", "desc": "Build an account balance equal to at least 1 month's income.", "reward": 150, "status": "open", "action_url": "/dashboard"})
            breakdown["liquidity"] = 30
            xp += 50
        else:
            breakdown["liquidity"] = 100
            xp += 200

        # ----- SAVINGS RATE -----
        cursor = self.db[Collections.GOALS].find({"user_id": user_id})
        goals = await cursor.to_list(length=100)
        total_saved = sum(g.get("current_amount", 0) for g in goals)
        
        if total_saved < (monthly_income * 0.5):
            quests.append({"title": "Savings Rookie", "desc": "Grow your savings to at least 50% of your monthly income.", "reward": 150, "status": "open", "action_url": "/goals"})
            breakdown["savings"] = 20
            xp += 20
        else:
            breakdown["savings"] = 100
            xp += 200
            
        # ----- EMERGENCY FUND -----
        safetynet = next((g for g in goals if g.get("category") == "emergency"), None)
        if not safetynet and total_balance < (monthly_income * 2):
            quests.append({"title": "Ironclad Armor", "desc": "Build a 3-month Emergency Fund.", "reward": 200, "status": "open", "action_url": "/safety"})
            breakdown["emergency"] = 0
        else:
            breakdown["emergency"] = 100
            xp += 300
                
        # ----- SUBSCRIPTIONS / DEBT -----
        if total_cc_debt > total_balance:
            quests.append({"title": "Debt Alert", "desc": "Your credit card debt exceeds your cash balance. Prioritize paying this down.", "reward": 250, "status": "open", "action_url": "/emis"})
            breakdown["efficiency"] = 0
        else:
            sub_cursor = self.db[Collections.SUBSCRIPTIONS].find({"user_id": user_id, "is_active": True})
            subs = await sub_cursor.to_list(length=100)
            vampires = sum(1 for s in subs if s.get("last_used_date") and (datetime.now(timezone.utc) - datetime.strptime(s["last_used_date"][:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)).days > 60)
            
            if vampires > 0:
                quests.append({"title": "Vampire Slayer", "desc": f"Cancel {vampires} unused subscriptions.", "reward": 50 * vampires, "status": "open", "action_url": "/subscriptions"})
                breakdown["efficiency"] = 40
                xp += 50
            else:
                breakdown["efficiency"] = 100
                xp += 300
            
        xp = min(1000, xp)
        
        # Determine Rank
        ranks = [
            {"limit": 200, "name": "Financial Novice"},
            {"limit": 400, "name": "Budget Apprentice"},
            {"limit": 600, "name": "Silver Saver"},
            {"limit": 800, "name": "Gold Investor"},
            {"limit": 1000, "name": "Wealth Wizard"}
        ]
        
        user_rank = "Tycoon"
        next_rank = "Max Level"
        points_to_next = 0
        progress_pct = 100
        
        for i, r in enumerate(ranks):
            if xp < r["limit"]:
                user_rank = r["name"]
                next_rank = ranks[i+1]["name"] if i < len(ranks)-1 else "Wealth Wizard"
                points_to_next = r["limit"] - xp
                prev_limit = ranks[i-1]["limit"] if i > 0 else 0
                max_rank_xp = r["limit"]
                progress_pct = ((xp - prev_limit) / (r["limit"] - prev_limit)) * 100
                break
        
        if xp >= 1000:
            points_to_next = 0
            progress_pct = 100
                
        return {
            "score": xp,
            "rank": user_rank,
            "next_rank": next_rank,
            "points_to_next": points_to_next,
            "progress_pct": round(progress_pct),
            "breakdown": breakdown,
            "quests": quests,
            "total_ranks": [r["name"] for r in ranks]
        }

    async def get_net_worth(self, user_id: str) -> Dict[str, Any]:
        """Calculates total net worth (Accounts + Goals - Debts)."""
        # Accounts (Assets)
        acc_cursor = self.db[Collections.ACCOUNTS].find({"user_id": user_id})
        accounts = await acc_cursor.to_list(length=200)
        total_assets = sum(float(a.get("balance", 0)) for a in accounts if a.get("type", "") not in ["credit_card"])
        total_cc_debt = sum(abs(float(a.get("balance", 0))) for a in accounts if a.get("type", "") == "credit_card")
        
        # Goals (Liquid Assets)
        goal_cursor = self.db[Collections.GOALS].find({"user_id": user_id})
        goals = await goal_cursor.to_list(length=100)
        total_assets += sum(float(g.get("current_amount", 0)) for g in goals)
        
        # Debts (Liabilities - pending EMI / Loans collection which we assume doesnt exist yet, so we use CC)
        total_liabilities = total_cc_debt 
        
        currency = "INR" if accounts else "INR"
        if accounts:
            currency = accounts[0].get("currency", "INR")
            
        return {
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(total_liabilities, 2),
            "net_worth": round(total_assets - total_liabilities, 2),
            "currency": currency
        }

    def estimate_tax_80c(self, annual_income: float, investments_80c: float, medical_80d: float, home_loan_interest: float) -> Dict[str, Any]:
        """Estimates India Income Tax (Old vs New Regime approx 2024-2025)."""
        # Cap limits
        inv_80c = min(150000, investments_80c)
        med_80d = min(50000, medical_80d)
        home_loan = min(200000, home_loan_interest)
        std_deduction = 50000
        
        # OLD REGIME CALC (Gross - Std Deduction - 80C - 80D - Home Loan)
        taxable_old = max(0, annual_income - std_deduction - inv_80c - med_80d - home_loan)
        tax_old = 0
        if taxable_old > 500000: # Simple rebate logic
            if taxable_old > 250000: tax_old += min(250000, taxable_old - 250000) * 0.05
            if taxable_old > 500000: tax_old += min(500000, taxable_old - 500000) * 0.20
            if taxable_old > 1000000: tax_old += (taxable_old - 1000000) * 0.30
            tax_old *= 1.04 # Cess
        
        # NEW REGIME CALC (Gross - Std Deduction)
        taxable_new = max(0, annual_income - std_deduction)
        tax_new = 0
        if taxable_new > 700000: # 7L rebate
            if taxable_new > 300000: tax_new += min(300000, taxable_new - 300000) * 0.05
            if taxable_new > 600000: tax_new += min(300000, taxable_new - 600000) * 0.10
            if taxable_new > 900000: tax_new += min(300000, taxable_new - 900000) * 0.15
            if taxable_new > 1200000: tax_new += min(300000, taxable_new - 1200000) * 0.20
            if taxable_new > 1500000: tax_new += (taxable_new - 1500000) * 0.30
            tax_new *= 1.04 # Cess
            
        tax_old = round(tax_old, 2)
        tax_new = round(tax_new, 2)
        
        if tax_new < tax_old:
            rec = "New Regime"
            saved = tax_old - tax_new
        else:
            rec = "Old Regime"
            saved = tax_new - tax_old

        return {
            "old_regime_tax": tax_old,
            "new_regime_tax": tax_new,
            "recommended_regime": rec,
            "tax_savings_possible": round(saved, 2)
        }
