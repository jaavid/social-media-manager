# Bounded calendar localization evidence

Public synthetic calendar post, no real provider/account data. All API and socket
requests are mocked; automatic traces, screenshots and videos remain disabled.
The four explicit images contain only fixture content and public metrics.

Before: production frontend UI source identical to refreshed main6ac39d0, served
from the CI scheduling worktree (its source UI diff is empty). After: production
build of this PR, same fixture and view. Both use reduced motion. The Persian
360/dark pair shows localized compact digits AND suffixes; English1440/light
preserves locale formatting. These are focused evidence captures, not regenerated
brand/typography snapshots and not live publishing/credential proof.

| Fixture | Before | After |
| --- | --- | --- |
| fa/RTL/dark/360 | [before](calendar-before-fa-dark-360.png) | [after](calendar-after-fa-dark-360.png) |
| en/LTR/light/1440 | [before](calendar-before-en-light-1440.png) | [after](calendar-after-en-light-1440.png) |
