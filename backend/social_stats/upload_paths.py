"""Stable tenant paths; user-supplied names never become directory components."""
from pathlib import PurePosixPath
from uuid import uuid4
from django.utils import timezone


def _filename(filename):
    extension = PurePosixPath(filename.replace('\\', '/')).suffix.lower()[:12]
    return uuid4().hex + extension


def media_path(instance, filename, kind='files'):
    workspace = instance.client
    account = instance.social_account
    scope = f'platforms/{account.platform}/accounts/{account.pk}' if account else 'shared'
    return (f'organizations/{workspace.organization_id}/workspaces/{workspace.pk}/'
            f'{scope}/{kind}/{timezone.now():%Y/%m}/{_filename(filename)}')


def thumbnail_path(instance, filename):
    return media_path(instance, filename, 'thumbnails')


def workspace_image_path(instance, filename):
    return f'organizations/{instance.organization_id}/workspaces/{instance.pk}/branding/{_filename(filename)}'


def avatar_path(instance, filename):
    return f'users/{instance.user_id}/avatars/{_filename(filename)}'
