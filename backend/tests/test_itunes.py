"""
Tests for app.services.itunes — iTunes Search API client.

All HTTP calls are mocked with respx — no actual Apple API requests are made.
"""

import pytest
import respx
import httpx
from datetime import date, datetime

from app.services.itunes import ITunesClient, ITUNES_SEARCH_URL, ITUNES_LOOKUP_URL


@pytest.fixture()
def itunes():
    """Fresh ITunesClient for each test (no shared state)."""
    return ITunesClient()


# ---------------------------------------------------------------------------
# Sample iTunes API response payloads
# ---------------------------------------------------------------------------

SAMPLE_APP_RAW = {
    "trackId": 123456,
    "bundleId": "com.example.testapp",
    "trackName": "Test App",
    "artistName": "Test Developer",
    "averageUserRating": 2.5,
    "userRatingCount": 1500,
    "version": "3.1.0",
    "price": 0.0,
    "currency": "USD",
    "artworkUrl512": "https://example.com/icon512.png",
    "artworkUrl100": "https://example.com/icon100.png",
    "trackViewUrl": "https://apps.apple.com/us/app/id123456",
    "description": "A test application for unit tests.",
    "contentAdvisoryRating": "4+",
    "primaryGenreId": 6014,
    "primaryGenreName": "Games",
    "releaseDate": "2023-06-15T00:00:00Z",
    "currentVersionReleaseDate": "2025-01-10T12:30:00Z",
}

SAMPLE_APP_MINIMAL = {
    "trackId": 789012,
    "trackName": "Minimal App",
}


class TestParseApp:
    """Tests for ITunesClient.parse_app static method."""

    def test_parses_full_response(self):
        result = ITunesClient.parse_app(SAMPLE_APP_RAW)
        assert result["itunes_id"] == 123456
        assert result["bundle_id"] == "com.example.testapp"
        assert result["name"] == "Test App"
        assert result["developer"] == "Test Developer"
        assert result["average_rating"] == 2.5
        assert result["rating_count"] == 1500
        assert result["current_version"] == "3.1.0"
        assert result["price"] == 0.0
        assert result["currency"] == "USD"
        assert result["icon_url"] == "https://example.com/icon512.png"
        assert result["store_url"] == "https://apps.apple.com/us/app/id123456"
        assert result["description"] == "A test application for unit tests."
        assert result["content_rating"] == "4+"
        assert result["genre_id"] == 6014
        assert result["genre_name"] == "Games"
        assert result["raw_json"] == SAMPLE_APP_RAW

    def test_parses_release_date(self):
        result = ITunesClient.parse_app(SAMPLE_APP_RAW)
        assert result["release_date"] == date(2023, 6, 15)

    def test_parses_updated_date(self):
        result = ITunesClient.parse_app(SAMPLE_APP_RAW)
        assert isinstance(result["updated_date"], datetime)
        assert result["updated_date"].year == 2025
        assert result["updated_date"].month == 1

    def test_handles_minimal_response(self):
        result = ITunesClient.parse_app(SAMPLE_APP_MINIMAL)
        assert result["itunes_id"] == 789012
        assert result["name"] == "Minimal App"
        assert result["developer"] is None
        assert result["average_rating"] is None
        assert result["rating_count"] == 0
        assert result["price"] == 0.0
        assert result["currency"] == "USD"
        assert result["release_date"] is None
        assert result["updated_date"] is None

    def test_handles_empty_response(self):
        result = ITunesClient.parse_app({})
        assert result["itunes_id"] is None
        assert result["name"] == "Unknown"
        assert result["rating_count"] == 0

    def test_prefers_512_icon_over_100(self):
        raw = {**SAMPLE_APP_MINIMAL, "artworkUrl512": "big.png", "artworkUrl100": "small.png"}
        result = ITunesClient.parse_app(raw)
        assert result["icon_url"] == "big.png"

    def test_falls_back_to_100_icon(self):
        raw = {**SAMPLE_APP_MINIMAL, "artworkUrl100": "small.png"}
        result = ITunesClient.parse_app(raw)
        assert result["icon_url"] == "small.png"

    def test_handles_invalid_date_gracefully(self):
        raw = {**SAMPLE_APP_MINIMAL, "releaseDate": "not-a-date"}
        result = ITunesClient.parse_app(raw)
        assert result["release_date"] is None

    def test_handles_invalid_updated_date_gracefully(self):
        raw = {**SAMPLE_APP_MINIMAL, "currentVersionReleaseDate": "garbage"}
        result = ITunesClient.parse_app(raw)
        assert result["updated_date"] is None


