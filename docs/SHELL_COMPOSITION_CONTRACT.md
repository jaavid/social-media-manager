# Shell composition contract

## Ownership
The global workspace switching **action** has one active interactive instance per viewport. `AppShell` composes placement:
- Desktop: `TopBar` renders the global switcher.
- Mobile: `MobileDrawer` renders the global switcher while open.
- `FeatureSidebar` can show read-only workspace identity; it must not render another interactive switcher.
- Domain pages may render separate account/destination selectors, clearly labeled and with distinct semantics.

## State and authorization
Use `useWorkspaceScope` to resolve effective scope; do not create a parallel source of truth. Denied or unknown selections fail closed. A null workspace never implies all-workspace access. For admins, navigating to the global workspace index is a distinct action. Preserve route-owned and query-owned selections, back navigation, and workspace-specific query cache isolation.

## Required checks
1. One visible/focusable global switcher on desktop and inside the open mobile drawer.
2. No duplicate global selector in the sidebar, including admin.
3. Both admin and ordinary member behavior, including missing/invalid/denied scope.
4. Persian/English, RTL/LTR, light/dark, 360/768/1440 widths, keyboard, focus and screenshots.
5. No regression to scoped badges, realtime filtering, stale privacy or route navigation.

Refer to [Design](../DESIGN.md), [Frontend contracts](FRONTEND_CONTRACTS.md), [Scope resolver](NX_02_WORKSPACE_SCOPE.md).
