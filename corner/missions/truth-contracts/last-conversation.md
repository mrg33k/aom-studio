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

## 2026-07-14 - R5b Home Quick Thread Shared Renderer

Mission path: `corner:truth-contracts`.

Goal attempted: implement exactly slice 2 of the renderer consolidation proposal: migrate Home's `Cv6QuickThread` to the shared `Cv6MessageThread` renderer without touching `ChatDesktop`, `ChatLifecycle`, or `SupportThread`.

Fix shipped: replaced Home `Cv6QuickThread`'s private grouped message loop with `Cv6MessageThread variant="homeQuick"`. The Home portal host tracking, MutationObserver host selection, and sticky-scroll wrapper remain outside the renderer. Attachments stay enabled via `allowAttachments`, blocks/link cards remain enabled, chips remain disabled for current Home parity, live work still flows through shared `WorkingTurn`, and review/send callbacks stay host-owned.

Tests added: extended `tests/cv6-message-renderer.spec.mjs` with a seeded Home quick thread case using `?demo=home-quick-thread`. It opens a seeded project room in the Home column, waits for `[data-cv6-message-thread][data-variant="homeQuick"]`, and asserts seeded plain text, the `renderer-audit.pdf` attachment with `Review`, and the result link card render through the shared renderer. The `supabase-messages` intercept still uses the bare-path wildcard pattern.

Verification run in sandbox: `node --check tests/cv6-message-renderer.spec.mjs`, `git diff --check`, `npm run test:tenant-context`, and `npm run build` all passed. Build printed the existing prebuild notices about missing sibling registry sources and the existing Vite chunk-size warning. Browser specs were not run in this sandbox per handoff; Claude should rerun externally.

External commands to run: `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-message-renderer.spec.mjs --reporter=line` and `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`.

No schema/data migration, deploy, push, secret rotation, external message send, stored tenant/world/login/data mutation, or commit. Pre-existing dirty `test-results/.last-run.json` was left untouched.

Follow-up from Claude's external Playwright run: demo blocks, Catch Up modal, and practical audit passed, but the new Home quick thread test failed waiting for `Renderer Room`. The page mounted the Home shell, but the stubbed `supabase-status.projects` room did not reach Home's rooms column under `?demo=home-quick-thread`, matching the earlier Catch Up fixture-data failure class.

Fix-forward: changed `?demo=home-quick-thread` from a data-pipe-dependent route into a direct fixture component. `DemoHomeQuickThread` renders the real desktop Home template and the real migrated `Cv6QuickThread`, but supplies a seeded `Renderer Room` recent row and seeded normalized messages directly in-process. The test now clicks that visible Home row and asserts text, attachment review affordance, and link card inside `[data-variant="homeQuick"]`; it no longer depends on `supabase-status` or `supabase-messages` route seeding for the Home demo.

Re-verification run in sandbox: `node --check tests/cv6-message-renderer.spec.mjs`, `git diff --check`, `npm run test:tenant-context`, and `npm run build` passed. Attempted a focused browser rerun by starting `npm run dev -- --host 127.0.0.1 --port 5200`, but this sandbox still cannot bind Vite (`listen EPERM: operation not permitted 127.0.0.1:5200`). External browser rerun still needed with `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-message-renderer.spec.mjs --reporter=line`.

## 2026-07-14 - R5c Desktop Chat Shared Renderer

Mission path: `corner:truth-contracts`.

Goal attempted: implement exactly slice 3 of the renderer consolidation plan: migrate desktop `ChatDesktop` from its private `BubbleThread`/`BubbleGroup`/`MsgExtras` message loop to shared `Cv6MessageThread variant="desktop"`, while leaving day folding, drawer, composer, and room selection owned by `ChatDesktop`.

Fix shipped: `ChatDesktop` now keeps `groupByDayD`, `DesktopDayCard`, and `PlainThread` as the day-folding shell, but each visible day body delegates the message loop to `Cv6MessageThread`. Deleted the private desktop `groupChat`, `MsgExtras`, `BubbleGroup`, and `BubbleThread` code. Review attachment taps still route through `handleThreadAction`; chips still send through `SendCtx`; blocks, attachments, result link cards, and live `WorkingTurn` remain enabled for desktop. `MessageThread.jsx` now uses the existing `.grp`/`.stack`/`.ava` bubble classes for shared groups and accepts `chipsPrimaryFirst`, so desktop preserves its prior non-primary chip treatment.

