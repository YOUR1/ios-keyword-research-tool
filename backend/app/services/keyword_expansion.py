"""
OpenAI-powered keyword expansion service.

Generates category-specific search terms using AI to increase app discovery
coverage beyond the static 33 keywords in constants.py.

Uses gpt-4o-mini for fast, cheap keyword generation with Redis caching
to avoid repeated API calls.
"""

import asyncio
import json
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.core.redis import get_redis
from app.utils.constants import SEARCH_TERMS, ITUNES_CATEGORIES

logger = logging.getLogger(__name__)

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

# Per-loop semaphore tracking for Celery worker compatibility
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


class OpenAIKeywordClient:
    """Async client for OpenAI keyword expansion."""

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
                timeout=60.0,
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
            finally:
                # Rate limiting: wait between requests
                await asyncio.sleep(60.0 / settings.KEYWORD_EXPANSION_RATE_LIMIT)

    async def generate_keywords(
        self,
        category_name: str,
        count: int = 50,
    ) -> list[str]:
        """
        Generate search keywords for an App Store category using OpenAI.

        Args:
            category_name: The category name (e.g., "Games", "Health & Fitness")
            count: Number of keywords to generate

        Returns:
            List of generated search keywords
        """
        prompt = f"""Generate {count} iOS App Store search keywords for the "{category_name}" category.

Include:
- Common user search terms people type when looking for {category_name.lower()} apps
- Common misspellings users might type
- Related features and use cases
- Types of apps users might search for in this category

Return ONLY a JSON array of strings, no explanation. Example: ["keyword1", "keyword2", "keyword3"]"""

        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a keyword research assistant. Return only valid JSON arrays.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
        }

        try:
            data = await self._request(payload)
            content = data["choices"][0]["message"]["content"].strip()

            # Parse JSON response
            # Handle potential markdown code blocks
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1])

            keywords = json.loads(content)
            if isinstance(keywords, list):
                return [str(k).strip() for k in keywords if k]
            return []

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse OpenAI response as JSON: {e}")
            return []
        except Exception as e:
            logger.error(f"Keyword generation failed for {category_name}: {e}")
            return []


# Singleton instance
openai_keyword_client = OpenAIKeywordClient()


async def expand_keywords(
    category_name: str,
    category_id: int | None = None,
    use_cache: bool = True,
) -> list[str]:
    """
    Get expanded keywords for a category, using cache if available.

    Args:
        category_name: The category name
        category_id: Optional category ID for cache key
        use_cache: Whether to use Redis cache

    Returns:
        List of search keywords (expanded or fallback to static)
    """
    if not settings.KEYWORD_EXPANSION_ENABLED or not settings.OPENAI_API_KEY:
        logger.debug("Keyword expansion disabled, using static terms")
        return SEARCH_TERMS

    cache_key = f"keywords:expanded:{category_id or category_name}"

    # Try cache first
    if use_cache:
        try:
            redis = await get_redis()
            cached = await redis.get(cache_key)
            if cached:
                keywords = json.loads(cached)
                logger.debug(f"Cache hit for {category_name}: {len(keywords)} keywords")
                return keywords
        except Exception as e:
            logger.warning(f"Redis cache read failed: {e}")

    # Generate new keywords
    try:
        keywords = await openai_keyword_client.generate_keywords(category_name)
        if not keywords:
            logger.warning(f"No keywords generated for {category_name}, using fallback")
            return SEARCH_TERMS

        # Merge with static terms for better coverage
        merged = list(set(keywords + SEARCH_TERMS))

        # Cache the result
        if use_cache:
            try:
                redis = await get_redis()
                await redis.setex(
                    cache_key,
                    settings.KEYWORD_EXPANSION_CACHE_TTL,
                    json.dumps(merged),
                )
                logger.info(f"Cached {len(merged)} keywords for {category_name}")
            except Exception as e:
                logger.warning(f"Redis cache write failed: {e}")

        return merged

    except Exception as e:
        logger.error(f"Keyword expansion failed for {category_name}: {e}")
        return SEARCH_TERMS


