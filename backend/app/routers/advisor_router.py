from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.advisor_engine import AdvisorEngineService

router = APIRouter(prefix="/api/v1/advisor", tags=["AI Credit & Privacy Advisor Strategy Engine"])

@router.get("/recommendations", response_model=Dict[str, Any])
async def get_advisor_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyzes complete user profile (reports, FCRA violations, dark web breaches, data brokers) and returns prioritized statutory action plan."""
    return await AdvisorEngineService.generate_user_recommendations(db, current_user)
