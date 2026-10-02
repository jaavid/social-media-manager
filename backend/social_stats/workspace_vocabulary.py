"""Additive Workspace vocabulary over the unchanged Client persistence model.

Only transport fields are aliased. Opaque JSON such as metadata, automation
payloads and brand assets is never rewritten. Existing authorization continues
to receive the same legacy fields, including on the new routes.
"""

from django.http import JsonResponse
from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser, DataAndFiles

# Canonical API names -> unchanged implementation names.
INPUT_ALIASES = {
    "workspace": "client",
    "workspace_id": "client_id",
    "workspace_ids": "client_ids",
    "workspace_email": "client_email",
    "assigned_workspaces": "assigned_clients",
}
OUTPUT_ALIASES = {
    **{old: new for new, old in INPUT_ALIASES.items()},
    "client_name": "workspace_name",
    "clients": "workspaces",
    "total_clients": "total_workspaces",
    "queued_clients": "queued_workspaces",
    "client_count": "workspace_count",
}
# Descend into API envelopes / resource collections, never arbitrary JSON fields.
RESOURCE_KEYS = {
    "results",
    "items",
    "data",
    "user",
    "client",
    "workspace",
    "clients",
    "workspaces",
    "assigned_clients",
    "assigned_workspaces",
    "summary",
    "totals",
    "by_platform",
    "unassigned_history",
}


def _comparable(value):
    if isinstance(value, (list, tuple)):
        return [_comparable(item) for item in value]
    return str(value) if value is not None else None


def normalize_workspace_input(data):
    """Translate transport aliases; reject conflicts instead of choosing a tenant."""
    if not hasattr(data, "items"):
        return data
    result = data.copy()
    is_querydict = hasattr(data, "getlist")
    for canonical, legacy in INPUT_ALIASES.items():
        if canonical not in data:
            continue
        value = data.getlist(canonical) if is_querydict else data[canonical]
        if legacy in data:
            old = data.getlist(legacy) if is_querydict else data[legacy]
            if _comparable(value) != _comparable(old):
                raise ParseError(f"Conflicting {canonical} and {legacy} values")
        if is_querydict:
            result.setlist(legacy, value)
        else:
            result[legacy] = value
        del result[canonical]
    for key in ("add", "assignments"):
        if key in result and isinstance(result[key], list):
            result[key] = [normalize_workspace_input(item) for item in result[key]]
    return result


def add_workspace_output(data):
    """Expose canonical fields alongside legacy fields without altering stored JSON."""
    if isinstance(data, (list, tuple)):
        return [add_workspace_output(item) for item in data]
    if not isinstance(data, dict):
        return data
    result = {
        key: add_workspace_output(value) if key in RESOURCE_KEYS else value
        for key, value in data.items()
    }
    for legacy, canonical in OUTPUT_ALIASES.items():
        if legacy in result and canonical not in result:
            result[canonical] = result[legacy]
    return result


class WorkspaceJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        return normalize_workspace_input(
            super().parse(stream, media_type, parser_context)
        )


class WorkspaceFormParser(FormParser):
    def parse(self, stream, media_type=None, parser_context=None):
        return normalize_workspace_input(
            super().parse(stream, media_type, parser_context)
        )


class WorkspaceMultiPartParser(MultiPartParser):
    def parse(self, stream, media_type=None, parser_context=None):
        parsed = super().parse(stream, media_type, parser_context)
        return DataAndFiles(normalize_workspace_input(parsed.data), parsed.files)


class WorkspaceVocabularyMiddleware:
    """Adapt API query fields and DRF response data before rendering."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not request.path.startswith("/api/"):
            return None
        try:
            request.GET = normalize_workspace_input(request.GET)
        except ParseError as exc:
            return JsonResponse({"detail": str(exc.detail)}, status=400)
        return None

    def process_template_response(self, request, response):
        if request.path.startswith("/api/") and hasattr(response, "data"):
            response.data = add_workspace_output(response.data)
        return response
