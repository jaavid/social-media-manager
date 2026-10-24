"""Read-only channel content, kept separate from owned-account analytics."""
from django.db import models
from social_stats.fields import EncryptedTextField


class InstagramReaderSession(models.Model):
    client = models.OneToOneField('Client', on_delete=models.CASCADE)
    settings_json = EncryptedTextField()
    locked_until = models.DateTimeField(null=True, blank=True)


class CalendarSource(models.Model):
    client = models.ForeignKey('Client', on_delete=models.CASCADE, related_name='calendar_sources')
    platform = models.CharField(max_length=30, default='instagram', choices=[('instagram', 'Instagram')])
    username = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    sync_status = models.CharField(max_length=24, default='idle')
    error_code = models.CharField(max_length=40, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['client', 'platform', 'username'], name='calendar_source_identity',
        )]
        ordering = ['username', 'id']


class ChannelCalendarPost(models.Model):
    source = models.ForeignKey(CalendarSource, on_delete=models.CASCADE, related_name='posts')
    external_id = models.CharField(max_length=300)
    caption = models.TextField(blank=True)
    post_type = models.CharField(max_length=20)
    post_url = models.URLField(max_length=500)
    media_url = models.TextField(blank=True)
    published_at = models.DateTimeField()
    metrics = models.JSONField(default=dict)
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['source', 'external_id'], name='channel_calendar_post_identity',
        )]
        ordering = ['-published_at', '-id']
