import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from social_stats.platform_registry import frontend_metadata, public_registry
from social_stats.platforms.bot_features import (
    FEATURE_KEYS, BotDestinationContext, bot_feature_metadata,
)
from social_stats.platforms.registry import get_provider
from social_stats.publishers._bot_api_client import BotAPIClient
from social_stats.publishers.bale import BalePublisher
from social_stats.publishers.base import PublishError, RateLimitError
from social_stats.publishers.telegram import TelegramPublisher


class TelegramContractTests(SimpleTestCase):
    def setUp(self):
        self.credential = SimpleNamespace(access_token='secret-token', platform_user_id='@channel')

    def test_metadata_exposes_provider_divergence_and_destination_semantics(self):
        metadata = frontend_metadata()
        for platform in ('telegram', 'bale'):
            support = metadata[platform]['features']['support']
            self.assertEqual(set(support), set(FEATURE_KEYS))
            self.assertEqual(support['media_group'], 'supported')
            self.assertTrue(get_provider(platform).capabilities.supports_feature('media_group'))
        self.assertEqual(metadata['telegram']['features']['support']['rich_message'], 'supported')
        self.assertEqual(metadata['bale']['features']['support']['rich_message'], 'not_available')
        destinations = metadata['telegram']['features']['destinations']
        self.assertFalse(destinations['channel']['message_thread_id'])
        self.assertTrue(destinations['forum_supergroup']['message_thread_id'])
        self.assertFalse(destinations['channel']['streamed_drafts'])
        self.assertTrue(destinations['private_forum']['streamed_drafts'])
        remote = {row['key']: row['features'] for row in public_registry()['platforms']}
        self.assertEqual(remote['telegram'], metadata['telegram']['features'])

    def test_metadata_cannot_mutate_the_contract(self):
        value = bot_feature_metadata('telegram')
        value['support']['rich_message'] = 'planned'
        self.assertEqual(bot_feature_metadata('telegram')['support']['rich_message'], 'supported')

    def test_invalid_destination_contexts_fail_locally(self):
        for value in ([], {'arbitrary': 1}, {'destination_type': 'broadcast_topic'},
                      {'message_thread_id': True}, {'message_thread_id': '1'},
                      {'message_thread_id': -1}, {'direct_messages_topic_id': 0}):
            with self.subTest(value=value), self.assertRaises(PublishError) as ctx:
                BotDestinationContext.from_dict(value)
            self.assertEqual(ctx.exception.code, 'invalid_destination')

    def test_channel_topics_rejected_without_http(self):
        publisher = TelegramPublisher()
        with patch.object(publisher, '_client') as client, self.assertRaises(PublishError) as ctx:
            publisher.publish_text(self.credential, 'hello', destination_context={'message_thread_id': 1})
        self.assertEqual(ctx.exception.code, 'invalid_destination')
        client.assert_not_called()

    def test_unshipped_features_and_bale_extensions_are_gated(self):
        for publisher in (BalePublisher(),):
            for options in (
                {'rich_message': {}}, {'reply_markup': {}}, {'poll': {}},
                {'media_items': []}, {'suggested_post_parameters': {}},
                {'destination_context': {'destination_type': 'forum_supergroup', 'message_thread_id': 1}},
                {'destination_context': {'destination_type': 'channel_direct_messages', 'direct_messages_topic_id': 1}},
            ):
                with self.subTest(platform=publisher.platform, options=options):
                    with patch.object(publisher, '_client') as client, self.assertRaises(PublishError) as ctx:
                        publisher.publish_text(self.credential, 'hello', **options)
                    self.assertEqual(ctx.exception.code, 'unsupported_feature')
                    client.assert_not_called()

    def test_loose_routing_fields_are_not_silently_ignored(self):
        for key in ('message_thread_id', 'direct_messages_topic_id'):
            with self.subTest(key=key), self.assertRaises(PublishError) as ctx:
                TelegramPublisher().publish_text(self.credential, 'hello', **{key: 1})
            self.assertEqual(ctx.exception.code, 'invalid_destination')

    def test_album_order_caption_and_structured_ids(self):
        for count in (2, 10):
            publisher = TelegramPublisher()
            urls = [f'https://example.test/{n}.jpg' for n in range(count)]
            api = Mock()
            api.call.return_value = {'ok': True, 'result': [{'message_id': n + 1} for n in range(count)]}
            with self.subTest(count=count), patch.object(publisher, '_client', return_value=api):
                result = publisher.publish_carousel(self.credential, 'متن', urls)
            media = json.loads(api.call.call_args.kwargs['data']['media'])
            self.assertEqual([row['media'] for row in media], urls)
            self.assertEqual(media[0]['caption'], 'متن')
            self.assertTrue(all('caption' not in row for row in media[1:]))
            self.assertEqual(result.platform_post_ids, [str(n + 1) for n in range(count)])
            self.assertEqual(result.platform_post_id, ','.join(result.platform_post_ids))
            self.assertEqual(result.as_dict()['platform_post_ids'], result.platform_post_ids)

    def test_one_image_uses_photo_instead_of_invalid_media_group(self):
        for publisher in (TelegramPublisher(), BalePublisher()):
            api = Mock()
            api.call.return_value = {'ok': True, 'result': {'message_id': 1}}
            with patch.object(publisher, '_client', return_value=api):
                result = publisher.publish_carousel(self.credential, 'caption', ['https://example.test/1.jpg'])
            self.assertEqual(api.call.call_args.args[0], 'sendPhoto')
            self.assertEqual(result.platform_post_ids, ['1'])