class TestITunesClientSearch:
    """Tests for ITunesClient.search with mocked HTTP."""

    @respx.mock
    async def test_search_returns_results(self, itunes):
        respx.get(ITUNES_SEARCH_URL).mock(
            return_value=httpx.Response(
                200,
                json={"resultCount": 1, "results": [SAMPLE_APP_RAW]},
            )
        )
        results = await itunes.search("test", country="US")
        assert len(results) == 1
        assert results[0]["trackId"] == 123456
        await itunes.close()

    @respx.mock
    async def test_search_returns_empty_on_no_results(self, itunes):
        respx.get(ITUNES_SEARCH_URL).mock(
            return_value=httpx.Response(200, json={"resultCount": 0, "results": []})
        )
        results = await itunes.search("xyznonexistent")
        assert results == []
        await itunes.close()

    @respx.mock
    async def test_search_caps_limit_at_200(self, itunes):
        route = respx.get(ITUNES_SEARCH_URL).mock(
            return_value=httpx.Response(200, json={"resultCount": 0, "results": []})
        )
        await itunes.search("test", limit=500)
        # Verify the limit param was capped to 200
        assert route.calls[0].request.url.params["limit"] == "200"
        await itunes.close()

    @respx.mock
    async def test_search_passes_country_param(self, itunes):
        route = respx.get(ITUNES_SEARCH_URL).mock(
            return_value=httpx.Response(200, json={"resultCount": 0, "results": []})
        )
        await itunes.search("test", country="NL")
        assert route.calls[0].request.url.params["country"] == "NL"
        await itunes.close()

    @respx.mock
    async def test_search_raises_on_http_error(self, itunes):
        respx.get(ITUNES_SEARCH_URL).mock(
            return_value=httpx.Response(503, text="Service Unavailable")
        )
        with pytest.raises(httpx.HTTPStatusError):
            await itunes.search("test")
        await itunes.close()


class TestITunesClientLookup:
    """Tests for ITunesClient.lookup with mocked HTTP."""

    @respx.mock
    async def test_lookup_returns_app(self, itunes):
        respx.get(ITUNES_LOOKUP_URL).mock(
            return_value=httpx.Response(
                200,
                json={"resultCount": 1, "results": [SAMPLE_APP_RAW]},
            )
        )
        result = await itunes.lookup(123456)
        assert result is not None
        assert result["trackId"] == 123456
        await itunes.close()

    @respx.mock
    async def test_lookup_returns_none_when_not_found(self, itunes):
        respx.get(ITUNES_LOOKUP_URL).mock(
            return_value=httpx.Response(200, json={"resultCount": 0, "results": []})
        )
        result = await itunes.lookup(999999)
        assert result is None
        await itunes.close()


class TestITunesClientLookupBatch:
    """Tests for ITunesClient.lookup_batch."""

    @respx.mock
    async def test_batch_lookup_single_batch(self, itunes):
        respx.get(ITUNES_LOOKUP_URL).mock(
            return_value=httpx.Response(
                200,
                json={"resultCount": 2, "results": [SAMPLE_APP_RAW, SAMPLE_APP_MINIMAL]},
            )
        )
        results = await itunes.lookup_batch([123456, 789012])
        assert len(results) == 2
        await itunes.close()

    @respx.mock
    async def test_batch_lookup_multiple_batches(self, itunes):
        """Should split IDs into batches of 200."""
        ids = list(range(1, 401))  # 400 IDs = 2 batches

        respx.get(ITUNES_LOOKUP_URL).mock(
            return_value=httpx.Response(
                200,
                json={"resultCount": 1, "results": [SAMPLE_APP_RAW]},
            )
        )
        results = await itunes.lookup_batch(ids)
        # 2 batches, each returning 1 result
        assert len(results) == 2
        await itunes.close()

    @respx.mock
    async def test_batch_lookup_empty_list(self, itunes):
        results = await itunes.lookup_batch([])
        assert results == []
        await itunes.close()


class TestITunesClientSearchByGenre:
    """Tests for ITunesClient.search_by_genre."""

    @respx.mock
    async def test_search_by_genre_includes_genre_param(self, itunes):
        route = respx.get(ITUNES_SEARCH_URL).mock(
            return_value=httpx.Response(200, json={"resultCount": 0, "results": []})
        )
        await itunes.search_by_genre(genre_id=6014, country="US", letter="a")
        assert route.calls[0].request.url.params["genreId"] == "6014"
        assert route.calls[0].request.url.params["term"] == "a"
        await itunes.close()


class TestITunesClientLifecycle:
    """Tests for client creation and cleanup."""

    async def test_close_without_open(self, itunes):
        """Closing a client that was never opened should not raise."""
        await itunes.close()

    @respx.mock
    async def test_client_is_reused(self, itunes):
        respx.get(ITUNES_SEARCH_URL).mock(
            return_value=httpx.Response(200, json={"resultCount": 0, "results": []})
        )
        await itunes.search("a")
        client1 = itunes._client
        await itunes.search("b")
        client2 = itunes._client
        assert client1 is client2
        await itunes.close()
