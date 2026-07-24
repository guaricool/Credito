# Design Specification: US Credit Law Analysis & Dispute Platform

**Date**: 2026-07-24  
**Author**: Principal Engineer & US Credit Law Legal Expert  
**Status**: Draft for User Approval  

---

## 1. Overview & Mission Statement
Architect and implement an enterprise-grade, highly scalable web application designed to analyze US Credit Reports (Equifax, Experian, TransUnion), detect reporting inaccuracies and Metro 2 compliance violations, and generate legally binding dispute strategies (Section 609, Section 611, FDCPA Debt Validation) under the Fair Credit Reporting Act (FCRA) and Fair Debt Collection Practices Act (FDCPA).

---

## 2. Core Features & Capabilities

### 2.1 User Authentication & Authorization (Login with Username/Email & Password)
- **Security Standard**: OAuth2 / JWT (JSON Web Token) with `passlib` (bcrypt) password hashing.
- **Features**:
  - User Registration & Login endpoints (`/api/v1/auth/register`, `/api/v1/auth/login`).
  - Protected API routes requiring Bearer Token authentication.
  - User Session Management with Access & Refresh tokens.
  - AES-256 field-level encryption for sensitive user PII stored in PostgreSQL (SSN last 4, Date of Birth, Full Address).

### 2.2 Credit Report Ingestion & Parser Pipeline
- **Phase 1 Strategy**: Dual Parser for PDF reports (via `pdfplumber`) and HTML credit monitoring files (via `BeautifulSoup4`) from major providers (SmartCredit, IdentityIQ, AnnualCreditReport).
- **Normalization**: Maps raw credit data into a unified Tri-Bureau JSON schema (`Equifax`, `Experian`, `TransUnion`).
- **Data Extracted**:
  - Account/Tradeline list (Creditor Name, Account Number masked, Account Type, Date Opened).
  - Bureau-specific detail per tradeline (Balance, Past Due, Payment History string, DOFD, Account Status).
  - Hard Inquiries & Public Records.

### 2.3 The "Loophole" Compliance Analyzer Engine
Automated analysis enforcing strict legal and reporting compliance:
1. **Cross-Bureau Inconsistency Detection (15 U.S.C. § 1681i)**:
   - Identifies conflicting account statuses, balances, or payment histories for the same tradeline across Experian, Equifax, and TransUnion. (If an item is reported inconsistently or unverifiably across bureaus, federal law dictates it must be corrected or deleted).
2. **7-Year Obsolescence & DOFD Math (15 U.S.C. § 1681c)**:
   - Flags derogatory items, charge-offs, or collections exceeding the strict 7-year reporting window from the Date of First Delinquency (DOFD).
3. **Metro 2 Standard Field Validation**:
   - Checks for missing or contradictory mandatory fields (Account Status vs Payment Rating, missing Terms Duration, unverified Special Comments).

### 2.4 Automated FCRA / FDCPA Dispute Generation
- **Supported Letter Types**:
  - **Section 609 Dispute Letters**: Requests verification of original credit agreements and source documentation under 15 U.S.C. § 1681g.
  - **Section 611 Bureau Dispute Letters**: Formally challenges unverified or inconsistent tradeline data under 15 U.S.C. § 1681i.
  - **FDCPA § 809 Debt Validation Letters**: Demands complete verification of debt from third-party collection agencies (15 U.S.C. § 1692g).
  - **Method of Verification (MOV) Letters**: Demands exact procedure used by bureaus to verify disputed data following vague responses.
- **e-OSCAR Anti-Template Shield**:
  - Dynamically varies letter structure, opening arguments, and statutory phrasing to prevent bureau automated scanning systems (e-OSCAR) from flagging letters as "frivolous".

### 2.5 User Dashboard & Dispute Tracker
- **Visual Analytics**: Interactive credit score trajectory and breakdown of derogatory vs clean accounts.
- **FCRA 30-Day / 45-Day Countdown Timer**: Automates tracking of statutory response windows for sent disputes (30 calendar days under FCRA § 611, or 45 days for Free Annual Credit Reports).
- **Action Center**: Prompts user for next steps (e.g. Generate MOV letter, Mark Item as Deleted, Escalation to CFPB).

---

## 3. Technology Stack & Deployment Architecture

### 3.1 Stack
- **Frontend**: Next.js 14 (React / TypeScript), Tailwind CSS, Lucide Icons, Axios.
- **Backend API**: Python 3.11 with FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), `passlib[bcrypt]`, `python-jose`.
- **Database**: PostgreSQL 15 with JSONB support and UUID extension.
- **Parsing Tools**: `pdfplumber`, `BeautifulSoup4`, `lxml`, `pydantic`.
- **Deployment Platform**: Docker & Docker Compose configured for **Coolify VPS** (`13.140.181.29`).

### 3.2 Coolify Deployment Configuration (`docker-compose.yml`)
The application is pre-packaged into multi-stage production Docker containers for effortless deployment on Coolify.

---

## 4. Relational Database Schema (PostgreSQL)

- **`users`**: Authentication credentials, JWT tokens, encrypted PII.
- **`credit_reports`**: Uploaded reports metadata & normalized JSON backups.
- **`tradelines`**: Master credit account records.
- **`bureau_tradeline_details`**: Side-by-side bureau reporting details (Balance, DOFD, Status, Payment History).
- **`credit_inquiries`**: Hard inquiries across bureaus.
- **`compliance_violations`**: Identified FCRA/Metro 2 errors with statutory citations.
- **`dispute_campaigns`**: 30-day FCRA dispute cycles and targets (Bureaus vs Collectors).
- **`dispute_letters`**: Generated Markdown & PDF dispute letters.

---

## 5. Verification & Testing Strategy
1. **Parser Unit Tests**: Test PDF and HTML report samples to ensure 100% extraction accuracy into Pydantic models.
2. **Rule Engine Validation**: Verify that intentional date, balance, and cross-bureau discrepancies trigger correct legal citations and letter recommendations.
3. **Auth Security Tests**: Validate JWT issue, expiration, bcrypt password verification, and protected route rejection.
4. **End-to-End Flow**: Upload report -> Detect violations -> Register user -> Generate Section 609 letter -> Track 30-day window.

---

## 6. Next Steps & Approval
Upon user review and approval of this specification document, we will proceed to create the step-by-step implementation plan using `writing-plans` skill.
