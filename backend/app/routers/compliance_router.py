from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, CreditReport, Tradeline, ComplianceViolation
from app.schemas import ComplianceViolationResponse
from app.auth import get_current_user
from app.compliance import ComplianceAnalyzer

router = APIRouter(prefix="/api/v1/compliance", tags=["Compliance"])

@router.post("/audit/{report_id}", response_model=List[ComplianceViolationResponse], status_code=status.HTTP_200_OK)
async def audit_credit_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CreditReport)
        .options(
            selectinload(CreditReport.tradelines).selectinload(Tradeline.bureau_details)
        )
        .where(CreditReport.id == report_id, CreditReport.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credit report not found or does not belong to user.",
        )

    analyzer = ComplianceAnalyzer()
    violations = analyzer.analyze_report(report.tradelines)

    for v in violations:
        db.add(v)

    await db.commit()

    # Re-query or refresh if needed to have valid IDs populated
    for v in violations:
        await db.refresh(v)

    return violations

@router.get("/violations", response_model=List[ComplianceViolationResponse], status_code=status.HTTP_200_OK)
async def get_user_compliance_violations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ComplianceViolation)
        .join(Tradeline, ComplianceViolation.tradeline_id == Tradeline.id)
        .where(Tradeline.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    violations = result.scalars().all()
    return violations
