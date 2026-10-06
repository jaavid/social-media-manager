"""Shared Composer intent validation. No transport, conversion or secret output."""
from .models import MediaAsset, PlatformCredential
from .platforms.registry import get_provider
from .platforms.base import ProviderError
from .authorization import evaluate


def invalid(code, detail):
    raise ProviderError(detail, code=code)


def delivery_options(payload, platform):
    options = (payload.get('platform_overrides') or {}).get(platform, {})
    if not isinstance(options, dict):
        invalid('invalid_request', 'Provider options must be an object')
    targets = options.get('account_targets')
    if targets is None:
        return [options]
    if not isinstance(targets, list) or not targets or len(targets) > 50:
        invalid('invalid_request', 'Select at least one account')
    seen, result = set(), []
    for target in targets:
        if not isinstance(target, dict) or type(target.get('social_account_id')) is not int:
            invalid('invalid_request', 'Account target requires an account ID')
        account_id = target['social_account_id']
        if account_id <= 0 or account_id in seen:
            invalid('invalid_request', 'Account targets must be unique')
        seen.add(account_id)
        result.append({**options, **target})
    return result


def post_payload(post):
    return {key: getattr(post, key) for key in
            ('content', 'media_type', 'media_urls', 'target_platforms', 'platform_overrides')}


def scoped_credential(workspace, platform, options):
    query = PlatformCredential.objects.filter(client=workspace, platform=platform).select_related('social_account')
    account_id = options.get('social_account_id')
    if account_id:
        if type(account_id) is not int or account_id <= 0:
            invalid('invalid_request', 'Invalid account ID')
        credential = query.filter(social_account_id=account_id).first()
        if credential is None:
            invalid('scope_denied', 'Account is unavailable in this workspace')
    else:
        candidates = list(query.filter(is_active=True)[:2])
        if len(candidates) > 1:
            invalid('account_required', 'Select an account explicitly')
        credential = candidates[0] if candidates else None
    if credential and credential.social_account and (credential.social_account.client_id != getattr(workspace, 'pk', workspace) or credential.social_account.platform != platform):
        invalid('scope_denied', 'Account is unavailable in this workspace')
    return credential


def validate_media(policy, content, urls, workspace, *, inspect_assets=True):
    if not isinstance(content, str) or not isinstance(urls, list) or any(not isinstance(url, str) for url in urls):
        invalid('invalid_request', 'Invalid text or media list')
    if policy.max_characters and len(content) > policy.max_characters:
        invalid('text_limit', f'Text exceeds {policy.max_characters} characters')
    if policy.min_items and len(urls) < policy.min_items:
        invalid('media_count', f'Use at least {policy.min_items} media items')
    if policy.max_items and len(urls) > policy.max_items:
        invalid('media_count', f'Use at most {policy.max_items} media items')
    for url in urls:
        if url.startswith('asset:'):
            try:
                asset = MediaAsset.objects.filter(pk=int(url[6:]), client=workspace).first()
            except ValueError:
                asset = None
            if not asset:
                invalid('media_invalid', 'Media is unavailable in this workspace')
            if not inspect_assets:
                continue
            if policy.max_bytes and asset.file_size > policy.max_bytes:
                invalid('media_size', f'Media exceeds {policy.max_bytes} bytes')
            if policy.mime_types and asset.mime_type not in policy.mime_types:
                invalid('media_type', 'Media format is incompatible')
            if policy.max_seconds and (asset.duration_seconds is None or asset.duration_seconds > policy.max_seconds):
                invalid('media_duration', f'Media duration must be known and at most {policy.max_seconds} seconds')
            if policy.max_width and (not asset.width or asset.width > policy.max_width):
                invalid('media_dimensions', 'Media width exceeds the maximum')
            if policy.min_width and (not asset.width or asset.width < policy.min_width):
                invalid('media_dimensions', 'Media width is below the minimum')
            if policy.min_height and (not asset.height or asset.height < policy.min_height):
                invalid('media_dimensions', 'Media height is below the minimum')
            if policy.aspect_min or policy.aspect_max:
                if not asset.width or not asset.height:
                    invalid('media_aspect', 'Media dimensions must be known')
                ratio = asset.width / asset.height
                if (policy.aspect_min and ratio < policy.aspect_min) or (policy.aspect_max and ratio > policy.aspect_max):
                    invalid('media_aspect', 'Media aspect ratio is incompatible')
        else:
            from .security.ssrf import check_url, UnsafeURLError
            try:
                check_url(url, allowed_schemes=('https',))
            except (ValueError, UnsafeURLError):
                invalid('media_invalid', 'Media URL is not allowed')
            # Remote media is inspected by the provider adapter at upload time.


