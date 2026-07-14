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

- 2026-07-14 delegated campaign-local-workflow slice:
  - User goal: from desktop and mobile CV6, open Email, switch to Campaign, understand whether campaigns are empty/unavailable, and return to sibling tools without a stuck loading state or misleading error.
  - Audit: desktop and mobile Campaign both showed "Campaigns didn't load. Retrying automatically." in safe no-Supabase mode. The tab stayed navigable, but the message implied an active failure/retry loop instead of the honest local empty state.
  - Ranked finding: P1 high-frequency Email sub-workflow confusion. Campaign sits behind a primary Email tab; a local user checking it sees a broken/retrying state and no clear answer about whether any campaign exists.
  - Fixed this round: `useCampaignList` now treats absent Supabase as explicit local empty data, and Campaign shows a calm local empty message with no dead "Create your first campaign" action when writes cannot work locally.
  - Verification: desktop/mobile Playwright probes completed the Campaign tab with "No campaigns yet" and no retry error; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed with Campaign assertions; `npm run build` passed.
  - Remaining notes: local Vite still reports generic missing-resource 404 console entries that the practical audit filters as non-product noise. No stored login/world/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and verified for the delegated campaign-local-workflow audit.

- 2026-07-14 delegated scribe-capture-workflow slice:
  - User goal: from desktop and mobile CV6, open Live Scribe, understand the empty note state, try Start capture, and return to sibling tools without a misleading mic/error state or dead action.
  - Screen/tool inventory for this slice: Scribe captures meeting audio into transcript/action/decision summaries; Home or drawer gets the user there; Files, Email, Tracker, and Command are sibling surfaces that must remain reachable after the Scribe visit.
  - Audit: opened Scribe from desktop Home and mobile drawer, pressed empty "Save & copy summary", pressed Start capture with no microphone, then verified Start with a fake microphone. Empty save produced visible status copy, no microphone produced the correct mic-specific recovery copy, and sibling navigation remained available.
  - Ranked findings:
    1. P1 high-frequency/high-impact trust issue: idle Scribe looked like it was already recording. The desktop header and mobile status bar showed the red record dot/wave/speaker affordances before the user pressed Start, which is misleading in a mic-capture workflow.
    2. P2 lower severity: "Save & copy summary" is still reachable before any transcript; it now reports "Nothing captured yet" visibly, so it is not dead, but it remains an extra pre-capture action.
    3. P2 local/test noise: no-mic Start logs the expected `NotFoundError` plus generic local 404 resource entries; the visible UI gives the right mic-specific recovery state.
  - Fixed this round: bound Scribe's record dot, waveform, mobile status bar, and speaker indicator to the existing `session.capturing` truth so idle is muted/static and only an actual capture shows active red recording affordances.
  - Verification: fake-microphone Playwright probe confirmed idle `rec/wave is-off` with no animation and Start flips to `Stop & save` plus active recording classes; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed desktop/mobile sibling workflow with Scribe assertions; `npm run build` passed.
  - Remaining notes: no stored login/world/member/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and verified for the delegated scribe-capture-workflow audit.

- 2026-07-14 delegated search-finds-workflow slice:
  - User goal: from desktop and mobile CV6, open Search, find visible work by name, open it or recover from no results, and return to sibling tools without misleading empty states.
  - Screen/tool inventory for this slice: Home advertises available rooms/projects; Search finds rooms/missions from the same shared data; Chat list is the sibling room picker that also consumes the chat-list shape.
  - Audit: opened Home on desktop/mobile, opened Search, typed `space`, checked no-result recovery, escaped back to Home, then continued the sibling Files/Email/Tracker/Command/Scribe journey. Search honestly had no local project data, but Home leaked baked template project counts (`PROJECTS · 84`, `Show 78 more`) and mobile leaked `Show 78 more rooms`, making Search appear broken.
  - Ranked findings:
    1. P1 high-frequency trust issue: Home showed stale design project counts/overflow controls in safe local empty mode, while Search correctly returned no matches. The product contradicted itself before the user did any work.
    2. P2 consistency: `useChatList` still treated absent `worldId` as loading even when Supabase was absent; Home had already adopted the no-Supabase local render contract.
    3. P2 local noise: generic missing-resource 404 console entries remain filtered as non-product noise.
  - Fixed this round: preserved project array binding props after Home maps project rows so `projects.count`, `projects.moreCount`, and `projects.moreState` bind as `0/none` instead of falling back to template samples; aligned `useChatList` loading with Home's no-Supabase local contract.
  - Verification: Playwright desktop/mobile probe showed `PROJECTS · 0`, no stale `Show 78 more`, and Search `space` no-result recovery; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed with Home/Search plus sibling surface assertions; `npm run build` passed.
  - Remaining notes: no stored login/world/member/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and verified for the delegated search-finds-workflow audit.

