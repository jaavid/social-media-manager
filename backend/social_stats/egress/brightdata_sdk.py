"""Instance-scoped SDK engine: only allowlisted Bright Data calls via Cloudflare.

The SDK builds Instagram discovery inputs and interprets dataset responses.
Celery, rather than an in-process SDK polling loop, owns durable polling.
No SDK login, zone provisioning, native HTTP session, or global monkeypatch.
"""
import asyncio
import re
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from brightdata.models import ScrapeResult
from brightdata.scrapers.workflow import WorkflowExecutor

from social_stats.instagram_calendar import InstagramReadError


class GatewayEngine:
    """The SDK's injected engine interface, backed by the shared egress router."""

    def __init__(self, send):
        self.send = send

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    @asynccontextmanager
    async def _request(self, method, url, *, json_data=None, params=None):
        parsed = urlsplit(url)
        if (parsed.scheme != 'https' or parsed.netloc != 'api.brightdata.com'
                or parsed.query or parsed.fragment):
            raise InstagramReadError('brightdata_invalid_response')
        allowed = (method == 'POST' and parsed.path == '/datasets/v3/trigger') or (
            method == 'GET' and re.fullmatch(r'/datasets/v3/(progress|snapshot)/s(?:d)?_[A-Za-z0-9_-]{1,100}', parsed.path)
        )
        if not allowed:
            raise InstagramReadError('brightdata_invalid_response')
        response = await asyncio.to_thread(
            self.send, method, parsed.path, params=params,
            **({'json': json_data} if json_data is not None else {}),
        )
        try:
            yield SDKResponse(response)
        finally:
            response.close()

    def post_to_url(self, url, *, json_data=None, params=None):
        return self._request('POST', url, json_data=json_data, params=params)

    def get_from_url(self, url, *, params=None):
        return self._request('GET', url, params=params)


class SDKResponse:
    """Never give SDK error formatting a raw response body or credentials."""

    def __init__(self, response):
        self.response = response
        self.status = response.status_code

    async def json(self):
        try:
            return self.response.json()
        except ValueError:
            raise InstagramReadError('brightdata_invalid_response') from None

    async def text(self):
        return 'Provider response withheld; inspect safe calendar error code.'


class DurableDiscoveryWorkflow(WorkflowExecutor):
    """Reuse official trigger construction; persist the snapshot before polling."""

    def __init__(self, *args, limit, **kwargs):
        super().__init__(*args, **kwargs)
        self.limit = limit

    async def execute(self, *args, **kwargs):
        # DatasetAPIClient.trigger puts this cap in the documented wrapped body.
        return await super().execute(*args, limit_per_input=self.limit, **kwargs)

    async def _poll_and_fetch(self, *, snapshot_id, **kwargs):
        # The source task saves this identifier and schedules the next GET.
        return ScrapeResult(success=True, status='in_progress', snapshot_id=snapshot_id)
