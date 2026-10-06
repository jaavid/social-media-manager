"""Reference onboarding adapter with no real credentials or outbound traffic."""

from social_stats.platforms.base import (
    BasePlatformProvider,
    ConnectionResult,
    ProviderResult,
    StatsResult,
    InboxResult,
)
from social_stats.platforms.manifest import PlatformManifest, Capability, CAPABILITIES, AuthField, AnalyticsMetric
from social_stats.platforms.registry import register_provider
from social_stats.publishers.base import BasePublisher, PublishResult


class ExamplePublisher(BasePublisher):
    platform = 'contract_example'
    SUPPORTED_TYPES = frozenset({'text'})

    def publish_text(self, credential, content, **kwargs):
        return PublishResult(success=True, platform_post_id='fake-post')


@register_provider
class ExampleProvider(BasePlatformProvider):
    key = 'contract_example'
    manifest = PlatformManifest(
        key=key,
        title_fa='آزمایشی',
        title_en='Contract example',
        category='general_social',
        category_title_fa='شبکه‌های اجتماعی عمومی',
        auth_type='custom',
        capabilities=frozenset({'publish_text'}),
        output_service=key,
        status='experimental',
        support={
            name: (
                'supported'
                if name
                in {
                    'connection',
                    'disconnect',
                    'publish_text',
                    'analytics',
                    'inbox',
                    'webhooks',
                }
                else 'not_available'
            )
            for name in CAPABILITIES
        },
        constraints={
            'publish_text': Capability(
                'supported', max_characters=100, scopes=('publish',)
            )
        },
        analytics_metrics=(AnalyticsMetric('views', 'Views', 'بازدیدها', period='snapshot'),),
        inbound='both',
        auth_fields=(AuthField('token', 'Test credential', 'اعتبار آزمایشی', secret=True),
                     AuthField('destination_id', 'Destination ID', 'شناسه مقصد')),
    )
    publisher = ExamplePublisher()
    deliveries = {}
    events = set()
    threads = {}

    def validate_credentials(self, credentials):
        return ConnectionResult(
            account_id=credentials.get('destination_id', 'fake-account'),
            account_name='Example',
            access_token=credentials.get('token', 'fake-token'),
            scope='publish',
        )

    def revoke(self, credential):
        return ProviderResult()

    def refresh(self, credential, destination, request=None):
        return ConnectionResult(access_token='fake-refreshed-token')

    def publish_request(self, credential, destination, request):
        key = (
            destination.workspace_id,
            destination.account_id,
            request.idempotency_key,
        )
        if key not in self.deliveries:
            self.deliveries[key] = self.publisher.publish_text(
                credential, request.content
            )
        return self.deliveries[key]

    def sync_stats(self, credential, *, remote_id=''):
        return StatsResult(metrics={'views': 1})

    def ingest(self, credential, destination, request=None):
        key = (destination.workspace_id, destination.account_id, request.event_id)
        duplicate = key in self.events
        self.events.add(key)
        thread_id = f'thread:{destination.workspace_id}:{destination.account_id}'
        self.threads[thread_id] = (destination.workspace_id, destination.account_id)
        return InboxResult(
            items=[] if duplicate else [{'thread_id': thread_id}],
            cursor=request.cursor,
        )

    def reply(self, credential, destination, request=None):
        from social_stats.platforms.base import ProviderError

        if self.threads.get(request.thread_id) != (
            destination.workspace_id,
            destination.account_id,
        ):
            raise ProviderError(
                'Thread does not belong to this account', code='permission_denied'
            )
        return ProviderResult(data={'thread_id': request.thread_id})
