"""
Reviews endpoint — customer reviews for individual apps.

GET /apps/{app_id}/reviews — Paginated reviews with sort, language filter, and summary.
"""

import json
import logging
import math
from enum import Enum

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy import select, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import limiter
from app.core.config import settings
from app.models.models import App, Review
from app.schemas.schemas import ReviewOut, ReviewSummary, PaginatedReviews

logger = logging.getLogger(__name__)
router = APIRouter()

CACHE_TTL = 300  # 5 minutes


class ReviewSort(str, Enum):
    newest = "newest"
    oldest = "oldest"
    lowest = "lowest"
    highest = "highest"


@router.get("/{app_id}/reviews", response_model=PaginatedReviews)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def list_reviews(
    request: Request,
    app_id: int,
    sort: ReviewSort = ReviewSort.newest,
    language: str | None = Query(None, max_length=10, description="Filter by language"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List reviews for an app with pagination, sorting, and language filter."""
    # Try cache first
    redis = await get_redis()
    cache_key = f"reviews:{app_id}:{sort}:{language}:{page}:{page_size}"
    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedReviews(**json.loads(cached))

    # Verify app exists
    app_result = await db.execute(select(App).where(App.id == app_id))
    app = app_result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # Build query
    query = select(Review).where(Review.app_id == app_id)

    if language:
        query = query.where(Review.language == language)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sort
    sort_map = {
        ReviewSort.newest: desc(Review.review_date),
        ReviewSort.oldest: asc(Review.review_date),
        ReviewSort.lowest: asc(Review.rating),
        ReviewSort.highest: desc(Review.rating),
    }
    query = query.order_by(sort_map[sort])

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    reviews = result.scalars().all()

    # Build summary
    rating_distribution = app.rating_distribution or {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}

    # Compute average from distribution
    total_reviews = sum(rating_distribution.values())
    avg_review_rating = None
    if total_reviews > 0:
        weighted_sum = sum(int(k) * v for k, v in rating_distribution.items())
        avg_review_rating = round(weighted_sum / total_reviews, 2)

    summary = ReviewSummary(
        total_reviews=total_reviews,
        rating_distribution=rating_distribution,
        average_review_rating=avg_review_rating,
    )

    response = PaginatedReviews(
        items=[ReviewOut.model_validate(r) for r in reviews],
        summary=summary,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )

    # Cache result
    if redis:
        await redis.set(cache_key, response.model_dump_json(), ex=CACHE_TTL)

    return response
