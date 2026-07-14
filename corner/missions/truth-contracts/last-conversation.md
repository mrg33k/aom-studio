# Truth Contracts - Last Conversation

## 2026-07-14

The user authorized a recurring ten-minute loop. First complete the truth-contract architecture work, then audit the Corner CV6 app screen by screen and tool by tool against each surface's intended user goal and begin fixing the highest-impact gaps with the same verified loop.

Guardrails: preserve logins and worlds, use a worktree, update BUILD before code edits, test each round, do not deploy or run destructive migrations without explicit approval, and never silently merge `q` with `qa`.

The user clarified that this is a practical product-quality mission, not a technical glance. Corner should feel simple, easy, very clean, snappy, and dependable. Frequent small breaks are the central problem. Each run must attempt real end-to-end workflows, capture friction and interruptions, simplify the experience, and verify the user's goal is actually completed.

## 2026-07-14 - Delegated CV6 product audit round

Mission path: `corner:truth-contracts`.

Goal attempted: open `/dashboard`, land in CV6, orient from Home, open current work, and move across Files, Email, Tracker, Command, and Scribe on desktop and mobile.

Audit findings ranked by frequency x severity x impact:

1. P0: direct `/dashboard` in Vite resolved to stale `dashboard.html`, which mounted `src/dashboard/main.jsx`/CornerV3 instead of the main router/CornerCV6. The visible user state was "Corner. Loading your workspace..." forever, so the primary workflow could not start.
2. P0: in safe local/no-Supabase mode, CV6 Home stayed on "Gathering your rooms..." because `useHome()` required a `worldId` even when no Supabase client exists.
3. P1: the auth gate could rely on a Supabase auth listener/session read that never settles, creating the same permanent loading trap instead of Login or CV6.
4. P2: local Vite API requests for Files/Review return serverless source text, causing offline/error states and console JSON parse noise; the shell stays navigable.
5. P2: some mobile sibling tool headers have visual menu/search icons without the same accessible labels as Home.

Fix shipped: `dashboard.html` now mounts the main app router (`#root` + `/src/main.jsx`) so `/dashboard` shares the CV6 route truth; `AuthGuard` resolves the initial Supabase session directly and uses a watchdog to avoid indefinite loading; `useHome()` no longer blocks forever on `worldId` when Supabase is absent.

Verification: started Vite in safe no-Supabase mode, ran `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` (2 passed: desktop/mobile CV6 journey), then ran `npm run build` successfully. No deploy, push, schema/data migration, secret rotation, or external message send.

## 2026-07-14 - Delegated mobile sibling controls audit

Mission path: `corner:truth-contracts`.

Goal attempted: from mobile CV6 Home, open Search, use the drawer to visit each sibling tool, and always have an obvious accessible way back to drawer/search without guessing or relying on hidden implementation selectors.

Audit findings ranked by frequency x severity x impact:

1. P1: Chat, Files/Organize, Tracker, Command, Settings, Scribe, and Review template headers used bare icon `div[data-action]` controls for Search/Menu/Back-style actions. They looked tappable but lacked consistent button semantics, keyboard activation, and accessible names.
2. P2: Home and Email already exposed labeled mobile controls, so sibling screens felt inconsistent even when the visual pattern was similar.
3. P2: local Vite-only API requests can still create offline/JSON parse states in data-heavy panels; this remains lower priority for the shell/navigation workflow because the sibling journey stays usable.

Fix shipped: normalized CV6 template action controls centrally in `src/dashboard/cv6kit/templateEngine.js`. Non-native `data-action` controls now receive button role/focusability, common labels such as Search/Menu/Back/Profile, and Enter/Space activation through the shared renderer instead of per-template patches.

Verification: restarted Vite in safe no-Supabase mode, ran `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` (2 passed, including role-based mobile Search/Menu interactions across sibling tools), then ran `npm run build` successfully. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Delegated local Files empty-state audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Files and sibling data-heavy tools and understand whether the panel is offline, empty, or loading without misleading data-loss language or broken navigation.

Audit findings ranked by frequency x severity x impact:

1. P1: Files showed "We couldn't load your files / Your connection dropped" in safe local/no-Supabase mode. Evidence came from the desktop probe against `/dashboard?cv6=1`: Vite was serving non-JSON/source for tenant-gated API routes, but the UI presented it as a dropped connection.
2. P2: Mobile Files opens the project picker first; the empty copy appears after tapping "Personal 0 files." That is an extra click, but the state is honest and the Menu/Search controls remain available.
3. P2: Tracker and Command still show loading/empty local states when their live sources are unavailable. They stayed navigable in the sibling workflow and were not the highest-impact fix for this slice.

