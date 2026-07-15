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

### R5-research - Renderer consolidation map

- 2026-07-14 research-only round:
  - Mapped the four duplicated CV6 room-chat renderers: `ChatDesktop`/`MsgExtras`, Home `Cv6QuickThread`, mobile `ChatLifecycle` `Message` + `GoalTurn`, and Catch Up `InlineBubbleThread`.
  - Included the routing contract from `useRoomThread()`, especially `injectWorkSteps()`, which converts plain agent replies into `blocks`/goal-thread turns and bypasses the normal text-message path.
  - Included Email/Support as an adjacent non-room conversation renderer (`SupportThread`) because it does not mount the four room-chat renderers and has already drifted on agent-work truth and suggested-action behavior.
  - Wrote the feature matrix, drift history, migration proposal, verification plan, and risk register to `corner/missions/truth-contracts/research/renderer-consolidation-map.md`.
  - No product code changes, renames, tests, schema/data migration, deploy, or push.

**Status:** research shipped; recommended first build slice is a shared read-only `Cv6MessageThread` adapter behind `InlineBubbleThread`, then Home quick thread.

### R5b - Home quick thread shared renderer migration

- 2026-07-14 implementation:
  - Migrated Home's `Cv6QuickThread` message body to render through shared `Cv6MessageThread` with `variant="homeQuick"`.
  - Kept the Home portal host tracking and sticky-scroll wrapper outside the renderer unchanged.
  - Kept attachments enabled on this surface (`allowAttachments`) and preserved blocks, link cards, live `WorkingTurn`, review handoff, and send/chip action plumbing through the shared renderer contract.
  - Added `?demo=home-quick-thread` as an explicit fixture URL while still exercising the real Home column and `useRoomThread` path.
  - Extended `tests/cv6-message-renderer.spec.mjs` with seeded Home quick thread coverage: open a seeded room in the Home column, assert plain text renders, assert attachment card/review affordance renders, and assert a result link card renders.
  - Did not touch `ChatDesktop`, `ChatLifecycle`, or `SupportThread`.
  - External fix-forward:
    - Claude's external run passed demo blocks, Catch Up modal, and practical audit, but the new Home test timed out waiting for `Renderer Room`.
    - Root cause: `?demo=home-quick-thread` still depended on full Home/useDataPipe room-list derivation, and stubbed `supabase-status.projects` did not reach the Home rooms column in no-Supabase mode.
    - Fix: added a direct `DemoHomeQuickThread` fixture that renders the real desktop Home template plus the real migrated `Cv6QuickThread`, with a directly-provided seeded recent row and seeded normalized messages. The test no longer relies on `supabase-status` or `supabase-messages` seeding for this route.
  - Verification:
    - `node --check tests/cv6-message-renderer.spec.mjs` passed.
    - `git diff --check` passed.
    - `npm run test:tenant-context` passed.
    - `npm run build` passed. Prebuild printed the existing local notices about missing sibling registry sources and Vite printed the existing chunk-size warning.
    - Focused browser rerun was attempted locally, but Vite cannot bind in this sandbox: `listen EPERM: operation not permitted 127.0.0.1:5200`. Rerun externally with the commands in the handoff.

**Status:** implemented and locally verified; awaiting external browser spec rerun.

### R5c - Desktop Chat shared renderer migration

- 2026-07-14 implementation:
  - Migrated desktop `ChatDesktop` message rendering to the shared `Cv6MessageThread` with `variant="desktop"`.
  - Kept day folding in `ChatDesktop`: older day cards still own their open/closed state, latest-day dividers stay outside the renderer, and each day body now delegates only the message loop to `Cv6MessageThread`.
  - Kept room selection, the control drawer, files/goals drawer, composer host, scroll anchoring, and live `WorkingTurn` outside the renderer unchanged.
  - Deleted the private desktop `groupChat`, `MsgExtras`, `BubbleGroup`, and `BubbleThread` loop that this slice replaces.
  - Preserved desktop rich-message features through the shared renderer: text bubbles, blocks, attachments with Review routing, result link cards, suggestion chips, and existing live work.
  - Adjusted shared `Cv6MessageThread` group markup to use the existing `.grp`/`.stack`/`.ava` bubble classes for both user and agent groups, and added `chipsPrimaryFirst` so desktop can keep its previous non-primary suggestion-chip emphasis.
  - Did not touch `ChatLifecycle` mobile or `SupportThread`.
