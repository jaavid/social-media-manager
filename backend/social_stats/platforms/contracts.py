"""Typed inputs to the account-scoped provider execution boundary."""

from dataclasses import dataclass, field
from typing import Any, Mapping


@dataclass(frozen=True)
class DestinationContext:
    account_id: int
    workspace_id: int
    kind: str = 'profile'
    remote_id: str = ''
    topic_id: str = ''


@dataclass(frozen=True)
class PublishRequest:
    media_type: str = 'text'
    content: str = ''
    media_urls: tuple[str, ...] = ()
    idempotency_key: str = ''
    extensions: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class InboundEvent:
    event_id: str
    payload: Mapping[str, Any] = field(default_factory=dict, repr=False)
    authenticity_verified: bool = False
    cursor: str = ''


@dataclass(frozen=True)
class ReplyRequest:
    thread_id: str
    content: str
    kind: str = 'inbox'


@dataclass(frozen=True)
class HealthResult:
    ready: bool
    state: str
    code: str = ''
