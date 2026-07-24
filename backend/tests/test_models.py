import uuid
from datetime import datetime, date
from decimal import Decimal
import pytest
from app.models import (
    User,
    CreditReport,
    Tradeline,
    BureauTradelineDetail,
    ComplianceViolation,
    DisputeCampaign,
    DisputeLetter,
)
from app.schemas import (
    UserCreate,
    UserResponse,
    CreditReportCreate,
    CreditReportResponse,
    TradelineResponse,
    BureauTradelineDetailResponse,
    ComplianceViolationResponse,
    DisputeCampaignResponse,
    DisputeLetterResponse,
)

def test_user_model_instantiation():
    user = User(
        email="john.doe@example.com",
        password_hash="hashed_secret",
        first_name="John",
        last_name="Doe",
        ssn_last_four="1234",
        current_address="123 Main St",
        city="Austin",
        state="TX",
        zip_code="78701",
    )
    assert user.email == "john.doe@example.com"
    assert user.password_hash == "hashed_secret"
    assert user.first_name == "John"
    assert user.last_name == "Doe"
    assert user.ssn_last_four == "1234"
    assert user.current_address == "123 Main St"
    assert user.city == "Austin"
    assert user.state == "TX"
    assert user.zip_code == "78701"

def test_credit_report_and_tradeline_instantiation():
    user_id = uuid.uuid4()
    report_id = uuid.uuid4()
    report = CreditReport(
        id=report_id,
        user_id=user_id,
        source_provider="IdentityIQ",
        report_date=date(2026, 1, 15),
        raw_json_data={"score": 720},
    )
    assert report.user_id == user_id
    assert report.source_provider == "IdentityIQ"
    assert report.report_date == date(2026, 1, 15)
    assert report.raw_json_data == {"score": 720}

    tradeline = Tradeline(
        user_id=user_id,
        credit_report_id=report_id,
        creditor_name="Bank of America",
        account_number_masked="****5678",
        account_type="Revolving",
        date_opened=date(2020, 5, 1),
    )
    assert tradeline.creditor_name == "Bank of America"
    assert tradeline.account_number_masked == "****5678"
    assert tradeline.account_type == "Revolving"
    assert tradeline.date_opened == date(2020, 5, 1)

def test_bureau_detail_and_violation_instantiation():
    tradeline_id = uuid.uuid4()
    detail = BureauTradelineDetail(
        tradeline_id=tradeline_id,
        bureau="Experian",
        account_status="Derogatory",
        current_balance=Decimal("1500.50"),
        past_due_amount=Decimal("300.00"),
        date_of_first_delinquency=date(2022, 3, 10),
        date_last_reported=date(2026, 1, 1),
        payment_history_24_months="C"*24,
        comments="Account charged off",
    )
    assert detail.bureau == "Experian"
    assert detail.current_balance == Decimal("1500.50")
    assert detail.comments == "Account charged off"

    violation = ComplianceViolation(
        tradeline_id=tradeline_id,
        bureau="Experian",
        violation_type="OBSOLETE_ITEM",
        statutory_citation="15 U.S.C. § 1681c",
        description="Item older than 7 years",
        severity="HIGH",
        recommended_letter_type="SECTION_609",
    )
    assert violation.violation_type == "OBSOLETE_ITEM"
    assert violation.statutory_citation == "15 U.S.C. § 1681c"
    assert violation.severity == "HIGH"

def test_dispute_campaign_and_letter_instantiation():
    user_id = uuid.uuid4()
    campaign_id = uuid.uuid4()
    campaign = DisputeCampaign(
        id=campaign_id,
        user_id=user_id,
        campaign_name="Round 1 - Experian",
        target_type="BUREAU",
        target_name="Experian",
        status="DRAFT",
    )
    assert campaign.campaign_name == "Round 1 - Experian"
    assert campaign.target_type == "BUREAU"

    letter = DisputeLetter(
        campaign_id=campaign_id,
        letter_type="SECTION_609",
        content_markdown="# Dispute Letter\nNotice of violation...",
        tracking_number="9400100000000000000000",
    )
    assert letter.letter_type == "SECTION_609"
    assert letter.tracking_number == "9400100000000000000000"

def test_pydantic_schemas_validation():
    user_create = UserCreate(
        email="test@example.com",
        password="secretpassword",
        first_name="Jane",
        last_name="Smith",
    )
    assert user_create.email == "test@example.com"
    assert user_create.password == "secretpassword"

    user_resp = UserResponse(
        id=uuid.uuid4(),
        email="test@example.com",
        first_name="Jane",
        last_name="Smith",
        created_at=datetime.utcnow(),
    )
    assert user_resp.first_name == "Jane"
