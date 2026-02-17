"""
App endpoints — the core of the Worst Rated iOS Apps Index.

Supports:
  GET /apps              — Paginated list with filters and sorting
  GET /apps/{id}         — Single app detail
  GET /apps/{id}/history — Rating history for charts
  GET /apps/stats        — Index-wide statistics
"""

import json
import logging
import math
from enum import Enum

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy import select, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import limiter
from app.models.models import App, Category, Country, RatingHistory, CrawlLog
from app.schemas.schemas import (
    AppListItem, AppDetail, PaginatedApps, RatingHistoryItem,
    IndexStats,
)
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

CACHE_TTL = 300  # 5 minutes


class SortField(str, Enum):
    lowest_rating = "lowest_rating"
    lowest_weighted = "lowest_weighted"
    highest_rating = "highest_rating"
    most_reviews = "most_reviews"
    fewest_reviews = "fewest_reviews"
    name = "name"


@router.get("", response_model=PaginatedApps)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def list_apps(
    request: Request,
    sort: SortField = SortField.lowest_weighted,
    country: str | None = Query(None, max_length=5, description="Country code (e.g. US)"),
    category: str | None = Query(None, description="Category name"),
    min_reviews: int = Query(0, ge=0, description="Minimum number of reviews"),
    max_rating: float | None = Query(None, ge=0, le=5, description="Maximum average rating"),
    search: str | None = Query(None, max_length=200, description="Search app name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    List apps sorted by worst rating (default).

    Supports filtering by country, category, minimum reviews, and search.
    """
    # Try cache first
    redis = await get_redis()
    cache_key = f"apps:{sort}:{country}:{category}:{min_reviews}:{max_rating}:{search}:{page}:{page_size}"
    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedApps(**json.loads(cached))

    # Build query
    query = (
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
        .outerjoin(Category, App.category_id == Category.id)
        .join(Country, App.country_id == Country.id)
    )

    # Filters
    if country:
        query = query.where(Country.code == country.upper())
    if category:
        query = query.where(Category.name.ilike(f"%{category}%"))
    if min_reviews > 0:
        query = query.where(App.rating_count >= min_reviews)
    if max_rating is not None:
        query = query.where(App.average_rating <= max_rating)
    if search:
        query = query.where(App.name.ilike(f"%{search}%"))

    # Only include apps with ratings for weighted sorts
    if sort in (SortField.lowest_weighted, SortField.lowest_rating, SortField.highest_rating):
        query = query.where(App.average_rating.isnot(None))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sort
    sort_map = {
        SortField.lowest_weighted: asc(App.weighted_score),
        SortField.lowest_rating: asc(App.average_rating),
        SortField.highest_rating: desc(App.average_rating),
        SortField.most_reviews: desc(App.rating_count),
        SortField.fewest_reviews: asc(App.rating_count),
        SortField.name: asc(App.name),
    }
    query = query.order_by(sort_map[sort])

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = [
        AppListItem(
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
        )
        for row in rows
    ]

    response = PaginatedApps(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )

    # Cache result
    if redis:
        await redis.set(cache_key, response.model_dump_json(), ex=CACHE_TTL)

    return response


@router.get("/stats", response_model=IndexStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Get index-wide statistics."""
    total_apps = await db.execute(select(func.count(App.id)))
    total_countries = await db.execute(
        select(func.count(func.distinct(App.country_id)))
    )
    total_categories = await db.execute(select(func.count(Category.id)))

    last_crawl_result = await db.execute(
        select(CrawlLog.created_at)
        .where(CrawlLog.status == "completed")
        .order_by(desc(CrawlLog.created_at))
        .limit(1)
    )
    last_crawl = last_crawl_result.scalar_one_or_none()

    global_mean_result = await db.execute(
        select(func.avg(App.average_rating)).where(
            App.rating_count >= settings.WEIGHTED_SCORE_MIN_RATINGS,
            App.average_rating.isnot(None),
        )
    )
    global_mean = global_mean_result.scalar()

    return IndexStats(
        total_apps=total_apps.scalar() or 0,
        total_countries=total_countries.scalar() or 0,
        total_categories=total_categories.scalar() or 0,
        last_crawl=last_crawl,
        global_mean_rating=float(global_mean) if global_mean else None,
        min_rating_threshold=settings.WEIGHTED_SCORE_MIN_RATINGS,
    )


@router.get("/{app_id}", response_model=AppDetail)
async def get_app(app_id: int, db: AsyncSession = Depends(get_db)):
    """Get full details for a single app."""
    result = await db.execute(
        select(App)
        .options(selectinload(App.category), selectinload(App.country))
        .where(App.id == app_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    return app


@router.get("/{app_id}/history", response_model=list[RatingHistoryItem])
async def get_app_history(
    app_id: int,
    limit: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Get rating history for an app (for charts)."""
    result = await db.execute(
        select(RatingHistory)
        .where(RatingHistory.app_id == app_id)
        .order_by(desc(RatingHistory.snapshot_date))
        .limit(limit)
    )
    rows = result.scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="No history found for this app")
    return rows
