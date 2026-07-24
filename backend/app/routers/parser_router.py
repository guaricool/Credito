from datetime import datetime, date
from decimal import Decimal
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, CreditReport, Tradeline, BureauTradelineDetail
from app.schemas import CreditReportResponse
from app.auth import get_current_user
from app.parser import CreditReportParser

router = APIRouter(prefix="/api/v1/reports", tags=["Credit Reports"])

def parse_date_str(val: Any) -> Any:
    if isinstance(val, date):
        return val
    if isinstance(val, str) and val.strip():
        try:
            return datetime.strptime(val.strip(), "%Y-%m-%d").date()
        except ValueError:
            return None
    return None

@router.post("/upload", response_model=CreditReportResponse, status_code=status.HTTP_201_CREATED)
async def upload_credit_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        file_bytes = await file.read()
        parsed_data = CreditReportParser.parse_report(file_bytes, file.filename or "")
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to parse credit report: {str(e)}")

    report_date_val = parse_date_str(parsed_data.get("report_date")) or date.today()

    credit_report = CreditReport(
        user_id=current_user.id,
        source_provider=parsed_data.get("source_provider", "Uploaded Report"),
        report_date=report_date_val,
        raw_json_data=parsed_data
    )
    db.add(credit_report)
    await db.flush()

    tradelines_data = parsed_data.get("tradelines", [])
    for t in tradelines_data:
        date_opened_val = parse_date_str(t.get("date_opened"))
        tradeline = Tradeline(
            user_id=current_user.id,
            credit_report_id=credit_report.id,
            creditor_name=t.get("creditor_name", "Unknown Creditor"),
            account_number_masked=t.get("account_number_masked", "****"),
            account_type=t.get("account_type"),
            date_opened=date_opened_val
        )
        db.add(tradeline)
        await db.flush()

        bureaus_dict = t.get("bureaus", {})
        for bureau_name in ["Experian", "Equifax", "TransUnion"]:
            b_info = bureaus_dict.get(bureau_name)
            if b_info and isinstance(b_info, dict):
                cur_bal = Decimal(str(b_info.get("current_balance", 0.0)))
                past_due = Decimal(str(b_info.get("past_due_amount", 0.0)))
                dofd_val = parse_date_str(b_info.get("date_of_first_delinquency"))
                dlr_val = parse_date_str(b_info.get("date_last_reported"))

                bureau_detail = BureauTradelineDetail(
                    tradeline_id=tradeline.id,
                    bureau=bureau_name,
                    account_status=b_info.get("account_status"),
                    current_balance=cur_bal,
                    past_due_amount=past_due,
                    date_of_first_delinquency=dofd_val,
                    date_last_reported=dlr_val,
                    payment_history_24_months=b_info.get("payment_history_24_months"),
                    comments=b_info.get("comments")
                )
                db.add(bureau_detail)

    await db.commit()

    stmt = (
        select(CreditReport)
        .options(
            selectinload(CreditReport.tradelines)
            .selectinload(Tradeline.bureau_details),
            selectinload(CreditReport.tradelines)
            .selectinload(Tradeline.violations)
        )
        .where(CreditReport.id == credit_report.id)
    )
    result = await db.execute(stmt)
    full_report = result.scalar_one()

    return full_report
