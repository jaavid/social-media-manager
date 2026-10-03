"""Validated product DTOs mapped to Bot API 10.3 (blocks only, no raw HTML)."""

from copy import deepcopy
import re
import time
from urllib.parse import urlparse

from .base import PublishError


def invalid(message):
    raise PublishError(message, code="media_invalid")


def fields(value, allowed, required=()):
    if (
        not isinstance(value, dict)
        or set(value) - set(allowed)
        or set(required) - set(value)
    ):
        invalid("Invalid or missing Telegram content fields")


def media_reference(value, *, assets=False):
    if not isinstance(value, str) or not value:
        invalid("Media reference is required")
    if assets and re.fullmatch(r"asset:[1-9][0-9]*", value):
        return value
    if re.fullmatch(r"[A-Za-z0-9_-]{16,512}", value):
        return value  # Telegram file_id; never dereferenced by this server.
    from social_stats.security.ssrf import is_safe_url

    if not is_safe_url(value, allowed_schemes=("https",)):
        invalid("Use a public HTTPS media URL or a Telegram file ID")
    return value


def safe_link(value):
    if (
        not isinstance(value, str)
        or urlparse(value).scheme != "https"
        or not urlparse(value).hostname
    ):
        invalid("Button links must use HTTPS")
    return value


def rich_text(value, depth=0):
    if depth > 8:
        invalid("Rich text nesting is too deep")
    if isinstance(value, str):
        if len(value) > 4096:
            invalid("Rich text exceeds 4096 characters")
        return value
    if isinstance(value, list) and len(value) <= 100:
        return [rich_text(x, depth + 1) for x in value]
    fields(value, ("type", "text", "url"), ("type", "text"))
    if value["type"] not in (
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "spoiler",
        "code",
        "url",
    ):
        invalid("Unsupported rich text entity")
    out = {"type": value["type"], "text": rich_text(value["text"], depth + 1)}
    if value["type"] == "url":
        out["url"] = safe_link(value.get("url"))
    elif "url" in value:
        invalid("Only URL entities accept a URL")
    return out


def buttons(value, *, rich=False):
    if not isinstance(value, list) or not 1 <= len(value) <= 8:
        invalid("A button row needs 1–8 buttons")
    out = []
    for button in value:
        fields(button, ("text", "url", "action"), ("text",))
        text = button["text"]
        if not isinstance(text, str) or not 1 <= len(text) <= 64:
            invalid("Button text needs 1–64 characters")
        if ("url" in button) == ("action" in button):
            invalid("Choose a button URL or acknowledgement action")
        if "action" in button and button["action"] != "acknowledge":
            invalid("Only acknowledgement callbacks are supported")
        out.append(
            {
                "text": text,
                **(
                    {"url": safe_link(button["url"])}
                    if "url" in button
                    else {"action": "acknowledge"}
                ),
            }
        )
    return out


def album(items, content="", *, assets=False):
    if not isinstance(items, list) or not 2 <= len(items) <= 10:
        invalid("Telegram albums need 2–10 media items")
    out = []
    for index, item in enumerate(items):
        fields(item, ("type", "media", "caption"), ("type", "media"))
        if item["type"] not in ("photo", "video"):
            invalid("Telegram albums support photos and videos")
        caption = item.get("caption", content if index == 0 else "")
        if not isinstance(caption, str) or len(caption) > 1024:
            invalid("Album captions must be at most 1024 characters")
        out.append(
            {
                "type": item["type"],
                "media": media_reference(item["media"], assets=assets),
                **({"caption": caption} if caption else {}),
            }
        )
    return out


