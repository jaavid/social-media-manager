"""Mandatory Cloudflare gateway routing for server-side Meta/Instagram HTTP.

The facade keeps other providers in mixed modules unchanged. The SDK adapter
rewrites already-prepared requests so Instagram cookies retain their domains.
No process-wide monkeypatches and no direct fallback are used.
"""
from urllib.parse import urlparse

import requests as http
from requests.adapters import HTTPAdapter

from .router import _gateway_url, gateway_key, outbound_request

META_ORIGINS = {
    'graph.facebook.com': 'meta',
    'graph.instagram.com': 'instagram_graph',
    'api.instagram.com': 'instagram_oauth',
    'www.instagram.com': 'instagram_web',
    'instagram.com': 'instagram_root',
    'i.instagram.com': 'instagram_private',
    'b.i.instagram.com': 'instagram_private_b',
    'www.facebook.com': 'facebook_web',
    'b-graph.facebook.com': 'meta_b_graph',
    'rupload.facebook.com': 'meta_upload',
}


class MetaGatewayError(http.RequestException):
    """A safe error message with no URL, token, cookie or gateway secret."""


def meta_service(url, *, required=False):
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or '').lower()
        is_meta = any(host == suffix or host.endswith('.' + suffix)
                      for suffix in ('facebook.com', 'instagram.com'))
        if not is_meta:
            if required:
                raise MetaGatewayError('Endpoint is not an allowlisted Meta API origin.')
            return None
        service = META_ORIGINS.get(host)
        if (not service or parsed.scheme != 'https' or parsed.port not in {None, 443}
                or parsed.username or parsed.password or parsed.fragment):
            raise MetaGatewayError('Endpoint is not an allowlisted HTTPS Meta API origin.')
        return service
    except (TypeError, ValueError):
        raise MetaGatewayError('Invalid Meta endpoint.') from None


def gateway_target(service, url):
    try:
        if not gateway_key():
            raise MetaGatewayError('Meta gateway key is not configured.')
        return _gateway_url(service, url)
    except (ValueError, RuntimeError):
        raise MetaGatewayError('Meta gateway is not configured correctly.') from None


class MetaGatewayAdapter(HTTPAdapter):
    """SDK sessions may only reach an allowlisted origin via the gateway."""
    def send(self, request, **kwargs):
        service = meta_service(request.url, required=True)
        forwarded = request.copy()
        forwarded.url = gateway_target(service, request.url)
        forwarded.headers.pop('Host', None)
        forwarded.headers['X-API-Gateway-Key'] = gateway_key()
        kwargs['proxies'] = {}
        kwargs['verify'] = True
        kwargs.setdefault('timeout', 30)
        if kwargs['timeout'] is None:
            kwargs['timeout'] = 30
        try:
            response = super().send(forwarded, **kwargs)
        except http.RequestException:
            raise MetaGatewayError('Meta gateway request failed.') from None
        # Requests must not follow a Location or expose the internal key in SDK
        # logs. Cookie extraction still sees the original prepared request.
        response.url = request.url
        response.request = request
        if 300 <= response.status_code < 400:
            response.close()
            raise MetaGatewayError('Meta gateway redirect was blocked.')
        if response.status_code >= 500:
            response.close()
            raise MetaGatewayError('Meta gateway upstream is unavailable.')
        if response.status_code in {401, 404}:
            try:
                error = response.json().get('error')
            except (ValueError, AttributeError):
                error = None
            if isinstance(error, str) and error in {'unauthorized', 'route_not_found'}:
                response.close()
                raise MetaGatewayError('Meta gateway route or authentication is unavailable.')
        return response


def route_instagram_reader(reader):
    for session in (reader.public, reader.private):
        session.trust_env = False
        session.proxies.clear()
        adapter = MetaGatewayAdapter(max_retries=0)
        session.mount('https://', adapter)
        session.mount('http://', adapter)
        # SDK init()/set_settings()/login() remount their own HTTP adapters.
        # Pin this session's adapter lookup as well, so later remounts cannot
        # silently restore a direct path. This is local to this reader only.
        def gateway_adapter(url, _adapter=adapter):
            meta_service(url, required=True)
            return _adapter
        session.get_adapter = gateway_adapter
        original_close = session.close
        def close_gateway_session(_adapter=adapter, _close=original_close):
            _adapter.close()
            _close()
        session.close = close_gateway_session
    return reader


class MetaAwareSession(http.Session):
    def __init__(self):
        super().__init__()
        self.mount('https://', MetaAwareAdapter())
        self.mount('http://', MetaAwareAdapter())


class MetaAwareAdapter(MetaGatewayAdapter):
    def send(self, request, **kwargs):
        if meta_service(request.url) is None:
            return HTTPAdapter.send(self, request, **kwargs)
        return super().send(request, **kwargs)


class MetaAwareRequests:
    """Requests-compatible methods for modules which call multiple providers."""
    def __getattr__(self, name):
        return getattr(http, name)

    def request(self, method, url, **kwargs):
        service = meta_service(url)
        if service is None:
            return http.request(method, url, **kwargs)
        gateway_target(service, url)  # Validate before any network activity.
        headers = dict(kwargs.pop('headers', {}) or {})
        # Host overrides must not bypass the destination chosen by the Worker.
        headers = {key: value for key, value in headers.items() if key.lower() != 'host'}
        kwargs['proxies'] = {}
        kwargs['verify'] = True
        kwargs.setdefault('timeout', 30)
        try:
            return outbound_request(service, method, url, mode='gateway', headers=headers, **kwargs)
        except http.RequestException:
            raise MetaGatewayError('Meta gateway request failed.') from None

    def Session(self):
        return MetaAwareSession()

    def head(self, url, **kwargs):
        return self.request('HEAD', url, **kwargs)

    def patch(self, url, **kwargs):
        return self.request('PATCH', url, **kwargs)

    def options(self, url, **kwargs):
        return self.request('OPTIONS', url, **kwargs)

    def get(self, url, **kwargs):
        return self.request('GET', url, **kwargs)

    def post(self, url, **kwargs):
        return self.request('POST', url, **kwargs)

    def delete(self, url, **kwargs):
        return self.request('DELETE', url, **kwargs)

    def put(self, url, **kwargs):
        return self.request('PUT', url, **kwargs)


requests = MetaAwareRequests()
