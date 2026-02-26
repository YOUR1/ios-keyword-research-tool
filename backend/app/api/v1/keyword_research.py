"""
Keyword Research API endpoints.

Provides keyword analysis, metrics tracking, and suggestions.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.keyword import UserKeyword
from app.models.user import User
from app.schemas.keyword_research import (
    KeywordAnalysisResponse,
    KeywordMetricsResponse,
    KeywordMetricsHistory,
    KeywordMetricsHistoryItem,
    QuickAnalysisRequest,
    QuickAnalysisResponse,
    KeywordSuggestionsResponse,
    TopAppInfo,
)
from app.services.keyword_research import KeywordResearchService

router = APIRouter()


@router.post("/{keyword_id}/analyze", response_model=KeywordAnalysisResponse)
async def analyze_keyword(
    keyword_id: int,
    force_refresh: bool = Query(False, description="Force fresh API fetch"),
    proxy_url: str | None = Query(None, description="Optional proxy URL"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a tracked keyword and calculate popularity, difficulty, opportunity scores.

    Uses hybrid data strategy:
    - If keyword was crawled recently (< 24h): Uses existing database data
    - If data is stale or force_refresh=true: Fetches fresh from iTunes API

    Saves metrics snapshot to database.
    """
    # Get keyword (must belong to user)
    result = await db.execute(
        select(UserKeyword).where(
            UserKeyword.id == keyword_id,
            UserKeyword.user_id == user.id,
        )
    )
    keyword = result.scalar_one_or_none()
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    # Analyze keyword
    service = KeywordResearchService(db)
    metrics = await service.analyze_keyword(
        keyword,
        proxy_url=proxy_url,
        force_refresh=force_refresh,
    )

    # Save metrics snapshot
    await service.save_metrics(keyword, metrics)

    # Convert top_apps to TopAppInfo
    top_apps = [TopAppInfo(**app) for app in metrics.get("top_apps", [])]

    return KeywordAnalysisResponse(
        keyword_id=metrics["keyword_id"],
        term=metrics["term"],
        country_code=metrics["country_code"],
        popularity_score=metrics["popularity_score"],
        difficulty_score=metrics["difficulty_score"],
        opportunity_score=metrics["opportunity_score"],
        total_results=metrics["total_results"],
        hint_available=metrics["hint_available"],
        avg_top_10_rating_count=metrics.get("avg_top_10_rating_count"),
        avg_top_10_rating=metrics.get("avg_top_10_rating"),
        top_10_weighted_score_sum=metrics.get("top_10_weighted_score_sum"),
        top_apps=top_apps,
        related_hints=metrics.get("related_hints", []),
        data_source=metrics.get("data_source", "unknown"),
    )


@router.get("/{keyword_id}/metrics", response_model=KeywordMetricsResponse)
async def get_keyword_metrics(
    keyword_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest metrics snapshot for a keyword."""
    # Check keyword belongs to user
    result = await db.execute(
        select(UserKeyword).where(
            UserKeyword.id == keyword_id,
            UserKeyword.user_id == user.id,
        )
    )
    keyword = result.scalar_one_or_none()
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    service = KeywordResearchService(db)
    metrics = await service.get_latest_metrics(keyword_id)

    if not metrics:
        raise HTTPException(
            status_code=404,
            detail="No metrics found. Run analyze first."
        )

    return KeywordMetricsResponse.model_validate(metrics)


@router.get("/{keyword_id}/metrics/history", response_model=KeywordMetricsHistory)
async def get_keyword_metrics_history(
    keyword_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days of history"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get historical metrics for a keyword."""
    # Check keyword belongs to user
    result = await db.execute(
        select(UserKeyword).where(
            UserKeyword.id == keyword_id,
            UserKeyword.user_id == user.id,
        )
    )
    keyword = result.scalar_one_or_none()
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    service = KeywordResearchService(db)
    history = await service.get_metrics_history(keyword_id, days=days)

    items = [
        KeywordMetricsHistoryItem(
            snapshot_date=m.snapshot_date,
            popularity_score=m.popularity_score,
            difficulty_score=m.difficulty_score,
            opportunity_score=m.opportunity_score,
            total_results=m.total_results,
        )
        for m in history
    ]

    return KeywordMetricsHistory(
        keyword_id=keyword_id,
        term=keyword.term,
        days=days,
        items=items,
    )


@router.post("/quick-analyze", response_model=QuickAnalysisResponse)
async def quick_analyze_keyword(
    body: QuickAnalysisRequest,
    proxy_url: str | None = Query(None, description="Optional proxy URL"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze any keyword without tracking.

    Always fetches fresh data from iTunes API.
    Does not save metrics to database.
    """
    service = KeywordResearchService(db)
    metrics = await service.quick_analyze(
        term=body.term,
        country=body.country_code,
        proxy_url=proxy_url,
    )

    top_apps = [TopAppInfo(**app) for app in metrics.get("top_apps", [])]

    return QuickAnalysisResponse(
        term=metrics["term"],
        country_code=metrics["country_code"],
        popularity_score=metrics["popularity_score"],
        difficulty_score=metrics["difficulty_score"],
        opportunity_score=metrics["opportunity_score"],
        total_results=metrics["total_results"],
        hint_available=metrics["hint_available"],
        top_apps=top_apps,
        related_hints=metrics.get("related_hints", []),
    )


@router.get("/suggestions", response_model=KeywordSuggestionsResponse)
async def get_keyword_suggestions(
    term: str = Query(..., min_length=2, description="Search term"),
    country_code: str = Query("US", description="Two-letter country code"),
    proxy_url: str | None = Query(None, description="Optional proxy URL"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get related keyword suggestions from Apple's Search Hints API."""
    service = KeywordResearchService(db)
    suggestions = await service.get_suggestions(
        term=term,
        country=country_code,
        proxy_url=proxy_url,
    )

    return KeywordSuggestionsResponse(
        term=term,
        country_code=country_code,
        suggestions=suggestions,
    )