def rich_message(value, *, assets=False):
    fields(value, ("blocks", "is_rtl"), ("blocks",))
    if "is_rtl" in value and type(value["is_rtl"]) is not bool:
        invalid("is_rtl must be boolean")
    budget = [0]

    def blocks(rows, depth=0):
        if depth > 6 or not isinstance(rows, list) or not rows or len(rows) > 100:
            invalid("Rich message needs 1–100 blocks with bounded nesting")
        out = []
        for block in rows:
            budget[0] += 1
            if budget[0] > 200:
                invalid("Rich message exceeds 200 blocks")
            kind = block.get("type") if isinstance(block, dict) else None
            schemas = {
                "heading": ("text", "size"),
                "paragraph": ("text",),
                "pullquote": ("text", "credit"),
                "expandable_blockquote": ("text", "credit"),
                "divider": (),
                "blockquote": ("blocks", "credit"),
                "details": ("summary", "blocks", "is_open"),
                "slideshow": ("blocks", "caption"),
                "collage": ("blocks", "caption"),
                "photo": ("photo", "caption"),
                "video": ("video", "caption"),
                "document": ("document", "caption"),
                "buttons": ("buttons", "align"),
                "list": ("items",),
                "table": (
                    "cells",
                    "is_bordered",
                    "is_striped",
                    "is_compact",
                    "caption",
                ),
            }
            if kind not in schemas:
                invalid("Unsupported rich block type")
            fields(block, ("type", *schemas[kind]))
            row = deepcopy(block)
            for key in ("text", "summary", "credit"):
                if key in row:
                    row[key] = rich_text(row[key])
            if (
                kind in ("heading", "paragraph", "pullquote", "expandable_blockquote")
                and "text" not in row
            ):
                invalid("Text block requires text")
            if kind == "heading" and (
                type(row.get("size")) is not int or not 1 <= row["size"] <= 6
            ):
                invalid("Heading size must be 1–6")
            if kind in ("blockquote", "details", "slideshow", "collage"):
                row["blocks"] = blocks(row.get("blocks"), depth + 1)
                if kind == "details" and "summary" not in row:
                    invalid("Details requires summary")
                if kind in ("slideshow", "collage") and (
                    not 2 <= len(row["blocks"]) <= 10
                    or any(x["type"] not in ("photo", "video") for x in row["blocks"])
                ):
                    invalid("Slideshow/collage needs 2–10 photo/video blocks")
            if kind in ("photo", "video", "document"):
                fields(row.get(kind), ("type", "media"), ("type", "media"))
                if row[kind]["type"] != kind:
                    invalid("Rich media type does not match its block")
                row[kind]["media"] = media_reference(row[kind]["media"], assets=assets)
            if "caption" in row:
                if kind == "table":
                    row["caption"] = rich_text(row["caption"])
                else:
                    fields(row["caption"], ("text", "credit"), ("text",))
                    row["caption"] = {
                        k: rich_text(v) for k, v in row["caption"].items()
                    }
            if kind == "buttons":
                row["buttons"] = buttons(row.get("buttons"), rich=True)
                if row.get("align", "center") not in ("left", "center", "right"):
                    invalid("Invalid button alignment")
            if kind == "list":
                items = row.get("items")
                if not isinstance(items, list) or not 1 <= len(items) <= 100:
                    invalid("List requires 1–100 items")
                for item in items:
                    fields(
                        item,
                        ("blocks", "value", "type", "has_checkbox", "is_checked"),
                        ("blocks",),
                    )
                    item["blocks"] = blocks(item["blocks"], depth + 1)
                    if "type" in item and item["type"] not in ("a", "A", "i", "I", "1"):
                        invalid("Invalid list label type")
            if kind == "table":
                cells = row.get("cells")
                if not isinstance(cells, list) or not 1 <= len(cells) <= 30:
                    invalid("Table requires 1–30 rows")
                for cells_row in cells:
                    if not isinstance(cells_row, list) or not 1 <= len(cells_row) <= 12:
                        invalid("Table requires 1–12 columns")
                    for cell in cells_row:
                        fields(cell, ("text", "is_header", "align", "valign"))
                        if "text" in cell:
                            cell["text"] = rich_text(cell["text"])
                        cell.setdefault("align", "left")
                        cell.setdefault("valign", "top")
                        if cell["align"] not in ("left", "center", "right") or cell[
                            "valign"
                        ] not in ("top", "middle", "bottom"):
                            invalid("Invalid table alignment")
            for key in ("is_open", "is_bordered", "is_striped", "is_compact"):
                if key in row and type(row[key]) is not bool:
                    invalid(f"{key} must be boolean")
            out.append(row)
        return out

    return {"blocks": blocks(value["blocks"]), "is_rtl": value.get("is_rtl", False)}


