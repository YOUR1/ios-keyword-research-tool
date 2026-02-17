"""
IPRoyal residential proxy provider implementation.

URL format: http://{user}:{pass}_country-{cc}_session-{sid}_lifetime-{min}m@geo.iproyal.com:12321

IPRoyal provides residential proxies with geo-targeting and session stickiness
via URL-encoded parameters in the password field.
"""

import logging
import uuid

import httpx

from app.services.proxy.base import ProxyConfig, ProxyProvider

logger = logging.getLogger(__name__)

IPROYAL_HOST = "geo.iproyal.com"
IPROYAL_PORT = 12321
HEALTH_CHECK_URL = "https://httpbin.org/ip"


class IPRoyalProvider(ProxyProvider):
    """
    IPRoyal residential proxy provider.

    Args:
        user: IPRoyal account username.
        password: IPRoyal account password.
    """

    def __init__(self, user: str, password: str):
        self.user = user
        self.password = password
        self.provider_name = "iproyal"

    def _build_proxy_url(
        self,
        country_code: str | None = None,
        session_id: str | None = None,
        lifetime_minutes: int = 10,
    ) -> str:
        """
        Build the IPRoyal proxy URL with encoded parameters.

        Parameters are appended to the password field separated by underscores.
        """
        password_parts = [self.password]

        if country_code:
            password_parts.append(f"country-{country_code.lower()}")

        if session_id:
            password_parts.append(f"session-{session_id}")
            password_parts.append(f"lifetime-{lifetime_minutes}m")

        encoded_password = "_".join(password_parts)
        return f"http://{self.user}:{encoded_password}@{IPROYAL_HOST}:{IPROYAL_PORT}"

    async def get_proxy(
        self, country_code: str | None = None
    ) -> ProxyConfig:
        """Get a rotating proxy (new IP each request)."""
        session_id = uuid.uuid4().hex[:12]
        url = self._build_proxy_url(
            country_code=country_code,
            session_id=session_id,
            lifetime_minutes=1,
        )
        return ProxyConfig(
            url=url,
            country_code=country_code,
            session_id=session_id,
            provider=self.provider_name,
        )

    async def get_sticky_proxy(
        self,
        session_id: str,
        country_code: str | None = None,
        ttl: int = 600,
    ) -> ProxyConfig:
        """Get a sticky proxy that maintains the same IP for the session."""
        lifetime_minutes = max(1, ttl // 60)
        url = self._build_proxy_url(
            country_code=country_code,
            session_id=session_id,
            lifetime_minutes=lifetime_minutes,
        )
        return ProxyConfig(
            url=url,
            country_code=country_code,
            session_id=session_id,
            provider=self.provider_name,
        )

    async def report_failure(
        self, proxy: ProxyConfig, error: Exception
    ) -> None:
        """Log proxy failure for debugging."""
        logger.warning(
            f"IPRoyal proxy failure: session={proxy.session_id} "
            f"country={proxy.country_code} error={error}"
        )

    async def report_success(self, proxy: ProxyConfig) -> None:
        """Log proxy success (no-op for IPRoyal, no reporting API)."""
        logger.debug(
            f"IPRoyal proxy success: session={proxy.session_id} "
            f"country={proxy.country_code}"
        )

    async def health_check(self) -> dict:
        """
        Verify the proxy is working by making a test request through it.

        Returns dict with health status and visible IP.
        """
        result = {
            "provider": self.provider_name,
            "healthy": False,
            "ip": None,
            "error": None,
        }

        try:
            proxy_config = await self.get_proxy()
            async with httpx.AsyncClient(
                proxy=proxy_config.url,
                timeout=15.0,
            ) as client:
                response = await client.get(HEALTH_CHECK_URL)
                response.raise_for_status()
                data = response.json()
                result["healthy"] = True
                result["ip"] = data.get("origin")
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"IPRoyal health check failed: {e}")

        return result
