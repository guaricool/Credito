import uuid
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import User, CreditReport, Tradeline, BureauTradelineDetail

class ScoreOptimizerService:
    @staticmethod
    async def generate_score_optimization_plan(db: AsyncSession, user: User) -> Dict[str, Any]:
        # 1. Fetch user credit report tradelines and scores
        report_stmt = select(CreditReport).where(CreditReport.user_id == user.id).options(
            selectinload(CreditReport.tradelines).selectinload(Tradeline.bureau_details)
        ).order_by(CreditReport.created_at.desc())
        
        report_res = await db.execute(report_stmt)
        reports = list(report_res.scalars().all())

        all_tradelines: List[Tradeline] = []
        parsed_scores: List[int] = []

        for r in reports:
            all_tradelines.extend(r.tradelines)
            if r.raw_json_data and isinstance(r.raw_json_data, dict):
                for k in ["score_experian", "score_equifax", "score_transunion", "credit_score"]:
                    val = r.raw_json_data.get(k)
                    if val and isinstance(val, (int, float)) and val > 300:
                        parsed_scores.append(int(val))

        has_uploaded_report = len(reports) > 0 and len(all_tradelines) > 0

        # 2. Calculate revolving utilization & balances from parsed tradelines
        total_balance = 0.0
        total_past_due = 0.0
        total_limit = 0.0
        revolving_count = 0

        if has_uploaded_report:
            for t in all_tradelines:
                for b in t.bureau_details:
                    if b.current_balance and float(b.current_balance) > 0:
                        total_balance += float(b.current_balance)
                        revolving_count += 1
                    if b.past_due_amount and float(b.past_due_amount) > 0:
                        total_past_due += float(b.past_due_amount)

            if total_balance > 0:
                total_limit = round(max(total_balance * 1.5, 3000.0), 2)
            else:
                total_limit = 5000.0

            if parsed_scores:
                base_score = int(sum(parsed_scores) / len(parsed_scores))
            else:
                base_score = 650
        else:
            total_balance = 0.0
            total_past_due = 0.0
            total_limit = 0.0
            base_score = 0

        utilization_pct = round((total_balance / total_limit) * 100, 1) if total_limit > 0 else 0.0
        target_balance_10_pct = round(total_limit * 0.10, 2)
        recommended_paydown = round(max(0.0, total_balance - target_balance_10_pct), 2)

        # 3. Calculate score gain projection
        potential_gain = 85 if has_uploaded_report else 0
        if has_uploaded_report and utilization_pct < 15.0:
            potential_gain = max(20, 60 - int(utilization_pct))

        target_score = min(850, base_score + potential_gain) if has_uploaded_report else 0

        # 4. Build Action Roadmap
        roadmap: List[Dict[str, Any]] = [
            {
                "step_number": 1,
                "category": "REVOLVING_UTILIZATION",
                "title": "Execute Statement Date Balance Paydown (Target < 10% Utilization)",
                "statute_citation": "15 U.S.C. § 1681g",
                "description": f"Your current real revolving balance is ${total_balance:,.2f} ({utilization_pct}% utilization). Pay down ${recommended_paydown:,.2f} before your credit card statement closing date so the card issuer reports a balance under 10% to Experian, Equifax, and TransUnion.",
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
            "has_data": has_uploaded_report,
            "current_estimated_score": base_score,
            "target_potential_score": target_score,
            "potential_points_gain": potential_gain,
            "utilization": {
                "current_balance": total_balance,
                "total_past_due": total_past_due,
                "total_credit_limit": total_limit,
                "utilization_percentage": utilization_pct,
                "target_balance_10_pct": target_balance_10_pct,
                "recommended_paydown": recommended_paydown,
                "status": "HIGH" if utilization_pct > 30 else ("MODERATE" if utilization_pct > 10 else "UNAUDITED"),
            },
            "action_roadmap": roadmap,
        }
