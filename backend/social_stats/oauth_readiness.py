"""OAuth provider readiness helpers that never expose credential values."""
from __future__ import annotations

from django.conf import settings

META_SCOPES = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'read_insights',
]

GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'openid',
    'email',
    'profile',
]

GOOGLE_MY_BUSINESS_SCOPES = [
    'https://www.googleapis.com/auth/business.manage',
    'openid',
    'email',
    'profile',
]

LINKEDIN_SCOPES = ['openid', 'profile', 'email']


def _provider(required: dict[str, object], *, redirect_key: str, scopes: list[str], required_apis: list[str]):
    missing = [name for name, value in required.items() if not str(value or '').strip()]
    return {
        'configured': not missing,
        'missing': missing,
        'redirect_uri': str(required.get(redirect_key) or ''),
        'scopes': scopes,
        'required_apis': required_apis,
    }


def oauth_readiness_report() -> dict[str, dict]:
    """Return safe, actionable OAuth configuration state per public platform."""
    meta = _provider(
        {
            'META_APP_ID': getattr(settings, 'META_APP_ID', ''),
            'META_APP_SECRET': getattr(settings, 'META_APP_SECRET', ''),
            'META_REDIRECT_URI': getattr(settings, 'META_REDIRECT_URI', ''),
        },
        redirect_key='META_REDIRECT_URI',
        scopes=META_SCOPES,
        required_apis=['Facebook Login for Business', 'Instagram Graph API'],
    )
    google = _provider(
        {
            'GOOGLE_CLIENT_ID': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
            'GOOGLE_CLIENT_SECRET': getattr(settings, 'GOOGLE_CLIENT_SECRET', ''),
            'GOOGLE_REDIRECT_URI': getattr(settings, 'GOOGLE_REDIRECT_URI', ''),
        },
        redirect_key='GOOGLE_REDIRECT_URI',
        scopes=GOOGLE_SCOPES,
        required_apis=['YouTube Data API v3', 'YouTube Analytics API'],
    )
    google_business = _provider(
        {
            'GOOGLE_CLIENT_ID': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
            'GOOGLE_CLIENT_SECRET': getattr(settings, 'GOOGLE_CLIENT_SECRET', ''),
            'GOOGLE_REDIRECT_URI': getattr(settings, 'GOOGLE_REDIRECT_URI', ''),
        },
        redirect_key='GOOGLE_REDIRECT_URI',
        scopes=GOOGLE_MY_BUSINESS_SCOPES,
        required_apis=[
            'Google Business Profile Account Management API',
            'Google Business Profile Business Information API',
        ],
    )
    linkedin = _provider(
        {
            'LINKEDIN_CLIENT_ID': getattr(settings, 'LINKEDIN_CLIENT_ID', ''),
            'LINKEDIN_CLIENT_SECRET': getattr(settings, 'LINKEDIN_CLIENT_SECRET', ''),
            'LINKEDIN_REDIRECT_URI': getattr(settings, 'LINKEDIN_REDIRECT_URI', ''),
        },
        redirect_key='LINKEDIN_REDIRECT_URI',
        scopes=LINKEDIN_SCOPES,
        required_apis=['Sign In with LinkedIn using OpenID Connect'],
    )

    return {
        'facebook': dict(meta),
        'instagram': dict(meta),
        'youtube': dict(google),
        'google_my_business': dict(google_business),
        'linkedin': dict(linkedin),
    }
