"""
ODE (Opportunity Discovery Engine) Services

Provides keyword discovery, goldmine scoring, and alert generation.
"""
import re
from datetime import date, datetime, timedelta
from collections import Counter
from typing import Optional
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import App, Keyword, OpportunityScore, Alert, Category


# =============================================================================
# Keyword Discovery Service
# =============================================================================

class KeywordDiscoveryService:
    """Discovers trending keywords from app metadata."""

    # Common stop words to filter out
    STOP_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
        'app', 'apps', 'free', 'new', 'best', 'top', 'pro', 'lite', 'plus',
        'version', 'update', 'download', 'get', 'your', 'you', 'my', 'our',
        'this', 'that', 'these', 'those', 'it', 'its', 'all', 'any', 'no',
    }

    # Minimum keyword length
    MIN_KEYWORD_LENGTH = 3

    def __init__(self, session: AsyncSession):
        self.session = session

    async def discover_keywords(
        self,
        country_id: Optional[int] = None,
        category_id: Optional[int] = None,
        hours_back: int = 24,
        min_frequency: int = 3,
    ) -> list[dict]:
        """
        Discover trending keywords from recent app data.

        Args:
            country_id: Filter by country (optional)
            category_id: Filter by category (optional)
            hours_back: Look back period in hours
            min_frequency: Minimum occurrences to be considered

        Returns:
            List of discovered keywords with metadata
        """
        # Get recent apps
        cutoff = datetime.utcnow() - timedelta(hours=hours_back)

        query = select(App).where(App.updated_at >= cutoff)

        if country_id:
            query = query.where(App.country_id == country_id)
        if category_id:
            query = query.where(App.category_id == category_id)

        result = await self.session.execute(query)
        apps = result.scalars().all()

        # Extract keywords from app names and descriptions
        keyword_counter: Counter = Counter()
        keyword_apps: dict[str, list[int]] = {}

        for app in apps:
            keywords = self._extract_keywords(app.name)
            if app.description:
                keywords.extend(self._extract_keywords(app.description[:500]))

            for kw in keywords:
                keyword_counter[kw] += 1
                if kw not in keyword_apps:
                    keyword_apps[kw] = []
                if app.id not in keyword_apps[kw]:
                    keyword_apps[kw].append(app.id)

        # Filter by minimum frequency and calculate trend scores
        discovered = []
        for keyword, frequency in keyword_counter.most_common(100):
            if frequency >= min_frequency:
                # Check if keyword already exists
                existing = await self._get_existing_keyword(keyword, country_id)

                trend_score = await self._calculate_trend_score(
                    keyword, frequency, existing
                )

                discovered.append({
                    'keyword': keyword,
                    'frequency': frequency,
                    'trend_score': trend_score,
                    'source_apps': keyword_apps[keyword][:10],
                    'is_new': existing is None,
                    'country_id': country_id,
                    'category_id': category_id,
                })

        return discovered

    def _extract_keywords(self, text: str) -> list[str]:
        """Extract meaningful keywords from text."""
        # Lowercase and remove special characters
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)

        # Split into words
        words = text.split()

        # Filter
        keywords = [
            w for w in words
            if len(w) >= self.MIN_KEYWORD_LENGTH
            and w not in self.STOP_WORDS
            and not w.isdigit()
        ]

        return keywords

    async def _get_existing_keyword(
        self, keyword: str, country_id: Optional[int]
    ) -> Optional[Keyword]:
        """Check if keyword already exists in database."""
        query = select(Keyword).where(Keyword.keyword == keyword)
        if country_id:
            query = query.where(Keyword.country_id == country_id)

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def _calculate_trend_score(
        self,
        keyword: str,
        current_frequency: int,
        existing: Optional[Keyword],
    ) -> float:
        """
        Calculate trend score based on frequency change.

        Score = current_frequency / historical_frequency * recency_weight
        New keywords get a base score of 1.5
        """
        if existing is None:
            # New keyword - assign base trending score
            return min(1.5 * (current_frequency / 3), 5.0)

        # Calculate change from previous frequency
        if existing.frequency > 0:
            change_ratio = current_frequency / existing.frequency
        else:
            change_ratio = current_frequency

        # Apply recency weight (newer = higher weight)
        days_since = (date.today() - existing.discovery_date).days
        recency_weight = max(0.5, 1.0 - (days_since / 30) * 0.5)

        return min(change_ratio * recency_weight, 10.0)

    async def save_keywords(self, keywords: list[dict]) -> int:
        """Save discovered keywords to database."""
        saved_count = 0

        for kw_data in keywords:
            existing = await self._get_existing_keyword(
                kw_data['keyword'], kw_data.get('country_id')
            )

            if existing:
                # Update existing keyword
                existing.frequency = kw_data['frequency']
                existing.trend_score = kw_data['trend_score']
                existing.last_seen = datetime.utcnow()
                existing.source_apps = kw_data.get('source_apps')
            else:
                # Create new keyword
                new_keyword = Keyword(
                    keyword=kw_data['keyword'],
                    country_id=kw_data.get('country_id'),
                    category_id=kw_data.get('category_id'),
                    trend_score=kw_data['trend_score'],
                    frequency=kw_data['frequency'],
                    discovery_date=date.today(),
                    source_apps=kw_data.get('source_apps'),
                )
                self.session.add(new_keyword)
                saved_count += 1

        await self.session.commit()
        return saved_count