- Tests:
  - Extended `tests/cv6-message-renderer.spec.mjs` with a seeded real desktop Chat route (`?view=chat`) using POST/GET intercepts on the bare `/api/dashboard/supabase-messages*` path.
  - The new desktop case asserts a folded older-day card, latest-day shared desktop thread, text bubble, attachment card plus `Review`, result link card, chips, live working row from `/message-steps`, and opened folded-day content.
- Verification:
  - `node --check tests/cv6-message-renderer.spec.mjs` passed.
  - `git diff --check` passed.
  - `npm run test:tenant-context` passed.
  - `npm run build` passed. Prebuild printed the existing missing sibling registry notices and Vite printed the existing chunk-size warning.
  - Direct `node --check` on `.jsx` files is not usable with this Node version; it rejects `.jsx` as an unknown extension. The Vite build was the JSX parse/bundle check.
  - Focused browser rerun was attempted locally, but Vite cannot bind in this sandbox: `listen EPERM: operation not permitted 127.0.0.1:5200`. Rerun externally with the commands in the handoff.

**Status:** implemented and locally verified; awaiting external browser spec and practical audit reruns.

### R4b - Command backend-owned status truth

- 2026-07-14 implementation:
  - Shipped the Command status slice: added `api/_lib/commandTruth.js` as the shared status ruleset for Command room state.
  - CV6 Command ledger now derives `working` from heartbeat-backed live sessions or fresh non-bookkeeping work events only. Goal-notetaker sweeps, goal seed lines, and other bookkeeping stamps no longer refresh `lastActivity` or keep rows falsely green.
  - Rows keep the existing additive shape and now also carry `statusSource`/`statusReason` provenance for future debugging without renaming existing fields.
  - The Command activity rail no longer polls `tasks status=running`; it reads `/api/dashboard/active-agents`, backed by `active_processes` heartbeat TTL, so stale task rows cannot advertise active work after a process disappears.
  - Added `verifyTenant` gating to `/api/dashboard/state-board?world=...` and returns additive `tenant_id`. No new env requirement and no schema/data rename.
  - Added `tests/api/_lib/commandTruth.test.js`, covering fresh real work, bookkeeping exclusion, live process truth, stale/open-question behavior, and freshest-event selection.
  - Review correction: removed the hardcoded `DEFAULT_CLIENT_ID = 'aom'` fallback from `state-board.js`. The endpoint now resolves tenant from `world`/`client`/`client_id`, then `CORNER_HOME_TENANT` or `SUPPORT_TENANT_ID`; if none exists it returns `400 { error: 'world required' }`.
  - Guard correction: `scripts/check-no-hardcoded-tenant-slugs.mjs` now catches uppercase constants containing `CLIENT`/`TENANT`/`WORLD` assigned prohibited slugs. Verified it failed on the old `api/dashboard/state-board.js:19: const DEFAULT_CLIENT_ID = 'aom';` line before the endpoint fix, then passed after the fix.
  - Verification:
    - `node --check api/_lib/commandTruth.js api/dashboard/state-board.js src/dashboard/cv6next/data/useCommandTracker.js src/dashboard/cv6kit/useRunningJobs.js` passed.
    - `node --test tests/api/_lib/commandTruth.test.js tests/api/_lib/reviewTruth.test.js tests/api/_lib/fileRef.test.js` passed.
    - `node --test tests/api/_lib/commandTruth.test.js` passed after the review correction.
    - `npm run test:tenant-context` passed, including the expanded hardcoded tenant guard.
    - `git diff --check` passed.
    - `npm run build` passed. Prebuild printed existing local notices about missing sibling registry sources and Vite printed the existing chunk-size warning.
    - Browser/network CV6 audit not run in this sandbox; rerun externally with `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`.

