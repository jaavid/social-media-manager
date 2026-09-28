"""Outbound API routing helpers.

Provides a single place for choosing direct vs gateway API egress.
"""

from .router import outbound_request

__all__ = ["outbound_request"]
