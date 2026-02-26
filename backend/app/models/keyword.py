from datetime import datetime, date

from sqlalchemy import (
    String, Integer, Float, Boolean, Text, DateTime, Date,
    ForeignKey, UniqueConstraint, Index, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

TZDateTime = DateTime(timezone=True)


class UserKeyword(Base):
    __tablename__ = "user_keywords"
    __table_args__ = (
        UniqueConstraint("user_id", "term", "country_code", "category_id", name="uq_user_keyword"),
        Index("ix_user_keywords_next_run", "next_run_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    term: Mapped[str] = mapped_column(String(200), nullable=False)
    country_code: Mapped[str] = mapped_column(String(5), nullable=False, default="US")
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    crawl_frequency: Mapped[str] = mapped_column(
        String(20), nullable=False, default="daily"
    )
    expansion_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sub_keywords: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_crawled_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TZDateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TZDateTime, server_default=func.now(), onupdate=func.now()
    )

    # Cached latest metrics for quick access
    latest_popularity: Mapped[float | None] = mapped_column(Float, nullable=True)
    latest_difficulty: Mapped[float | None] = mapped_column(Float, nullable=True)
    latest_opportunity: Mapped[float | None] = mapped_column(Float, nullable=True)

    user = relationship("User", backref="keywords")
    category = relationship("Category")
    crawl_jobs: Mapped[list["CrawlJob"]] = relationship(
        back_populates="keyword", cascade="all, delete-orphan"
    )
    app_results: Mapped[list["KeywordAppResult"]] = relationship(
        back_populates="keyword", cascade="all, delete-orphan"
    )
    metrics_history: Mapped[list["KeywordMetrics"]] = relationship(
        back_populates="keyword", cascade="all, delete-orphan",
        order_by="KeywordMetrics.snapshot_date.desc()"
    )


class CrawlJob(Base):
    __tablename__ = "crawl_jobs"
    __table_args__ = (
        Index("ix_crawl_jobs_status", "status"),
        Index("ix_crawl_jobs_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    keyword_id: Mapped[int] = mapped_column(
        ForeignKey("user_keywords.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    apps_found: Mapped[int] = mapped_column(Integer, default=0)
    apps_new: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    proxy_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TZDateTime, server_default=func.now()
    )

    keyword: Mapped["UserKeyword"] = relationship(back_populates="crawl_jobs")
    user = relationship("User")


class KeywordAppResult(Base):
    __tablename__ = "keyword_app_results"
    __table_args__ = (
        UniqueConstraint("keyword_id", "app_id", name="uq_keyword_app"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    keyword_id: Mapped[int] = mapped_column(
        ForeignKey("user_keywords.id", ondelete="CASCADE"), nullable=False
    )
    app_id: Mapped[int] = mapped_column(
        ForeignKey("apps.id", ondelete="CASCADE"), nullable=False
    )
    crawl_job_id: Mapped[int | None] = mapped_column(
        ForeignKey("crawl_jobs.id", ondelete="SET NULL"), nullable=True
    )
    first_seen_at: Mapped[datetime] = mapped_column(
        TZDateTime, server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        TZDateTime, server_default=func.now()
    )

    keyword: Mapped["UserKeyword"] = relationship(back_populates="app_results")
    app = relationship("App")


class KeywordMetrics(Base):
    """Snapshot of keyword research metrics calculated from search results."""
    __tablename__ = "keyword_metrics"
    __table_args__ = (
        Index("ix_keyword_metrics_keyword_date", "keyword_id", "snapshot_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    keyword_id: Mapped[int] = mapped_column(
        ForeignKey("user_keywords.id", ondelete="CASCADE"), nullable=False
    )

    # Core scores (0-100)
    popularity_score: Mapped[float] = mapped_column(Float, nullable=False)
    difficulty_score: Mapped[float] = mapped_column(Float, nullable=False)
    opportunity_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Raw calculation data
    total_results: Mapped[int] = mapped_column(Integer, nullable=False)
    hint_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    avg_top_10_rating_count: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_top_10_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    top_10_weighted_score_sum: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Metadata
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TZDateTime, server_default=func.now()
    )

    keyword: Mapped["UserKeyword"] = relationship(back_populates="metrics_history")
