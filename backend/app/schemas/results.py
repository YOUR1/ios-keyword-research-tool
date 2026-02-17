from pydantic import BaseModel, ConfigDict

from app.schemas.schemas import AppListItem


class ResultItem(AppListItem):
    keywords: list[str] = []


class PaginatedResults(BaseModel):
    items: list[ResultItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class ResultStats(BaseModel):
    total_apps: int
    total_keywords: int
    active_keywords: int
    total_crawl_jobs: int
    last_crawl_at: str | None
