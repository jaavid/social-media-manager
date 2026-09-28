"""Central outbound HTTP routing.

The first version intentionally stays small: clients can opt into this layer
without changing their business logic. It supports direct/gateway/auto modes
and avoids proxying application errors such as 401/403.
"""

import os
import time
from dataclasses import dataclass
from urllib.parse import urlparse

import requests


@dataclass(frozen=True)
class RouteResult:
    url: str
    route: str
    latency_ms: int


DEFAULT_MODE = os.getenv("OUTBOUND_ROUTING_DEFAULT", "direct")
GATEWAY_URL = os.getenv("API_GATEWAY_URL", "").rstrip("/")
GATEWAY_KEY = os.getenv("API_GATEWAY_KEY", "")


NETWORK_ERRORS = (
    requests.ConnectionError,
    requests.Timeout,
)


def _gateway_url(url: str) -> str:
    """Map an approved external URL through the gateway.

    Gateway deployments should expose a route registry. We only derive the
    prefix from the hostname here; arbitrary proxying is intentionally not
    supported by this client.
    """
    parsed = urlparse(url)
    host = parsed.netloc.split(":")[0]
    return f"{GATEWAY_URL}/{host}{parsed.path}" + (
        f"?{parsed.query}" if parsed.query else ""
    )


def _request(url: str, *, mode: str, **kwargs):
    if mode == "gateway":
        return requests.request(
            headers={**kwargs.pop("headers", {}), "X-API-Gateway-Key": GATEWAY_KEY},
            url=_gateway_url(url),
            **kwargs,
        )

    return requests.request(url=url, **kwargs)


def outbound_request(url: str, *, mode: str | None = None, **kwargs):
    """Send an external API request through the selected egress path.

    Modes:
      direct  - never use gateway
      gateway - always use gateway
      auto    - fallback only on network failures
    """
    selected = mode or DEFAULT_MODE

    if selected == "gateway":
        return _request(url, mode="gateway", **kwargs)

    try:
        started = time.monotonic()
        response = _request(url, mode="direct", **kwargs)
        response.egress_route = RouteResult(
            url=url,
            route="direct",
            latency_ms=int((time.monotonic() - started) * 1000),
        )
        return response
    except NETWORK_ERRORS:
        if selected != "auto" or not GATEWAY_URL:
            raise

    response = _request(url, mode="gateway", **kwargs)
    response.egress_route = RouteResult(url=url, route="gateway", latency_ms=0)
    return response