Fix shipped: `src/dashboard/cv6next/data/useOrganize.js` now treats absent Supabase as an explicit local empty Files mode. It skips tenant-gated Files/projects/uploads/mission-tree API calls, clears those arrays, and marks the panel loaded. Real configured sessions still fetch the mirror and still show real load errors.

Verification: ran `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` (2 passed, with desktop and mobile Files assertions for no dropped-connection banner and the empty workflow), then ran `npm run build` successfully. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Tracker and Command empty-state audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Tracker and Command in safe local/no-Supabase mode and see stable honest empty states instead of indefinite loading labels.

Audit findings ranked by frequency x severity x impact:

1. P1: Command stayed in `state='loading'` because `useWorldId()` returned `null` when Supabase was absent, so the screen rendered "Gathering your rooms..." instead of the empty ledger.
2. P1: Tracker initialized `status='loading'` / `spaceStatus='loading'` and only settled after tenant-gated API calls that are unavailable in local/no-Supabase mode.
3. P2: Hidden template loading text remains in the DOM after the ready state; the test now asserts visible empty states rather than absence of hidden template strings.

Fix shipped: `src/dashboard/cv6next/data/useCommandTracker.js` now gives local/no-Supabase mode a render-only `aom` world id, skips tenant-gated Command/Tracker polls and writes when Supabase is absent, initializes Tracker boards to empty, and disables create/update actions in no-Supabase mode. The audit spec now asserts Tracker and Command visible empty states on desktop and mobile.

Verification: `npm run build` passed. Claude ran external browser verification with `CV6_AUDIT_BASE=http://127.0.0.1:5199 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`; 2 tests passed in 9.6s. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - R2 Canonical Tenant Context

Mission path: `corner:truth-contracts`.

Goal attempted: build one authenticated tenant context and compatibility adapters without renaming existing worlds, slugs, memberships, logins, or data rows.

Fix shipped: added `api/_lib/tenantContext.js` for server-side tenant context resolution and compat field handling; added `src/dashboard/lib/tenantContext.jsx` and mounted it around CV6 so dashboard data hooks read the authenticated tenant once. Wired the highest-traffic CV6 callers and support/email APIs from today's slice through that contract. Removed active CV6/support hardcoded home-tenant selectors and added `npm run test:tenant-context` with alias/compat assertions plus a guarded hardcoded-tenant grep baseline.

Migration note: legacy CV3/CV4, some `api/dashboard/*`, `api/_lib/*`, integrations, relay, and CV6Kit demo wrappers still have baselined hardcoded tenant selectors. The guard now blocks new ones outside the explicit baseline while later rounds migrate those callers deliberately.

Required env note: support/email runtime now needs `SUPPORT_TENANT_ID` or `CORNER_HOME_TENANT` set to the existing support tenant slug.

Verification: `npm run test:tenant-context`, `node --check` on the new/changed support tenant endpoints, `npm run build`, and `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` all passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - R2 Tenant Context No-Supabase Fix-Forward

Mission path: `corner:truth-contracts`.

Claude reran the CV6 practical audit against a fresh no-Supabase Vite server on port 5200 and both tests failed waiting for Command to show `No rooms yet`. The prior sandbox Playwright result was not a valid fresh no-Supabase browser pass and should not be treated as verification.

Root cause: `TenantProvider` resolved no-Supabase mode to `tenantId=null`, which regressed the earlier render-only world behavior Command needed to settle to an honest empty state.

Fix: no-Supabase mode now emits a render-only tenant context from `src/dashboard/lib/tenantContext.jsx` with `tenantId='local-render'` and `renderOnly=true`. Configured Supabase mode still resolves from the authenticated user context.

Verification run in sandbox: `npm run test:tenant-context`, `node --check` on tenant/support scripts, and `npm run build` passed. Browser verification still needs Claude's external rerun: `CV6_AUDIT_BASE=http://127.0.0.1:5200 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`.

## 2026-07-14 - R3 Canonical File Identity

Mission path: `corner:truth-contracts`.

Goal attempted: unify file identity and health across Files and Review without renaming existing data, tables, or storage keys.

Fix shipped: added `api/_lib/fileRef.js` as the canonical FileRef contract for tenant, source row, storage key/path, URL, MIME/type, size, project/mission scope, review identity, source_path/sha256, and health. `review-queue.js` now builds queue items through FileRef while preserving legacy fields. `files.js?type=uploads` now builds upload rows through the same contract and adds `file_ref`/`health_status` beside the old shape. CV6 Review keeps the ref on mapped queue/injected items, Files canonicalizes mirror/upload rows before deriving kind/status/review IDs/badges/counts, and the Files waiting/decided maps now use the shared FileRef identity list.

