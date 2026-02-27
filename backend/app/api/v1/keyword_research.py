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
    StoredAnalysisResponse,
    TopAppInfo,
    RelatedKeywordInfo,
    RelatedKeywordTopApp,
    AIKeywordExpansionResponse,
    AIExpandedKeyword,
)
from app.services.keyword_research import KeywordResearchService
from app.services.keyword_expansion import expand_user_keyword

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

    # Convert related_keywords to RelatedKeywordInfo (includes both Apple + AI)
    related_keywords = []
    for rk in metrics.get("related_keywords", []):
        related_keywords.append(RelatedKeywordInfo(
            term=rk["term"],
            popularity=rk["popularity"],
            competitiveness=rk["competitiveness"],
            top_apps=[RelatedKeywordTopApp(**app) for app in rk.get("top_apps", [])],
            source=rk.get("source", "apple"),
        ))

    # Convert AI-expanded keywords to RelatedKeywordInfo
    ai_expanded_keywords = []
    for aik in metrics.get("ai_expanded_keywords", []):
        ai_expanded_keywords.append(RelatedKeywordInfo(
            term=aik["term"],
            popularity=aik["popularity"],
            competitiveness=aik["competitiveness"],
            top_apps=[RelatedKeywordTopApp(**app) for app in aik.get("top_apps", [])],
            source="ai",
        ))

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
        title_match_count=metrics.get("title_match_count", 0),
        subtitle_match_count=metrics.get("subtitle_match_count", 0),
        top_apps=top_apps,
        related_hints=metrics.get("related_hints", []),
        related_keywords=related_keywords,
        ai_expanded_keywords=ai_expanded_keywords,
        data_source=metrics.get("data_source", "unknown"),
    )


@router.get("/{keyword_id}/analysis", response_model=StoredAnalysisResponse)
async def get_stored_analysis(
    keyword_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the stored analysis data for a keyword (read-only, no API calls).

    Returns the latest analysis snapshot including:
    - Scores (popularity, difficulty, opportunity)
    - Top apps with match info
    - Related keywords with metrics
    - Related hints

    Returns 404 if no analysis has been performed yet.
    """
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

    # Get latest metrics with raw_data
    service = KeywordResearchService(db)
    metrics = await service.get_latest_metrics(keyword_id)

    if not metrics:
        raise HTTPException(
            status_code=404,
            detail="No analysis found. Analysis will be available after the keyword is set up."
        )

    # Extract data from raw_data JSONB field
    raw_data = metrics.raw_data or {}

    # Convert top_apps from raw_data
    top_apps = [TopAppInfo(**app) for app in raw_data.get("top_apps", [])]

    # Convert related_keywords from raw_data (includes source field)
    related_keywords = []
    for rk in raw_data.get("related_keywords", []):
        related_keywords.append(RelatedKeywordInfo(
            term=rk["term"],
            popularity=rk["popularity"],
            competitiveness=rk["competitiveness"],
            top_apps=[RelatedKeywordTopApp(**app) for app in rk.get("top_apps", [])],
            source=rk.get("source", "apple"),
        ))

    # Extract AI expanded keywords from raw_data (with metrics)
    ai_expanded_keywords = []
    for aik in raw_data.get("ai_expanded_keywords", []):
        ai_expanded_keywords.append(RelatedKeywordInfo(
            term=aik["term"],
            popularity=aik.get("popularity", 0),
            competitiveness=aik.get("competitiveness", 0),
            top_apps=[RelatedKeywordTopApp(**app) for app in aik.get("top_apps", [])],
            source="ai",
        ))

    return StoredAnalysisResponse(
        keyword_id=keyword.id,
        term=keyword.term,
        country_code=keyword.country_code,
        popularity_score=metrics.popularity_score,
        difficulty_score=metrics.difficulty_score,
        opportunity_score=metrics.opportunity_score,
        total_results=metrics.total_results,
        hint_available=metrics.hint_available,
        avg_top_10_rating_count=metrics.avg_top_10_rating_count,
        avg_top_10_rating=metrics.avg_top_10_rating,
        top_10_weighted_score_sum=metrics.top_10_weighted_score_sum,
        title_match_count=raw_data.get("title_match_count", 0),
        subtitle_match_count=raw_data.get("subtitle_match_count", 0),
        top_apps=top_apps,
        related_hints=raw_data.get("related_hints", []),
        related_keywords=related_keywords,
        ai_expanded_keywords=ai_expanded_keywords,
        data_source=raw_data.get("data_source", "database"),
        snapshot_date=metrics.snapshot_date,
        created_at=metrics.created_at,
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


@router.post("/{keyword_id}/expand-ai", response_model=AIKeywordExpansionResponse)
async def expand_keyword_with_ai(
    keyword_id: int,
    count: int = Query(15, ge=5, le=30, description="Number of keywords to generate"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Expand a keyword using AI to generate semantically related keywords.

    Uses OpenAI to generate related search terms based on the keyword's
    context and iOS App Store relevance.

    Returns AI-generated keywords that can be added to the project.
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

    # Get category name if available for better context
    category_name = None
    if keyword.category_id:
        from app.utils.constants import ITUNES_CATEGORIES
        category_name = ITUNES_CATEGORIES.get(keyword.category_id)

    # Expand using AI
    expanded_terms = await expand_user_keyword(
        keyword=keyword.term,
        category_name=category_name,
        count=count,
        use_cache=True,
    )

    # Convert to response format, excluding the original term
    expanded_keywords = [
        AIExpandedKeyword(term=term, source="ai")
        for term in expanded_terms
        if term.lower() != keyword.term.lower()
    ]

    # Store AI expanded keywords in the latest metrics raw_data
    service = KeywordResearchService(db)
    metrics = await service.get_latest_metrics(keyword.id)
    if metrics:
        raw_data = metrics.raw_data or {}
        raw_data["ai_expanded_keywords"] = [
            {"term": k.term, "source": k.source} for k in expanded_keywords
        ]
        metrics.raw_data = raw_data
        await db.commit()

    return AIKeywordExpansionResponse(
        keyword_id=keyword.id,
        term=keyword.term,
        expanded_keywords=expanded_keywords,
        total_count=len(expanded_keywords),
    )
