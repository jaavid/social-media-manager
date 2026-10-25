"""Standalone aiograpi 2.0.18 experiment; no login or project imports."""
import asyncio
import getpass
import importlib.metadata
import json
import logging
import os
import re
import sys
from urllib.parse import urlsplit

import httpx
from aiograpi import Client, httpx_ext


def report(**values):
    print(json.dumps(values, ensure_ascii=False), flush=True)


async def main():
    logging.disable(logging.CRITICAL)
    username = sys.argv[1] if len(sys.argv) > 1 else 'n5worldiran'
    if not re.fullmatch(r'[A-Za-z0-9_.]{1,30}', username):
        raise SystemExit('Pass a username, not a URL.')
    base = (os.getenv('API_GATEWAY_URL') or input('Cloudflare gateway URL: ')).strip().rstrip('/')
    origin = urlsplit(base)
    if (origin.scheme != 'https' or not origin.hostname or origin.username
            or origin.password or origin.query or origin.fragment or origin.path not in {'', '/'}):
        raise SystemExit('Gateway must be an HTTPS origin without a path or credentials.')
    key = (os.getenv('API_GATEWAY_KEY') or getpass.getpass('Gateway key (hidden): ')).strip()
    if not key:
        raise SystemExit('Gateway key is required.')

    class GatewayTransport(httpx.AsyncBaseTransport):
        def __init__(self):
            self.inner = httpx.AsyncHTTPTransport(verify=True, trust_env=False, retries=0)

        async def handle_async_request(self, request):
            url = request.url
            if url.scheme != 'https' or url.host != 'www.instagram.com' or url.port not in {None, 443}:
                raise RuntimeError('Non-public destination blocked')
            suffix = str(url).split('://', 1)[1].partition('/')[2]
            headers = httpx.Headers(request.headers)
            headers.pop('host', None)
            headers['X-API-Gateway-Key'] = key
            forwarded = httpx.Request(
                request.method, base + '/instagram-web/' + suffix,
                headers=headers, content=await request.aread(), extensions=request.extensions,
            )
            response = await self.inner.handle_async_request(forwarded)
            await response.aread()
            diagnostic = {'event': 'http', 'path': url.path, 'status': response.status_code}
            try:
                body = response.json()
                if isinstance(body, dict):
                    diagnostic['require_login'] = body.get('require_login') is True
                    diagnostic['has_data'] = bool(body.get('data'))
            except ValueError:
                pass
            if response.is_redirect:
                target = urlsplit(response.headers.get('location', ''))
                diagnostic['redirect_host'] = target.hostname
                diagnostic['redirect_path'] = target.path
            report(**diagnostic)
            return response

        async def aclose(self):
            await self.inner.aclose()

    # Apply before Client creation, including sessions rebuilt by SDK init().
    # No environment proxies, redirect following, curl transport or direct fallback.
    def gateway_client(session):
        session._client = httpx.AsyncClient(
            transport=GatewayTransport(), trust_env=False,
            follow_redirects=False, timeout=30,
        )

    httpx_ext.Session._set_client = gateway_client

    class AnonymousClient(Client):
        async def private_request(self, *args, **kwargs):
            raise RuntimeError('Private API disabled in anonymous test')

    reader = AnonymousClient(
        public_transport='requests', private_transport='requests',
        public_request_retries_count=1, with_challenge_flow=False,
    )
    stage = 'profile'
    report(event='start', library=importlib.metadata.version('aiograpi'), username=username)
    try:
        user = await reader.user_info_by_username_gql(username)
        report(event='profile', private=user.is_private, published_count=user.media_count)
        if user.is_private:
            report(event='result', status='private_profile')
            return
        stage = 'posts'
        posts, _ = await reader._user_medias_chunk_public_gql(int(user.pk), amount=5)
        report(event='result', status='posts_received' if posts else 'empty_response', count=len(posts))
        for post in posts:
            report(event='post', code=post.code,
                   published_at=post.taken_at.isoformat() if post.taken_at else None)
    except Exception as exc:
        # Exception messages can include URLs, cookies or raw provider responses.
        report(event='error', stage=stage, error_type=type(exc).__name__)
    finally:
        for name in ('public', 'private', 'graphql'):
            session = getattr(reader, name, None)
            client = getattr(session, '_client', None)
            if client is not None:
                await client.aclose()


if __name__ == '__main__':
    asyncio.run(main())
