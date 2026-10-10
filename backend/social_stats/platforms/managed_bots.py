"""Server-owned bot configuration and channel publishing verification."""
import secrets

from django.conf import settings
from django.core import signing

from social_stats.publishers.base import PublishError


def bot_configuration(platform):
    config = getattr(settings, 'MESSENGER_BOTS', {}).get(platform, {})
    token = str(config.get('token') or '').strip()
    username = str(config.get('username') or '').strip().lstrip('@')
    return token, username


def managed_token(platform):
    token, _ = bot_configuration(platform)
    if not token:
        raise PublishError('Project bot is not configured', code='missing_config')
    return token


def publishing_token(credential):
    if getattr(credential, 'auth_method', '') == 'managed_bot':
        return managed_token(credential.platform)
    return credential.access_token


def channel_challenge(workspace_id, user_id, platform):
    code = 'ravinta-' + secrets.token_hex(12)
    token = signing.dumps({'workspace': workspace_id, 'user': user_id,
                          'platform': platform, 'code': code}, salt='managed-channel')
    return {'verification_code': code, 'verification_token': token}


def challenge_code(token, workspace_id, user_id, platform):
    if not isinstance(token, str) or len(token) > 2048:
        raise PublishError('Channel verification is required', code='channel_verification_required')
    try:
        payload = signing.loads(token, salt='managed-channel', max_age=1800)
    except (signing.BadSignature, ValueError, TypeError):
        raise PublishError('Channel verification expired; refresh the connections page',
                           code='channel_verification_required') from None
    if (not isinstance(payload, dict) or payload.get('workspace') != workspace_id
            or payload.get('user') != user_id or payload.get('platform') != platform
            or not isinstance(payload.get('code'), str)):
        raise PublishError('Channel verification is required', code='channel_verification_required')
    return payload['code']


def verify_channel(client, destination, *, ownership_code=None):
    bot = client.get_me()
    chat = client.get_chat(destination)
    if (not isinstance(bot, dict) or type(bot.get('id')) is not int or bot['id'] <= 0
            or not isinstance(chat, dict) or type(chat.get('id')) is not int or chat['id'] == 0):
        raise PublishError('Invalid bot or channel identity', code='invalid_response')
    if chat.get('type') != 'channel':
        raise PublishError('Select a channel', code='invalid_destination')
    member = client.get_chat_member(str(chat['id']), bot['id'])
    if (not isinstance(member, dict) or member.get('status') != 'administrator'
            or member.get('can_post_messages') is not True):
        raise PublishError('Add the project bot as administrator with permission to post', code='permission_denied')
    if ownership_code is not None and ownership_code not in (chat.get('description') or ''):
        raise PublishError('Add the verification code to the channel description', code='channel_verification_required')
    return bot, chat
