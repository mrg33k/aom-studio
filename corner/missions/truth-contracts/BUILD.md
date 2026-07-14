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

- 2026-07-14 implementation:
  - Added shared API tenant context in `api/_lib/tenantContext.js`: `{ tenantId, canonicalSlug, aliases, userId }`, alias normalization, compatibility field extraction for `tenant/world/world_id/client/client_id`, and legacy compat output fields.
  - Added shared browser tenant context in `src/dashboard/lib/tenantContext.jsx`, mounted at the CV6 auth boundary in `src/main.jsx`, so CV6 reads the authenticated tenant once instead of recomputing or falling back to a home-world literal.
  - Wired highest-traffic CV6 data callers through the contract: `DataProvider`, `CommandProvider`, Home/Chat list, Files/Organize desktop/mobile, Review badge/queue, Settings, Onboarding, Live Scribe, Support inbox, and Support add-to-Tracker.
  - Wired the support/email APIs touched in the email-thread slice through the server contract: `activity`, `thread`, `suggest`, `reply`, `send-staged`, `inbox`, `wishes`, and `wish`. Support's single-tenant fallback now comes from `SUPPORT_TENANT_ID` or `CORNER_HOME_TENANT`; no world/login/data rows were renamed.
  - Added `npm run test:tenant-context`, covering alias/compat helpers plus a grep-style hardcoded-tenant guard over `src/` and `api/` with an explicit legacy baseline allowlist.
  - Compatibility preserved: old callers can still send `world`, `world_id`, `client`, or `client_id`; the resolver canonicalizes once and endpoints use `tenantId`.
  - Migration note / remaining hardcoded-tenant baseline:
    `api/_lib/mailNoise.js`, `api/_lib/uploadsIdentity.js`, `api/dashboard/agent-customize.js`, `api/dashboard/create-project-from-chat.js`, `api/dashboard/project-file.js`, `api/dashboard/project-files.js`, `api/dashboard/project-summary.js`, `api/dashboard/reset-agent.js`, `api/dashboard/review-queue.js`, `api/dashboard/supabase-messages.js`, `api/dashboard/supabase-status.js`, `api/dashboard/mission-folders.js`, `api/dashboard/poke-agent.js`, `api/dashboard/voice-session.js`, `api/dashboard/admin-tickets.js`, `api/integrations/list.js`, `api/relay-sms.js`, `api/deal-bank/add.js`, `src/dashboard/lib/clientConfig.js`, `src/dashboard/lib/fixtureClient.js`, CV3/CV4 legacy callers, and CV6Kit live demo wrappers. These are baselined in the guard so new hardcoded tenant selectors fail while later rounds can retire the baseline deliberately.
  - Required env note: support/email runtime now needs `SUPPORT_TENANT_ID` or `CORNER_HOME_TENANT` set to the existing support tenant slug. This does not rename existing data; it only removes the literal from code.
  - Verification:
    - `npm run test:tenant-context` passed.
    - `node --check api/_lib/tenantContext.js api/support/activity.js api/support/wish.js api/support/send-staged.js api/support/reply.js api/support/suggest.js api/support/thread.js api/support/wishes.js api/support/inbox.js` passed.
    - `npm run build` passed.
    - Initial sandbox Playwright output was not treated as a valid fresh no-Supabase browser verification after Claude's external rerun showed Command did not settle.
- 2026-07-14 fix-forward:
  - Claude reran `tests/cv6-practical-audit.spec.mjs` against a fresh no-Supabase Vite server on port 5200 and both desktop/mobile tests failed waiting for Command's visible `No rooms yet` empty state.
  - Root cause: the new browser `TenantProvider` resolved absent Supabase to `tenantId=null`, undoing the earlier render-only world id behavior that let Command/Tracker/Files settle locally.
  - Fix: no-Supabase mode now resolves a render-only tenant context with `tenantId='local-render'` and `renderOnly=true` from `TenantProvider`; configured Supabase mode still resolves from authenticated user context.
  - Verification I can run in sandbox passed: `npm run test:tenant-context`, `node --check` on the tenant/support scripts, and `npm run build`. Fresh browser audit must be rerun externally with `CV6_AUDIT_BASE=http://127.0.0.1:5200 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`.

