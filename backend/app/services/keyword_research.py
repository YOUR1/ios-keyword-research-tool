"""
Keyword Research Service.

Estimates popularity, difficulty, and opportunity scores for keywords
using iTunes Search API data and existing crawl results.
"""

import logging
import math
from datetime import datetime, date, timedelta
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.keyword import UserKeyword, KeywordAppResult, KeywordMetrics
from app.models.models import App
from app.services.itunes import itunes_client, ITunesClient
from app.services.scoring import compute_weighted_score, get_global_mean_rating

logger = logging.getLogger(__name__)

# Constants for scoring
MAX_RESULTS_FOR_SCORING = 200  # iTunes API max
TOP_N_APPS = 10  # Number of top apps to analyze


def check_keyword_in_text(keyword: str, text: str | None) -> bool:
    """Check if all words of the keyword appear in the text (case-insensitive)."""
    if not text:
        return False
    text_lower = text.lower()
    keyword_words = keyword.lower().split()
    return all(word in text_lower for word in keyword_words)


def analyze_app_keyword_match(
    app: dict,
    keyword: str,
) -> dict:
    """
    Analyze if keyword appears in app title/subtitle.

    Returns dict with match info:
    - title_match: bool
    - subtitle_match: bool
    """
    name = app.get("name", "")

    # Get subtitle from raw_json if available
    raw_json = app.get("raw_json") or {}
    subtitle = raw_json.get("subtitle", "")

    return {
        "title_match": check_keyword_in_text(keyword, name),
        "subtitle_match": check_keyword_in_text(keyword, subtitle),
    }


def calculate_popularity_score(
    total_results: int,
    hint_available: bool,
    avg_rating_count: float | None,
) -> float:
    """
    Calculate popularity score (0-100).

    Formula:
    popularity = (results_score * 0.3 + hint_score * 0.2 + rating_count_score * 0.5) * 100
    - results_score = min(total_results / 200, 1.0)
    - hint_score = 1.0 if Apple recognizes keyword, else 0.0
    - rating_count_score = min(log10(avg_rating_count + 1) / 6, 1.0)
    """
    results_score = min(total_results / MAX_RESULTS_FOR_SCORING, 1.0)
    hint_score = 1.0 if hint_available else 0.0

    if avg_rating_count and avg_rating_count > 0:
        rating_count_score = min(math.log10(avg_rating_count + 1) / 6.0, 1.0)
    else:
        rating_count_score = 0.0

    popularity = (
        results_score * 0.3
        + hint_score * 0.2
        + rating_count_score * 0.5
    ) * 100

    return round(popularity, 2)


def calculate_difficulty_score(
    total_results: int,
    avg_weighted_score: float | None,
    avg_rating_count: float | None,
    title_match_ratio: float = 0.0,
) -> float:
    """
    Calculate difficulty score (0-100).

    Formula:
    difficulty = (count_score * 0.15 + ws_score * 0.25 + rc_score * 0.30 + title_score * 0.30) * 100
    - count_score = min(total_results / 200, 1.0)
    - ws_score = avg(top_10_weighted_scores) / 5.0
    - rc_score = min(log10(avg_rating_count + 1) / 6, 1.0)
    - title_score = ratio of top 10 apps with keyword in title (0-1)
    """
    count_score = min(total_results / MAX_RESULTS_FOR_SCORING, 1.0)

    if avg_weighted_score and avg_weighted_score > 0:
        ws_score = min(avg_weighted_score / 5.0, 1.0)
    else:
        ws_score = 0.0

    if avg_rating_count and avg_rating_count > 0:
        rc_score = min(math.log10(avg_rating_count + 1) / 6.0, 1.0)
    else:
        rc_score = 0.0

    difficulty = (
        count_score * 0.15
        + ws_score * 0.25
        + rc_score * 0.30
        + title_match_ratio * 0.30
    ) * 100

    return round(difficulty, 2)


def calculate_opportunity_score(
    popularity: float,
    difficulty: float,
) -> float:
    """
    Calculate opportunity score (0-100).

    Formula:
    opportunity = popularity * (1 - difficulty/100) * adjustment_factor

    Higher popularity + lower difficulty = better opportunity.
    """
    if difficulty >= 100:
        return 0.0

    # Adjustment factor to normalize score distribution
    adjustment_factor = 1.2

    opportunity = popularity * (1 - difficulty / 100) * adjustment_factor
    return round(min(opportunity, 100.0), 2)


