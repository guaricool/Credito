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
from app.models import User, ComplianceViolation
from app.dispute_generator import DisputeGenerator

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


# --- Unit Tests for DisputeGenerator ---

def test_generate_section_609_letter_statutory_citations():
    user = User(
        id=uuid.uuid4(),
        first_name="Jane",
        last_name="Doe",
        current_address="123 Main St",
        city="Miami",
        state="FL",
        zip_code="33101",
        ssn_last_four="5678",
    )
    violation = ComplianceViolation(
        id=uuid.uuid4(),
        bureau="Experian",
        violation_type="CROSS_BUREAU_DISCREPANCY",
        statutory_citation="15 U.S.C. § 1681i",
        description="Balance mismatch across bureaus.",
        severity="HIGH",
        recommended_letter_type="SECTION_609",
    )

    generator = DisputeGenerator()
    letter = generator.generate_section_609_letter(
        user=user,
        violations=[violation],
        target_bureau="Experian",
    )

    # Check required statutory citations
    assert "15 U.S.C. § 1681g" in letter
    assert "15 U.S.C. § 1681i(a)(5)" in letter
    assert "Experian" in letter
    assert "Jane Doe" in letter
    assert "5678" in letter
    assert "CROSS_BUREAU_DISCREPANCY" in letter
    assert "15 U.S.C. § 1681i" in letter


def test_generate_section_609_letter_anti_template_variation():
    user1 = User(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        first_name="Alice",
        last_name="Smith",
    )
    user2 = User(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        first_name="Bob",
        last_name="Jones",
    )

    generator = DisputeGenerator()
    letter1 = generator.generate_section_609_letter(user1, [], "Equifax")
    letter2 = generator.generate_section_609_letter(user2, [], "Equifax")

    assert "15 U.S.C. § 1681g" in letter1
    assert "15 U.S.C. § 1681g" in letter2
    # Verify letters are non-identical due to e-OSCAR anti-template rephrasing
    assert letter1 != letter2


def test_generate_debt_validation_letter():
    user = User(
        id=uuid.uuid4(),
        first_name="Robert",
        last_name="Johnson",
        current_address="456 Oak Rd",
        city="Dallas",
        state="TX",
        zip_code="75001",
        ssn_last_four="1234",
    )

    generator = DisputeGenerator()
    letter = generator.generate_debt_validation_letter(
        user=user,
        creditor_name="Midland Credit Management",
        account_number="ACC-998877",
        balance=2450.75,
    )

    # Check FDCPA Section 809 statutory citation
    assert "15 U.S.C. § 1692g" in letter
    assert "15 U.S.C. § 1692g(b)" in letter
    assert "Midland Credit Management" in letter
    assert "ACC-998877" in letter
    assert "$2,450.75" in letter
    assert "Robert Johnson" in letter


def test_generate_mov_letter():
    user = User(
        id=uuid.uuid4(),
        first_name="Maria",
        last_name="Garcia",
        current_address="789 Pine Ave",
        city="Atlanta",
        state="GA",
        zip_code="30301",
        ssn_last_four="9012",
    )

    generator = DisputeGenerator()
    letter = generator.generate_mov_letter(
        user=user,
        target_bureau="TransUnion",
        disputed_account="Capital One Bank - ****4321",
    )

    # Check MOV statutory citation under 15 U.S.C. § 1681i(a)(7)
    assert "15 U.S.C. § 1681i(a)(7)" in letter
    assert "TransUnion" in letter
    assert "Capital One Bank - ****4321" in letter
    assert "Maria Garcia" in letter
    assert "fifteen (15) days" in letter


# --- Integration Tests for Dispute Router Endpoints ---

