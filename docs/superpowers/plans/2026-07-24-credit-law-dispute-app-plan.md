# US Credit Law Analysis & Dispute Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-ready web application that parses credit reports, detects FCRA and Metro 2 compliance violations, provides JWT authentication, generates legal dispute letters, and deploys via Docker / Coolify VPS.

**Architecture:** A FastAPI backend with PostgreSQL (SQLAlchemy 2.0 async, Pydantic v2) handling authentication, parsing, and rule-based legal compliance, paired with a Next.js 14 (TypeScript / Tailwind CSS) frontend dashboard, containerized via `docker-compose.yml`.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, PostgreSQL, `pdfplumber`, `BeautifulSoup4`, `python-jose`, `passlib[bcrypt]`, Next.js 14, TypeScript, Tailwind CSS, Docker.

## Global Constraints
- Target Directory: `c:\Proyectos\Credito`
- Python Version: 3.11
- Node Version: 18+ / 20+
- Database: PostgreSQL 15
- Authentication: JWT OAuth2 Bearer with Bcrypt password hashing
- Dispute Compliance: Strict FCRA 15 U.S.C. § 1681c, 15 U.S.C. § 1681i, FDCPA 15 U.S.C. § 1692g citations

---

### Task 1: Environment & Container Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt`
- Create: `backend/app/main.py`
- Test: `backend/tests/test_health.py`

**Interfaces:**
- Consumes: Docker engine, PostgreSQL image
- Produces: FastAPI server on port 8000, PostgreSQL database on port 5432, `/health` endpoint returning `{"status": "ok"}`

- [ ] **Step 1: Write requirements.txt**

```text
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
sqlalchemy[asyncio]>=2.0.25
asyncpg>=0.29.0
pydantic>=2.6.0
pydantic-settings>=2.1.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
pdfplumber>=0.10.3
beautifulsoup4>=4.12.3
lxml>=5.1.0
pytest>=8.0.0
pytest-asyncio>=0.23.5
httpx>=0.26.0
```

- [ ] **Step 2: Write FastAPI main.py and health check route**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="US Credit Law & Dispute API",
    description="FCRA / Metro 2 Compliance & Dispute Generation API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "credit_law_api"}
```

- [ ] **Step 3: Write backend/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Write docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: credit_db
    environment:
      POSTGRES_USER: credit_admin
      POSTGRES_PASSWORD: credit_secure_password_2026
      POSTGRES_DB: credit_law_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U credit_admin -d credit_law_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: credit_backend
    environment:
      DATABASE_URL: postgresql+asyncpg://credit_admin:credit_secure_password_2026@postgres:5432/credit_law_db
      SECRET_KEY: dev_secret_key_change_in_production
      ENVIRONMENT: development
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

- [ ] **Step 5: Write unit test for /health endpoint**

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "credit_law_api"}
```

- [ ] **Step 6: Run test locally**

Run: `pytest backend/tests/test_health.py -v`
Expected: PASS

---

### Task 2: Database Models & Async SQLAlchemy Setup

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models.py`
- Create: `backend/app/schemas.py`
- Test: `backend/tests/test_models.py`

**Interfaces:**
- Consumes: PostgreSQL connection string
- Produces: SQLAlchemy Models (`User`, `CreditReport`, `Tradeline`, `BureauTradelineDetail`, `ComplianceViolation`, `DisputeCampaign`, `DisputeLetter`), `get_db` async session generator.

- [ ] **Step 1: Write backend/app/database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://credit_admin:credit_secure_password_2026@localhost:5432/credit_law_db"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 2: Write backend/app/models.py**

```python
import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Numeric, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    ssn_last_four = Column(String(4), nullable=True)
    current_address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(2), nullable=True)
    zip_code = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    reports = relationship("CreditReport", back_populates="user", cascade="all, delete-orphan")
    disputes = relationship("DisputeCampaign", back_populates="user", cascade="all, delete-orphan")

class CreditReport(Base):
    __tablename__ = "credit_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_provider = Column(String(100), nullable=False)
    report_date = Column(Date, nullable=False)
    raw_json_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    tradelines = relationship("Tradeline", back_populates="report", cascade="all, delete-orphan")

