"""
Discover endpoints — keyword suggestions and trending apps.

Proxies Apple's Search Hints API and RSS Top Charts feed
with Redis caching and optional proxy support.
"""

import json
import logging

from fastapi import APIRouter, Depends, Query, Request

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.redis import get_redis
from app.core.security import limiter
from app.models.user import User
from app.schemas.discover import (
    SearchSuggestion,
    SearchSuggestionsResponse,
    TrendingApp,
    TrendingResponse,
)
from app.services.itunes import itunes_client

logger = logging.getLogger(__name__)
router = APIRouter()

SUGGESTIONS_CACHE_TTL = 60  # 1 minute
TRENDING_CACHE_TTL = 1800  # 30 minutes

VALID_CHARTS = {"top-free", "top-paid", "top-grossing"}


def _get_proxy_url() -> str | None:
    """Build a proxy URL if proxies are enabled."""
    if not settings.PROXY_ENABLED:
        return None
    if settings.PROXY_PRIMARY_PROVIDER == "iproyal" and settings.IPROYAL_USER:
        return (
            f"http://{settings.IPROYAL_USER}:{settings.IPROYAL_PASS}"
            f"@geo.iproyal.com:12321"
        )
    if settings.PROXY_PRIMARY_PROVIDER == "brightdata" and settings.BRIGHTDATA_CUSTOMER_ID:
        return (
            f"http://{settings.BRIGHTDATA_CUSTOMER_ID}-zone-{settings.BRIGHTDATA_ZONE}"
            f":{settings.BRIGHTDATA_PASS}@brd.superproxy.io:22225"
        )
    return None


@router.get("/suggestions", response_model=SearchSuggestionsResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def get_suggestions(
    request: Request,
    term: str = Query(..., min_length=2, max_length=100, description="Search term"),
    country: str = Query("US", max_length=5, description="Country code"),
    user: User = Depends(get_current_user),
):
    """Get keyword autocomplete suggestions from Apple."""
    redis = await get_redis()
    cache_key = f"discover:suggestions:{term.lower()}:{country.upper()}"

    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return SearchSuggestionsResponse(**json.loads(cached))

    proxy_url = _get_proxy_url()
    hints = await itunes_client.search_hints(
        term=term, country=country.upper(), proxy_url=proxy_url
    )

    response = SearchSuggestionsResponse(
        term=term,
        country=country.upper(),
        suggestions=[SearchSuggestion(term=h) for h in hints],
    )

    if redis:
        await redis.set(cache_key, response.model_dump_json(), ex=SUGGESTIONS_CACHE_TTL)

    return response


@router.get("/trending", response_model=TrendingResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def get_trending(
    request: Request,
    country: str = Query("US", max_length=5, description="Country code"),
    limit: int = Query(25, ge=1, le=200, description="Number of apps"),
    chart: str = Query("top-free", description="Chart type"),
    user: User = Depends(get_current_user),
):
    """Get trending apps from Apple's top charts."""
    if chart not in VALID_CHARTS:
        chart = "top-free"

    redis = await get_redis()
    cache_key = f"discover:trending:{country.upper()}:{chart}:{limit}"

    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return TrendingResponse(**json.loads(cached))

    proxy_url = _get_proxy_url()
    raw_apps = await itunes_client.top_charts(
        country=country.upper(),
        limit=limit,
        chart=chart,
        proxy_url=proxy_url,
    )

    apps = [
        TrendingApp(
            itunes_id=app.get("id", ""),
            name=app.get("name", "Unknown"),
            developer=app.get("artistName"),
            icon_url=app.get("artworkUrl100"),
            genres=[g.get("name", "") for g in app.get("genres", [])],
            store_url=app.get("url"),
        )
        for app in raw_apps
    ]

    response = TrendingResponse(
        country=country.upper(),
        chart=chart,
        apps=apps,
        count=len(apps),
    )

    if redis:
        await redis.set(cache_key, response.model_dump_json(), ex=TRENDING_CACHE_TTL)

    return response
