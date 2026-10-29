"""Provider data is public and shared; workspace membership remains on CalendarSource."""
from django.db import models


class PublicCollection(models.Model):
    kind = models.CharField(max_length=10, choices=[('profile', 'Profile'), ('posts', 'Posts')])
    status = models.CharField(max_length=20, default='queued')
    snapshot_id = models.CharField(max_length=110, blank=True)
    reserved_records = models.PositiveIntegerField()
    post_limit = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    locked_until = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=40, blank=True)


class PublicProfile(models.Model):
    # Instagram only for now; never join identities across platforms.
    platform = models.CharField(max_length=30, default='instagram')
    username = models.CharField(max_length=30)
    profile_error = models.CharField(max_length=40, blank=True)
    posts_error = models.CharField(max_length=40, blank=True)
    profile = models.JSONField(default=dict)
    posts = models.JSONField(default=list)
    profile_fetched_at = models.DateTimeField(null=True, blank=True)
    posts_fetched_at = models.DateTimeField(null=True, blank=True)
    profile_collection = models.ForeignKey(PublicCollection, null=True, blank=True,
                                          on_delete=models.SET_NULL, related_name='profile_targets')
    posts_collection = models.ForeignKey(PublicCollection, null=True, blank=True,
                                        on_delete=models.SET_NULL, related_name='posts_targets')

    class Meta:
        constraints = [models.UniqueConstraint(fields=['platform', 'username'], name='public_profile_identity')]


class PublicObservation(models.Model):
    """Internal provider payload history. Never serialize raw payloads to workspace APIs."""
    profile = models.ForeignKey(PublicProfile, on_delete=models.CASCADE, related_name='observations')
    collection = models.ForeignKey(PublicCollection, on_delete=models.CASCADE)
    applied = models.BooleanField(default=False)
    raw = models.JSONField(default=list)
    observed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['profile', 'collection'], name='public_observation_identity')]


class PublicSyncControl(models.Model):
    """Singleton row serializes batch reservation and the daily record allowance."""
    pass


class PublicPostRecord(models.Model):
    """Historical public posts shared by later subscribers as well as current ones."""
    profile = models.ForeignKey(PublicProfile, on_delete=models.CASCADE, related_name='stored_posts')
    external_id = models.CharField(max_length=300)
    data = models.JSONField(default=dict)
    observed_at = models.DateTimeField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=['profile', 'external_id'], name='public_post_record_identity')]
