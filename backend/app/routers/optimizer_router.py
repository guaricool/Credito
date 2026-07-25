from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.score_optimizer import ScoreOptimizerService

router = APIRouter(prefix="/api/v1/optimizer", tags=["Credit Score Optimization Engine"])

@router.get("/plan", response_model=Dict[str, Any])
async def get_score_optimization_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyzes user tradelines, revolving utilization, inquiries, and generates a personalized score optimization roadmap."""
    return await ScoreOptimizerService.generate_score_optimization_plan(db, current_user)
