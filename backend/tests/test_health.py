import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    try:
        from httpx import ASGITransport
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
    except (ImportError, AttributeError):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/health")
    
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "credit_law_api"}
