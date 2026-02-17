"""
Tests for discover endpoints and ITunesClient search_hints / top_charts methods.

HTTP calls are mocked with respx — no actual Apple API requests are made.
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
import respx

from app.services.itunes import (
    APPLE_RSS_TOP_CHARTS_URL,
    APPLE_SEARCH_HINTS_URL,
    ITUNES_SEARCH_URL,
    ITunesClient,
)
from tests.conftest import auth_headers, create_test_user


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def itunes():
    """Fresh ITunesClient for each test."""
    return ITunesClient()


# ---------------------------------------------------------------------------
# ITunesClient.search_hints tests
# ---------------------------------------------------------------------------

class TestSearchHints:
    """Tests for ITunesClient.search_hints."""

    @respx.mock
    async def test_returns_list_from_dict_hints(self, itunes):
        respx.get(APPLE_SEARCH_HINTS_URL).mock(
            return_value=httpx.Response(
                200,
                json={"hints": [{"term": "calculator"}, {"term": "calendar"}]},
            )
        )
        result = await itunes.search_hints("calc", country="US")
        assert result == ["calculator", "calendar"]
        await itunes.close()

    @respx.mock
    async def test_returns_list_from_string_hints(self, itunes):
        respx.get(APPLE_SEARCH_HINTS_URL).mock(
            return_value=httpx.Response(
                200,
                json={"hints": ["calculator", "calendar"]},
            )
        )
        result = await itunes.search_hints("calc", country="US")
        assert result == ["calculator", "calendar"]
        await itunes.close()

    @respx.mock
    async def test_falls_back_on_api_error(self, itunes):
        respx.get(APPLE_SEARCH_HINTS_URL).mock(
            return_value=httpx.Response(500, text="Internal Server Error")
        )
        respx.get(ITUNES_SEARCH_URL).mock(
            return_value=httpx.Response(
                200,
                json={
                    "resultCount": 2,
                    "results": [
                        {"trackName": "Calculator Pro"},
                        {"trackName": "Calendar App"},
                    ],
                },
            )
        )
        result = await itunes.search_hints("calc", country="US")
        assert result == ["Calculator Pro", "Calendar App"]
        await itunes.close()

    @respx.mock
    async def test_passes_country_param(self, itunes):
        route = respx.get(APPLE_SEARCH_HINTS_URL).mock(
            return_value=httpx.Response(200, json={"hints": []})
        )
        await itunes.search_hints("test", country="NL")
        assert route.calls[0].request.url.params["country"] == "NL"
        await itunes.close()

    @respx.mock
    async def test_handles_empty_hints(self, itunes):
        respx.get(APPLE_SEARCH_HINTS_URL).mock(
            return_value=httpx.Response(200, json={"hints": []})
        )
        result = await itunes.search_hints("xyz", country="US")
        assert result == []
        await itunes.close()

    @respx.mock
    async def test_handles_mixed_hint_formats(self, itunes):
        respx.get(APPLE_SEARCH_HINTS_URL).mock(
            return_value=httpx.Response(
                200,
                json={"hints": ["plain", {"term": "dict_term"}, 42]},
            )
        )
        result = await itunes.search_hints("test", country="US")
        assert result == ["plain", "dict_term"]
        await itunes.close()


# ---------------------------------------------------------------------------
# ITunesClient.top_charts tests
# ---------------------------------------------------------------------------

class TestTopCharts:
    """Tests for ITunesClient.top_charts."""

    @respx.mock
    async def test_returns_apps_from_feed(self, itunes):
        feed_data = {
            "feed": {
                "results": [
                    {
                        "id": "123",
                        "name": "Cool App",
                        "artistName": "Dev Co",
                        "artworkUrl100": "https://example.com/icon.png",
                        "genres": [{"name": "Games"}],
                        "url": "https://apps.apple.com/app/123",
                    }
                ]
            }
        }
        respx.get(url__startswith=APPLE_RSS_TOP_CHARTS_URL).mock(
            return_value=httpx.Response(200, json=feed_data)
        )
        result = await itunes.top_charts(country="US", limit=25, chart="top-free")
        assert len(result) == 1
        assert result[0]["name"] == "Cool App"
        await itunes.close()

    @respx.mock
    async def test_constructs_correct_url(self, itunes):
        route = respx.get(url__startswith=APPLE_RSS_TOP_CHARTS_URL).mock(
            return_value=httpx.Response(
                200, json={"feed": {"results": []}}
            )
        )
        await itunes.top_charts(country="GB", limit=10, chart="top-paid")
        request_url = str(route.calls[0].request.url)
        assert "/gb/apps/top-paid/10/apps.json" in request_url
        await itunes.close()

    @respx.mock
    async def test_handles_empty_feed(self, itunes):
        respx.get(url__startswith=APPLE_RSS_TOP_CHARTS_URL).mock(
            return_value=httpx.Response(
                200, json={"feed": {"results": []}}
            )
        )
        result = await itunes.top_charts(country="US")
        assert result == []
        await itunes.close()

    @respx.mock
    async def test_returns_empty_on_error(self, itunes):
        respx.get(url__startswith=APPLE_RSS_TOP_CHARTS_URL).mock(
            return_value=httpx.Response(500, text="Server Error")
        )
        result = await itunes.top_charts(country="US")
        assert result == []
        await itunes.close()

    @respx.mock
    async def test_caps_limit_at_200(self, itunes):
        route = respx.get(url__startswith=APPLE_RSS_TOP_CHARTS_URL).mock(
            return_value=httpx.Response(
                200, json={"feed": {"results": []}}
            )
        )
        await itunes.top_charts(country="US", limit=500, chart="top-free")
        request_url = str(route.calls[0].request.url)
        assert "/200/apps.json" in request_url
        await itunes.close()


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

class TestSuggestionsEndpoint:
    """Tests for GET /api/v1/discover/suggestions."""

    async def test_requires_auth(self, auth_client):
        resp = await auth_client.get("/api/v1/discover/suggestions?term=calc")
        assert resp.status_code == 401

    async def test_term_min_length_validation(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])
        resp = await auth_client.get(
            "/api/v1/discover/suggestions?term=a", headers=headers
        )
        assert resp.status_code == 422

    async def test_returns_suggestions(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        mock_hints = ["calculator", "calendar", "calorie tracker"]
        with patch(
            "app.api.v1.discover.itunes_client"
        ) as mock_client:
            mock_client.search_hints = AsyncMock(return_value=mock_hints)
            resp = await auth_client.get(
                "/api/v1/discover/suggestions?term=cal&country=US",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["term"] == "cal"
        assert data["country"] == "US"
        assert len(data["suggestions"]) == 3
        assert data["suggestions"][0]["term"] == "calculator"

    async def test_default_country(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        with patch(
            "app.api.v1.discover.itunes_client"
        ) as mock_client:
            mock_client.search_hints = AsyncMock(return_value=[])
            resp = await auth_client.get(
                "/api/v1/discover/suggestions?term=test",
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["country"] == "US"


class TestTrendingEndpoint:
    """Tests for GET /api/v1/discover/trending."""

    async def test_requires_auth(self, auth_client):
        resp = await auth_client.get("/api/v1/discover/trending")
        assert resp.status_code == 401

    async def test_returns_trending_apps(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        mock_apps = [
            {
                "id": "123456",
                "name": "Trending Game",
                "artistName": "Cool Dev",
                "artworkUrl100": "https://example.com/icon.png",
                "genres": [{"name": "Games"}],
                "url": "https://apps.apple.com/app/123456",
            }
        ]
        with patch(
            "app.api.v1.discover.itunes_client"
        ) as mock_client:
            mock_client.top_charts = AsyncMock(return_value=mock_apps)
            resp = await auth_client.get(
                "/api/v1/discover/trending?country=US",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["country"] == "US"
        assert data["chart"] == "top-free"
        assert data["count"] == 1
        assert data["apps"][0]["name"] == "Trending Game"
        assert data["apps"][0]["itunes_id"] == "123456"

    async def test_defaults_to_top_free(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        with patch(
            "app.api.v1.discover.itunes_client"
        ) as mock_client:
            mock_client.top_charts = AsyncMock(return_value=[])
            resp = await auth_client.get(
                "/api/v1/discover/trending",
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["chart"] == "top-free"

    async def test_invalid_chart_falls_back(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        with patch(
            "app.api.v1.discover.itunes_client"
        ) as mock_client:
            mock_client.top_charts = AsyncMock(return_value=[])
            resp = await auth_client.get(
                "/api/v1/discover/trending?chart=invalid-chart",
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["chart"] == "top-free"
