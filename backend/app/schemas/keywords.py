from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class KeywordCreate(BaseModel):
    term: str
    country_code: str = "US"
    category_id: int | None = None
    crawl_frequency: str = "daily"

    @field_validator("term")
    @classmethod
    def validate_term(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 200:
            raise ValueError("Term must be 1-200 characters")
        return v

    @field_validator("crawl_frequency")
    @classmethod
    def validate_frequency(cls, v: str) -> str:
        if v not in ("daily", "weekly", "manual"):
            raise ValueError("Frequency must be daily, weekly, or manual")
        return v


class KeywordUpdate(BaseModel):
    term: str | None = None
    country_code: str | None = None
    category_id: int | None = None
    crawl_frequency: str | None = None
    is_active: bool | None = None

    @field_validator("crawl_frequency")
    @classmethod
    def validate_frequency(cls, v: str | None) -> str | None:
        if v is not None and v not in ("daily", "weekly", "manual"):
            raise ValueError("Frequency must be daily, weekly, or manual")
        return v


class KeywordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    term: str
    country_code: str
    category_id: int | None
    crawl_frequency: str
    is_active: bool
    last_crawled_at: datetime | None
    next_run_at: datetime | None
    created_at: datetime
    updated_at: datetime


class KeywordDetail(KeywordOut):
    total_apps_found: int = 0
    total_crawl_jobs: int = 0


class PaginatedKeywords(BaseModel):
    items: list[KeywordOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class CrawlJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    keyword_id: int
    keyword_term: str | None = None
    status: str
    apps_found: int
    apps_new: int
    error_message: str | None
    duration_seconds: float | None
    proxy_used: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


class PaginatedCrawlJobs(BaseModel):
    items: list[CrawlJobOut]
    total: int
    page: int
    page_size: int
    total_pages: int
