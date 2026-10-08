"""Regression coverage for originating PR #96; no Bot API calls."""
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from social_stats.platforms.providers.telegram import TelegramProvider
from social_stats.publishers.base import PublishError
from social_stats.publishers.telegram_content import poll
from social_stats.publishers._bot_api_client import BotAPIClient


class PublishingReviewBoundaries(SimpleTestCase):
    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_historical_noninteger_error_code_remains_a_safe_error(self, outbound):
        for value in ('not-an-integer', [], {}):
            with self.subTest(value=value):
                # Non-empty containers exercise conversion rather than fallback.
                value = [1] if value == [] else {'invalid': 1} if value == {} else value
                outbound.return_value = Mock(status_code=400)
                outbound.return_value.json.return_value = {'ok': False, 'error_code': value}
                with self.assertRaises(PublishError) as caught:
                    BotAPIClient('public-fixture', 'https://api.telegram.org').call('sendMessage')
                self.assertEqual(caught.exception.code, 'invalid_response')

    def test_unavailable_presigned_asset_is_a_safe_publication_error(self):
        post = SimpleNamespace(platform_overrides={'telegram': {
            'rich_message': {'blocks': [{'media': 'asset:fixture'}]},
        }})
        for result in ([], [''], [None], ['asset:fixture']):
            with self.subTest(result=result):
                resolve = Mock(return_value=result)
                with self.assertRaises(PublishError) as caught:
                    TelegramProvider().prepare_publish(post, resolve)
                self.assertEqual(caught.exception.code, 'media_invalid')
                resolve.assert_called_once_with(post, ['asset:fixture'])

    def test_poll_requires_two_options_and_keeps_existing_upper_bound(self):
        for options in ([], ['only'], ['a'] * 13):
            with self.subTest(count=len(options)):
                with self.assertRaises(PublishError):
                    poll({'question': 'Public fixture?', 'options': options})
        for count in (2, 12):
            result = poll({'question': 'Public fixture?', 'options': [str(i) for i in range(count)]})
            self.assertEqual(len(result['options']), count)
