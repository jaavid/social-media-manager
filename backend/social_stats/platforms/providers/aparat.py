"""Aparat video provider, including upload, processing and video metrics."""
from __future__ import annotations

import requests

from social_stats.egress import outbound_request
from social_stats.platforms.base import (
    BasePlatformProvider, ConnectionResult, ProviderCapabilities, ProviderError,
    ProviderResult, StatsResult,
)
from social_stats.platforms.registry import register_provider
from social_stats.publishers.base import (
    BasePublisher, PublishResult, RateLimitError, TokenExpiredError,
    register_publisher,
)


class AparatClient:
    API_ORIGIN = 'https://www.aparat.com'

    def __init__(self, token: str, timeout: int = 45):
        self.token = (token or '').strip()
        self.timeout = timeout
        if not self.token:
            raise TokenExpiredError('Aparat access token is missing')

    def request(self, method: str, path: str, **kwargs) -> dict:
        headers = dict(kwargs.pop('headers', {}) or {})
        headers['Authorization'] = f'Bearer {self.token}'
        try:
            response = outbound_request(
                'aparat', method, f'{self.API_ORIGIN}{path}', headers=headers,
                timeout=self.timeout, **kwargs,
            )
        except requests.Timeout as exc:
            raise ProviderError('Aparat request timed out', code='timeout') from exc
        except requests.RequestException as exc:
            raise ProviderError('Aparat network error', code='network_error') from exc
        try:
            payload = response.json()
        except ValueError as exc:
            raise ProviderError('Aparat returned an invalid response', code='invalid_response',
                                status_code=response.status_code) from exc
        if not isinstance(payload, dict):
            raise ProviderError('Aparat returned an invalid response', code='invalid_response',
                                status_code=response.status_code)
        if response.status_code == 401:
            raise TokenExpiredError(status_code=401, raw=payload)
        if response.status_code == 429:
            retry = response.headers.get('Retry-After', 60)
            try:
                retry = int(retry)
            except (TypeError, ValueError):
                retry = 60
            raise RateLimitError(retry_after=retry, status_code=429, raw=payload)
        if not response.ok:
            message = payload.get('message') or payload.get('error') or 'Aparat API request failed'
            raise ProviderError(str(message), code='aparat_api_error',
                                status_code=response.status_code, raw=payload)
        return payload

    def profile(self):
        return self.request('GET', '/api/fa/v1/user/profile')

    def upload_video(self, *, video_url: str, title: str, description: str = ''):
        return self.request('POST', '/api/fa/v1/video/upload', json={
            'video_url': video_url, 'title': title, 'description': description,
        })

    def processing_status(self, video_id: str):
        return self.request('GET', f'/api/fa/v1/video/{video_id}/status')

    def video_stats(self, video_id: str):
        return self.request('GET', f'/api/fa/v1/video/{video_id}/statistics')


class AparatPublisher(BasePublisher):
    platform = 'aparat'
    MAX_TEXT_LENGTH = 2000
    MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
    SUPPORTED_TYPES = frozenset({'video'})

    def publish_video(self, credential, content, video_url, *, thumbnail=None, **kwargs):
        if not video_url:
            raise ProviderError('A video URL is required', code='media_invalid')
        title = (kwargs.get('title') or content or 'Untitled video')[:100]
        payload = AparatClient(credential.access_token).upload_video(
            video_url=video_url, title=title, description=content,
        )
        data = payload.get('data') or payload
        video_id = str(data.get('id') or data.get('video_id') or data.get('uid') or '')
        return PublishResult(success=True, platform_post_id=video_id,
                             platform_url=data.get('url') or '', raw_response=payload)


register_publisher('aparat', AparatPublisher)


@register_provider
class AparatProvider(BasePlatformProvider):
    key = 'aparat'
    label = 'Aparat'
    capabilities = ProviderCapabilities(
        connect=True, publish=True, stats=True, revoke=True,
        media_types=frozenset({'video'}),
    )
    publisher = AparatPublisher()

    def validate_credentials(self, credentials):
        token = str(credentials.get('token') or '').strip()
        profile = AparatClient(token).profile()
        data = profile.get('data') or profile
        return ConnectionResult(
            account_id=str(data.get('id') or data.get('username') or ''),
            account_name=data.get('display_name') or data.get('username') or '',
            destination_id=str(data.get('username') or data.get('id') or ''),
            access_token=token, scope='video:upload video:stats', data={'account': data},
        )

    def sync_stats(self, credential, *, remote_id=''):
        payload = AparatClient(credential.access_token).video_stats(remote_id)
        data = payload.get('data') or payload
        keys = ('view_count', 'like_count', 'comment_count', 'duration')
        return StatsResult(metrics={key: data[key] for key in keys if key in data},
                           raw_response=payload)

    def processing_status(self, credential, remote_id: str) -> ProviderResult:
        payload = AparatClient(credential.access_token).processing_status(remote_id)
        return ProviderResult(data=payload.get('data') or payload, raw_response=payload)

    def revoke(self, credential):
        return ProviderResult(data={'remote_revocation': False})
