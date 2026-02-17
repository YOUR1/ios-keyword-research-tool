"""
Abstract base class for proxy providers.

Defines the interface that all proxy provider implementations must follow.
Supports both rotating and sticky (session-based) proxies.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ProxyConfig:
    """Configuration for a single proxy connection."""

    url: str
    country_code: str | None = None
    session_id: str | None = None
    provider: str = ""


class ProxyProvider(ABC):
    """
    Abstract proxy provider interface.

    All proxy implementations (IPRoyal, Bright Data, etc.) must implement
    these methods to provide a consistent API for the proxy manager.
    """

    @abstractmethod
    async def get_proxy(
        self, country_code: str | None = None
    ) -> ProxyConfig:
        """
        Get a rotating proxy.

        Each call may return a different IP address.

        Args:
            country_code: Optional two-letter country code for geo-targeting.

        Returns:
            ProxyConfig with the proxy URL and metadata.
        """
        ...

    @abstractmethod
    async def get_sticky_proxy(
        self,
        session_id: str,
        country_code: str | None = None,
        ttl: int = 600,
    ) -> ProxyConfig:
        """
        Get a sticky (session-based) proxy.

        Returns the same IP for the given session_id within the TTL window.

        Args:
            session_id: Unique identifier to maintain the same IP.
            country_code: Optional two-letter country code for geo-targeting.
            ttl: Session lifetime in seconds.

        Returns:
            ProxyConfig with the proxy URL and metadata.
        """
        ...

    @abstractmethod
    async def report_failure(
        self, proxy: ProxyConfig, error: Exception
    ) -> None:
        """
        Report a proxy failure for provider-side tracking.

        Args:
            proxy: The proxy configuration that failed.
            error: The exception that occurred.
        """
        ...

    @abstractmethod
    async def report_success(self, proxy: ProxyConfig) -> None:
        """
        Report a successful proxy request.

        Args:
            proxy: The proxy configuration that succeeded.
        """
        ...

    @abstractmethod
    async def health_check(self) -> dict:
        """
        Run a health check against the proxy provider.

        Returns:
            Dict with at least {"healthy": bool, "provider": str, ...}
        """
        ...
