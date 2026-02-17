"""
Usage tracking and quota enforcement.
"""

from datetime import date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.keyword import CrawlJob, KeywordAppResult, UserKeyword
from app.models.billing import UsageRecord
from app.models.user import User


async def get_keyword_count(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count(UserKeyword.id)).where(UserKeyword.user_id == user_id)
    )
    return result.scalar() or 0


async def get_crawls_today(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count(CrawlJob.id)).where(
            CrawlJob.user_id == user_id,
            func.date(CrawlJob.created_at) == date.today(),
        )
    )
    return result.scalar() or 0


async def get_results_count(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count(KeywordAppResult.id))
        .join(UserKeyword, KeywordAppResult.keyword_id == UserKeyword.id)
        .where(UserKeyword.user_id == user_id)
    )
    return result.scalar() or 0


async def check_keyword_quota(db: AsyncSession, user: User) -> bool:
    count = await get_keyword_count(db, user.id)
    return count < user.plan.max_keywords


async def check_crawl_quota(db: AsyncSession, user: User) -> bool:
    count = await get_crawls_today(db, user.id)
    return count < user.plan.max_crawls_per_day


async def record_usage(db: AsyncSession, user_id: int, usage_type: str, quantity: int = 1):
    record = UsageRecord(
        user_id=user_id,
        usage_type=usage_type,
        quantity=quantity,
    )
    db.add(record)