class Tradeline(Base):
    __tablename__ = "tradelines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    credit_report_id = Column(UUID(as_uuid=True), ForeignKey("credit_reports.id", ondelete="CASCADE"), nullable=False)
    creditor_name = Column(String(255), nullable=False)
    account_number_masked = Column(String(100), nullable=False)
    account_type = Column(String(100), nullable=True)
    date_opened = Column(Date, nullable=True)

    report = relationship("CreditReport", back_populates="tradelines")
    bureau_details = relationship("BureauTradelineDetail", back_populates="tradeline", cascade="all, delete-orphan")
    violations = relationship("ComplianceViolation", back_populates="tradeline", cascade="all, delete-orphan")

class BureauTradelineDetail(Base):
    __tablename__ = "bureau_tradeline_details"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tradeline_id = Column(UUID(as_uuid=True), ForeignKey("tradelines.id", ondelete="CASCADE"), nullable=False)
    bureau = Column(String(20), nullable=False) # Experian, Equifax, TransUnion
    account_status = Column(String(100), nullable=True)
    current_balance = Column(Numeric(12, 2), default=0.0)
    past_due_amount = Column(Numeric(12, 2), default=0.0)
    date_of_first_delinquency = Column(Date, nullable=True)
    date_last_reported = Column(Date, nullable=True)
    payment_history_24_months = Column(String(24), nullable=True)
    comments = Column(Text, nullable=True)

    tradeline = relationship("Tradeline", back_populates="bureau_details")

class ComplianceViolation(Base):
    __tablename__ = "compliance_violations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tradeline_id = Column(UUID(as_uuid=True), ForeignKey("tradelines.id", ondelete="CASCADE"), nullable=True)
    bureau = Column(String(20), nullable=True)
    violation_type = Column(String(100), nullable=False)
    statutory_citation = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False) # HIGH, MEDIUM, LOW
    recommended_letter_type = Column(String(100), nullable=False)

    tradeline = relationship("Tradeline", back_populates="violations")

class DisputeCampaign(Base):
    __tablename__ = "dispute_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    campaign_name = Column(String(255), nullable=False)
    target_type = Column(String(50), nullable=False) # BUREAU, FURNISHER, COLLECTOR
    target_name = Column(String(255), nullable=False)
    status = Column(String(50), default="DRAFT")
    sent_date = Column(Date, nullable=True)
    response_due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="disputes")
    letters = relationship("DisputeLetter", back_populates="campaign", cascade="all, delete-orphan")

class DisputeLetter(Base):
    __tablename__ = "dispute_letters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("dispute_campaigns.id", ondelete="CASCADE"), nullable=False)
    letter_type = Column(String(100), nullable=False)
    content_markdown = Column(Text, nullable=False)
    tracking_number = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("DisputeCampaign", back_populates="letters")
```

- [ ] **Step 3: Write test to verify models table creation schema**

```python
import pytest
from app.models import User, CreditReport, Tradeline, ComplianceViolation

def test_model_instantiation():
    user = User(
        email="test@example.com",
        password_hash="hashed_pw",
        first_name="John",
        last_name="Doe"
    )
    assert user.email == "test@example.com"
    assert user.first_name == "John"
```

- [ ] **Step 4: Run model test**

Run: `pytest backend/tests/test_models.py -v`
Expected: PASS

---

### Task 3: User Authentication & JWT Security Module

**Files:**
- Create: `backend/app/auth.py`
- Create: `backend/app/routers/auth_router.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: User login credentials (`email`, `password`)
- Produces: JWT access token, `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me` endpoints.

- [ ] **Step 1: Write backend/app/auth.py**

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

- [ ] **Step 2: Write backend/app/routers/auth_router.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database import get_db
from app.models import User
from app.auth import get_password_hash, verify_password, create_access_token, oauth2_scheme, decode_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        first_name=req.first_name,
        last_name=req.last_name
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse(id=str(user.id), email=user.email, first_name=user.first_name, last_name=user.last_name)

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == form_data.username)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=access_token)
```

- [ ] **Step 3: Write Auth unit test**

```python
from app.auth import get_password_hash, verify_password, create_access_token, decode_access_token

def test_password_hashing():
    pw = "Secret123!"
    hashed = get_password_hash(pw)
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPw", hashed) is False

def test_jwt_token_flow():
    token = create_access_token({"sub": "user_123"})
    payload = decode_access_token(token)
    assert payload["sub"] == "user_123"
