# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
AI Caption Writer views.
POST /api/ai/caption/ — generate captions via configured AI provider
GET  /api/ai/caption/ — get history for a client
"""
import json
import logging

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


from social_stats.models import Client, CaptionRequest
from social_stats.ai_context import build_client_ai_context
from social_stats.ai.client import AIClient, AIError
from social_stats.ai.rate_limiter import RateLimited
from social_stats.ai.gemini import GeminiGatewayError

logger = logging.getLogger(__name__)

from social_stats.platforms.catalogue import writing_guidance

PLATFORM_RULES = writing_guidance('caption')

SYSTEM_PROMPT = (
    "You are an expert social media copywriter for a marketing agency. "
    "You write compelling captions that drive engagement and match each platform's "
    "unique style and audience expectations. "
    "Match the language of the user's topic; for Persian input write natural Persian. "
    "Always return valid JSON only — no other text."
)

DAILY_RATE_LIMIT = 10   # requests per client per day


def _client_access_denied(request, client_id):
    """Shared tenant guard — mirrors views.check_client_access."""
    try:
        if request.user.profile.can_access_client(client_id):
            return None
    except Exception:
        pass
    return Response({'error': 'Access denied'}, status=403)


def _check_rate_limit(client: Client) -> bool:
    """Return True if client is within daily limit."""
    today = timezone.now().date()
    count = CaptionRequest.objects.filter(client=client, created_at__date=today).count()
    return count < DAILY_RATE_LIMIT


def _build_user_prompt(topic, tone, post_type, platforms, keywords, cta, client_context):
    platform_rules = '\n'.join(PLATFORM_RULES[p] for p in platforms if p in PLATFORM_RULES)
    platform_list = ', '.join(platforms)

    return f"""Write social media captions for the following:

{client_context}

Topic: {topic}
Tone: {tone}
Post type: {post_type}
Keywords to include: {keywords or 'none specified'}
Call to action: {cta or 'none specified'}

Write a caption for each platform requested: {platform_list}

Platform rules:
{platform_rules}

Return ONLY this exact JSON format:
{{
  "facebook": "caption text here",
  "instagram": "caption text here",
  "linkedin": "caption text here",
  "youtube": "caption text here",
  "google_my_business": "caption text here",
  "hashtags": {{
    "instagram": ["#tag1", "#tag2"],
    "facebook": ["#tag1", "#tag2"]
  }},
  "best_posting_time": {{
    "facebook": "Wednesday 1-3pm",
    "instagram": "Tuesday 11am or Friday 7pm"
  }}
}}
Only include platforms that were requested."""


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def caption_view(request):
    if request.method == 'GET':
        return _get_history(request)
    return _generate_caption(request)


def _get_history(request):
    client_id = request.query_params.get('client_id')
    if not client_id:
        # Try to infer from user profile
        try:
            profile = request.user.profile
            if profile.role == 'client' and profile.client_id:
                client_id = profile.client_id
        except Exception:
            pass
    if not client_id:
        return Response({'error': 'client_id required'}, status=400)
    denied = _client_access_denied(request, client_id)
    if denied:
        return denied

    qs = CaptionRequest.objects.filter(client_id=client_id).order_by('-created_at')[:20]
    data = []
    for r in qs:
        data.append({
            'id':                 r.id,
            'topic':              r.topic,
            'tone':               r.tone,
            'post_type':          r.post_type,
            'platforms':          r.platforms,
            'keywords':           r.keywords,
            'call_to_action':     r.call_to_action,
            'generated_captions': r.generated_captions,
            'created_at':         r.created_at.isoformat(),
        })
    return Response(data)


def _generate_caption(request):
    data       = request.data
    client_id  = data.get('client_id')
    topic      = (data.get('topic') or '').strip()
    tone       = data.get('tone', 'professional')
    post_type  = data.get('post_type', 'promotion')
    platforms  = data.get('platforms', [])
    keywords   = (data.get('keywords') or '').strip()
    cta        = (data.get('call_to_action') or '').strip()

    # Validation
    if not client_id:
        try:
            profile = request.user.profile
            if profile.role == 'client' and profile.client_id:
                client_id = profile.client_id
        except Exception:
            pass
    if not client_id:
        return Response({'error': 'client_id is required'}, status=400)
    if not topic:
        return Response({'error': 'topic is required'}, status=400)
    if not platforms:
        return Response({'error': 'at least one platform is required'}, status=400)
    denied = _client_access_denied(request, client_id)
    if denied:
        return denied

    try:
        client = Client.objects.get(id=client_id)
    except Client.DoesNotExist:
        return Response({'error': 'Client not found'}, status=404)

    client_context = build_client_ai_context(client)

    # Rate limit check
    if not _check_rate_limit(client):
        return Response({'error': f'Daily limit of {DAILY_RATE_LIMIT} caption requests reached. Try again tomorrow.'}, status=429)

    # Use the centralized provider selection: Gemini via Cloudflare or Claude.
    # No second SDK, provider key check, or direct Google request is allowed.
    # Do not share the legacy cross-workspace response cache.
    try:
        prompt = _build_user_prompt(
            topic, tone, post_type, platforms, keywords, cta, client_context,
        )
        raw = AIClient(client=client, user=request.user, feature='caption').complete(
            prompt, system=SYSTEM_PROMPT, max_tokens=2048, fast=True,
            use_cache=False,
        ).strip()
        if raw.startswith('```'):
            raw = raw.split('\n', 1)[1] if '\n' in raw else raw[3:]
            if raw.endswith('```'):
                raw = raw[:-3].strip()
        captions = json.loads(raw)
        if not isinstance(captions, dict) or any(
            not isinstance(captions.get(platform), str) for platform in platforms
        ):
            raise ValueError('Invalid caption payload structure')
    except RateLimited:
        return Response({'error': 'ai_limit_reached'}, status=429)
    except (GeminiGatewayError, AIError):
        logger.warning('Caption AI provider unavailable', exc_info=True)
        return Response({'error': 'ai_unavailable'}, status=503)
    except (json.JSONDecodeError, ValueError, IndexError):
        logger.warning('Caption model returned invalid structured output')
        return Response({'error': 'ai_invalid_output'}, status=502)
    except Exception:
        logger.exception('Caption generation failed')
        return Response({'error': 'ai_generation_failed'}, status=502)

    # Save to database
    CaptionRequest.objects.create(
        client=client,
        topic=topic,
        tone=tone,
        post_type=post_type,
        platforms=platforms,
        keywords=keywords,
        call_to_action=cta,
        generated_captions=captions,
        created_by=request.user,
    )

    return Response({'captions': captions, 'cached': False})
