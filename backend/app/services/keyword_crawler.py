"""
Keyword-based crawl orchestration service.

Handles crawling per user keyword:
1. Load CrawlJob + UserKeyword from DB
2. Search iTunes API using the keyword term
3. Upsert found apps into the global apps table (reusing existing upsert logic)
4. Create/update KeywordAppResult entries linking keywords to discovered apps
5. Update job and keyword metadata (status, timestamps, counts)
"""

import logging
import time
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.models import App, Category, Country
from app.models.keyword import CrawlJob, UserKeyword, KeywordAppResult
from app.services.itunes import itunes_client, ITunesClient
from app.services.crawler import ensure_country, ensure_category, upsert_app
from app.services.scoring import get_global_mean_rating
from app.services.keyword_expansion import expand_user_keyword
from app.core.config import settings

logger = logging.getLogger(__name__)

# Mapping from crawl_frequency to timedelta for scheduling the next run
FREQUENCY_INTERVALS = {
    "daily": timedelta(days=1),
    "weekly": timedelta(weeks=1),
    "manual": None,  # No automatic rescheduling
}


async def crawl_keyword(
    db: AsyncSession,
    job_id: int,
    proxy_url: str | None = None,
) -> dict:
    """
    Execute a keyword crawl job.

    This is the main entry point called by the Celery task. It loads
    the job and keyword from the database, searches iTunes, upserts
    found apps, and records results.

    Args:
        db: Async database session.
        job_id: ID of the CrawlJob to execute.
        proxy_url: Optional proxy URL for iTunes API requests.

    Returns:
        Summary dict with job results.
    """
    # 1. Load CrawlJob and associated UserKeyword
    job = await db.get(CrawlJob, job_id)
    if not job:
        raise ValueError(f"CrawlJob {job_id} not found")

    keyword = await db.get(UserKeyword, job.keyword_id)
    if not keyword:
        raise ValueError(f"UserKeyword {job.keyword_id} not found for job {job_id}")

    # 2. Update job status to running
    job.status = "running"
    job.started_at = datetime.utcnow()
    await db.commit()

    start_time = time.time()
    apps_found = 0
    apps_upserted = 0
    error_message = None

    try:
        # 3. Prepare country and category
        country = await ensure_country(db, keyword.country_code)

        category = None
        if keyword.category_id:
            result = await db.execute(
                select(Category).where(Category.id == keyword.category_id)
            )
            category = result.scalar_one_or_none()

        # Get global mean for weighted score computation
        min_ratings = settings.WEIGHTED_SCORE_MIN_RATINGS
        global_mean = await get_global_mean_rating(db, min_ratings)

        # 4. Build search terms list
        # Use stored sub_keywords if expansion is enabled, otherwise just the main term
        if keyword.expansion_enabled and keyword.sub_keywords:
            search_terms = [keyword.term] + keyword.sub_keywords
            logger.info(
                f"Job {job_id}: using stored sub-keywords for '{keyword.term}': "
                f"{len(search_terms)} terms"
            )
        elif keyword.expansion_enabled:
            # Expansion enabled but no stored sub_keywords - generate on the fly
            category_name = category.name if category else None
            search_terms = await expand_user_keyword(
                keyword.term,
                category_name=category_name,
                use_cache=True,
            )
            logger.info(
                f"Job {job_id}: expanded '{keyword.term}' into {len(search_terms)} terms"
            )
        else:
            # Expansion disabled - only search the main term
            search_terms = [keyword.term]
            logger.info(f"Job {job_id}: expansion disabled, using only '{keyword.term}'")

        # 5. Search iTunes API using all expanded terms
        all_results = []
        seen_itunes_ids = set()

        for term in search_terms:
            try:
                if category and category.itunes_id:
                    # Search within specific genre if category is set
                    results = await itunes_client.search_by_genre(
                        genre_id=category.itunes_id,
                        country=keyword.country_code,
                        letter=term,
                        limit=200,
                        proxy_url=proxy_url,
                    )
                else:
                    # General search by term
                    results = await itunes_client.search(
                        term=term,
                        country=keyword.country_code,
                        limit=200,
                        proxy_url=proxy_url,
                    )

                # Deduplicate by itunes_id
                for result in results:
                    itunes_id = result.get("trackId")
                    if itunes_id and itunes_id not in seen_itunes_ids:
                        seen_itunes_ids.add(itunes_id)
                        all_results.append(result)

            except Exception as e:
                logger.warning(f"Job {job_id}: search for term '{term}' failed: {e}")
                continue

        apps_found = len(all_results)
        logger.info(
            f"Job {job_id}: found {apps_found} unique apps for keyword '{keyword.term}' "
            f"({len(search_terms)} terms searched) in {keyword.country_code}"
        )

        # 6. Upsert each found app and create KeywordAppResult entries
        for raw in all_results:
            parsed = ITunesClient.parse_app(raw)
            if not parsed.get("itunes_id"):
                continue

            # Handle category from the raw result if not already set
            result_category = category
            if not result_category and parsed.get("genre_id") and parsed.get("genre_name"):
                result_category = await ensure_category(
                    db, parsed["genre_id"], parsed["genre_name"]
                )

            # Reuse existing upsert logic from crawler.py
            app_id = await upsert_app(
                db, parsed, country, result_category, global_mean, min_ratings
            )

            if app_id:
                # Create or update KeywordAppResult
                result_stmt = pg_insert(KeywordAppResult).values(
                    keyword_id=keyword.id,
                    app_id=app_id,
                    crawl_job_id=job.id,
                    first_seen_at=datetime.utcnow(),
                    last_seen_at=datetime.utcnow(),
                )
                result_stmt = result_stmt.on_conflict_do_update(
                    constraint="uq_keyword_app",
                    set_={
                        "last_seen_at": datetime.utcnow(),
                        "crawl_job_id": job.id,
                    },
                )
                await db.execute(result_stmt)

                apps_upserted += 1

        await db.commit()

    except Exception as e:
        error_message = str(e)
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)

    # 7. Update CrawlJob with results
    duration = time.time() - start_time
    job.status = "completed" if not error_message else "failed"
    job.apps_found = apps_found
    job.apps_new = apps_upserted
    job.error_message = error_message
    job.duration_seconds = duration
    job.completed_at = datetime.utcnow()
    if proxy_url:
        # Store provider name, not the full URL (which contains credentials)
        job.proxy_used = "proxy"

    # 8. Update keyword scheduling
    keyword.last_crawled_at = datetime.utcnow()
    interval = FREQUENCY_INTERVALS.get(keyword.crawl_frequency)
    if interval:
        keyword.next_run_at = datetime.utcnow() + interval
    else:
        # Manual frequency: don't reschedule
        keyword.next_run_at = None

    await db.commit()

    summary = {
        "job_id": job_id,
        "keyword": keyword.term,
        "country": keyword.country_code,
        "status": job.status,
        "apps_found": apps_found,
        "apps_upserted": apps_upserted,
        "duration_seconds": duration,
        "error": error_message,
    }
    logger.info(f"Job {job_id} finished: {summary}")
    return summary
