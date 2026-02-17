"""
Tests for app.services.keyword_expansion — OpenAI keyword expansion service.

All HTTP calls are mocked with respx — no actual OpenAI API requests are made.
"""

import json
import pytest
import respx
import httpx
from unittest.mock import AsyncMock, patch

from app.services.keyword_expansion import (
    OpenAIKeywordClient,
    expand_keywords,
    expand_all_categories,
    get_cached_keywords,
    clear_keyword_cache,
    OPENAI_API_URL,
)
from app.utils.constants import SEARCH_TERMS, ITUNES_CATEGORIES


@pytest.fixture()
def openai_client():
    """Fresh OpenAIKeywordClient for each test."""
    return OpenAIKeywordClient()


@pytest.fixture()
def mock_redis():
    """Mock Redis client."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.setex = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.scan_iter = AsyncMock(return_value=iter([]))
    return mock


# ---------------------------------------------------------------------------
# Sample OpenAI API response payloads
# ---------------------------------------------------------------------------

SAMPLE_KEYWORDS_RESPONSE = {
    "id": "chatcmpl-123",
    "object": "chat.completion",
    "created": 1677652288,
    "model": "gpt-4o-mini",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": '["puzzle", "arcade", "racing", "strategy", "rpg", "action", "adventure", "casual", "multiplayer", "offline"]',
            },
            "finish_reason": "stop",
        }
    ],
    "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150},
}

SAMPLE_KEYWORDS_WITH_CODEBLOCK = {
    "id": "chatcmpl-123",
    "object": "chat.completion",
    "created": 1677652288,
    "model": "gpt-4o-mini",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": '```json\n["puzzle", "arcade", "racing"]\n```',
            },
            "finish_reason": "stop",
        }
    ],
}

SAMPLE_INVALID_JSON_RESPONSE = {
    "id": "chatcmpl-123",
    "object": "chat.completion",
    "created": 1677652288,
    "model": "gpt-4o-mini",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "Here are some keywords: puzzle, arcade, racing",
            },
            "finish_reason": "stop",
        }
    ],
}


class TestOpenAIKeywordClient:
    """Tests for OpenAIKeywordClient.generate_keywords."""

    @respx.mock
    async def test_generate_keywords_returns_list(self, openai_client):
        respx.post(OPENAI_API_URL).mock(
            return_value=httpx.Response(200, json=SAMPLE_KEYWORDS_RESPONSE)
        )

        with patch("app.services.keyword_expansion.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_MODEL = "gpt-4o-mini"
            mock_settings.KEYWORD_EXPANSION_RATE_LIMIT = 10

            result = await openai_client.generate_keywords("Games")
            assert isinstance(result, list)
            assert len(result) == 10
            assert "puzzle" in result
            assert "arcade" in result

        await openai_client.close()

    @respx.mock
    async def test_generate_keywords_handles_codeblock(self, openai_client):
        respx.post(OPENAI_API_URL).mock(
            return_value=httpx.Response(200, json=SAMPLE_KEYWORDS_WITH_CODEBLOCK)
        )

        with patch("app.services.keyword_expansion.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_MODEL = "gpt-4o-mini"
            mock_settings.KEYWORD_EXPANSION_RATE_LIMIT = 10

            result = await openai_client.generate_keywords("Games")
            assert isinstance(result, list)
            assert len(result) == 3
            assert "puzzle" in result

        await openai_client.close()

    @respx.mock
    async def test_generate_keywords_returns_empty_on_invalid_json(self, openai_client):
        respx.post(OPENAI_API_URL).mock(
            return_value=httpx.Response(200, json=SAMPLE_INVALID_JSON_RESPONSE)
        )

        with patch("app.services.keyword_expansion.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_MODEL = "gpt-4o-mini"
            mock_settings.KEYWORD_EXPANSION_RATE_LIMIT = 10

            result = await openai_client.generate_keywords("Games")
            assert result == []

        await openai_client.close()

    @respx.mock
    async def test_generate_keywords_returns_empty_on_http_error(self, openai_client):
        respx.post(OPENAI_API_URL).mock(
            return_value=httpx.Response(500, text="Internal Server Error")
        )

        with patch("app.services.keyword_expansion.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_MODEL = "gpt-4o-mini"
            mock_settings.KEYWORD_EXPANSION_RATE_LIMIT = 10

            result = await openai_client.generate_keywords("Games")
            assert result == []

        await openai_client.close()


class TestExpandKeywords:
    """Tests for expand_keywords helper function."""

    async def test_returns_static_terms_when_disabled(self):
        with patch("app.services.keyword_expansion.settings") as mock_settings:
            mock_settings.KEYWORD_EXPANSION_ENABLED = False
            mock_settings.OPENAI_API_KEY = ""

            result = await expand_keywords("Games", category_id=6014)
            assert result == SEARCH_TERMS

    async def test_returns_static_terms_when_no_api_key(self):
        with patch("app.services.keyword_expansion.settings") as mock_settings:
            mock_settings.KEYWORD_EXPANSION_ENABLED = True
            mock_settings.OPENAI_API_KEY = ""

            result = await expand_keywords("Games", category_id=6014)
            assert result == SEARCH_TERMS

    async def test_returns_cached_keywords(self, mock_redis):
        cached_keywords = ["cached1", "cached2", "cached3"]
        mock_redis.get = AsyncMock(return_value=json.dumps(cached_keywords))

        with patch("app.services.keyword_expansion.settings") as mock_settings, \
             patch("app.services.keyword_expansion.get_redis", return_value=mock_redis):
            mock_settings.KEYWORD_EXPANSION_ENABLED = True
            mock_settings.OPENAI_API_KEY = "test-key"

            result = await expand_keywords("Games", category_id=6014, use_cache=True)
            assert result == cached_keywords
            mock_redis.get.assert_called_once_with("keywords:expanded:6014")

    @respx.mock
    async def test_caches_generated_keywords(self, mock_redis):
        mock_redis.get = AsyncMock(return_value=None)  # Cache miss

        respx.post(OPENAI_API_URL).mock(
            return_value=httpx.Response(200, json=SAMPLE_KEYWORDS_RESPONSE)
        )

        with patch("app.services.keyword_expansion.settings") as mock_settings, \
             patch("app.services.keyword_expansion.get_redis", return_value=mock_redis):
            mock_settings.KEYWORD_EXPANSION_ENABLED = True
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_MODEL = "gpt-4o-mini"
            mock_settings.KEYWORD_EXPANSION_RATE_LIMIT = 10
            mock_settings.KEYWORD_EXPANSION_CACHE_TTL = 86400

            result = await expand_keywords("Games", category_id=6014, use_cache=True)

            # Should include generated keywords + static terms
            assert "puzzle" in result
            assert all(term in result for term in SEARCH_TERMS[:5])

            # Verify cache was written
            mock_redis.setex.assert_called_once()

    @respx.mock
    async def test_falls_back_to_static_terms_on_failure(self, mock_redis):
        mock_redis.get = AsyncMock(return_value=None)

        respx.post(OPENAI_API_URL).mock(
            return_value=httpx.Response(500, text="Error")
        )

        with patch("app.services.keyword_expansion.settings") as mock_settings, \
             patch("app.services.keyword_expansion.get_redis", return_value=mock_redis):
            mock_settings.KEYWORD_EXPANSION_ENABLED = True
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_MODEL = "gpt-4o-mini"
            mock_settings.KEYWORD_EXPANSION_RATE_LIMIT = 10

            result = await expand_keywords("Games", category_id=6014)
            assert result == SEARCH_TERMS


class TestExpandAllCategories:
    """Tests for expand_all_categories function."""

    async def test_returns_static_for_all_when_disabled(self):
        with patch("app.services.keyword_expansion.settings") as mock_settings:
            mock_settings.KEYWORD_EXPANSION_ENABLED = False
            mock_settings.OPENAI_API_KEY = ""

            result = await expand_all_categories()

            assert len(result) == len(ITUNES_CATEGORIES)
            for cat_id in ITUNES_CATEGORIES:
                assert result[cat_id] == SEARCH_TERMS


class TestGetCachedKeywords:
    """Tests for get_cached_keywords function."""

    async def test_returns_cached_keywords(self, mock_redis):
        cached = ["kw1", "kw2"]
        mock_redis.get = AsyncMock(return_value=json.dumps(cached))

        with patch("app.services.keyword_expansion.get_redis", return_value=mock_redis):
            result = await get_cached_keywords(6014)
            assert result == cached

    async def test_returns_none_on_cache_miss(self, mock_redis):
        mock_redis.get = AsyncMock(return_value=None)

        with patch("app.services.keyword_expansion.get_redis", return_value=mock_redis):
            result = await get_cached_keywords(6014)
            assert result is None


class TestClearKeywordCache:
    """Tests for clear_keyword_cache function."""

    async def test_clears_all_keyword_cache_entries(self, mock_redis):
        async def mock_scan_iter(pattern):
            for key in ["keywords:expanded:6014", "keywords:expanded:6000"]:
                yield key

        mock_redis.scan_iter = mock_scan_iter
        mock_redis.delete = AsyncMock(return_value=2)

        with patch("app.services.keyword_expansion.get_redis", return_value=mock_redis):
            deleted = await clear_keyword_cache()
            assert deleted == 2
            mock_redis.delete.assert_called_once()

    async def test_returns_zero_when_no_cache_entries(self, mock_redis):
        async def mock_scan_iter(pattern):
            return
            yield  # Makes this an async generator that yields nothing

        mock_redis.scan_iter = mock_scan_iter

        with patch("app.services.keyword_expansion.get_redis", return_value=mock_redis):
            deleted = await clear_keyword_cache()
            assert deleted == 0


class TestOpenAIKeywordClientLifecycle:
    """Tests for client creation and cleanup."""

    async def test_close_without_open(self, openai_client):
        """Closing a client that was never opened should not raise."""
        await openai_client.close()

    @respx.mock
    async def test_client_is_reused(self, openai_client):
        respx.post(OPENAI_API_URL).mock(
            return_value=httpx.Response(200, json=SAMPLE_KEYWORDS_RESPONSE)
        )

        with patch("app.services.keyword_expansion.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_MODEL = "gpt-4o-mini"
            mock_settings.KEYWORD_EXPANSION_RATE_LIMIT = 10

            await openai_client.generate_keywords("Games")
            client1 = openai_client._client
            await openai_client.generate_keywords("Business")
            client2 = openai_client._client
            assert client1 is client2

        await openai_client.close()
