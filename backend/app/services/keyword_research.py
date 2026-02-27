"""
Keyword Research Service.

Estimates popularity, difficulty, and opportunity scores for keywords
using iTunes Search API data and existing crawl results.
"""

import asyncio
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
from app.services.keyword_expansion import expand_user_keyword
from app.utils.constants import ITUNES_CATEGORIES

logger = logging.getLogger(__name__)

# Constants for scoring
MAX_RESULTS_FOR_SCORING = 200  # iTunes API max
TOP_N_APPS = 25  # Number of top apps to analyze


def check_keyword_in_text(keyword: str, text: str | None) -> bool:
    """Check if all words of the keyword appear in the text (case-insensitive)."""
    if not text:
        return False
    text_lower = text.lower()
    keyword_words = keyword.lower().split()
    return all(word in text_lower for word in keyword_words)


def count_keyword_occurrences(keyword: str, text: str | None) -> int:
    """Count how many times the keyword (or its words) appears in the text."""
    if not text:
        return 0
    text_lower = text.lower()
    keyword_lower = keyword.lower()

    # Count exact phrase matches first
    count = text_lower.count(keyword_lower)
    if count > 0:
        return count

    # If no exact match, count individual word occurrences (minimum across all words)
    keyword_words = keyword_lower.split()
    if len(keyword_words) > 1:
        word_counts = [text_lower.count(word) for word in keyword_words]
        return min(word_counts) if all(c > 0 for c in word_counts) else 0

    return 0


