"""
iTunes Search API client.

Apple's iTunes Search API is public and does not require authentication.
Endpoint: https://itunes.apple.com/search
Docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

Rate limits: ~20 requests/minute (undocumented, empirically observed).
"""

import asyncio
import logging
from datetime import datetime
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"
ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup"
APPLE_SEARCH_HINTS_URL = "https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints"
APPLE_RSS_TOP_CHARTS_URL = "https://rss.applemarketingtools.com/api/v2"

# Per-loop semaphore: tracks which loop it belongs to and recreates if needed
_rate_semaphore: asyncio.Semaphore | None = None
_rate_semaphore_loop_id: int | None = None


def _get_rate_semaphore() -> asyncio.Semaphore:
    global _rate_semaphore, _rate_semaphore_loop_id
    try:
        current_loop_id = id(asyncio.get_running_loop())
    except RuntimeError:
        current_loop_id = None
    if _rate_semaphore is None or _rate_semaphore_loop_id != current_loop_id:
        _rate_semaphore = asyncio.Semaphore(settings.CRAWL_RATE_LIMIT_PER_MINUTE)
        _rate_semaphore_loop_id = current_loop_id
    return _rate_semaphore


class ITunesClient:
    """Async client for Apple's iTunes Search API."""

    def __init__(self):
        self._client: httpx.AsyncClient | None = None
        self._client_loop_id: int | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        # Track event loop to recreate client when loop changes (Celery workers)
        try:
            current_loop_id = id(asyncio.get_running_loop())
        except RuntimeError:
            current_loop_id = None

        if (self._client is None
            or self._client.is_closed
            or self._client_loop_id != current_loop_id):
            # Close old client if it exists
            if self._client and not self._client.is_closed:
                try:
                    await self._client.aclose()
                except Exception:
                    pass
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={"Accept": "application/json"},
                follow_redirects=True,
            )
            self._client_loop_id = current_loop_id
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _request(
        self,
        url: str,
        params: dict,
        proxy_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Make a rate-limited request to iTunes API.

        Args:
            url: iTunes API endpoint URL.
            params: Query parameters.
            proxy_url: Optional proxy URL. When provided, a per-request
                       httpx.AsyncClient is created with the proxy configured
                       instead of using the singleton client.
        """
        async with _get_rate_semaphore():
            # Use a per-request client with proxy, or the singleton client
            if proxy_url:
                client = httpx.AsyncClient(
                    proxy=proxy_url,
                    timeout=30.0,
                    headers={"Accept": "application/json"},
                    follow_redirects=True,
                )
            else:
                client = await self._get_client()

            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                # iTunes API sometimes returns text/javascript content-type
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"iTunes API HTTP error: {e.response.status_code} for {url}")
                raise
            except Exception as e:
                logger.error(f"iTunes API request failed: {e}")
                raise
            finally:
                # Close the per-request proxy client to avoid connection leaks
                if proxy_url:
                    await client.aclose()
                # Simple rate limiting: wait between requests
                await asyncio.sleep(60.0 / settings.CRAWL_RATE_LIMIT_PER_MINUTE)

    async def search(
        self,
        term: str,
        country: str = "US",
        media: str = "software",
        entity: str = "software",
        limit: int = 200,
        proxy_url: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Search for iOS apps by term.

        Args:
            term: Search keyword
            country: Two-letter country code (ISO 3166-1 alpha-2)
            media: Media type (always 'software' for apps)
            entity: Entity type
            limit: Max results (Apple caps at 200)
            proxy_url: Optional proxy URL for this request

        Returns:
            List of app result dicts from Apple.
        """
        params = {
            "term": term,
            "country": country,
            "media": media,
            "entity": entity,
            "limit": min(limit, 200),
        }
        data = await self._request(ITUNES_SEARCH_URL, params, proxy_url=proxy_url)
        return data.get("results", [])

    async def search_by_genre(
        self,
        genre_id: int,
        country: str = "US",
        letter: str = "*",
        limit: int = 200,
        proxy_url: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Search for apps within a genre/category.

        Uses the search API with genre filtering. For broader coverage,
        iterate over alphabet letters as search terms within each genre.

        Args:
            genre_id: iTunes genre/category ID.
            country: Two-letter country code.
            letter: Search term (use '*' for broad search).
            limit: Max results (Apple caps at 200).
            proxy_url: Optional proxy URL for this request.
        """
        # The iTunes Search API doesn't have a native genre-only filter,
        # so we use the genreId with a broad search term
        params = {
            "term": letter,
            "country": country,
            "media": "software",
            "entity": "software",
            "genreId": genre_id,
            "limit": min(limit, 200),
        }
        data = await self._request(ITUNES_SEARCH_URL, params, proxy_url=proxy_url)
        return data.get("results", [])

    async def lookup(
        self,
        itunes_id: int,
        country: str = "US",
        proxy_url: str | None = None,
    ) -> dict[str, Any] | None:
        """Look up a single app by its iTunes ID."""
        params = {
            "id": itunes_id,
            "country": country,
            "entity": "software",
        }
        data = await self._request(ITUNES_LOOKUP_URL, params, proxy_url=proxy_url)
        results = data.get("results", [])
        return results[0] if results else None

    async def lookup_batch(
        self,
        itunes_ids: list[int],
        country: str = "US",
        proxy_url: str | None = None,
    ) -> list[dict[str, Any]]:
        """Look up multiple apps by their iTunes IDs (max 200 per request)."""
        results = []
        # iTunes lookup supports comma-separated IDs, up to ~200
        for i in range(0, len(itunes_ids), 200):
            batch = itunes_ids[i : i + 200]
            ids_str = ",".join(str(id_) for id_ in batch)
            params = {
                "id": ids_str,
                "country": country,
                "entity": "software",
            }
            data = await self._request(ITUNES_LOOKUP_URL, params, proxy_url=proxy_url)
            results.extend(data.get("results", []))
        return results

    async def search_hints(
        self,
        term: str,
        country: str = "US",
        proxy_url: str | None = None,
    ) -> list[str]:
        """
        Get keyword suggestions from Apple's Search Hints API.

        Args:
            term: Partial search term (min 2 chars recommended).
            country: Two-letter country code.
            proxy_url: Optional proxy URL for this request.

        Returns:
            List of suggested search terms.
        """
        params = {"term": term, "country": country, "media": "software"}
        try:
            data = await self._request(
                APPLE_SEARCH_HINTS_URL, params, proxy_url=proxy_url
            )
            hints = data.get("hints", [])
            result = []
            for hint in hints:
                if isinstance(hint, str):
                    result.append(hint)
                elif isinstance(hint, dict) and "term" in hint:
                    result.append(hint["term"])
            return result
        except Exception:
            logger.warning(
                f"Search hints API failed for term='{term}', falling back to search"
            )
            return await self._fallback_suggestions(term, country, proxy_url=proxy_url)

    async def _fallback_suggestions(
        self,
        term: str,
        country: str = "US",
        proxy_url: str | None = None,
    ) -> list[str]:
        """
        Fallback: extract app names from regular search results as suggestions.

        Args:
            term: Search term.
            country: Two-letter country code.
            proxy_url: Optional proxy URL for this request.

        Returns:
            List of app names as suggestions.
        """
        try:
            results = await self.search(
                term=term, country=country, limit=10, proxy_url=proxy_url
            )
            return [r["trackName"] for r in results if r.get("trackName")]
        except Exception:
            logger.warning(f"Fallback suggestions also failed for term='{term}'")
            return []

    async def top_charts(
        self,
        country: str = "US",
        limit: int = 25,
        chart: str = "top-free",
        proxy_url: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get top chart apps from Apple's RSS feed.

        Args:
            country: Two-letter country code (lowercase used in URL).
            limit: Number of apps to return (max 200).
            chart: Chart type (top-free, top-paid, top-grossing).
            proxy_url: Optional proxy URL for this request.

        Returns:
            List of app dicts from the RSS feed.
        """
        url = (
            f"{APPLE_RSS_TOP_CHARTS_URL}/{country.lower()}"
            f"/apps/{chart}/{min(limit, 200)}/apps.json"
        )
        try:
            data = await self._request(url, params={}, proxy_url=proxy_url)
            return data.get("feed", {}).get("results", [])
        except Exception:
            logger.error(f"Top charts API failed for country={country}, chart={chart}")
            return []

    @staticmethod
    def parse_app(raw: dict[str, Any]) -> dict[str, Any]:
        """Parse raw iTunes API response into our app schema."""
        release_date = None
        if raw.get("releaseDate"):
            try:
                release_date = datetime.fromisoformat(
                    raw["releaseDate"].replace("Z", "+00:00")
                ).date()
            except (ValueError, AttributeError):
                pass

        updated_date = None
        if raw.get("currentVersionReleaseDate"):
            try:
                updated_date = datetime.fromisoformat(
                    raw["currentVersionReleaseDate"].replace("Z", "+00:00")
                )
            except (ValueError, AttributeError):
                pass

        return {
            "itunes_id": raw.get("trackId"),
            "bundle_id": raw.get("bundleId"),
            "name": raw.get("trackName", "Unknown"),
            "developer": raw.get("artistName"),
            "average_rating": raw.get("averageUserRating"),
            "rating_count": raw.get("userRatingCount", 0),
            "current_version": raw.get("version"),
            "price": raw.get("price", 0.0),
            "currency": raw.get("currency", "USD"),
            "icon_url": raw.get("artworkUrl512") or raw.get("artworkUrl100"),
            "store_url": raw.get("trackViewUrl"),
            "description": raw.get("description"),
            "content_rating": raw.get("contentAdvisoryRating"),
            "genre_id": raw.get("primaryGenreId"),
            "genre_name": raw.get("primaryGenreName"),
            "release_date": release_date,
            "updated_date": updated_date,
            "raw_json": raw,
        }


# Singleton
itunes_client = ITunesClient()
