from django.urls import path

from social_stats.views.egress import egress_connectivity

urlpatterns = [
    path('connectivity/', egress_connectivity, name='egress_connectivity'),
]
