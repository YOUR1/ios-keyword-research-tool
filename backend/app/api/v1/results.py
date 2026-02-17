"""
Tenant-scoped results — apps found by user's keywords.
"""

import math
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.keyword import CrawlJob, KeywordAppResult, UserKeyword
from app.models.models import App, Category, Country
from app.models.user import User
from app.schemas.results import PaginatedResults, ResultItem, ResultStats

router = APIRouter()


@router.get("", response_model=PaginatedResults)
async def list_results(
    keyword_id: int | None = Query(None, description="Filter by keyword"),
    search: str | None = Query(None, max_length=200),
    category: str | None = Query(None, description="Filter by category name"),
    country: str | None = Query(None, description="Filter by country code"),
    min_reviews: int | None = Query(None, ge=0, description="Minimum rating count"),
    max_rating: float | None = Query(None, ge=0, le=5, description="Maximum average rating"),
    sort: str = Query("lowest_weighted", description="Sort field"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all apps found by the user's keywords, deduplicated."""
    # Step 1: Get distinct app IDs matching the filters
    app_ids_q = (
        select(distinct(KeywordAppResult.app_id))
        .join(UserKeyword, UserKeyword.id == KeywordAppResult.keyword_id)
        .where(UserKeyword.user_id == user.id)
    )
    if keyword_id:
        app_ids_q = app_ids_q.where(KeywordAppResult.keyword_id == keyword_id)
    if search:
        app_ids_q = app_ids_q.join(App, App.id == KeywordAppResult.app_id).where(
            App.name.ilike(f"%{search}%")
        )

    # Count total (will be refined after additional filters below)
    # Step 2: Build paginated apps query with filters
    apps_q = (
        select(
            App.id,
            App.itunes_id,
            App.name,
            App.developer,
            Category.name.label("category_name"),
            Country.code.label("country_code"),
            App.average_rating,
            App.rating_count,
            App.weighted_score,
            App.price,
            App.currency,
            App.icon_url,
            App.store_url,
            App.current_version,
        )
        .where(App.id.in_(app_ids_q))
        .outerjoin(Category, App.category_id == Category.id)
        .join(Country, App.country_id == Country.id)
    )

    # Apply additional filters
    if category:
        apps_q = apps_q.where(Category.name == category)
    if country:
        apps_q = apps_q.where(Country.code == country)
    if min_reviews is not None:
        apps_q = apps_q.where(App.rating_count >= min_reviews)
    if max_rating is not None:
        apps_q = apps_q.where(App.average_rating <= max_rating)

    # Count total after all filters
    count_q = select(func.count()).select_from(apps_q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Apply sort
    sort_map = {
        "lowest_weighted": App.weighted_score.asc().nullslast(),
        "lowest_rating": App.average_rating.asc().nullslast(),
        "highest_rating": App.average_rating.desc().nullsfirst(),
        "most_reviews": App.rating_count.desc(),
        "fewest_reviews": App.rating_count.asc(),
        "name": App.name.asc(),
    }
    order = sort_map.get(sort, App.weighted_score.asc().nullslast())
    apps_q = apps_q.order_by(order)

    apps_q = apps_q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(apps_q)).all()

    if not rows:
        return PaginatedResults(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total > 0 else 0,
        )

    # Step 3: Fetch keyword associations for these apps (in Python, dialect-agnostic)
    fetched_ids = [row.id for row in rows]
    kw_q = (
        select(KeywordAppResult.app_id, UserKeyword.term)
        .join(UserKeyword, UserKeyword.id == KeywordAppResult.keyword_id)
        .where(
            KeywordAppResult.app_id.in_(fetched_ids),
            UserKeyword.user_id == user.id,
        )
    )
    kw_rows = (await db.execute(kw_q)).all()

    app_keywords: dict[int, list[str]] = defaultdict(list)
    for kw_row in kw_rows:
        term = kw_row.term
        if term not in app_keywords[kw_row.app_id]:
            app_keywords[kw_row.app_id].append(term)

    items = [
        ResultItem(
            id=row.id,
            itunes_id=row.itunes_id,
            name=row.name,
            developer=row.developer,
            category_name=row.category_name,
            country_code=row.country_code,
            average_rating=row.average_rating,
            rating_count=row.rating_count,
            weighted_score=row.weighted_score,
            price=row.price,
            currency=row.currency,
            icon_url=row.icon_url,
            store_url=row.store_url,
            current_version=row.current_version,
            keywords=app_keywords.get(row.id, []),
        )
        for row in rows
    ]

    return PaginatedResults(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/stats", response_model=ResultStats)
async def get_result_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_apps = await db.execute(
        select(func.count(distinct(KeywordAppResult.app_id)))
        .join(UserKeyword, UserKeyword.id == KeywordAppResult.keyword_id)
        .where(UserKeyword.user_id == user.id)
    )

    total_keywords = await db.execute(
        select(func.count(UserKeyword.id)).where(UserKeyword.user_id == user.id)
    )

    active_keywords = await db.execute(
        select(func.count(UserKeyword.id)).where(
            UserKeyword.user_id == user.id,
            UserKeyword.is_active == True,  # noqa: E712
        )
    )

    total_jobs = await db.execute(
        select(func.count(CrawlJob.id)).where(CrawlJob.user_id == user.id)
    )

    last_crawl = await db.execute(
        select(func.max(CrawlJob.completed_at)).where(
            CrawlJob.user_id == user.id,
            CrawlJob.status == "completed",
        )
    )
    last = last_crawl.scalar()

    return ResultStats(
        total_apps=total_apps.scalar() or 0,
        total_keywords=total_keywords.scalar() or 0,
        active_keywords=active_keywords.scalar() or 0,
        total_crawl_jobs=total_jobs.scalar() or 0,
        last_crawl_at=last.isoformat() if last else None,
    )
