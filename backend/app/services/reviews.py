"""
Apple RSS customer reviews crawler.

Fetches reviews from the public Apple iTunes RSS feed:
https://itunes.apple.com/{country}/rss/customerreviews/id={itunes_id}/sortBy=mostRecent/json

Returns max ~50 reviews per app per country. No authentication required.
"""

import logging
from datetime import datetime

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.models import App, Review

logger = logging.getLogger(__name__)

RSS_URL_TEMPLATE = (
    "https://itunes.apple.com/{country}/rss/customerreviews"
    "/id={itunes_id}/sortBy=mostRecent/json"
)


class ReviewCrawler:
    """Crawls Apple RSS customer reviews for iOS apps."""

    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={"Accept": "application/json"},
                follow_redirects=True,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def fetch_reviews(self, itunes_id: int, country: str = "US") -> list[dict]:
        """
        Fetch customer reviews from Apple RSS JSON feed.

        Returns a list of parsed review dicts. Returns empty list if
        the feed is empty or the app has no reviews.
        """
        url = RSS_URL_TEMPLATE.format(country=country.lower(), itunes_id=itunes_id)
        client = await self._get_client()

        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPStatusError as e:
            logger.warning(
                f"RSS feed HTTP error for app {itunes_id} ({country}): {e.response.status_code}"
            )
            return []
        except Exception as e:
            logger.error(f"RSS feed request failed for app {itunes_id} ({country}): {e}")
            return []

        feed = data.get("feed", {})
        entries = feed.get("entry", [])

        if not entries:
            return []

        # RSS JSON returns a single dict when only 1 entry, list when multiple
        if isinstance(entries, dict):
            entries = [entries]

        reviews = []
        for entry in entries:
            # Skip the app metadata entry (has "im:name" but no "im:rating")
            if "im:rating" not in entry:
                continue

            try:
                review_date = None
                if entry.get("updated", {}).get("label"):
                    try:
                        review_date = datetime.fromisoformat(
                            entry["updated"]["label"].replace("Z", "+00:00")
                        )
                    except (ValueError, AttributeError):
                        pass

                reviews.append({
                    "author_name": entry.get("author", {}).get("name", {}).get("label", "Unknown"),
                    "author_url": entry.get("author", {}).get("uri", {}).get("label", ""),
                    "rating": int(entry.get("im:rating", {}).get("label", 0)),
                    "title": entry.get("title", {}).get("label"),
                    "body": entry.get("content", {}).get("label"),
                    "review_date": review_date,
                    "language": entry.get("content", {}).get("attributes", {}).get("type"),
                    "raw_json": entry,
                })
            except Exception as e:
                logger.warning(f"Failed to parse review entry: {e}")
                continue

        return reviews

    async def upsert_reviews(
        self, db: AsyncSession, app_id: int, reviews: list[dict]
    ) -> int:
        """
        Upsert reviews into the database.

        Uses PostgreSQL ON CONFLICT DO UPDATE on the (app_id, author_url)
        unique constraint. Returns count of upserted rows.
        """
        if not reviews:
            return 0

        upserted = 0
        for review in reviews:
            if not review.get("author_url"):
                continue

            values = {
                "app_id": app_id,
                "author_name": review["author_name"],
                "author_url": review["author_url"],
                "rating": review["rating"],
                "title": review.get("title"),
                "body": review.get("body"),
                "review_date": review.get("review_date"),
                "language": review.get("language"),
                "raw_json": review.get("raw_json"),
            }

            stmt = pg_insert(Review).values(**values)
            stmt = stmt.on_conflict_do_update(
                constraint="uq_review_app_author",
                set_={
                    "author_name": stmt.excluded.author_name,
                    "rating": stmt.excluded.rating,
                    "title": stmt.excluded.title,
                    "body": stmt.excluded.body,
                    "review_date": stmt.excluded.review_date,
                },
            )
            await db.execute(stmt)
            upserted += 1

        return upserted

    async def update_rating_distribution(
        self, db: AsyncSession, app_id: int
    ) -> None:
        """
        Compute and store rating distribution for an app.

        Queries review counts grouped by rating and writes the result
        as JSONB to apps.rating_distribution.
        """
        result = await db.execute(
            select(Review.rating, func.count())
            .where(Review.app_id == app_id)
            .group_by(Review.rating)
        )
        rows = result.all()

        distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
        for rating, count in rows:
            distribution[str(rating)] = count

        await db.execute(
            select(App).where(App.id == app_id)  # ensure app exists
        )
        from sqlalchemy import update
        await db.execute(
            update(App)
            .where(App.id == app_id)
            .values(rating_distribution=distribution)
        )

    async def crawl_reviews_for_app(self, db: AsyncSession, app: App) -> dict:
        """
        Full crawl pipeline for a single app: fetch → upsert → update distribution.

        Returns summary dict.
        """
        country_code = "US"
        if app.country:
            country_code = app.country.code

        reviews = await self.fetch_reviews(app.itunes_id, country_code)
        upserted = await self.upsert_reviews(db, app.id, reviews)

        if upserted > 0:
            await self.update_rating_distribution(db, app.id)

        await db.commit()

        return {
            "app_id": app.id,
            "itunes_id": app.itunes_id,
            "reviews_fetched": len(reviews),
            "reviews_upserted": upserted,
        }


# Singleton
review_crawler = ReviewCrawler()
