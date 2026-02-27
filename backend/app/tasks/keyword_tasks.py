"""
Celery tasks for keyword-based crawling, token cleanup, and proxy health checks.

Uses the same sync-to-async bridge pattern as crawl_tasks.py:
Celery workers run synchronously, so async code is executed via
asyncio.new_event_loop().run_until_complete().
"""

import asyncio
import logging
from datetime import datetime

from sqlalchemy import select, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

import redis as sync_redis

from app.tasks.celery_app import celery_app
from app.services.keyword_crawler import crawl_keyword
from app.services.reviews import review_crawler
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_async_session() -> async_sessionmaker[AsyncSession]:
    """Create a fresh async session factory for worker context."""
    engine = create_async_engine(settings.database_url, pool_size=5)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _run_async(coro):
    """Run an async coroutine in a new event loop (for Celery workers).

    Each call creates and sets a new event loop so that asyncio primitives
    (Semaphores, etc.) created during execution are bound to the active loop.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
        asyncio.set_event_loop(None)


@celery_app.task(
    name="app.tasks.keyword_tasks.dispatch_due_keywords",
)
def dispatch_due_keywords():
    """
    Periodic task (every 60s): find keywords due for crawling and dispatch jobs.

    Queries active keywords where next_run_at <= now, creates a CrawlJob for each,
    and enqueues crawl_keyword_task. Uses Redis-based dedup locks to prevent
    double-dispatching the same keyword.
    """
    logger.info("Dispatching due keywords")

    async def _dispatch():
        from app.models.keyword import UserKeyword, CrawlJob

        session_factory = _get_async_session()
        dispatched = 0

        # Use sync Redis for dedup locks in Celery worker context
        redis_conn = sync_redis.from_url(settings.REDIS_URL)

        try:
            async with session_factory() as db:
                # Find keywords that are due for crawling
                now = datetime.utcnow()
                result = await db.execute(
                    select(UserKeyword).where(
                        UserKeyword.is_active == True,
                        UserKeyword.next_run_at <= now,
                        UserKeyword.crawl_frequency != "manual",
                    ).limit(100)  # Process in batches
                )
                keywords = result.scalars().all()

                for keyword in keywords:
                    # Redis dedup lock: prevent re-dispatching within 5 minutes
                    lock_key = f"crawl_lock:keyword:{keyword.id}"
                    if redis_conn.set(lock_key, "1", nx=True, ex=300):
                        # Create a new CrawlJob
                        job = CrawlJob(
                            keyword_id=keyword.id,
                            user_id=keyword.user_id,
                            status="pending",
                        )
                        db.add(job)
                        await db.flush()  # Get the job ID

                        # Enqueue the crawl task
                        task = crawl_keyword_task.apply_async(
                            args=[job.id],
                            task_id=f"crawl-kw-{keyword.id}-{job.id}",
                        )

                        # Store celery task ID on the job
                        job.celery_task_id = task.id
                        dispatched += 1

                        logger.info(
                            f"Dispatched job {job.id} for keyword '{keyword.term}' "
                            f"(user_id={keyword.user_id})"
                        )
                    else:
                        logger.debug(
                            f"Keyword {keyword.id} already locked, skipping"
                        )

                await db.commit()

        finally:
            redis_conn.close()

        logger.info(f"Dispatched {dispatched} keyword crawl jobs")
        return {"dispatched": dispatched}

    return _run_async(_dispatch())


@celery_app.task(
    name="app.tasks.keyword_tasks.initial_keyword_setup_task",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
)
def initial_keyword_setup_task(self, job_id: int):
    """
    Combined task for initial keyword setup: crawl + analyze.

    Used when a new keyword is created to automatically fetch data
    and compute metrics without manual intervention.
    """
    logger.info(f"Starting initial keyword setup for job_id={job_id}")

    async def _setup():
        from app.models.keyword import CrawlJob, UserKeyword, KeywordAppResult
        from app.models.models import App
        from app.services.keyword_research import KeywordResearchService
        from sqlalchemy.orm import selectinload

        session_factory = _get_async_session()
        async with session_factory() as db:
            # Step 1: Run the crawl
            crawl_result = await crawl_keyword(db, job_id)
            logger.info(
                f"Crawl completed: {crawl_result.get('apps_found', 0)} found, "
                f"{crawl_result.get('apps_new', 0)} new"
            )

            # Step 2: Get the keyword for analysis
            job = await db.get(CrawlJob, job_id)
            if not job:
                return crawl_result

            keyword_result = await db.execute(
                select(UserKeyword).where(UserKeyword.id == job.keyword_id)
            )
            keyword = keyword_result.scalar_one_or_none()
            if not keyword:
                return crawl_result

            # Step 3: Run keyword analysis
            logger.info(f"Running analysis for keyword '{keyword.term}'")
            try:
                service = KeywordResearchService(db)
                metrics = await service.analyze_keyword(
                    keyword,
                    proxy_url=None,
                    force_refresh=False,  # Use the data we just crawled
                )

                # Save metrics snapshot
                await service.save_metrics(keyword, metrics)
                logger.info(
                    f"Analysis saved: popularity={metrics.get('popularity_score')}, "
                    f"difficulty={metrics.get('difficulty_score')}, "
                    f"opportunity={metrics.get('opportunity_score')}"
                )

                crawl_result["analysis"] = {
                    "popularity_score": metrics.get("popularity_score"),
                    "difficulty_score": metrics.get("difficulty_score"),
                    "opportunity_score": metrics.get("opportunity_score"),
                }
            except Exception as e:
                logger.warning(f"Analysis failed for keyword {keyword.id}: {e}")
                crawl_result["analysis_error"] = str(e)

            # Step 4: Crawl reviews for found apps
            app_ids_result = await db.execute(
                select(KeywordAppResult.app_id).where(
                    KeywordAppResult.crawl_job_id == job_id
                )
            )
            app_ids = [row[0] for row in app_ids_result.all()]

            if app_ids:
                apps_result = await db.execute(
                    select(App)
                    .options(selectinload(App.country))
                    .where(App.id.in_(app_ids))
                )
                apps = apps_result.scalars().all()

                total_reviews = 0
                for app in apps:
                    try:
                        summary = await review_crawler.crawl_reviews_for_app(db, app)
                        total_reviews += summary["reviews_upserted"]
                    except Exception as e:
                        logger.warning(f"Review crawl failed for app {app.id}: {e}")

                logger.info(f"Reviews crawled: {total_reviews} across {len(apps)} apps")
                crawl_result["reviews_crawled"] = total_reviews

            return crawl_result

    try:
        result = _run_async(_setup())
        logger.info(f"Initial keyword setup completed for job {job_id}")
        return result
    except Exception as exc:
        logger.error(f"Initial keyword setup failed for job {job_id}: {exc}")
        if self.request.retries >= self.max_retries:
            async def _mark_failed():
                from app.models.keyword import CrawlJob
                session_factory = _get_async_session()
                async with session_factory() as db:
                    job = await db.get(CrawlJob, job_id)
                    if job and job.status != "completed":
                        job.status = "failed"
                        job.error_message = f"Initial setup failed: {exc}"
                        job.completed_at = datetime.utcnow()
                        await db.commit()

            _run_async(_mark_failed())
            return {"job_id": job_id, "status": "failed", "error": str(exc)}

        raise self.retry(exc=exc)


@celery_app.task(
    name="app.tasks.keyword_tasks.crawl_keyword_task",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
)
def crawl_keyword_task(self, job_id: int):
    """
    Execute a single keyword crawl job with auto-analysis.

    Loads the job from the database, runs the keyword crawler,
    then automatically runs analysis to compute metrics.
    Retries on transient failures.
    """
    logger.info(f"Starting keyword crawl for job_id={job_id}")

    async def _crawl_and_analyze():
        from app.models.keyword import CrawlJob, UserKeyword, KeywordAppResult
        from app.models.models import App
        from app.services.keyword_research import KeywordResearchService
        from sqlalchemy.orm import selectinload

        session_factory = _get_async_session()
        async with session_factory() as db:
            # Step 1: Run the crawl
            result = await crawl_keyword(db, job_id)
            logger.info(
                f"Keyword crawl job {job_id} completed: "
                f"{result.get('apps_found', 0)} found, {result.get('apps_new', 0)} new"
            )

            # Step 2: Run analysis
            job = await db.get(CrawlJob, job_id)
            if job:
                keyword_result = await db.execute(
                    select(UserKeyword).where(UserKeyword.id == job.keyword_id)
                )
                keyword = keyword_result.scalar_one_or_none()

                if keyword:
                    logger.info(f"Running analysis for keyword '{keyword.term}'")
                    try:
                        service = KeywordResearchService(db)
                        metrics = await service.analyze_keyword(
                            keyword,
                            proxy_url=None,
                            force_refresh=False,
                        )
                        await service.save_metrics(keyword, metrics)
                        logger.info(
                            f"Analysis saved: popularity={metrics.get('popularity_score')}, "
                            f"difficulty={metrics.get('difficulty_score')}"
                        )
                        result["analysis"] = {
                            "popularity_score": metrics.get("popularity_score"),
                            "difficulty_score": metrics.get("difficulty_score"),
                            "opportunity_score": metrics.get("opportunity_score"),
                        }
                    except Exception as e:
                        logger.warning(f"Analysis failed for keyword {keyword.id}: {e}")
                        result["analysis_error"] = str(e)

            # Step 3: Crawl reviews for found apps
            app_ids_result = await db.execute(
                select(KeywordAppResult.app_id).where(
                    KeywordAppResult.crawl_job_id == job_id
                )
            )
            app_ids = [row[0] for row in app_ids_result.all()]

            if app_ids:
                apps_result = await db.execute(
                    select(App)
                    .options(selectinload(App.country))
                    .where(App.id.in_(app_ids))
                )
                apps = apps_result.scalars().all()

                total_reviews = 0
                for app in apps:
                    try:
                        summary = await review_crawler.crawl_reviews_for_app(db, app)
                        total_reviews += summary["reviews_upserted"]
                    except Exception as e:
                        logger.warning(f"Review crawl failed for app {app.id}: {e}")

                logger.info(f"Review crawl for job {job_id}: {total_reviews} reviews across {len(apps)} apps")
                result["reviews_crawled"] = total_reviews

            return result

    try:
        result = _run_async(_crawl_and_analyze())
        return result
    except Exception as exc:
        logger.error(f"Keyword crawl job {job_id} failed: {exc}")
        # Mark the job as failed if retries are exhausted
        if self.request.retries >= self.max_retries:
            async def _mark_failed():
                from app.models.keyword import CrawlJob
                session_factory = _get_async_session()
                async with session_factory() as db:
                    job = await db.get(CrawlJob, job_id)
                    if job and job.status != "completed":
                        job.status = "failed"
                        job.error_message = f"Max retries exceeded: {exc}"
                        job.completed_at = datetime.utcnow()
                        await db.commit()

            _run_async(_mark_failed())
            return {"job_id": job_id, "status": "failed", "error": str(exc)}

        raise self.retry(exc=exc)


@celery_app.task(
    name="app.tasks.keyword_tasks.cleanup_expired_tokens",
)
def cleanup_expired_tokens():
    """
    Periodic task: delete expired and revoked refresh tokens.

    Runs daily to keep the refresh_tokens table clean.
    """
    logger.info("Cleaning up expired refresh tokens")

    async def _cleanup():
        from app.models.user import RefreshToken

        session_factory = _get_async_session()
        async with session_factory() as db:
            now = datetime.utcnow()
            result = await db.execute(
                delete(RefreshToken).where(
                    or_(
                        RefreshToken.expires_at < now,
                        RefreshToken.revoked == True,
                    )
                )
            )
            await db.commit()
            deleted = result.rowcount
            logger.info(f"Deleted {deleted} expired/revoked refresh tokens")
            return {"deleted": deleted}

    return _run_async(_cleanup())


@celery_app.task(
    name="app.tasks.keyword_tasks.check_proxy_health",
)
def check_proxy_health():
    """
    Periodic task: run health checks on all configured proxy providers.

    Reports results to logs for monitoring. Skips if proxies are disabled.
    """
    if not settings.PROXY_ENABLED:
        logger.debug("Proxy health check skipped: proxies disabled")
        return {"skipped": True, "reason": "proxies_disabled"}

    logger.info("Running proxy health checks")

    async def _check():
        results = []

        # Check IPRoyal
        if settings.IPROYAL_USER and settings.IPROYAL_PASS:
            from app.services.proxy.iproyal import IPRoyalProvider
            provider = IPRoyalProvider(
                user=settings.IPROYAL_USER,
                password=settings.IPROYAL_PASS,
            )
            result = await provider.health_check()
            results.append(result)
            logger.info(f"IPRoyal health: {result}")

        # Check Bright Data
        if settings.BRIGHTDATA_CUSTOMER_ID and settings.BRIGHTDATA_PASS:
            from app.services.proxy.brightdata import BrightDataProvider
            provider = BrightDataProvider(
                customer_id=settings.BRIGHTDATA_CUSTOMER_ID,
                zone=settings.BRIGHTDATA_ZONE,
                password=settings.BRIGHTDATA_PASS,
            )
            result = await provider.health_check()
            results.append(result)
            logger.info(f"Bright Data health: {result}")

        return {"checks": results}

    return _run_async(_check())