class TelegramErrorContractTests(SimpleTestCase):
    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_provider_diagnostics_do_not_echo_credentials_or_private_body(self, outbound):
        response = Mock(status_code=400, ok=False)
        response.json.return_value = {
            'ok': False, 'error_code': 400, 'description': 'secret-token private-body',
            'request': {'text': 'private-body'},
        }
        outbound.return_value = response
        with self.assertRaises(PublishError) as ctx:
            BotAPIClient('secret-token', 'https://api.telegram.org').call('sendMessage')
        self.assertNotIn('secret-token', str(ctx.exception))
        self.assertNotIn('private-body', str(ctx.exception.raw))
        self.assertEqual(ctx.exception.raw, {'method': 'sendMessage', 'error_code': 400})

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_malformed_responses_raise_typed_errors(self, outbound):
        for payload in ([], None, {'error_code': 'invalid'}):
            response = Mock(status_code=400, ok=False)
            response.json.return_value = payload
            outbound.return_value = response
            with self.subTest(payload=payload), self.assertRaises(PublishError) as ctx:
                BotAPIClient('secret-token', 'https://api.telegram.org').call('sendMessage')
            self.assertEqual(ctx.exception.code, 'invalid_response')

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_rate_limit_is_not_retried_in_http_layer(self, outbound):
        response = Mock(status_code=429, ok=False)
        response.json.return_value = {'ok': False, 'parameters': {'retry_after': 17},
                                      'description': 'secret-token private-body'}
        outbound.return_value = response
        with self.assertRaises(RateLimitError) as ctx:
            BotAPIClient('secret-token', 'https://api.telegram.org').call('sendMessage')
        self.assertEqual(ctx.exception.retry_after, 17)
        self.assertNotIn('private-body', str(ctx.exception))
        outbound.assert_called_once()

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_ambiguous_timeout_does_not_expose_token_url_in_traceback(self, outbound):
        outbound.side_effect = requests.Timeout('https://api.telegram.org/botsecret-token/sendMessage')
        with self.assertRaises(PublishError) as ctx:
            BotAPIClient('secret-token', 'https://api.telegram.org').call('sendMessage')
        self.assertEqual(ctx.exception.code, 'timeout')
        self.assertTrue(ctx.exception.__suppress_context__)