Tests added: `tests/api/_lib/fileRef.test.js` covers mirror storage identity, chat attachment/review queue identity, and store URL to corner path identity bridging.

Verification: `node --check api/_lib/fileRef.js api/dashboard/review-queue.js api/dashboard/files.js src/dashboard/cv6next/data/useReview.js src/dashboard/cv6next/data/useOrganize.js src/dashboard/cv6next/OrganizeDesktop.jsx src/dashboard/cv6next/OrganizeMobile.jsx`, `node --test tests/api/_lib/fileRef.test.js`, `npm run test:tenant-context`, `git diff --check`, and `npm run build` all passed. Browser verification was not run in the sandbox.

No new env requirement, schema/data migration, storage key rename, deploy, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - R4c Files Backend-Owned Eligibility Truth

Mission path: `corner:truth-contracts`.

Goal attempted: ship the remaining Files backend-owned-truth slice so the Files count badge and visible list use one eligibility ruleset built on the R3 FileRef contract.

Fix shipped: added `api/_lib/filesTruth.js` as the server-owned Files snapshot over mirror rows, chat uploads, and Review waiting rows. Added additive `/api/dashboard/files?type=organize&client=<tenant>`, gated by `verifyTenant`, which fetches mirror/upload/Review sources server-side, decorates visible rows with FileRef, and returns `files_truth` with by-project counts plus ghost review rows for waiting files no longer present in the mirror. `useOrganize` now prefers that combined response and uses backend `needs_review` stamps plus `files_truth.ghosts` for both count and list truth, with the previous split mirror/uploads fallback preserved. Touched Files reads no longer fall back to a literal tenant when `client` is missing.

Tests added: `tests/api/_lib/filesTruth.test.js` covers mirror review joins, review ghosts, and upload counts from the same visible-row snapshot.

Verification: `node --check api/_lib/filesTruth.js api/dashboard/files.js api/dashboard/review-queue.js src/dashboard/cv6next/data/useOrganize.js`, `node --test tests/api/_lib/filesTruth.test.js tests/api/_lib/fileRef.test.js tests/api/_lib/reviewTruth.test.js tests/api/_lib/commandTruth.test.js`, `npm run test:tenant-context`, `git diff --check`, and `npm run build` all passed. Browser verification was not run in the sandbox.

Deferred: campaign setup server truth remains the next backend-owned-truth round to stop Email/Campaign screens independently inferring setup state.

No new env requirement, schema/data migration, storage key rename, deploy, secret rotation, external message send, or stored login/world/data mutation.
## 2026-07-14 - R4d Campaign Setup Backend-Owned Truth

Mission path: `corner:truth-contracts`.

Goal attempted: ship the last deferred R4 backend-owned-truth slice so Email > Campaign setup state is resolved server-side instead of each screen inferring setup from an empty campaign list.

Fix shipped: added `api/_lib/campaignTruth.js` as the Campaign setup truth contract (`configured`, `not_configured`, `misfiled`). `/api/dashboard/campaigns` now resolves through R2 TenantContext, reads campaigns across canonical tenant aliases, and returns additive `campaign_setup` with existing `campaigns` untouched. Misfiled detection is tenant-scoped through workspace-owned Gmail connections whose workspace id is in the current TenantContext alias set, so a campaign filed under a non-alias world key is surfaced as setup repair instead of “No campaigns yet.” Campaign health, contacts, activity, actions, and audience endpoints now use TenantContext and alias-aware campaign/contact/event reads. New campaign writes still stamp the canonical tenant id.

CV6 change: `useCampaignList` carries `campaignSetup`; `Campaign.jsx` renders server-owned misfiled/not-configured states from `campaign_setup.status` rather than inferring setup from `campaigns.length`. No-Supabase local render skips tenant-gated campaign API calls and settles to the existing empty state.

Tests added: `tests/api/_lib/campaignTruth.test.js` covers alias-configured, not-configured, and misfiled classifications.

Verification: `node --check api/_lib/campaignTruth.js api/dashboard/campaigns.js api/dashboard/campaign-health.js api/dashboard/campaign-contacts.js api/dashboard/campaign-activity.js api/dashboard/campaign-actions.js api/dashboard/campaign-audience.js src/dashboard/cv6next/data/useCampaign.js src/dashboard/cv6next/Campaign.jsx`, `node --test tests/api/_lib/campaignTruth.test.js tests/api/_lib/filesTruth.test.js tests/api/_lib/fileRef.test.js tests/api/_lib/reviewTruth.test.js tests/api/_lib/commandTruth.test.js`, `npm run test:tenant-context`, `git diff --check`, and `npm run build` all passed. Build had the existing prebuild notices and Vite chunk-size warning. Browser/network CV6 audit was not run in this sandbox.

