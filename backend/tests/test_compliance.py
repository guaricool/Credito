import uuid
from datetime import date, timedelta
import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import Tradeline, BureauTradelineDetail
from app.compliance import ComplianceAnalyzer

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def client(db_session):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


# --- ComplianceAnalyzer Unit Tests ---

def test_cross_bureau_discrepancy_balance():
    t = Tradeline(
        id=uuid.uuid4(),
        creditor_name="Bank of America",
        account_number_masked="****1111",
        account_type="Revolving",
    )
    b1 = BureauTradelineDetail(
        tradeline_id=t.id,
        bureau="Experian",
        current_balance=500.00,
        account_status="Open",
    )
    b2 = BureauTradelineDetail(
        tradeline_id=t.id,
        bureau="Equifax",
        current_balance=0.00,
        account_status="Open",
    )
    t.bureau_details = [b1, b2]

    analyzer = ComplianceAnalyzer()
    violations = analyzer.analyze_report([t])

    assert len(violations) >= 1
    v_types = [v.violation_type for v in violations]
    assert "CROSS_BUREAU_DISCREPANCY" in v_types
    disc_v = next(v for v in violations if v.violation_type == "CROSS_BUREAU_DISCREPANCY")
    assert "15 U.S.C. § 1681i" in disc_v.statutory_citation
    assert disc_v.severity == "HIGH"


def test_cross_bureau_discrepancy_status():
    t = Tradeline(
        id=uuid.uuid4(),
        creditor_name="Citi Credit Card",
        account_number_masked="****2222",
    )
    b1 = BureauTradelineDetail(
        tradeline_id=t.id,
        bureau="Experian",
        current_balance=200.00,
        account_status="Derogatory",
    )
    b2 = BureauTradelineDetail(
        tradeline_id=t.id,
        bureau="TransUnion",
        current_balance=200.00,
        account_status="Open",
    )
    t.bureau_details = [b1, b2]

    analyzer = ComplianceAnalyzer()
    violations = analyzer.analyze_report([t])

    v_types = [v.violation_type for v in violations]
    assert "CROSS_BUREAU_DISCREPANCY" in v_types


def test_7_year_obsolescence_rule():
    t = Tradeline(
        id=uuid.uuid4(),
        creditor_name="Old Collections Agency",
        account_number_masked="****3333",
    )
    eight_years_ago = date.today() - timedelta(days=365 * 8)
    b = BureauTradelineDetail(
        tradeline_id=t.id,
        bureau="Experian",
        current_balance=1500.00,
        account_status="Derogatory",
        date_of_first_delinquency=eight_years_ago,
    )
    t.bureau_details = [b]

    analyzer = ComplianceAnalyzer()
    violations = analyzer.analyze_report([t])

    v_types = [v.violation_type for v in violations]
    assert "OBSOLETE_INFORMATION" in v_types
    obs_v = next(v for v in violations if v.violation_type == "OBSOLETE_INFORMATION")
    assert obs_v.statutory_citation == "15 U.S.C. § 1681c"
    assert obs_v.severity == "HIGH"
    assert obs_v.recommended_letter_type == "OBSOLETE_DELETE_DEMAND"


def test_non_obsolete_dofd():
    t = Tradeline(
        id=uuid.uuid4(),
        creditor_name="Recent Delinquency",
        account_number_masked="****4444",
    )
    two_years_ago = date.today() - timedelta(days=365 * 2)
    b = BureauTradelineDetail(
        tradeline_id=t.id,
        bureau="Equifax",
        current_balance=800.00,
        account_status="Derogatory",
        date_of_first_delinquency=two_years_ago,
    )
    t.bureau_details = [b]

    analyzer = ComplianceAnalyzer()
    violations = analyzer.analyze_report([t])

    v_types = [v.violation_type for v in violations]
    assert "OBSOLETE_INFORMATION" not in v_types


def test_metro_2_missing_dofd_on_derogatory():
    t = Tradeline(
        id=uuid.uuid4(),
        creditor_name="Medical Collection",
        account_number_masked="****5555",
    )
    b = BureauTradelineDetail(
        tradeline_id=t.id,
        bureau="TransUnion",
        current_balance=350.00,
        account_status="Collection",
        date_of_first_delinquency=None,
    )
    t.bureau_details = [b]

    analyzer = ComplianceAnalyzer()
    violations = analyzer.analyze_report([t])

    v_types = [v.violation_type for v in violations]
    assert "METRO2_FORMAT_VIOLATION" in v_types
    m2_v = next(v for v in violations if v.violation_type == "METRO2_FORMAT_VIOLATION")
    assert "Metro 2" in m2_v.statutory_citation


# --- Compliance Router Integration Tests ---

@pytest.mark.asyncio
async def test_audit_credit_report_endpoint_success(client):
    # 1. Register & login user
    reg_payload = {
        "email": "compliance.user@example.com",
        "password": "Password123!",
        "first_name": "Compliance",
        "last_name": "User",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "compliance.user@example.com", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload credit report
    sample_html = """
    <html>
        <body>
            <table>
                <tr><th>Field</th><th>Experian</th><th>Equifax</th><th>TransUnion</th></tr>
                <tr><td>Creditor Name</td><td>Discover Card</td><td>Discover Card</td><td>Discover Card</td></tr>
                <tr><td>Account Number</td><td>****9999</td><td>****9999</td><td>****9999</td></tr>
                <tr><td>Balance</td><td>$500.00</td><td>$0.00</td><td>$500.00</td></tr>
                <tr><td>Status</td><td>Derogatory</td><td>Derogatory</td><td>Derogatory</td></tr>
            </table>
        </body>
    </html>
    """
    files = {"file": ("report.html", sample_html.encode("utf-8"), "text/html")}
    upload_resp = await client.post("/api/v1/reports/upload", files=files, headers=headers)
    assert upload_resp.status_code == 201
    report_id = upload_resp.json()["id"]

    # 3. Run audit endpoint
    audit_resp = await client.post(f"/api/v1/compliance/audit/{report_id}", headers=headers)
    assert audit_resp.status_code == 200
    violations = audit_resp.json()
    assert isinstance(violations, list)
    assert len(violations) >= 1

    # 4. Get violations list
    get_resp = await client.get("/api/v1/compliance/violations", headers=headers)
    assert get_resp.status_code == 200
    user_violations = get_resp.json()
    assert len(user_violations) == len(violations)


@pytest.mark.asyncio
async def test_audit_credit_report_not_found(client):
    reg_payload = {
        "email": "notfound.user@example.com",
        "password": "Password123!",
        "first_name": "Test",
        "last_name": "User",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "notfound.user@example.com", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    fake_id = str(uuid.uuid4())
    audit_resp = await client.post(f"/api/v1/compliance/audit/{fake_id}", headers=headers)
    assert audit_resp.status_code == 404


@pytest.mark.asyncio
async def test_compliance_unauthorized(client):
    fake_id = str(uuid.uuid4())
    audit_resp = await client.post(f"/api/v1/compliance/audit/{fake_id}")
    assert audit_resp.status_code == 401

    get_resp = await client.get("/api/v1/compliance/violations")
    assert get_resp.status_code == 401
