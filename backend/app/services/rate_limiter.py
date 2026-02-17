"""
Redis-based sliding window rate limiter.

Uses a Redis sorted set to track request timestamps within a rolling window.
This ensures the global iTunes API rate limit is respected across all
Celery workers and API processes.
"""

import asyncio
import logging
import time

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class GlobalRateLimiter:
    """
    Sliding window rate limiter backed by Redis sorted sets.

    Each request is stored as a member in a sorted set with its timestamp
    as the score. Old entries outside the window are pruned on each check.

    Args:
        redis: Async Redis client instance.
        key_prefix: Redis key prefix for the sorted set.
        max_requests: Maximum requests allowed within the window.
        window_seconds: Rolling window duration in seconds.
    """

    def __init__(
        self,
        redis: aioredis.Redis,
        key_prefix: str = "ratelimit:itunes",
        max_requests: int = 18,
        window_seconds: int = 60,
    ):
        self.redis = redis
        self.key = f"{key_prefix}:window"
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def acquire(self) -> bool:
        """
        Try to acquire a rate limit slot.

        Returns True if the request is allowed, False if the limit is exceeded.
        Uses a Redis pipeline for atomicity.
        """
        now = time.time()
        window_start = now - self.window_seconds

        pipe = self.redis.pipeline()
        # Remove entries older than the window
        pipe.zremrangebyscore(self.key, "-inf", window_start)
        # Count remaining entries in the window
        pipe.zcard(self.key)
        results = await pipe.execute()

        current_count = results[1]

        if current_count < self.max_requests:
            # Add this request timestamp as both score and member
            # Use a unique member to avoid collisions (timestamp + random suffix)
            member = f"{now}"
            await self.redis.zadd(self.key, {member: now})
            # Set expiry on the key so it auto-cleans if unused
            await self.redis.expire(self.key, self.window_seconds * 2)
            return True

        return False

    async def wait_and_acquire(self, timeout: float = 30.0) -> bool:
        """
        Wait until a rate limit slot becomes available, then acquire it.

        Polls at short intervals until a slot opens or the timeout expires.

        Args:
            timeout: Maximum seconds to wait before giving up.

        Returns:
            True if a slot was acquired, False if timeout was reached.
        """
        deadline = time.time() + timeout
        poll_interval = 0.5

        while time.time() < deadline:
            if await self.acquire():
                return True

            # Calculate wait time: check when the oldest entry will expire
            remaining = deadline - time.time()
            if remaining <= 0:
                break

            wait = min(poll_interval, remaining)
            await asyncio.sleep(wait)

            # Gradually increase poll interval to reduce Redis load
            poll_interval = min(poll_interval * 1.2, 2.0)

        logger.warning(
            f"Rate limiter timeout after {timeout}s "
            f"(max {self.max_requests} req/{self.window_seconds}s)"
        )
        return False

    async def get_usage(self) -> dict:
        """Return current usage stats for monitoring."""
        now = time.time()
        window_start = now - self.window_seconds

        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(self.key, "-inf", window_start)
        pipe.zcard(self.key)
        results = await pipe.execute()

        current_count = results[1]
        return {
            "current_requests": current_count,
            "max_requests": self.max_requests,
            "window_seconds": self.window_seconds,
            "available": max(0, self.max_requests - current_count),
        }

    async def reset(self) -> None:
        """Clear all rate limit tracking data."""
        await self.redis.delete(self.key)