No new env requirement, schema/data migration, row rename, deploy, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - R5-research Renderer Consolidation Map

Mission path: `corner:truth-contracts`.

Goal attempted: research only, no product code changes. Map CV6 chat renderer duplication before any consolidation build.

Research shipped: created `corner/missions/truth-contracts/research/renderer-consolidation-map.md`. The map covers the four duplicated room-chat renderers (`ChatDesktop`/`MsgExtras`, Home `Cv6QuickThread`, mobile `ChatLifecycle` `Message` + `GoalTurn`, and Catch Up `InlineBubbleThread`), plus the adjacent Email/Support `SupportThread` renderer. It documents how `useRoomThread()` and `injectWorkSteps()` route plain replies into the blocks path, the feature matrix, drift bugs from BUILD/code comments, a staged consolidation proposal, verification plan, and risk register.

Recommendation: first migration slice should build a shared read-only `Cv6MessageThread` adapter and use it behind `InlineBubbleThread` only. After that passes, migrate Home `Cv6QuickThread` while keeping its portal host and sticky-scroll code outside the renderer.

Verification: research doc read-through completed; `git diff --check -- corner/missions/truth-contracts/BUILD.md corner/missions/truth-contracts/research/renderer-consolidation-map.md corner/missions/truth-contracts/last-conversation.md` passed. No product code, tests, schema/data migration, deploy, push, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - R5a Shared CV6 Room Message Renderer, Catch Up First Slice

Mission path: `corner:truth-contracts`.

Goal attempted: implement exactly slice 1 from the R5 renderer consolidation proposal.

Fix shipped: added `src/dashboard/cv6next/MessageThread.jsx` exporting `Cv6MessageThread`, `Cv6MessageGroup`, `Cv6MessageTurn`, `Cv6MessageExtras`, and `groupMessagesBySender`. The renderer targets only normalized `useRoomThread()` messages and composes existing primitives: `ChatMessageRenderer`, `AgentBlocks`, `GoalThreadBody`, `WorkingTurn`, `liveStepsToBlocks`, `MessageAttachments`, `ResultLinkCards`, and `ActionChips`. Migrated only Catch Up modal `InlineBubbleThread` to `Cv6MessageThread variant="modal"` with blocks and link cards enabled. Modal attachments remain off because the fixed-height modal has not carried attachment galleries before, and this slice is scoped to fixing transformed block/link-card truth without adding layout risk.

Tests added: `tests/cv6-message-renderer.spec.mjs` covers `?demo=blocks` core block vocabulary and a seeded no-Supabase Catch Up modal path asserting transformed block messages render, a result link card renders, and the modal composer still sends.

Implementation note: desktop Home no longer exposes a visible Catch Up opener, but the existing modal path still exists. Browser verification uses the no-auth renderer fixture `?demo=catchup-modal`, which renders the real Catch Up modal and room-thread path without adding visible product UI.

Verification: `npm run build`, `npm run test:tenant-context`, and `git diff --check` passed. `node --test` was run repo-wide and failed on two unrelated existing tests: `tests/api/_lib/mailAccess.test.js` expected 2 rows but got 0, and `tests/rightclick-menus.test.mjs` failed its bundle test-id check. Focused Playwright was not executable in the sandbox because Vite failed to bind `127.0.0.1:5173` with `listen EPERM`; rerun externally with `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-message-renderer.spec.mjs --reporter=line` and the practical audit spec.

No SupportThread, ChatDesktop, ChatLifecycle, or Cv6QuickThread migration. No schema/data migration, deploy, push, secret rotation, external message send, or stored login/world/data mutation.

Follow-up from Claude's external Playwright run: both new renderer specs initially failed. Fixed the demo blocks test by targeting the exact `.cmail-tag` Email label instead of broad `getByText('Email')`. Diagnosed the Catch Up modal failure as test seeding, not renderer output: no-Supabase local `useDataPipe` does not create Catch Up cards from stubbed `supabase-status.messages`, so the previous `cv6_catchup_modal=1` Home opener stayed in the caught-up state and never mounted the modal thread. Replaced that with `?demo=catchup-modal`, a no-auth renderer fixture that renders the real `CatchUpModal` and `useRoomThread` path directly. Re-verified `npm run build`, `npm run test:tenant-context`, and `git diff --check` in the sandbox; browser rerun still needs an external Vite server.
