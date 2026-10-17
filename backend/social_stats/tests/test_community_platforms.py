"""Transport and product-boundary regressions; never contact real accounts."""
from datetime import timedelta
from unittest.mock import Mock, patch

import requests
from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from social_stats.models import Client, Conversation, Message, PlatformCredential, UserProfile
from social_stats.platforms.base import ConnectionResult, InboxResult, ProviderError
from social_stats.platforms.community_polling import poll_account
from social_stats.platforms.connection_service import ConnectionService
from social_stats.platforms.contracts import DestinationContext, PublishRequest, ReplyRequest
from social_stats.platforms.execution import ProviderExecution
from social_stats.platforms.registry import get_provider
from social_stats.platforms.providers._community import request_json
from social_stats.platforms.providers.discord import DiscordClient, DiscordProvider, attachment
from social_stats.platforms.providers.reddit import RedditProvider, SCOPES, post_options
from social_stats.publishers.base import RateLimitError, TokenExpiredError


class CommunityTransportTests(SimpleTestCase):
    @patch('social_stats.platforms.providers._community.outbound_request')
    def test_errors_are_normalized_without_remote_secrets(self, transport):
        for status, expected in ((401, TokenExpiredError), (403, ProviderError), (429, RateLimitError)):
            with self.subTest(status=status):
                transport.return_value = Mock(status_code=status, headers={'Retry-After': '1.2'},
                    json=Mock(return_value={'message': 'PRIVATE-TOKEN', 'retry_after': 1.2}))
                with self.assertRaises(expected) as error:
                    request_json('discord', 'POST', 'https://discord.com/api/v10/channels/1/messages')
                self.assertNotIn('PRIVATE', str(error.exception))
                if status == 429:
                    self.assertEqual(error.exception.retry_after, 2)

    @patch('social_stats.platforms.providers._community.outbound_request')
    def test_network_timeout_and_invalid_json(self, transport):
        transport.side_effect = requests.Timeout('PRIVATE-TOKEN')
        with self.assertRaises(ProviderError) as error:
            DiscordClient('PRIVATE-TOKEN').request('GET', '/users/@me')
        self.assertEqual(error.exception.code, 'timeout')
        self.assertNotIn('PRIVATE', str(error.exception))
        transport.side_effect = None
        transport.return_value = Mock(status_code=200, ok=True, json=Mock(side_effect=ValueError))
        with self.assertRaises(ProviderError) as error:
            DiscordClient('token').request('GET', '/users/@me')
        self.assertEqual(error.exception.code, 'invalid_response')

    @patch('social_stats.platforms.providers.discord.DiscordClient.request')
    def test_discord_requires_bot_and_guild_text_channel(self, transport):
        transport.return_value = {'id': '1', 'username': 'person', 'bot': False}
        with self.assertRaises(ProviderError):
            DiscordProvider().validate_credentials({'token': 'secret', 'destination_id': '123'})
        transport.side_effect = [
            {'id': '1', 'username': 'bot', 'bot': True}, {'id': '123', 'type': 1},
        ]
        with self.assertRaises(ProviderError):
            DiscordProvider().validate_credentials({'token': 'secret', 'destination_id': '123'})

    def test_discord_destination_path_injection_rejected_before_transport(self):
        with patch('social_stats.platforms.providers.discord.DiscordClient.request') as transport:
            with self.assertRaises(ProviderError):
                DiscordProvider().validate_credentials({'token': 'secret', 'destination_id': '../messages'})
            transport.assert_not_called()

    @patch('social_stats.platforms.providers.discord.DiscordClient.request')
    def test_discord_missing_message_content_fails_before_empty_inbox_can_be_imported(self, transport):
        transport.return_value = {'id': '987', 'flags': 0}
        with self.assertRaises(ProviderError) as error:
            DiscordClient('token').require_message_content()
        self.assertEqual(error.exception.code, 'permission_denied')
        for flags in (1 << 18, 1 << 19):
            transport.return_value = {'id': '987', 'flags_new': str(flags)}
            DiscordClient('token').require_message_content()

    @patch('social_stats.security.ssrf.check_url')
    @patch('social_stats.security.ssrf.safe_request')
    def test_attachment_bounded_and_mime_checked(self, fetch, check):
        response = Mock(ok=True, headers={'Content-Type': 'image/png'})
        fetch.return_value.__enter__ = Mock(return_value=response)
        fetch.return_value.__exit__ = Mock(return_value=False)
        response.iter_content.return_value = [b'x' * (10 * 1024 * 1024), b'x']
        with self.assertRaises(ProviderError) as error:
            attachment('https://media.example/image.png', 'image')
        self.assertEqual(error.exception.code, 'media_too_large')
        response.headers = {'Content-Type': 'text/html'}
        with self.assertRaises(ProviderError) as error:
            attachment('https://media.example/image.png', 'image')
        self.assertEqual(error.exception.code, 'media_invalid')

    def test_reddit_title_flags_and_flair_validation(self):
        for options in ({'title': 'x' * 301}, {'nsfw': 'false'}, {'flair_id': '../bad'}, {'unknown': 1}):
            with self.subTest(options=options), self.assertRaises(ProviderError):
                post_options('body', options)
        self.assertEqual(post_options('First line\nbody', {})['title'], 'First line')