def analyze_app_keyword_match(
    app: dict,
    keyword: str,
) -> dict:
    """
    Analyze if keyword appears in app title/subtitle/description.

    Returns dict with match info:
    - title_match: bool
    - subtitle_match: bool
    - description_match: bool
    - title_match_count: int (number of occurrences in title)
    - subtitle_match_count: int (number of occurrences in subtitle)
    - subtitle: str (the actual subtitle text)
    - relevance_score: int (title=3, subtitle=2, desc=1)
    """
    name = app.get("name", "")

    # Get subtitle and description from raw_json if available
    raw_json = app.get("raw_json") or {}
    subtitle = raw_json.get("subtitle", "")
    description = app.get("description") or raw_json.get("description", "")

    title_match = check_keyword_in_text(keyword, name)
    subtitle_match = check_keyword_in_text(keyword, subtitle)
    description_match = check_keyword_in_text(keyword, description)

    # Count occurrences
    title_match_count = count_keyword_occurrences(keyword, name)
    subtitle_match_count = count_keyword_occurrences(keyword, subtitle)

    # Calculate relevance score: title=3, subtitle=2, description=1
    relevance_score = 0
    if title_match:
        relevance_score += 3
    if subtitle_match:
        relevance_score += 2
    if description_match:
        relevance_score += 1

    return {
        "title_match": title_match,
        "subtitle_match": subtitle_match,
        "description_match": description_match,
        "title_match_count": title_match_count,
        "subtitle_match_count": subtitle_match_count,
        "subtitle": subtitle,
        "relevance_score": relevance_score,
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
    subtitle_match_ratio: float = 0.0,
) -> float:
    """
    Calculate difficulty/competitiveness score (0-100).

    Key insight: If NO apps are using the keyword in title/subtitle,
    the competitiveness should be LOW (easy to rank for this keyword).

    Formula prioritizes actual keyword usage:
    - title_match_ratio: 50% weight (primary - direct competition)
    - subtitle_match_ratio: 20% weight (secondary competition)
    - count_score: 10% weight (market size)
    - ws_score: 10% weight (quality of competitors)
    - rc_score: 10% weight (scale of competitors)

    When title_match_ratio=0 and subtitle_match_ratio=0,
    the max difficulty is 30 (easy to rank).
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

    # Keyword usage in title/subtitle is the primary factor
    difficulty = (
        title_match_ratio * 0.50       # Primary: apps targeting this keyword in title
        + subtitle_match_ratio * 0.20  # Secondary: apps targeting in subtitle
        + count_score * 0.10           # Market size signal
        + ws_score * 0.10              # Quality of competitors
        + rc_score * 0.10              # Scale of competitors
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

        # Calculate match ratios for difficulty
        title_match_ratio = title_match_count / TOP_N_APPS if top_apps else 0.0
        subtitle_match_ratio = subtitle_match_count / TOP_N_APPS if top_apps else 0.0

        # Calculate scores
        popularity = calculate_popularity_score(
            total_results, hint_available, avg_rating_count
        )
        difficulty = calculate_difficulty_score(
            total_results, avg_weighted_score, avg_rating_count,
            title_match_ratio, subtitle_match_ratio
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
                "subtitle": match_info["subtitle"],
                "developer": app.get("developer"),
                "icon_url": app.get("icon_url"),
                "average_rating": app.get("average_rating"),
                "rating_count": app.get("rating_count"),
                "weighted_score": app.get("weighted_score"),
                "price": app.get("price", 0),
                "currency": app.get("currency", "USD"),
                "title_match": match_info["title_match"],
                "subtitle_match": match_info["subtitle_match"],
                "description_match": match_info["description_match"],
                "title_match_count": match_info["title_match_count"],
                "subtitle_match_count": match_info["subtitle_match_count"],
                "relevance_score": match_info["relevance_score"],
            })

        # Sort by relevance score (descending), then by weighted_score
        top_apps_formatted.sort(
            key=lambda x: (x["relevance_score"], x["weighted_score"] or 0),
            reverse=True,
        )

        # Get AI-expanded keywords
        ai_expanded_terms = []
        try:
            # Get category name if available for better AI context
            category_name = None
            if keyword.category_id:
                category_name = ITUNES_CATEGORIES.get(keyword.category_id)

            ai_expanded_terms = await expand_user_keyword(
                keyword=keyword.term,
                category_name=category_name,
                count=15,
                use_cache=True,
            )
            # Remove the original keyword from AI results
            ai_expanded_terms = [
                term for term in ai_expanded_terms
                if term.lower() != keyword.term.lower()
            ]
            logger.info(f"AI expanded '{keyword.term}' to {len(ai_expanded_terms)} additional terms")
        except Exception as e:
            logger.warning(f"Failed to expand keyword with AI: {e}")

        # Combine Apple hints + AI keywords (deduplicated)
        all_related_terms = []
        seen_terms = {keyword.term.lower()}  # Exclude original keyword

        # Add Apple hints first (prioritized)
        for hint in related_hints:
            if hint.lower() not in seen_terms:
                seen_terms.add(hint.lower())
                all_related_terms.append({"term": hint, "source": "apple"})

        # Add AI-expanded keywords
        for term in ai_expanded_terms:
            if term.lower() not in seen_terms:
                seen_terms.add(term.lower())
                all_related_terms.append({"term": term, "source": "ai"})

        # Analyze ALL related keywords (Apple + AI combined)
        related_keywords_with_metrics = []
        if all_related_terms:
            try:
                # Extract just the terms for analysis
                terms_to_analyze = [item["term"] for item in all_related_terms]
                analyzed = await self.analyze_related_keywords(
                    terms_to_analyze,
                    keyword.country_code,
                    keyword.term,
                    proxy_url,
                )
                # Add source info to analyzed keywords
                term_to_source = {item["term"].lower(): item["source"] for item in all_related_terms}
                for kw in analyzed:
                    kw["source"] = term_to_source.get(kw["term"].lower(), "unknown")
                related_keywords_with_metrics = analyzed
            except Exception as e:
                logger.warning(f"Failed to analyze related keywords: {e}")

        # Separate AI keywords for explicit response field
        ai_keywords_with_metrics = [
            kw for kw in related_keywords_with_metrics
            if kw.get("source") == "ai"
        ]

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
            "related_keywords": related_keywords_with_metrics,  # All with metrics (Apple + AI)
            "ai_expanded_keywords": ai_keywords_with_metrics,  # AI keywords only
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

        # Build raw_data with all analysis details
        raw_data = {
            "top_apps": metrics.get("top_apps", []),
            "related_hints": metrics.get("related_hints", []),
            "related_keywords": metrics.get("related_keywords", []),
            "ai_expanded_keywords": metrics.get("ai_expanded_keywords", []),
            "title_match_count": metrics.get("title_match_count", 0),
            "subtitle_match_count": metrics.get("subtitle_match_count", 0),
            "data_source": metrics.get("data_source", "unknown"),
        }

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
            existing_metrics.raw_data = raw_data
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
                raw_data=raw_data,
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

        # Get top apps
        top_apps = apps_data[:TOP_N_APPS]

        # Calculate metrics
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

            # Count title/subtitle matches for competitiveness
            for app in top_apps:
                match_info = analyze_app_keyword_match(app, term)
                if match_info["title_match"]:
                    title_match_count += 1
                if match_info["subtitle_match"]:
                    subtitle_match_count += 1

        # Calculate match ratios
        title_match_ratio = title_match_count / TOP_N_APPS if top_apps else 0.0
        subtitle_match_ratio = subtitle_match_count / TOP_N_APPS if top_apps else 0.0

        popularity = calculate_popularity_score(total_results, hint_available, avg_rating_count)
        difficulty = calculate_difficulty_score(
            total_results, avg_weighted_score, avg_rating_count,
            title_match_ratio, subtitle_match_ratio
        )
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

    async def _analyze_related_keyword(
        self,
        term: str,
        country: str,
        proxy_url: str | None = None,
    ) -> dict[str, Any] | None:
        """
        Quickly analyze a related keyword to get basic metrics.
        Returns None if analysis fails (e.g., rate limited).
        """
        try:
            # Fetch apps for basic metrics
            raw_results = await self.itunes_client.search(
                term=term,
                country=country,
                limit=10,  # Only need top 10 for basic analysis
                proxy_url=proxy_url,
            )
            total_results = len(raw_results)

            # Calculate basic metrics and keyword match ratios
            avg_rating_count = None
            title_match_count = 0
            subtitle_match_count = 0

            if raw_results:
                rating_counts = [
                    r.get("userRatingCount", 0) or 0 for r in raw_results
                ]
                if rating_counts:
                    avg_rating_count = sum(rating_counts) / len(rating_counts)

                # Check title/subtitle matches for competitiveness
                for raw in raw_results:
                    name = raw.get("trackName", "")
                    # iTunes API returns subtitle in different field
                    subtitle = raw.get("subtitle", "")

                    if check_keyword_in_text(term, name):
                        title_match_count += 1
                    if check_keyword_in_text(term, subtitle):
                        subtitle_match_count += 1

            # Calculate match ratios
            num_apps = len(raw_results) if raw_results else 1
            title_match_ratio = title_match_count / num_apps
            subtitle_match_ratio = subtitle_match_count / num_apps

            # Format top 3 apps for display
            top_apps = []
            for raw in raw_results[:3]:
                parsed = ITunesClient.parse_app(raw)
                top_apps.append({
                    "name": parsed.get("name"),
                    "icon_url": parsed.get("icon_url"),
                })

            # Check hint availability
            hint_available = False
            try:
                hints = await self.itunes_client.search_hints(
                    term, country, proxy_url=proxy_url
                )
                hint_available = any(term.lower() in h.lower() for h in hints)
            except Exception:
                pass

            popularity = calculate_popularity_score(
                total_results, hint_available, avg_rating_count
            )
            difficulty = calculate_difficulty_score(
                total_results, None, avg_rating_count,
                title_match_ratio, subtitle_match_ratio
            )

            return {
                "term": term,
                "popularity": round(popularity),
                "competitiveness": round(difficulty),
                "top_apps": top_apps,
            }
        except Exception as e:
            logger.warning(f"Failed to analyze related keyword '{term}': {e}")
            return None

    async def analyze_related_keywords(
        self,
        hints: list[str],
        country: str,
        main_term: str,
        proxy_url: str | None = None,
        max_concurrent: int = 3,
        max_keywords: int = 15,
    ) -> list[dict[str, Any]]:
        """
        Batch analyze related keywords with rate limiting.
        Filters out the main term (case-insensitive).

        Args:
            hints: List of keyword terms to analyze
            country: Country code for search
            main_term: Main keyword to exclude from analysis
            proxy_url: Optional proxy URL
            max_concurrent: Maximum concurrent API requests
            max_keywords: Maximum keywords to analyze (default 15 for Apple + AI)
        """
        # Filter out duplicates and main term
        unique_hints = []
        seen = {main_term.lower()}
        for hint in hints:
            if hint.lower() not in seen:
                seen.add(hint.lower())
                unique_hints.append(hint)

        # Limit keywords to avoid rate limiting
        hints_to_analyze = unique_hints[:max_keywords]

        if not hints_to_analyze:
            return []

        # Use semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(max_concurrent)

        async def analyze_with_semaphore(term: str) -> dict[str, Any] | None:
            async with semaphore:
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.3)
                return await self._analyze_related_keyword(term, country, proxy_url)

        # Run analyses in parallel with rate limiting
        tasks = [analyze_with_semaphore(hint) for hint in hints_to_analyze]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out failures
        analyzed = []
        for result in results:
            if isinstance(result, dict) and result is not None:
                analyzed.append(result)

        return analyzed
