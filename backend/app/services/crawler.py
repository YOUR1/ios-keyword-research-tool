"""
Crawl orchestration service.

Handles the full crawl pipeline:
1. Iterate over categories and search terms
2. Fetch apps from iTunes API
3. Upsert into database
4. Record rating history snapshots
5. Recompute weighted scores
6. Log crawl metadata
"""

import logging
import time
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.models import App, Category, Country, RatingHistory, CrawlLog
from app.services.itunes import itunes_client, ITunesClient
from app.services.scoring import compute_weighted_score, get_global_mean_rating
from app.services.keyword_expansion import expand_keywords, expand_all_categories
from app.core.config import settings
from app.utils.constants import ITUNES_CATEGORIES, SEARCH_TERMS

logger = logging.getLogger(__name__)


async def ensure_country(db: AsyncSession, code: str) -> Country:
    """Get or create a country record."""
    result = await db.execute(select(Country).where(Country.code == code))
    country = result.scalar_one_or_none()
    if not country:
        country = Country(code=code, name=code)
        db.add(country)
        await db.flush()
    return country


async def ensure_category(db: AsyncSession, itunes_id: int, name: str) -> Category:
    """Get or create a category record."""
    result = await db.execute(
        select(Category).where(Category.itunes_id == itunes_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        cat = Category(itunes_id=itunes_id, name=name)
        db.add(cat)
        await db.flush()
    return cat


async def upsert_app(
    db: AsyncSession,
    parsed: dict,
    country: Country,
    category: Category | None,
    global_mean: float,
    min_ratings: int,
) -> App | None:
    """Insert or update an app record. Returns the app if successful."""
    if not parsed.get("itunes_id"):
        return None

    weighted = None
    if parsed.get("average_rating") and parsed.get("rating_count", 0) > 0:
        weighted = compute_weighted_score(
            parsed["average_rating"],
            parsed["rating_count"],
            global_mean,
            min_ratings,
        )

    values = {
        # Core fields
        "itunes_id": parsed["itunes_id"],
        "bundle_id": parsed.get("bundle_id"),
        "name": parsed["name"],
        "developer": parsed.get("developer"),
        "category_id": category.id if category else None,
        "country_id": country.id,
        "average_rating": parsed.get("average_rating"),
        "rating_count": parsed.get("rating_count", 0),
        "weighted_score": weighted,
        "current_version": parsed.get("current_version"),
        "price": parsed.get("price", 0.0),
        "currency": parsed.get("currency", "USD"),
        "icon_url": parsed.get("icon_url"),
        "store_url": parsed.get("store_url"),
        "description": parsed.get("description"),
        "content_rating": parsed.get("content_rating"),
        "release_date": parsed.get("release_date"),
        "updated_date": parsed.get("updated_date"),
        "raw_json": parsed.get("raw_json"),
        # Extended iTunes API fields
        "genres": parsed.get("genres"),
        "genre_ids": parsed.get("genre_ids"),
        "release_notes": parsed.get("release_notes"),
        "file_size_bytes": parsed.get("file_size_bytes"),
        "seller_name": parsed.get("seller_name"),
        "seller_url": parsed.get("seller_url"),
        "minimum_os_version": parsed.get("minimum_os_version"),
        "languages": parsed.get("languages"),
        "advisories": parsed.get("advisories"),
        "features": parsed.get("features"),
        "screenshot_urls": parsed.get("screenshot_urls"),
        "ipad_screenshot_urls": parsed.get("ipad_screenshot_urls"),
        "supported_devices": parsed.get("supported_devices"),
        "artist_id": parsed.get("artist_id"),
        "artist_view_url": parsed.get("artist_view_url"),
        "is_game_center_enabled": parsed.get("is_game_center_enabled"),
        "formatted_price": parsed.get("formatted_price"),
    }

    # PostgreSQL upsert (INSERT ... ON CONFLICT UPDATE)
    stmt = pg_insert(App).values(**values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_app_country",
        set_={
            # Core fields
            "name": stmt.excluded.name,
            "developer": stmt.excluded.developer,
            "average_rating": stmt.excluded.average_rating,
            "rating_count": stmt.excluded.rating_count,
            "weighted_score": stmt.excluded.weighted_score,
            "current_version": stmt.excluded.current_version,
            "price": stmt.excluded.price,
            "icon_url": stmt.excluded.icon_url,
            "store_url": stmt.excluded.store_url,
            "description": stmt.excluded.description,
            "content_rating": stmt.excluded.content_rating,
            "updated_date": stmt.excluded.updated_date,
            "raw_json": stmt.excluded.raw_json,
            # Extended iTunes API fields
            "genres": stmt.excluded.genres,
            "genre_ids": stmt.excluded.genre_ids,
            "release_notes": stmt.excluded.release_notes,
            "file_size_bytes": stmt.excluded.file_size_bytes,
            "seller_name": stmt.excluded.seller_name,
            "seller_url": stmt.excluded.seller_url,
            "minimum_os_version": stmt.excluded.minimum_os_version,
            "languages": stmt.excluded.languages,
            "advisories": stmt.excluded.advisories,
            "features": stmt.excluded.features,
            "screenshot_urls": stmt.excluded.screenshot_urls,
            "ipad_screenshot_urls": stmt.excluded.ipad_screenshot_urls,
            "supported_devices": stmt.excluded.supported_devices,
            "artist_id": stmt.excluded.artist_id,
            "artist_view_url": stmt.excluded.artist_view_url,
            "is_game_center_enabled": stmt.excluded.is_game_center_enabled,
            "formatted_price": stmt.excluded.formatted_price,
        },
    ).returning(App.id)

    result = await db.execute(stmt)
    app_id = result.scalar_one_or_none()

    if app_id:
        # Record rating history snapshot
        history = RatingHistory(
            app_id=app_id,
            average_rating=parsed.get("average_rating"),
            rating_count=parsed.get("rating_count", 0),
            weighted_score=weighted,
            snapshot_date=date.today(),
        )
        db.add(history)

    return app_id


async def crawl_category(
    db: AsyncSession,
    category_id: int,
    category_name: str,
    country_code: str = "US",
    search_terms: list[str] | None = None,
) -> dict:
    """
    Crawl all apps in a given category for a country.

    Args:
        db: Database session
        category_id: iTunes category ID
        category_name: Category name
        country_code: Two-letter country code
        search_terms: Optional custom search terms (defaults to SEARCH_TERMS)

    Returns summary dict with counts.
    """
    start = time.time()
    country = await ensure_country(db, country_code)
    category = await ensure_category(db, category_id, category_name)

    min_ratings = settings.WEIGHTED_SCORE_MIN_RATINGS
    global_mean = await get_global_mean_rating(db, min_ratings)

    apps_found = 0
    apps_updated = 0
    errors = []

    # Use provided terms or fall back to static SEARCH_TERMS
    terms_to_use = search_terms if search_terms is not None else SEARCH_TERMS

    # Search using various terms to maximize coverage
    for term in terms_to_use:
        try:
            results = await itunes_client.search_by_genre(
                genre_id=category_id,
                country=country_code,
                letter=term,
                limit=200,
            )
            apps_found += len(results)

            for raw in results:
                parsed = ITunesClient.parse_app(raw)
                app_id = await upsert_app(
                    db, parsed, country, category, global_mean, min_ratings
                )
                if app_id:
                    apps_updated += 1

            await db.commit()

        except Exception as e:
            logger.error(
                f"Error crawling category {category_name} term '{term}': {e}"
            )
            errors.append(str(e))

    duration = time.time() - start

    # Log the crawl
    log = CrawlLog(
        source="itunes",
        country_code=country_code,
        category_id=category_id,
        search_term=f"category:{category_name}",
        status="completed" if not errors else "partial",
        apps_found=apps_found,
        apps_updated=apps_updated,
        error_message="; ".join(errors) if errors else None,
        duration_seconds=duration,
    )
    db.add(log)
    await db.commit()

    return {
        "category": category_name,
        "country": country_code,
        "apps_found": apps_found,
        "apps_updated": apps_updated,
        "duration": duration,
        "errors": errors,
    }


async def crawl_all_categories(
    db: AsyncSession,
    country_code: str = "US",
    use_keyword_expansion: bool = True,
) -> list[dict]:
    """
    Crawl all known iOS App Store categories for a country.

    Args:
        db: Database session
        country_code: Two-letter country code
        use_keyword_expansion: Whether to use AI-expanded keywords (if enabled)
    """
    # Expand keywords for all categories at once (if enabled)
    expanded_keywords: dict[int, list[str]] = {}
    if use_keyword_expansion and settings.KEYWORD_EXPANSION_ENABLED:
        logger.info("Expanding keywords for all categories using OpenAI")
        expanded_keywords = await expand_all_categories(use_cache=True)

    results = []
    for cat_id, cat_name in ITUNES_CATEGORIES.items():
        logger.info(f"Crawling category: {cat_name} ({cat_id}) for {country_code}")

        # Use expanded keywords if available, otherwise None (will use static terms)
        terms = expanded_keywords.get(cat_id) if expanded_keywords else None

        result = await crawl_category(
            db, cat_id, cat_name, country_code, search_terms=terms
        )
        results.append(result)
    return results
