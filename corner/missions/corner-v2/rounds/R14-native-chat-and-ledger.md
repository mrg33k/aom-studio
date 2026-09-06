# R14 — native v2 conversations without brain navigation (Task 5), routing provenance + activity ledger (Task 6)

Mission `corner:corner-v2`. Worker: BUILDER, native plan Tasks 5 + 6
(plan `2026-09-05-corner-v2-native-ios.md` lines 535–692).
Native repo `AOM-EA/aom-studio/ios-native`, base `f4b322d6` (found `809b2004`
on `main`; both Task commits land on top, local only, never pushed).
Nothing outside `ios-native/` touched except this report + its evidence PNGs.

Commits (local only, never pushed):

- `dde3eabd feat(corner:corner-v2): run Corner v2 mission conversations on native` (Task 5)
- `1e7e59eb feat(corner:corner-v2): surface Corner v2 routing provenance and ledger` (Task 6)

Mode verdict: **fixture mode** (`V2_FIXTURE_STUB=1`). The rehearsal
deployment still cannot sign in — verified, not assumed:

```bash
cd /Users/aom-inhouse/aom-studio-transfer/corner-v2-integration
npx convex env get JWT_PRIVATE_KEY --deployment adjoining-tiger-87
# ✖ Environment variable "JWT_PRIVATE_KEY" not found (on dev deployment adjoining-tiger-87)
```

Same blocker R11 hit. Re-run command for after the backend track sets the
key (also needs the demo-account email/password and a clean Keychain):

```bash
V2_FIXTURE_STUB=0 CONVEX_BASE_URL="https://<rehearsal-host>" \
TOUR_EMAIL="…" TOUR_PASSWORD="…" \
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerUITests/CornerV2FlowUITests test
```

All UI evidence below is on **iPhone 17 Pro** (sim `971E7446`, booted).
`iPhone SE (3rd generation)` and `iPad Pro 13-inch (M5)` exist shutdown;
the gates ran on 17 Pro per the plan. No Karen account, no `neat-pony-216`
touched anywhere. Never `git add -A`, never pushed, one xcodebuild at a time.

## Task 5 — reliable v2 conversations, no brain navigation

### Step 1–2: failing first

New `CornerTests/ChatViewModelV2Tests.swift` (6 tests: the plan's two plus
`testOfflineSendReplaysOnceAfterReconnect`,
`testPushRouteMapsToProjectMissionOrVisualTab`, an outbox-migration test,
and a subscription test), `xcodegen generate`, then the plan's Step 2
command:

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/ChatViewModelV2Tests test 2>&1 | tail -8
```

```text
** TEST FAILED **
SwiftCompile … Compiling ChatViewModelV2Tests.swift …/CornerTests/ChatViewModelV2Tests.swift (in target 'CornerTests' …)
```

FAIL as required (`V2ChatModel` / `V2OutboxStore` did not exist yet).

### Implemented (commit `dde3eabd`, 8 files, +1131/−55)

- `Corner/Views/ChatViewModel.swift` (+`import Combine`): new
  `V2ChatModel` (`start(thread:project:mission:)`, non-throwing `send(_:)`,
  `replayOutbox()`, `foreground()`, `stop()`), new disk-backed
  `V2OutboxStore` (one atomic JSON file keyed by thread id; `.memory` for
  tests) + `V2OutboxEntry` (`threadID` + `clientEventID` identity).
  `@brain` slugs go out as routing metadata only; the optimistic echo is
  reconciled by client event id; replay stops at the first failure so order
  survives; Live Activity begins on send and ends on the first agent event
  (or thread close) for the active thread only. One-time migration
  `migrateIfNeeded()` drops room-keyed legacy entries with an `NSLog` line,
  never replays them (see deviation 6).
- `Corner/Views/ChatView.swift`: v2 screen (`v2Screen`: titled events with
  agent labels, offline banner + Retry, `@brain`-only suggestion chip while
  editing, v2 composer). The "Switch specialist" agent menu is **removed on
  both paths** (header is now a settings button; Rename moved into the ⋯
  menu so its sheet stays reachable). All seven `ThreadBlock` cases render.
- `Corner/CornerApp.swift`: triggers the one-time outbox migration.
- `Corner/Services/PushService.swift`: APNs → `AppRoute` — flat
  `project_id` / `mission_id` / `tab_id` keys plus
  `corner://project|mission|tab` deep links (`v2Route(userInfo:)`; tab >
  mission > project). Legacy room/rail behavior byte-identical.
