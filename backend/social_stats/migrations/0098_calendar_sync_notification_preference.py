from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('social_stats', '0097_gemini_provider'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notificationpreference',
            name='event_type',
            field=models.CharField(
                max_length=40,
                choices=[
    ('viral_post',        'Viral post'),
    ('engagement_drop',   'Engagement drop'),
    ('negative_cluster',  'Negative-sentiment cluster'),
    ('follower_milestone', 'Follower milestone'),
    ('best_time_window',  'Best-time-to-post window'),
    ('mention',           'Mention or tag'),
    ('token_expiring',    'Token expiring soon'),
    ('publish_failed',    'Publish failed'),
    ('calendar_sync_failed', 'Tracked channel collection failed'),
    ('post_published',    'Post published'),
    ('approval_pending',  'Post needs approval'),
    ('inbox_message',     'New inbound message'),
    ('inbox_review',      'New review'),
    # Marketplace
    ('manage_request_received', 'Agency wants to manage your account'),
    ('agency_invite_received',  'Client invited your agency'),
    ('relation_terminated',     'Agency relationship ended'),
    ('approval_requested',      'Action needs your approval'),
    ('approval_decided',        'Your approval request was decided'),
    ('new_review_received',     'New review left for your agency'),
    ('review_response',         'Agency replied to your review'),
    ('marketplace_inquiry',     'Marketplace inquiry'),
    # CTWA bot builder
    ('bot_handoff',          'Bot handed a conversation to you'),
    ('bot_lead_captured',    'New CTWA lead captured'),
    ('bot_ai_takeover',      'AI chat took over a conversation'),
    ('invitation_received',     'Invitation to manage an account'),
    ('invitation_accepted',     'Your invitation was accepted'),
    ('invitation_rejected',     'Your invitation was rejected'),
    ('invitation_cancelled',    'Invitation was cancelled'),
    ('agency_invite_accepted',  'Agency accepted your invitation'),
    ('agency_invite_declined',  'Agency declined your invitation'),
    ('manage_request_accepted', 'Your manage request was accepted'),
    ('manage_request_declined', 'Your manage request was declined'),
    ('manage_request_cancelled', 'Manage request was cancelled'),
    ('permission_changed', 'A client updated your permissions'),
    ('relation_paused',    'A client paused your access'),
    ('relation_resumed',   'A client resumed your access'),
    ('agency_disconnected',     'A client disconnected from your agency'),
    ('client_account_deleted',  'A client deleted their account'),
    ('client_joined',           'Your invited client joined Ravinta'),
],
            ),
        ),
    ]
