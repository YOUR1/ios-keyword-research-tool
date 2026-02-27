"""
Crawl job history endpoints.
"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.keyword import CrawlJob, CrawlJobLog, UserKeyword
from app.models.user import User
from app.schemas.keywords import CrawlJobOut, CrawlJobLogOut, CrawlJobLogsResponse, PaginatedCrawlJobs

router = APIRouter()


@router.get("", response_model=PaginatedCrawlJobs)
async def list_crawl_jobs(
    keyword_id: int | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(CrawlJob).where(CrawlJob.user_id == user.id)

    if keyword_id:
        base = base.where(CrawlJob.keyword_id == keyword_id)
    if status:
        base = base.where(CrawlJob.status == status)

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(CrawlJob, UserKeyword.term)
        .join(UserKeyword, UserKeyword.id == CrawlJob.keyword_id, isouter=True)
        .where(CrawlJob.user_id == user.id)
    )
    if keyword_id:
        query = query.where(CrawlJob.keyword_id == keyword_id)
    if status:
        query = query.where(CrawlJob.status == status)

    query = query.order_by(CrawlJob.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = [
        CrawlJobOut(
            id=job.id,
            keyword_id=job.keyword_id,
            keyword_term=term,
            status=job.status,
            apps_found=job.apps_found,
            apps_new=job.apps_new,
            error_message=job.error_message,
            duration_seconds=job.duration_seconds,
            proxy_used=job.proxy_used,
            started_at=job.started_at,
            completed_at=job.completed_at,
            created_at=job.created_at,
        )
        for job, term in rows
    ]

    return PaginatedCrawlJobs(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{job_id}", response_model=CrawlJobOut)
async def get_crawl_job(
    job_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CrawlJob, UserKeyword.term)
        .join(UserKeyword, UserKeyword.id == CrawlJob.keyword_id, isouter=True)
        .where(
            CrawlJob.id == job_id,
            CrawlJob.user_id == user.id,
        )
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Crawl job not found")
    job, term = row
    return CrawlJobOut(
        id=job.id,
        keyword_id=job.keyword_id,
        keyword_term=term,
        status=job.status,
        apps_found=job.apps_found,
        apps_new=job.apps_new,
        error_message=job.error_message,
        duration_seconds=job.duration_seconds,
        proxy_used=job.proxy_used,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
    )


@router.get("/{job_id}/logs", response_model=CrawlJobLogsResponse)
async def get_crawl_job_logs(
    job_id: int,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated logs for a specific crawl job."""
    # Verify the job exists and belongs to the user
    job_result = await db.execute(
        select(CrawlJob).where(
            CrawlJob.id == job_id,
            CrawlJob.user_id == user.id,
        )
    )
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Crawl job not found")

    # Get total count
    count_q = select(func.count()).select_from(
        select(CrawlJobLog).where(CrawlJobLog.job_id == job_id).subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0

    # Get paginated logs ordered by created_at DESC
    logs_query = (
        select(CrawlJobLog)
        .where(CrawlJobLog.job_id == job_id)
        .order_by(CrawlJobLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(logs_query)
    logs = result.scalars().all()

    items = [
        CrawlJobLogOut(
            id=log.id,
            job_id=log.job_id,
            level=log.level,
            phase=log.phase,
            message=log.message,
            progress=log.progress,
            extra_data=log.extra_data,
            created_at=log.created_at,
        )
        for log in logs
    ]

    return CrawlJobLogsResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )
