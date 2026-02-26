"""
AI-powered app analysis service.

Analyzes app reviews, description, and ratings to provide actionable insights
for creating competitive apps. Uses OpenAI for analysis.
"""

import asyncio
import json
import logging
import re
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.models.models import App, Review, AppAnalysis

logger = logging.getLogger(__name__)

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
CACHE_TTL = 3600  # 1 hour cache for analysis results

# Rate limiting semaphore
_rate_semaphore: asyncio.Semaphore | None = None
_rate_semaphore_loop_id: int | None = None


def _get_rate_semaphore() -> asyncio.Semaphore:
    """Get or create a rate-limiting semaphore for the current event loop."""
    global _rate_semaphore, _rate_semaphore_loop_id
    try:
        current_loop_id = id(asyncio.get_running_loop())
    except RuntimeError:
        current_loop_id = None
    if _rate_semaphore is None or _rate_semaphore_loop_id != current_loop_id:
        _rate_semaphore = asyncio.Semaphore(settings.KEYWORD_EXPANSION_RATE_LIMIT)
        _rate_semaphore_loop_id = current_loop_id
    return _rate_semaphore


class AppAnalysisClient:
    """Async client for AI-powered app analysis."""

    def __init__(self):
        self._client: httpx.AsyncClient | None = None
        self._client_loop_id: int | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client, recreating if event loop changed."""
        try:
            current_loop_id = id(asyncio.get_running_loop())
        except RuntimeError:
            current_loop_id = None

        if (
            self._client is None
            or self._client.is_closed
            or self._client_loop_id != current_loop_id
        ):
            if self._client and not self._client.is_closed:
                try:
                    await self._client.aclose()
                except Exception:
                    pass
            self._client = httpx.AsyncClient(
                timeout=120.0,  # Longer timeout for analysis
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            self._client_loop_id = current_loop_id
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _request(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Make a rate-limited request to OpenAI API."""
        async with _get_rate_semaphore():
            client = await self._get_client()
            try:
                response = await client.post(OPENAI_API_URL, json=payload)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"OpenAI API HTTP error: {e.response.status_code}")
                raise
            except Exception as e:
                logger.error(f"OpenAI API request failed: {e}")
                raise

    async def analyze_app(
        self,
        app_name: str,
        developer: str | None,
        description: str | None,
        category: str | None,
        average_rating: float | None,
        rating_count: int,
        reviews: list[dict],
    ) -> dict[str, Any]:
        """
        Analyze an app to generate MVP insights and recommendations.

        Args:
            app_name: The app name
            developer: Developer name
            description: App description
            category: App category
            average_rating: Average rating
            rating_count: Number of ratings
            reviews: List of review dicts with 'rating', 'title', 'body'

        Returns:
            Analysis dict with insights
        """
        # Build review summary for the prompt
        review_texts = []
        for r in reviews[:50]:  # Limit to 50 most recent reviews
            rating = r.get("rating", "?")
            title = r.get("title", "")
            body = r.get("body", "")
            if title or body:
                review_texts.append(f"[{rating}/5] {title}: {body}"[:500])

        reviews_section = "\n".join(review_texts) if review_texts else "No reviews available."

        prompt = f"""Analyze this iOS app and provide actionable insights for someone wanting to create a competing app or MVP.

APP INFORMATION:
- Name: {app_name}
- Developer: {developer or "Unknown"}
- Category: {category or "Unknown"}
- Average Rating: {average_rating or "N/A"}/5
- Total Ratings: {rating_count:,}

APP DESCRIPTION:
{description or "No description available."}

CUSTOMER REVIEWS (sample):
{reviews_section}

Based on this information, provide a comprehensive analysis in the following JSON format:

{{
  "summary": "A 2-3 sentence summary of the app's current state and market position",
  "strengths": ["List of 3-5 things users love about this app"],
  "weaknesses": ["List of 3-5 pain points and complaints from users"],
  "opportunities": ["List of 3-5 market opportunities based on user needs"],
  "mvp_recommendations": ["List of 5-7 prioritized features for an MVP competitor"],
  "what_to_do": ["List of 5-7 best practices to follow when building a competitor"],
  "what_not_to_do": ["List of 5-7 mistakes to avoid based on this app's issues"]
}}

Focus on actionable, specific insights. Be direct and practical. Return ONLY valid JSON."""

        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert app market analyst and product strategist. Analyze apps to provide actionable insights for entrepreneurs and developers. Always return valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
        }

        try:
            data = await self._request(payload)
            content = data["choices"][0]["message"]["content"].strip()

            # Handle markdown code blocks
            if "```" in content:
                # Extract content between code blocks
                # Match ```json or ``` followed by content until closing ```
                match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
                if match:
                    content = match.group(1).strip()

            # Try to find JSON object in the content
            if not content.startswith("{"):
                # Find the first { and last }
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1:
                    content = content[start:end + 1]

            analysis = json.loads(content)

            # Validate expected keys
            expected_keys = [
                "summary", "strengths", "weaknesses", "opportunities",
                "mvp_recommendations", "what_to_do", "what_not_to_do"
            ]
            for key in expected_keys:
                if key not in analysis:
                    analysis[key] = [] if key != "summary" else "Analysis incomplete."

            return analysis

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse OpenAI response as JSON: {e}")
            return {
                "summary": "Failed to generate analysis. Please try again.",
                "strengths": [],
                "weaknesses": [],
                "opportunities": [],
                "mvp_recommendations": [],
                "what_to_do": [],
                "what_not_to_do": [],
            }
        except Exception as e:
            logger.error(f"App analysis failed for {app_name}: {e}")
            raise


