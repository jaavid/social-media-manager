# Project

Social Media Manager is a self-hosted, multi-workspace social publishing and operations platform built with Next.js and Django.

## Boundaries
- Backend API owns authorization. Workspace selection is a scope, never a permission.
- A missing workspace ID is **not** permission to access all workspaces.
- Uncertain mutations are not automatically replayed.
- Persian RTL and English LTR are first-class.

## References
[Architecture](docs/ARCHITECTURE.md) · [Access](docs/ACCESS.md) · [Documentation](docs/README.md) · [Design](DESIGN.md).