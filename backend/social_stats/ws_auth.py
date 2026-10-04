# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
Channels authentication for opaque browser sessions and native JWT clients.

AuthMiddlewareStack resolves Django cookies first. Browser sessions are checked
against revocation records and trusted Origin. Native clients may supply their
existing JWT query parameter; browser code never puts credentials in a URL.
"""
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


@database_sync_to_async
def _resolve_user(token: str):
    """Validate JWT and return the matching Django User (or AnonymousUser)."""
    if not token:
        return AnonymousUser()
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth.models import User
        access = AccessToken(token)
        user_id = access.get('user_id')
        if not user_id:
            return AnonymousUser()
        try:
            return User.objects.select_related('profile').get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()
    except Exception as e:
        logger.debug('WS JWT validation failed: %s', e)
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        qs = parse_qs((scope.get('query_string') or b'').decode())
        token = (qs.get('token') or [None])[0]
        if getattr(scope.get('user'), 'is_authenticated', False):
            scope['user'] = await _validate_browser_session(scope)
        else:
            scope['user'] = await _resolve_user(token)
        return await super().__call__(scope, receive, send)


@database_sync_to_async
def _validate_browser_session(scope):
    from .security.sessions import UserSession
    user = scope['user']
    jti = scope['session'].get('browser_session_jti')
    if not jti:
        return user
    record = UserSession.objects.filter(user_id=user.pk, refresh_jti=jti).first()
    return user if record and record.is_active else AnonymousUser()


class BrowserOriginValidator:
    """Cookie sockets require a trusted browser origin; native JWT clients retain compatibility."""
    def __init__(self, application):
        from channels.security.websocket import AllowedHostsOriginValidator
        self.application = application
        self.browser = AllowedHostsOriginValidator(application)

    async def __call__(self, scope, receive, send):
        cookie = dict(scope.get('headers', [])).get(b'cookie', b'')
        application = self.browser if b'sessionid=' in cookie else self.application
        return await application(scope, receive, send)
