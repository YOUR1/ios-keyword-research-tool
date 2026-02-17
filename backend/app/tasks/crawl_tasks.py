"""
Celery tasks for crawling and score computation.

These tasks run in worker processes, using synchronous DB sessions
since Celery workers don't use asyncio by default.
"""

import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.tasks.celery_app import celery_app
from app.services.crawler import crawl_all_categories, crawl_category
from app.services.scoring import recompute_all_scores
from app.services.reviews import review_crawler
from app.models.models import App
from app.core.config import settings

logger = logging.getLogger(__name__)


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
    name="app.tasks.crawl_tasks.crawl_all_categories_task",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def crawl_all_categories_task(self, country_code: str = "US"):
    """Crawl all categories for a given country."""
    logger.info(f"Starting full crawl for country: {country_code}")

    async def _crawl():
        session_factory = _get_async_session()
        async with session_factory() as db:
            return await crawl_all_categories(db, country_code)

    try:
        results = _run_async(_crawl())
        total_found = sum(r["apps_found"] for r in results)
        total_updated = sum(r["apps_updated"] for r in results)
        logger.info(
            f"Crawl complete: {total_found} found, {total_updated} updated"
        )

        # Chain review crawl after app crawl
        crawl_reviews_task.delay()
        logger.info("Queued review crawl for all apps")

        return {
            "country": country_code,
            "categories_crawled": len(results),
            "total_apps_found": total_found,
            "total_apps_updated": total_updated,
        }
    except Exception as exc:
        logger.error(f"Crawl failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.tasks.crawl_tasks.crawl_category_task",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
)
def crawl_category_task(
    self,
    category_id: int,
    category_name: str,
    country_code: str = "US",
):
    """Crawl a single category."""
    logger.info(f"Crawling category {category_name} for {country_code}")

    async def _crawl():
        session_factory = _get_async_session()
        async with session_factory() as db:
            return await crawl_category(db, category_id, category_name, country_code)

    try:
        result = _run_async(_crawl())

        # Chain review crawl after category crawl
        crawl_reviews_task.delay()
        logger.info("Queued review crawl for all apps")

        return result
    except Exception as exc:
        logger.error(f"Category crawl failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.crawl_tasks.recompute_scores_task")
def recompute_scores_task(min_ratings: int | None = None):
    """Recompute weighted scores for all apps."""
    logger.info("Recomputing weighted scores")

    async def _recompute():
        session_factory = _get_async_session()
        async with session_factory() as db:
            return await recompute_all_scores(db, min_ratings)

    updated = _run_async(_recompute())
    logger.info(f"Recomputed scores for {updated} apps")
    return {"apps_updated": updated}


@celery_app.task(
    name="app.tasks.crawl_tasks.crawl_reviews_task",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def crawl_reviews_task(self):
    """Crawl customer reviews for all apps."""
    logger.info("Starting review crawl for all apps")

    async def _crawl():
        session_factory = _get_async_session()
        async with session_factory() as db:
            result = await db.execute(
                select(App).options(selectinload(App.country))
            )
            apps = result.scalars().all()

            total_reviews = 0
            errors = []
            for app in apps:
                try:
                    summary = await review_crawler.crawl_reviews_for_app(db, app)
                    total_reviews += summary["reviews_upserted"]
                except Exception as e:
                    logger.error(f"Review crawl failed for app {app.id}: {e}")
                    errors.append(f"app {app.id}: {e}")

            return {
                "apps_processed": len(apps),
                "total_reviews_upserted": total_reviews,
                "errors": len(errors),
            }

    try:
        result = _run_async(_crawl())
        logger.info(
            f"Review crawl complete: {result['apps_processed']} apps, "
            f"{result['total_reviews_upserted']} reviews"
        )
        return result
    except Exception as exc:
        logger.error(f"Review crawl failed: {exc}")
        raise self.retry(exc=exc)
