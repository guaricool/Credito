from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Any, Dict
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    ssn_last_four: Optional[str] = None
    current_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

class UserCreate(UserBase):
    password: str

class RegisterRequest(UserCreate):
    pass

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime



# --- Bureau Tradeline Detail Schemas ---
class BureauTradelineDetailBase(BaseModel):
    bureau: str
    account_status: Optional[str] = None
    current_balance: Optional[Decimal] = Decimal("0.0")
    past_due_amount: Optional[Decimal] = Decimal("0.0")
    date_of_first_delinquency: Optional[date] = None
    date_last_reported: Optional[date] = None
    payment_history_24_months: Optional[str] = None
    comments: Optional[str] = None

class BureauTradelineDetailCreate(BureauTradelineDetailBase):
    pass

class BureauTradelineDetailResponse(BureauTradelineDetailBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tradeline_id: UUID


# --- Compliance Violation Schemas ---
class ComplianceViolationBase(BaseModel):
    bureau: Optional[str] = None
    violation_type: str
    statutory_citation: str
    description: str
    severity: str
    recommended_letter_type: str

class ComplianceViolationCreate(ComplianceViolationBase):
    tradeline_id: Optional[UUID] = None

class ComplianceViolationResponse(ComplianceViolationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tradeline_id: Optional[UUID] = None


# --- Tradeline Schemas ---
class TradelineBase(BaseModel):
    creditor_name: str
    account_number_masked: str
    account_type: Optional[str] = None
    date_opened: Optional[date] = None

class TradelineCreate(TradelineBase):
    credit_report_id: UUID

class TradelineResponse(TradelineBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    credit_report_id: UUID
    bureau_details: List[BureauTradelineDetailResponse] = []
    violations: List[ComplianceViolationResponse] = []


# --- Credit Report Schemas ---
class CreditReportBase(BaseModel):
    source_provider: str
    report_date: date
    raw_json_data: Optional[Dict[str, Any]] = None

class CreditReportCreate(CreditReportBase):
    pass

class CreditReportResponse(CreditReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    tradelines: List[TradelineResponse] = []


# --- Dispute Letter Schemas ---
class DisputeLetterBase(BaseModel):
    letter_type: str
    content_markdown: str
    tracking_number: Optional[str] = None

class DisputeLetterCreate(DisputeLetterBase):
    campaign_id: UUID

class DisputeLetterResponse(DisputeLetterBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campaign_id: UUID
    created_at: datetime


# --- Dispute Campaign Schemas ---
class DisputeGenerateRequest(BaseModel):
    letter_type: str
    target_name: str
    target_type: Optional[str] = None
    violation_ids: Optional[List[UUID]] = None
    account_number: Optional[str] = None
    balance: Optional[float] = 0.0
    disputed_account: Optional[str] = None

class DisputeCampaignBase(BaseModel):
    campaign_name: str
    target_type: str
    target_name: str
    status: Optional[str] = "DRAFT"
    sent_date: Optional[date] = None
    response_due_date: Optional[date] = None

class DisputeCampaignCreate(DisputeCampaignBase):
    pass

class DisputeCampaignResponse(DisputeCampaignBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    letters: List[DisputeLetterResponse] = []