Tests added: extended `tests/cv6-message-renderer.spec.mjs` with a seeded desktop Chat case at `?view=chat`. The fixture uses the real `ChatDesktop` route and bare `/api/dashboard/supabase-messages*` intercepts, then asserts folded older-day messages, latest-day desktop shared renderer, text bubble, `desktop-renderer-audit.pdf` attachment + Review, result link card, suggestion chip, and the live working row from `/api/dashboard/message-steps`.

Verification run in sandbox: `node --check tests/cv6-message-renderer.spec.mjs`, `git diff --check`, `npm run test:tenant-context`, and `npm run build` passed. Direct `node --check` on `.jsx` files was not usable with Node v25 because it rejects the `.jsx` extension; `npm run build` covered JSX parse/bundling. Browser verification could not run because Vite cannot bind in this sandbox (`listen EPERM: operation not permitted 127.0.0.1:5200`).

External commands to run: `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-message-renderer.spec.mjs --reporter=line` and `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`.

No `ChatLifecycle`, `SupportThread`, schema/data migration, deploy, push, secret rotation, external message send, stored tenant/world/login/data mutation, or commit. Pre-existing dirty `test-results/.last-run.json` was left untouched.

## 2026-07-14 - R5d Mobile ChatLifecycle Shared Renderer

Mission path: `corner:truth-contracts`.

Goal attempted: implement slice 4 of the renderer consolidation plan: add the mobile compatibility flags to `Cv6MessageThread`, then migrate mobile `ChatLifecycle` without changing mobile behavior.

Fix shipped: `Cv6MessageThread` now has a `variant="mobile"` path that preserves the previous mobile per-turn markup instead of using desktop grouped bubbles. It owns the mobile message loop, long-message clamp, block/goal turn rendering, and synthetic live goal turn via `renderLiveWork="goalBody"`. Added `renderAttachments="mobileGallery"` plus `MobileFileGallery`, `onOpenFile`, and `onReviewFiles` so mobile still uses `ChatLifecycle`'s custom `FileGallery` / `FileCollectionViewer` this round, not `MessageAttachments`.

ChatLifecycle migration: older folded day cards and the latest day now delegate their message bodies to `Cv6MessageThread variant="mobile"`. Day folding remains in `ChatLifecycle`. The mobile scroll body, safe-area padding, composer positioning, jump-to-latest, pin-last-user hooks, and viewport spacer remain outside the renderer and were not edited.

Tests added: extended `tests/cv6-message-renderer.spec.mjs` with a 390x844 mobile seeded-room case at `?view=chat`. The fixture seeds an agent room, old-day messages, a long agent message, an auto-shared image file, and a recent user turn with message steps. The spec asserts the folded day opens, the long message shows `Show more` and expands to `Show less`, the custom mobile gallery affordance renders with `Review all`, and the live goal turn shows the seeded work step. The POST intercept for `/api/dashboard/supabase-messages` uses the bare path.

Verification run in sandbox: `npm run build`, `npm run test:tenant-context`, and `git diff --check` passed. Attempting `npm run dev -- --host 127.0.0.1 --port 5173` failed with the existing sandbox networking restriction: `listen EPERM: operation not permitted 127.0.0.1:5173`, so browser specs need Claude's external run.

External commands to run: `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-message-renderer.spec.mjs --reporter=line` and `CV6_AUDIT_BASE=http://127.0.0.1:<port> npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`.

No `SupportThread`, schema/data migration, deploy, push, secret rotation, external message send, stored tenant/world/login/data mutation, or commit. Pre-existing dirty `test-results/.last-run.json` was left untouched.

Follow-up from Claude's external Playwright run: the four existing renderer tests and `cv6-practical-audit` passed, but the new mobile test timed out waiting for `Renderer Room` under `?view=chat`. Root cause matched R5b's first fixture failure: seeded `supabase-status` data did not reliably flow through the mobile chat list data pipe. Fix-forward: added `?demo=mobile-chat-lifecycle`, a direct no-auth fixture that mounts the real `ChatLifecycle` in a 100dvh mobile host with seeded normalized messages, file row, and live steps. Updated the mobile spec to load that fixture directly and removed its data-pipe seeding/click through ChatList. Re-verified `npm run build`, `npm run test:tenant-context`, and `git diff --check` in the sandbox. Browser rerun still needs an external Vite server because this sandbox cannot bind localhost (`listen EPERM: operation not permitted 127.0.0.1:5173`).