def fallback(value):
    """Deterministic readable text + ordered media links; never silently invoked."""
    value = rich_message(value)
    lines = []

    def text(v):
        if isinstance(v, str):
            return v
        if isinstance(v, list):
            return "".join(text(x) for x in v)
        return text(v.get("text", ""))

    def walk(rows):
        for row in rows:
            for key in ("text", "summary", "credit"):
                if key in row:
                    lines.append(text(row[key]))
            if row["type"] in ("photo", "video", "document"):
                lines.append(row[row["type"]]["media"])
            if "blocks" in row:
                walk(row["blocks"])
            for item in row.get("items", []):
                walk(item["blocks"])
            for cells in row.get("cells", []):
                lines.append(" | ".join(text(c.get("text", "")) for c in cells))
            for b in row.get("buttons", []):
                lines.append(b["text"] + (": " + b["url"] if "url" in b else ""))

    walk(value["blocks"])
    return "\n\n".join(lines)


def poll(value, destination="channel"):
    allowed = (
        "question",
        "options",
        "type",
        "is_anonymous",
        "allows_multiple_answers",
        "correct_option_ids",
        "explanation",
        "open_period",
        "close_date",
        "is_closed",
        "allows_revoting",
        "shuffle_options",
        "hide_results_until_closes",
        "members_only",
        "country_codes",
    )
    fields(value, allowed, ("question", "options"))
    if destination == "channel_direct_messages":
        invalid("Polls cannot target channel direct messages")
    out = deepcopy(value)
    if not isinstance(out["question"], str) or not 1 <= len(out["question"]) <= 300:
        invalid("Poll question needs 1–300 characters")
    options = out["options"]
    if not isinstance(options, list) or not 1 <= len(options) <= 12:
        invalid("Poll needs 1–12 answer options")
    normalized = []
    for option in options:
        option = {"text": option} if isinstance(option, str) else option
        fields(option, ("text",), ("text",))
        if not isinstance(option["text"], str) or not 1 <= len(option["text"]) <= 100:
            invalid("Poll answer needs 1–100 characters")
        normalized.append(option)
    out["options"] = normalized
    kind = out.get("type", "regular")
    if kind not in ("quiz", "regular"):
        invalid("Poll type must be regular or quiz")
    ids = out.get("correct_option_ids")
    if kind == "quiz":
        if (
            not isinstance(ids, list)
            or not ids
            or any(type(x) is not int or not 0 <= x < len(options) for x in ids)
            or ids != sorted(set(ids))
        ):
            invalid("Quiz requires sorted distinct correct option IDs")
    elif ids is not None or "explanation" in out:
        invalid("Correct answers and explanation require quiz mode")
    if "explanation" in out and (
        not isinstance(out["explanation"], str)
        or len(out["explanation"]) > 200
        or out["explanation"].count("\n") > 2
    ):
        invalid("Quiz explanation exceeds Telegram limits")
    if "open_period" in out and "close_date" in out:
        invalid("Choose open period or close date")
    for key in ("open_period", "close_date"):
        if key in out:
            n = out[key]
            offset = (
                n - int(time.time()) if key == "close_date" and type(n) is int else n
            )
            if type(n) is not int or not 5 <= offset <= 2628000:
                invalid("Poll closing time must be 5–2628000 seconds in the future")
    for key in (
        "is_anonymous",
        "allows_multiple_answers",
        "is_closed",
        "allows_revoting",
        "shuffle_options",
        "hide_results_until_closes",
        "members_only",
    ):
        if key in out and type(out[key]) is not bool:
            invalid(f"{key} must be boolean")
    if destination != "channel" and ("members_only" in out or "country_codes" in out):
        invalid("Poll targeting fields require a channel")
    if "country_codes" in out and (
        not isinstance(out["country_codes"], list)
        or len(out["country_codes"]) > 12
        or any(
            not isinstance(x, str) or not re.fullmatch("[A-Z]{2}", x)
            for x in out["country_codes"]
        )
    ):
        invalid("Invalid poll country codes")
    return out


def validate_post(media_type, content, options, *, assets=False):
    from social_stats.platforms.bot_features import BotDestinationContext

    if not isinstance(options, dict):
        invalid("Telegram options must be an object")
    context = BotDestinationContext.from_dict(options.get("destination_context"))
    context.validated_options("telegram")
    if media_type == "album" or "media_items" in options:
        album(options.get("media_items"), content, assets=assets)
    if media_type == "rich":
        rich_message(options.get("rich_message"), assets=assets)
    if media_type == "poll":
        poll(options.get("poll"), context.destination_type)
    if "buttons" in options:
        buttons(options["buttons"])
