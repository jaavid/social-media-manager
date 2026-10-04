# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


from social_stats.models import SocialAccount, GMBBusinessInfo, GMBReview
from social_stats.serializers.core import (
    GMBBusinessInfoSerializer, GMBReviewSerializer,
)

from .helpers import check_client_access


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gmb_info(request, client_id):
    if not check_client_access(request, client_id):
        return Response({'error': 'Forbidden'}, status=403)
    if (SocialAccount.objects.filter(
        client_id=client_id, platform='google_my_business',
    ).count() > 1 and request.query_params.get('attribution') != 'unassigned'):
        return Response({
            'detail': 'Legacy business data has no verified location identity',
            'code': 'account_identity_required',
        }, status=409)
    try:
        info = GMBBusinessInfo.objects.get(client_id=client_id)
        return Response(GMBBusinessInfoSerializer(info).data)
    except GMBBusinessInfo.DoesNotExist:
        return Response({}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gmb_reviews(request, client_id):
    if not check_client_access(request, client_id):
        return Response({'error': 'Forbidden'}, status=403)
    if (SocialAccount.objects.filter(
        client_id=client_id, platform='google_my_business',
    ).count() > 1 and request.query_params.get('attribution') != 'unassigned'):
        return Response({
            'detail': 'Legacy business data has no verified location identity',
            'code': 'account_identity_required',
        }, status=409)
    qs = GMBReview.objects.filter(client_id=client_id).order_by('-published_at')
    # Optional pagination via ?page=1&page_size=20
    try:
        page_size = int(request.query_params.get('page_size', 20))
        page      = int(request.query_params.get('page', 1))
    except ValueError:
        page_size, page = 20, 1
    total  = qs.count()
    offset = (page - 1) * page_size
    items  = qs[offset:offset + page_size]
    return Response({
        'count':   total,
        'page':    page,
        'results': GMBReviewSerializer(items, many=True).data,
    })