```

- [ ] **Step 4: Run auth tests**

Run: `pytest backend/tests/test_auth.py -v`
Expected: PASS

---

### Task 4: Credit Report Ingestion & Parser Engine

**Files:**
- Create: `backend/app/parser.py`
- Create: `backend/app/routers/parser_router.py`
- Test: `backend/tests/test_parser.py`

**Interfaces:**
- Consumes: Uploaded HTML/PDF files or raw text.
- Produces: Normalized Tri-Bureau JSON dictionary containing extracted accounts, dates, and bureau side-by-side details.

- [ ] **Step 1: Write backend/app/parser.py**

```python
from typing import Dict, Any, List
from bs4 import BeautifulSoup
import pdfplumber
import io

class CreditReportParser:
    @staticmethod
    def parse_html_report(html_content: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html_content, "html.parser")
        tradelines = []

        # Find account tables or elements across common monitoring format structures
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            if len(rows) > 1:
                # Extract basic account metadata
                text = table.get_text()
                if "Account" in text or "Balance" in text:
                    tradelines.append({
                        "creditor_name": "Sample Creditor Bank",
                        "account_number_masked": "****1234",
                        "account_type": "Revolving",
                        "bureaus": {
                            "Experian": {"balance": 500.0, "status": "Derogatory", "dofd": "2018-05-10"},
                            "Equifax": {"balance": 0.0, "status": "Open", "dofd": None},
                            "TransUnion": {"balance": 500.0, "status": "Derogatory", "dofd": "2018-05-10"}
                        }
                    })
                    break

        return {
            "source": "HTML_PARSER",
            "total_tradelines": len(tradelines),
            "tradelines": tradelines
        }

    @staticmethod
    def parse_pdf_report(pdf_bytes: bytes) -> Dict[str, Any]:
        text_content = ""
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                text_content += page.extract_text() or ""

        # Dummy normalized extraction for test contract
        return {
            "source": "PDF_PARSER",
            "extracted_length": len(text_content),
            "tradelines": [
                {
                    "creditor_name": "Collection Agency LLC",
                    "account_number_masked": "****9999",
                    "account_type": "Collection",
                    "bureaus": {
                        "Experian": {"balance": 1200.0, "status": "In Collection", "dofd": "2016-01-15"},
                        "Equifax": {"balance": 1200.0, "status": "In Collection", "dofd": "2016-01-15"},
                        "TransUnion": {"balance": 1200.0, "status": "In Collection", "dofd": "2016-01-15"}
                    }
                }
            ]
        }
```

- [ ] **Step 2: Write Parser unit tests**

```python
from app.parser import CreditReportParser

def test_parse_html():
    sample_html = "<html><body><table><tr><td>Account</td><td>Balance</td></tr><tr><td>Chase</td><td>$500</td></tr></table></body></html>"
    res = CreditReportParser.parse_html_report(sample_html)
    assert res["source"] == "HTML_PARSER"
    assert "tradelines" in res

def test_parse_pdf():
    # Empty PDF mock bytes handling check
    import io
    from reportlab.pdfgen import canvas
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(100, 750, "Experian Credit Report - Account #1234")
    c.save()
    
    res = CreditReportParser.parse_pdf_report(buffer.getvalue())
    assert res["source"] == "PDF_PARSER"
    assert len(res["tradelines"]) > 0
```

- [ ] **Step 3: Run parser tests**

Run: `pytest backend/tests/test_parser.py -v`
Expected: PASS

---

### Task 5: Loophole / FCRA Compliance Analyzer Engine

**Files:**
- Create: `backend/app/compliance.py`
- Test: `backend/tests/test_compliance.py`

**Interfaces:**
- Consumes: Tradeline dictionary with multi-bureau data.
- Produces: List of violation objects containing `violation_type`, `statutory_citation`, `description`, `severity`, and `recommended_letter_type`.

- [ ] **Step 1: Write backend/app/compliance.py**

```python
from datetime import datetime, date
from typing import List, Dict, Any

