"""Connection endpoints for Telegram-compatible channel publishers."""
from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Client, PlatformCredential
from .publishers._bot_api_client import BotAPIClient
from .publishers.base import PublishError


PROVIDERS = {
    'telegram': 'https://api.telegram.org',
    'bale': 'https://tapi.bale.ai',
}


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
    rows = PlatformCredential.objects.filter(
        client=client, platform__in=PROVIDERS.keys()
    )
    result = {}
    for credential in rows:
        result[credential.platform] = {
            'status': credential.status,
            'credential_id': credential.id,
            'destination_id': credential.platform_user_id,
            'account_name': credential.page_name or '',
            'connected_at': credential.connected_at,
        }
    return Response(result)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def bot_channel_connection(request, client_id, platform):
    platform = (platform or '').lower()
    if platform not in PROVIDERS:
        return Response({'detail': 'Unsupported bot provider'}, status=404)

    client, error = _client_or_error(request, client_id)
    if error:
        return error

    if request.method == 'DELETE':
        PlatformCredential.objects.filter(client=client, platform=platform).delete()
        return Response(status=204)

    token = (request.data.get('token') or '').strip()
    destination_id = (request.data.get('destination_id') or '').strip()
    if not token or not destination_id:
        return Response({'detail': 'token and destination_id are required'}, status=400)

    try:
        api = BotAPIClient(token, PROVIDERS[platform])
        bot = api.get_me()
        chat = api.get_chat(destination_id)
    except PublishError as exc:
        return Response({'detail': str(exc), 'code': exc.code}, status=400)

    bot_name = bot.get('username') or bot.get('first_name') or str(bot.get('id') or '')
    chat_name = chat.get('title') or chat.get('username') or destination_id

    credential, _ = PlatformCredential.objects.update_or_create(
        client=client,
        platform=platform,
        defaults={
            'access_token': token,
            'platform_user_id': destination_id,
            # Reuse the generic display field until account metadata is normalized.
            'page_name': bot_name,
            'scope': f'bot:{chat_name}',
            'is_active': True,
            'auth_method': 'manual_token',
            'expires_at': None,
        },
    )
    return Response({
        'success': True,
        'credential_id': credential.id,
        'platform': platform,
        'bot': {'id': bot.get('id'), 'name': bot_name},
        'destination': {'id': destination_id, 'name': chat_name},
    })
