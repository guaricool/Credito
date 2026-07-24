from datetime import date, datetime, timedelta
from typing import List, Optional
from app.models import Tradeline, BureauTradelineDetail, ComplianceViolation

class ComplianceAnalyzer:
    """
    ComplianceAnalyzer evaluates parsed credit tradelines against FCRA statutory rules
    and Metro 2 reporting guidelines to detect actionable compliance violations.
    """

    @staticmethod
    def is_derogatory_status(status_str: Optional[str]) -> bool:
        if not status_str:
            return False
        s = status_str.lower()
        keywords = [
            "derogatory",
            "collection",
            "charge-off",
            "charge off",
            "late",
            "delinquent",
            "repossession",
            "foreclosure",
        ]
        return any(k in s for k in keywords)

    @staticmethod
    def is_obsolete_dofd(dofd: Optional[date], reference_date: Optional[date] = None) -> bool:
        if not dofd:
            return False
        ref = reference_date or date.today()
        # FCRA Section 605 (15 U.S.C. § 1681c) 7-year rule
        try:
            seven_years_later = dofd.replace(year=dofd.year + 7)
        except ValueError:  # Handles leap year (Feb 29)
            seven_years_later = dofd + timedelta(days=365 * 7 + 1)
        return ref >= seven_years_later

    def analyze_report(
        self, tradelines: List[Tradeline], reference_date: Optional[date] = None
    ) -> List[ComplianceViolation]:
        violations: List[ComplianceViolation] = []
        ref_date = reference_date or date.today()

        for tradeline in tradelines:
            b_details = tradeline.bureau_details or []

            # 1. Cross-Bureau Discrepancy Rule (15 U.S.C. § 1681i)
            if len(b_details) > 1:
                # Check balance discrepancy
                balances = {
                    b.bureau: float(b.current_balance)
                    for b in b_details
                    if b.current_balance is not None
                }
                if len(set(balances.values())) > 1:
                    detail_str = ", ".join([f"{b}: ${bal:.2f}" for b, bal in balances.items()])
                    violations.append(
                        ComplianceViolation(
                            tradeline_id=tradeline.id,
                            bureau="MULTIPLE",
                            violation_type="CROSS_BUREAU_DISCREPANCY",
                            statutory_citation="15 U.S.C. § 1681i",
                            description=f"Conflicting current balance reported across bureaus for '{tradeline.creditor_name}': {detail_str}",
                            severity="HIGH",
                            recommended_letter_type="CROSS_BUREAU_DISCREPANCY",
                        )
                    )

                # Check account status discrepancy
                statuses = {b.bureau: b.account_status for b in b_details if b.account_status}
                normalized_statuses = {b: s.strip().lower() for b, s in statuses.items()}
                if len(set(normalized_statuses.values())) > 1:
                    detail_str = ", ".join([f"{b}: '{s}'" for b, s in statuses.items()])
                    violations.append(
                        ComplianceViolation(
                            tradeline_id=tradeline.id,
                            bureau="MULTIPLE",
                            violation_type="CROSS_BUREAU_DISCREPANCY",
                            statutory_citation="15 U.S.C. § 1681i",
                            description=f"Conflicting account status reported across bureaus for '{tradeline.creditor_name}': {detail_str}",
                            severity="HIGH",
                            recommended_letter_type="CROSS_BUREAU_DISCREPANCY",
                        )
                    )

                # Check past due amount discrepancy
                past_dues = {
                    b.bureau: float(b.past_due_amount)
                    for b in b_details
                    if b.past_due_amount is not None
                }
                if len(set(past_dues.values())) > 1:
                    detail_str = ", ".join([f"{b}: ${pd:.2f}" for b, pd in past_dues.items()])
                    violations.append(
                        ComplianceViolation(
                            tradeline_id=tradeline.id,
                            bureau="MULTIPLE",
                            violation_type="CROSS_BUREAU_DISCREPANCY",
                            statutory_citation="15 U.S.C. § 1681i",
                            description=f"Conflicting past due amount reported across bureaus for '{tradeline.creditor_name}': {detail_str}",
                            severity="MEDIUM",
                            recommended_letter_type="CROSS_BUREAU_DISCREPANCY",
                        )
                    )

            # 2 & 3: Per-bureau checks (Obsolescence and Metro 2)
            for b in b_details:
                # 7-Year Obsolescence Rule (15 U.S.C. § 1681c)
                if b.date_of_first_delinquency and self.is_obsolete_dofd(
                    b.date_of_first_delinquency, ref_date
                ):
                    violations.append(
                        ComplianceViolation(
                            tradeline_id=tradeline.id,
                            bureau=b.bureau,
                            violation_type="OBSOLETE_INFORMATION",
                            statutory_citation="15 U.S.C. § 1681c",
                            description=f"Item exceeds the 7-year statutory reporting limit under FCRA Section 605. Date of First Delinquency is {b.date_of_first_delinquency.strftime('%Y-%m-%d')}.",
                            severity="HIGH",
                            recommended_letter_type="OBSOLETE_DELETE_DEMAND",
                        )
                    )

                # Metro 2 Format Compliance Rule
                # Missing DOFD on derogatory account status
                if self.is_derogatory_status(b.account_status) and not b.date_of_first_delinquency:
                    violations.append(
                        ComplianceViolation(
                            tradeline_id=tradeline.id,
                            bureau=b.bureau,
                            violation_type="METRO2_FORMAT_VIOLATION",
                            statutory_citation="Metro 2 Standard / 15 U.S.C. § 1681s-2",
                            description=f"Derogatory status '{b.account_status}' reported on {b.bureau} without required Date of First Delinquency (DOFD).",
                            severity="MEDIUM",
                            recommended_letter_type="METRO2_COMPLIANCE_DEMAND",
                        )
                    )

        return violations
