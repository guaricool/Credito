import random
from datetime import date
from typing import List, Optional
from app.models import User, ComplianceViolation


class DisputeGenerator:
    """
    Automated legally sound dispute letter generator with statutory citations
    and e-OSCAR anti-template rephrasing engine.
    """

    @classmethod
    def _format_sender_header(cls, user: User) -> str:
        first_name = (user.first_name or "Valued").strip()
        last_name = (user.last_name or "Consumer").strip()
        address = user.current_address or "[Address Not Provided]"
        city = user.city or "[City]"
        state = user.state or "[State]"
        zip_code = user.zip_code or "[Zip]"
        ssn_last4 = user.ssn_last_four or "XXXX"
        today_str = date.today().strftime("%B %d, %Y")

        return (
            f"**From:**\n"
            f"{first_name} {last_name}\n"
            f"{address}\n"
            f"{city}, {state} {zip_code}\n"
            f"SSN (Last 4): XXX-XX-{ssn_last4}\n"
            f"Date: {today_str}\n"
        )

    @classmethod
    def _select_anti_template_opening(cls, seed_key: str = "") -> str:
        """
        e-OSCAR Anti-Template Rephrasing Engine:
        Provides varied opening declarations to prevent CRA automated e-OSCAR
        batch template matching and frivolous dispute auto-rejection.
        """
        openings = [
            (
                "I am writing to formally exercise my consumer rights under the Fair Credit Reporting Act (FCRA). "
                "Following a thorough examination of my credit disclosures, I have identified inaccurate, incomplete, "
                "and unverified tradelines that require your immediate statutory investigation and resolution."
            ),
            (
                "This communication constitutes a formal dispute of inaccurate items appearing on my consumer report. "
                "Pursuant to applicable provisions of federal law, I demand a complete reinvestigation of the specific "
                "discrepancies and violations detailed in this notice."
            ),
            (
                "Please accept this letter as my official notice under federal credit reporting laws regarding erroneous "
                "data in my credit history file. The items specified below fail to meet statutory standards for accuracy "
                "and completeness and must be verified or deleted."
            ),
            (
                "I am issuing this formal legal notice to contest unverifiable and non-compliant information currently "
                "maintained in my credit file. As a consumer reporting agency, you are required to ensure maximum possible "
                "accuracy of all reported data."
            ),
        ]
        if seed_key:
            idx = sum(ord(c) for c in seed_key) % len(openings)
            return openings[idx]
        return random.choice(openings)

    @classmethod
    def generate_section_609_letter(
        cls,
        user: User,
        violations: List[ComplianceViolation],
        target_bureau: str,
    ) -> str:
        """
        Generates Section 609 / Section 611 FCRA dispute letter with statutory references
        (15 U.S.C. § 1681g, 15 U.S.C. § 1681i(a)(5)).
        """
        sender_header = cls._format_sender_header(user)
        seed = f"{user.id}-{target_bureau}-609"
        opening = cls._select_anti_template_opening(seed_key=seed)

        violations_block = ""
        if violations:
            violations_list = []
            for idx, v in enumerate(violations, start=1):
                bureau_info = f" (Bureau: {v.bureau})" if v.bureau else ""
                violations_list.append(
                    f"### Item #{idx}: {v.violation_type}{bureau_info}\n"
                    f"- **Statutory Citation:** {v.statutory_citation}\n"
                    f"- **Severity:** {v.severity}\n"
                    f"- **Discrepancy Details:** {v.description}\n"
                    f"- **Remediation Action:** Verification of original documentation or immediate deletion.\n"
                )
            violations_block = "\n".join(violations_list)
        else:
            violations_block = (
                "### General Dispute & Audit Request\n"
                "- **Statutory Citation:** 15 U.S.C. § 1681g & 15 U.S.C. § 1681i\n"
                "- **Details:** I demand full disclosure of all information and source verification documents in my consumer file. "
                "Any item that cannot be independently verified with physical contract documentation must be permanently purged.\n"
            )

        letter = f"""{sender_header}
**To:**
{target_bureau.strip()} Dispute Department
Consumer Reporting Services

**SUBJECT: NOTICE OF FORMAL DISPUTE & REQUEST FOR DISCLOSURE PURSUANT TO 15 U.S.C. § 1681g & 15 U.S.C. § 1681i(a)(5)**

To Whom It May Concern:

{opening}

Under **15 U.S.C. § 1681g** (FCRA § 609), I have the absolute statutory right to request full disclosure of all information in my file at the time of the request, including the sources of the information and original verifiable documents.

Furthermore, under **15 U.S.C. § 1681i(a)(5)** (FCRA § 611), if any information disputed by a consumer is found to be inaccurate or incomplete, or cannot be verified by the furnisher within the mandatory 30-day statutory timeframe, you MUST promptly delete that item from my consumer file and notify all relevant parties.

Below is the specific list of inaccurate, contradictory, or non-compliant tradelines identified in my report:

{violations_block}

**STATUTORY MANDATE & REMEDIAL DEMANDS:**
1. **Conduct a Reasonable Reinvestigation:** Pursuant to 15 U.S.C. § 1681i(a)(1), you must conduct a free and thorough reinvestigation of each disputed item with the original furnishers of information.
2. **Mandatory 30-Day Resolution:** If you fail to complete your reinvestigation within 30 calendar days of receiving this notice, **15 U.S.C. § 1681i(a)(5)** mandates the immediate and permanent deletion of the unverified data.
3. **Written Notice of Results:** Provide me with an updated copy of my consumer credit report reflecting the corrections or deletions made.

Please be advised that e-OSCAR automated dispute scanning system codes do not substitute for a legally required reasonable reinvestigation under federal law.

Sincerely,

{user.first_name or "Valued"} {user.last_name or "Consumer"}
"""
        return letter.strip()

    @classmethod
    def generate_debt_validation_letter(
        cls,
        user: User,
        creditor_name: str,
        account_number: str,
        balance: float,
    ) -> str:
        """
        Generates FDCPA § 809 Debt Validation letter (15 U.S.C. § 1692g).
        """
        sender_header = cls._format_sender_header(user)
        formatted_balance = f"${balance:,.2f}"

        letter = f"""{sender_header}
**To:**
{creditor_name.strip()}
Collections & Compliance Department

**SUBJECT: FORMAL DEBT VALIDATION DEMAND PURSUANT TO FDCPA § 809 (15 U.S.C. § 1692g)**

To Whom It May Concern:

I am writing in response to your communications regarding an alleged debt referenced under Account Number **{account_number.strip()}**, claiming an alleged balance of **{formatted_balance}**.

Be advised that I am formally disputing the validity of this alleged debt pursuant to the Fair Debt Collection Practices Act (FDCPA), **15 U.S.C. § 1692g**. This notice is NOT a refusal to pay, but a formal demand for strict validation of your claims as required by federal law.

Under **15 U.S.C. § 1692g(a)**, I demand that you provide the following verification documentation:
1. **Original Agreement:** A complete copy of the original contract or agreement signed by me authorizing this account.
2. **Itemized Ledger:** An itemized statement of the debt showing the principal balance, interest charged, fees added, and all payment records from the original creditor.
3. **Authority to Collect:** Documented proof that your agency is legally licensed to collect debts in my state of residence and assigned ownership/right of collection for this specific account.
4. **Original Creditor Details:** The complete name and physical business address of the original creditor.

**CESSATION OF COLLECTION ACTIVITIES (15 U.S.C. § 1692g(b)):**
Pursuant to **15 U.S.C. § 1692g(b)**, upon receipt of this dispute notice, you MUST immediately cease all collection activities—including phone calls, written demands, and reporting or updating information on my credit reports—until your office obtains and mails complete debt verification to me.

Continued reporting of an unvalidated debt to credit reporting agencies after receiving this notice constitutes a willful violation of the FDCPA and the FCRA.

Sincerely,

{user.first_name or "Valued"} {user.last_name or "Consumer"}
"""
        return letter.strip()

    @classmethod
    def generate_mov_letter(
        cls,
        user: User,
        target_bureau: str,
        disputed_account: str,
    ) -> str:
        """
        Generates Method of Verification letter demanding procedural verification
        standards under 15 U.S.C. § 1681i(a)(7).
        """
        sender_header = cls._format_sender_header(user)

        letter = f"""{sender_header}
**To:**
{target_bureau.strip()} Dispute Investigation Department

**SUBJECT: DEMAND FOR METHOD OF VERIFICATION (MOV) PURSUANT TO 15 U.S.C. § 1681i(a)(7)**

To Whom It May Concern:

I am writing regarding your recent response to my dispute concerning the account listed as **{disputed_account.strip()}**. You indicated that this account was "verified" as accurate.

Under **15 U.S.C. § 1681i(a)(7)** (FCRA § 611(a)(7)), I have the explicit legal right to request and receive a comprehensive description of the procedure used to determine the accuracy and completeness of the disputed information.

I hereby demand that you provide me with the following specific Method of Verification (MOV) details within fifteen (15) days:
1. **Contact Information:** The full name, business address, and direct telephone number of each individual or entity contacted during your reinvestigation.
2. **Verification Evidence:** Copies of the actual documents provided by the furnisher that verified the accuracy of the disputed tradeline (an electronic e-OSCAR code response is legally insufficient).
3. **Procedural Description:** A detailed description of the exact investigation procedure executed by your agency staff.

If you cannot provide this mandatory statutory description of your verification procedure under **15 U.S.C. § 1681i(a)(7)** within 15 days, you have failed to comply with federal law, and the disputed item must be immediately and permanently deleted from my consumer credit file.

Sincerely,

{user.first_name or "Valued"} {user.last_name or "Consumer"}
"""
        return letter.strip()
