"""Compatibility import for historical migrations and integrations.

New code should import from social_stats.models.rbac.
"""
from .models.rbac import *  # noqa: F403
