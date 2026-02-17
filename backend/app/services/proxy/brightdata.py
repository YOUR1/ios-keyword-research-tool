"""
Bright Data (formerly Luminati) proxy provider implementation.

URL format: http://brd-customer-{cid}-zone-{zone}-country-{cc}-session-{sid}:{pass}@brd.superproxy.io:33335

Bright Data provides datacenter and residential proxies with extensive
geo-targeting and session control via the username field.
"""

import logging
import uuid

import httpx

from app.services.proxy.base import ProxyConfig, ProxyProvider

logger = logging.getLogger(__name__)

BRIGHTDATA_HOST = "brd.superproxy.io"
BRIGHTDATA_PORT = 33335
HEALTH_CHECK_URL = "https://httpbin.org/ip"


class BrightDataProvider(ProxyProvider):
    """
    Bright Data residential proxy provider.

    Args:
        customer_id: Bright Data customer ID.
        zone: Proxy zone name.
        password: Bright Data zone password.
    """

    def __init__(self, customer_id: str, zone: str, password: str):
        self.customer_id = customer_id
        self.zone = zone
        self.password = password
        self.provider_name = "brightdata"

    def _build_proxy_url(
        self,
        country_code: str | None = None,
        session_id: str | None = None,
    ) -> str:
        """
        Build the Bright Data proxy URL with encoded parameters.

        Parameters are embedded in the username field separated by hyphens.
        """
        username_parts = [
            f"brd-customer-{self.customer_id}",
            f"zone-{self.zone}",
        ]

        if country_code:
            username_parts.append(f"country-{country_code.lower()}")

        if session_id:
            username_parts.append(f"session-{session_id}")

        username = "-".join(username_parts)
        return f"http://{username}:{self.password}@{BRIGHTDATA_HOST}:{BRIGHTDATA_PORT}"

    async def get_proxy(
        self, country_code: str | None = None
    ) -> ProxyConfig:
        """Get a rotating proxy (new IP each request)."""
        session_id = f"rand{uuid.uuid4().hex[:10]}"
        url = self._build_proxy_url(
            country_code=country_code,
            session_id=session_id,
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
        url = self._build_proxy_url(
            country_code=country_code,
            session_id=session_id,
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
            f"Bright Data proxy failure: session={proxy.session_id} "
            f"country={proxy.country_code} error={error}"
        )

    async def report_success(self, proxy: ProxyConfig) -> None:
        """Log proxy success."""
        logger.debug(
            f"Bright Data proxy success: session={proxy.session_id} "
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
            logger.error(f"Bright Data health check failed: {e}")

        return result
