"""Workspace/account scoped Connected Accounts contract. No secret payloads."""
from dataclasses import asdict

from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.authorization import acting_context, evaluate
from social_stats.models import Client, SocialAccount
from social_stats.oauth_readiness import oauth_readiness_report
from social_stats.platform_registry import public_registry
from social_stats.platforms.base import public_provider_data
from social_stats.platforms.account_health import connection_health, sync_health
from social_stats.platforms.connection_service import ConnectionService
from social_stats.platforms.registry import get_provider
from social_stats.publishers.base import PublishError


def workspace_for(request, workspace_id):
    workspace = Client.objects.filter(pk=workspace_id).first()
    if workspace is None:
        return None, Response({'code': 'not_found'}, status=404)
    if acting_context(request.user, workspace)[0] == 'forbidden':
        return None, Response({'code': 'permission_denied'}, status=403)
    return workspace, None


def permitted(user, workspace, action, account=None):
    decision = evaluate(user, workspace, action, account=account)
    # Connect credentials must never be stored in an approval payload or replayed.
    return decision.allowed and not decision.requires_approval


def account_for(workspace, platform, account_id):
    if not account_id:
        return None
    try:
        return SocialAccount.objects.get(pk=account_id, client=workspace, platform=platform)
    except (SocialAccount.DoesNotExist, ValueError, TypeError):
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def connections(request, workspace_id):
    workspace, error = workspace_for(request, workspace_id)
    if error is not None:
        return error
    registry = public_registry()
    readiness = oauth_readiness_report()
    items = []
    for metadata in registry['platforms']:
        provider = get_provider(metadata['key'])
        manifest = provider.manifest
        connect_enabled = (manifest.capability('connection').enabled and
                           manifest.status not in {'blocked', 'deprecated'})
        accounts = []
        for account in SocialAccount.objects.filter(client=workspace, platform=manifest.key).select_related('credential'):
            credential = getattr(account, 'credential', None)
            health = connection_health(provider, credential)
            secrets = (credential.access_token, credential.refresh_token) if credential else ()
            def public_identity(value):
                return public_provider_data(value, secrets)
            account_metadata = account.metadata if isinstance(account.metadata, dict) else {}
            kind = account_metadata.get('destination_type', manifest.destination_types[0]) if isinstance(account.metadata, dict) else 'unknown'
            if not isinstance(kind, str) or kind not in manifest.destination_types:
                kind = 'unknown'
            accounts.append({
                'id': account.pk, 'name': public_identity(account.display_name),
                'external_id': public_identity(account.external_id),
                'identity': {'id': public_identity(account_metadata.get('account_identity', account.external_id)),
                             'name': public_identity(account_metadata.get('account_name', account.display_name))},
                'destination': {'id': public_identity(account_metadata.get('destination_id', account.external_id)),
                                'kind': kind},
                'health': asdict(health), 'sync': sync_health(provider, account),
                'publishing_readiness': {mode: bool(health.ready and account.is_active
                    and manifest.capability(descriptor.capability).enabled
                    and set(descriptor.constraints.scopes) <= set(credential.scope.split() if credential else ())
                    and kind in (descriptor.constraints.destination_types or manifest.destination_types))
                    for mode, descriptor in manifest.publishing().items()},
                'engagement_readiness': {name: bool(health.ready and account.is_active
                    and manifest.capability(name).enabled
                    and set(manifest.capability(name).scopes) <= set(credential.scope.split() if credential else ())
                    and kind in (manifest.capability(name).destination_types or manifest.destination_types))
                    for name in ('inbox', 'comments', 'reviews')},
                'expires_at': credential.expires_at if credential else None,
                'connected_at': credential.connected_at if credential else None,
                'permissions': {
                    **{action: evaluate(request.user, workspace, action, account=account).allowed
                       for action in ('view_inbox', 'reply_messages', 'reply_comments', 'reply_reviews', 'view_analytics', 'view_posts', 'export_data', 'generate_reports')},
                    'publish': evaluate(request.user, workspace, 'publish_posts', account=account).allowed,
                    'schedule': evaluate(request.user, workspace, 'schedule_posts', account=account).allowed
                        and set(manifest.capability('scheduling').scopes) <= set(credential.scope.split() if credential else ()),
                    'reconnect': connect_enabled and permitted(request.user, workspace, 'connect_platforms', account),
                    'disconnect': manifest.capability('disconnect').enabled and permitted(request.user, workspace, 'disconnect_platforms', account),
                },
            })
        items.append({**metadata, 'accounts': accounts,
                      'readiness': readiness.get(manifest.key),
                      'permissions': {'connect': connect_enabled and permitted(request.user, workspace, 'connect_platforms')}})
    return Response({'version': 1, 'workspace_id': workspace.pk,
                     'categories': registry['categories'], 'providers': items})


