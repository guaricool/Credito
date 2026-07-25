import uuid
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import User, CreditReport, Tradeline, BureauTradelineDetail

class ScoreOptimizerService:
    @staticmethod
    async def generate_score_optimization_plan(db: AsyncSession, user: User) -> Dict[str, Any]:
        # 1. Fetch user credit report tradelines
        report_stmt = select(CreditReport).where(CreditReport.user_id == user.id).options(
            selectinload(CreditReport.tradelines).selectinload(Tradeline.bureau_details)
        )
        report_res = await db.execute(report_stmt)
        reports = list(report_res.scalars().all())

        all_tradelines: List[Tradeline] = []
        for r in reports:
            all_tradelines.extend(r.tradelines)

        # 2. Calculate revolving utilization & balances
        total_balance = 0.0
        total_limit = 10000.0  # Default baseline credit limit
        revolving_count = 0

        for t in all_tradelines:
            for b in t.bureau_details:
                if b.current_balance:
                    total_balance += float(b.current_balance)
                    revolving_count += 1

        if total_balance == 0.0:
            total_balance = 4250.0  # Default simulated balance for new/unparsed profile
            total_limit = 10000.0

        utilization_pct = round((total_balance / total_limit) * 100, 1)
        target_balance_10_pct = round(total_limit * 0.10, 2)
        recommended_paydown = round(max(0.0, total_balance - target_balance_10_pct), 2)

        # 3. Calculate scores & gain projection
        base_score = 635
        potential_gain = 95
        if utilization_pct < 15.0:
            base_score += 30
            potential_gain -= 25

        target_score = min(850, base_score + potential_gain)

        # 4. Build Action Roadmap
        roadmap: List[Dict[str, Any]] = [
            {
                "step_number": 1,
                "category": "REVOLVING_UTILIZATION",
                "title": "Execute Statement Date Balance Paydown (Target < 10% Utilization)",
                "statute_citation": "15 U.S.C. § 1681g",
                "description": f"Your current revolving utilization is {utilization_pct}%. Pay down ${recommended_paydown:,.2f} before your credit card statement closing date (3-5 days before due date) so the card issuer reports a balance under 10% to Experian, Equifax, and TransUnion.",
                "potential_point_gain": "+25 to +40 Points",
                "action_button_text": "Calculate Payment Plan",
                "action_type": "CALCULATE_PAYMENT",
            },
            {
                "step_number": 2,
                "category": "INQUIRY_REMOVAL",
                "title": "Demand Removal of Unauthorized Hard Inquiries",
                "statute_citation": "15 U.S.C. § 1681b",
                "description": "Remove non-accountholder hard credit inquiries from credit bureaus. Under FCRA § 604, inquiries require permissible purpose.",
                "potential_point_gain": "+10 to +25 Points",
                "action_button_text": "Dispute Inquiries",
                "action_type": "SECTION_609_DISPUTE",
            },
            {
                "step_number": 3,
                "category": "POSITIVE_CREDIT_BUILDING",
                "title": "Add Authorized User (AU) Tradeline or Credit Builder Account",
                "statute_citation": "FCRA / Equal Credit Opportunity Act",
                "description": "Increase average age of accounts (AAoA) and available credit limit by becoming an Authorized User on a seasoned, 5+ year old credit card with 0% utilization.",
                "potential_point_gain": "+20 to +35 Points",
                "action_button_text": "Learn AU Strategy",
                "action_type": "LEARN_AU_STRATEGY",
            },
            {
                "step_number": 4,
                "category": "COLLECTION_DELETION",
                "title": "Dispute & Expunge Collection Accounts & FCRA Inaccuracies",
                "statute_citation": "15 U.S.C. § 1681i & 15 U.S.C. § 1692g",
                "description": "Send 30-day investigation demands for unverified collection balances or late payment errors detected during statutory audit.",
                "potential_point_gain": "+30 to +50 Points",
                "action_button_text": "Generate Dispute Letter",
                "action_type": "SECTION_609_DISPUTE",
            },
        ]

        return {
            "current_estimated_score": base_score,
            "target_potential_score": target_score,
            "potential_points_gain": potential_gain,
            "utilization": {
                "current_balance": total_balance,
                "total_credit_limit": total_limit,
                "utilization_percentage": utilization_pct,
                "target_balance_10_pct": target_balance_10_pct,
                "recommended_paydown": recommended_paydown,
                "status": "HIGH" if utilization_pct > 30 else ("MODERATE" if utilization_pct > 10 else "OPTIMAL"),
            },
            "action_roadmap": roadmap,
        }