## 2026-07-14 - R7 Reviewable File Previews

Mission path: `corner:truth-contracts`.

Goal: stop HTML/web pages, PDFs, images, and videos from falling into broken or download-only states in Corner Files/Review, and keep the visible artifact connected to point comments.

Shipped: added the shared `sitefile` FileRef/viewer type and a sandboxed saved-HTML reader that rewrites local assets through the RAG raw tunnel. Corrected stale broad queue types from concrete extensions/MIME, mounted HTML/PDF/DOCX hydrators across active and compatibility viewers, added image/video loading and retry cleanup, and repaired out-of-tree shared-file identities so desktop and mobile comments persist. Mobile direct targets now enter the read view instead of remaining on the empty picker.

Browser coverage: added `?demo=file-previews` and `tests/cv6-file-previews.spec.mjs`. The API fixture deliberately marks every artifact as `copy`; desktop and 390px mobile still render saved HTML (including a relative image), PDF canvases, a real PNG, and a real MP4 with the review scrubber. Point comments save and reopen. Result: 2/2 Playwright tests passed.

Other verification: live RAG delivery checks passed for PNG/PDF/HTML inline responses and MP4 Range streaming; focused FileRef/files-truth/review-truth tests passed 10/10; tenant-context guards passed; production build passed with the existing chunk-size warning; changed non-JSX modules passed `node --check`; `git diff --check` passed.

No deploy, commit, push, schema/data mutation, external message, or secret change. Unrelated pre-existing dirty files were left untouched; the build regenerated the already-dirty missions registry and Playwright updated the already-dirty last-run record.

## 2026-07-14 - Review JSON normalization audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Files/Review-backed panels plus sibling tools and keep the workflow understandable when local Vite serves API source/non-JSON bodies instead of real JSON.

Audit findings ranked by frequency x severity x impact:

1. P1: Review-backed data reads logged repeated `Unexpected token '/' ... is not valid JSON` errors for projects, missions-tree, and review-queue. Files still looked usable, but the console made the product appear broken and hid real regressions in noise.
2. P2: The visible desktop and mobile sibling journeys completed through Files, Tracker, Command, Scribe, and Home; the issue was misleading/error-noisy state rather than navigation breakage.
3. P2: Generic local missing-resource 404 console entries remain filtered as non-product noise in the practical audit test.

Fix shipped: `src/dashboard/cv6next/data/useReview.js` now guards read-only Review JSON parsing. Non-JSON successful read responses become empty/unavailable local data instead of thrown parse errors; Review mutation responses remain strict. The CV6 practical audit spec no longer ignores the old `Unexpected token '/'` JSON parse failure.

Verification: desktop and mobile Playwright probes completed the sibling journey without Review parse errors; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests); `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Email local workflow audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Email, understand the inbox/campaign state, and return to sibling tools without misleading local errors, stale labels, duplicate empty copy, or broken navigation.

Audit findings ranked by frequency x severity x impact:

1. P1: Mobile Email showed "We couldn't reach your inbox / Your connection dropped" in safe no-Supabase local mode, while desktop Email showed the honest caught-up inbox. Same product state, contradictory meaning.
2. P1: Once the local state settled empty, mobile rendered the caught-up empty block twice because the support inbox template carried its own empty branch and the shared composer injected another.
3. P2: Mobile Email still titled the inbox "Support" even though the shared nav and Email shell present this as Email.

Fix shipped: `src/dashboard/cv6next/data/useSupportInbox.js` now treats absent Supabase as explicit read-only local empty data. `src/dashboard/cv6next/CornerCV6.jsx` can drop embedded state branches before injecting shared states, and mobile Email uses that path to avoid duplicate empty copy. `src/dashboard/cv6next/templates/support-inbox.html` now shows the visible title "Email."

Verification: desktop/mobile Playwright probes completed Email with one caught-up state and no dropped-connection banner; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests with Email assertions); `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Campaign local workflow audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Email, switch to Campaign, understand whether campaigns are empty or unavailable, and return to sibling tools without misleading retry errors or dead local write controls.

