"""Allowlisted third-party services that may use alternate outbound egress.

The application always identifies a logical service. That service controls the
allowed direct origin and the matching route name on API Access Gateway; callers
cannot turn this layer into an arbitrary forward proxy.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class EgressService:
    key: str
    label: str
    direct_origin: str
    gateway_route: str
    probe_url: str


SERVICES: dict[str, EgressService] = {
    'brightdata': EgressService('brightdata', 'Bright Data', 'https://api.brightdata.com',
                               'brightdata', 'https://api.brightdata.com/'),
    'discord': EgressService('discord', 'Discord API', 'https://discord.com', 'discord', 'https://discord.com/api/v10/gateway'),
    'reddit': EgressService('reddit', 'Reddit API', 'https://oauth.reddit.com', 'reddit', 'https://oauth.reddit.com/'),
    'reddit_oauth': EgressService('reddit_oauth', 'Reddit OAuth', 'https://www.reddit.com', 'reddit-oauth', 'https://www.reddit.com/'),
    'resend': EgressService(
        key='resend', label='Resend Email API', direct_origin='https://api.resend.com',
        gateway_route='resend', probe_url='https://api.resend.com/',
    ),
    'telegram': EgressService(
        key='telegram', label='Telegram Bot API',
        direct_origin='https://api.telegram.org',
        gateway_route='telegram',
        probe_url='https://api.telegram.org/',
    ),
    'bale': EgressService(
        key='bale', label='Bale Bot API',
        direct_origin='https://tapi.bale.ai',
        gateway_route='bale',
        probe_url='https://tapi.bale.ai/',
    ),
    'eitaa': EgressService(
        key='eitaa', label='Eitaa Bot API',
        direct_origin='https://eitaayar.ir', gateway_route='eitaa',
        probe_url='https://eitaayar.ir/api/',
    ),
    'aparat': EgressService(
        key='aparat', label='Aparat API',
        direct_origin='https://www.aparat.com', gateway_route='aparat',
        probe_url='https://www.aparat.com/',
    ),
    'meta': EgressService(
        key='meta', label='Meta Graph API',
        direct_origin='https://graph.facebook.com',
        gateway_route='meta',
        probe_url='https://graph.facebook.com/',
    ),
    'instagram_graph': EgressService('instagram_graph', 'Instagram Graph',
        'https://graph.instagram.com', 'instagram-graph', 'https://graph.instagram.com/'),
    'instagram_oauth': EgressService('instagram_oauth', 'Instagram Oauth',
        'https://api.instagram.com', 'instagram-oauth', 'https://api.instagram.com/'),
    'instagram_web': EgressService('instagram_web', 'Instagram Web',
        'https://www.instagram.com', 'instagram-web', 'https://www.instagram.com/'),
    'instagram_root': EgressService('instagram_root', 'Instagram Root',
        'https://instagram.com', 'instagram-root', 'https://instagram.com/'),
    'instagram_private': EgressService('instagram_private', 'Instagram Private',
        'https://i.instagram.com', 'instagram-private', 'https://i.instagram.com/'),
    'instagram_private_b': EgressService('instagram_private_b', 'Instagram Private B',
        'https://b.i.instagram.com', 'instagram-private-b', 'https://b.i.instagram.com/'),
    'facebook_web': EgressService('facebook_web', 'Facebook Web',
        'https://www.facebook.com', 'facebook-web', 'https://www.facebook.com/'),
    'meta_b_graph': EgressService('meta_b_graph', 'Meta B Graph',
        'https://b-graph.facebook.com', 'meta-b-graph', 'https://b-graph.facebook.com/'),
    'meta_upload': EgressService('meta_upload', 'Meta Upload',
        'https://rupload.facebook.com', 'meta-upload', 'https://rupload.facebook.com/'),
    'google': EgressService(
        key='google', label='Google APIs',
        direct_origin='https://www.googleapis.com',
        gateway_route='google',
        probe_url='https://www.googleapis.com/',
    ),
    'google_oauth': EgressService(
        key='google_oauth', label='Google OAuth',
        direct_origin='https://oauth2.googleapis.com',
        gateway_route='google-oauth',
        probe_url='https://oauth2.googleapis.com/',
    ),
    'google_upload': EgressService(
        key='google_upload', label='Google Upload APIs',
        direct_origin='https://upload.googleapis.com',
        gateway_route='google-upload',
        probe_url='https://upload.googleapis.com/',
    ),
    'linkedin': EgressService(
        key='linkedin', label='LinkedIn API',
        direct_origin='https://api.linkedin.com',
        gateway_route='linkedin',
        probe_url='https://api.linkedin.com/',
    ),
}

VALID_MODES = {'direct', 'gateway', 'auto'}


def get_service(key: str) -> EgressService:
    try:
        return SERVICES[key]
    except KeyError as exc:
        raise ValueError(f'Unknown outbound service: {key}') from exc


def configured_mode(service: str) -> str:
    """Resolve per-service mode, falling back to the global default."""
    if service == 'meta' or service.startswith(('instagram_', 'meta_')) or service == 'facebook_web':
        return 'gateway'
    env_key = f"OUTBOUND_{service.upper().replace('-', '_')}_MODE"
    selected = (
        os.getenv(env_key, '').strip().lower()
        or os.getenv('OUTBOUND_ROUTING_DEFAULT', 'auto').strip().lower()
        or 'auto'
    )
    return selected if selected in VALID_MODES else 'auto'
