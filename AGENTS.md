# Repository Guidelines

## Project Structure & Module Organization

- `backend/dashboard/` contains Django settings, routing, and Celery configuration. `backend/social_stats/` implements APIs, models, publishing adapters, AI helpers, and security features; migrations and backend tests live inside this app.
- `frontend/src/app/` owns Next App Router routes and layouts; `src/features/` contains product views and `src/core/` contains providers, session, navigation compatibility, and route inventory. Shared components, hooks, services, stores, and translations live under `src/`. Reuse `components/ui/` primitives and `styles/` design tokens. Static assets live in `frontend/public/`; Jest tests sit beside their source files.
- `docs/` holds product and deployment documentation. `docker/`, `infra/`, and `scripts/` contain container configuration, infrastructure examples, and operational utilities.

## Build, Test, and Development Commands

Use Python 3.12 and Node 20, matching CI. `archive/legacy-frontend/` is a historical snapshot excluded from active builds and tests; do not import it. Run commands from the indicated directory.

- Backend: `pip install -r requirements-dev.txt` installs runtime and analysis dependencies; `python manage.py migrate` applies migrations; `python manage.py runserver` starts the development API.
- Backend: `python manage.py test social_stats.tests` runs Django tests; `python manage.py makemigrations social_stats --check --dry-run` checks migration drift.
- Frontend: `npm ci`; `npm run dev` runs Next on port 3000; `npm run build` builds the committed App Router routes with Next; `npm start` runs the production Next server. See `docs/NEXT_MIGRATION.md`.
- Frontend: `CI=true npm test` runs standalone Jest; `npm run i18n:check` checks user-facing strings.
- Repository root: `pre-commit install` enables hooks; `pre-commit run --all-files` runs hygiene, Ruff, Bandit, and secret checks.

## Coding Style & Naming Conventions

Use four-space Python indentation and two-space JavaScript/JSX indentation. Follow surrounding conventions: Python `snake_case`, React components `PascalCase`, and hooks named `useSomething`. Prefer functional components, TanStack Query for server data, and Zustand for local state. Preserve existing copyright notices. Use “workspace” in new product/API vocabulary and follow `docs/ACCESS.md` for retained Client compatibility.

## Testing Guidelines

Name backend tests `test_*.py` under `backend/social_stats/tests/`; frontend tests use `*.test.js` or `*.test.jsx` with Jest and React Testing Library. Cover changed behavior, authorization, workspace isolation, and integration failures. No numeric coverage threshold is configured. Keep tests and the frontend build passing before opening a PR.

## Commit & Pull Request Guidelines

History uses scoped messages such as `feat(workspaces): ...` and `fix(accounts): ...`. Keep each PR focused. Follow `.github/PULL_REQUEST_TEMPLATE.md`: explain the change and motivation, link related issues, report validation, update affected docs, and attach before/after screenshots for UI changes.

## Security & Configuration Tips

Use the supplied `.env.example` files; never commit secrets, tokens, or production data. Seed demo accounts only locally. Report vulnerabilities through `SECURITY.md`.