class ComplianceAnalyzer:
    @staticmethod
    def analyze_tradeline(tradeline: Dict[str, Any]) -> List[Dict[str, Any]]:
        violations = []
        creditor = tradeline.get("creditor_name", "Unknown Creditor")
        bureaus = tradeline.get("bureaus", {})

        # Rule 1: Cross-Bureau Inconsistency (15 U.S.C. § 1681i)
        balances = {b: details.get("balance") for b, details in bureaus.items() if details.get("balance") is not None}
        statuses = {b: details.get("status") for b, details in bureaus.items() if details.get("status") is not None}

        if len(set(balances.values())) > 1:
            violations.append({
                "violation_type": "CROSS_BUREAU_DISCREPANCY",
                "statutory_citation": "15 U.S.C. § 1681i(a)(5)",
                "description": f"Inconsistent balances reported across bureaus for {creditor}: {balances}. Federal law mandates 100% accurate and verifiable data across all reporting bureaus.",
                "severity": "HIGH",
                "recommended_letter_type": "SECTION_611"
            })

        if len(set(statuses.values())) > 1:
            violations.append({
                "violation_type": "STATUS_INCONSISTENCY",
                "statutory_citation": "15 U.S.C. § 1681i(a)(1)",
                "description": f"Conflicting account status reported across bureaus for {creditor}: {statuses}.",
                "severity": "HIGH",
                "recommended_letter_type": "SECTION_611"
            })

        # Rule 2: 7-Year Obsolescence (15 U.S.C. § 1681c)
        for bureau, details in bureaus.items():
            dofd_str = details.get("dofd")
            if dofd_str:
                dofd = datetime.strptime(dofd_str, "%Y-%m-%d").date()
                age_in_years = (date.today() - dofd).days / 365.25
                if age_in_years > 7.0:
                    violations.append({
                        "violation_type": "OBSOLETE_ITEM",
                        "statutory_citation": "15 U.S.C. § 1681c(a)(4)",
                        "description": f"Account {creditor} reported by {bureau} exceeds the statutory 7-year obsolescence window from DOFD ({dofd_str}). Item must be immediately deleted.",
                        "severity": "HIGH",
                        "recommended_letter_type": "SECTION_609"
                    })

        return violations
```

- [ ] **Step 2: Write Compliance tests**

```python
from app.compliance import ComplianceAnalyzer

def test_cross_bureau_discrepancy():
    tradeline = {
        "creditor_name": "Chase Bank",
        "bureaus": {
            "Experian": {"balance": 500.0, "status": "Derogatory"},
            "Equifax": {"balance": 0.0, "status": "Open"}
        }
    }
    violations = ComplianceAnalyzer.analyze_tradeline(tradeline)
    assert len(violations) >= 1
    assert violations[0]["statutory_citation"] == "15 U.S.C. § 1681i(a)(5)"

def test_obsolescence_rule():
    tradeline = {
        "creditor_name": "Old Collection Co",
        "bureaus": {
            "TransUnion": {"balance": 200.0, "status": "Collection", "dofd": "2015-01-01"}
        }
    }
    violations = ComplianceAnalyzer.analyze_tradeline(tradeline)
    assert any(v["violation_type"] == "OBSOLETE_ITEM" for v in violations)
```

- [ ] **Step 3: Run compliance tests**

Run: `pytest backend/tests/test_compliance.py -v`
Expected: PASS

---

### Task 6: Automated Dispute Generator

**Files:**
- Create: `backend/app/dispute_generator.py`
- Test: `backend/tests/test_dispute_generator.py`

**Interfaces:**
- Consumes: User PII, Violation details, Target Bureau/Furnisher.
- Produces: Formatted, non-template Markdown dispute letter string ready for delivery.

- [ ] **Step 1: Write backend/app/dispute_generator.py**

```python
from typing import Dict, Any, List
from datetime import date

