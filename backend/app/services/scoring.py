"""
Weighted rating score calculator.

Implements IMDb-style Bayesian average (weighted rating):

    WeightedRating = (v / (v + m)) * R + (m / (v + m)) * C

Where:
    R = average rating for this app
    v = number of ratings for this app
    m = minimum ratings threshold (configurable)
    C = global mean rating across all qualifying apps

Lower score = worse app = higher rank in the "worst apps" index.
"""

import logging
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import App
from app.core.config import settings

logger = logging.getLogger(__name__)


def compute_weighted_score(
    average_rating: float,
    rating_count: int,
    global_mean: float,
    min_ratings: int,
) -> float:
    """
    Compute the Bayesian weighted average rating.

    Args:
        average_rating: App's average user rating (R)
        rating_count: Number of ratings for this app (v)
        global_mean: Mean rating across all qualifying apps (C)
        min_ratings: Minimum ratings threshold (m)

    Returns:
        Weighted score (float). Lower = worse.
    """
    v = rating_count
    m = min_ratings
    R = average_rating
    C = global_mean
    return (v / (v + m)) * R + (m / (v + m)) * C


async def get_global_mean_rating(
    db: AsyncSession,
    min_ratings: int | None = None,
) -> float:
    """Calculate the global mean rating across all qualifying apps."""
    m = min_ratings or settings.WEIGHTED_SCORE_MIN_RATINGS
    result = await db.execute(
        select(func.avg(App.average_rating)).where(
            App.rating_count >= m,
            App.average_rating.isnot(None),
        )
    )
    mean = result.scalar()
    return float(mean) if mean else 3.0  # Default to 3.0 if no data


async def recompute_all_scores(
    db: AsyncSession,
    min_ratings: int | None = None,
) -> int:
    """
    Recompute weighted_score for all apps in the database.

    Returns the number of apps updated.
    """
    m = min_ratings or settings.WEIGHTED_SCORE_MIN_RATINGS
    global_mean = await get_global_mean_rating(db, m)

    logger.info(
        f"Recomputing scores: global_mean={global_mean:.3f}, min_ratings={m}"
    )

    # Use a single SQL UPDATE for efficiency:
    # weighted_score = (v / (v + m)) * R + (m / (v + m)) * C
    stmt = (
        update(App)
        .where(
            App.average_rating.isnot(None),
            App.rating_count > 0,
        )
        .values(
            weighted_score=(
                (App.rating_count / (App.rating_count + m)) * App.average_rating
                + (m / (App.rating_count + m)) * global_mean
            )
        )
    )
    result = await db.execute(stmt)
    await db.commit()

    updated = result.rowcount
    logger.info(f"Updated weighted scores for {updated} apps")
    return updated
