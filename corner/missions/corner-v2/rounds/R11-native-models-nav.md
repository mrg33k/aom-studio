# R11 — native typed models + API client (Task 3), Workspace → Project → Mission navigation (Task 4)

Mission `corner:corner-v2`. Worker: BUILDER, native plan Tasks 3 + 4
(plan `2026-09-05-corner-v2-native-ios.md` lines 343–533 + "Shared native
interfaces" lines 69–190). Native repo `AOM-EA/aom-studio/ios-native`, base
`773d4080`, two commits, no push. Nothing outside `ios-native/` touched
except this report + its evidence PNGs.

Commits (local only, never pushed):

- `bae96f8b feat(corner:corner-v2): add typed Corner v2 native API` (Task 3)
- `f4b322d6 feat(corner:corner-v2): navigate Corner by workspace project and mission` (Task 4)

## Task 3 — typed v2 models + API client

### Failing first (plan Step 2)

New files `CornerTests/CornerV2DTOTests.swift`,
`CornerTests/Support/Fixture.swift`,
`CornerTests/Support/CornerV2APIFake.swift`, fixture copy
`CornerTests/Fixtures/v2.native.fixture.json` (byte-identical to
`convex/contract/v2.native.fixture.json`, `cmp` clean), then `xcodegen
generate` + the plan's Step 2 command:

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/CornerV2DTOTests test 2>&1 | tail -5
```

```text
CornerTests/Support/Fixture.swift:39:47: error: cannot find type 'NativeFixture' in scope
CornerTests/Support/Fixture.swift:18:25: error: type 'JSONDecoder' has no member 'corner'
Testing failed:
        Cannot find type 'NativeFixture' in scope
** TEST FAILED **
```

(A first attempt also had a brace slip in the new `Fixture.swift`; fixed
before this run — the run above is the true fail-first record.)

### Implemented

- `Corner/Models/CornerV2DTO.swift` (new): every struct/enum from the shared
  interfaces block, plus `decisionId` on `RouteDecision` (R10 gap 1),
  `agentLabel` on `VisualWindowTab` (R10 gap 2), `EnsureWorkspaceResult`,
  `SubmitReviewResult` (`{checklistId, pins:[{clientId,id}]}` per R10 gap 4),
  `ConfirmProposalResult` (`{projectId,missionId,threadId}` — the real
  `confirmProposalCore` return), `NativeFixture`/`FixtureThread`,
  `BrainMention.parse(_:)`, `JSONDecoder.corner` (fractional-seconds ISO8601,
  plain fallback).
- `Corner/Services/CornerV2API.swift` (new): `protocol CornerV2API` (plan
  shape + `ensureWorkspace()`, `confirmProposal(decisionId:)`,
  `artifacts(threadID:)`, `pendingConfirmations()`,
  `subscribeWorkspace(receive:)`), `DefaultCornerV2API` over
  `ConvexService.request(_:as:)` / `requestOptional(_:as:)` (new, see
  deviations), `v2Native:*` endpoint factories. `send` posts only `text`,
  `mentioning`, and optional `preferredProjectId` — no user/room/agent id.
  `subscribeThread` is a polling loop on `threadEvents({after})` every 2 s
  with an ISO cursor + dedup accumulation, returning a `Cancellable`; a new
  subscription cancels the old one, so at most one thread polls at a time.
  (`ConvexService` has only the generic endpoint poller from R9, no
  WebSocket subscribe — verified by reading `ConvexService.swift` and
  `MessageTransport.swift`.)
- Deprecations: `RoomDTO`/`MessageDTO` as deprecated typealiases in
  `Corner/Models/Room.swift` (no such types existed — the legacy DTOs are
  `Room`/`MessageRow`), plus `@available(*, deprecated, message: "Corner v2:
  use CornerV2API")` on `CornerAPI.fetchMessages` and all 7 legacy `send`
  overloads. They keep working through the compatibility API until cutover.

### Gate (plan Step 5, `rg` absent so `grep -rn`)

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/CornerV2DTOTests test
# Test Suite 'CornerV2DTOTests' passed — Executed 7 tests, with 0 failures
grep -rn '@available(\*, deprecated.*RoomDTO\|@available(\*, deprecated.*MessageDTO' Corner
# Corner/Models/Room.swift:424: … (replaces RoomDTO) typealias RoomDTO = Room
# Corner/Models/Room.swift:425: … (replaces MessageDTO) typealias MessageDTO = MessageRow
xcodebuild … -only-testing:CornerTests test
# Test Suite 'All tests' passed — Executed 324 tests, with 0 failures (317 before + 7 new)
```

PASS. Committed per Step 6 plus the XcodeGen-regenerated
`Corner.xcodeproj/project.pbxproj` (fixture lands in the CornerTests
Resources phase — verified in the pbxproj — and the two new source files
join the app target).

### Plan-vs-backend discrepancies resolved (backend won every time)

| # | Plan says | Backend serves (`convex/v2Native.ts` + fixture) | Resolution |
|---|---|---|---|
| 1 | text block `{"type":"text","text"}` (Task 3 snippet) | `{"type":"text","value"}` | decode `value`; accept `text` as fallback |
| 2 | `RouteDecision` has no id | `decisionId` on every variant; `confirmProposal({decisionId})` | added `decisionId`; `confirmProposal` returns `{projectId,missionId,threadId}` |
| 3 | `VisualWindowTab` has no agent label | `agentLabel` resolved from the looking run's brain | added optional `agentLabel` |
| 4 | `submitReview` returns Void | `{checklistId, pins:[{clientId,id}]}`; per-pin `clientId` arg | added `SubmitReviewResult`; `ReviewPin.clientID` (encode-only) |
| 5 | `ReviewPin.artifactID` required | pins carry no `artifactID` (submitted per artifact) | optional, defaults nil |
| 6 | `workspaceTree`/`thread()` non-optional | `WorkspaceSummary \| null`, `Thread \| null` before ensure | API returns optionals; new `requestOptional` |
| 7 | plan test `route.mission.projectID` | mission proposals return `mission: null`, `project` = parent | test asserts `route.project.id == generalProjectID` |
| 8 | `success`/`snag` as first-class blocks | `toNativeBlocks` has no success/snag branch (question/steps/file/artifact/routing/system/text/legacy only); nothing in `tests/v2` seeds them | Swift still decodes both shapes (fixture has them), tolerant `stepIndex ?? 0` / `options ?? []` |
| 9 | `Thread` used unqualified | `Foundation.Thread` collides in test targets (app target resolves locally, test targets see two imports) | keep plan name; test files qualify `Corner.Thread` — Tasks 5–7 must do the same |
| 10 | plan Task-3 test 3 drives `VisualWindowStore` | no such type until the Visual Window task | deferred with note; DTO suite covers all 7 block types, anchors, dates, mentions instead |

### Deviations (Task 3)

1. `ConvexService.swift`: `request` now uses `JSONDecoder.corner`, plus new
   `requestOptional` for nullable queries; R9's minimal `WorkspaceSummary`
   stub removed (R9's own note said Task 3 expands it) and
   `ConvexServiceTests` uses a local `TransportProbe` — same assertions.
2. `subscribeWorkspace` added beside the brief's extra methods (the store
   needs a tree subscription; polls the subscribable query every 10 s).
3. ReviewPin `id` is omitted from the send payload when empty (new pins have
   no server id; sending `""` would fail the server lookup).
4. The plan's third snippet test (tab selection) is not included — it needs
   `VisualWindowStore`, which is a later task's file.

## Task 4 — Workspace → Project → Mission navigation

### Failing first (plan Step 2 + brief §Task 4.1)

```bash
xcodebuild … -only-testing:CornerTests/WorkspaceStoreTests test
```

```text
CornerTests/WorkspaceStoreTests.swift:13:21: error: cannot find 'WorkspaceStore' in scope
(... ×5)
Testing failed:
        Cannot find 'WorkspaceStore' in scope
** TEST FAILED **
```

(`CornerUITests/CornerV2FlowUITests.swift` compiled from the start — its
failure mode is runtime, covered below.)

### Implemented

- `WorkspaceStore` (in `Corner/Services/RoomStore.swift` — staging-driven
  placement, flagged for a move to its own file in Task 5+): `refresh()`
  calls `ensureWorkspace` once per sign-in then reads + subscribes to
  `workspaceTree`; `sendIntake(_:preferredProjectID:)` sends text +
  `BrainMention.parse(text)`; `confirmCreation` confirms + reloads;
  `context(threadID:)` / `project(id:)` / `mission(id:)` resolve owners from
  the tree; per-thread artifact counts for the Files rows (shown only when
  > 0); `signOutCleanup()` clears tree/poll/ensure flag (wired to world
  going nil in `RoomListView.onChange`).
- `Route` (the plan's `AppRoute` role — this codebase's enum is `Route`):
  `workspace`, `project(projectID:)`, `mission(missionID:)`,
  `visualTab(tabID:)`, `legacyArchive`, with `corner://project|mission|tab|
  archive` URL round-trips in `DeepLinkTarget`.
- `RoomListView`: signed-in home is the workspace tree (General first, with
  the normal projects, exactly once; expandable mission rows indented 28pt;
  per-project `Files · N` → Files, `+ New mission` focuses the global
  intake with project context; `Legacy archive` row). Global intake row
  (`global-intake-field`/`global-intake-send`); one-off proposals present
  the confirm sheet ("Create mission in General" for General) instead of
  creating; clarifications show reason + alternatives once. Agent filter,
  agent grid, and agent-room creation paths removed; legacy rooms (incl.
  agent rooms) only in `LegacyArchiveView` (search + type chips). Search
  filters the tree. The legacy room composer hides while the tree owns the
  home.
- `ChatView(thread:project:mission:)` (kept `init(room:)`): one surface,
  title `Project` / `Project / Mission` (`chat-title` identifier); model
  still legacy-backed via a compat room — Task 5 rewires it.
- `RootView`: `V2ProjectChatView` / `V2MissionChatView` loaders (tree +
  thread fetch, honest error + retry), `V2VisualTabView` (scans threads'
  sessions for the tab, opens the owning thread; "no longer open" fallback).
- Deployment switch (brief-required): `Config.convexBaseURL` /
  `ConvexService.baseURL` honor `CONVEX_BASE_URL` from the environment; no
  URL, token, or account in source or tests.

### The rehearsal blocker (verified, not assumed)

The brief's UI path assumes password sign-in works on the rehearsal copy.
It does not — the deployment is missing its token-signing key:

```bash
# POST https://adjoining-tiger-87.convex.cloud/api/action
# {"path":"auth:signIn","args":{"provider":"password","params":{…}}}
# 200 {'status': 'error', 'errorMessage': '[Request ID: 2da7da77…] Server Error
#   Uncaught Error: Missing environment variable `JWT_PRIVATE_KEY` …'}
```

So no client — app or script — can sign in to rehearsal until the backend
track runs `convex env set JWT_PRIVATE_KEY` there (live already has it).
Unauthenticated probes confirm all five `v2Native:*` paths resolve
(`Not signed in` / arg-validation, vs `Could not find public function` for
a bogus name), so the client's function names and arg keys are verified
against the real deployment:

```text
200 v2Native:workspaceTree -> … Not signed in …
200 v2Native:threadForProject -> … ArgumentValidationError …
200 v2Native:threadEvents -> … ArgumentValidationError …
200 v2Native:ensureWorkspace -> … Not signed in …
200 v2Native:send -> … Not signed in …
200 v2Native:noSuchFunction -> … Could not find public function …
```

### UI test, two modes

`CornerUITests/CornerV2FlowUITests.swift` implements the brief's flow
verbatim (General once, indented missions, project chat titled Project,
mission chat titled `Project / Mission`, no agent rows/filter, one-off →
"Create mission in General" instead of creating, screenshots to
`rounds/evidence/R11-native-<step>.png`).

- Default `V2_FIXTURE_STUB=1`: hermetic fixture mode — `-v2FixtureUITest`
  serves fixture-shaped data (General + Aster, no missions, mirroring the
  fixture) in-process with real intake → confirm → mission-appears
  behavior, synthetic session, no network/account. PASS (33.7 s), 6 PNGs.
- Rehearsal `V2_FIXTURE_STUB=0 CONVEX_BASE_URL=… TOUR_EMAIL/TOUR_PASSWORD=…
  `: attempted — fails at the tree wait because sign-in 500s (blocker
  above). Re-run command for after the backend fix (also needs a clean
  Keychain: `xcrun simctl uninstall <udid> com.aheadofmarket.corner` first,
  like `screenshot-tour.sh` does):

```bash
V2_FIXTURE_STUB=0 CONVEX_BASE_URL="https://<rehearsal-host>" \
TOUR_EMAIL="…" TOUR_PASSWORD="…" R11_EVIDENCE_DIR=/tmp/r11-evidence \
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerUITests/CornerV2FlowUITests test
```

### Gate (plan Step 5) + whole suite + tour

```bash
xcodebuild … -only-testing:CornerTests/WorkspaceStoreTests \
  -only-testing:CornerUITests/CornerV2FlowUITests test
# WorkspaceStoreTests: 5/5 pass; CornerV2FlowUITests (stub): 1/1 pass (33.7 s)
xcodebuild … -only-testing:CornerTests test
# All tests passed — Executed 333 tests, with 0 failures (324 + 5 store + 4 API)
scripts/screenshot-tour.sh "iPhone 17 Pro"
# attempt 1: build=0 test=65; attempt 2: build=0 test=65; 16 frames (see below)
```

Screen tour verdict: it RUNS (build clean, 16 frames, summary written) and
is not regressed — the Sep-5 baseline on the base commit already missed
`07-new-room-sheet` + `08-room` (plus 5 more then). One step update kept,
in `CornerUITests/ScreenTour.swift` (staged, reported below): the 02–04
swipes leave the list at the bottom where SwiftUI virtualizes the top
chips away, so step 07 scrolls back to top first. Effect: 6 → 16 frames,
and the New button is found now (the remaining 07-sheet/08-row misses are
the same baseline flakes — sheet timing against live, empty review queue,
live tracker/theme state — varying run to run, all pre-existing).
No step needed tree updates: on live (no `v2Native` functions) the home
falls back to the legacy rail, which the tour still drives.

Evidence (`rounds/evidence/`): `R11-native-01-workspace.png`,
`02-project-chat`, `02b-mission-confirm`, `02c-mission-created`,
`03-mission-chat`, `04-intake-confirm`. Note: `02b`==`04` and `02c`==`03`
pixel-identical (`cmp` clean) — the same screens honestly reached twice
(create-confirm then list-tap converge on one chat; stub copy is identical).

### Deviations (Task 4)

1. `WorkspaceStore`/`PreviewV2API` live in `RoomStore.swift`, loaders in
   `RootView.swift`, archive + confirm sheet in `RoomListView.swift` — no
   new production files, per the stage-only-listed-files rule.
2. `Route` gains the `AppRoute` cases instead of a new enum (same role).
3. Extra staged files beyond the Step-6 list, all brief-required:
   `Config.swift` + `ConvexService.swift` (deployment switch),
   `CornerAPI.swift` (Debug-only `installFixtureSession`),
   `CornerTests/CornerV2APITests.swift` (client-mapping tests: no forbidden
   keys on the wire, null tree → nil, raw fixture-bytes event decode,
   endpoint paths), `CornerUITests/ScreenTour.swift` (tour scroll fix).
4. Accessibility: identifiers on SwiftUI *containers* swallow row-button
   identifiers in this hierarchy (probed) — rows/name texts identify
   themselves; tests never identify containers.
5. Covered `List`s virtualize rows away — the test asserts post-create
   navigation first, list membership after navigating back. Same cause as
   the screen tour's step-07 flake (fixed there by scrolling to top first).
6. `+ New mission` focuses intake with project context rather than creating
   inline (creation goes through the proposal/confirm flow — there is no
   create-mission function); `Files · N` opens Files; both reported.
7. Extra staged file beyond the Step-6 list: `CornerUITests/ScreenTour.swift`
   (scroll-to-top before step 07 — see tour verdict above).
8. Sim hygiene: stub-mode runs save a dummy `uitest-fixture` session to the
   simulator Keychain; the tour's fresh-install + UI-sign-in path works
   around it, but a dirty sim explains "Keychain session survived" lines in
   tour summaries. Uninstall the app before forensic runs. One manual
   `simctl launch` probe (diagnosing the rehearsal failure) rendered a
   stale pre-existing Keychain session's legacy room read-only on-screen;
   nothing was tapped, sent, or written — screenshots only.

## What Task 5 will need

- `ChatViewModel.start(thread:project:mission:)` on `subscribeThread` +
  outbox keyed by thread/event id (compat room goes away; `pendingOutbox`
  on the fake is a placeholder array).
- Remove the header's "Switch specialist" agent menu (agent navigation's
  last remnant) and wire push/Live Activity to project/mission/visualTab
  routes.
- Move `WorkspaceStore` (+ `PreviewV2API`) to `Corner/Services/` files of
  their own; qualify `Thread` as `Corner.Thread` in test targets.
- Re-run the UI test with `V2_FIXTURE_STUB=0` after the backend track sets
  `JWT_PRIVATE_KEY` on the rehearsal deployment.