**Status:** Command backend-owned status truth shipped; Files counts/eligibility and campaign setup remain deferred.

### R4c - Files backend-owned eligibility truth

- 2026-07-14 implementation:
  - Shipped the Files count/list slice: added `api/_lib/filesTruth.js` as the backend-owned Files snapshot over disk mirror rows, chat upload rows, and Review waiting rows.
  - Added additive `/api/dashboard/files?type=organize&client=<tenant>` response. It verifies tenant access via the R2 `verifyTenant` path, fetches mirror/upload/Review sources server-side, decorates visible rows with R3 `FileRef`, and returns `files_truth` with visible files, uploads, review ghosts, and by-project counts from one eligibility ruleset.
  - CV6 `useOrganize` now prefers the combined backend snapshot. When present, row `needs_review` stamps and `files_truth.ghosts` drive both the needs-review badge count and the list; if the combined endpoint is unavailable, the previous mirror/uploads fallback remains in place.
  - Removed the remaining literal tenant fallback from the touched `type=mirror` and `type=uploads` Files reads; both now require the caller's tenant param and still pass through `verifyTenant`.
  - Kept response shapes additive: existing `files`, `uploads`, `review`, and old mirror/upload row fields remain available; no schema/data rename and no new env requirement.
  - Deferred for next backend-owned-truth round:
    - Campaign setup resolution server-side, so Email/Campaign screens stop independently inferring "Campaign not set up" and avoid Ben/arsenal-style false negatives.
  - Verification:
    - `node --check api/_lib/filesTruth.js api/dashboard/files.js api/dashboard/review-queue.js src/dashboard/cv6next/data/useOrganize.js` passed.
    - `node --test tests/api/_lib/filesTruth.test.js tests/api/_lib/fileRef.test.js tests/api/_lib/reviewTruth.test.js tests/api/_lib/commandTruth.test.js` passed.
    - `npm run test:tenant-context` passed, including the uppercase hardcoded tenant guard.
    - `git diff --check` passed.
    - `npm run build` passed. Prebuild printed existing local notices about missing sibling registry sources and Vite printed the existing chunk-size warning.
    - Browser/network CV6 audit not run in this sandbox; rerun externally with `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`.

**Status:** Files backend-owned eligibility/count truth shipped; campaign setup server truth remains next.

### R4d - Campaign setup backend-owned truth

- 2026-07-14 implementation:
  - Shipped the campaign setup slice: added `api/_lib/campaignTruth.js` as the server-owned setup contract for Email > Campaign.
  - `/api/dashboard/campaigns` now resolves tenant through R2 `TenantContext`, lists campaigns across canonical tenant aliases, and returns additive `campaign_setup` with `configured`, `not_configured`, or `misfiled` status. Existing `campaigns` rows/fields remain intact; no schema/data rename.
  - Misfiled detection is tenant-scoped: when no alias-matching campaigns exist, the resolver only considers campaigns tied to workspace-owned Gmail connections whose workspace id is in the current TenantContext alias set, then reports rows filed under non-alias world keys instead of letting the UI call that "No campaigns yet."
  - Campaign sub-endpoints used by the screen (`campaign-health`, `campaign-contacts`, `campaign-activity`, `campaign-actions`, `campaign-audience`) now resolve through TenantContext and read alias-stamped campaign/contact/event rows consistently. New campaign writes still stamp the canonical tenant id.
  - CV6 `useCampaignList` now carries `campaignSetup`; the Campaign screen renders server-owned misfiled/not-configured states from `campaign_setup.status` instead of inferring setup from `campaigns.length`. No-Supabase local render skips tenant-gated campaign API calls and settles to the existing empty setup state.
  - Added `tests/api/_lib/campaignTruth.test.js`, covering alias-configured, not-configured, and misfiled classifications.
  - Verification:
    - `node --check api/_lib/campaignTruth.js api/dashboard/campaigns.js api/dashboard/campaign-health.js api/dashboard/campaign-contacts.js api/dashboard/campaign-activity.js api/dashboard/campaign-actions.js api/dashboard/campaign-audience.js src/dashboard/cv6next/data/useCampaign.js src/dashboard/cv6next/Campaign.jsx` passed.
    - `node --test tests/api/_lib/campaignTruth.test.js tests/api/_lib/filesTruth.test.js tests/api/_lib/fileRef.test.js tests/api/_lib/reviewTruth.test.js tests/api/_lib/commandTruth.test.js` passed.
    - `npm run test:tenant-context` passed, including the hardcoded tenant guard.
    - `git diff --check` passed.
    - `npm run build` passed. Prebuild printed existing local notices about missing sibling registry sources and Vite printed the existing chunk-size warning.
    - Browser/network CV6 audit not run in this sandbox; rerun externally with `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`.

