# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django.db.models import Sum
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView


from social_stats.models import Client, PlatformCredential, DailyMetric, SyncLog
from social_stats.serializers.core import (
    SyncLogSerializer,
)

from .helpers import parse_dates


class OverviewView(APIView):
    def get(self, request):
        from django.db.models import Q
        try:
            profile = request.user.profile
            role    = profile.role
        except Exception:
            return Response({'error': 'Forbidden'}, status=403)

        if role not in ('superadmin', 'staff'):
            return Response({'error': 'Forbidden'}, status=403)

        # Scope clients to what this agency/staff user owns
        if role == 'staff':
            client_qs = profile.assigned_clients.filter(is_active=True)
        else:
            # superadmin — only their own clients (admin-created or agency-invited)
            client_qs = Client.objects.filter(is_active=True).filter(
                Q(userprofile__isnull=True) |
                Q(userprofile__is_self_registered=False) |
                Q(userprofile__agency=request.user)
            ).distinct()

        client_ids = list(client_qs.values_list('id', flat=True))

        since, until = parse_dates(request)
        qs = DailyMetric.objects.filter(date__range=(since, until), client_id__in=client_ids)

        by_platform = list(qs.values('platform').annotate(
            impressions=Sum('impressions'),
            reach=Sum('reach'),
            clicks=Sum('clicks'),
            video_views=Sum('video_views'),
            followers=Sum('followers'),
        ))

        total_clients = len(client_ids)
        recent_syncs  = SyncLog.objects.filter(client_id__in=client_ids).order_by('-started_at')[:10]

        return Response({
            'period':        {'since': since.isoformat(), 'until': until.isoformat()},
            'total_clients': total_clients,
            'by_platform':   by_platform,
            'recent_syncs':  SyncLogSerializer(recent_syncs, many=True).data,
        })


@api_view(['POST'])
def sync_all_clients(request):
    """Queue sync for this agency's active clients. Superadmin / staff only."""
    from django.db.models import Q
    try:
        profile = request.user.profile
        role    = profile.role
    except Exception:
        return Response({'error': 'Forbidden'}, status=403)
    if role not in ('superadmin', 'staff'):
        return Response({'error': 'Forbidden'}, status=403)

    # Scope to this agency's clients only
    if role == 'staff':
        client_ids = list(profile.assigned_clients.filter(is_active=True).values_list('id', flat=True))
    else:
        client_ids = list(
            Client.objects.filter(is_active=True).filter(
                Q(userprofile__isnull=True) |
                Q(userprofile__is_self_registered=False) |
                Q(userprofile__agency=request.user)
            ).distinct().values_list('id', flat=True)
        )

    from social_stats.tasks import sync_facebook, sync_instagram, sync_youtube, sync_linkedin, sync_gmb
    task_map = {
        'facebook': sync_facebook,
        'instagram': sync_instagram,
        'youtube': sync_youtube,
        'linkedin': sync_linkedin,
        'google_my_business': sync_gmb,
    }

    active_creds = PlatformCredential.objects.filter(
        is_active=True, client_id__in=client_ids
    ).exclude(access_token='').values('id', 'client_id', 'platform', 'social_account_id')

    queued = {}
    for row in active_creds:
        cid = row['client_id']
        p = row['platform']
        if p in task_map:
            task_map[p].delay(cid, credential_id=row['id'])
            queued.setdefault(cid, []).append({
                'platform': p,
                'social_account_id': row['social_account_id'],
            })

    return Response({'queued_clients': len(queued), 'detail': queued})

