"""Connection endpoints for provider credentials managed by ConnectionService."""
from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.models import Client
from social_stats.platforms.connection_service import ConnectionService
from social_stats.platforms.registry import get_provider
from social_stats.publishers.base import PublishError


def _has_client_access(request, client_id) -> bool:
    try:
        profile = request.user.profile
    except Exception:
        return False
    if profile.role == 'superadmin':
        return True
    if profile.role == 'staff':
        return profile.assigned_clients.filter(id=client_id).exists()
    if profile.role == 'client':
        return profile.client_id == int(client_id)
    return False


def _client_or_error(request, client_id):
    if not _has_client_access(request, client_id):
        return None, Response({'detail': 'Access denied'}, status=403)
    client = Client.objects.filter(id=client_id).first()
    if not client:
        return None, Response({'detail': 'Client not found'}, status=404)
    return client, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bot_channel_status(request, client_id):
    client, error = _client_or_error(request, client_id)
    if error:
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
    if not provider.capabilities.connect:
        return Response({'detail': 'Provider does not support connections'}, status=400)

    client, error = _client_or_error(request, client_id)
    if error:
        return error

    if request.method == 'DELETE':
        try:
            ConnectionService().disconnect(client, platform, social_account_id=request.data.get('social_account_id') or request.query_params.get('social_account_id'))
        except PublishError as exc:
            return Response({'detail': str(exc), 'code': exc.code}, status=400)
        return Response(status=204)

    # The metadata-driven UI calls API-key style credentials ``api_key`` while
    # current token-based providers persist them in PlatformCredential.access_token.
    # Normalize the transport alias here and keep provider contracts token-based.
    token = (request.data.get('token') or request.data.get('api_key') or '').strip()
    destination_id = (request.data.get('destination_id') or '').strip()
    if not token:
        return Response({'detail': 'token or api_key is required'}, status=400)
    if len(token) > 2048 or len(destination_id) > 200:
        return Response({'detail': 'credential or destination_id is too long'}, status=400)

    try:
        credential, result = ConnectionService().connect(client, platform, {
            'token': token, 'destination_id': destination_id,
        })
    except PublishError as exc:
        return Response({'detail': str(exc), 'code': exc.code}, status=400)

    return Response({
        'success': True,
        'credential_id': credential.id,
        'platform': platform,
        **result.public_data(),
    })
