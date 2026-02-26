"""Pydantic schemas for keyword research API."""

from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class TopAppInfo(BaseModel):
    """Top app information for keyword analysis."""
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    itunes_id: int
    name: str
    developer: str | None = None
    icon_url: str | None = None
    average_rating: float | None = None
    rating_count: int
    weighted_score: float | None = None
    price: float = 0.0
    currency: str = "USD"
    title_match: bool = False
    subtitle_match: bool = False


class KeywordAnalysisResponse(BaseModel):
    """Response for keyword analysis endpoint."""
    model_config = ConfigDict(from_attributes=True)

    keyword_id: int
    term: str
    country_code: str
    popularity_score: float
    difficulty_score: float
    opportunity_score: float
    total_results: int
    hint_available: bool
    avg_top_10_rating_count: float | None = None
    avg_top_10_rating: float | None = None
    top_10_weighted_score_sum: float | None = None
    title_match_count: int = 0
    subtitle_match_count: int = 0
    top_apps: list[TopAppInfo]
    related_hints: list[str]
    data_source: str


class KeywordMetricsResponse(BaseModel):
    """Response for single metrics snapshot."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    keyword_id: int
    popularity_score: float
    difficulty_score: float
    opportunity_score: float
    total_results: int
    hint_available: bool
    avg_top_10_rating_count: float | None = None
    avg_top_10_rating: float | None = None
    top_10_weighted_score_sum: float | None = None
    snapshot_date: date
    created_at: datetime


class KeywordMetricsHistoryItem(BaseModel):
    """Single item in metrics history."""
    model_config = ConfigDict(from_attributes=True)

    snapshot_date: date
    popularity_score: float
    difficulty_score: float
    opportunity_score: float
    total_results: int


class KeywordMetricsHistory(BaseModel):
    """Response for metrics history endpoint."""
    keyword_id: int
    term: str
    days: int
    items: list[KeywordMetricsHistoryItem]


class QuickAnalysisRequest(BaseModel):
    """Request for quick analysis endpoint."""
    term: str
    country_code: str = "US"


class QuickAnalysisResponse(BaseModel):
    """Response for quick analysis endpoint (no DB storage)."""
    term: str
    country_code: str
    popularity_score: float
    difficulty_score: float
    opportunity_score: float
    total_results: int
    hint_available: bool
    top_apps: list[TopAppInfo]
    related_hints: list[str]


class KeywordSuggestionsResponse(BaseModel):
    """Response for keyword suggestions endpoint."""
    term: str
    country_code: str
    suggestions: list[str]
