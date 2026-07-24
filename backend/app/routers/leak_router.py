import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user
from app.models import User, DataLeak, DataBroker, OptOutRequest
from app.schemas import (
    DataLeakResponse,
    DataBrokerResponse,
    OptOutRequestResponse,
    OptOutTriggerRequest,
    FCRA605BBlockRequest,
)
from app.leak_agent import LeakAgentService

router = APIRouter(prefix="/api/v1/privacy", tags=["Privacy & Leak Defense Agent"])

@router.post("/scan", response_model=Dict[str, Any])
async def scan_user_privacy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Triggers an automated dark web breach scan and seeds data broker removal tracking."""
    result = await LeakAgentService.scan_user_privacy(db, current_user)
    return result

@router.get("/leaks", response_model=List[DataLeakResponse])
async def get_user_leaks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns detected dark web breaches for the current user."""
    # Ensure initialized
    await LeakAgentService.scan_user_privacy(db, current_user)

    stmt = select(DataLeak).where(DataLeak.user_id == current_user.id).order_by(DataLeak.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())

@router.get("/brokers", response_model=List[OptOutRequestResponse])
async def get_data_broker_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns active US Data Broker removal opt-out requests for the user."""
    await LeakAgentService.scan_user_privacy(db, current_user)

    stmt = (
        select(OptOutRequest)
        .where(OptOutRequest.user_id == current_user.id)
        .options(selectinload(OptOutRequest.broker))
        .order_by(OptOutRequest.created_at.desc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())

@router.post("/opt-out", response_model=List[OptOutRequestResponse])
async def trigger_data_broker_opt_out(
    payload: OptOutTriggerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submits automated CCPA / CPRA opt-out deletion requests to specified data brokers."""
    updated_requests = await LeakAgentService.trigger_opt_out(db, current_user, payload.broker_ids)

    stmt = (
        select(OptOutRequest)
        .where(OptOutRequest.user_id == current_user.id)
        .options(selectinload(OptOutRequest.broker))
        .order_by(OptOutRequest.created_at.desc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())

@router.post("/fcra-605b", response_model=Dict[str, str])
async def generate_fcra_605b_block(
    payload: FCRA605BBlockRequest,
    current_user: User = Depends(get_current_user),
):
    """Generates statutory 4-day Identity Theft Deletion Affidavit under 15 U.S.C. § 1681c-2 (FCRA § 605B)."""
    if not payload.fraudulent_tradelines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one fraudulent tradeline must be identified for FCRA Section 605B blocking.",
        )

    content_markdown = LeakAgentService.generate_fcra_605b_blocking_affidavit(
        user=current_user,
        bureau=payload.bureau,
        fraudulent_tradelines=payload.fraudulent_tradelines,
        police_report_number=payload.police_report_or_affidavit_number or "FTC-IDENTITY-THEFT-AFFIDAVIT-2026",
        affidavit_date=payload.ftc_affidavit_date,
    )

    return {
        "bureau": payload.bureau,
        "citation": "15 U.S.C. § 1681c-2 (FCRA Section 605B)",
        "statutory_deadline": "4 Business Days",
        "content_markdown": content_markdown,
    }
