"""Compatibility import for historical migrations and integrations.

New code should import from social_stats.models.marketplace.
"""
from .models.marketplace import *  # noqa: F403
