"""
Celery tasks for App Store scraping.

These tasks scrape additional metadata from App Store pages that
is not available through the iTunes Search API.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.tasks.celery_app import celery_app
from app.services.app_store_scraper import app_store_scraper
from app.models.models import App
from app.core.config import settings

logger = logging.getLogger(__name__)

# Default scrape interval (7 days)
SCRAPE_INTERVAL_DAYS = 7


def _get_async_session() -> async_sessionmaker[AsyncSession]:
    """Create a fresh async session factory for worker context."""
    engine = create_async_engine(settings.database_url, pool_size=5)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _run_async(coro):
    """Run an async coroutine in a new event loop (for Celery workers)."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
        asyncio.set_event_loop(None)


@celery_app.task(
    name="app.tasks.scrape_tasks.scrape_app_metadata",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def scrape_app_metadata(self, app_id: int):
    """
    Scrape metadata for a single app from App Store page.

    Args:
        app_id: Database ID of the app to scrape.
    """
    logger.info(f"Scraping metadata for app ID: {app_id}")

    async def _scrape():
        session_factory = _get_async_session()
        async with session_factory() as db:
            # Get the app
            result = await db.execute(
                select(App).where(App.id == app_id)
            )
            app = result.scalar_one_or_none()

            if not app:
                logger.warning(f"App {app_id} not found")
                return {"status": "not_found"}

            # Get country code
            country_code = "us"
            if app.country:
                await db.refresh(app, ["country"])
                country_code = app.country.code.lower()

            # Scrape the app
            scraped = await app_store_scraper.scrape_app(
                itunes_id=app.itunes_id,
                country=country_code,
            )

            # Update app with scraped data
            app.subtitle = scraped.get("subtitle")
            app.promotional_text = scraped.get("promotional_text")
            app.privacy_info = scraped.get("privacy_info")
            app.in_app_purchases = scraped.get("in_app_purchases")
            app.last_scraped_at = scraped.get("last_scraped_at")
            app.scrape_status = scraped.get("scrape_status")

            await db.commit()

            return {
                "status": "success",
                "app_id": app_id,
                "scrape_status": scraped.get("scrape_status"),
                "has_subtitle": bool(scraped.get("subtitle")),
                "has_privacy_info": bool(scraped.get("privacy_info")),
                "has_iaps": bool(scraped.get("in_app_purchases")),
            }

    try:
        result = _run_async(_scrape())
        logger.info(f"Scrape complete for app {app_id}: {result}")
        return result
    except Exception as exc:
        logger.error(f"Scrape failed for app {app_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.tasks.scrape_tasks.scrape_stale_apps",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
)
def scrape_stale_apps(self, limit: int = 50):
    """
    Queue scraping for apps that need a metadata refresh.

    Targets apps where:
    - Never scraped (scrape_status is NULL)
    - Scrape failed (scrape_status == 'failed')
    - Stale (last_scraped_at > SCRAPE_INTERVAL_DAYS ago)

    Args:
        limit: Maximum number of apps to queue for scraping.
    """
    logger.info(f"Finding stale apps to scrape (limit={limit})")

    async def _find_and_queue():
        session_factory = _get_async_session()
        async with session_factory() as db:
            stale_threshold = datetime.now(timezone.utc) - timedelta(days=SCRAPE_INTERVAL_DAYS)

            # Find apps needing scrape
            result = await db.execute(
                select(App.id)
                .where(
                    or_(
                        App.scrape_status.is_(None),
                        App.scrape_status == "pending",
                        App.scrape_status == "failed",
                        App.last_scraped_at < stale_threshold,
                    )
                )
                .order_by(
                    # Prioritize never-scraped apps
                    App.last_scraped_at.is_(None).desc(),
                    App.last_scraped_at.asc()
                )
                .limit(limit)
            )
            app_ids = result.scalars().all()

            return list(app_ids)

    try:
        app_ids = _run_async(_find_and_queue())
        logger.info(f"Found {len(app_ids)} apps to scrape")

        # Queue individual scrape tasks
        for app_id in app_ids:
            scrape_app_metadata.delay(app_id)

        return {
            "status": "success",
            "apps_queued": len(app_ids),
        }
    except Exception as exc:
        logger.error(f"Failed to queue stale app scrapes: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.scrape_tasks.scrape_all_apps")
def scrape_all_apps(batch_size: int = 100, delay_seconds: int = 1):
    """
    Scrape all apps in batches.

    This is a long-running task that processes all apps in the database.
    Use with caution - it may take hours for large databases.

    Args:
        batch_size: Number of apps to process per batch.
        delay_seconds: Delay between batches.
    """
    logger.info("Starting full app metadata scrape")

    async def _scrape_all():
        session_factory = _get_async_session()
        total_scraped = 0
        total_success = 0
        total_failed = 0
        offset = 0

        while True:
            async with session_factory() as db:
                result = await db.execute(
                    select(App)
                    .offset(offset)
                    .limit(batch_size)
                )
                apps = result.scalars().all()

                if not apps:
                    break

                for app in apps:
                    country_code = "us"
                    if app.country:
                        await db.refresh(app, ["country"])
                        country_code = app.country.code.lower()

                    scraped = await app_store_scraper.scrape_app(
                        itunes_id=app.itunes_id,
                        country=country_code,
                    )

                    app.subtitle = scraped.get("subtitle")
                    app.promotional_text = scraped.get("promotional_text")
                    app.privacy_info = scraped.get("privacy_info")
                    app.in_app_purchases = scraped.get("in_app_purchases")
                    app.last_scraped_at = scraped.get("last_scraped_at")
                    app.scrape_status = scraped.get("scrape_status")

                    total_scraped += 1
                    if scraped.get("scrape_status") == "completed":
                        total_success += 1
                    else:
                        total_failed += 1

                await db.commit()
                logger.info(f"Scraped batch at offset {offset}: {len(apps)} apps")

            offset += batch_size
            await asyncio.sleep(delay_seconds)

        return {
            "total_scraped": total_scraped,
            "success": total_success,
            "failed": total_failed,
        }

    result = _run_async(_scrape_all())
    logger.info(f"Full scrape complete: {result}")
    return result
