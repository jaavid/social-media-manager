"""Readable JSON editing while retaining Django's JSON validation and storage."""
import json

from unfold.widgets import UnfoldAdminTextareaWidget


class AdminJSONWidget(UnfoldAdminTextareaWidget):
    def format_value(self, value):
        if isinstance(value, str):
            try:
                value = json.loads(value)
                return json.dumps(value, ensure_ascii=False, indent=2)
            except (TypeError, ValueError):
                # Keep invalid submitted input visible next to validation errors.
                return value
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False, indent=2)
        return super().format_value(value)