@api_view(['POST', 'DELETE', 'GET'])
@permission_classes([IsAuthenticated])
def connection(request, workspace_id, platform):
    workspace, error = workspace_for(request, workspace_id)
    if error is not None:
        return error
    try:
        provider = get_provider(platform)
    except NotImplementedError:
        return Response({'code': 'unsupported'}, status=404)
    account_id = request.query_params.get('account_id')
    account = account_for(workspace, provider.manifest.key, account_id)
    if account_id and account is None:
        return Response({'code': 'scope_denied'}, status=403)
    action = 'disconnect_platforms' if request.method == 'DELETE' else 'connect_platforms'
    if not permitted(request.user, workspace, action, account):
        return Response({'code': 'permission_denied'}, status=403)
    manifest = provider.manifest
    capability = 'disconnect' if request.method == 'DELETE' else 'connection'
    if not manifest.capability(capability).enabled or (
        request.method != 'DELETE' and manifest.status in {'blocked', 'deprecated'}
    ):
        return Response({'code': 'unsupported'}, status=400)
    if request.method == 'GET':
        if not manifest.oauth_start:
            return Response({'code': 'unsupported'}, status=400)
        path = manifest.oauth_start.format(workspace_id=workspace.pk)
        if account:
            path += ('&' if '?' in path else '?') + f'account_id={account.pk}'
        return redirect(path)
    try:
        if request.method == 'DELETE':
            if account is None:
                return Response({'code': 'account_required'}, status=400)
            if manifest.oauth_start:
                # Legacy OAuth disconnect uses the same permission evaluator.
                from .oauth import oauth_disconnect
                return oauth_disconnect(request._request, workspace.pk, manifest.key)
            ConnectionService().disconnect(workspace, manifest.key, social_account_id=account.pk)
            return Response(status=204)
        fields = manifest.connection_fields()
        if not fields or manifest.auth_type in {'oauth2', 'oidc', 'unsupported'}:
            return Response({'code': 'unsupported'}, status=400)
        values = {}
        for field in fields:
            value = request.data.get(field.key, '')
            if not isinstance(value, str) or len(value) > 2048:
                return Response({'code': 'invalid_request'}, status=400)
            value = value.strip() if field.normalization == 'trim' else value
            if field.required and not value:
                return Response({'code': 'invalid_request'}, status=400)
            values[field.key] = value
        if 'api_key' in values:
            values.setdefault('token', values['api_key'])
        credential, _ = ConnectionService().connect(
            workspace, manifest.key, values, social_account_id=account.pk if account else None,
            authorize_account=lambda existing: permitted(request.user, workspace, 'connect_platforms', existing))
        return Response({'success': True, 'account_id': credential.social_account_id}, status=201)
    except PublishError as exc:
        allowed_codes = {'unsupported', 'token_expired', 'rate_limited', 'permission_denied',
                         'invalid_credentials', 'invalid_response', 'network_error', 'timeout',
                         'account_mismatch', 'scope_denied'}
        return Response({'code': exc.code if exc.code in allowed_codes else 'provider_error'},
                        status=403 if exc.code in {'permission_denied', 'scope_denied'} else 400)
