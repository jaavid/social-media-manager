"""Publisher shared by Telegram-compatible bot APIs (Telegram and Bale)."""
from __future__ import annotations

import json

from ._bot_api_client import BotAPIClient
from .base import BasePublisher, PublishError, PublishResult


class BotPublisher(BasePublisher):
    API_BASE_URL = ''
    MAX_TEXT_LENGTH = 4096
    # Conservative defaults; providers may override as their APIs diverge.
    MAX_IMAGE_BYTES = 10 * 1024 * 1024
    MAX_VIDEO_BYTES = 50 * 1024 * 1024
    SUPPORTED_TYPES = frozenset({'text', 'image', 'video', 'carousel'})

    def _client(self, credential) -> BotAPIClient:
        return BotAPIClient(credential.access_token, self.API_BASE_URL)

    def _destination(self, credential, **kwargs) -> str:
        destination = (kwargs.get('destination_id') or credential.platform_user_id or '').strip()
        if not destination:
            raise PublishError(
                'No destination chat/channel configured for this bot',
                code='missing_destination',
            )
        return destination

    @staticmethod
    def _result(payload: dict) -> PublishResult:
        result = payload.get('result') or {}
        if isinstance(result, list):
            ids = [str(row.get('message_id')) for row in result if row.get('message_id') is not None]
            post_id = ','.join(ids)
        else:
            post_id = str(result.get('message_id') or '')
        return PublishResult(
            success=True,
            platform_post_id=post_id,
            raw_response=payload,
        )

    def publish_text(self, credential, content: str, **kwargs) -> PublishResult:
        payload = self._client(credential).call('sendMessage', data={
            'chat_id': self._destination(credential, **kwargs),
            'text': content,
        })
        return self._result(payload)

    def publish_image(self, credential, content: str, image_urls: list[str], **kwargs) -> PublishResult:
        if not image_urls:
            return self.publish_text(credential, content, **kwargs)
        if len(image_urls) > 1:
            return self.publish_carousel(credential, content, image_urls, **kwargs)
        payload = self._client(credential).call('sendPhoto', data={
            'chat_id': self._destination(credential, **kwargs),
            'photo': image_urls[0],
            'caption': content,
        })
        return self._result(payload)

    def publish_video(self, credential, content: str, video_url: str, *, thumbnail=None, **kwargs) -> PublishResult:
        if not video_url:
            raise PublishError('Video URL is required', code='media_invalid')
        data = {
            'chat_id': self._destination(credential, **kwargs),
            'video': video_url,
            'caption': content,
        }
        if thumbnail:
            data['thumbnail'] = thumbnail
        return self._result(self._client(credential).call('sendVideo', data=data))

    def publish_carousel(self, credential, content: str, image_urls: list[str], **kwargs) -> PublishResult:
        if not image_urls:
            return self.publish_text(credential, content, **kwargs)
        media = [
            {
                'type': 'photo',
                'media': url,
                **({'caption': content} if index == 0 and content else {}),
            }
            for index, url in enumerate(image_urls[:10])
        ]
        payload = self._client(credential).call('sendMediaGroup', data={
            'chat_id': self._destination(credential, **kwargs),
            'media': json.dumps(media),
        })
        return self._result(payload)
