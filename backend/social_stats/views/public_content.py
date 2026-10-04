# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView


from social_stats.models import SiteContent, LookupCollection
from social_stats.serializers.core import (
    SiteContentSerializer, LookupCollectionSerializer,
)



class PublicSiteContentView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, key):
        item = SiteContent.objects.filter(key=key, is_public=True).first()
        if not item:
            return Response({'error': 'Content not found'}, status=404)
        return Response(SiteContentSerializer(item).data)


class PublicLookupView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        collections = LookupCollection.objects.filter(is_public=True).prefetch_related('items')
        data = {}
        for collection in collections:
            serialized = LookupCollectionSerializer(collection).data
            data[collection.key] = serialized['items']
        return Response(data)

