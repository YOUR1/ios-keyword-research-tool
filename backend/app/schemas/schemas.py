from datetime import datetime, date
from pydantic import BaseModel, ConfigDict


# --- Country ---
class CountryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str


# --- Category ---
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    itunes_id: int
    name: str
    parent_id: int | None = None


# --- App ---
class AppListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    itunes_id: int
    name: str
    developer: str | None = None
    category_name: str | None = None
    country_code: str
    average_rating: float | None = None
    rating_count: int
    weighted_score: float | None = None
    price: float
    currency: str
    icon_url: str | None = None
    store_url: str | None = None
    current_version: str | None = None


class AppDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    itunes_id: int
    bundle_id: str | None = None
    name: str
    developer: str | None = None
    category: CategoryOut | None = None
    country: CountryOut
    average_rating: float | None = None
    rating_count: int
    weighted_score: float | None = None
    current_version: str | None = None
    price: float
    currency: str
    icon_url: str | None = None
    store_url: str | None = None
    description: str | None = None
    content_rating: str | None = None
    release_date: date | None = None
    updated_date: datetime | None = None
    created_at: datetime
    updated_at: datetime


# --- Rating History ---
class RatingHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    snapshot_date: date
    average_rating: float | None = None
    rating_count: int
    weighted_score: float | None = None


# --- Paginated Response ---
class PaginatedApps(BaseModel):
    items: list[AppListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Crawl Status ---
class CrawlStatus(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: str
    country_code: str
    status: str
    apps_found: int
    apps_updated: int
    duration_seconds: float | None = None
    created_at: datetime


# --- Stats ---
class IndexStats(BaseModel):
    total_apps: int
    total_countries: int
    total_categories: int
    last_crawl: datetime | None = None
    global_mean_rating: float | None = None
    min_rating_threshold: int


# --- Reviews ---
class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    app_id: int
    author_name: str
    rating: int
    title: str | None = None
    body: str | None = None
    review_date: datetime | None = None
    language: str | None = None


class ReviewSummary(BaseModel):
    total_reviews: int
    rating_distribution: dict[str, int]
    average_review_rating: float | None = None


class PaginatedReviews(BaseModel):
    items: list[ReviewOut]
    summary: ReviewSummary
    total: int
    page: int
    page_size: int
    total_pages: int
