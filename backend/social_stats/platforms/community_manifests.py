"""Canonical community contracts, included in definitions.PLATFORM_REGISTRY."""
from .manifest import (
    CAPABILITIES, AnalyticsMetric, AuthField, Capability, PlatformManifest,
    PublishingMode, ResiliencePolicy,
)


def support(*enabled):
    return {key: 'beta' if key in enabled else 'not_available' for key in CAPABILITIES}


COMMUNITY_MANIFESTS = (
    PlatformManifest(
        key='discord', title_fa='دیسکورد', title_en='Discord', category='messaging',
        category_title_fa='پیام‌رسان‌ها', auth_type='bot_token',
        capabilities=frozenset({'publish_text', 'publish_image', 'publish_video', 'analytics', 'inbox', 'comments'}),
        output_service='discord', status='beta',
        support=support('connection', 'disconnect', 'publish_text', 'publish_image',
                        'publish_video', 'scheduling', 'analytics', 'inbox', 'comments'),
        destination_types=('channel',), inbound='polling', ui_extensions=('discord_connection',),
        publisher='social_stats.platforms.providers.discord.DiscordPublisher',
        connection_handler='social_stats.views.connections.connection', egress_service='discord',
        auth_fields=(AuthField('token', 'Bot token', 'توکن ربات', secret=True, normalization='trim'),
                     AuthField('destination_id', 'Channel ID', 'شناسه کانال', normalization='trim')),
        icon='discord', display_icon='🎮', brand_color='#5865F2',
        constraints={key: Capability('beta', max_characters=2000) for key in ('inbox', 'comments')},
        publishing_modes={mode: PublishingMode(f'publish_{mode}', Capability(
            'beta', max_characters=2000, min_items=None if mode == 'text' else 1,
            max_items=None if mode == 'text' else 1,
            max_bytes=None if mode == 'text' else 10 * 1024 * 1024,
            mime_types=() if mode == 'text' else ('image/jpeg', 'image/png', 'image/gif', 'image/webp') if mode == 'image' else ('video/mp4', 'video/webm'),
        )) for mode in ('text', 'image', 'video')},
        analytics_metrics=(AnalyticsMetric('messages_sampled', 'Messages in latest sample', 'پیام‌های نمونه اخیر', period='snapshot'),
                           AnalyticsMetric('reactions_sampled', 'Reactions in latest sample', 'واکنش‌های نمونه اخیر', period='snapshot')),
        resilience=ResiliencePolicy(mutation_retry='never'),
    ),
    PlatformManifest(
        key='reddit', title_fa='ردیت', title_en='Reddit', category='social_content',
        category_title_fa='شبکه‌های اجتماعی محتوایی', auth_type='oauth2',
        capabilities=frozenset({'publish_text', 'analytics', 'inbox', 'comments', 'oauth'}),
        output_service='reddit', status='beta',
        support=support('connection', 'disconnect', 'publish_text', 'scheduling', 'analytics', 'inbox', 'comments'),
        destination_types=('profile',), inbound='polling',
        publisher='social_stats.platforms.providers.reddit.RedditPublisher',
        connection_handler='social_stats.views.community.reddit_start', egress_service='reddit',
        oauth_start='/api/oauth/reddit/start/{workspace_id}/',
        icon='reddit', display_icon='🟠', brand_color='#FF4500',
        constraints={'publish_text': Capability('beta', max_characters=40000, scopes=('submit',)),
                     'inbox': Capability('beta', max_characters=10000, scopes=('privatemessages',)),
                     'comments': Capability('beta', max_characters=10000, scopes=('submit',)),
                     'scheduling': Capability('beta', scopes=('submit',))},
        extensions=('reddit',), ui_extensions=('reddit_composer', 'reddit_connection'),
        publishing_modes={'text': PublishingMode('publish_text', Capability(
            'beta', max_characters=40000, scopes=('submit',)), 'reddit_composer')},
        analytics_metrics=(AnalyticsMetric('subscribers', 'Subreddit subscribers', 'مشترکان ساب‌ردیت', period='snapshot'),
                           AnalyticsMetric('link_karma', 'Account post karma', 'کارمای پست حساب', period='snapshot'),
                           AnalyticsMetric('comment_karma', 'Account comment karma', 'کارمای نظر حساب', period='snapshot')),
        resilience=ResiliencePolicy(mutation_retry='never'),
    ),
)
