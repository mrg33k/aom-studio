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
