import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from datetime import timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.main import app
from app.database import Base, get_db
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)

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


def test_password_hashing_and_verification():
    raw_password = "SecurePassword2026!"
    hashed = get_password_hash(raw_password)
    
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_creation_and_decoding():
    data = {"sub": "12345678-1234-1234-1234-123456789abc"}
    token = create_access_token(data=data, expires_delta=timedelta(minutes=15))
    assert isinstance(token, str)
    
    decoded = decode_access_token(token)
    assert decoded.get("sub") == "12345678-1234-1234-1234-123456789abc"
    assert "exp" in decoded


def test_jwt_decoding_invalid_token():
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("invalid.jwt.token")
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_register_user_success(client):
    payload = {
        "email": "user.test@example.com",
        "password": "Password123!",
        "first_name": "John",
        "last_name": "Doe",
        "ssn_last_four": "1234",
        "current_address": "123 Main St",
        "city": "Austin",
        "state": "TX",
        "zip_code": "78701",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user.test@example.com"
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_register_user_duplicate_email(client):
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "first_name": "Jane",
        "last_name": "Smith",
    }
    resp1 = await client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 400
    assert resp2.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_login_success_and_get_me(client):
    # 1. Register user
    reg_payload = {
        "email": "login.test@example.com",
        "password": "SecretPassword123!",
        "first_name": "Alice",
        "last_name": "Wonderland",
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201

    # 2. Login with form data
    login_data = {
        "username": "login.test@example.com",
        "password": "SecretPassword123!",
    }
    login_resp = await client.post("/api/v1/auth/login", data=login_data)
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    token = token_data["access_token"]

    # 3. Access protected GET /api/v1/auth/me
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    user_info = me_resp.json()
    assert user_info["email"] == "login.test@example.com"
    assert user_info["first_name"] == "Alice"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    # Non-existent email
    login_data = {
        "username": "nonexistent@example.com",
        "password": "SomePassword123",
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client):
    # No auth header
    resp1 = await client.get("/api/v1/auth/me")
    assert resp1.status_code == 401

    # Invalid token header
    headers = {"Authorization": "Bearer invalidtoken123"}
    resp2 = await client.get("/api/v1/auth/me", headers=headers)
    assert resp2.status_code == 401