Audit findings ranked by frequency x severity x impact:

1. P1: Desktop and mobile Campaign both showed "Campaigns didn't load. Retrying automatically." in safe no-Supabase local mode. That is a core Email sub-workflow and it read as a live failure rather than honest local emptiness.
2. P1: The configured empty-state action would open campaign creation, but campaign writes cannot work in local no-Supabase mode, so showing the create action there would be a dead path.
3. P2: Sibling navigation stayed usable and Campaign produced only the already-filtered generic local 404 resource console entries.

Fix shipped: `src/dashboard/cv6next/data/useCampaign.js` now treats absent Supabase as explicit local empty data. `src/dashboard/cv6next/Campaign.jsx` shows a calm local empty message and hides "Create your first campaign" in local mode while preserving the configured-session creation flow.

Verification: desktop/mobile Playwright probes completed Campaign with "No campaigns yet" and no retry error; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests with Campaign assertions); `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Live Scribe capture-state audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Live Scribe, understand the empty note state, try Start capture, and return to sibling tools without a misleading mic/error state or dead action.

Audit findings ranked by frequency x severity x impact:

1. P1: Live Scribe looked active before consent. On both desktop and mobile, the idle screen showed recording affordances (red dot, waveform, mobile speaker/live bar) before the user pressed Start, which is a trust break for a mic-capture workflow.
2. P2: Empty "Save & copy summary" remains reachable before transcript exists. It does visibly report "Nothing captured yet — record something first.", so it is not dead, but it is still an extra pre-capture control.
3. P2: Starting capture with no microphone produces the expected `NotFoundError` in console plus generic local 404 entries; the visible product state is correct and recoverable with the mic-specific message.

Fix shipped: `src/dashboard/cv6next/templates/livescribe.html` now binds the record dot, waveform, mobile status bar, and speaker indicator to `session.capturing`. `src/dashboard/cv6next/cv6.css` makes the off state muted/static and keeps the red pulsing recording look only for `is-on`. The practical audit spec now asserts Scribe's desktop and mobile idle state during the sibling workflow.

Verification: a focused fake-microphone Playwright probe confirmed idle `rec/wave is-off` with no animation and Start flips to `Stop & save` plus active recording classes. `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests across desktop/mobile sibling tools with Scribe assertions). `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Home/Search consistency audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Search, find visible work by name, open it or recover from no results, and return to sibling tools without misleading empty states.

Audit findings ranked by frequency x severity x impact:

1. P1: Home leaked stale design sample data in safe local/no-Supabase mode. Desktop showed `PROJECTS · 84` and `Show 78 more projects`; mobile showed `Show 78 more rooms`. Search then said `Nothing matches "space"`, which was correct for local data but contradicted the fake Home project counts.
2. P2: `useChatList` still blocked its state on `!worldId` even when Supabase was absent, unlike Home's local render contract. That made Search/Chat-list semantics easier to drift from Home.
3. P2: Generic local missing-resource 404 console entries remain filtered as non-product noise.

Fix shipped: `src/dashboard/cv6next/CornerCV6.jsx` now copies the project array binding props (`count`, `moreCount`, `moreState`) after mapping project rows, so empty project lists bind as `0/none` instead of leaving template fallback text visible. `src/dashboard/cv6next/data/useHomeData.js` aligns `useChatList` loading with Home in no-Supabase local mode. The practical audit spec now opens Search on desktop/mobile, checks the `space` no-result recovery, and asserts the stale `84/78` Home copy is gone.

Verification: desktop/mobile Playwright probe showed `PROJECTS · 0`, no stale `Show 78 more`, and Search `space` recovery; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests across Home/Search and sibling tools); `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - New composer local workflow audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6 Home, press New, understand whether a mission or project can be started, recover from missing fields, and avoid dead local write controls.

Audit findings ranked by frequency x severity x impact:

1. P1: In safe local/no-Supabase mode, New Composer offered active `Start mission` and `Create project` actions even though writes could not succeed. A filled project submit ended with `Could not create the project. Please try again.`, which implied a retryable product failure instead of the true read-only local workspace.
2. P2: Blank validation was clear and recoverable: mission submit asked for the work to get done, project submit asked for a project name, and mission-with-goal in an empty local workspace asked for a project.
3. P2: Generic local missing-resource 404 console entries remain filtered as non-product noise.

