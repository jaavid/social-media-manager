# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
Video Studio API.

Endpoints:
  POST /api/video/upload/             — multipart upload (or {url} import)
  POST /api/video/trim/               — {asset_id, start_seconds, end_seconds}
  POST /api/video/resize/             — {asset_id, target_aspect: '16:9'|'9:16'|'1:1'}
  POST /api/video/extract-thumbnail/  — {asset_id, time_seconds?}
  POST /api/video/add-captions/       — stubbed (501 unless WHISPER_API_KEY set)
  POST /api/video/youtube-upload/     — {asset_id, title, description?, tags?,
                                          privacy?, scheduled_publish_time?}

All operations are tenant-scoped via TenantScopedMixin-style guards.
moviepy is lazy-imported — endpoints return 503 with a clear message when
ffmpeg/moviepy isn't installed in the environment.
"""
from __future__ import annotations

import io
import logging
import os
import tempfile
from typing import Optional, Tuple

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import Image
from rest_framework.decorators import api_view, permission_classes
from social_stats.workspace_vocabulary import (
    WorkspaceJSONParser as JSONParser, WorkspaceFormParser as FormParser,
    WorkspaceMultiPartParser as MultiPartParser,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats import media_service
from social_stats.serializers.composer import MediaAssetSerializer
from social_stats.models import Client, MediaAsset, PlatformCredential

logger = logging.getLogger(__name__)


# ── Tenant guard ─────────────────────────────────────────────────────────────
def _resolved_client(request):
    from social_stats.authorization import accessible_workspaces, evaluate
    profile = getattr(request.user, 'profile', None)
    raw = (request.data.get('client_id') or request.data.get('workspace_id')
           or request.query_params.get('workspace_id') or request.query_params.get('client_id')
           or getattr(profile, 'client_id', None))
    try:
        cid = int(raw)
        if cid <= 0: raise ValueError
    except (TypeError, ValueError):
        return None, Response({'error': 'workspace_id required'}, status=400)
    client = accessible_workspaces(request.user).filter(pk=cid).first()
    if client is None:
        return None, Response({'error': 'Workspace unavailable'}, status=404)
    decision = evaluate(request.user, client, 'draft_posts')
    if not decision.allowed:
        return None, Response({'error': 'Permission denied'}, status=403)
    return client, None


def _resolved_asset(request, asset_id, client):
    """Look up a MediaAsset and confirm it belongs to the resolved client."""
    if not asset_id:
        return None, Response({'error': 'asset_id is required'}, status=400)
    try:
        asset = MediaAsset.objects.get(id=int(asset_id), client=client)
    except (MediaAsset.DoesNotExist, ValueError, TypeError):
        return None, Response({'error': 'Asset not found in your tenant'}, status=404)
    return asset, None


def _moviepy_or_503():
    """Lazy-import moviepy; return (None, 503 Response) when unavailable."""
    try:
        from moviepy.editor import VideoFileClip
        return VideoFileClip, None
    except ImportError:
        return None, Response(
            {'error': 'Video processing not configured on this server '
                      '(install moviepy + ffmpeg)'},
            status=503,
        )


# ══════════════════════════════════════════════════════════════════════
# 1. Upload (multipart) or URL import
# ══════════════════════════════════════════════════════════════════════
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_video(request):
    client, err = _resolved_client(request)
    if err: return err

    upload = request.FILES.get('file')
    src_url = (request.data.get('url') or '').strip()
    folder = (request.data.get('folder') or '').strip()
    alt    = (request.data.get('alt_text') or '').strip()

    if upload:
        asset = media_service.upload_media(
            upload, client_id=client.id,
            uploaded_by_id=request.user.id,
            folder=folder, alt_text=alt,
        )
        return Response(MediaAssetSerializer(asset).data, status=201)

    if src_url:
        return _import_from_url(client, request.user, src_url, folder, alt)

    return Response({'error': 'file (multipart) or url is required'}, status=400)


def _import_from_url(client, user, url: str, folder: str, alt: str):
    """Stream-download a remote video into a MediaAsset."""
    from social_stats.security.ssrf import check_url, UnsafeURLError
    try:
        check_url(url, allowed_schemes=('https',))
    except (UnsafeURLError, ValueError):
        return Response({'error': 'Media URL is not allowed'}, status=400)
    try:
        with requests.get(url, stream=True, timeout=(10, 120), allow_redirects=False) as src:
            if src.status_code != 200:
                return Response({'error': f'Failed to fetch URL ({src.status_code})'},
                                status=400)
            data = io.BytesIO()
            for chunk in src.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    data.write(chunk)
            data.seek(0)
            mime = src.headers.get('Content-Type', 'video/mp4').split(';')[0]
    except requests.RequestException:
        return Response({'error': 'Media import failed'}, status=502)

    name = (url.split('/')[-1] or 'imported.mp4').split('?')[0]
    pseudo_file = ContentFile(data.getvalue(), name=name or 'imported.mp4')
    pseudo_file.content_type = mime
    pseudo_file.size = len(data.getvalue())
    asset = media_service.upload_media(
        pseudo_file, client_id=client.id,
        uploaded_by_id=user.id, folder=folder, alt_text=alt,
    )
    return Response(MediaAssetSerializer(asset).data, status=201)


# ══════════════════════════════════════════════════════════════════════
# 2. Trim
# ══════════════════════════════════════════════════════════════════════
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trim_video(request):
    client, err = _resolved_client(request)
    if err: return err
    asset, err = _resolved_asset(request, request.data.get('asset_id'), client)
    if err: return err

    # Validate inputs *before* the lazy moviepy check so 400s aren't masked by 503s.
    try:
        start = float(request.data.get('start_seconds') or 0)
        end   = float(request.data.get('end_seconds') or 0)
    except (TypeError, ValueError):
        return Response({'error': 'start_seconds and end_seconds must be numbers'}, status=400)
    if end <= start:
        return Response({'error': 'end_seconds must be > start_seconds'}, status=400)

    VideoFileClip, err = _moviepy_or_503()
    if err: return err

    src_path = _local_path(asset)
    if not src_path:
        return Response({'error': 'Source file unavailable'}, status=400)

    try:
        with VideoFileClip(src_path) as clip:
            duration = float(clip.duration or 0)
            if start >= duration:
                return Response({'error': f'start_seconds ({start}) exceeds duration ({duration:.1f})'}, status=400)
            end = min(end, duration)

            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as out:
                out_path = out.name
            try:
                clip.subclip(start, end).write_videofile(
                    out_path, codec='libx264', audio_codec='aac',
                    logger=None, verbose=False,
                )
                with open(out_path, 'rb') as fh:
                    new_asset = _save_derived(
                        client=client, source=asset, user=request.user,
                        bytes_=fh.read(),
                        suffix='_trim',
                        mime='video/mp4',
                        duration=end - start,
                    )
                return Response(MediaAssetSerializer(new_asset).data, status=201)
            finally:
                _safe_unlink(out_path)
    except Exception:
        logger.warning('trim_video failed')
        return Response({'error': 'Trim failed'}, status=500)


# ══════════════════════════════════════════════════════════════════════
# 3. Resize (16:9 → 9:16 → 1:1) with center smart-crop
# ══════════════════════════════════════════════════════════════════════
TARGET_ASPECTS = {
    '16:9': (16, 9),
    '9:16': (9, 16),
    '1:1':  (1, 1),
    '4:5':  (4, 5),
}

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resize_video(request):
    client, err = _resolved_client(request)
    if err: return err
    asset, err = _resolved_asset(request, request.data.get('asset_id'), client)
    if err: return err

    target = (request.data.get('target_aspect') or '').strip()
    if target not in TARGET_ASPECTS:
        return Response(
            {'error': f'target_aspect must be one of {sorted(TARGET_ASPECTS.keys())}'},
            status=400,
        )

    VideoFileClip, err = _moviepy_or_503()
    if err: return err

    src_path = _local_path(asset)
    if not src_path:
        return Response({'error': 'Source file unavailable'}, status=400)

    try:
        with VideoFileClip(src_path) as clip:
            new_w, new_h = _target_dimensions(clip.size, TARGET_ASPECTS[target])
            # Use the clip's bound crop helper (moviepy.Clip.crop) so callers
            # don't need to import from a submodule. Equivalent to
            # `from moviepy.video.fx.all import crop; crop(clip, ...)`.
            cropped = clip.crop(
                x_center=clip.w / 2, y_center=clip.h / 2,
                width=new_w, height=new_h,
            )
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as out:
                out_path = out.name
            try:
                cropped.write_videofile(
                    out_path, codec='libx264', audio_codec='aac',
                    logger=None, verbose=False,
                )
                with open(out_path, 'rb') as fh:
                    new_asset = _save_derived(
                        client=client, source=asset, user=request.user,
                        bytes_=fh.read(),
                        suffix=f'_{target.replace(":", "x")}',
                        mime='video/mp4',
                        duration=clip.duration,
                    )
                # Persist new dimensions
                new_asset.width, new_asset.height = new_w, new_h
                new_asset.save(update_fields=['width', 'height'])
                return Response(MediaAssetSerializer(new_asset).data, status=201)
            finally:
                _safe_unlink(out_path)
    except Exception:
        logger.warning('resize_video failed')
        return Response({'error': 'Resize failed'}, status=500)


def _target_dimensions(orig: Tuple[int, int], aspect: Tuple[int, int]) -> Tuple[int, int]:
    """Compute the largest crop rectangle inside `orig` matching `aspect`."""
    w, h = orig
    aw, ah = aspect
    # If original is wider than target → crop sides; else crop top/bottom
    if w * ah > h * aw:
        new_h = h
        new_w = int(round(h * aw / ah))
    else:
        new_w = w
        new_h = int(round(w * ah / aw))
    # Ensure even dimensions (h.264 requirement)
    new_w -= new_w % 2
    new_h -= new_h % 2
    return new_w, new_h


# ══════════════════════════════════════════════════════════════════════
# 4. Extract thumbnail
# ══════════════════════════════════════════════════════════════════════
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_thumbnail(request):
    client, err = _resolved_client(request)
    if err: return err
    asset, err = _resolved_asset(request, request.data.get('asset_id'), client)
    if err: return err

    VideoFileClip, err = _moviepy_or_503()
    if err: return err

    try:
        t = float(request.data.get('time_seconds') or 1.0)
    except (TypeError, ValueError):
        return Response({'error': 'time_seconds must be numeric'}, status=400)

    src_path = _local_path(asset)
    if not src_path:
        return Response({'error': 'Source file unavailable'}, status=400)

    try:
        with VideoFileClip(src_path) as clip:
            t = max(0.0, min(t, max(0.0, clip.duration - 0.05)))
            frame = clip.get_frame(t)  # numpy (H, W, 3) RGB
            img = Image.fromarray(frame)
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=85)
            new_asset = _save_derived(
                client=client, source=asset, user=request.user,
                bytes_=buf.getvalue(),
                suffix=f'_thumb_t{int(t)}',
                mime='image/jpeg',
                duration=0,
            )
            new_asset.width, new_asset.height = img.size
            new_asset.save(update_fields=['width', 'height'])
            return Response(MediaAssetSerializer(new_asset).data, status=201)
    except Exception:
        logger.warning('extract_thumbnail failed')
        return Response({'error': 'Thumbnail failed'}, status=500)


# ══════════════════════════════════════════════════════════════════════
# 5. Captions (stubbed)
# ══════════════════════════════════════════════════════════════════════
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_captions(request):
    """
    Auto-generate + burn captions. Requires Whisper or equivalent — not
    wired in this build. Returns 501 with config hint.
    """
    client, err = _resolved_client(request)
    if err: return err
    return Response({'error': 'captions_not_configured'}, status=501)


# ══════════════════════════════════════════════════════════════════════
# 6. YouTube upload
# ══════════════════════════════════════════════════════════════════════
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def youtube_upload(request):
    """
    Direct YouTube upload of a stored asset via the existing YouTubePublisher.
    Body: {asset_id, title?, description?, tags?, privacy?, scheduled_publish_time?,
           made_for_kids?}
    """
    client, err = _resolved_client(request)
    if err: return err
    asset, err = _resolved_asset(request, request.data.get('asset_id'), client)
    if err: return err

    if not (asset.mime_type or '').startswith('video/'):
        return Response({'error': 'Asset is not a video'}, status=400)

    from social_stats.authorization import evaluate
    from social_stats.models import SocialAccount
    try:
        account = SocialAccount.objects.get(pk=int(request.data.get('social_account')),
                                            client=client, platform='youtube', is_active=True)
    except (SocialAccount.DoesNotExist, TypeError, ValueError):
        return Response({'error': 'Select a connected YouTube account'}, status=400)
    decision = evaluate(request.user, client, 'publish_posts', account=account)
    if not decision.allowed:
        return Response({'error': 'Permission denied'}, status=403)
    if decision.requires_approval:
        return Response({'error': 'Use Composer for approval', 'code': 'composer_required'}, status=409)
    cred = PlatformCredential.objects.filter(
        client=client, social_account=account, platform='youtube', is_active=True,
    ).first()
    if not cred:
        return Response({'error': 'No active YouTube credential — connect first'}, status=400)

    # Build a public URL the publisher can stream-download from. Falls back to
    # local MEDIA_URL when S3 isn't configured (works in dev where Django serves media).
    video_url = media_service.presigned_url(asset)
    if not video_url:
        return Response({'error': 'Cannot resolve a public URL for this asset — S3 or MEDIA serving required'},
                        status=400)

    from social_stats.publishers import get_publisher, PublishError, PublishResult, TokenExpiredError, RateLimitError
    publisher = get_publisher('youtube')

    kwargs = {}
    for field in ('title', 'description', 'tags', 'privacy',
                  'scheduled_publish_time', 'made_for_kids', 'category_id'):
        if field in request.data:
            kwargs[field] = request.data[field]

    description = (kwargs.get('description') or '')
    title = kwargs.pop('title', None) or asset.alt_text or asset.file.name.split('/')[-1]

    try:
        result = publisher.publish_video(cred, description, video_url, title=title, **kwargs)
    except TokenExpiredError:
        cred.mark_auth_failure('token_expired')
        return Response({'error': 'Account needs reconnection', 'code': 'token_expired'}, status=400)
    except RateLimitError:
        return Response({'error': 'Try again later', 'code': 'rate_limited'}, status=429)
    except PublishError:
        return Response({'error': 'Publication failed', 'code': 'publish_error'}, status=400)
    except Exception:
        logger.warning('youtube_upload failed')
        return Response({'error': 'Publication outcome unknown'}, status=502)

    if not isinstance(result, PublishResult) or result.success is not True or not result.platform_post_id:
        return Response({'error': 'Publication outcome unknown'}, status=502)

    return Response({
        'success':           True,
        'platform_post_id':  result.platform_post_id,
        'platform_url':      result.platform_url,
        'asset_id':          asset.id,
    })


# ══════════════════════════════════════════════════════════════════════
# Internals
# ══════════════════════════════════════════════════════════════════════
def _local_path(asset: MediaAsset) -> Optional[str]:
    """Return a local filesystem path for the asset, downloading from S3 if needed."""
    try:
        # Default storage exposes .path on disk-backed FieldFiles
        return asset.file.path
    except (NotImplementedError, ValueError):
        # S3-backed: stream-download to a tempfile so moviepy can read it
        try:
            url = media_service.presigned_url(asset)
            if not url:
                return None
            with requests.get(url, stream=True, timeout=(10, 120)) as src:
                if src.status_code != 200:
                    return None
                tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
                for chunk in src.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        tmp.write(chunk)
                tmp.flush(); tmp.close()
                return tmp.name
        except Exception:
            logger.warning('_local_path: media download failed')
            return None


def _save_derived(*, client, source: MediaAsset, user, bytes_: bytes,
                  suffix: str, mime: str, duration: float) -> MediaAsset:
    """Persist a new MediaAsset derived from `source` with the given bytes."""
    base, ext = os.path.splitext(os.path.basename(source.file.name))
    ext = '.mp4' if mime.startswith('video/') else ('.jpg' if mime.startswith('image/') else ext or '.bin')
    new_name = f'{base}{suffix}{ext}'
    asset = MediaAsset(
        client=client, uploaded_by=user, social_account=source.social_account,
        mime_type=mime,
        file_size=len(bytes_),
        duration_seconds=float(duration or 0),
        folder=source.folder,
        alt_text=f'Derived from {source.file.name}',
        tags=list(source.tags or []) + ['derived'],
    )
    asset.file.save(new_name, ContentFile(bytes_), save=False)
    asset.save()
    return asset


def _safe_unlink(path: str):
    try: os.remove(path)
    except OSError: pass
