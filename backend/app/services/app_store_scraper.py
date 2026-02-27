"""
App Store HTML scraper for metadata not available in iTunes API.

Scrapes data that's ONLY available on App Store web pages:
- subtitle (30 char tagline under app name)
- promotional_text (dynamic marketing text)
- privacy_info (privacy nutrition labels)
- in_app_purchases (IAP list with prices)
"""

import asyncio
import logging
import re
import json
from datetime import datetime, timezone
from typing import Any

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings

logger = logging.getLogger(__name__)

# Rate limit: 10 requests per minute (stricter than iTunes API)
APP_STORE_RATE_LIMIT = 10

_scrape_semaphore: asyncio.Semaphore | None = None
_scrape_semaphore_loop_id: int | None = None


def _get_scrape_semaphore() -> asyncio.Semaphore:
    """Get rate limiting semaphore for App Store scraping."""
    global _scrape_semaphore, _scrape_semaphore_loop_id
    try:
        current_loop_id = id(asyncio.get_running_loop())
    except RuntimeError:
        current_loop_id = None
    if _scrape_semaphore is None or _scrape_semaphore_loop_id != current_loop_id:
        _scrape_semaphore = asyncio.Semaphore(APP_STORE_RATE_LIMIT)
        _scrape_semaphore_loop_id = current_loop_id
    return _scrape_semaphore