**Status:** shipped; R4 backend-owned truth slices are complete.

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

## R5a — Shared CV6 Room Message Renderer, Catch Up First Slice

**Date:** 2026-07-14

**Scope:** Implemented exactly slice 1 from the R5 renderer consolidation proposal.

- Built `src/dashboard/cv6next/MessageThread.jsx` exporting `Cv6MessageThread`, `Cv6MessageGroup`, `Cv6MessageTurn`, `Cv6MessageExtras`, and `groupMessagesBySender`.
- The shared renderer targets the normalized `useRoomThread()` message shape only and composes the existing primitives: `ChatMessageRenderer`, `AgentBlocks`, `GoalThreadBody`, `WorkingTurn`, `liveStepsToBlocks`, `MessageAttachments`, `ResultLinkCards`, and `ActionChips`.
- Added compatibility flags for `variant`, `mode`, live-work rendering, block rendering, and `allowBlocks` / `allowAttachments` / `allowChips` / `allowLinkCards`.
- Migrated only the Catch Up modal `InlineBubbleThread` to `Cv6MessageThread variant="modal"` with `allowBlocks` and `allowLinkCards`.
- Left modal attachments off intentionally (`allowAttachments={false}`) because the fixed-height Catch Up modal has never carried attachment galleries, and this slice is meant to fix transformed block/link-card truth without adding modal layout risk.
- Added `tests/cv6-message-renderer.spec.mjs` for `?demo=blocks` vocabulary coverage plus the Catch Up modal path with seeded no-Supabase data.
- Follow-up fix after external browser run:
  - Tightened the demo Email assertion to the `.cmail-tag` exact label so Playwright strict mode does not match surrounding email-related prose.
  - Diagnosed the Catch Up modal failure as a test seeding issue: no-Supabase local `useDataPipe` does not derive Catch Up cards from stubbed `supabase-status.messages`, so the previous `cv6_catchup_modal=1` Home opener rendered the caught-up state and never mounted `InlineBubbleThread`.
  - Replaced that brittle opener with `?demo=catchup-modal`, a no-auth renderer fixture that renders the real `CatchUpModal` + `useRoomThread` path directly. Normal Home behavior is unchanged.

**Verification:**

- `npm run build` passed. Prebuild printed the existing local notices about missing sibling registry sources and Vite printed the existing chunk-size warning.
- `npm run test:tenant-context` passed, including the hardcoded tenant guard.
- `git diff --check` passed.
- After the follow-up fix, `npm run build`, `npm run test:tenant-context`, and `git diff --check` passed again.
- `node --test` was run repo-wide and failed on two unrelated existing tests: `tests/api/_lib/mailAccess.test.js` expected 2 rows but got 0, and `tests/rightclick-menus.test.mjs` failed its existing bundle test-id check. Other Node tests passed.
- `node --check src/dashboard/cv6next/MessageThread.jsx` is not applicable because Node cannot syntax-check `.jsx` ESM files directly (`ERR_UNKNOWN_FILE_EXTENSION`); `npm run build` covered the JSX transform.
- Focused browser specs were not executable in this sandbox because Vite cannot bind a local server here: `listen EPERM: operation not permitted 127.0.0.1:5173`.

