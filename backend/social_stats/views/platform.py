from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from social_stats.platform_registry import public_registry


@api_view(['GET'])
@permission_classes([AllowAny])
def platform_metadata(request):
    """Expose non-secret, read-only platform metadata for capability-driven clients."""
    return Response(public_registry())
