"""Compatibility import for historical migrations and integrations.

New code should import from social_stats.models.bot.
"""
from .models.bot import *  # noqa: F403
