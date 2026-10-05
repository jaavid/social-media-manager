# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.utils import timezone

from social_stats.models import Client, UserProfile, OnboardingStep, ensure_client_profile
from social_stats.serializers.core import (
    UserSerializer,
)

from .helpers import _silent_token_refresh


class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        try:
            profile = user.profile
            ensure_client_profile(profile)
            token['role']      = profile.role
            token['client_id'] = profile.client_id
            token['workspace_id'] = profile.client_id
            token['name']      = user.get_full_name() or user.username
            # Include permissions in token
            from social_stats.permissions import PermissionChecker
            token['permissions'] = PermissionChecker.get_user_permissions(profile)
            # Include portal config for client users
            if profile.role == 'client' and profile.client:
                try:
                    cfg = profile.client.page_config
                    token['portal_config'] = {
                        'portal_title':         cfg.portal_title,
                        'show_platform_tabs':   cfg.show_platform_tabs,
                        'show_date_picker':     cfg.show_date_picker,
                        'show_export_button':   cfg.show_export_button,
                        'show_sync_button':     cfg.show_sync_button,
                        'show_posts_section':   cfg.show_posts_section,
                        'show_reviews_section': cfg.show_reviews_section,
                        'show_roi_section':     cfg.show_roi_section,
                        'show_calendar':        cfg.show_calendar,
                        'default_platform':     cfg.default_platform,
                        'default_date_range':   cfg.default_date_range,
                        'custom_accent_color':  cfg.custom_accent_color,
                        'welcome_message':      cfg.welcome_message,
                    }
                except Exception:
                    token['portal_config'] = {}
        except Exception:
            token['role'] = 'client'
            token['permissions'] = {}
        return token


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer
    permission_classes = [AllowAny]
    from social_stats.security.throttles import LoginIPThrottle  # noqa: E402
    throttle_classes = [LoginIPThrottle]

    def post(self, request, *args, **kwargs):
        terms_accepted = request.data.get('terms_accepted', False)
        if not terms_accepted:
            return Response(
                {'detail': 'You must accept the Terms of Service and Privacy Policy to sign in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for unverified email/password accounts before simplejwt rejects them
        username = request.data.get('username', '').strip().lower()
        try:
            candidate = User.objects.get(username=username)
            if not candidate.is_active:
                # Check if they have an email verification pending
                has_token = hasattr(candidate, 'email_verification')
                if has_token:
                    return Response(
                        {'detail': 'email_not_verified', 'email': candidate.email},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
        except User.DoesNotExist:
            pass

        password_for_mfa = request.data.get('password', '')
        user_has_mfa = False
        if username:
            try:
                _u = User.objects.get(username=username)
                user_has_mfa = bool(getattr(_u, 'mfa', None) and _u.mfa.is_enabled)
            except User.DoesNotExist:
                pass

        if user_has_mfa and password_for_mfa:
            from django.contrib.auth import authenticate
            mfa_user = authenticate(request, username=username, password=password_for_mfa)
            if mfa_user:
                from social_stats.security.mfa import issue_mfa_token
                from social_stats.security.sessions import _client_ip
                ip = _client_ip(request)
                token = issue_mfa_token(user_id=mfa_user.id, ip=ip)
                return Response(
                    {
                        'mfa_required': True,
                        'mfa_token':    token,
                        'expires_in':   300,
                        'detail':       'mfa_required',
                    },
                    status=status.HTTP_200_OK,
                )
            # password was wrong — fall through to super().post() so simplejwt
            # produces the canonical "no active account" 401. The
            # authenticate() call already recorded the failure with axes, and
            # super().post() will also try; axes is keyed by (username, ip)
            # within the cooloff window so the second hit is just a tick.

        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            username = request.data.get('username', '')
            try:
                user = User.objects.get(username=username)
                profile = user.profile
                if not profile.terms_accepted:
                    profile.terms_accepted = True
                    profile.terms_accepted_at = timezone.now()
                    profile.save(update_fields=['terms_accepted', 'terms_accepted_at'])
            except Exception:
                pass

            try:
                self._record_login_session(request, response)
            except Exception:
                # Never let session bookkeeping break a successful login
                import logging
                logging.getLogger(__name__).exception('login session recording failed')
        return response

    def _record_login_session(self, request, response):
        """Persist a UserSession row for the just-issued refresh token + send
        a 'new login detected' email if the (IP, browser+os) combo is new."""
        from datetime import datetime, timezone as dt_tz
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh_str = (response.data or {}).get('refresh')
        if not refresh_str:
            return
        try:
            rt = RefreshToken(refresh_str)
        except Exception:
            return
        jti     = rt.get('jti', '')
        exp_ts  = rt.get('exp')
        if not jti or not exp_ts:
            return
        expires_at = datetime.fromtimestamp(exp_ts, tz=dt_tz.utc)

        username = (request.data.get('username') or '').strip().lower()
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return

        from social_stats.security.sessions import record_session
        from social_stats.security.login_monitor import is_suspicious, notify_new_login
        from social_stats.security import audit

        # Run suspicious-login detection BEFORE recording the new session,
        # otherwise the new row would self-match and mask any new-context.
        suspicious, ctx = is_suspicious(user=user, request=request)

        record_session(user=user, refresh_jti=jti,
                       expires_at=expires_at, request=request)

        audit.record(
            event_type='suspicious_login' if suspicious else 'login_success',
            actor_user=user, request=request,
            target_object_type='User', target_object_id=user.id,
            metadata={'jti': jti[:12], **{k: v for k, v in ctx.items() if k != 'ip'}},
        )

        if suspicious:
            notify_new_login(user=user, context=ctx)


@api_view(['GET'])
def me(request):
    from django.conf import settings as dj_settings
    user = request.user
    data = UserSerializer(user).data
    try:
        from social_stats.permissions import PermissionChecker
        profile = user.profile
        ensure_client_profile(profile)
        data = UserSerializer(user).data
        data['permissions'] = PermissionChecker.get_user_permissions(profile)
        data['onboarding_complete'] = profile.client.onboarding_complete if profile.client else False
        # Feature flags surfaced to the client app.
        data['feature_flags'] = {
            'oauth_apps_approved': bool(getattr(dj_settings, 'OAUTH_APPS_APPROVED', False)),
        }
        # Silently refresh any expired platform tokens on every page load
        if profile.client_id:
            _silent_token_refresh(profile.client_id)
        # Marketplace (): surface the primary agency slug so the
        # agency-side marketplace profile editor can resolve its target.
        try:
            if profile.primary_agency_id:
                data['primary_agency_slug'] = profile.primary_agency.slug
        except Exception:
            pass
        if profile.role == 'client' and profile.client:
            try:
                cfg = profile.client.page_config
                data['portal_config'] = {
                    'portal_title':         cfg.portal_title,
                    'show_platform_tabs':   cfg.show_platform_tabs,
                    'show_date_picker':     cfg.show_date_picker,
                    'show_export_button':   cfg.show_export_button,
                    'show_sync_button':     cfg.show_sync_button,
                    'show_posts_section':   cfg.show_posts_section,
                    'show_reviews_section': cfg.show_reviews_section,
                    'show_roi_section':     cfg.show_roi_section,
                    'show_calendar':        cfg.show_calendar,
                    'default_platform':     cfg.default_platform,
                    'default_date_range':   cfg.default_date_range,
                    'custom_accent_color':  cfg.custom_accent_color,
                    'welcome_message':      cfg.welcome_message,
                }
            except Exception:
                data['portal_config'] = {}
    except Exception:
        data['permissions'] = {}
    return Response(data)


@api_view(['POST'])
def create_client_user(request):
    """Superadmin creates a new client + login account in one step."""
    try:
        profile = request.user.profile
        if profile.role != 'superadmin':
            return Response({'error': 'Only superadmin can create clients'}, status=403)
    except Exception:
        return Response({'error': 'Forbidden'}, status=403)

    data     = request.data
    company  = data.get('company', '')
    name     = data.get('name', '')
    email    = data.get('email', '')
    password = data.get('password', '')

    if not all([company, name, email, password]):
        return Response({'error': 'company, name, email, password are required'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already exists'}, status=400)

    # Create Client
    client = Client.objects.create(company=company, name=name, email=email)

    # Create Django User
    user = User.objects.create_user(
        username=email, email=email, password=password,
        first_name=name.split()[0] if name else '',
        last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
    )

    # Create UserProfile
    UserProfile.objects.create(user=user, role='client', client=client)

    return Response({
        'message': f'Client "{company}" created successfully',
        'client_id': client.id,
        'user_id':   user.id,
    }, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_solo_client(request):
    """
    Create a Client record for a self-registered user who has no client yet.
    Returns new JWT tokens with updated client_id claim.
    """
    profile = getattr(request.user, 'profile', None)
    if not profile or profile.role != 'client':
        return Response({'error': 'Only client users can use this endpoint.'}, status=403)
    if profile.client_id:
        return Response({'error': 'You already have a client account.'}, status=400)

    user  = request.user
    email = user.email.strip().lower()

    # Find or create a Client record
    client = Client.objects.filter(email__iexact=email).first()
    if not client:
        full_name  = user.get_full_name() or user.username or email.split('@')[0]
        first_name = (user.first_name or '').strip()
        company    = first_name or full_name or email.split('@')[0]
        client = Client.objects.create(
            name=full_name, company=company, email=email,
            owner_user=user, ownership_type='end_user_owned',
            created_via='end_user_signup',
        )

    profile.client = client
    profile.save(update_fields=['client'])

    # Create onboarding steps
    STEP_KEYS = [
        'connect_platform', 'sync_data', 'set_goals',
        'add_competitor', 'view_analytics', 'share_report',
    ]
    for step_key in STEP_KEYS:
        OnboardingStep.objects.get_or_create(client=client, step_key=step_key)

    from social_stats.views.social_auth import _make_jwt
    access, refresh = _make_jwt(user)
    return Response({
        'access':    access,
        'refresh':   refresh,
        'client_id': client.id,
    })
