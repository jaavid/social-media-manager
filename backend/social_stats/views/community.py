"""Session-bound Reddit consent. Tokens never travel through browser URLs."""
import hmac
import secrets
import time
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.platforms.connection_service import ConnectionService
from social_stats.platforms.providers.reddit import SCOPES, oauth_request, subreddit, token_data
from social_stats.publishers.base import PublishError
from .connections import workspace_for, account_for, permitted
from .oauth import _settings_redirect


def configured():
    return all(getattr(settings, key, '') for key in (
        'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_REDIRECT_URI', 'REDDIT_USER_AGENT'))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_inbox(request, client_id, platform):
    from social_stats.models import PlatformCredential
    from social_stats.platforms.registry import get_provider
    from social_stats.inbox_tasks import sync_community_inbox
    workspace, error = workspace_for(request, client_id)
    if error is not None:
        return error
    try:
        provider = get_provider(platform)
    except NotImplementedError:
        return Response({'code': 'unsupported'}, status=404)
    if provider.manifest.inbound != 'polling':
        return Response({'code': 'unsupported'}, status=400)
    account = account_for(workspace, platform, request.query_params.get('account_id'))
    if account is None:
        return Response({'code': 'scope_denied'}, status=403)
    if not permitted(request.user, workspace, 'view_inbox', account):
        return Response({'code': 'permission_denied'}, status=403)
    credential = PlatformCredential.objects.filter(client=workspace, social_account=account,
        platform=platform, is_active=True, social_account__is_active=True).first()
    if not credential:
        return Response({'code': 'not_connected'}, status=400)
    sync_community_inbox.delay(workspace.pk, credential.pk)
    return Response({'queued': True}, status=202)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def reddit_start(request, client_id):
    workspace, error = workspace_for(request, client_id)
    if error is not None:
        return error
    account_id = request.query_params.get('account_id')
    account = account_for(workspace, 'reddit', account_id)
    if account_id and account is None:
        return Response({'code': 'scope_denied'}, status=403)
    if not permitted(request.user, workspace, 'connect_platforms', account):
        return Response({'code': 'permission_denied'}, status=403)
    if not configured():
        return Response({'code': 'missing_config'}, status=400)
    if request.method == 'GET':
        return render(request, 'social_stats/reddit_connect.html', {
            'subreddit': account.metadata.get('destination_id', '') if account else '',
        })
    try:
        sr = subreddit(request.data.get('subreddit'))
    except PublishError:
        return Response({'code': 'invalid_destination'}, status=400)
    if account and sr.lower() != account.metadata.get('destination_id', '').lower():
        return Response({'code': 'account_mismatch'}, status=400)
    state = secrets.token_urlsafe(32)
    request.session['reddit_oauth'] = {'state': state, 'user_id': request.user.pk,
        'workspace_id': workspace.pk, 'account_id': account.pk if account else None,
        'subreddit': sr, 'expires_at': time.time() + 600}
    return redirect('https://www.reddit.com/api/v1/authorize?' + urlencode({
        'client_id': settings.REDDIT_CLIENT_ID, 'response_type': 'code', 'state': state,
        'redirect_uri': settings.REDDIT_REDIRECT_URI, 'duration': 'permanent',
        'scope': ' '.join(SCOPES),
    }))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reddit_callback(request):
    context = request.session.pop('reddit_oauth', None)
    if (not context or context['user_id'] != request.user.pk
            or context['expires_at'] <= time.time()
            or not hmac.compare_digest(request.query_params.get('state', ''), context['state'])):
        return Response({'code': 'invalid_state'}, status=400)
    workspace, error = workspace_for(request, context['workspace_id'])
    if error is not None:
        return error
    account = account_for(workspace, 'reddit', context['account_id'])
    if context['account_id'] and account is None:
        return Response({'code': 'scope_denied'}, status=403)
    if not permitted(request.user, workspace, 'connect_platforms', account):
        return Response({'code': 'permission_denied'}, status=403)
    if request.query_params.get('error') or not request.query_params.get('code'):
        return _settings_redirect(workspace.pk, '?error=oauth_denied')
    try:
        token = token_data(oauth_request({'grant_type': 'authorization_code',
            'code': request.query_params['code'], 'redirect_uri': settings.REDDIT_REDIRECT_URI}),
            require_refresh=True)
        credential, _ = ConnectionService().connect(workspace, 'reddit', {
            **token, 'subreddit': context['subreddit'],
            'expires_at': timezone.now() + timedelta(seconds=int(token['expires_in'])),
        }, social_account_id=context['account_id'],
            authorize_account=lambda existing: permitted(request.user, workspace, 'connect_platforms', existing))
        credential.auth_method = 'oauth'
        credential.save(update_fields=['auth_method'])
    except (PublishError, ValueError, TypeError):
        return _settings_redirect(workspace.pk, '?error=connection_failed')
    return _settings_redirect(workspace.pk, '?connected=reddit')
