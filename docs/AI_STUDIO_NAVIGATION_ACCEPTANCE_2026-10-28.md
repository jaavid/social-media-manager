# AI Studio task navigation acceptance — 2026-10-28

Source: `frontend/src/features/ai/AIStudio.jsx`. The directory now consumes `visibleSections('analytics', '/dashboard', can)` and `navigationHref(..., workspaceId)` from the existing navigation contracts. There is **no independent access matrix** or extra provider catalogue.

| Surface | Route / behavior | Security and content condition | Evidence |
| --- | --- | --- | --- |
| Composer | `/dashboard/analytics/composer?workspace=ID` | Requires effective `composer.view`; suggestions are drafts, never publication | `AIStudio.test.jsx`, `navigationItems.test.js` |
| Inbox | `/dashboard/analytics/inbox?workspace=ID` | Requires effective `inbox.view`; sent replies require downstream authorization | `AIStudio.test.jsx` |
| Brand voice | `/dashboard/analytics/brand-voice?workspace=ID` | Requires registry grant `ai.brand_voice`; do not claim model training | `AIStudio.test.jsx` |
| Caption, post ideas, hashtags, insights | Registry-defined routes | No new permission invented here; see existing registry; downstream API authorization stays authoritative | `AIStudio.test.jsx` + existing route tests |
| No workspace | No active tool links | Never infer a workspace from a previous user session | `AIStudio.test.jsx` |
| Workspace changed | Old `workspace` query is absent | User-controlled scope is not a grant; API validates it | `AIStudio.test.jsx` |
| Direct links | AppLink/Next navigation, alias and Back/Forward | Existing `core/navigation.test.jsx`, `e2e/task-navigation.spec.js`; no new URL scheme | Existing browser coverage |
| FA RTL / EN LTR | Existing LanguageProvider | Title, summary and label use current locale; no forced new public language preference | `AIStudio.test.jsx`; visual review pending |
| Light/dark/reduced motion | Tokens and `motion-reduce` rule | No fixed purple/orange/green accent in cards; focus-visible keyboard indication | CSS source; browser audit pending |

Removed non-registry Chat History and AI Usage links from this hub **only**; their native routes were not deleted. The descriptive page used to imply guaranteed reach, model training, exact AI reply counts and chat write capabilities without runtime readiness. Those claims were removed.

## Issue boundaries / open acceptance

- **#224 AI:** Hub access and truthful descriptions addressed. Streaming failures, quota/cost, suggestion transfer without publishing still require feature-specific tests.
- **#216 navigation:** This hub now uses the same access and routes as sidebar/palette; role/task observation with test users and full end-user shell remain independent.
- **#108 URL:** Scoped links and workspace changes covered here; marketplace, inbox, reports, hash/history cases need their broader route acceptance matrix.
- **#218 copy:** First-wave hub revised; onboarding/marketing/emails and human Persian review remain.
- **#219 UI:** Hub token/focus/reduced-motion cleanup; full 320–1440 px, zoom, contrast and drawer audit remain.

This file is a focused evidence matrix, **not** evidence that all five original issues are completed. Do not auto-close a parent issue based only on this slice. Runtime CI on the PR head must pass before merge.