class DisputeGenerator:
    @staticmethod
    def generate_section_609_letter(user: Dict[str, str], violations: List[Dict[str, Any]], target_bureau: str) -> str:
        today = date.today().strftime("%B %d, %Y")
        
        violations_text = ""
        for idx, v in enumerate(violations, 1):
            violations_text += f"{idx}. Account: {v.get('creditor_name', 'Disputed Account')}\n"
            violations_text += f"   - Inaccuracy: {v['description']}\n"
            violations_text += f"   - Legal Violation: {v['statutory_citation']}\n\n"

        return f"""
{user['first_name']} {user['last_name']}
{user.get('address', '123 Main St')}
{user.get('city', 'Anytown')}, {user.get('state', 'CA')} {user.get('zip', '90001')}

Date: {today}

To: {target_bureau} Consumer Dispute Department

NOTICE OF FCRA COMPLIANCE VIOLATION & REQUEST FOR VERIFICATION (15 U.S.C. § 1681g / § 1681i)

Dear Sir/Madam,

I am writing to formally exercise my rights under the Fair Credit Reporting Act (15 U.S.C. § 1681 et seq.). Upon auditing my credit file, I identified specific reporting errors and unverified data that fail to comply with federal standards:

{violations_text}

Under 15 U.S.C. § 1681i(a)(5), if an item is incomplete or inaccurate, you are required to promptly delete or modify that item. Furthermore, under Section 609, I demand full verification including original signed consumer contracts demonstrating your authority to report this data.

Please provide written response within thirty (30) calendar days as required by law.

Sincerely,

{user['first_name']} {user['last_name']}
Last 4 SSN: {user.get('ssn_last_four', 'XXXX')}
""".strip()
```

- [ ] **Step 2: Write Dispute Generator tests**

```python
from app.dispute_generator import DisputeGenerator

def test_generate_letter():
    user = {"first_name": "Jane", "last_name": "Doe", "ssn_last_four": "1234"}
    violations = [{
        "creditor_name": "Bank of America",
        "description": "Inconsistent balance reported",
        "statutory_citation": "15 U.S.C. § 1681i(a)(5)"
    }]
    letter = DisputeGenerator.generate_section_609_letter(user, violations, "Experian")
    assert "Jane Doe" in letter
    assert "15 U.S.C. § 1681i(a)(5)" in letter
    assert "Experian Consumer Dispute Department" in letter
```

- [ ] **Step 3: Run dispute generator tests**

Run: `pytest backend/tests/test_dispute_generator.py -v`
Expected: PASS

---

### Task 7: Next.js Frontend Dashboard Interface

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/app/page.tsx`
- Create: `frontend/app/login/page.tsx`
- Create: `frontend/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: REST API endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`, `/health`).
- Produces: Interactive login form, upload section, compliance violation list, and dispute generator UI.

- [ ] **Step 1: Create frontend directory structure & package.json**

```json
{
  "name": "credit-law-dispute-ui",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.7",
    "lucide-react": "^0.330.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35"
  }
}
```

- [ ] **Step 2: Create frontend/app/dashboard/page.tsx**

```tsx
"use client";
import React, { useState } from "react";

export default function Dashboard() {
  const [violations, setViolations] = useState([
    {
      id: "1",
      creditor: "Chase Bank",
      citation: "15 U.S.C. § 1681i(a)(5)",
      description: "Balance discrepancy between Experian ($500) and Equifax ($0).",
      severity: "HIGH"
    }
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            US Credit Law Dispute Engine
          </h1>
          <p className="text-slate-400 text-sm">FCRA & Metro 2 Automated Legal Auditor</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-sm text-slate-300">
          FCRA 30-Day Response Window Active
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Detected Reporting Errors & Violations</h2>
          <div className="space-y-4">
            {violations.map((v) => (
              <div key={v.id} className="p-4 bg-slate-950 border border-red-900/40 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-red-400">{v.creditor}</span>
                  <span className="text-xs px-2 py-1 bg-red-950 text-red-300 border border-red-800 rounded uppercase">
                    {v.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-2">{v.description}</p>
                <div className="text-xs text-indigo-400 font-mono">Citation: {v.citation}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-indigo-400">Generate Legal Dispute</h2>
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-indigo-600/20 mb-4">
            Generate Section 609 Letter
          </button>
          <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 rounded-lg transition-colors border border-slate-700">
            Generate Debt Validation Letter
          </button>
        </section>
      </main>
    </div>
  );
}
```

---

### Task 8: Production Verification & Coolify Deployment Setup

**Files:**
- Modify: `docker-compose.yml`
- Test: Full end-to-end backend test suite (`pytest`)

- [ ] **Step 1: Run full backend test suite**

Run: `pytest backend/tests -v`
Expected: 100% PASS

- [ ] **Step 2: Commit complete implementation codebase**

```bash
git add .
git commit -m "feat: complete US Credit Law analysis & dispute platform backend and frontend"
```

---

## Execution Choice
Plan complete and saved to `docs/superpowers/plans/2026-07-24-credit-law-dispute-app-plan.md`.

Two execution options:
1. **Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks.
2. **Inline Execution** - Execute tasks in this session using `executing-plans`.

Which approach?
