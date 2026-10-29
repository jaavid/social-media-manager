# Agent instructions

Read [PROJECT.md](PROJECT.md), [DESIGN.md](DESIGN.md) and [docs/README.md](docs/README.md) before changing behavior.

## Rules
- Inspect the full shell composition before adding navigation or global controls.
- One visible interactive workspace selector per viewport, owned by AppShell composition. Avoid competing local state; preserve useWorkspaceScope and server permissions.
- Do not conflate workspace, organization, agency, account or destination.
- Reuse shared primitives and i18n; cover RTL/LTR, keyboard, responsive modes and errors.
- Use existing Next App Router conventions; consult frontend/AGENTS.md and installed Next docs.
- Never commit secrets or erase licensing/attribution.
- Keep tests green. UI PRs include visual evidence and tests for duplicate global controls.
- Update documentation index and check links when changing docs.

Refer to [CI](docs/CI.md), [access](docs/ACCESS.md), [frontend contracts](docs/FRONTEND_CONTRACTS.md).