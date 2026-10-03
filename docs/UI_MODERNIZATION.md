# UI modernization (#58–#63)

The frontend now runs exclusively on Next.js App Router. The shared interfaces
introduced in #58–#63 remain in use; see [the completed cutover](NEXT_MIGRATION.md).

## Ownership

- `src/app/providers`: router, theme, authentication, query cache, realtime,
  global notifications and legal consent composition.
- `src/app/routes`: reviewed URL inventory and client session guards.
- `src/app/layout`: loading states and authenticated layout composition.
- `src/features`: management, workspace list and settings implementations.
  Former page/module paths re-export these implementations for compatibility.
- `src/components/ui`: source-owned Tailwind components. Dialog, Sheet, menus,
  tooltip and tabs use Radix for keyboard/focus behavior; notifications use Sonner.
- `src/lib/runtime`: public configuration and browser persistence adapters.
  `src/lib/auth/session` retains the existing token rotation and cross-tab locks.

Feature views import `AppLink`, `AppNavLink`, `useAppNavigate`, `useAppParams`,
`useAppLocation` and `useAppSearchParams` from `app/navigation`. Authentication
is exposed through `app/session`; endpoint contracts remain in `services/api`.
Native page and layout declarations belong to `frontend/next/app`; generated
feature wrappers retain these component APIs.

## Shared component contracts

```jsx
<Input label="Email" type="email" value={email} onChange={handleEmail} error={error} />
<Textarea label="Notes" value={notes} onChange={handleNotes} minRows={3} />
<Select label="Workspace" options={options} value={workspace} onChange={setWorkspace} searchable />
<Dialog open={open} onClose={close} title="Edit workspace">...</Dialog>
<Sheet open={open} onClose={close} side="start" title="Navigation">...</Sheet>
<Tabs tabs={tabs} value={tab} onChange={setTab} />
<DataTable columns={columns} rows={rows} rowKey="id" />
```

`Modal`/`Drawer` remain aliases for existing callers. `NativeSelect` preserves
native option children and DOM change events in existing forms. `SegmentedTabs`
adapts its old `items`/`active` API to the shared Tabs. Fields own label IDs and
error/help descriptions. Consumer `aria-describedby` values are preserved.
Dynamic dimensions (skeletons, sheet size and table columns) remain explicit
style values; static shell/settings styling uses utilities and shared tokens.

New shared components and host adapters use strict TypeScript. JavaScript
interoperability remains enabled, with `checkJs: false` to avoid a forced rewrite.
The legacy auth provider is narrowed through one typed session adapter. No broad
`any` escape is used in new TypeScript modules. Run `npm run typecheck`; CI runs
it alongside the build and Jest tests. TypeScript 4.9 remains compatible with
Jest 29 with Babel; Next builds TS/TSX and legacy JS JSX.

## RTL, responsive and accessibility audit

| Pattern | Changes and verification |
| --- | --- |
| Fields | Associated labels, merged help/error descriptions, named password toggle; keyboard/error tests |
| Select | Skips disabled options; active descendant; search, Escape, Tab and return focus tests |
| Dialog and Sheet | Unique Radix title/description IDs, trapped focus, background inertness, Escape and focus restoration; tests and mobile browser check |
| Tabs | RTL-aware arrows, disabled-tab skipping, automatic focus/selection; test; horizontally scrollable on small screens |
| Menus | Workspace/account menus consume shared keyboard menu primitives; keyboard activation test |
| Table | Native table semantics, keyboard sort buttons and `aria-sort`, responsive scroll container; sorting and row-shrink pagination test |
| Layout | Logical margins, shared header without negative viewport expansion, stacked mobile settings/management; browser measurements at 1440 and 390 pixels |
| Theme and motion | Canonical legacy aliases, readable secondary text, dark theme tokens and reduced-motion rules; theme persistence test |

Browser screenshots use local mock API responses and a fixture superadmin.
No production accounts or provider credentials are included. Live publishing,
OAuth and service connectivity are outside this visual audit. Large feature modules remain candidates for further splitting. React Router
and its compatibility warnings were removed by the Next cutover.

## Django Admin

Workspace and provider-credential forms group related fields and collapse
secondary details. All original fields remain available exactly once. Text and
JSON widgets have readable dimensions; JSON keeps LTR monospace presentation.
Django theme variables, authorization and database schema are retained. Only
local admin form presentation changes; the product workflow remains in React.

## Screenshots

| View | Before | After |
| --- | --- | --- |
| Settings, Persian desktop (1440 × 1000) | [Before](screenshots/ui-modernization/before-settings-rtl-desktop.png) | [After](screenshots/ui-modernization/after-settings-rtl-desktop.png) |
| Settings, Persian mobile (390 × 844) | [Before](screenshots/ui-modernization/before-settings-rtl-mobile.png) | [After](screenshots/ui-modernization/after-settings-rtl-mobile.png) |
| Mobile navigation | — | [After](screenshots/ui-modernization/after-navigation-rtl-mobile.png) |

## Validation

- Node 20.19: strict type check, production build, 87 Jest tests (20 suites),
  and the i18n gate pass.
- Python 3.12: 455 Django tests pass; no migration drift; admin field/layout tests
  verify that grouped forms retain every field once.
- Browser production preview: Persian desktop/mobile, mobile drawer Escape and
  return focus. Document widths were 1435/1440 and 385/390 respectively (vertical
  scrollbar space), with no horizontal viewport overflow.
- Ruff, Bandit and Git whitespace checks cover the touched code.
