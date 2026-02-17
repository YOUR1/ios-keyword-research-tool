"""
Redis-based circuit breaker for external API calls.

Implements the circuit breaker pattern with three states:
- closed: requests flow normally, failures are counted
- open: requests are blocked, waits for cooldown period
- half_open: allows a single test request through

State is stored in Redis so it works across multiple workers/processes.
"""

import logging
import time

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class CircuitState:
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """
    Redis-backed circuit breaker for protecting external service calls.

    Args:
        redis: Async Redis client instance.
        name: Unique name for this circuit (e.g. "itunes_api", "proxy_iproyal").
        failure_threshold: Number of consecutive failures before opening the circuit.
        cooldown_seconds: How long the circuit stays open before transitioning to half-open.
    """

    def __init__(
        self,
        redis: aioredis.Redis,
        name: str,
        failure_threshold: int = 10,
        cooldown_seconds: int = 300,
    ):
        self.redis = redis
        self.name = name
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds

        # Redis key names
        self._failures_key = f"cb:{name}:failures"
        self._state_key = f"cb:{name}:state"
        self._opened_at_key = f"cb:{name}:opened_at"

    async def _get_state(self) -> str:
        """Read current circuit state from Redis."""
        state = await self.redis.get(self._state_key)
        if state is None:
            return CircuitState.CLOSED
        return state

    async def _set_state(self, state: str) -> None:
        """Set circuit state in Redis."""
        await self.redis.set(self._state_key, state)

    async def _get_failure_count(self) -> int:
        """Get current consecutive failure count."""
        count = await self.redis.get(self._failures_key)
        return int(count) if count else 0

    async def can_execute(self) -> bool:
        """
        Check whether a request is allowed through the circuit.

        - closed: always allowed
        - open: blocked unless cooldown has elapsed (transitions to half_open)
        - half_open: allowed (single test request)

        Returns:
            True if the request should proceed, False if it should be blocked.
        """
        state = await self._get_state()

        if state == CircuitState.CLOSED:
            return True

        if state == CircuitState.OPEN:
            # Check if cooldown period has elapsed
            opened_at = await self.redis.get(self._opened_at_key)
            if opened_at:
                elapsed = time.time() - float(opened_at)
                if elapsed >= self.cooldown_seconds:
                    # Transition to half-open: allow one test request
                    await self._set_state(CircuitState.HALF_OPEN)
                    logger.info(
                        f"Circuit '{self.name}' transitioning to half-open "
                        f"after {elapsed:.0f}s cooldown"
                    )
                    return True
            return False

        if state == CircuitState.HALF_OPEN:
            # Allow the test request through
            return True

        return False

    async def record_success(self) -> None:
        """
        Record a successful request.

        Resets failure counter and closes the circuit if it was half-open.
        """
        state = await self._get_state()

        if state == CircuitState.HALF_OPEN:
            logger.info(f"Circuit '{self.name}' closing after successful test request")

        # Reset everything on success
        pipe = self.redis.pipeline()
        pipe.set(self._state_key, CircuitState.CLOSED)
        pipe.set(self._failures_key, 0)
        pipe.delete(self._opened_at_key)
        await pipe.execute()

    async def record_failure(self) -> None:
        """
        Record a failed request.

        Increments the failure counter. If threshold is exceeded, opens the circuit.
        If the circuit was half-open, immediately reopens.
        """
        state = await self._get_state()

        if state == CircuitState.HALF_OPEN:
            # Test request failed: reopen the circuit
            logger.warning(
                f"Circuit '{self.name}' reopening after failed test request"
            )
            pipe = self.redis.pipeline()
            pipe.set(self._state_key, CircuitState.OPEN)
            pipe.set(self._opened_at_key, str(time.time()))
            await pipe.execute()
            return

        # Increment failure counter
        failures = await self.redis.incr(self._failures_key)

        if failures >= self.failure_threshold:
            logger.warning(
                f"Circuit '{self.name}' opening after {failures} consecutive failures "
                f"(threshold: {self.failure_threshold})"
            )
            pipe = self.redis.pipeline()
            pipe.set(self._state_key, CircuitState.OPEN)
            pipe.set(self._opened_at_key, str(time.time()))
            await pipe.execute()

    async def get_status(self) -> dict:
        """Return current circuit breaker status for monitoring."""
        state = await self._get_state()
        failures = await self._get_failure_count()
        opened_at_raw = await self.redis.get(self._opened_at_key)

        status = {
            "name": self.name,
            "state": state,
            "failures": failures,
            "failure_threshold": self.failure_threshold,
            "cooldown_seconds": self.cooldown_seconds,
        }

        if opened_at_raw:
            opened_at = float(opened_at_raw)
            elapsed = time.time() - opened_at
            status["opened_at"] = opened_at
            status["seconds_in_open"] = elapsed
            status["cooldown_remaining"] = max(0, self.cooldown_seconds - elapsed)

        return status

    async def reset(self) -> None:
        """Manually reset the circuit breaker to closed state."""
        pipe = self.redis.pipeline()
        pipe.set(self._state_key, CircuitState.CLOSED)
        pipe.set(self._failures_key, 0)
        pipe.delete(self._opened_at_key)
        await pipe.execute()
        logger.info(f"Circuit '{self.name}' manually reset to closed")