@pytest.mark.asyncio
async def test_generate_dispute_endpoint_section_609(client):
    # 1. Register & login user
    await client.post("/api/v1/auth/register", json={
        "email": "dispute.user@example.com",
        "password": "Password123!",
        "first_name": "Dispute",
        "last_name": "Tester",
    })
    login_resp = await client.post("/api/v1/auth/login", data={
        "username": "dispute.user@example.com",
        "password": "Password123!",
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Call generate dispute endpoint
    payload = {
        "letter_type": "SECTION_609",
        "target_name": "Experian",
    }
    gen_resp = await client.post("/api/v1/disputes/generate", json=payload, headers=headers)
    assert gen_resp.status_code == 201
    data = gen_resp.json()

    assert data["campaign_name"] == "SECTION_609 - Experian"
    assert data["target_type"] == "BUREAU"
    assert data["target_name"] == "Experian"
    assert data["status"] == "SENT"

    # Check 30-day response due date calculation
    expected_due = (date.today() + timedelta(days=30)).isoformat()
    assert data["response_due_date"] == expected_due

    assert len(data["letters"]) == 1
    letter = data["letters"][0]
    assert letter["letter_type"] == "SECTION_609"
    assert "15 U.S.C. § 1681g" in letter["content_markdown"]


@pytest.mark.asyncio
async def test_generate_dispute_endpoint_debt_validation(client):
    await client.post("/api/v1/auth/register", json={
        "email": "dv.user@example.com",
        "password": "Password123!",
        "first_name": "David",
        "last_name": "Vance",
    })
    login_resp = await client.post("/api/v1/auth/login", data={
        "username": "dv.user@example.com",
        "password": "Password123!",
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "letter_type": "DEBT_VALIDATION",
        "target_name": "Portfolio Recovery Associates",
        "account_number": "PRA-554433",
        "balance": 1850.00,
    }
    gen_resp = await client.post("/api/v1/disputes/generate", json=payload, headers=headers)
    assert gen_resp.status_code == 201
    data = gen_resp.json()

    assert data["campaign_name"] == "DEBT_VALIDATION - Portfolio Recovery Associates"
    assert data["target_type"] == "COLLECTOR"
    assert len(data["letters"]) == 1
    assert "15 U.S.C. § 1692g" in data["letters"][0]["content_markdown"]


@pytest.mark.asyncio
async def test_generate_dispute_endpoint_mov(client):
    await client.post("/api/v1/auth/register", json={
        "email": "mov.user@example.com",
        "password": "Password123!",
        "first_name": "Mark",
        "last_name": "Owen",
    })
    login_resp = await client.post("/api/v1/auth/login", data={
        "username": "mov.user@example.com",
        "password": "Password123!",
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "letter_type": "MOV",
        "target_name": "Equifax",
        "disputed_account": "Wells Fargo ****7766",
    }
    gen_resp = await client.post("/api/v1/disputes/generate", json=payload, headers=headers)
    assert gen_resp.status_code == 201
    data = gen_resp.json()

    assert data["campaign_name"] == "MOV - Equifax"
    assert len(data["letters"]) == 1
    assert "15 U.S.C. § 1681i(a)(7)" in data["letters"][0]["content_markdown"]


@pytest.mark.asyncio
async def test_generate_dispute_invalid_type(client):
    await client.post("/api/v1/auth/register", json={
        "email": "invalid.user@example.com",
        "password": "Password123!",
        "first_name": "Invalid",
        "last_name": "Type",
    })
    login_resp = await client.post("/api/v1/auth/login", data={
        "username": "invalid.user@example.com",
        "password": "Password123!",
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "letter_type": "INVALID_LETTER_TYPE",
        "target_name": "Experian",
    }
    gen_resp = await client.post("/api/v1/disputes/generate", json=payload, headers=headers)
    assert gen_resp.status_code == 400


@pytest.mark.asyncio
async def test_get_dispute_campaigns(client):
    await client.post("/api/v1/auth/register", json={
        "email": "campaigns.user@example.com",
        "password": "Password123!",
        "first_name": "Cam",
        "last_name": "Paigns",
    })
    login_resp = await client.post("/api/v1/auth/login", data={
        "username": "campaigns.user@example.com",
        "password": "Password123!",
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate 2 campaigns
    await client.post("/api/v1/disputes/generate", json={
        "letter_type": "SECTION_609",
        "target_name": "Experian",
    }, headers=headers)

    await client.post("/api/v1/disputes/generate", json={
        "letter_type": "MOV",
        "target_name": "TransUnion",
    }, headers=headers)

    get_resp = await client.get("/api/v1/disputes/campaigns", headers=headers)
    assert get_resp.status_code == 200
    campaigns = get_resp.json()
    assert len(campaigns) == 2


@pytest.mark.asyncio
async def test_dispute_unauthorized(client):
    gen_resp = await client.post("/api/v1/disputes/generate", json={
        "letter_type": "SECTION_609",
        "target_name": "Experian",
    })
    assert gen_resp.status_code == 401

    get_resp = await client.get("/api/v1/disputes/campaigns")
    assert get_resp.status_code == 401