async def expand_all_categories(
    use_cache: bool = True,
) -> dict[int, list[str]]:
    """
    Expand keywords for all categories.

    Args:
        use_cache: Whether to use Redis cache

    Returns:
        Dict mapping category_id to list of keywords
    """
    if not settings.KEYWORD_EXPANSION_ENABLED or not settings.OPENAI_API_KEY:
        logger.info("Keyword expansion disabled, using static terms for all categories")
        return {cat_id: SEARCH_TERMS for cat_id in ITUNES_CATEGORIES}

    result: dict[int, list[str]] = {}

    for cat_id, cat_name in ITUNES_CATEGORIES.items():
        logger.info(f"Expanding keywords for {cat_name} ({cat_id})")
        keywords = await expand_keywords(cat_name, cat_id, use_cache)
        result[cat_id] = keywords

    return result


async def get_cached_keywords(category_id: int) -> list[str] | None:
    """
    Get keywords from cache only, without generating new ones.

    Args:
        category_id: The category ID

    Returns:
        Cached keywords or None if not cached
    """
    cache_key = f"keywords:expanded:{category_id}"
    try:
        redis = await get_redis()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Redis cache read failed: {e}")
    return None


async def clear_keyword_cache() -> int:
    """
    Clear all cached expanded keywords.

    Returns:
        Number of keys deleted
    """
    try:
        redis = await get_redis()
        keys = []
        async for key in redis.scan_iter("keywords:expanded:*"):
            keys.append(key)
        if keys:
            deleted = await redis.delete(*keys)
            logger.info(f"Cleared {deleted} keyword cache entries")
            return deleted
        return 0
    except Exception as e:
        logger.error(f"Failed to clear keyword cache: {e}")
        return 0


async def expand_user_keyword(
    keyword: str,
    category_name: str | None = None,
    count: int = 15,
    use_cache: bool = True,
) -> list[str]:
    """
    Expand a user's keyword into related search terms.

    Args:
        keyword: The user's original search keyword
        category_name: Optional category context for better expansion
        count: Number of variations to generate (default 15)
        use_cache: Whether to use Redis cache

    Returns:
        List of search terms including the original keyword
    """
    if not settings.KEYWORD_EXPANSION_ENABLED or not settings.OPENAI_API_KEY:
        logger.debug("Keyword expansion disabled, using original term only")
        return [keyword]

    # Normalize for cache key
    cache_key = f"keywords:user:{keyword.lower().strip()}"
    if category_name:
        cache_key += f":{category_name.lower().replace(' ', '_')}"

    # Try cache first
    if use_cache:
        try:
            redis = await get_redis()
            cached = await redis.get(cache_key)
            if cached:
                keywords = json.loads(cached)
                logger.debug(f"Cache hit for '{keyword}': {len(keywords)} terms")
                return keywords
        except Exception as e:
            logger.warning(f"Redis cache read failed: {e}")

    # Build prompt
    category_context = ""
    if category_name:
        category_context = f" in the {category_name} category"

    prompt = f"""Generate {count} iOS App Store search term variations for "{keyword}"{category_context}.

Include:
- The original term
- Synonyms and alternative phrasings
- Related features users might search for
- Common misspellings
- More specific and more general variations

Return ONLY a JSON array of strings, no explanation. Example: ["term1", "term2", "term3"]"""

    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a keyword research assistant for iOS App Store searches. Return only valid JSON arrays.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 500,
    }

    try:
        data = await openai_keyword_client._request(payload)
        content = data["choices"][0]["message"]["content"].strip()

        # Handle markdown code blocks
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1])

        keywords = json.loads(content)
        if not isinstance(keywords, list):
            keywords = []

        # Clean and deduplicate, ensure original keyword is included
        expanded = [keyword]  # Always include original first
        for k in keywords:
            term = str(k).strip()
            if term and term.lower() != keyword.lower() and term not in expanded:
                expanded.append(term)

        # Cache the result
        if use_cache and expanded:
            try:
                redis = await get_redis()
                await redis.setex(
                    cache_key,
                    settings.KEYWORD_EXPANSION_CACHE_TTL,
                    json.dumps(expanded),
                )
                logger.info(f"Cached {len(expanded)} terms for user keyword '{keyword}'")
            except Exception as e:
                logger.warning(f"Redis cache write failed: {e}")

        return expanded

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse OpenAI response for '{keyword}': {e}")
        return [keyword]
    except Exception as e:
        logger.error(f"Keyword expansion failed for '{keyword}': {e}")
        return [keyword]
