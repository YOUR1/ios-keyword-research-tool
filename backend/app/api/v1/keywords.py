"""
Keyword CRUD endpoints — the core of multi-tenant crawling.
"""

import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.keyword import CrawlJob, KeywordAppResult, UserKeyword
from app.models.user import User
from app.schemas.keywords import (
    CrawlJobOut,
    KeywordCreate,
    KeywordDetail,
    KeywordOut,
    KeywordUpdate,
    PaginatedKeywords,
)
from app.services.usage import check_crawl_quota, check_keyword_quota
from app.services.keyword_expansion import expand_user_keyword
from app.models.models import Category

router = APIRouter()


def compute_next_run(frequency: str) -> datetime | None:
    now = datetime.now(timezone.utc)
    if frequency == "daily":
        return now + timedelta(days=1)
    elif frequency == "weekly":
        return now + timedelta(weeks=1)
    return None  # manual


@router.get("", response_model=PaginatedKeywords)
async def list_keywords(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(UserKeyword).where(UserKeyword.user_id == user.id)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(UserKeyword.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedKeywords(
        items=[KeywordOut.model_validate(k) for k in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=KeywordOut, status_code=201)
async def create_keyword(
    body: KeywordCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await check_keyword_quota(db, user):
        raise HTTPException(
            status_code=403,
            detail=f"Keyword limit reached ({user.plan.max_keywords}). Upgrade your plan.",
        )

    # Check for duplicates
    existing = await db.execute(
        select(UserKeyword).where(
            UserKeyword.user_id == user.id,
            UserKeyword.term == body.term,
            UserKeyword.country_code == body.country_code,
            UserKeyword.category_id == body.category_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Keyword already exists")

    # Get category name if category_id is provided
    category_name = None
    if body.category_id:
        cat_result = await db.execute(
            select(Category).where(Category.id == body.category_id)
        )
        category = cat_result.scalar_one_or_none()
        if category:
            category_name = category.name

    # Auto-expand keywords if expansion is enabled
    sub_keywords = None
    if body.expansion_enabled:
        expanded = await expand_user_keyword(
            body.term,
            category_name=category_name,
            use_cache=True,
        )
        # Remove the original term from sub_keywords (it's the main term)
        sub_keywords = [k for k in expanded if k.lower() != body.term.lower()]

    keyword = UserKeyword(
        user_id=user.id,
        term=body.term,
        country_code=body.country_code,
        category_id=body.category_id,
        crawl_frequency=body.crawl_frequency,
        expansion_enabled=body.expansion_enabled,
        sub_keywords=sub_keywords,
        next_run_at=compute_next_run(body.crawl_frequency),
    )
    db.add(keyword)
    await db.flush()
    await db.refresh(keyword)
    return keyword


@router.get("/{keyword_id}", response_model=KeywordDetail)
async def get_keyword(
    keyword_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserKeyword).where(
            UserKeyword.id == keyword_id,
            UserKeyword.user_id == user.id,
        )
    )
    keyword = result.scalar_one_or_none()
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    # Get counts
    apps_count = await db.execute(
        select(func.count(KeywordAppResult.id)).where(
            KeywordAppResult.keyword_id == keyword.id
        )
    )
    jobs_count = await db.execute(
        select(func.count(CrawlJob.id)).where(
            CrawlJob.keyword_id == keyword.id
        )
    )

    detail = KeywordDetail.model_validate(keyword)
    detail.total_apps_found = apps_count.scalar() or 0
    detail.total_crawl_jobs = jobs_count.scalar() or 0
    return detail


@router.patch("/{keyword_id}", response_model=KeywordOut)
async def update_keyword(
    keyword_id: int,
    body: KeywordUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserKeyword).where(
            UserKeyword.id == keyword_id,
            UserKeyword.user_id == user.id,
        )
    )
    keyword = result.scalar_one_or_none()
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(keyword, field, value)

    if "crawl_frequency" in update_data:
        keyword.next_run_at = compute_next_run(keyword.crawl_frequency)

    await db.flush()
    await db.refresh(keyword)
    return keyword


@router.delete("/{keyword_id}", status_code=204)
async def delete_keyword(
    keyword_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserKeyword).where(
            UserKeyword.id == keyword_id,
            UserKeyword.user_id == user.id,
        )
    )
    keyword = result.scalar_one_or_none()
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    await db.delete(keyword)
    await db.commit()


@router.post("/{keyword_id}/crawl", response_model=CrawlJobOut, status_code=202)
async def trigger_keyword_crawl(
    keyword_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserKeyword).where(
            UserKeyword.id == keyword_id,
            UserKeyword.user_id == user.id,
        )
    )
    keyword = result.scalar_one_or_none()
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    if not await check_crawl_quota(db, user):
        raise HTTPException(
            status_code=403,
            detail=f"Daily crawl limit reached ({user.plan.max_crawls_per_day}). Upgrade your plan.",
        )

    job = CrawlJob(
        keyword_id=keyword.id,
        user_id=user.id,
        status="pending",
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)

    # Enqueue Celery task (import here to avoid circular imports)
    try:
        from app.tasks.keyword_tasks import crawl_keyword_task
        result = crawl_keyword_task.delay(job.id)
        job.celery_task_id = result.id
    except Exception:
        pass  # Celery may not be running in dev/test

    return job


@router.post("/{keyword_id}/expand", response_model=KeywordOut)
async def regenerate_sub_keywords(
    keyword_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate sub-keywords using AI expansion."""
    result = await db.execute(
        select(UserKeyword).where(
            UserKeyword.id == keyword_id,
            UserKeyword.user_id == user.id,
        )
    )
    keyword = result.scalar_one_or_none()
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    # Get category name if available
    category_name = None
    if keyword.category_id:
        cat_result = await db.execute(
            select(Category).where(Category.id == keyword.category_id)
        )
        category = cat_result.scalar_one_or_none()
        if category:
            category_name = category.name

    # Expand keywords (bypass cache to get fresh results)
    expanded = await expand_user_keyword(
        keyword.term,
        category_name=category_name,
        use_cache=False,
    )
    # Remove the original term from sub_keywords
    sub_keywords = [k for k in expanded if k.lower() != keyword.term.lower()]

    keyword.sub_keywords = sub_keywords
    keyword.expansion_enabled = True
    await db.flush()
    await db.refresh(keyword)
    return keyword
