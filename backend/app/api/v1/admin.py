"""
Admin-only endpoints — user management, system stats, and system-wide crawls.
"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_admin
from app.core.database import get_db
from app.models.keyword import CrawlJob, KeywordAppResult, UserKeyword
from app.models.models import App, CrawlLog
from app.models.user import Plan, User
from app.schemas.auth import PlanOut, UserOut
from app.schemas.schemas import CrawlStatus

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas specific to admin endpoints
# ---------------------------------------------------------------------------

from pydantic import BaseModel


class PaginatedUsers(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminUserUpdate(BaseModel):
    plan_id: int | None = None
    role: str | None = None
    is_active: bool | None = None


class AdminStats(BaseModel):
    total_users: int
    total_keywords: int
    total_crawl_jobs: int
    total_apps: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users with pagination (admin only)."""
    query = select(User).options(selectinload(User.plan))

    if search:
        query = query.where(User.email.ilike(f"%{search}%"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(User.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedUsers(
        items=[UserOut.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's plan, role, or active status (admin only)."""
    result = await db.execute(
        select(User).options(selectinload(User.plan)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = body.model_dump(exclude_unset=True)

    # Validate plan_id if provided
    if "plan_id" in update_data:
        plan_result = await db.execute(
            select(Plan).where(Plan.id == update_data["plan_id"])
        )
        if not plan_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid plan_id")

    # Validate role if provided
    if "role" in update_data and update_data["role"] not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user, attribute_names=["plan"])
    return user


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get system-wide statistics (admin only)."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_keywords = (await db.execute(select(func.count(UserKeyword.id)))).scalar() or 0
    total_crawl_jobs = (await db.execute(select(func.count(CrawlJob.id)))).scalar() or 0
    total_apps = (await db.execute(select(func.count(App.id)))).scalar() or 0

    return AdminStats(
        total_users=total_users,
        total_keywords=total_keywords,
        total_crawl_jobs=total_crawl_jobs,
        total_apps=total_apps,
    )


@router.post("/crawl", response_model=CrawlStatus)
async def trigger_system_crawl(
    country: str = Query("US", max_length=5),
    category_id: int | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a system-wide crawl task (admin only).

    Enqueues a Celery task for crawling iTunes for the given country/category.
    """
    from app.tasks.crawl_tasks import crawl_all_categories_task, crawl_category_task
    from app.utils.constants import ITUNES_CATEGORIES

    if category_id:
        cat_name = ITUNES_CATEGORIES.get(category_id, "Unknown")
        crawl_category_task.delay(category_id, cat_name, country)
    else:
        crawl_all_categories_task.delay(country)

    # Create a pending log entry
    log = CrawlLog(
        source="itunes",
        country_code=country,
        category_id=category_id,
        status="pending",
        user_id=admin.id,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log