# =============================================================================
# Goldmine Scoring Service
# =============================================================================

class GoldmineService:
    """
    Calculates opportunity scores using the Goldmine Formula.

    Formula: opportunity_score = (downloads / max_downloads) * (1 - rating/5) * 100

    High downloads + Low ratings = High opportunity
    """

    DEFAULT_ALERT_THRESHOLD = 90.0
    MIN_RATING_COUNT = 100
    MAX_RATING_FOR_OPPORTUNITY = 3.5

    def __init__(self, session: AsyncSession):
        self.session = session

    async def scan_opportunities(
        self,
        country_id: Optional[int] = None,
        category_id: Optional[int] = None,
        min_rating_count: int = MIN_RATING_COUNT,
        max_rating: float = MAX_RATING_FOR_OPPORTUNITY,
        limit: int = 1000,
    ) -> list[dict]:
        """
        Scan apps and calculate opportunity scores.

        Args:
            country_id: Filter by country
            category_id: Filter by category
            min_rating_count: Minimum ratings to consider
            max_rating: Maximum average rating (opportunities are low-rated apps)
            limit: Maximum apps to scan

        Returns:
            List of opportunities with scores
        """
        # Get max rating count for normalization
        max_query = select(func.max(App.rating_count))
        if country_id:
            max_query = max_query.where(App.country_id == country_id)
        result = await self.session.execute(max_query)
        max_rating_count = result.scalar() or 1

        # Query apps with sufficient data
        query = (
            select(App)
            .where(
                and_(
                    App.rating_count >= min_rating_count,
                    App.average_rating <= max_rating,
                    App.average_rating.isnot(None),
                )
            )
            .order_by(desc(App.rating_count))
            .limit(limit)
        )

        if country_id:
            query = query.where(App.country_id == country_id)
        if category_id:
            query = query.where(App.category_id == category_id)

        result = await self.session.execute(query)
        apps = result.scalars().all()

        # Calculate opportunity scores
        opportunities = []
        for app in apps:
            score_data = self._calculate_score(app, max_rating_count)
            opportunities.append({
                'app_id': app.id,
                'app_name': app.name,
                'opportunity_score': score_data['score'],
                'normalized_downloads': score_data['normalized_downloads'],
                'rating_gap': score_data['rating_gap'],
                'average_rating': app.average_rating,
                'rating_count': app.rating_count,
                'category_id': app.category_id,
            })

        # Sort by opportunity score
        opportunities.sort(key=lambda x: x['opportunity_score'], reverse=True)

        # Assign niche ranks
        for i, opp in enumerate(opportunities, 1):
            opp['niche_rank'] = i

        return opportunities

    def _calculate_score(self, app: App, max_rating_count: int) -> dict:
        """
        Apply the Goldmine Formula.

        Score = (normalized_downloads) * (rating_gap) * 100

        - normalized_downloads: rating_count / max_rating_count (0-1)
        - rating_gap: 1 - (average_rating / 5) (0-1, higher = worse rating = opportunity)
        """
        normalized_downloads = app.rating_count / max_rating_count if max_rating_count > 0 else 0
        rating_gap = 1 - (app.average_rating / 5) if app.average_rating else 1

        score = normalized_downloads * rating_gap * 100

        return {
            'score': round(score, 2),
            'normalized_downloads': round(normalized_downloads, 4),
            'rating_gap': round(rating_gap, 4),
        }

    async def save_scores(self, opportunities: list[dict]) -> int:
        """Save opportunity scores to database."""
        today = date.today()
        saved_count = 0

        for opp in opportunities:
            # Check if score already exists for today
            existing = await self.session.execute(
                select(OpportunityScore).where(
                    and_(
                        OpportunityScore.app_id == opp['app_id'],
                        OpportunityScore.scan_date == today,
                    )
                )
            )
            existing_score = existing.scalar_one_or_none()

            if existing_score:
                # Update existing
                existing_score.opportunity_score = opp['opportunity_score']
                existing_score.normalized_downloads = opp['normalized_downloads']
                existing_score.rating_gap = opp['rating_gap']
                existing_score.niche_rank = opp['niche_rank']
            else:
                # Create new
                new_score = OpportunityScore(
                    app_id=opp['app_id'],
                    opportunity_score=opp['opportunity_score'],
                    normalized_downloads=opp['normalized_downloads'],
                    rating_gap=opp['rating_gap'],
                    niche_rank=opp['niche_rank'],
                    scan_date=today,
                )
                self.session.add(new_score)
                saved_count += 1

        await self.session.commit()
        return saved_count

    async def check_alerts(
        self,
        opportunities: list[dict],
        threshold: float = DEFAULT_ALERT_THRESHOLD,
    ) -> list[dict]:
        """
        Check opportunities against alert threshold and create alerts.

        Args:
            opportunities: List of scored opportunities
            threshold: Minimum score to trigger alert

        Returns:
            List of triggered alerts
        """
        alerts = []

        for opp in opportunities:
            if opp['opportunity_score'] >= threshold:
                alert = Alert(
                    alert_type='goldmine',
                    priority='high' if opp['opportunity_score'] >= 95 else 'medium',
                    title=f"Goldmine Opportunity: {opp['app_name']}",
                    description=(
                        f"High-value opportunity detected with score {opp['opportunity_score']:.1f}. "
                        f"App has {opp['rating_count']:,} ratings with average {opp['average_rating']:.1f}/5."
                    ),
                    app_id=opp['app_id'],
                    opportunity_score=opp['opportunity_score'],
                    trigger_value=opp['opportunity_score'],
                    threshold_value=threshold,
                    status='active',
                )
                self.session.add(alert)
                alerts.append({
                    'app_id': opp['app_id'],
                    'app_name': opp['app_name'],
                    'score': opp['opportunity_score'],
                    'priority': alert.priority,
                })

        if alerts:
            await self.session.commit()

        return alerts


