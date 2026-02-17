"""
Proxy manager that orchestrates multiple proxy providers with failover.

Tries the primary provider first, falls back to secondary providers
on failure. Tracks consecutive failures per provider and temporarily
skips providers that are consistently failing.
"""

import logging
from typing import Any, Awaitable, Callable

from app.services.proxy.base import ProxyConfig, ProxyProvider

logger = logging.getLogger(__name__)

# Skip a provider after this many consecutive failures
MAX_CONSECUTIVE_FAILURES = 5
# Max retry attempts when executing with proxy
MAX_RETRY_ATTEMPTS = 3


class ProxyManager:
    """
    Orchestrates multiple proxy providers with automatic failover.

    Maintains in-memory failure counters per provider and skips
    providers that exceed the consecutive failure threshold.

    Args:
        providers: Ordered list of proxy providers (first = primary).
    """

    def __init__(self, providers: list[ProxyProvider]):
        if not providers:
            raise ValueError("At least one proxy provider is required")
        self.providers = providers
        # Track consecutive failures per provider index
        self._failure_counts: dict[int, int] = {
            i: 0 for i in range(len(providers))
        }

    def _is_provider_available(self, index: int) -> bool:
        """Check if a provider has not exceeded its failure threshold."""
        return self._failure_counts.get(index, 0) < MAX_CONSECUTIVE_FAILURES

    def _record_provider_failure(self, index: int) -> None:
        """Increment consecutive failure count for a provider."""
        self._failure_counts[index] = self._failure_counts.get(index, 0) + 1
        count = self._failure_counts[index]
        if count >= MAX_CONSECUTIVE_FAILURES:
            provider_name = getattr(
                self.providers[index], "provider_name", f"provider_{index}"
            )
            logger.warning(
                f"Proxy provider '{provider_name}' disabled after "
                f"{count} consecutive failures"
            )

    def _record_provider_success(self, index: int) -> None:
        """Reset consecutive failure count on success."""
        self._failure_counts[index] = 0

    def reset_provider(self, index: int) -> None:
        """Manually re-enable a provider by resetting its failure count."""
        if 0 <= index < len(self.providers):
            self._failure_counts[index] = 0

    def reset_all_providers(self) -> None:
        """Re-enable all providers."""
        for i in range(len(self.providers)):
            self._failure_counts[i] = 0

    async def get_proxy(
        self, country_code: str | None = None
    ) -> ProxyConfig:
        """
        Get a proxy from the first available provider.

        Tries providers in order, skipping those that have exceeded
        their failure threshold.

        Args:
            country_code: Optional country code for geo-targeting.

        Returns:
            ProxyConfig from the first successful provider.

        Raises:
            RuntimeError: If all providers are unavailable or fail.
        """
        errors = []

        for i, provider in enumerate(self.providers):
            if not self._is_provider_available(i):
                continue

            try:
                proxy = await provider.get_proxy(country_code=country_code)
                return proxy
            except Exception as e:
                provider_name = getattr(
                    provider, "provider_name", f"provider_{i}"
                )
                logger.warning(
                    f"Failed to get proxy from '{provider_name}': {e}"
                )
                self._record_provider_failure(i)
                errors.append(f"{provider_name}: {e}")

        raise RuntimeError(
            f"All proxy providers unavailable: {'; '.join(errors) if errors else 'all disabled'}"
        )

    async def get_sticky_proxy(
        self,
        session_id: str,
        country_code: str | None = None,
        ttl: int = 600,
    ) -> ProxyConfig:
        """
        Get a sticky proxy from the first available provider.

        Args:
            session_id: Session identifier for IP stickiness.
            country_code: Optional country code for geo-targeting.
            ttl: Session lifetime in seconds.

        Returns:
            ProxyConfig from the first successful provider.

        Raises:
            RuntimeError: If all providers are unavailable or fail.
        """
        errors = []

        for i, provider in enumerate(self.providers):
            if not self._is_provider_available(i):
                continue

            try:
                proxy = await provider.get_sticky_proxy(
                    session_id=session_id,
                    country_code=country_code,
                    ttl=ttl,
                )
                return proxy
            except Exception as e:
                provider_name = getattr(
                    provider, "provider_name", f"provider_{i}"
                )
                logger.warning(
                    f"Failed to get sticky proxy from '{provider_name}': {e}"
                )
                self._record_provider_failure(i)
                errors.append(f"{provider_name}: {e}")

        raise RuntimeError(
            f"All proxy providers unavailable: {'; '.join(errors) if errors else 'all disabled'}"
        )

    async def execute_with_proxy(
        self,
        coro_factory: Callable[[ProxyConfig], Awaitable[Any]],
        country_code: str | None = None,
    ) -> Any:
        """
        Execute an async operation with proxy, retrying with different proxies on failure.

        The coro_factory receives a ProxyConfig and should return an awaitable.
        On failure, a new proxy is fetched and the operation is retried.

        Args:
            coro_factory: Callable that takes ProxyConfig and returns a coroutine.
            country_code: Optional country code for geo-targeting.

        Returns:
            The result of the successful coroutine execution.

        Raises:
            RuntimeError: If all retry attempts are exhausted.
        """
        last_error = None

        for attempt in range(1, MAX_RETRY_ATTEMPTS + 1):
            try:
                proxy = await self.get_proxy(country_code=country_code)
            except RuntimeError as e:
                raise RuntimeError(
                    f"Cannot execute: no proxy available after {attempt} attempts"
                ) from e

            try:
                result = await coro_factory(proxy)

                # Report success to the provider
                for i, provider in enumerate(self.providers):
                    provider_name = getattr(
                        provider, "provider_name", f"provider_{i}"
                    )
                    if provider_name == proxy.provider:
                        await provider.report_success(proxy)
                        self._record_provider_success(i)
                        break

                return result

            except Exception as e:
                last_error = e
                logger.warning(
                    f"Proxy request failed (attempt {attempt}/{MAX_RETRY_ATTEMPTS}): "
                    f"provider={proxy.provider} error={e}"
                )

                # Report failure to the provider
                for i, provider in enumerate(self.providers):
                    provider_name = getattr(
                        provider, "provider_name", f"provider_{i}"
                    )
                    if provider_name == proxy.provider:
                        await provider.report_failure(proxy, e)
                        self._record_provider_failure(i)
                        break

        raise RuntimeError(
            f"All {MAX_RETRY_ATTEMPTS} proxy attempts failed. "
            f"Last error: {last_error}"
        )

    async def health_check_all(self) -> list[dict]:
        """Run health checks on all providers and return results."""
        results = []
        for i, provider in enumerate(self.providers):
            check = await provider.health_check()
            check["available"] = self._is_provider_available(i)
            check["consecutive_failures"] = self._failure_counts.get(i, 0)
            results.append(check)
        return results
