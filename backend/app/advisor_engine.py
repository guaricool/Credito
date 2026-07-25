import uuid
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import User, DataLeak, DataBroker, OptOutRequest, ComplianceViolation, CreditReport, Tradeline
from app.leak_agent import LeakAgentService

class AdvisorEngineService:
    @staticmethod
    async def generate_user_recommendations(db: AsyncSession, user: User) -> Dict[str, Any]:
        # Ensure leaks and broker data are initialized
        await LeakAgentService.scan_user_privacy(db, user)

        # 1. Fetch user data
        leaks_stmt = select(DataLeak).where(DataLeak.user_id == user.id)
        leaks_res = await db.execute(leaks_stmt)
        leaks = list(leaks_res.scalars().all())

        brokers_stmt = select(OptOutRequest).where(OptOutRequest.user_id == user.id).options(selectinload(OptOutRequest.broker))
        brokers_res = await db.execute(brokers_stmt)
        opt_requests = list(brokers_res.scalars().all())

        viol_stmt = (
            select(ComplianceViolation)
            .join(ComplianceViolation.tradeline)
            .join(Tradeline.report)
            .where(CreditReport.user_id == user.id)
        )
        viol_res = await db.execute(viol_stmt)
        violations = list(viol_res.scalars().all())

        recommendations: List[Dict[str, Any]] = []

        # Rule 1: Immediate Action - Critical SSN Breach -> FCRA 605B Block
        critical_leaks = [l for l in leaks if l.risk_level == "CRITICAL"]
        if critical_leaks:
            leak_names = ", ".join([l.breach_name for l in critical_leaks])
            recommendations.append({
                "id": str(uuid.uuid4()),
                "priority": "IMMEDIATE_ACTION",
                "title": "Demand Statutory 4-Day Identity Theft Block (FCRA § 605B)",
                "statute_citation": "15 U.S.C. § 1681c-2",
                "action_type": "FCRA_605B_BLOCK",
                "description": f"Critical credential exposure (SSN/Identity) detected in data breaches ({leak_names}). Federal law mandates credit reporting agencies MUST block fraudulent tradelines within 4 business days of affidavit receipt.",
                "expected_impact": "Expunge fraudulent tradelines within 4 business days",
            })

        # Rule 2: High Priority - FCRA / Metro 2 Violations -> Section 609 Dispute
        critical_viols = [v for v in violations if v.severity in ["CRITICAL", "HIGH"]]
        if critical_viols:
            viols_count = len(critical_viols)
            recommendations.append({
                "id": str(uuid.uuid4()),
                "priority": "HIGH_PRIORITY",
                "title": f"File Section 609 Dispute Campaign for {viols_count} Critical FCRA Violations",
                "statute_citation": "15 U.S.C. § 1681i(a)",
                "action_type": "SECTION_609_DISPUTE",
                "description": f"Statutory audit detected {viols_count} severe reporting inaccuracies (Metro 2 non-compliance, missing delinquency dates, unverified balances). File formal 30-day investigation demand with credit bureaus.",
                "expected_impact": "Force bureau reinvestigation & deletion of unverified negative marks",
            })

        # Rule 3: High Priority - Collection Agency Violations -> Debt Validation
        collection_viols = [v for v in violations if "COLLECTION" in v.violation_type or "VALIDATION" in v.recommended_letter_type]
        if collection_viols or any(v.severity == "CRITICAL" for v in violations):
            recommendations.append({
                "id": str(uuid.uuid4()),
                "priority": "HIGH_PRIORITY",
                "title": "Issue FDCPA § 809 Debt Validation Demand to Collection Agencies",
                "statute_citation": "15 U.S.C. § 1692g",
                "action_type": "DEBT_VALIDATION",
                "description": "Exigir validación estatutaria completa de licencias de cobro, contrato original y desglose de saldo a las agencias de cobro terceras.",
                "expected_impact": "Cease collection activity & delete unvalidated tradelines",
            })

        # Rule 4: Recommended - Data Broker Opt-Out Deletions
        pending_brokers = [r for r in opt_requests if r.status in ["PENDING", "SUBMITTED"]]
        if pending_brokers:
            recommendations.append({
                "id": str(uuid.uuid4()),
                "priority": "RECOMMENDED",
                "title": f"Execute CCPA / CPRA Statutory Opt-Out Deletions for {len(pending_brokers)} US Data Brokers",
                "statute_citation": "Cal. Civ. Code § 1798.100",
                "action_type": "CCPA_OPT_OUT",
                "description": f"Send automated statutory deletion notices to US People Search databases (Spokeo, Whitepages, LexisNexis) to prevent public identity profiling.",
                "expected_impact": "Remove personal address, phone, and relative links from public web",
            })

        # Fallback / General Recommendation if no severe issues
        if not recommendations:
            recommendations.append({
                "id": str(uuid.uuid4()),
                "priority": "PREVENTATIVE",
                "title": "Perform Routine Credit Report & Privacy Inspection",
                "statute_citation": "15 U.S.C. § 1681g",
                "action_type": "SECTION_609_DISPUTE",
                "description": "Your profile shows high privacy defense levels. Maintain quarterly inspection of credit bureau tradelines and dark web monitoring.",
                "expected_impact": "Prevent stealth identity theft & maintain peak credit standing",
            })

        # Calculate overall status index
        completed_deletions = sum(1 for r in opt_requests if r.status == "VERIFIED_REMOVED")
        score = 85
        if critical_leaks:
            score -= 20
        if critical_viols:
            score -= 15
        score = max(35, min(100, score + (completed_deletions * 5)))

        return {
            "credit_health_index": score,
            "total_recommendations": len(recommendations),
            "critical_actions_count": sum(1 for r in recommendations if r["priority"] in ["IMMEDIATE_ACTION", "HIGH_PRIORITY"]),
            "recommendations": recommendations,
        }
