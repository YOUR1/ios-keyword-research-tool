from datetime import datetime, date
from sqlalchemy import (
    String, Integer, BigInteger, Float, Boolean, Text, DateTime, Date,
    ForeignKey, Index, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(5), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    apps: Mapped[list["App"]] = relationship(back_populates="country")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    itunes_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )

    parent: Mapped["Category | None"] = relationship(
        remote_side="Category.id", back_populates="children"
    )
    children: Mapped[list["Category"]] = relationship(back_populates="parent")
    apps: Mapped[list["App"]] = relationship(back_populates="category")


class App(Base):
    __tablename__ = "apps"
    __table_args__ = (
        UniqueConstraint("itunes_id", "country_id", name="uq_app_country"),
        Index("ix_apps_weighted_score", "weighted_score"),
        Index("ix_apps_rating_count", "rating_count"),
        Index("ix_apps_category", "category_id"),
        Index("ix_apps_country", "country_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    itunes_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    bundle_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    developer: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    country_id: Mapped[int] = mapped_column(
        ForeignKey("countries.id"), nullable=False
    )
    average_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    weighted_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    icon_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    store_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_rating: Mapped[str | None] = mapped_column(String(50), nullable=True)
    release_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    updated_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # iTunes API fields (extracted from raw_json)
    genres: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    genre_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    release_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    seller_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    seller_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    minimum_os_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    languages: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    advisories: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    features: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    screenshot_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    ipad_screenshot_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    supported_devices: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    artist_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    artist_view_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_game_center_enabled: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    formatted_price: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # App Store scraped fields (NOT in iTunes API)
    subtitle: Mapped[str | None] = mapped_column(String(50), nullable=True)
    promotional_text: Mapped[str | None] = mapped_column(String(200), nullable=True)
    privacy_info: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    in_app_purchases: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    last_scraped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scrape_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    country: Mapped["Country"] = relationship(back_populates="apps")
    category: Mapped["Category | None"] = relationship(back_populates="apps")
    rating_distribution: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ratings_history: Mapped[list["RatingHistory"]] = relationship(
        back_populates="app", order_by="RatingHistory.snapshot_date.desc()"
    )
    reviews: Mapped[list["Review"]] = relationship(
        back_populates="app", order_by="Review.review_date.desc()"
    )


class RatingHistory(Base):
    __tablename__ = "ratings_history"
    __table_args__ = (
        Index("ix_rating_history_app_date", "app_id", "snapshot_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    app_id: Mapped[int] = mapped_column(ForeignKey("apps.id"), nullable=False)
    average_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    weighted_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    app: Mapped["App"] = relationship(back_populates="ratings_history")


class CrawlLog(Base):
    __tablename__ = "crawl_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(
        String(50), default="itunes", nullable=False
    )
    country_code: Mapped[str] = mapped_column(String(5), nullable=False)
    category_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    search_term: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending, running, completed, failed
    apps_found: Mapped[int] = mapped_column(Integer, default=0)
    apps_updated: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    keyword_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_keywords.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("app_id", "author_url", name="uq_review_app_author"),
        Index("ix_reviews_app_date", "app_id", "review_date"),
        Index("ix_reviews_app_rating", "app_id", "rating"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    app_id: Mapped[int] = mapped_column(ForeignKey("apps.id"), nullable=False)
    author_name: Mapped[str] = mapped_column(String(500), nullable=False)
    author_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    raw_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    app: Mapped["App"] = relationship(back_populates="reviews")


# =============================================================================
# ODE (Opportunity Discovery Engine) Models
# =============================================================================


class Keyword(Base):
    """Discovered keywords from market analysis."""
    __tablename__ = "keywords"
    __table_args__ = (
        UniqueConstraint("keyword", "country_id", name="uq_keyword_country"),
        Index("ix_keywords_trend_score", "trend_score"),
        Index("ix_keywords_discovery_date", "discovery_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    keyword: Mapped[str] = mapped_column(String(500), nullable=False)
    country_id: Mapped[int | None] = mapped_column(
        ForeignKey("countries.id"), nullable=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    trend_score: Mapped[float] = mapped_column(Float, default=0.0)
    frequency: Mapped[int] = mapped_column(Integer, default=1)
    discovery_date: Mapped[date] = mapped_column(Date, nullable=False)
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    source_apps: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    country: Mapped["Country | None"] = relationship()
    category: Mapped["Category | None"] = relationship()


class OpportunityScore(Base):
    """Goldmine opportunity scores for apps."""
    __tablename__ = "opportunity_scores"
    __table_args__ = (
        UniqueConstraint("app_id", "scan_date", name="uq_opportunity_app_date"),
        Index("ix_opportunity_score", "opportunity_score"),
        Index("ix_opportunity_scan_date", "scan_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    app_id: Mapped[int] = mapped_column(ForeignKey("apps.id"), nullable=False)
    opportunity_score: Mapped[float] = mapped_column(Float, nullable=False)
    normalized_downloads: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating_gap: Mapped[float | None] = mapped_column(Float, nullable=True)
    niche_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scan_date: Mapped[date] = mapped_column(Date, nullable=False)
    formula_version: Mapped[str] = mapped_column(String(20), default="v1")
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    app: Mapped["App"] = relationship()


class Alert(Base):
    """Goldmine alerts for high-value opportunities."""
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_type", "alert_type"),
        Index("ix_alerts_status", "status"),
        Index("ix_alerts_created", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # goldmine, trend_spike, new_niche, competitor
    priority: Mapped[str] = mapped_column(
        String(20), default="medium"
    )  # low, medium, high, critical
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    app_id: Mapped[int | None] = mapped_column(
        ForeignKey("apps.id"), nullable=True
    )
    keyword_id: Mapped[int | None] = mapped_column(
        ForeignKey("keywords.id"), nullable=True
    )
    opportunity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    trigger_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    threshold_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="active"
    )  # active, acknowledged, resolved, dismissed
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    app: Mapped["App | None"] = relationship()
    keyword: Mapped["Keyword | None"] = relationship()


class AppAnalysis(Base):
    """AI-generated analysis for apps."""
    __tablename__ = "app_analyses"
    __table_args__ = (
        Index("ix_app_analyses_app_id", "app_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    app_id: Mapped[int] = mapped_column(
        ForeignKey("apps.id"), nullable=False, unique=True
    )
    analysis: Mapped[dict] = mapped_column(JSONB, nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    app: Mapped["App"] = relationship()
