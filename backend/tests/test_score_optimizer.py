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
async def test_score_optimizer_plan(client):
    # 1. Register user
    reg_payload = {
        "email": "optimizer_user@example.com",
        "password": "SecurePassword123!",
        "first_name": "Seneca",
        "last_name": "Stoic",
        "ssn_last_four": "9988",
        "current_address": "500 Forum St",
        "city": "Rome",
        "state": "NY",
        "zip_code": "13440",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # 2. Login
    login_data = {
        "username": "optimizer_user@example.com",
        "password": "SecurePassword123!",
    }
    login_res = await client.post("/api/v1/auth/login", data=login_data)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get Score Optimization Plan
    opt_res = await client.get("/api/v1/optimizer/plan", headers=headers)
    assert opt_res.status_code == 200
    data = opt_res.json()

    assert "current_estimated_score" in data
    assert "target_potential_score" in data
    assert "potential_points_gain" in data
    assert "utilization" in data
    assert "action_roadmap" in data
    assert len(data["action_roadmap"]) >= 4

    first_step = data["action_roadmap"][0]
    assert "step_number" in first_step
    assert "potential_point_gain" in first_step
    assert "statute_citation" in first_step