@override_settings(REDDIT_CLIENT_ID='app-id', REDDIT_CLIENT_SECRET='PRIVATE-APP',
    REDDIT_REDIRECT_URI='https://app.example/api/oauth/reddit/callback/',
    REDDIT_USER_AGENT='web:test:v1 (by /u/test)')
class CommunityAccountTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('community-owner', password='fixture-only-password')
        self.workspace = Client.objects.create(name='Community', company='Community', email='community@example.com', owner_user=self.user)
        self.other = Client.objects.create(name='Other', company='Other', email='other-community@example.com')
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.discord = get_provider('discord')
        self.reddit = get_provider('reddit')

    def connect(self, platform='discord', workspace=None, destination='123'):
        result = ConnectionResult(account_id='owner' if platform == 'reddit' else '987',
            account_name='Fixture', destination_id='python' if platform == 'reddit' else destination,
            destination_type='profile' if platform == 'reddit' else 'channel',
            scope=' '.join(SCOPES), access_token='PRIVATE-TOKEN',
            refresh_token='PRIVATE-REFRESH' if platform == 'reddit' else '', data={'guild_id': '456'})
        cls = RedditProvider if platform == 'reddit' else DiscordProvider
        with patch.object(cls, 'validate_credentials', return_value=result):
            credential, _ = ConnectionService().connect(workspace or self.workspace, platform, {})
        return credential

    def execution(self, credential, workspace=None):
        return ProviderExecution(get_provider(credential.platform), credential,
            DestinationContext(credential.social_account_id, (workspace or self.workspace).pk,
                kind='profile' if credential.platform == 'reddit' else 'channel'))

    @patch('social_stats.platforms.providers.discord.DiscordClient.request')
    def test_discord_publish_and_mentions_are_safe(self, transport):
        credential = self.connect()
        transport.return_value = {'id': '555', 'channel_id': '123'}
        result = self.execution(credential).call('publish', PublishRequest(content='@everyone', idempotency_key='post:1'))
        self.assertEqual(result.platform_post_id, '555')
        self.assertEqual(result.platform_url, 'https://discord.com/channels/456/123/555')
        self.assertEqual(transport.call_args.kwargs['json']['allowed_mentions'], {'parse': [], 'replied_user': False})

    @patch('social_stats.platforms.providers.discord.attachment', return_value=('image.png', b'bytes', 'image/png'))
    @patch('social_stats.platforms.providers.discord.DiscordClient.request')
    @patch('social_stats.security.ssrf.check_url')
    def test_discord_image_uses_multipart_not_remote_embed(self, check, transport, download):
        credential = self.connect()
        transport.return_value = {'id': '556', 'channel_id': '123'}
        self.execution(credential).call('publish', PublishRequest(media_type='image', content='caption',
            media_urls=('https://media.example/file.png',), idempotency_key='post:2'))
        self.assertEqual(transport.call_args.kwargs['files']['files[0]'][1], b'bytes')

    @patch('social_stats.platforms.providers.discord.DiscordClient.request')
    def test_cross_workspace_execution_never_calls_transport(self, transport):
        credential = self.connect()
        with self.assertRaises(ProviderError) as error:
            self.execution(credential, self.other).call('publish', PublishRequest(content='text', idempotency_key='p'))
        self.assertEqual(error.exception.code, 'scope_denied')
        transport.assert_not_called()

    @patch('social_stats.platforms.providers.reddit.RedditClient.request')
    @patch('social_stats.platforms.providers.reddit.oauth_request')
    def test_reddit_expiry_refreshes_before_publish(self, oauth, transport):
        credential = self.connect('reddit')
        credential.expires_at = timezone.now() - timedelta(hours=1)
        credential.save()
        oauth.return_value = {'access_token': 'PRIVATE-NEW', 'expires_in': 3600}
        transport.return_value = {'json': {'errors': [], 'data': {'name': 't3_abc', 'url': 'https://reddit.com/r/python/comments/abc'}}}
        self.assertTrue(self.reddit.health(credential).ready)
        result = self.execution(credential).call('publish', PublishRequest(content='Title\nBody', idempotency_key='post:3',
            extensions={'reddit': {'title': 'Custom title', 'flair_id': 'a-b', 'nsfw': True}}))
        self.assertEqual(result.platform_post_id, 't3_abc')
        credential.refresh_from_db()
        self.assertEqual(credential.access_token, 'PRIVATE-NEW')
        self.assertEqual(transport.call_args.kwargs['data']['title'], 'Custom title')
        self.assertEqual(transport.call_args.kwargs['data']['sr'], 'python')

    @patch('social_stats.platforms.providers.reddit.RedditClient.request')
    @patch('social_stats.security.ssrf.check_url')
    def test_reddit_link_is_explicit_and_native_media_is_disabled(self, check, transport):
        credential = self.connect('reddit')
        transport.return_value = {'json': {'data': {'name': 't3_abc', 'url': 'https://reddit.com/r/python/comments/abc'}}}
        self.execution(credential).call('publish', PublishRequest(content='Title', idempotency_key='post:4',
            extensions={'reddit': {'url': 'https://example.com/article'}}))
        payload = transport.call_args.kwargs['data']
        self.assertEqual(payload['kind'], 'link')
        self.assertNotIn('text', payload)
        transport.reset_mock()
        with self.assertRaises(ProviderError):
            self.execution(credential).call('publish', PublishRequest(media_type='video', idempotency_key='post:5'))
        transport.assert_not_called()

    @patch('social_stats.platforms.providers.discord.DiscordClient.request')
    def test_unknown_reply_cannot_address_another_channel(self, transport):
        credential = self.connect()
        with self.assertRaises(ProviderError):
            self.execution(credential).call('reply', ReplyRequest('222', 'reply'))
        transport.assert_not_called()

    @patch('social_stats.platforms.providers.discord.DiscordProvider.fetch_inbox')
    def test_polling_deduplicates_and_isolates_accounts(self, fetch):
        credential = self.connect()
        item = {'id': '555', 'thread_id': '555', 'type': 'dm', 'author': '12',
                'author_name': 'Person', 'content': 'Hello', 'sent_at': timezone.now()}
        fetch.return_value = InboxResult(items=[item])
        self.assertEqual(poll_account(self.workspace.pk, credential.pk), 1)
        self.assertEqual(poll_account(self.workspace.pk, credential.pk), 0)
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(Conversation.objects.get().unread_count, 1)
        other_credential = self.connect(workspace=self.other)
        self.assertEqual(poll_account(self.other.pk, other_credential.pk), 1)
        self.assertEqual(Message.objects.count(), 2)
        self.assertEqual(poll_account(self.other.pk, credential.pk), 0)

    @patch('social_stats.platforms.providers.discord.DiscordProvider.fetch_inbox')
    def test_poll_failure_rolls_back_messages_and_cursor(self, fetch):
        credential = self.connect()
        item = {'id': '555', 'thread_id': '555', 'type': 'dm', 'author': '12',
                'author_name': 'Person', 'content': 'Hello', 'sent_at': timezone.now()}
        fetch.side_effect = [InboxResult(items=[item], cursor='554'), ProviderError('Unavailable', code='network_error')]
        with self.assertRaises(ProviderError):
            poll_account(self.workspace.pk, credential.pk)
        self.assertEqual(Message.objects.count(), 0)
        credential.social_account.refresh_from_db()
        self.assertNotIn('community_poll', credential.social_account.metadata)

    @patch('social_stats.platforms.providers.discord.DiscordProvider.fetch_inbox')
    def test_busy_poll_keeps_cursor_for_next_run(self, fetch):
        credential = self.connect()
        fetch.side_effect = [InboxResult(cursor=str(i)) for i in (100, 99, 98)]
        poll_account(self.workspace.pk, credential.pk)
        credential.social_account.refresh_from_db()
        self.assertEqual(credential.social_account.metadata['community_poll']['poll_inbox']['cursor'], '98')
        fetch.side_effect = None
        fetch.return_value = InboxResult()
        poll_account(self.workspace.pk, credential.pk)
        self.assertEqual(fetch.call_args.kwargs['cursor'], '98')

    def test_connections_expose_both_without_secrets(self):
        self.connect()
        self.connect('reddit')
        response = self.api.get(f'/api/workspaces/{self.workspace.pk}/connections/')
        self.assertEqual(response.status_code, 200)
        providers = {p['key']: p for p in response.json()['providers']}
        self.assertEqual(providers['reddit']['contract']['auth']['strategy'], 'oauth2')
        self.assertEqual(providers['discord']['contract']['auth']['strategy'], 'bot_token')
        self.assertNotIn('PRIVATE-', str(response.json()))

    def test_reddit_disconnect_does_not_use_legacy_oauth_handler(self):
        credential = self.connect('reddit')
        with patch('social_stats.views.oauth.oauth_disconnect') as legacy:
            response = self.api.delete(f'/api/workspaces/{self.workspace.pk}/connections/reddit/?account_id={credential.social_account_id}')
        self.assertEqual(response.status_code, 204)
        legacy.assert_not_called()
        self.assertFalse(PlatformCredential.objects.filter(pk=credential.pk).exists())

    @patch('social_stats.inbox_tasks.sync_community_inbox.delay')
    def test_manual_sync_requires_original_workspace_account(self, queue):
        credential = self.connect()
        path = f'/api/workspaces/{self.workspace.pk}/connections/discord/inbox-sync/?account_id={credential.social_account_id}'
        self.assertEqual(self.api.post(path).status_code, 202)
        queue.assert_called_once_with(self.workspace.pk, credential.pk)
        other_credential = self.connect(workspace=self.other)
        response = self.api.post(path.replace(f'account_id={credential.social_account_id}', f'account_id={other_credential.social_account_id}'))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(queue.call_count, 1)

    def start_oauth(self):
        response = self.api.post(f'/api/oauth/reddit/start/{self.workspace.pk}/', {'subreddit': 'python'})
        self.assertEqual(response.status_code, 302)
        return self.api.session['reddit_oauth']['state']

    @patch('social_stats.views.community.oauth_request')
    def test_oauth_state_is_one_time_and_bound_to_user(self, exchange):
        state = self.start_oauth()
        wrong = self.api.get('/api/oauth/reddit/callback/', {'state': state + 'wrong', 'code': 'code'})
        replay = self.api.get('/api/oauth/reddit/callback/', {'state': state, 'code': 'code'})
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(replay.status_code, 400)
        exchange.assert_not_called()

    @patch('social_stats.views.community.oauth_request')
    @patch('social_stats.platforms.providers.reddit.RedditProvider.validate_credentials')
    def test_oauth_success_persists_encrypted_credentials_and_no_url_tokens(self, validate, exchange):
        state = self.start_oauth()
        exchange.return_value = {'access_token': 'PRIVATE-ACCESS', 'refresh_token': 'PRIVATE-REFRESH', 'expires_in': 3600, 'scope': ' '.join(SCOPES)}
        validate.return_value = ConnectionResult(account_id='owner', account_name='Owner', destination_id='python',
            access_token='PRIVATE-ACCESS', refresh_token='PRIVATE-REFRESH', scope=' '.join(SCOPES))
        response = self.api.get('/api/oauth/reddit/callback/', {'state': state, 'code': 'authorization-code'})
        self.assertEqual(response.status_code, 302)
        self.assertIn('connected=reddit', response.url)
        self.assertNotIn('PRIVATE', response.url)
        credential = PlatformCredential.objects.get(platform='reddit')
        self.assertEqual(credential.auth_method, 'oauth')
        self.assertEqual(credential.social_account.external_id, 'owner:python')
        self.assertEqual(credential.access_token, 'PRIVATE-ACCESS')

    @override_settings(REDDIT_CLIENT_ID='')
    def test_oauth_unconfigured_fails_without_remote_redirect(self):
        response = self.api.get(f'/api/oauth/reddit/start/{self.workspace.pk}/')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'missing_config')

    def test_consent_form_requires_csrf(self):
        api = APIClient(enforce_csrf_checks=True)
        api.force_authenticate(self.user)
        path = f'/api/oauth/reddit/start/{self.workspace.pk}/'
        self.assertEqual(api.get(path).status_code, 200)
        self.assertEqual(api.post(path, {'subreddit': 'python'}).status_code, 403)
        response = api.post(path, {'subreddit': 'python'}, HTTP_X_CSRFTOKEN=api.cookies['csrftoken'].value)
        self.assertEqual(response.status_code, 302)

    @patch('social_stats.views.community.oauth_request')
    def test_consent_expiry_and_permission_revocation(self, exchange):
        state = self.start_oauth()
        session = self.api.session
        context = session['reddit_oauth']
        context['expires_at'] = 0
        session['reddit_oauth'] = context
        session.save()
        self.assertEqual(self.api.get('/api/oauth/reddit/callback/', {'state': state, 'code': 'code'}).status_code, 400)
        state = self.start_oauth()
        with patch('social_stats.views.community.permitted', return_value=False):
            self.assertEqual(self.api.get('/api/oauth/reddit/callback/', {'state': state, 'code': 'code'}).status_code, 403)
        exchange.assert_not_called()

    @patch('social_stats.platforms.providers.discord.DiscordProvider.fetch_inbox')
    def test_rate_limit_defers_future_polling(self, fetch):
        from social_stats.inbox_tasks import sync_community_inbox
        credential = self.connect()
        fetch.side_effect = RateLimitError(retry_after=600)
        sync_community_inbox.run(self.workspace.pk, credential.pk)
        fetch.reset_mock()
        self.assertEqual(poll_account(self.workspace.pk, credential.pk), 0)
        fetch.assert_not_called()

    @patch('social_stats.platforms.providers.reddit.oauth_request')
    def test_expired_refreshable_account_remains_selectable_without_refresh_on_read(self, exchange):
        from social_stats.publishing_contract import validate_intent
        credential = self.connect('reddit')
        credential.expires_at = timezone.now() - timedelta(minutes=1)
        credential.save()
        self.assertEqual(ConnectionService().statuses(self.workspace)['reddit']['status'], 'active')
        validate_intent({'content': 'Title', 'media_type': 'text', 'target_platforms': ['reddit'],
            'platform_overrides': {'reddit': {'social_account_id': credential.social_account_id}}},
            self.workspace, self.user, ready=True)
        exchange.assert_not_called()
