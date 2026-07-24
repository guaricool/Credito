# ⚖️ US Credit Law Analysis & Dispute Platform

An enterprise-grade, full-stack application built to analyze US Credit Reports (Equifax, Experian, TransUnion), audit reporting errors against strict Metro 2 compliance and FCRA/FDCPA standards, and generate aggressive, legally binding dispute strategies.

---

## 🚀 Key Features

- **🔐 User Authentication**: JWT Bearer token authentication with `passlib[bcrypt]` password hashing and encrypted user PII storage.
- **📄 Tri-Bureau Credit Ingestion Engine**: Dual parser supporting HTML monitoring reports (SmartCredit, IdentityIQ) via `BeautifulSoup4` and PDF credit files via `pdfplumber`.
- **🛡️ "Loophole" Compliance Analyzer**:
  - **15 U.S.C. § 1681i Cross-Bureau Discrepancy Rule**: Identifies conflicting balances, account statuses, or past-due amounts reported across Experian, Equifax, and TransUnion.
  - **15 U.S.C. § 1681c 7-Year Obsolescence Rule**: Calculates exact DOFD math to flag derogatory accounts exceeding the statutory 7.0 year reporting window.
  - **Metro 2 Format Compliance Rule**: Audits mandatory fields (e.g. missing Date of First Delinquency on derogatory status).
- **✍️ Automated Dispute Letter Generator**:
  - Section 609 / Section 611 FCRA Dispute Letters (`15 U.S.C. § 1681g`, `15 U.S.C. § 1681i(a)(5)`).
  - Debt Validation Letters under FDCPA § 809 (`15 U.S.C. § 1692g`, `§ 1692g(b)`).
  - Method of Verification (MOV) Letters (`15 U.S.C. § 1681i(a)(7)`).
  - **e-OSCAR Anti-Template Shield**: Dynamically varies legal opening phrases and letter layouts to bypass bureau automated scanning rejections.
- **⏱️ FCRA 30-Day Response Window Tracker**: Live countdown timer tracking statutory 30-day response deadlines.
- **💻 Next.js 14 Frontend**: Modern dark glassmorphic dashboard built with TypeScript and Tailwind CSS.
- **🐳 Coolify & Docker Deployment**: Pre-configured `docker-compose.yml` and `Dockerfile` ready for multi-container deployment.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, Axios.
- **Backend API**: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), `python-jose`, `passlib[bcrypt]`.
- **Database**: PostgreSQL 15 with JSONB & UUID extensions.
- **Parsing**: `pdfplumber`, `BeautifulSoup4`, `lxml`.

---

## ⚡ Quickstart (Local Development)

### 1. Run via Docker Compose
```bash
docker-compose up -d --build
```
- **Frontend Dashboard**: `http://localhost:3000`
- **FastAPI Server**: `http://localhost:8000` (Swagger Docs: `http://localhost:8000/docs`)

### 2. Local Backend Run
```bash
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r backend/requirements.txt
pytest backend/tests/ -v
uvicorn app.main:app --app-dir backend --reload
```

---

## 🛰️ Deployment on Coolify

This repository is configured for direct deployment on Coolify VPS using the `dockercompose` build pack with `/docker-compose.yml`.

---

## 📄 License
MIT License.
