from django.urls import path

from .egress_views import egress_connectivity

urlpatterns = [
    path('connectivity/', egress_connectivity, name='egress_connectivity'),
]
