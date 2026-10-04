# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django.utils import timezone
from social_stats.models import Client, OnboardingStep, ONBOARDING_STEP_CHOICES

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=Client)
def create_onboarding_steps(sender, instance, created, **kwargs):
    if created:
        for step_key, _ in ONBOARDING_STEP_CHOICES:
            OnboardingStep.objects.get_or_create(client=instance, step_key=step_key)


@receiver(post_save, sender='social_stats.PlatformCredential')
def mark_connect_platform(sender, instance, created, **kwargs):
    if created:
        OnboardingStep.objects.filter(
            client=instance.client, step_key='connect_platform', is_completed=False
        ).update(is_completed=True, completed_at=timezone.now())
        OnboardingStep.objects.filter(
            client=instance.client, step_key='add_credentials', is_completed=False
        ).update(is_completed=True, completed_at=timezone.now())


@receiver(post_save, sender='social_stats.SyncLog')
def mark_first_sync(sender, instance, **kwargs):
    if instance.status == 'success' and instance.client_id:
        OnboardingStep.objects.filter(
            client=instance.client, step_key='first_sync', is_completed=False
        ).update(is_completed=True, completed_at=timezone.now())


@receiver(post_save, sender='social_stats.ClientGoal')
def mark_set_goals(sender, instance, created, **kwargs):
    if created:
        OnboardingStep.objects.filter(
            client=instance.client, step_key='set_goals', is_completed=False
        ).update(is_completed=True, completed_at=timezone.now())