- `Corner/Services/RoomStore.swift` (extra file, see deviation 3):
  `WorkspaceStore.v2api` accessor + `PreviewV2API` chat behavior (shared
  event buffer, mention-aware agent reply, `-v2FailNextSends=N`,
  `-v2RouteMode=confirm`).
- UI tests: `testV2ChatSendShowsAgentLabel`, `testV2OfflineQueueBannerAndReplay`
  (terminate → relaunch → disk-outbox replay, banner clears).

### Step 5 gate — PASS

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/ChatViewModelV2Tests \
  -only-testing:CornerUITests/CornerV2FlowUITests test
```

```text
Test Suite 'ChatViewModelV2Tests' passed … (6/6)
Test Suite 'CornerV2FlowUITests' passed … (3/3: send+label, offline+replay, legacy flow)
** TEST SUCCEEDED **
```

Whole `CornerTests` suite after Task 6 (regression check): **345/345 pass**
(333 pre-existing + 12 new), `Test Suite 'All tests' passed`.

Evidence (`rounds/evidence/`, iPhone 17 Pro):

- `R14-native-05-send-reply.png` — `@research` send, `Research` agent label
  + "I found three competitors.", title still `General`, no agent rows.
- `R14-native-06-offline-queue.png` — optimistic echo + "Offline — 1 message
  waiting. It sends on reconnect." + Retry.
- `R14-native-06b-offline-replayed.png` — after relaunch: message sent,
  banner gone.

### Step 6 — committed per the brief's message

```bash
git add Corner/Views/ChatViewModel.swift Corner/Views/ChatView.swift Corner/CornerApp.swift \
  Corner/Services/PushService.swift Corner/Services/RoomStore.swift \
  CornerTests/ChatViewModelV2Tests.swift CornerUITests/CornerV2FlowUITests.swift \
  Corner.xcodeproj/project.pbxproj
git commit -m "feat(corner:corner-v2): run Corner v2 mission conversations on native"
# [main dde3eabd] feat(corner:corner-v2): run Corner v2 mission conversations on native
#  8 files changed, 1131 insertions(+), 55 deletions(-)
```

### Task 5 deviations

1. `V2ChatModel` is a new type in `ChatViewModel.swift`, not v2 mode on
   `ChatViewModel`: the legacy model is a room-based `MessageTransport`
   client and keeps its contract + tests. The plan's interface
   (`start(thread:project:mission:)` / `send(_:)`) is implemented verbatim
   modulo the type name.
2. `send(_:)` is non-throwing: failures park in the outbox by design (there
   is no throw a caller could act on that the banner + Retry don't cover).
3. `Corner/Services/RoomStore.swift` staged extra: `WorkspaceStore.v2api`
   (chat shares the store's backend incl. the fixture stub) and the
   `PreviewV2API` chat extensions live in this file — there is nowhere else
   they can live.
4. `CornerApp.swift` change is the migration trigger only: push routing
   already funnels every tap through `router.handle`, so no other app-level
   change exists to make.
5. Push mapping covers flat `project_id`/`mission_id`/`tab_id` keys the
   server does not send yet (future non-room push lane) + the `corner://`
   URL forms that already resolved. Pinned by test, harmless until used.
6. Migration: no room→thread mapping table exists, so EVERY legacy entry is
   unmappable — all dropped with a log line, none replayed, flag
   `v2outbox.migrated.v1` makes it one-time. Unit-tested with temp dirs.
