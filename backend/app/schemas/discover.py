from pydantic import BaseModel


class SearchSuggestion(BaseModel):
    term: str


class SearchSuggestionsResponse(BaseModel):
    term: str
    country: str
    suggestions: list[SearchSuggestion]


class TrendingApp(BaseModel):
    itunes_id: str
    name: str
    developer: str | None = None
    icon_url: str | None = None
    genres: list[str] = []
    store_url: str | None = None


class TrendingResponse(BaseModel):
    country: str
    chart: str
    apps: list[TrendingApp]
    count: int
