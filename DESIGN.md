# Design system and UI composition

## Core rules
- Use shared UI primitives, semantic message keys and CSS logical properties.
- Test keyboard access, focus, RTL/LTR, light/dark, responsive widths 360/768/1440 and reduced motion.
- AppShell owns global action placement. The desktop TopBar owns the single interactive workspace selector; MobileDrawer owns its mobile counterpart.
- FeatureSidebar displays workspace identity, not another selector.
- Page-level account/destination controls are distinct from the global workspace selector.
- Admin "All workspaces" navigates to a global index, not an unrestricted null scope.

## Verification
Ensure exactly one focusable global switcher per active viewport. Preserve workspace/route security checks and include before/after visual evidence.

See [shell contract](docs/SHELL_COMPOSITION_CONTRACT.md), [frontend contracts](docs/FRONTEND_CONTRACTS.md), and [workspace scope](docs/NX_02_WORKSPACE_SCOPE.md).