7. Accessibility finding (extends R11 §Deviations 4–5): an identifier on
   ANY ancestor view overwrites every identified control below it
   (measured via hierarchy dump: composer field + send button both read back
   as the container id). Identifiers now live on leaves only (`chat-screen`
   is the toolbar subtitle; banner/route/confirm markers are leaf texts;
   event rows carry no container id). The v2 screen renders zero container
   identifiers.
8. Fixture stub serves one shared chat-event buffer for all threads (it
   drives one chat at a time; per-thread partitions would hide the relaunch
   replay the offline test asserts). Documented in code; revisit in Task 7.
9. Header switcher removed on the legacy path too (it was agent navigation
   state, forbidden in whole); v2 screen has no Files/Settings entries
   (files stay on the tree's `Files · N` rows; settings is room-scoped
   legacy UI).
10. Evidence reached `rounds/evidence/` by copy: `EVIDENCE_PREFIX` /
    `R14_EVIDENCE_DIR` set on the `xcodebuild` environment never arrived in
    the test process (files landed under the `/tmp/r11-evidence` default
    with the `R11-native` prefix). The helper honors them if ever forwarded.

## Task 6 — routing provenance, cross-Project confirmation, ledger

### Step 1–2: failing first

New `CornerTests/LedgerStoreTests.swift` (3 tests, real kinds) + 3 new
`ChatViewModelV2Tests` tests (confirmation consume-once, expiry, learned
provenance), `xcodegen generate`, then the plan's Step 2 command:

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/ChatViewModelV2Tests \
  -only-testing:CornerTests/LedgerStoreTests test 2>&1 | grep -E "error:|TEST" | head -5
```

```text
CornerTests/LedgerStoreTests.swift:33:21: error: cannot find 'LedgerStore' in scope
(+ 8 follow-on errors, ChatViewModelV2Tests confirmation/provenance members)
** TEST FAILED **
```

FAIL as required.

### Implemented (commit `1e7e59eb`, 11 files)

- `Corner/Services/CornerV2API.swift`: `CornerV2Error`
  (`.expiredConfirmation` / `.confirmationConsumed`).
- `ChatViewModel.swift` (`V2ChatModel`): `pendingConfirmation`
  (this thread's live confirmation, expiry-filtered),
  `confirmCrossProjectWrite(_:)` (expiry guard → one network write →
  card cleared; repeats throw), `ledgerProvenance` (`learned` items whose
  subjects name the thread/mission/project). Both load in `start()`;
  failures mean "no card", never an error screen.
- `Corner/Stores/LedgerStore.swift` (new): `refresh(workspaceID:after:)`
  replaces from `v2Native:ledger`; `realKinds`; no write surface of any
  kind — history is never manufactured locally.
- `Corner/Views/LedgerActivityView.swift` (new): kind + description +
  actor/surface rows; Close button; loads the shared workspace id.
- `ChatView.swift`: route card (`Project > Mission` + reason + Move;
  creation-confirm text; clarification shows reason with NO Move),
  confirmation card (summary + Confirm; disappears on success), Sources
  disclosure (description + subjectIDs). Move on a confident route opens
  the destination thread's project/mission; Move on a proposal confirms
  via `WorkspaceStore.confirmCreation` then opens what the server created.
- `Corner/Views/RoomListView.swift` (extra file, see deviation 1):
  `Activity` row in the home (hamburger) menu + sheet. Never from a room —
  no chat screen links to it.
- `RoomStore.swift` (stub only): `-v2SeedLedger` (did + learned items),
  `-v2SeedConfirmation` (one live Aster→Northwind confirmation, consumed on
  confirm), Ship-mission seeding in `-v2RouteMode=confirm` so Move resolves
  through the same `context(threadID:)` lookup as prod.
- UI tests: `testV2RouteBlockWithMove` (card → Move → `Aster / Ship home
  page`), `testV2ConfirmationCardConfirmsOnce` (card → Confirm →
  disappears), `testV2ActivityListsLedger` (menu → Activity → ≥2 items).

### Step 5 gate — PASS

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/ChatViewModelV2Tests \
  -only-testing:CornerTests/LedgerStoreTests \
  -only-testing:CornerUITests/CornerV2FlowUITests test
```

