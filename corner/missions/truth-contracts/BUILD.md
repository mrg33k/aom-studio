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

- 2026-07-14 delegated local-api-empty-states slice:
  - User goal: from desktop and mobile CV6, open Files/Review-style data panels and understand whether the panel is offline/empty without console crashes, misleading raw-source parse failures, or broken sibling navigation.
  - Audit: a desktop probe opened Files, Tracker, Command, and Scribe. Files rendered "We couldn't load your files / Your connection dropped" in safe local/no-Supabase mode even though no user data was lost; the Vite dev server was serving API source/non-JSON, not a real dropped connection. Mobile Files first lands on the project picker, then Personal shows the empty-state copy after one extra tap.
  - Ranked finding: P1 high-frequency local workflow misdiagnosis. Files is one of the core sibling tools, and the error state implied a network/data-loss incident instead of the honest local empty/offline state.
  - Fixed this round: `useOrganize` now skips tenant-gated Files API calls when Supabase is absent, clears file/project/upload state to empty arrays, and marks the panel loaded so desktop and mobile show the normal empty Files workflow. Configured sessions still call real APIs and still surface real mirror-load failures.
  - Verification: `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed desktop/mobile CV6 journey with explicit Files assertions; `npm run build` passed.
  - Remaining notes: Tracker/Command still show loading/empty local states where their live sources are unavailable; no stored login/world/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and verified for the delegated local-api-empty-states audit.

- 2026-07-14 delegated tracker-command-empty-states slice:
  - User goal: from desktop and mobile CV6, open Tracker and Command in safe local/no-Supabase mode and see stable honest empty states instead of indefinite "Loading the tracker..." or "Gathering your rooms..." states.
  - Audit: Tracker initialized loading and waited on tenant-gated bug endpoints; Command depended on `useWorldId()` resolving from Supabase and therefore stayed in loading when no Supabase client existed. Both looked broken even though the honest local state is empty.
  - Ranked finding: P1 high-frequency local workflow stall. Tracker and Command are core sibling tools, and indefinite loading prevents a real user from distinguishing empty local data from a broken app.
  - Fixed this round: `useCommandTracker.js` now gives no-Supabase local mode a render-only `aom` world id, skips tenant-gated Command/Tracker polls and writes when Supabase is absent, initializes Tracker boards to empty, and disables create/update actions in no-Supabase mode. The audit spec asserts Tracker and Command empty states on desktop and mobile.
  - Verification: `npm run build` passed; external Playwright verification passed with `CV6_AUDIT_BASE=http://127.0.0.1:5199 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` (2 passed).
  - Remaining notes: hidden template loading text remains in the DOM by design, so tests assert visible empty states instead of absence of hidden template strings. No stored login/world/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and verified for the delegated tracker-command-empty-states audit.

- 2026-07-14 delegated review-json-normalization slice:
  - User goal: from desktop and mobile CV6, open Files/Review-backed panels and sibling tools without raw local API source responses producing scary JSON parse errors or breaking navigation.
  - Audit: desktop and mobile probes opened Files, Tracker, Command, Scribe, and Home. The visible workflow stayed usable, but the Review-backed data hook emitted repeated `Unexpected token '/' ... is not valid JSON` errors for projects, missions-tree, and review-queue when Vite served API source/non-JSON bodies.
  - Ranked finding: P1 high-frequency developer/local workflow noise. Files depends on the Review hook for waiting-review state; repeated parse errors make the shell look broken and hide real regressions in console noise even when the correct local state is empty.
  - Fixed this round: `useReview.js` now reads Review GET responses through a guarded JSON parser, treats non-JSON read responses as unavailable/empty local data, and keeps mutation responses strict. The audit spec no longer ignores the old `Unexpected token '/'` console failure.
  - Verification: desktop/mobile Playwright probes completed the sibling journey without Review parse errors; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed; `npm run build` passed.
  - Remaining notes: local Vite still reports generic missing-resource 404 console entries, which the existing practical audit filter treats as non-product noise. No stored login/world/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and verified for the delegated review-json-normalization audit.

- 2026-07-14 delegated email-local-workflow slice:
  - User goal: from desktop and mobile CV6, open Email, understand inbox/campaign state, and return to sibling tools without misleading local errors, dead controls, or confusing loading/empty states.
  - Audit: desktop Email showed an honest caught-up inbox, but mobile Email showed "We couldn't reach your inbox / Your connection dropped" for the same safe no-Supabase local state. After the local-state fix, mobile exposed a duplicate caught-up block and still titled the inbox "Support" inside the Email tool.
  - Ranked finding: P1 high-frequency mobile Email inconsistency. A core sibling tool implied a connection/data problem on mobile while desktop was calm and empty; the duplicate empty copy and stale Support title made the tool feel unfinished.
  - Fixed this round: `useSupportInbox` now treats absent Supabase as explicit read-only local empty data, the mobile Email inbox drops its embedded duplicate empty branch before shared states are injected, and the mobile title now reads Email.
  - Verification: desktop/mobile Playwright probes completed Email with one caught-up state and no dropped-connection banner; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed with Email assertions; `npm run build` passed.
  - Remaining notes: local Vite still reports generic missing-resource 404 console entries that the practical audit filters as non-product noise. No stored login/world/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and verified for the delegated email-local-workflow audit.
