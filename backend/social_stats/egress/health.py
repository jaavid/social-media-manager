"""Connectivity checks for external API routes."""

import time

import requests

from .router import GATEWAY_URL, _gateway_url


def probe(url: str, *, gateway: bool = False, timeout: int = 5) -> dict:
    target = _gateway_url(url) if gateway else url
    started = time.monotonic()

    try:
        response = requests.get(target, timeout=timeout)
        return {
            "reachable": True,
            "status": response.status_code,
            "latency_ms": int((time.monotonic() - started) * 1000),
            "route": "gateway" if gateway else "direct",
        }
    except requests.RequestException as exc:
        return {
            "reachable": False,
            "error": exc.__class__.__name__,
            "latency_ms": int((time.monotonic() - started) * 1000),
            "route": "gateway" if gateway else "direct",
        }


def probe_gateway() -> dict:
    if not GATEWAY_URL:
        return {"reachable": False, "error": "not_configured"}

    return probe(f"{GATEWAY_URL}/_gateway/health", gateway=False)