```text
Test Suite 'ChatViewModelV2Tests' passed … (9/9)
Test Suite 'LedgerStoreTests' passed … (3/3)
Test Suite 'CornerV2FlowUITests' passed … (6/6: 3 Task-6 flows + 2 Task-5 + legacy flow)
** TEST SUCCEEDED **
```

One real UI failure on the way, fixed honestly: the confirmation test's
named-project lookup matched zero rows (measured in-test: 2
`workspace-project-row`s but only 1 `workspace-project-name` — the row
button's own identifier swallows the inner name text on every row but the
first). The helper now matches rows by their accessible label (the project
name), which buttons keep. No app code changed for this; assertion output
before/after is in `/tmp/r14-dbg3.log` and `/tmp/r14-confirm2.log`.

Evidence (`rounds/evidence/`, iPhone 17 Pro):

- `R14-native-07-route-block.png` — `Aster > Ship home page` + reason + Move.
- `R14-native-07b-route-moved.png` — `Aster / Ship home page` after Move.
- `R14-native-08-confirm-card.png` — `Confirm cross-project write` +
  `update brief: Set primary to #5B9BFF` + Confirm.
- `R14-native-08b-confirm-done.png` — card gone after confirming.
- `R14-native-09-activity.png` — DID + LEARNED rows with sentences.

### Step 6 — committed per the brief's message

```bash
git add Corner/Services/CornerV2API.swift Corner/Views/ChatViewModel.swift Corner/Views/ChatView.swift \
  Corner/Stores/LedgerStore.swift Corner/Views/LedgerActivityView.swift \
  CornerTests/LedgerStoreTests.swift CornerTests/ChatViewModelV2Tests.swift \
  CornerUITests/CornerV2FlowUITests.swift Corner/Services/RoomStore.swift \
  Corner/Views/RoomListView.swift Corner.xcodeproj/project.pbxproj
git commit -m "feat(corner:corner-v2): surface Corner v2 routing provenance and ledger"
# [main 1e7e59eb] feat(corner:corner-v2): surface Corner v2 routing provenance and ledger
```

### Task 6 deviations

1. `Corner/Views/RoomListView.swift` staged extra: the brief requires the
   Activity surface "reachable from the tree list's footer/gear area" and
   the plan names no file for that — the home-menu row + sheet is the
   minimal honest placement (menu, not a room row: the ledger is workspace
   truth, not conversation content).
2. `RoomStore.swift` stub seeds (ledger/confirmation/Ship) are test-only
   branches behind launch args; default stub behavior is unchanged (the
   legacy R11 flow test passes unmodified).
3. No container identifiers on route/confirm/ledger cards (leaf-only, per
   the Task 5 accessibility finding); tests address `route-title`,
   `route-reason`, `route-move`, `confirm-summary`, `confirm-write`,
   `ledger-item` leaves. Card presence = leaf presence; disappearance =
   `confirm-write` gone.
4. Second confirm throws `.confirmationConsumed` (the plan snippet only
   asserts "throws"); expiry throws `.expiredConfirmation` before any
   network touch, and the fake records zero writes.
5. `LedgerStore.refresh` replaces (plan literal); `after` passes straight
   through (it is an ISO-date cursor server-side, not an event id).
6. Move is hidden for `needsClarification` (no single destination); route
   rendering reads the send-returned `RouteDecision`, not events — the
   backend's `toNativeBlocks` collapses `routing` entries to
   `{"type":"text","value":"Routed to …"}` (see table row 3).
7. Provenance tie matches thread id OR mission/project id against
   `subjectIDs` (backend subjects are slugs like `aster` in the fixture;
   matching any owner id keeps thread-tied reads visible without
   over-claiming).

## Plan-vs-backend discrepancies (backend won every time)

