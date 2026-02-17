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