class AppStoreScraper:
    """Async scraper for App Store web pages."""

    def __init__(self):
        self._client: httpx.AsyncClient | None = None
        self._client_loop_id: int | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
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
                timeout=30.0,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                },
                follow_redirects=True,
            )
            self._client_loop_id = current_loop_id
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _build_app_url(self, itunes_id: int, country: str = "us") -> str:
        """Build App Store URL for an app."""
        return f"https://apps.apple.com/{country.lower()}/app/id{itunes_id}"

    async def scrape_app(
        self,
        itunes_id: int,
        country: str = "us",
        proxy_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Scrape metadata from App Store page.

        Args:
            itunes_id: App's iTunes ID.
            country: Two-letter country code.
            proxy_url: Optional proxy URL.

        Returns:
            Dict with scraped fields:
            - subtitle
            - promotional_text
            - privacy_info
            - in_app_purchases
            - scrape_status
            - last_scraped_at
        """
        url = self._build_app_url(itunes_id, country)
        result = {
            "subtitle": None,
            "promotional_text": None,
            "privacy_info": None,
            "in_app_purchases": None,
            "scrape_status": "pending",
            "last_scraped_at": datetime.now(timezone.utc),
        }

        async with _get_scrape_semaphore():
            try:
                # Use proxy if provided
                if proxy_url:
                    client = httpx.AsyncClient(
                        proxy=proxy_url,
                        timeout=30.0,
                        headers={
                            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                            "Accept": "text/html,application/xhtml+xml",
                            "Accept-Language": "en-US,en;q=0.9",
                        },
                        follow_redirects=True,
                    )
                else:
                    client = await self._get_client()

                try:
                    response = await client.get(url)
                    response.raise_for_status()
                    html = response.text
                finally:
                    if proxy_url:
                        await client.aclose()

                # Parse HTML
                soup = BeautifulSoup(html, "html.parser")

                # Extract subtitle
                result["subtitle"] = self._extract_subtitle(soup)

                # Extract promotional text
                result["promotional_text"] = self._extract_promotional_text(soup)

                # Extract privacy info
                result["privacy_info"] = self._extract_privacy_info(soup)

                # Extract in-app purchases
                result["in_app_purchases"] = self._extract_in_app_purchases(soup)

                result["scrape_status"] = "completed"
                logger.debug(f"Successfully scraped app {itunes_id}")

            except httpx.HTTPStatusError as e:
                logger.warning(f"HTTP error scraping app {itunes_id}: {e.response.status_code}")
                result["scrape_status"] = "failed"
            except Exception as e:
                logger.error(f"Error scraping app {itunes_id}: {e}")
                result["scrape_status"] = "failed"

            # Rate limiting: wait between requests
            await asyncio.sleep(60.0 / APP_STORE_RATE_LIMIT)

        return result

    def _extract_subtitle(self, soup: BeautifulSoup) -> str | None:
        """Extract app subtitle from page."""
        # Try JSON-LD first (most reliable)
        json_ld = self._extract_json_ld(soup)
        if json_ld and json_ld.get("description"):
            # The short description in JSON-LD might contain the subtitle
            pass

        # Try product-header__subtitle
        subtitle_elem = soup.select_one("h2.product-header__subtitle")
        if subtitle_elem:
            text = subtitle_elem.get_text(strip=True)
            if text and len(text) <= 50:
                return text

        # Try alternative selector
        subtitle_elem = soup.select_one(".app-header__subtitle")
        if subtitle_elem:
            text = subtitle_elem.get_text(strip=True)
            if text and len(text) <= 50:
                return text

        # Try data attribute approach
        header = soup.select_one("[data-test-id='product-header']")
        if header:
            subtitle = header.select_one("h2")
            if subtitle:
                text = subtitle.get_text(strip=True)
                if text and len(text) <= 50:
                    return text

        return None

    def _extract_promotional_text(self, soup: BeautifulSoup) -> str | None:
        """Extract promotional text (dynamic marketing text)."""
        # Promotional text section
        promo_section = soup.select_one(".section--hero-text")
        if promo_section:
            text = promo_section.get_text(strip=True)
            if text and len(text) <= 200:
                return text

        # Alternative: promotional blurb
        promo_elem = soup.select_one(".promotional-text")
        if promo_elem:
            text = promo_elem.get_text(strip=True)
            if text and len(text) <= 200:
                return text

        return None

    def _extract_privacy_info(self, soup: BeautifulSoup) -> dict | None:
        """Extract privacy nutrition labels."""
        privacy_section = soup.select_one(".app-privacy")
        if not privacy_section:
            privacy_section = soup.select_one("[data-test-id='app-privacy']")

        if not privacy_section:
            return None

        privacy_data = {
            "data_linked_to_you": [],
            "data_not_linked_to_you": [],
            "data_used_to_track_you": [],
            "no_data_collected": False,
        }

        # Check for "No Data Collected" badge
        no_data = privacy_section.select_one(".privacy-type--no-data")
        if no_data:
            privacy_data["no_data_collected"] = True
            return privacy_data

        # Extract data categories
        for card in privacy_section.select(".privacy-type"):
            card_title = card.select_one(".privacy-type__heading")
            if not card_title:
                continue

            title_text = card_title.get_text(strip=True).lower()
            data_items = []

            for item in card.select(".privacy-type__data-category-heading"):
                item_text = item.get_text(strip=True)
                if item_text:
                    data_items.append(item_text)

            if "track you" in title_text:
                privacy_data["data_used_to_track_you"] = data_items
            elif "linked to you" in title_text:
                privacy_data["data_linked_to_you"] = data_items
            elif "not linked" in title_text:
                privacy_data["data_not_linked_to_you"] = data_items

        return privacy_data if any([
            privacy_data["data_linked_to_you"],
            privacy_data["data_not_linked_to_you"],
            privacy_data["data_used_to_track_you"],
            privacy_data["no_data_collected"],
        ]) else None

    def _extract_in_app_purchases(self, soup: BeautifulSoup) -> list | None:
        """Extract in-app purchases list."""
        iap_section = soup.select_one(".in-app-purchases")
        if not iap_section:
            iap_section = soup.select_one("[data-test-id='in-app-purchases']")

        if not iap_section:
            return None

        purchases = []
        for item in iap_section.select(".in-app-purchase"):
            name_elem = item.select_one(".in-app-purchase__name")
            price_elem = item.select_one(".in-app-purchase__price")

            if name_elem:
                purchase = {
                    "name": name_elem.get_text(strip=True),
                    "price": price_elem.get_text(strip=True) if price_elem else None,
                }
                purchases.append(purchase)

        return purchases if purchases else None

    def _extract_json_ld(self, soup: BeautifulSoup) -> dict | None:
        """Extract JSON-LD structured data."""
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "SoftwareApplication":
                    return data
            except (json.JSONDecodeError, TypeError):
                continue
        return None


# Singleton instance
app_store_scraper = AppStoreScraper()
