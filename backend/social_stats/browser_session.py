"""Same-origin browser sessions; JWT remains available to non-browser API clients."""
from datetime import timedelta
import secrets

from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.middleware.csrf import CsrfViewMiddleware, get_token
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


def establish_session(request, user):
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    request.session.set_expiry(settings.SESSION_COOKIE_AGE)
    from .security.sessions import record_session
    jti = 'browser:' + secrets.token_hex(24)
    request.session['browser_session_jti'] = jti
    request.session.pop('browser_pending_mfa', None)
    record_session(user=user, refresh_jti=jti, expires_at=timezone.now() + timedelta(seconds=settings.SESSION_COOKIE_AGE), request=request)


class BrowserSessionMiddleware(MiddlewareMixin):
    """Protect even anonymous login mutations and convert token-issuing flows.

    The header selects a response contract, never authorization. Native clients
    retain JWT responses. Browser authorization always uses the opaque session.
    """
    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.path == '/api/auth/session/' or (request.path.startswith('/api/') and request.headers.get('X-Browser-Session') == '1'):
            # DRF views are csrf_exempt; explicitly check the underlying request
            # against a non-exempt callback, including login and migration.
            reason = CsrfViewMiddleware(lambda r: None).process_view(
                request, lambda r: None, (), {}
            )
            if reason is not None:
                return JsonResponse({'detail': 'CSRF verification failed.', 'code': 'csrf_failed'}, status=403)
        return None

    def process_response(self, request, response):
        if request.headers.get('X-Browser-Session') != '1':
            return response
        response['Cache-Control'] = 'no-store'
        data = getattr(response, 'data', None)
        if isinstance(data, dict) and data.get('mfa_required') and data.get('mfa_token'):
            request.session['browser_pending_mfa'] = data['mfa_token']
            response.data = {k: v for k, v in data.items() if k != 'mfa_token'}
            response.data['mfa_token'] = 'session'
            response._is_rendered = False
            response.render()
        if isinstance(data, dict) and response.status_code < 300 and data.get('access') and data.get('refresh'):
            token = AccessToken(data['access'])
            user = User.objects.get(pk=token['user_id'], is_active=True)
            establish_session(request, user)
            # These temporary JWTs never leave the server and cannot be refreshed.
            RefreshToken(data['refresh']).blacklist()
            response.data = {k: v for k, v in data.items() if k not in ('access', 'refresh')}
            response.data['session'] = True
            # DRF has already rendered by process_response.
            response._is_rendered = False
            response.render()
        return response


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([AllowAny])
def browser_session(request):
    """CSRF bootstrap, one-time legacy credential migration, and revoking logout."""
    if request.method == 'GET':
        return Response({'csrfToken': get_token(request._request), 'authenticated': request.user.is_authenticated})
    if request.method == 'DELETE':
        from .security.sessions import UserSession, revoke_session
        record = UserSession.objects.filter(refresh_jti=request.session.get('browser_session_jti', '')).first()
        if record:
            revoke_session(record, reason='user_logout')
        logout(request._request)
        return Response(status=204)
    try:
        refresh = RefreshToken(request.data.get('refresh', ''))
        user = User.objects.get(pk=refresh['user_id'], is_active=True)
        refresh.blacklist()
    except (TokenError, User.DoesNotExist, KeyError, TypeError):
        return Response({'detail': 'Session expired.', 'code': 'session_expired'}, status=401)
    establish_session(request._request, user)
    return Response({'session': True})
