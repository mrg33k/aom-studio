# Truth Contracts - Mission Build Plan

**Started:** 2026-07-14
**Mission path:** `corner:truth-contracts`

## Rounds

### R1 - Inventory truth contracts

- Map tenant resolution across CV6 and service-role APIs.
- Map file identity across Files, Review, upload rows, storage keys, and previews.
- Map count/list and status derivation for Review, Files, Command, Campaign, and Support.
- Rank fixes by user risk, tenant isolation, and shared blast radius.
- 2026-07-14 delegated product audit slice:
  - User goal: open `/dashboard`, land in CV6, orient from Home, open current work, and move across Files, Email, Tracker, Command, and Scribe on desktop and mobile without getting trapped.
  - Screen/tool inventory: Home = orient/open rooms; Search = jump to rooms/missions; Files = browse/review files; Email = inbox/campaign work; Tracker = inspect bugs/work items; Command = monitor active work; Scribe = capture meeting notes; Settings/Profile = account/config.
  - Ranked findings:
    1. P0 high frequency/high severity: direct `/dashboard` resolved to stale `dashboard.html`, which mounted the old dashboard entry and left users at "Loading your workspace..." instead of CV6.
    2. P0 high frequency/high severity: safe local/no-Supabase CV6 Home could stay on "Gathering your rooms..." forever because `useHome()` required a world id even when no Supabase client exists.
    3. P1 medium frequency/high severity: configured unauthenticated auth gate could rely on a session listener/read that never settles, causing the same permanent loading state instead of Login/CV6.
    4. P2 local/dev friction: Vite-only API requests return function source text, so Files/Review surfaces show offline states and console JSON parse errors locally; product shell remains navigable.
    5. P2 consistency: some mobile sibling tool headers expose visual search/menu icons without the same accessible labels as Home.
  - Fixed this round: made `dashboard.html` mount the main router, added deterministic auth-gate session resolution with a watchdog, and allowed no-Supabase Home to settle from the data context instead of permanent loading.
  - Verification: `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed desktop/mobile CV6 journey; `npm run build` passed.

**Status:** shipped and verified for the delegated CV6 product-audit round.

### R2 - Canonical tenant context

Build the shared authenticated tenant contract and compatibility adapters without renaming existing worlds or data.

**Status:** queued.

### R3 - Canonical file identity

Unify file identity and health across Files and Review.

**Status:** queued.

### R4 - Backend-owned truth

Make counts, lists, and statuses use the same backend snapshots and eligibility rules.

**Status:** queued.

### R5 - Shared CV6 primitives and state semantics

Consolidate message, attachment, preview, and status behavior across every live CV6 surface.

**Status:** queued.

### R6 - Product goal audit

Audit each CV6 screen and tool as a real person completing real work. For every surface:

- State the user's practical goal in one sentence.
- Run primary workflows end to end on desktop and mobile.
- Record broken actions, misleading states, latency, layout shifts, dead controls, clutter, extra clicks, unclear language, stale data, and inconsistent behavior.
- Rank failures by frequency, severity, and user impact.
- Fix one coherent high-impact workflow per round, simplifying rather than adding UI.
- Verify the complete workflow and sibling CV6 surfaces.

Do not postpone obvious user-facing breaks behind architecture work when they can be fixed safely.

- 2026-07-14 delegated mobile-sibling-controls slice:
  - User goal: from mobile CV6 Home, open Search, use the drawer to visit each sibling tool, and always have an obvious accessible way back to the drawer/search without guessing.
  - Audit: reran the focused desktop/mobile CV6 journey and inspected the sibling mobile tool headers. Home and Email exposed labeled Search/Menu controls, but Chat, Files/Organize, Tracker, Command, Settings, Scribe, and Review templates depended on bare `div[data-action]` icon controls with no button role, keyboard activation, or consistent accessible labels.
  - Ranked finding: P1 high-frequency/mobile-wide inconsistency. The main way back to navigation/search looked obvious visually, but was unreliable for keyboard/screen-reader users and forced tests/users to know implementation selectors instead of product controls.
  - Fixed this round: centralized CV6 template action-control normalization in `cv6kit/templateEngine.js` so non-native `data-action` controls receive button semantics, focusability, common labels for Search/Menu/Back/Profile/etc., and Enter/Space activation without touching each screen template.
  - Verification: `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed desktop/mobile CV6 journey using role-based Search/Menu interactions; `npm run build` passed.
  - Remaining notes: local Vite-only API calls can still surface offline/JSON parse states in data-heavy panels, but the CV6 shell and sibling navigation remain usable. No deploy, push, schema/data migration, secret rotation, external message, or stored world/login/data change.

**Status:** shipped and verified for the delegated mobile-sibling-controls audit.