**External browser commands:**

- `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-message-renderer.spec.mjs --reporter=line`
- `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`

**Status:** shipped; EA ran the browser specs externally (renderer spec 2/2, practical audit 2/2) after fixing the spec's send-intercept route pattern (POST goes to the bare supabase-messages path, no query string).

## R5d — Shared Renderer Mobile ChatLifecycle Migration

**Date:** 2026-07-14

**Scope:** Shipped. Built the mobile compatibility flags needed by `Cv6MessageThread`, then migrated mobile `ChatLifecycle` while preserving day folding, long-message clamp, custom file gallery/viewer, scroll pinning outside the renderer, and synthetic live GoalTurn behavior.

- `Cv6MessageThread` now has a `variant="mobile"` path that preserves the previous mobile per-turn markup instead of using desktop grouped bubbles.
- Added `renderAttachments="mobileGallery"` plus `MobileFileGallery`, `onOpenFile`, and `onReviewFiles` hooks so mobile keeps its custom `FileGallery` / `FileCollectionViewer` path this round.
- Added mobile long-message clamping inside the shared renderer path using the existing `.longmsg` / `.longmsg-more` behavior.
- Added mobile synthetic live work support with `renderLiveWork="goalBody"`, rendering the live `GoalThreadBody` under the pinned user turn.
- Migrated `ChatLifecycle` day bodies to `Cv6MessageThread`; left `scrbody`, safe-area padding, composer positioning, jump-to-latest, and pin-last-user scroll logic untouched.
- Extended `tests/cv6-message-renderer.spec.mjs` with a 390x844 mobile seeded-room spec that asserts folded days, long-message expansion, mobile gallery affordance, and live goal-turn output. The POST intercept for `/api/dashboard/supabase-messages` uses the bare path.

**Verification:**

- `npm run build` passed. Prebuild printed the existing missing-sibling-registry notices and Vite printed the existing chunk-size warning.
- `npm run test:tenant-context` passed.
- `git diff --check` passed.
- Browser specs could not run in this sandbox because Vite cannot bind localhost: `listen EPERM: operation not permitted 127.0.0.1:5173`.

**External browser commands:**

- `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-message-renderer.spec.mjs --reporter=line`
- `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`

**Status:** implemented; browser verification pending outside this sandbox.

