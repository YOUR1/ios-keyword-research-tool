"""
Billing endpoints — plan listing and usage tracking.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import Plan, User
from app.schemas.auth import PlanOut
from app.schemas.billing import PlanListOut, UsageOut
from app.services.usage import get_crawls_today, get_keyword_count, get_results_count

router = APIRouter()


@router.get("/plans", response_model=PlanListOut)
async def list_plans(db: AsyncSession = Depends(get_db)):
    """List all active plans (public endpoint)."""
    result = await db.execute(
        select(Plan).where(Plan.is_active == True).order_by(Plan.price_cents_monthly.asc())  # noqa: E712
    )
    plans = result.scalars().all()
    return PlanListOut(plans=[PlanOut.model_validate(p) for p in plans])


@router.get("/usage", response_model=UsageOut)
async def get_usage(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current usage vs plan limits for the authenticated user."""
    keywords_used = await get_keyword_count(db, user.id)
    crawls_today = await get_crawls_today(db, user.id)
    results_stored = await get_results_count(db, user.id)

    return UsageOut(
        keywords_used=keywords_used,
        keywords_limit=user.plan.max_keywords,
        crawls_today=crawls_today,
        crawls_limit=user.plan.max_crawls_per_day,
        results_stored=results_stored,
        results_limit=user.plan.max_results_stored,
        plan=PlanOut.model_validate(user.plan),
    )
