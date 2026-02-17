"""
ODE (Opportunity Discovery Engine) API Endpoints

Provides endpoints for keyword discovery, opportunity scanning, and alerts.
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.services.ode import (
    KeywordDiscoveryService,
    GoldmineService,
    AlertService,
)

router = APIRouter()


# =============================================================================
# Pydantic Models
# =============================================================================

class KeywordResponse(BaseModel):
    keyword: str
    frequency: int
    trend_score: float
    is_new: bool
    source_apps: list[int]
    country_id: Optional[int] = None
    category_id: Optional[int] = None


class DiscoveryResponse(BaseModel):
    discovered: int
    saved: int
    keywords: list[KeywordResponse]


class OpportunityResponse(BaseModel):
    app_id: int
    app_name: str
    opportunity_score: float
    normalized_downloads: float
    rating_gap: float
    average_rating: float
    rating_count: int
    niche_rank: int
    category_id: Optional[int] = None


class ScanResponse(BaseModel):
    scanned: int
    saved: int
    alerts_triggered: int
    opportunities: list[OpportunityResponse]


class AlertResponse(BaseModel):
    id: int
    alert_type: str
    priority: str
    title: str
    description: Optional[str] = None
    app_id: Optional[int] = None
    opportunity_score: Optional[float] = None
    status: str
    created_at: str


class AlertSummary(BaseModel):
    period_hours: int
    total: int
    active: int
    resolved: int
    by_status: dict
    by_type: dict


# =============================================================================
# Keyword Discovery Endpoints
# =============================================================================

@router.post("/keywords/discover", response_model=DiscoveryResponse)
async def discover_keywords(
    country_id: Optional[int] = Query(None, description="Filter by country"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    hours_back: int = Query(24, ge=1, le=168, description="Lookback period in hours"),
    min_frequency: int = Query(3, ge=1, le=100, description="Minimum keyword frequency"),
    save: bool = Query(True, description="Save discovered keywords to database"),
    session: AsyncSession = Depends(get_db),
):
    """
    Discover trending keywords from recent app data.

    Analyzes app names and descriptions to extract and score trending keywords.
    """
    service = KeywordDiscoveryService(session)

    keywords = await service.discover_keywords(
        country_id=country_id,
        category_id=category_id,
        hours_back=hours_back,
        min_frequency=min_frequency,
    )

    saved_count = 0
    if save and keywords:
        saved_count = await service.save_keywords(keywords)

    return DiscoveryResponse(
        discovered=len(keywords),
        saved=saved_count,
        keywords=[KeywordResponse(**kw) for kw in keywords[:50]],
    )


# =============================================================================
# Opportunity Scanning Endpoints
# =============================================================================

@router.post("/opportunities/scan", response_model=ScanResponse)
async def scan_opportunities(
    country_id: Optional[int] = Query(None, description="Filter by country"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    min_rating_count: int = Query(100, ge=10, description="Minimum ratings required"),
    max_rating: float = Query(3.5, ge=1.0, le=5.0, description="Maximum average rating"),
    alert_threshold: float = Query(90.0, ge=50.0, le=100.0, description="Alert threshold"),
    limit: int = Query(500, ge=10, le=5000, description="Maximum apps to scan"),
    save: bool = Query(True, description="Save scores to database"),
    session: AsyncSession = Depends(get_db),
):
    """
    Scan apps using the Goldmine Formula to identify opportunities.

    Formula: score = (downloads / max_downloads) * (1 - rating/5) * 100
    High downloads + Low ratings = High opportunity
    """
    service = GoldmineService(session)

    opportunities = await service.scan_opportunities(
        country_id=country_id,
        category_id=category_id,
        min_rating_count=min_rating_count,
        max_rating=max_rating,
        limit=limit,
    )

    saved_count = 0
    alerts_triggered = 0

    if opportunities:
        if save:
            saved_count = await service.save_scores(opportunities)

        # Check for alerts
        alerts = await service.check_alerts(opportunities, threshold=alert_threshold)
        alerts_triggered = len(alerts)

    return ScanResponse(
        scanned=len(opportunities),
        saved=saved_count,
        alerts_triggered=alerts_triggered,
        opportunities=[OpportunityResponse(**opp) for opp in opportunities[:100]],
    )


@router.get("/opportunities/top")
async def get_top_opportunities(
    limit: int = Query(20, ge=1, le=100),
    country_id: Optional[int] = None,
    category_id: Optional[int] = None,
    scan_date: Optional[date] = None,
    session: AsyncSession = Depends(get_db),
):
    """Get top opportunities from the most recent scan."""
    from sqlalchemy import select, desc, and_
    from app.models.models import OpportunityScore, App

    query = (
        select(OpportunityScore, App)
        .join(App)
        .order_by(desc(OpportunityScore.opportunity_score))
        .limit(limit)
    )

    if scan_date:
        query = query.where(OpportunityScore.scan_date == scan_date)

    if country_id:
        query = query.where(App.country_id == country_id)

    if category_id:
        query = query.where(App.category_id == category_id)

    result = await session.execute(query)
    rows = result.all()

    return [
        {
            'app_id': score.app_id,
            'app_name': app.name,
            'opportunity_score': score.opportunity_score,
            'niche_rank': score.niche_rank,
            'scan_date': str(score.scan_date),
            'average_rating': app.average_rating,
            'rating_count': app.rating_count,
        }
        for score, app in rows
    ]


# =============================================================================
# Alert Endpoints
# =============================================================================

@router.get("/alerts", response_model=list[AlertResponse])
async def get_alerts(
    limit: int = Query(50, ge=1, le=200),
    alert_type: Optional[str] = Query(None, description="Filter by type"),
    status: str = Query("active", description="Filter by status"),
    session: AsyncSession = Depends(get_db),
):
    """Get alerts, filtered by status and type."""
    service = AlertService(session)
    alerts = await service.get_active_alerts(limit=limit, alert_type=alert_type)

    return [
        AlertResponse(
            id=alert.id,
            alert_type=alert.alert_type,
            priority=alert.priority,
            title=alert.title,
            description=alert.description,
            app_id=alert.app_id,
            opportunity_score=alert.opportunity_score,
            status=alert.status,
            created_at=alert.created_at.isoformat(),
        )
        for alert in alerts
    ]


@router.get("/alerts/summary", response_model=AlertSummary)
async def get_alert_summary(
    hours: int = Query(24, ge=1, le=168, description="Period in hours"),
    session: AsyncSession = Depends(get_db),
):
    """Get alert summary for the specified period."""
    service = AlertService(session)
    return await service.get_alert_summary(hours=hours)


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    session: AsyncSession = Depends(get_db),
):
    """Acknowledge an alert."""
    service = AlertService(session)
    alert = await service.acknowledge_alert(alert_id)

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"status": "acknowledged", "alert_id": alert_id}


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    session: AsyncSession = Depends(get_db),
):
    """Resolve an alert."""
    service = AlertService(session)
    alert = await service.resolve_alert(alert_id)

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"status": "resolved", "alert_id": alert_id}


# =============================================================================
# System Status Endpoint
# =============================================================================

@router.get("/status")
async def get_ode_status(
    session: AsyncSession = Depends(get_db),
):
    """Get ODE system status overview."""
    from sqlalchemy import select, func
    from app.models.models import Keyword, OpportunityScore, Alert, App

    # Get counts
    keywords_count = await session.execute(select(func.count(Keyword.id)))
    scores_count = await session.execute(select(func.count(OpportunityScore.id)))
    alerts_count = await session.execute(
        select(func.count(Alert.id)).where(Alert.status == 'active')
    )
    apps_count = await session.execute(select(func.count(App.id)))

    # Get latest scan date
    latest_scan = await session.execute(
        select(func.max(OpportunityScore.scan_date))
    )

    return {
        'status': 'operational',
        'keywords_discovered': keywords_count.scalar() or 0,
        'opportunities_scored': scores_count.scalar() or 0,
        'active_alerts': alerts_count.scalar() or 0,
        'total_apps': apps_count.scalar() or 0,
        'latest_scan': str(latest_scan.scalar()) if latest_scan.scalar() else None,
    }