**Status:** fix-forward implemented; awaiting external fresh no-Supabase CV6 audit rerun.

### R3 - Canonical file identity

Unify file identity and health across Files and Review.

- 2026-07-14 implementation:
  - Added `api/_lib/fileRef.js`, a pure canonical FileRef contract spanning tenant, source table/row, storage key/path, URL, MIME/type, size, project/mission scope, review identity, source_path/sha256, and health status.
  - Wired `api/dashboard/review-queue.js` through FileRef for chat-boundary handoffs/uploads while preserving the existing queue response fields; each item now carries `file_ref` and `health_status` beside legacy `path`, `type`, `source_path`, and `sha256`.
  - Wired `api/dashboard/files.js?type=uploads` through the same FileRef adapter so Files upload rows and Review upload rows share attachment extraction, display name, MIME, size, project/mission scope, and review identity.
  - Wired CV6 Review and Files adapters through FileRef compatibility: `useReview` retains the ref on mapped queue/injected items; `OrganizeDesktop`/mobile waiting and decided maps now derive identities from the shared contract; `useOrganize` canonicalizes mirror/upload rows before deriving file kind, health, review IDs, badges, and counts.
  - Kept existing tables, row fields, storage keys, URLs, and old caller shapes intact. No schema/data rename and no new env requirement.
  - Added `tests/api/_lib/fileRef.test.js` covering project-file storage identity, chat attachment/review queue identity, and URL-to-corner-path identity map bridging.
  - Verification:
    - `node --check api/_lib/fileRef.js api/dashboard/review-queue.js api/dashboard/files.js src/dashboard/cv6next/data/useReview.js src/dashboard/cv6next/data/useOrganize.js src/dashboard/cv6next/OrganizeDesktop.jsx src/dashboard/cv6next/OrganizeMobile.jsx` passed.
    - `node --test tests/api/_lib/fileRef.test.js` passed.
    - `npm run test:tenant-context` passed.
    - `git diff --check` passed.
    - `npm run build` passed.

**Status:** shipped; awaiting external no-Supabase browser audit rerun.

### R4 - Backend-owned truth

Make counts, lists, and statuses use the same backend snapshots and eligibility rules.

- 2026-07-14 implementation:
  - Shipped the Review slice: added `api/_lib/reviewTruth.js` as the backend-owned domain snapshot for Review queue truth.
  - `api/dashboard/review-queue.js` now returns `items`, `total`, `hasMore`, `newest_ts`, and `counts` from `buildReviewTruthSnapshot()` after the chat-boundary query and decision query resolve. Waiting rows, reviewed/all rows, verdict stamps, and counts now share the same eligibility pass instead of duplicated endpoint math.
  - Preserved additive response shape and existing fields. No data/schema rename, no new env requirements, and tenant scoping remains through the existing R2 `verifyTenant`/TenantContext path before any queue query runs.
  - Added `tests/api/_lib/reviewTruth.test.js`, covering default waiting rows/counts, `view=all` verdict stamping from content identity, and the rule that user uploads never enter the waiting count.
  - Deferred for later R4 slices:
    - Files count and visible files still need a server-owned files snapshot/eligibility ruleset over mirror rows + upload rows + FileRef review joins.
    - Command status still needs a real-work-events status contract that excludes bookkeeping stamps.
    - Campaign setup still needs server-side resolution rather than per-screen inference.
  - Verification:
    - `node --check api/_lib/reviewTruth.js api/dashboard/review-queue.js` passed.
    - `node --test tests/api/_lib/reviewTruth.test.js tests/api/_lib/fileRef.test.js` passed.
    - `npm run test:tenant-context` passed.
    - `npm run build` passed. Prebuild printed existing local notices about missing sibling registry sources and Vite printed the existing chunk-size warning.
    - Browser/network verification not run in this sandbox.