| # | Plan says | Backend serves (`convex/v2Native.ts`, `convex/ledger.ts`, fixture) | Resolution |
|---|---|---|---|
| 1 | `testLedgerExcludesTypingAndTokenEvents` asserts `route_changed` / `artifact_created` kinds | `KINDS = [did decided asked learned started finished sent spent]`; route/artifact meaning rides `description` + `subjectIDs` | Tests assert the 8 real kinds + sentence-shaped, typing/token-free descriptions |
| 2 | `proposeCrossProjectWrite()` returns a confirmation to confirm | No propose mutation; `pendingConfirmations({})` query lists live ones; `confirmCrossProjectWrite({id})` consumes | `start()` picks up the thread's live confirmation; test refreshes-then-confirms |
| 3 | Route block renders from the event stream | `toNativeBlocks` has no routing branch — `routing` kind → `{"type":"text","value":"Routed to …"}`; the full `RouteDecision` (+`decisionId`) comes from the `send` return | Route card renders `lastDecision` from the send return, inline, never navigated unasked |
| 4 | `send` in a thread stays in the thread | Native `send` takes no `threadId` (plan interface); thread-scoped stay-put needs the optional `threadId` arg the native client never passes | Kept the plan's `send(text:mentioning:preferredProjectID:)`; global route verdict renders as the card |
| 5 | `CrossProjectWriteConfirmation` fields as used | `{id, sourceThreadID, destinationThreadID, summary, expiresAt}` (`summary` = `"action: change"`, expiry server-filtered) | Decoded as-is; client re-filters expired + foreign-thread rows |
| 6 | `ledger(workspaceID:after:)` cursor is an event id | `after` is an ISO-date string (`new Date(after)`; default 7 days; newest-first, superseded dropped, 50 cap) | Passed through opaquely; `LedgerStore` exposes the same signature |
| 7 | `ChatViewModel(api:outbox:)` test constructor | N/A (native-side): the legacy `ChatViewModel(room:transport:…)` contract + its tests exist | `V2ChatModel(api:outbox:)` implements the plan interface (see Task 5 deviation 1) |
| 8 | Plan Step 6 messages `feat: …` (no scope) | Repo convention carries the mission scope | Brief's `feat(corner:corner-v2): …` messages used for both commits |
| 9 | `Thread` usable unqualified in tests | `Foundation.Thread` collides in test targets (R11 #9, still true) | `Corner.Thread` qualified in both test files |
| 10 | `route_changed`/`artifact_created` render in Activity | Only the 8 kinds render; the two seed items are `did` + `learned` whose descriptions carry the scoped/mission meaning | Activity renders kind + description + actor/surface; no kind invented client-side |

## What Task 7 (Visual Window) will need

- `Thread.visualSessionID` already flows to the chat (`V2ChatContext.thread`
  carries it); `DefaultCornerV2API` already implements
  `visualTabs/openVisualTab/closeVisualTab/artifacts/submitReview`.
- `PreviewV2API.visualTabs` returns `[]` and `openVisualTab` throws
  `unconfiguredFakeOperation` — Task 7 UI tests will need seeded tabs +
  an `openTab` echo (same launch-arg pattern as `-v2SeedLedger`).
- The stub's single shared chat-event buffer must become per-thread once
  Task 7 drives two threads in one run (documented Task 5 deviation 8).
- Artifact blocks currently render as "N attachments" lines in
  `V2BlockView`; the v2 chat has no Files entry point (tree rows own that)
  — Task 7 decides whether artifact blocks deep-link to tabs
  (`Route.visualTab` already exists and the push mapping test pins it).
- `V2VisualTabView` resolves a tab by scanning every thread's session today
  — O(threads × tabs) queries per deep link; fine for now, revisit if the
  tree grows.
- Re-run this round's UI suite with `V2_FIXTURE_STUB=0` once
  `JWT_PRIVATE_KEY` lands on `adjoining-tiger-87` (still absent — the one
  blocker, owned by the backend track, unchanged since R11).
- Full-suite state at handoff: `CornerTests` 345/345 green on
  `1e7e59eb`; `CornerV2FlowUITests` 6/6 green in fixture mode; working tree
  clean inside `ios-native/` (`git status --short .` empty after both
  commits); never pushed.
