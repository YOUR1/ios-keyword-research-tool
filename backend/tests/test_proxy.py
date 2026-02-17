"""
Tests for proxy infrastructure — ProxyConfig, provider URL formats,
rate limiter, and circuit breaker.

Unit tests that mock Redis and test classes directly without HTTP.
"""

import pytest
import time
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.proxy.base import ProxyConfig
from app.services.proxy.iproyal import IPRoyalProvider, IPROYAL_HOST, IPROYAL_PORT
from app.services.proxy.brightdata import BrightDataProvider, BRIGHTDATA_HOST, BRIGHTDATA_PORT
from app.services.rate_limiter import GlobalRateLimiter
from app.services.circuit_breaker import CircuitBreaker, CircuitState


class TestProxyConfig:
    def test_proxy_config_dataclass(self):
        config = ProxyConfig(
            url="http://user:pass@proxy.example.com:8080",
            country_code="US",
            session_id="abc123",
            provider="test",
        )
        assert config.url == "http://user:pass@proxy.example.com:8080"
        assert config.country_code == "US"
        assert config.session_id == "abc123"
        assert config.provider == "test"

    def test_proxy_config_defaults(self):
        config = ProxyConfig(url="http://proxy.example.com:8080")
        assert config.country_code is None
        assert config.session_id is None
        assert config.provider == ""


class TestIPRoyalUrlFormat:
    async def test_iproyal_url_format(self):
        provider = IPRoyalProvider(user="testuser", password="testpass")
        proxy = await provider.get_proxy(country_code="US")

        assert IPROYAL_HOST in proxy.url
        assert str(IPROYAL_PORT) in proxy.url
        assert "testuser" in proxy.url
        assert "testpass" in proxy.url
        assert "country-us" in proxy.url
        assert proxy.provider == "iproyal"
        assert proxy.country_code == "US"
        assert proxy.session_id is not None

    async def test_iproyal_sticky_proxy(self):
        provider = IPRoyalProvider(user="testuser", password="testpass")
        proxy = await provider.get_sticky_proxy(
            session_id="sticky123", country_code="GB", ttl=600,
        )

        assert "session-sticky123" in proxy.url
        assert "lifetime-10m" in proxy.url
        assert "country-gb" in proxy.url


class TestBrightDataUrlFormat:
    async def test_brightdata_url_format(self):
        provider = BrightDataProvider(
            customer_id="cust123", zone="residential", password="zonepass",
        )
        proxy = await provider.get_proxy(country_code="DE")

        assert BRIGHTDATA_HOST in proxy.url
        assert str(BRIGHTDATA_PORT) in proxy.url
        assert "brd-customer-cust123" in proxy.url
        assert "zone-residential" in proxy.url
        assert "country-de" in proxy.url
        assert "zonepass" in proxy.url
        assert proxy.provider == "brightdata"
        assert proxy.country_code == "DE"

    async def test_brightdata_sticky_proxy(self):
        provider = BrightDataProvider(
            customer_id="cust123", zone="residential", password="zonepass",
        )
        proxy = await provider.get_sticky_proxy(
            session_id="sticky456", country_code="JP",
        )

        assert "session-sticky456" in proxy.url
        assert "country-jp" in proxy.url


class TestRateLimiter:
    async def test_rate_limiter_allows_within_limit(self):
        """Rate limiter should return True when under the request limit."""
        mock_redis = AsyncMock()

        # Mock pipeline: zremrangebyscore removes old, zcard returns low count
        mock_pipeline = AsyncMock()
        mock_pipeline.zremrangebyscore = MagicMock(return_value=mock_pipeline)
        mock_pipeline.zcard = MagicMock(return_value=mock_pipeline)
        mock_pipeline.execute = AsyncMock(return_value=[0, 5])  # 5 requests in window
        mock_redis.pipeline = MagicMock(return_value=mock_pipeline)
        mock_redis.zadd = AsyncMock()
        mock_redis.expire = AsyncMock()

        limiter = GlobalRateLimiter(
            redis=mock_redis,
            max_requests=18,
            window_seconds=60,
        )

        result = await limiter.acquire()
        assert result is True
        mock_redis.zadd.assert_called_once()

    async def test_rate_limiter_rejects_over_limit(self):
        """Rate limiter should return False when at or over the request limit."""
        mock_redis = AsyncMock()

        mock_pipeline = AsyncMock()
        mock_pipeline.zremrangebyscore = MagicMock(return_value=mock_pipeline)
        mock_pipeline.zcard = MagicMock(return_value=mock_pipeline)
        mock_pipeline.execute = AsyncMock(return_value=[0, 18])  # At the limit
        mock_redis.pipeline = MagicMock(return_value=mock_pipeline)

        limiter = GlobalRateLimiter(
            redis=mock_redis,
            max_requests=18,
            window_seconds=60,
        )

        result = await limiter.acquire()
        assert result is False


class TestCircuitBreaker:
    async def test_circuit_breaker_opens_after_failures(self):
        """Circuit breaker should transition from closed to open after threshold failures."""
        mock_redis = AsyncMock()

        # Start in closed state
        state_values = {}

        async def mock_get(key):
            return state_values.get(key)

        async def mock_set(key, value):
            state_values[key] = value

        async def mock_incr(key):
            state_values[key] = state_values.get(key, 0) + 1
            return state_values[key]

        mock_redis.get = mock_get
        mock_redis.set = mock_set
        mock_redis.incr = mock_incr

        # Pipeline for record_failure when threshold is hit
        mock_pipeline = AsyncMock()
        mock_pipeline.set = MagicMock(return_value=mock_pipeline)
        mock_pipeline.execute = AsyncMock(side_effect=lambda: [
            state_values.update({"cb:test:state": CircuitState.OPEN}),
        ])
        mock_redis.pipeline = MagicMock(return_value=mock_pipeline)

        cb = CircuitBreaker(
            redis=mock_redis,
            name="test",
            failure_threshold=3,
            cooldown_seconds=60,
        )

        # Initially closed — can execute
        assert await cb.can_execute() is True

        # Record failures up to threshold
        await cb.record_failure()  # 1
        await cb.record_failure()  # 2
        await cb.record_failure()  # 3 — should open

        # After opening, state should be OPEN
        assert state_values.get("cb:test:state") == CircuitState.OPEN

    async def test_circuit_breaker_closed_allows_requests(self):
        """A closed circuit should allow requests through."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)  # No state = closed

        cb = CircuitBreaker(
            redis=mock_redis,
            name="test_closed",
            failure_threshold=5,
        )

        result = await cb.can_execute()
        assert result is True

    async def test_circuit_breaker_open_blocks_requests(self):
        """An open circuit that hasn't cooled down should block requests."""
        mock_redis = AsyncMock()

        async def mock_get(key):
            if "state" in key:
                return CircuitState.OPEN
            if "opened_at" in key:
                return str(time.time())  # Just opened
            return None

        mock_redis.get = mock_get

        cb = CircuitBreaker(
            redis=mock_redis,
            name="test_open",
            failure_threshold=5,
            cooldown_seconds=300,
        )

        result = await cb.can_execute()
        assert result is False
