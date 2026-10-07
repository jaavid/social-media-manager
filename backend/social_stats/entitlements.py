"""Organization-wide billing policy, metering and serialized resource writes."""
from contextlib import contextmanager

from django.db import router, transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from .billing_plans import get_plan


class EntitlementDenied(PermissionDenied):
    default_code = 'entitlement_denied'


def subscription_for(organization, *, using='default'):
    from .models import Subscription

    return Subscription.objects.using(using).get_or_create(
        organization_id=organization.pk,
        defaults={'plan': 'self-hosted', 'status': 'active'},
    )[0]


def effective_plan(subscription):
    plan = get_plan(subscription.plan)
    if subscription.status in ('active', 'trialing'):
        return plan
    # Suspension blocks growth and premium execution, never reads/deletions.
    return {**plan, 'limits': dict.fromkeys(plan['limits'], 0),
            'capabilities': dict.fromkeys(plan['capabilities'], False)}


def month_key():
    return timezone.now().strftime('%Y-%m')


def resource_usage(organization, subscription, key, *, using='default'):
    from .models import Client, MediaAsset, OrganizationMembership, SocialAccount

    if key == 'members':
        members = OrganizationMembership.objects.using(using).filter(
            organization_id=organization.pk, is_active=True,
        ).exclude(user_id=organization.owner_user_id).count()
        return members + int(organization.owner_user_id is not None)
    if key == 'workspaces':
        return Client.objects.using(using).filter(organization_id=organization.pk).count()
    if key == 'social_accounts':
        return SocialAccount.objects.using(using).filter(
            client__organization_id=organization.pk, is_active=True,
        ).count()
    if key == 'storage_bytes':
        return MediaAsset.objects.using(using).filter(
            client__organization_id=organization.pk,
        ).aggregate(total=Sum('file_size'))['total'] or 0
    if key == 'ai_generations_per_month':
        return subscription.usage_counters.get('ai', {}).get(month_key(), 0)
    raise KeyError(key)


def usage_for(organization, subscription, *, using='default'):
    return {key: resource_usage(organization, subscription, key, using=using)
            for key in ('workspaces', 'members', 'social_accounts', 'storage_bytes',
                        'ai_generations_per_month')}


def snapshot(organization):
    sub = subscription_for(organization)
    plan = effective_plan(sub)
    usage = usage_for(organization, sub)
    return {
        'organization_id': organization.pk,
        'subscription': {'id': sub.pk, 'plan': sub.plan, 'status': sub.status},
        'capabilities': plan['capabilities'],
        'usage': {
            key: {'current': value, 'limit': plan['limits'][key],
                  'remaining': None if plan['limits'][key] is None else
                  max(0, plan['limits'][key] - value)}
            for key, value in usage.items()
        },
        'ai_period': month_key(),
    }


def require_capacity(organization, key, increment=1, *, using='default'):
    if not isinstance(increment, int) or increment < 0:
        raise ValueError('increment must be a non-negative integer')
    sub = subscription_for(organization, using=using)
    limit = effective_plan(sub)['limits'][key]
    current = resource_usage(organization, sub, key, using=using)
    if increment and limit is not None and current + increment > limit:
        raise EntitlementDenied({
            'code': 'entitlement_limit_exceeded', 'resource': key,
            'current': current, 'limit': limit, 'organization_id': organization.pk,
        })
    return {'current': current, 'limit': limit, 'plan': sub.plan}


def capability_allowed(organization, capability):
    return effective_plan(subscription_for(organization))['capabilities'].get(capability, False)


@contextmanager
def locked_organization(organization_id, *, using='default'):
    from .models import Organization

    with transaction.atomic(using=using):
        # All resource creation paths lock the same tenant row through commit.
        org = Organization.objects.using(using).select_for_update().get(pk=organization_id)
        yield org


def reserve_ai(workspace):
    with locked_organization(workspace.organization_id) as org:
        if not capability_allowed(org, 'ai'):
            raise EntitlementDenied({'code': 'capability_not_entitled', 'capability': 'ai'})
        require_capacity(org, 'ai_generations_per_month')
        sub = subscription_for(org)
        counters = dict(sub.usage_counters)
        # Only the current UTC calendar month is needed for quota accounting.
        counters['ai'] = {month_key(): counters.get('ai', {}).get(month_key(), 0) + 1}
        sub.usage_counters = counters
        sub.save(update_fields=['usage_counters', 'updated_at'])


class EntitledResourceMixin:
    """Guard ordinary ORM/admin/API saves; bulk writes are migration-only."""

    def save(self, *args, **kwargs):
        using = kwargs.get('using') or router.db_for_write(type(self), instance=self)
        label = self._meta.model_name
        org_id = self.organization_id if label == 'organizationmembership' else self.client.organization_id
        with locked_organization(org_id, using=using) as org:
            old = type(self).objects.using(using).filter(pk=self.pk).first() if self.pk else None
            if label == 'organizationmembership':
                delta = int(self.is_active and self.user_id != org.owner_user_id)
                if old and old.organization_id == org.pk and old.is_active and old.user_id != org.owner_user_id:
                    delta = 0
                key = 'members'
            elif label == 'socialaccount':
                delta = int(self.is_active)
                if old and old.client.organization_id == org.pk and old.is_active:
                    delta = 0
                key = 'social_accounts'
            else:
                if self.file and not self.file._committed:
                    self.file_size = self.file.size
                    if kwargs.get('update_fields') is not None:
                        kwargs['update_fields'] = set(kwargs['update_fields']) | {'file_size'}
                if self.file_size < 0:
                    raise EntitlementDenied({'code': 'invalid_storage_size'})
                previous = old.file_size if old and old.client.organization_id == org.pk else 0
                delta = max(0, self.file_size - previous)
                key = 'storage_bytes'
            require_capacity(org, key, delta, using=using)
            return super().save(*args, **kwargs)


class EntitledCapabilityMixin:
    """Gate premium configuration writes in admin and ordinary ORM paths too."""

    entitlement_capability = None

    def save(self, *args, **kwargs):
        using = kwargs.get('using') or router.db_for_write(type(self), instance=self)
        with locked_organization(self.client.organization_id, using=using) as org:
            if not capability_allowed(org, self.entitlement_capability):
                raise EntitlementDenied({'code': 'capability_not_entitled',
                                         'capability': self.entitlement_capability})
            return super().save(*args, **kwargs)
