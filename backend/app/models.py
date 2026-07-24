import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
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
    bureau = Column(String(20), nullable=False)  # Experian, Equifax, TransUnion
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
    severity = Column(String(20), nullable=False)  # HIGH, MEDIUM, LOW
    recommended_letter_type = Column(String(100), nullable=False)

    tradeline = relationship("Tradeline", back_populates="violations")

class DisputeCampaign(Base):
    __tablename__ = "dispute_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    campaign_name = Column(String(255), nullable=False)
    target_type = Column(String(50), nullable=False)  # BUREAU, FURNISHER, COLLECTOR
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