def validate_intent(payload, workspace, user=None, *, action='draft_posts', ready=False):
    targets = payload.get('target_platforms', [])
    overrides = payload.get('platform_overrides', {})
    if not isinstance(targets, list) or any(not isinstance(p, str) for p in targets) or len(set(targets)) != len(targets):
        invalid('invalid_request', 'Select unique providers')
    if not isinstance(overrides, dict):
        invalid('invalid_request', 'Provider options must be an object')
    if ready and not targets:
        invalid('account_required', 'Select a publishing account')
    decisions = []
    for platform in targets:
        try:
            provider = get_provider(platform)
        except NotImplementedError:
            invalid('unsupported', 'Provider publishing is unavailable')
        manifest = provider.manifest
        for options in delivery_options(payload, platform):
            mode = options.get('media_type', payload.get('media_type', 'text'))
            if not isinstance(mode, str):
                invalid('invalid_request', 'Content mode must be a string')
            descriptor = manifest.publishing().get(mode)
            if not descriptor or not manifest.capability(descriptor.capability).enabled or manifest.status in ('blocked', 'deprecated'):
                invalid('unsupported', f'{platform}: content mode is unsupported')
            if action == 'schedule_posts' and not manifest.capability('scheduling').enabled:
                invalid('unsupported', f'{platform}: scheduling is unsupported')
            content = options.get('content', payload.get('content', ''))
            urls = options.get('media_urls', payload.get('media_urls', []))
            validate_media(descriptor.constraints, content, urls, workspace)
            if 'extensions' in options and (not isinstance(options['extensions'], dict) or set(options['extensions']) - set(manifest.extensions)):
                invalid('invalid_request', 'Unknown provider extension')
            provider.validate_publish(mode, content, options)
            # Nested provider media references obey the same workspace boundary.
            def nested(value):
                if isinstance(value, dict):
                    for key, item in value.items():
                        if key == 'media' and isinstance(item, str):
                            validate_media(descriptor.constraints, '', [item], workspace)
                        else:
                            nested(item)
                elif isinstance(value, list):
                    for item in value:
                        nested(item)
            nested(options)
            credential = scoped_credential(workspace, platform, options)
            account = credential.social_account if credential else None
            if user:
                decision = evaluate(user, workspace, action, account=account)
                if not decision.allowed:
                    invalid('permission_denied', 'Account permission denied')
                decisions.append(decision)
            if ready:
                if not credential or not credential.is_active or not credential.access_token or (account and not account.is_active):
                    invalid('not_connected', 'Reconnect the selected account')
                if credential.is_expired:
                    invalid('token_expired', 'Reconnect the expired account')
                if credential.auth_failure_code:
                    invalid('not_connected', 'Reconnect the selected account')
                policy = descriptor.constraints
                if policy.scopes and not set(policy.scopes) <= set(credential.scope.split()):
                    invalid('permission_denied', 'Required provider scopes are missing')
                kind = (account.metadata if account else {}).get('destination_type', manifest.destination_types[0])
                if kind not in (policy.destination_types or manifest.destination_types):
                    invalid('invalid_destination', 'Destination kind is incompatible')
                destination = options.get('destination_id', '')
                if not isinstance(destination, str):
                    invalid('invalid_destination', 'Invalid destination')
                if account and destination and destination not in {account.external_id, account.metadata.get('destination_id', account.external_id)}:
                    invalid('scope_denied', 'Destination is outside the selected account')
    return any(decision.requires_approval for decision in decisions)