**Status:** Review backend truth slice shipped; Files, Command, and campaign setup deferred.

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


## R6 — Email Thread Product Goal Audit

**Date:** 2026-07-14

**User goal:** The Email screen should show an accurate collapsible conversation, including agent-sent replies, suggested actions, and the work being done on each thread.

**Workflow exercised:** Trace a support/email wish from intake (`/api/support/wish`) through agent dispatch (`messages` table), reply/suggest paths (`/api/support/suggest`, `/api/support/reply`, `/api/support/send-staged`), thread rendering (`/api/support/thread`, `SupportThread`), and CV6 Email UI (`EmailShell`, `SupportDesktop`, `useSupportInbox`).

**Broken / missing, ranked by frequency, severity, impact:**

1. High frequency / high severity / high impact: Email thread rendering showed Gmail conversation truth, but not the agent-room work truth for the same support wish. The agent dispatch row is written to `messages`, and live work steps are written to `events` as `message_step`; Email did not query either source for the selected support wish.
2. Medium frequency / high severity / high impact: Agent-sent replies depend on Gmail thread fetch plus `support_wish_updates.kind=response` fallback. If a worker sends or stages through a path that only writes generic update text, the Email thread can only show a generic recorded reply or draft, not the exact body.
3. Medium frequency / medium severity / medium impact: Suggested actions existed for `wish` rows, but the UI label was just "Suggested" and raw mailbox-scan rows had no suggested-action strip, making the affordance easy to miss or absent depending on row type.

**Root cause answers:**

- Agent support work starts in `api/support/wish.js`, which writes a `messages` row with `source: support-desk` and metadata including `support_wish_id` / `support_access_code`. The listener/worker picks that up from the agent room.
- Human/manual Email replies are sent through `/api/support/reply` or `/api/support/send-staged`, which send through Gmail/internal mail and write `support_wish_updates.kind=response` plus `support_wishes.first_response_at`.
- The Email conversation view reads `/api/support/thread`, which fetches Gmail thread truth and merges `support_wish_updates.kind=response`. It did not read the agent-room `messages` row or `events.message_step` work ledger, so work-in-progress was invisible.
- Suggested actions already existed for `wish` rows via `/api/support/suggest` and `support_wishes.reply_options`, but raw mailbox-scan rows had no action strip and the wish strip was labelled only "Suggested".

**Fix slice:** Shipped. Added `/api/support/activity` to join a selected wish to its agent-room dispatch row, immediate agent messages, durable `message_step` events, and relevant support updates. Rendered a collapsible "Agent work" block in the Email pane for wish rows. Renamed the footer to "Suggested actions" and added explicit Assign/Add-to-Tracker actions for raw mailbox-scan rows.

**Pending Patrik:** Claude recommends logging the exact outgoing email body into `support_wish_updates.kind=response` on every send-success, treating it like the app's Sent copy, while Gmail remains the verification source. This should become the default unless Patrik wants Gmail-only truth.

**Verification:**

- `node --check api/support/activity.js` passes.
- `git diff --check` passes.
- `npm run build` passes after Claude installed dependencies.
- Live dev-server pass is blocked by sandbox networking: `lsof` sees a Node process listening on `127.0.0.1:5200`, but `curl` cannot connect and `nc -vz 127.0.0.1 5200` returns `Operation not permitted`. Starting a replacement Vite server in this sandbox also fails with `listen EPERM`.

**Status:** shipped; Claude (EA) ran the live verification outside the sandbox after merging the CV6 entry fix into this branch.

- 2026-07-14 deployed: branch merged to main (fast-forward through 47b707f0) and auto-deployed to production. EA verified live: /dashboard boot + settle clean, support endpoints healthy (wishes 200, inbox 405-method-guard). SUPPORT_TENANT_ID=aom added to aom-studio production env before deploy (required by R2 tenant contract). Note: /api/support/wishes still answers unauthenticated — pre-existing legacy debt, queued, not a regression.