class KeywordResearchService:
    """Service for analyzing keyword metrics and competition."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.itunes_client = itunes_client

    async def analyze_keyword(
        self,
        keyword: UserKeyword,
        proxy_url: str | None = None,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        """
        Analyze a tracked keyword and calculate metrics.

        Uses hybrid data strategy:
        1. If keyword was crawled recently (< 24h) -> Use existing DB data
        2. If data is stale or force_refresh -> Fetch fresh from iTunes API

        Returns dict with metrics, top_apps, and related_hints.
        """
        use_db_data = False

        if not force_refresh and keyword.last_crawled_at:
            hours_since_crawl = (
                datetime.utcnow() - keyword.last_crawled_at.replace(tzinfo=None)
            ).total_seconds() / 3600
            if hours_since_crawl < 24:
                use_db_data = True
                logger.info(f"Using cached DB data for keyword '{keyword.term}'")

        if use_db_data:
            apps_data = await self._get_apps_from_db(keyword.id)
            total_results = len(apps_data)
        else:
            apps_data = await self._get_apps_from_api(
                keyword.term, keyword.country_code, proxy_url
            )
            total_results = len(apps_data)

        # Get related hints from Apple
        try:
            related_hints = await self.itunes_client.search_hints(
                keyword.term, keyword.country_code, proxy_url=proxy_url
            )
            # Check if the keyword itself appears in hints (Apple recognizes it)
            hint_available = any(
                keyword.term.lower() in hint.lower()
                for hint in related_hints
            )
        except Exception as e:
            logger.warning(f"Failed to get search hints: {e}")
            related_hints = []
            hint_available = False

        # Get top 10 apps for analysis
        top_apps = apps_data[:TOP_N_APPS]

        # Calculate metrics from top apps
        avg_rating_count = None
        avg_rating = None
        avg_weighted_score = None
        title_match_count = 0
        subtitle_match_count = 0

        if top_apps:
            rating_counts = [a.get("rating_count", 0) or 0 for a in top_apps]
            ratings = [a.get("average_rating") for a in top_apps if a.get("average_rating")]
            weighted_scores = [a.get("weighted_score") for a in top_apps if a.get("weighted_score")]

            if rating_counts:
                avg_rating_count = sum(rating_counts) / len(rating_counts)
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
            if weighted_scores:
                avg_weighted_score = sum(weighted_scores) / len(weighted_scores)

            # Count title/subtitle matches
            for app in top_apps:
                match_info = analyze_app_keyword_match(app, keyword.term)
                if match_info["title_match"]:
                    title_match_count += 1
                if match_info["subtitle_match"]:
                    subtitle_match_count += 1

        # Calculate title match ratio for difficulty
        title_match_ratio = title_match_count / TOP_N_APPS if top_apps else 0.0

        # Calculate scores
        popularity = calculate_popularity_score(
            total_results, hint_available, avg_rating_count
        )
        difficulty = calculate_difficulty_score(
            total_results, avg_weighted_score, avg_rating_count, title_match_ratio
        )
        opportunity = calculate_opportunity_score(popularity, difficulty)

        # Format top apps for response (with match info)
        top_apps_formatted = []
        for app in top_apps:
            match_info = analyze_app_keyword_match(app, keyword.term)
            top_apps_formatted.append({
                "id": app.get("id"),
                "itunes_id": app.get("itunes_id"),
                "name": app.get("name"),
                "developer": app.get("developer"),
                "icon_url": app.get("icon_url"),
                "average_rating": app.get("average_rating"),
                "rating_count": app.get("rating_count"),
                "weighted_score": app.get("weighted_score"),
                "price": app.get("price", 0),
                "currency": app.get("currency", "USD"),
                "title_match": match_info["title_match"],
                "subtitle_match": match_info["subtitle_match"],
            })

        return {
            "keyword_id": keyword.id,
            "term": keyword.term,
            "country_code": keyword.country_code,
            "popularity_score": popularity,
            "difficulty_score": difficulty,
            "opportunity_score": opportunity,
            "total_results": total_results,
            "hint_available": hint_available,
            "avg_top_10_rating_count": avg_rating_count,
            "avg_top_10_rating": avg_rating,
            "top_10_weighted_score_sum": sum(weighted_scores) if weighted_scores else None,
            "title_match_count": title_match_count,
            "subtitle_match_count": subtitle_match_count,
            "top_apps": top_apps_formatted,
            "related_hints": related_hints[:10],  # Limit to 10 suggestions
            "data_source": "database" if use_db_data else "api",
        }

    async def _get_apps_from_db(self, keyword_id: int) -> list[dict[str, Any]]:
        """Query KeywordAppResult JOIN App, ordered by weighted_score."""
        result = await self.db.execute(
            select(App)
            .join(KeywordAppResult, KeywordAppResult.app_id == App.id)
            .where(KeywordAppResult.keyword_id == keyword_id)
            .order_by(App.weighted_score.desc().nulls_last())
            .limit(MAX_RESULTS_FOR_SCORING)
        )
        apps = result.scalars().all()

        return [
            {
                "id": app.id,
                "itunes_id": app.itunes_id,
                "name": app.name,
                "developer": app.developer,
                "icon_url": app.icon_url,
                "average_rating": app.average_rating,
                "rating_count": app.rating_count,
                "weighted_score": app.weighted_score,
                "price": app.price,
                "currency": app.currency,
                "raw_json": app.raw_json,  # Include for subtitle access
            }
            for app in apps
        ]

    async def _get_apps_from_api(
        self,
        term: str,
        country: str,
        proxy_url: str | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch fresh app data from iTunes API."""
        try:
            raw_results = await self.itunes_client.search(
                term=term,
                country=country,
                limit=MAX_RESULTS_FOR_SCORING,
                proxy_url=proxy_url,
            )
        except Exception as e:
            logger.error(f"iTunes API search failed: {e}")
            return []

        # Get global mean for weighted score calculation
        global_mean = await get_global_mean_rating(self.db)

        apps = []
        for raw in raw_results:
            parsed = ITunesClient.parse_app(raw)

            # Calculate weighted score if we have rating data
            weighted_score = None
            if parsed.get("average_rating") and parsed.get("rating_count"):
                weighted_score = compute_weighted_score(
                    parsed["average_rating"],
                    parsed["rating_count"],
                    global_mean,
                    min_ratings=100,
                )

            apps.append({
                "id": None,  # Not in DB
                "itunes_id": parsed.get("itunes_id"),
                "name": parsed.get("name"),
                "developer": parsed.get("developer"),
                "icon_url": parsed.get("icon_url"),
                "average_rating": parsed.get("average_rating"),
                "rating_count": parsed.get("rating_count", 0),
                "weighted_score": weighted_score,
                "price": parsed.get("price", 0),
                "currency": parsed.get("currency", "USD"),
            })

        # Sort by weighted_score
        apps.sort(key=lambda x: x.get("weighted_score") or 0, reverse=True)
        return apps

    async def save_metrics(
        self,
        keyword: UserKeyword,
        metrics: dict[str, Any],
    ) -> KeywordMetrics:
        """Save metrics snapshot and update cached fields on keyword."""
        today = date.today()

        # Check if we already have metrics for today
        existing = await self.db.execute(
            select(KeywordMetrics)
            .where(
                KeywordMetrics.keyword_id == keyword.id,
                KeywordMetrics.snapshot_date == today,
            )
        )
        existing_metrics = existing.scalar_one_or_none()

        if existing_metrics:
            # Update existing
            existing_metrics.popularity_score = metrics["popularity_score"]
            existing_metrics.difficulty_score = metrics["difficulty_score"]
            existing_metrics.opportunity_score = metrics["opportunity_score"]
            existing_metrics.total_results = metrics["total_results"]
            existing_metrics.hint_available = metrics["hint_available"]
            existing_metrics.avg_top_10_rating_count = metrics.get("avg_top_10_rating_count")
            existing_metrics.avg_top_10_rating = metrics.get("avg_top_10_rating")
            existing_metrics.top_10_weighted_score_sum = metrics.get("top_10_weighted_score_sum")
            existing_metrics.raw_data = {
                "top_apps": metrics.get("top_apps", []),
                "related_hints": metrics.get("related_hints", []),
            }
            keyword_metrics = existing_metrics
        else:
            # Create new
            keyword_metrics = KeywordMetrics(
                keyword_id=keyword.id,
                popularity_score=metrics["popularity_score"],
                difficulty_score=metrics["difficulty_score"],
                opportunity_score=metrics["opportunity_score"],
                total_results=metrics["total_results"],
                hint_available=metrics["hint_available"],
                avg_top_10_rating_count=metrics.get("avg_top_10_rating_count"),
                avg_top_10_rating=metrics.get("avg_top_10_rating"),
                top_10_weighted_score_sum=metrics.get("top_10_weighted_score_sum"),
                snapshot_date=today,
                raw_data={
                    "top_apps": metrics.get("top_apps", []),
                    "related_hints": metrics.get("related_hints", []),
                },
            )
            self.db.add(keyword_metrics)

        # Update cached fields on keyword
        keyword.latest_popularity = metrics["popularity_score"]
        keyword.latest_difficulty = metrics["difficulty_score"]
        keyword.latest_opportunity = metrics["opportunity_score"]

        await self.db.commit()
        await self.db.refresh(keyword_metrics)

        return keyword_metrics

    async def get_latest_metrics(
        self,
        keyword_id: int,
    ) -> KeywordMetrics | None:
        """Get the most recent metrics snapshot for a keyword."""
        result = await self.db.execute(
            select(KeywordMetrics)
            .where(KeywordMetrics.keyword_id == keyword_id)
            .order_by(KeywordMetrics.snapshot_date.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_metrics_history(
        self,
        keyword_id: int,
        days: int = 30,
    ) -> list[KeywordMetrics]:
        """Get historical metrics for a keyword."""
        cutoff = date.today() - timedelta(days=days)

        result = await self.db.execute(
            select(KeywordMetrics)
            .where(
                KeywordMetrics.keyword_id == keyword_id,
                KeywordMetrics.snapshot_date >= cutoff,
            )
            .order_by(KeywordMetrics.snapshot_date.asc())
        )
        return list(result.scalars().all())

    async def quick_analyze(
        self,
        term: str,
        country: str = "US",
        proxy_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Analyze any keyword without tracking (no DB storage).

        Always fetches fresh data from iTunes API.
        """
        # Fetch apps from API
        apps_data = await self._get_apps_from_api(term, country, proxy_url)
        total_results = len(apps_data)

        # Get related hints
        try:
            related_hints = await self.itunes_client.search_hints(
                term, country, proxy_url=proxy_url
            )
            hint_available = any(term.lower() in hint.lower() for hint in related_hints)
        except Exception as e:
            logger.warning(f"Failed to get search hints: {e}")
            related_hints = []
            hint_available = False

        # Get top 10 apps
        top_apps = apps_data[:TOP_N_APPS]

        # Calculate metrics
        avg_rating_count = None
        avg_rating = None
        avg_weighted_score = None

        if top_apps:
            rating_counts = [a.get("rating_count", 0) or 0 for a in top_apps]
            ratings = [a.get("average_rating") for a in top_apps if a.get("average_rating")]
            weighted_scores = [a.get("weighted_score") for a in top_apps if a.get("weighted_score")]

            if rating_counts:
                avg_rating_count = sum(rating_counts) / len(rating_counts)
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
            if weighted_scores:
                avg_weighted_score = sum(weighted_scores) / len(weighted_scores)

        popularity = calculate_popularity_score(total_results, hint_available, avg_rating_count)
        difficulty = calculate_difficulty_score(total_results, avg_weighted_score, avg_rating_count)
        opportunity = calculate_opportunity_score(popularity, difficulty)

        top_apps_formatted = [
            {
                "itunes_id": app.get("itunes_id"),
                "name": app.get("name"),
                "developer": app.get("developer"),
                "icon_url": app.get("icon_url"),
                "average_rating": app.get("average_rating"),
                "rating_count": app.get("rating_count"),
                "weighted_score": app.get("weighted_score"),
                "price": app.get("price", 0),
                "currency": app.get("currency", "USD"),
            }
            for app in top_apps
        ]

        return {
            "term": term,
            "country_code": country,
            "popularity_score": popularity,
            "difficulty_score": difficulty,
            "opportunity_score": opportunity,
            "total_results": total_results,
            "hint_available": hint_available,
            "top_apps": top_apps_formatted,
            "related_hints": related_hints[:10],
        }

    async def get_suggestions(
        self,
        term: str,
        country: str = "US",
        proxy_url: str | None = None,
    ) -> list[str]:
        """Get related keyword suggestions from Apple."""
        try:
            hints = await self.itunes_client.search_hints(
                term, country, proxy_url=proxy_url
            )
            return hints[:20]
        except Exception as e:
            logger.warning(f"Failed to get suggestions: {e}")
            return []
