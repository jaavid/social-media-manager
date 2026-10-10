"""Connection endpoints for provider credentials managed by ConnectionService."""
from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.platforms.connection_service import ConnectionService
from social_stats.platforms.registry import get_provider
from social_stats.publishers.base import PublishError


def _client_or_error(request, client_id):
    from .connections import workspace_for
    return workspace_for(request, client_id)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bot_channel_status(request, client_id):
    client, error = _client_or_error(request, client_id)
    if error is not None:
        return error
    return Response(ConnectionService().statuses(client))


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def bot_channel_connection(request, client_id, platform):
    platform = (platform or '').lower()
    try:
        provider = get_provider(platform)
    except NotImplementedError:
        return Response({'detail': 'Unsupported provider'}, status=404)
    if (not provider.capabilities.connect or provider.manifest.status in {'blocked', 'deprecated'}
            or (provider.manifest.auth_type in {'managed_bot', 'bot_token'}
                and not provider.manifest.capability('connection').enabled)):
        return Response({'detail': 'Provider does not support connections'}, status=400)

    client, error = _client_or_error(request, client_id)
    if error is not None:
        return error

    from .connections import account_for, permitted
    account_id = (request.data.get('social_account_id') or
                  request.query_params.get('social_account_id'))
    account = account_for(client, provider.manifest.key, account_id)
    if account_id and account is None:
        return Response({'code': 'scope_denied'}, status=403)
    action = 'disconnect_platforms' if request.method == 'DELETE' else 'connect_platforms'
    if not permitted(request.user, client, action, account):
        return Response({'code': 'permission_denied'}, status=403)
    # A legacy provider-wide request must respect every account's restriction.
    if account is None:
        from social_stats.models import SocialAccount
        if any(not permitted(request.user, client, action, item) for item in
               SocialAccount.objects.filter(client=client, platform=provider.manifest.key)):
            return Response({'code': 'permission_denied'}, status=403)

    if request.method == 'DELETE':
        try:
            ConnectionService().disconnect(client, platform, social_account_id=request.data.get('social_account_id') or request.query_params.get('social_account_id'))
        except PublishError as exc:
            return Response({'detail': str(exc), 'code': exc.code}, status=400)
        return Response(status=204)

    # The metadata-driven UI calls API-key style credentials ``api_key`` while
    # current token-based providers persist them in PlatformCredential.access_token.
    # Normalize the transport alias here and keep provider contracts token-based.
    token = request.data.get('token') or request.data.get('api_key') or ''
    destination_id = request.data.get('destination_id') or ''
    if not isinstance(token, str) or not isinstance(destination_id, str):
        return Response({'code': 'invalid_request'}, status=400)
    token, destination_id = token.strip(), destination_id.strip()
    if provider.manifest.auth_type == 'managed_bot':
        if 'token' in request.data or 'api_key' in request.data:
            return Response({'code': 'invalid_request'}, status=400)
    elif not token:
        return Response({'detail': 'token or api_key is required'}, status=400)
    if len(token) > 2048 or len(destination_id) > 200:
        return Response({'detail': 'credential or destination_id is too long'}, status=400)

    try:
        values = {'destination_id': destination_id}
        if provider.manifest.auth_type == 'managed_bot':
            from social_stats.platforms.managed_bots import challenge_code
            values['ownership_code'] = challenge_code(request.data.get('verification_token'), client.pk, request.user.pk, platform)
        else:
            values['token'] = token
        credential, result = ConnectionService().connect(client, platform, values, social_account_id=account_id)
    except PublishError as exc:
        return Response({'detail': str(exc), 'code': exc.code}, status=400)

    return Response({
        'success': True,
        'credential_id': credential.id,
        'platform': platform,
        **result.public_data(),
    })
