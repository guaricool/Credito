import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

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

@pytest.mark.asyncio
async def test_privacy_leak_flow(client):
    # Register user
    reg_payload = {
        "email": "privacy_test_user@example.com",
        "password": "SecurePassword123!",
        "first_name": "Sarah",
        "last_name": "Connor",
        "ssn_last_four": "9876",
        "current_address": "456 Cyberdyne Blvd",
        "city": "Los Angeles",
        "state": "CA",
        "zip_code": "90001",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # Login to get token
    login_data = {
        "username": "privacy_test_user@example.com",
        "password": "SecurePassword123!",
    }
    login_res = await client.post("/api/v1/auth/login", data=login_data)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Trigger Privacy Scan
    scan_res = await client.post("/api/v1/privacy/scan", headers=headers)
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    assert "privacy_score" in scan_data
    assert scan_data["leaks_found"] >= 1

    # 2. Get User Leaks
    leaks_res = await client.get("/api/v1/privacy/leaks", headers=headers)
    assert leaks_res.status_code == 200
    leaks = leaks_res.json()
    assert len(leaks) >= 1
    assert leaks[0]["breach_name"] is not None

    # 3. Get Data Broker Opt-Out Requests
    brokers_res = await client.get("/api/v1/privacy/brokers", headers=headers)
    assert brokers_res.status_code == 200
    brokers = brokers_res.json()
    assert len(brokers) >= 1
    assert brokers[0]["broker"]["broker_name"] is not None

    # 4. Trigger Opt-Out Deletion Request
    opt_res = await client.post("/api/v1/privacy/opt-out", json={}, headers=headers)
    assert opt_res.status_code == 200
    updated_brokers = opt_res.json()
    assert len(updated_brokers) >= 1

    # 5. Generate FCRA Section 605B Identity Theft Block Affidavit
    block_payload = {
        "bureau": "Experian",
        "police_report_or_affidavit_number": "FTC-9988776655",
        "fraudulent_tradelines": [
            "MIDLAND CREDIT MANAGEMENT #998877",
            "CHASE BANK FRAUDULENT CARD #4455",
        ],
    }
    block_res = await client.post("/api/v1/privacy/fcra-605b", json=block_payload, headers=headers)
    assert block_res.status_code == 200
    block_data = block_res.json()
    assert "15 U.S.C. § 1681c-2" in block_data["citation"]
    assert "DEMAND FOR STATUTORY 4-DAY BLOCK" in block_data["content_markdown"]
    assert "MIDLAND CREDIT MANAGEMENT #998877" in block_data["content_markdown"]