# =============================================================================
# Alert Management Service
# =============================================================================

class AlertService:
    """Manages ODE alerts."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_active_alerts(
        self,
        limit: int = 50,
        alert_type: Optional[str] = None,
    ) -> list[Alert]:
        """Get active alerts."""
        query = (
            select(Alert)
            .where(Alert.status == 'active')
            .order_by(desc(Alert.created_at))
            .limit(limit)
        )

        if alert_type:
            query = query.where(Alert.alert_type == alert_type)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def acknowledge_alert(self, alert_id: int) -> Optional[Alert]:
        """Mark alert as acknowledged."""
        result = await self.session.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()

        if alert:
            alert.status = 'acknowledged'
            alert.acknowledged_at = datetime.utcnow()
            await self.session.commit()

        return alert

    async def resolve_alert(self, alert_id: int) -> Optional[Alert]:
        """Mark alert as resolved."""
        result = await self.session.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()

        if alert:
            alert.status = 'resolved'
            alert.resolved_at = datetime.utcnow()
            await self.session.commit()

        return alert

    async def get_alert_summary(self, hours: int = 24) -> dict:
        """Get alert summary for the specified period."""
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        # Count by status
        status_query = (
            select(Alert.status, func.count(Alert.id))
            .where(Alert.created_at >= cutoff)
            .group_by(Alert.status)
        )
        result = await self.session.execute(status_query)
        status_counts = dict(result.all())

        # Count by type
        type_query = (
            select(Alert.alert_type, func.count(Alert.id))
            .where(Alert.created_at >= cutoff)
            .group_by(Alert.alert_type)
        )
        result = await self.session.execute(type_query)
        type_counts = dict(result.all())

        return {
            'period_hours': hours,
            'total': sum(status_counts.values()),
            'by_status': status_counts,
            'by_type': type_counts,
            'active': status_counts.get('active', 0),
            'resolved': status_counts.get('resolved', 0),
        }