- 2026-07-14 delegated new-composer-local-workflow slice:
  - User goal: from desktop and mobile CV6 Home, press New, understand whether a mission/project can be started, recover from missing fields, and avoid dead local write controls.
  - Screen/tool inventory for this slice: Home is the entry point; New Composer starts a mission or project; Search, Files, Email/Campaign, Tracker, Command, and Scribe are sibling CV6 surfaces that must remain stable after the visit.
  - Audit: opened New from desktop and mobile Home in safe local/no-Supabase mode, tried blank mission submit, mission with goal but no project, blank project submit, and filled project submit. Validation copy for missing fields was clear, but the filled project path attempted a local write and ended with "Could not create the project. Please try again."
  - Ranked findings:
    1. P1 high-frequency/high-impact local workflow promise: `Start mission` and `Create project` looked available when local writes could not succeed, then blamed a retryable failure instead of the absent connected workspace.
    2. P2 validation quality: blank mission/project validation was recoverable and specific, so the main break was the impossible write path after the user had done the work.
    3. P2 local noise: generic missing-resource 404 console entries remain filtered as non-product noise.
  - Fixed this round: `NewComposer` now detects absent Supabase, binds the footer hint and primary CTA to "Creation needs a connected workspace. Local mode is read-only." / "Read-only locally", styles the CTA as inactive, and returns that truth-state before calling create APIs. Configured sessions keep the normal Start/Create labels and backend flow.
  - Verification: desktop/mobile Playwright probe confirmed mission and project tabs show the read-only local state and no failing create attempt; `CV6_AUDIT_BASE=http://127.0.0.1:5174 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed; `npm run build` passed.
  - Remaining notes: no stored login/world/member/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and verified for the delegated new-composer-local-workflow audit.

- 2026-07-14 delegated chat-room-core-workflow slice:
  - User goal: from desktop and mobile CV6, open the actual chat room, read the current room context, type/send or recover from local read-only state, use obvious room controls, and return to sibling CV6 surfaces without stale data, dead actions, or misleading states.
  - Screen/tool inventory for this slice: desktop Home quick-room is the highest-frequency chat entry; mobile agent room is the dedicated chat surface; shared `useRoomThread` is the send/source-of-truth path; Files/Email/Tracker/Command/Scribe remain sibling surfaces.
  - Audit: opened Agents, opened the Web room on desktop and mobile, typed a local test message, and watched the send outcome. Mobile accepted the text, cleared it, rendered a `You` message, and showed `Getting started / Working` even though safe local/no-Supabase mode could not deliver a real message. Desktop quick-chat also exposed a writable composer and cleared text in old quick-send paths.
  - Ranked findings:
    1. P1 highest-frequency/highest-impact trust break: chat is the product loop, and local read-only mode could fake a successful send plus agent-working state.
    2. P1 desktop parity: the Home third-column quick chat is the practical desktop room, and its empty copy still said to send below even when the composer could not write.
    3. P2 mobile controls: room Back/Menu/Files controls needed explicit button labels/keyboard activation to keep the actual chat path obvious.
    4. P2 production verification: unauthenticated `https://aheadofmarket.com/dashboard` redirects to `/login`; browser-control setup hit `Cannot redefine property: process`, so live authenticated chat verification remains pending user/browser access.
  - Fixed this round: `useRoomThread.send` now returns `false` before optimistic UI when Supabase is absent and removes optimistic messages on failed POSTs; `Cv6FullComposer`, its fallback composer, mobile `ChatLifecycle`, and desktop `Cv6QuickThread` show/read as connected-workspace read-only locally instead of sending; Home quick-send now only clears after a successful send; mobile chat Back/Menu/Files controls have explicit button semantics.
  - Verification: `CV6_AUDIT_BASE=http://127.0.0.1:5174 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed desktop/mobile with explicit chat-room assertions plus sibling CV6 surfaces; `npm run build` passed. A read-only production reachability check landed on `https://www.aheadofmarket.com/login` and did not mutate data.
  - Remaining notes: live production chat workflow still needs an authenticated `aheadofmarket.com/dashboard` browser session; no stored login/world/member/data mutation, deploy, push, schema/data migration, secret rotation, or external message.

**Status:** shipped and locally verified for the delegated chat-room-core-workflow audit; production-auth verification blocked.
