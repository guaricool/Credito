import io
import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.parser import CreditReportParser

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


def test_parse_html_report_table_format():
    sample_html = """
    <html>
    <head><title>SmartCredit Report</title></head>
    <body>
        <h1>Credit Monitoring Report - SmartCredit</h1>
        <table>
            <tr><th>Field</th><th>Experian</th><th>Equifax</th><th>TransUnion</th></tr>
            <tr><td>Creditor Name</td><td>Chase Bank</td><td>Chase Bank</td><td>Chase Bank</td></tr>
            <tr><td>Account Number</td><td>****1234</td><td>****1234</td><td>****1234</td></tr>
            <tr><td>Account Type</td><td>Revolving</td><td>Revolving</td><td>Revolving</td></tr>
            <tr><td>Balance</td><td>$500.00</td><td>$0.00</td><td>$500.00</td></tr>
            <tr><td>Status</td><td>Derogatory</td><td>Open</td><td>Derogatory</td></tr>
            <tr><td>DOFD</td><td>2018-05-10</td><td>N/A</td><td>2018-05-10</td></tr>
        </table>
    </body>
    </html>
    """
    res = CreditReportParser.parse_html_report(sample_html)
    assert res["source_provider"] == "SmartCredit"
    assert res["total_tradelines"] >= 1
    t = res["tradelines"][0]
    assert t["creditor_name"] == "Chase Bank"
    assert t["account_number_masked"] == "****1234"
    assert t["bureaus"]["Experian"]["current_balance"] == 500.0
    assert t["bureaus"]["Experian"]["account_status"] == "Derogatory"


def test_parse_pdf_report_extraction():
    # Test fallback or extracted text handling for PDF bytes
    sample_pdf_text = b"%PDF-1.4 ... Fake PDF bytes ..."
    res = CreditReportParser.parse_pdf_report(sample_pdf_text)
    assert res["source_provider"] in ["PDF Report", "Experian PDF", "Equifax PDF", "TransUnion PDF"]
    assert "total_tradelines" in res
    assert isinstance(res["tradelines"], list)


def test_parse_report_dispatching():
    sample_html_bytes = b"<html><body><table><tr><td>Creditor Name</td><td>Bank of America</td></tr></table></body></html>"
    res_html = CreditReportParser.parse_report(sample_html_bytes, "report.html")
    assert "tradelines" in res_html

    sample_pdf_bytes = b"%PDF-1.4 content"
    res_pdf = CreditReportParser.parse_report(sample_pdf_bytes, "report.pdf")
    assert "tradelines" in res_pdf

    with pytest.raises(ValueError) as exc_info:
        CreditReportParser.parse_report(b"some raw text", "report.txt")
    assert "Unsupported file format" in str(exc_info.value)


@pytest.mark.asyncio
async def test_upload_report_endpoint_success(client):
    # 1. Register & Login User
    reg_payload = {
        "email": "report.user@example.com",
        "password": "Password123!",
        "first_name": "Report",
        "last_name": "User",
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201

    login_data = {
        "username": "report.user@example.com",
        "password": "Password123!",
    }
    login_resp = await client.post("/api/v1/auth/login", data=login_data)
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # 2. Upload HTML Credit Report
    sample_html = """
    <html>
        <body>
            <table>
                <tr><th>Field</th><th>Experian</th><th>Equifax</th><th>TransUnion</th></tr>
                <tr><td>Creditor Name</td><td>Wells Fargo</td><td>Wells Fargo</td><td>Wells Fargo</td></tr>
                <tr><td>Account Number</td><td>****5678</td><td>****5678</td><td>****5678</td></tr>
                <tr><td>Account Type</td><td>Installment</td><td>Installment</td><td>Installment</td></tr>
                <tr><td>Balance</td><td>$1200.00</td><td>$1200.00</td><td>$1200.00</td></tr>
                <tr><td>Status</td><td>Late 30 Days</td><td>Late 30 Days</td><td>Late 30 Days</td></tr>
            </table>
        </body>
    </html>
    """
    files = {"file": ("credit_report.html", sample_html.encode("utf-8"), "text/html")}
    headers = {"Authorization": f"Bearer {token}"}

    upload_resp = await client.post("/api/v1/reports/upload", files=files, headers=headers)
    assert upload_resp.status_code == 201
    data = upload_resp.json()

    assert "id" in data
    assert "HTML" in data["source_provider"]
    assert len(data["tradelines"]) >= 1

    tradeline = data["tradelines"][0]
    assert tradeline["creditor_name"] == "Wells Fargo"
    assert tradeline["account_number_masked"] == "****5678"
    assert len(tradeline["bureau_details"]) == 3
    bureaus_names = [b["bureau"] for b in tradeline["bureau_details"]]
    assert "Experian" in bureaus_names
    assert "Equifax" in bureaus_names
    assert "TransUnion" in bureaus_names


@pytest.mark.asyncio
async def test_upload_report_endpoint_invalid_file(client):
    reg_payload = {
        "email": "invalid.file@example.com",
        "password": "Password123!",
        "first_name": "Test",
        "last_name": "User",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_data = {"username": "invalid.file@example.com", "password": "Password123!"}
    login_resp = await client.post("/api/v1/auth/login", data=login_data)
    token = login_resp.json()["access_token"]

    files = {"file": ("invalid_doc.txt", b"plain text", "text/plain")}
    headers = {"Authorization": f"Bearer {token}"}

    upload_resp = await client.post("/api/v1/reports/upload", files=files, headers=headers)
    assert upload_resp.status_code == 400
    assert "Unsupported file format" in upload_resp.json()["detail"]


@pytest.mark.asyncio
async def test_upload_report_endpoint_unauthorized(client):
    files = {"file": ("credit_report.html", b"<html></html>", "text/html")}
    upload_resp = await client.post("/api/v1/reports/upload", files=files)
    assert upload_resp.status_code == 401
