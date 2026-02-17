"""
ODE (Opportunity Discovery Engine) Celery Tasks

Scheduled and on-demand tasks for keyword discovery, opportunity scanning, and alerts.
"""
import asyncio
from datetime import datetime
from celery import shared_task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.services.ode import KeywordDiscoveryService, GoldmineService, AlertService


def get_async_session():
    """Create an async session for Celery tasks."""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    return async_session


def run_async(coro):
    """Run async coroutine in sync context."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# =============================================================================
# Keyword Discovery Tasks
# =============================================================================

@shared_task(name="app.tasks.ode_tasks.discover_keywords")
def discover_keywords_task(
    country_id: int | None = None,
    category_id: int | None = None,
    hours_back: int = 24,
    min_frequency: int = 3,
) -> dict:
    """
    Celery task: Discover trending keywords from recent app data.

    Args:
        country_id: Filter by country
        category_id: Filter by category
        hours_back: Lookback period in hours
        min_frequency: Minimum keyword frequency

    Returns:
        Discovery results summary
    """
    async def _discover():
        async_session = get_async_session()
        async with async_session() as session:
            service = KeywordDiscoveryService(session)

            keywords = await service.discover_keywords(
                country_id=country_id,
                category_id=category_id,
                hours_back=hours_back,
                min_frequency=min_frequency,
            )

            saved = await service.save_keywords(keywords)

            return {
                'status': 'completed',
                'discovered': len(keywords),
                'saved': saved,
                'timestamp': datetime.utcnow().isoformat(),
                'new_keywords': [
                    kw['keyword'] for kw in keywords if kw.get('is_new')
                ][:20],
            }

    return run_async(_discover())


@shared_task(name="app.tasks.ode_tasks.scheduled_keyword_discovery")
def scheduled_keyword_discovery_task() -> dict:
    """
    Scheduled task: Run keyword discovery for all active countries.
    Runs every 6 hours.
    """
    async def _discover_all():
        async_session = get_async_session()
        async with async_session() as session:
            from sqlalchemy import select
            from app.models.models import Country

            # Get active countries
            result = await session.execute(
                select(Country).where(Country.active == True)
            )
            countries = result.scalars().all()

            total_discovered = 0
            total_saved = 0

            service = KeywordDiscoveryService(session)

            for country in countries:
                keywords = await service.discover_keywords(
                    country_id=country.id,
                    hours_back=24,
                    min_frequency=3,
                )
                saved = await service.save_keywords(keywords)
                total_discovered += len(keywords)
                total_saved += saved

            return {
                'status': 'completed',
                'countries_processed': len(countries),
                'total_discovered': total_discovered,
                'total_saved': total_saved,
                'timestamp': datetime.utcnow().isoformat(),
            }

    return run_async(_discover_all())


# =============================================================================
# Opportunity Scanning Tasks
# =============================================================================

@shared_task(name="app.tasks.ode_tasks.scan_opportunities")
def scan_opportunities_task(
    country_id: int | None = None,
    category_id: int | None = None,
    min_rating_count: int = 100,
    max_rating: float = 3.5,
    alert_threshold: float = 90.0,
) -> dict:
    """
    Celery task: Scan apps for opportunities using the Goldmine Formula.

    Args:
        country_id: Filter by country
        category_id: Filter by category
        min_rating_count: Minimum ratings required
        max_rating: Maximum average rating
        alert_threshold: Score threshold for alerts

    Returns:
        Scan results summary
    """
    async def _scan():
        async_session = get_async_session()
        async with async_session() as session:
            service = GoldmineService(session)

            opportunities = await service.scan_opportunities(
                country_id=country_id,
                category_id=category_id,
                min_rating_count=min_rating_count,
                max_rating=max_rating,
            )

            saved = await service.save_scores(opportunities)
            alerts = await service.check_alerts(
                opportunities, threshold=alert_threshold
            )

            return {
                'status': 'completed',
                'scanned': len(opportunities),
                'saved': saved,
                'alerts_triggered': len(alerts),
                'timestamp': datetime.utcnow().isoformat(),
                'top_opportunities': [
                    {
                        'app_name': opp['app_name'],
                        'score': opp['opportunity_score'],
                    }
                    for opp in opportunities[:10]
                ],
            }

    return run_async(_scan())


@shared_task(name="app.tasks.ode_tasks.scheduled_opportunity_scan")
def scheduled_opportunity_scan_task() -> dict:
    """
    Scheduled task: Run opportunity scan for all data.
    Runs daily at 4 AM.
    """
    async def _scan_all():
        async_session = get_async_session()
        async with async_session() as session:
            service = GoldmineService(session)

            opportunities = await service.scan_opportunities(
                min_rating_count=100,
                max_rating=3.5,
                limit=2000,
            )

            saved = await service.save_scores(opportunities)
            alerts = await service.check_alerts(opportunities, threshold=90.0)

            return {
                'status': 'completed',
                'scanned': len(opportunities),
                'saved': saved,
                'alerts_triggered': len(alerts),
                'timestamp': datetime.utcnow().isoformat(),
                'goldmine_opportunities': [
                    opp['app_name']
                    for opp in opportunities
                    if opp['opportunity_score'] >= 90
                ][:20],
            }

    return run_async(_scan_all())


# =============================================================================
# Alert Tasks
# =============================================================================

@shared_task(name="app.tasks.ode_tasks.generate_daily_briefing")
def generate_daily_briefing_task() -> dict:
    """
    Scheduled task: Generate daily intelligence briefing.
    Runs daily at 9 AM.
    """
    async def _generate_briefing():
        async_session = get_async_session()
        async with async_session() as session:
            from sqlalchemy import select, func, desc
            from app.models.models import Keyword, OpportunityScore, Alert, App

            # Get keyword stats (last 24h)
            keyword_count = await session.execute(
                select(func.count(Keyword.id))
            )

            # Get top opportunities
            top_opps = await session.execute(
                select(OpportunityScore, App)
                .join(App)
                .order_by(desc(OpportunityScore.opportunity_score))
                .limit(10)
            )

            # Get alert summary
            alert_service = AlertService(session)
            alert_summary = await alert_service.get_alert_summary(hours=24)

            briefing = {
                'date': datetime.utcnow().date().isoformat(),
                'keywords_in_system': keyword_count.scalar() or 0,
                'top_opportunities': [
                    {
                        'app': app.name,
                        'score': score.opportunity_score,
                        'rating': app.average_rating,
                    }
                    for score, app in top_opps.all()
                ],
                'alerts_24h': alert_summary,
                'status': 'briefing_generated',
                'timestamp': datetime.utcnow().isoformat(),
            }

            return briefing

    return run_async(_generate_briefing())


@shared_task(name="app.tasks.ode_tasks.cleanup_old_alerts")
def cleanup_old_alerts_task(days: int = 30) -> dict:
    """
    Cleanup task: Archive old resolved alerts.
    Runs weekly.
    """
    async def _cleanup():
        async_session = get_async_session()
        async with async_session() as session:
            from datetime import timedelta
            from sqlalchemy import delete
            from app.models.models import Alert

            cutoff = datetime.utcnow() - timedelta(days=days)

            result = await session.execute(
                delete(Alert).where(
                    Alert.status == 'resolved',
                    Alert.resolved_at < cutoff,
                )
            )
            await session.commit()

            return {
                'status': 'completed',
                'alerts_deleted': result.rowcount,
                'cutoff_date': cutoff.isoformat(),
            }

    return run_async(_cleanup())