**Follow-up:** Claude's external browser run showed the new mobile spec timing out before entering the room: seeded `supabase-status` data did not reach the mobile chat list under `?view=chat`, same failure class as R5b's first Home quick thread fixture. Fixed by replacing the data-pipe-dependent mobile browser test with `?demo=mobile-chat-lifecycle`, a direct fixture that mounts the real `ChatLifecycle` with seeded normalized messages. EA then fixed the gallery filename assertion (thumbnail exposes the name as the button's accessible name, not visible text) and ran the browser specs externally: renderer spec 5/5, practical audit 2/2. Status upgraded to shipped; all four room renderers now share Cv6MessageThread.

## R7 - Reviewable file previews

**Date:** 2026-07-14

**User goal:** Open HTML/web pages, PDFs, videos, and images inside Corner Review, inspect the real artifact without downloading it first, and attach comments to what is visible.

**Scope:** Trace and repair the shared file delivery and Review viewer contracts, preserve safe handling for active HTML, and add focused regression coverage for the supported reviewable media families on desktop and mobile.

**Implementation:**

- Added a first-class `sitefile` identity for `.html` / `.htm` and HTML MIME types across the shared FileRef, queue, Files, and Review contracts. Stale broad queue stamps are now corrected from the filename/MIME for browser-rendered media and documents.
- Added `htmlDocView.js`: saved HTML is fetched and rendered inside an isolated `srcdoc` iframe, with sibling images/styles/scripts/media rewritten to the canonical RAG raw tunnel. Production CSP meta tags are removed inside the sandbox so original-host policy does not blank the stored artifact; Corner remains protected by the iframe sandbox.
- Mounted HTML, PDF, and DOCX hydrators in the active Files desktop/mobile viewers and the compatibility Review screens. Added honest media loading states and retry cleanup for images/video.
- Repaired direct shared/chat targets that live outside the mirrored Files tree. Desktop now keys pins from the live deliverable identity; mobile now enters the read view directly and uses the same identity, so point comments save and reopen instead of submitting against a null file.
- Added the `?demo=file-previews` no-auth fixture and `tests/cv6-file-previews.spec.mjs`. The spec feeds stale `copy` queue types and proves that HTML, PDF, PNG, and MP4 still choose their concrete viewer on both desktop and 390px mobile, including relative HTML assets, PDF canvas rendering, video metadata + scrubber, and point-comment persistence/reopen.

**Delivery verification:** the RAG raw tunnel returned inline 200 responses with correct MIME/CORS for a real Corner PNG, PDF, and HTML file, plus a 206 Range response for a real MP4. This confirmed the byte-delivery path was healthy and the broken behavior was in client classification/hydration.

**Verification:**

- `CV6_AUDIT_BASE=http://127.0.0.1:5173 npx playwright test tests/cv6-file-previews.spec.mjs --reporter=line --workers=1` — 2/2 passed.
- Focused FileRef/files-truth/review-truth Node suite — 10/10 passed.
- `npm run test:tenant-context` passed.
- `npm run build` passed (2,468 modules; existing chunk-size warning only).
- `node --check` on the changed non-JSX API/data modules passed.
- `git diff --check` passed.

**Status:** shipped and browser-verified on desktop and mobile. No deploy or commit was performed.

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

- 2026-07-14 delegated chat-room-files-workflow slice:
  - User goal: from an open CV6 chat room on desktop and mobile, open Files in this room, understand whether anything has been shared, return to the room, and continue to sibling CV6 surfaces without dead controls, stale data, misleading loading, or extra navigation.
  - Screen/tool inventory for this slice: desktop Home quick-room is the high-frequency desktop chat entry with its in-place files overlay; mobile chat uses `Files in this room` as a bottom sheet; Files/Email/Tracker/Command/Scribe are sibling CV6 surfaces that must still work after returning from the sheet.
  - Audit: opened Agents, opened the Web room on desktop and mobile in safe local/no-Supabase mode, opened the room file shelf, checked the empty-file state, closed it, returned to chat, and continued across sibling CV6 tools. The shelf itself stayed honest (`No files here yet.`), but both close paths were fragile as controls: mobile's icon close had no accessible name or keyboard return path, and desktop's in-place close lacked keyboard activation.
  - Ranked findings:
    1. P1 high-frequency/high-impact chat return path: Files is attached to the core chat loop, and a user who opens it must be able to get back to the room cleanly on desktop/mobile without relying on pointer-only or unnamed controls.
    2. P2 empty-state clarity: the no-file copy was honest and stable locally, so the main issue was the return control rather than stale data.
    3. P2 production verification: `https://aheadofmarket.com/dashboard` was opened in desktop Chrome for login, but the browser plugin setup still fails with `Cannot redefine property: process`; the debuggable Chrome session visible to automation only exposed a local file and `/cv4`, so authenticated production chat-files testing remains pending browser access.
  - Fixed this round: `RoomFilesSheet` now gives the mobile close icon an explicit `Close files` label, title, focus target, and Enter/Space handling. `HomeFilesPanel` now gives the desktop in-place close control the same `Close files` semantics and keyboard activation. The practical audit spec now opens room files and closes them on desktop/mobile before continuing to sibling CV6 surfaces.
  - Verification: `CV6_AUDIT_BASE=http://127.0.0.1:5174 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests across desktop Home quick-chat, mobile chat room-files, and sibling CV6 surfaces); `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/member/data mutation.
  - Remaining notes: production-auth verification is still blocked on an inspectable logged-in browser session; the dashboard was opened for the user to log in, but this verified unit is local-safe and committed without touching live data.

**Status:** shipped and locally verified for the delegated chat-room-files-workflow audit; production-auth verification blocked.