Fix shipped: `src/dashboard/cv6next/NewComposer.jsx` now detects absent Supabase and binds the composer hint/primary CTA to `Creation needs a connected workspace. Local mode is read-only.` and `Read-only locally`. The CTA is styled inactive, and submit returns the same read-only truth before any create API runs. Configured sessions keep the normal Start/Create labels and backend path.

Verification: desktop/mobile Playwright probe confirmed mission and project tabs show the read-only local state and no failing create attempt. `CV6_AUDIT_BASE=http://127.0.0.1:5174 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests across Home/New and sibling CV6 tools). `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Chat room core workflow audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open the actual chat room, understand the room context, type/send or recover from read-only state, use obvious room controls, and return to sibling tools without stale data, dead actions, or misleading working states.

Audit findings ranked by frequency x severity x impact:

1. P1: Chat is the core product loop. In safe local/no-Supabase mode, mobile accepted a typed room message, cleared the input, rendered a `You` message, and showed `Getting started / Working` even though no connected workspace could receive it.
2. P1: Desktop's practical chat entry is the Home third-column quick room. It still promised `Send the first one below` and had an old quick-send handler that cleared text without waiting for a successful send.
3. P2: Mobile chat Back/Menu/Files controls were visually clear but lacked complete button semantics in the chat lifecycle itself.
4. P2: Live production verification is still pending. A fresh read-only check of `https://aheadofmarket.com/dashboard` redirected to `https://www.aheadofmarket.com/login`; the in-app browser control setup failed with `Cannot redefine property: process`, so an authenticated production room could not be exercised in this run.

Fix shipped locally: `src/dashboard/cv6next/data/useRoomThread.js` now refuses local read-only sends before optimistic UI and removes optimistic rows on failed POSTs. `src/dashboard/cv6next/Cv6FullComposer.jsx`, `src/dashboard/cv6next/ChatLifecycle.jsx`, and the desktop `Cv6QuickThread` path in `src/dashboard/cv6next/CornerCV6.jsx` show a connected-workspace read-only state locally instead of accepting text. Home quick-send only clears after a successful send, and mobile chat Back/Menu/Files controls now have explicit role/label/keyboard activation.

Verification: `CV6_AUDIT_BASE=http://127.0.0.1:5174 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests across desktop Home quick-chat, mobile chat room, and sibling CV6 surfaces). `npm run build` passed. Production check was read-only and stopped at login; no deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Chat room files workflow audit

Mission path: `corner:truth-contracts`.

Goal attempted: from an open CV6 chat room on desktop and mobile, open Files in this room, understand whether anything has been shared, return to the room, and continue through sibling CV6 tools without dead controls, stale data, misleading loading, extra navigation, or live-data mutation.

Audit findings ranked by frequency x severity x impact:

1. P1: Files is part of the core chat loop. The empty shelf was honest (`No files here yet.`), but the return controls were weaker than the workflow deserved: mobile's close icon had no accessible name or keyboard path, and the desktop in-place close was pointer-only.
2. P2: Empty-state clarity was otherwise clean locally; no stale file count, fake loading, or extra jump appeared in the no-Supabase room-files path.
3. P2: Authenticated production verification remains blocked. `https://aheadofmarket.com/dashboard` was opened in desktop Chrome for login, but the browser-control runtime fails with `Cannot redefine property: process`, and the debuggable Chrome profile visible to automation was only on a local file and `/cv4`.

Fix shipped locally: `src/dashboard/cv6next/ChatLifecycle.jsx` gives the mobile Room Files sheet close control an explicit `Close files` label, title, focus target, and Enter/Space activation. `src/dashboard/cv6next/CornerCV6.jsx` gives the desktop Home Files overlay close control the same label and keyboard return path. `tests/cv6-practical-audit.spec.mjs` now opens the room file shelf on desktop and mobile, verifies the empty state, closes via `Close files`, and then continues through sibling CV6 surfaces.

Verification: `CV6_AUDIT_BASE=http://127.0.0.1:5174 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests across desktop Home quick-chat, mobile chat room-files, and sibling CV6 tools). `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/member/data mutation.
