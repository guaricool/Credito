from datetime import date, timedelta
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, DisputeCampaign, DisputeLetter, ComplianceViolation, Tradeline
from app.schemas import DisputeGenerateRequest, DisputeCampaignResponse
from app.auth import get_current_user
from app.dispute_generator import DisputeGenerator

router = APIRouter(prefix="/api/v1/disputes", tags=["Disputes"])

VALID_LETTER_TYPES = {"SECTION_609", "DEBT_VALIDATION", "MOV"}


@router.post("/generate", response_model=DisputeCampaignResponse, status_code=status.HTTP_201_CREATED)
async def generate_dispute(
    payload: DisputeGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    letter_type = payload.letter_type.upper().strip()
    if letter_type not in VALID_LETTER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid letter_type '{payload.letter_type}'. Must be one of: {', '.join(sorted(VALID_LETTER_TYPES))}",
        )

    # 1. Fetch compliance violations if violation_ids are provided
    violations: List[ComplianceViolation] = []
    if payload.violation_ids:
        stmt = (
            select(ComplianceViolation)
            .join(Tradeline, ComplianceViolation.tradeline_id == Tradeline.id)
            .where(
                Tradeline.user_id == current_user.id,
                ComplianceViolation.id.in_(payload.violation_ids),
            )
        )
        res = await db.execute(stmt)
        violations = res.scalars().all()

    # 2. Generate dispute letter content using DisputeGenerator
    generator = DisputeGenerator()
    if letter_type == "SECTION_609":
        letter_content = generator.generate_section_609_letter(
            user=current_user,
            violations=violations,
            target_bureau=payload.target_name,
        )
    elif letter_type == "DEBT_VALIDATION":
        letter_content = generator.generate_debt_validation_letter(
            user=current_user,
            creditor_name=payload.target_name,
            account_number=payload.account_number or "N/A",
            balance=payload.balance or 0.0,
        )
    elif letter_type == "MOV":
        letter_content = generator.generate_mov_letter(
            user=current_user,
            target_bureau=payload.target_name,
            disputed_account=payload.disputed_account or "N/A",
        )

    # 3. Calculate 30-day response due date for FCRA countdown tracking
    today = date.today()
    due_date = today + timedelta(days=30)

    target_type = payload.target_type or (
        "BUREAU" if letter_type in ["SECTION_609", "MOV"] else "COLLECTOR"
    )

    campaign = DisputeCampaign(
        user_id=current_user.id,
        campaign_name=f"{letter_type} - {payload.target_name}",
        target_type=target_type,
        target_name=payload.target_name,
        status="SENT",
        sent_date=today,
        response_due_date=due_date,
    )
    db.add(campaign)
    await db.flush()

    dispute_letter = DisputeLetter(
        campaign_id=campaign.id,
        letter_type=letter_type,
        content_markdown=letter_content,
    )
    db.add(dispute_letter)
    await db.commit()

    # Re-query campaign with letters loaded for response serialization
    stmt_res = (
        select(DisputeCampaign)
        .options(selectinload(DisputeCampaign.letters))
        .where(DisputeCampaign.id == campaign.id)
    )
    res_campaign = await db.execute(stmt_res)
    result_obj = res_campaign.scalar_one()

    return result_obj


@router.get("/campaigns", response_model=List[DisputeCampaignResponse], status_code=status.HTTP_200_OK)
async def get_user_dispute_campaigns(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DisputeCampaign)
        .options(selectinload(DisputeCampaign.letters))
        .where(DisputeCampaign.user_id == current_user.id)
        .order_by(DisputeCampaign.created_at.desc())
    )
    result = await db.execute(stmt)
    campaigns = result.scalars().all()
    return campaigns