# Singleton instance
app_analysis_client = AppAnalysisClient()


async def get_app_analysis(
    app_id: int,
    db: AsyncSession,
) -> dict[str, Any] | None:
    """
    Get existing analysis for an app from the database.

    Args:
        app_id: The app database ID
        db: Database session

    Returns:
        Analysis dict or None if not found
    """
    result = await db.execute(
        select(AppAnalysis).where(AppAnalysis.app_id == app_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing.analysis
    return None


async def analyze_app_by_id(
    app_id: int,
    db: AsyncSession,
    force_regenerate: bool = False,
) -> dict[str, Any]:
    """
    Analyze an app by its ID. Saves result to database.

    Args:
        app_id: The app database ID
        db: Database session
        force_regenerate: If True, regenerate even if analysis exists

    Returns:
        Analysis dict with insights
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OpenAI API key not configured")

    # Check database first (unless forcing regeneration)
    if not force_regenerate:
        existing = await get_app_analysis(app_id, db)
        if existing:
            logger.debug(f"Found existing analysis for app {app_id}")
            return existing

    # Fetch app data
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(App)
        .options(selectinload(App.category))
        .where(App.id == app_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise ValueError(f"App {app_id} not found")

    # Fetch recent reviews
    review_result = await db.execute(
        select(Review)
        .where(Review.app_id == app_id)
        .order_by(Review.review_date.desc())
        .limit(50)
    )
    reviews = review_result.scalars().all()

    review_dicts = [
        {
            "rating": r.rating,
            "title": r.title,
            "body": r.body,
        }
        for r in reviews
    ]

    # Generate analysis
    analysis = await app_analysis_client.analyze_app(
        app_name=app.name,
        developer=app.developer,
        description=app.description,
        category=app.category.name if app.category else None,
        average_rating=app.average_rating,
        rating_count=app.rating_count,
        reviews=review_dicts,
    )

    # Check if analysis was successful (has actual content)
    if not analysis.get("summary") or analysis["summary"] == "Failed to generate analysis. Please try again.":
        raise ValueError("Failed to generate valid analysis")

    # Save to database (upsert)
    existing_result = await db.execute(
        select(AppAnalysis).where(AppAnalysis.app_id == app_id)
    )
    existing_record = existing_result.scalar_one_or_none()

    if existing_record:
        existing_record.analysis = analysis
        existing_record.model_used = settings.OPENAI_MODEL
    else:
        new_analysis = AppAnalysis(
            app_id=app_id,
            analysis=analysis,
            model_used=settings.OPENAI_MODEL,
        )
        db.add(new_analysis)

    await db.commit()
    logger.info(f"Saved analysis for app {app_id} to database")

    return analysis
