# Brief R11-native-models-nav — typed v2 models + API client, then Workspace → Project → Mission navigation on the native app (native plan Tasks 3 + 4)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `rounds/R9-native-transport.md` (what `ConvexService` /
`ConvexAuth` now look like), `rounds/R9-backend-native-contract.md` and
`rounds/R10-backend-native-gaps.md` (the exact JSON the backend serves, including the final
`decisionId`, `submitReview` and subscribable-read shapes). Write your report to
`rounds/R11-native-models-nav.md`: every command with its output.

You are a headless worker, the BUILDER for native plan Tasks 3 and 4. Nobody will answer questions.

Plan: Tasks 3 and 4 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-native-ios.md`
(lines 343-533) and the "Shared native interfaces" block (lines 69-190). Where the plan's Swift
snippets and the backend's real JSON disagree, the BACKEND JSON wins (it is what ships); note each
such case.

## Where things are, exactly

- Native repo: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native` (inside the
  aom-studio git repo, HEAD `773d4080` or later; `ios-native/` is clean). XcodeGen `project.yml` →
  `Corner.xcodeproj`; if you add source files outside the existing target globs, regenerate with
  `xcodegen generate` and paste the diff. Simulators: `iPhone 17 Pro`, `iPhone SE (3rd
  generation)`, `iPad Pro 13-inch (M5)`, iOS 26.3. One xcodebuild at a time.
- Backend contract, served by the rehearsal deployment `https://adjoining-tiger-87.convex.cloud`
  (a full copy of live with v2 pushed; expires 2026-09-10): `convex/v2Native.ts` in
  `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration` (read it; it is the truth), the
  fixture `convex/contract/v2.native.fixture.json` (copy it to
  `CornerTests/Fixtures/v2.native.fixture.json`; do not edit it). Functions: `ensureWorkspace`
  (mutation, once after sign-in), `workspaceTree` (query, `WorkspaceSummary | null`),
  `threadForProject` / `threadForMission` (queries, `Thread | null`), `threadEvents({ threadId,
  after? })` (query), `send({ threadId?, text, mentioning, preferredProjectId? })` (mutation →
  `RouteDecision` WITH `decisionId`), `confirmProposal({ decisionId })`, `visualTabs({
  visualSessionId })` (query), `openVisualTab`, `closeVisualTab`, `artifacts({ threadId })` (query),
  `submitReview({ artifactId, pins: [{ clientId?, anchor, text, isDone }] })` → `{ checklistId,
  pins: [{ clientId, id }] }`, `ledger({ workspaceId, after? })` (query), `pendingConfirmations`
  (query), `confirmCrossProjectWrite({ id })`. Block tags: `{ "type": "text", "value": "…" }`
  (NOT `text` as the plan's snippet says), `question` `{ id, text, options }`, `steps`, `success`,
  `snag`, `artifact` `{ artifactIDs }`, `checklist` `{ pinIDs }`. Pin anchors tagged `{ "type":
  "point" | "time" | "line", ... }`. Dates ISO-8601 strings → `JSONDecoder.corner` with a
  fractional-seconds ISO8601 strategy.
- Subscriptions: Convex reactive queries are the push primitive. If `ConvexService` has no
  WebSocket subscribe today (check `Corner/Services/ConvexService.swift` and `MessageTransport.swift`
  for an existing `subscribe`/`watch`), implement `subscribeThread` as a polling loop on
  `threadEvents({ after: <last ISO> })` every 2 s while the thread is active, returning a
  `Cancellable`; say so in the report. Never poll more than one thread at a time.
- Test account for UI tests: the demo account already committed in
  `CornerUITests/ScreenshotCapture.swift` + `ios-native/.tour.env` (untracked; read how
  `scripts/screenshot-tour.sh` injects it). Point the UI test run at the REHEARSAL deployment
  (read `Corner/Services/DebugAuth.swift` / the app's Convex URL configuration for the switch; it
  is an env var or an Info.plist key; paste which). Never use Karen's account; never point at
  `neat-pony-216`. If the demo account has no v2 projects on the rehearsal copy, the UI test first
  calls `ensureWorkspace` through the app's sign-in path and creates one project + one mission
  through the UI; that is the fixture.
- A backend worker may be running in the web worktree; you never touch anything outside
  `ios-native/` except your report. Never push. Stage only the files the plan's Step 6 lists (plus
  any XcodeGen-regenerated `Corner.xcodeproj/project.pbxproj`).

## Task 3

1. Failing tests: `CornerTests/CornerV2DTOTests.swift` with the plan's three tests (adapt the block
   JSON in the first test to the `value` key; keep the assertions), `CornerTests/Support/Fixture.swift`,
   `CornerTests/Support/CornerV2APIFake.swift` (closure-backed, every unconfigured op throws
   `CornerV2APIError.unconfiguredFakeOperation`, inspectable `sentMentions`, `submittedPins`,
   `confirmedWriteIDs`, `pendingOutbox`). Run the plan's Step 2 command; paste the failure.
2. Implement `Corner/Models/CornerV2DTO.swift` (every struct/enum from the shared interfaces
   block, plus `decisionId` on `RouteDecision`, `agentLabel` on `VisualWindowTab`, the
   `submitReview` result type, `NativeFixture`/`FixtureThread`), `Corner/Services/CornerV2API.swift`
   (`protocol CornerV2API` from the plan plus `ensureWorkspace()`, `confirmProposal(decisionId:)`,
   `artifacts(threadID:)`, `pendingConfirmations()`; `DefaultCornerV2API` over
   `ConvexService.request(_:as:)`; `send` sends only text, parsed `@brain` slugs, and an optional
   preferred project id; `BrainMention.parse(_:)`). Deprecate `RoomDTO`/`MessageDTO`/legacy
   `CornerAPI` methods with `@available(*, deprecated, message: "Corner v2: use CornerV2API")`;
   they keep working through the backend compatibility API until cutover.
3. Run the plan's Step 5 gate (use `grep -rn` if `rg` is missing). PASS. Commit per Step 6
   (`git -C /Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio add ios-native/<paths>` then
   commit; message `feat(corner:corner-v2): add typed Corner v2 native API`).

## Task 4

1. Failing tests: `CornerTests/WorkspaceStoreTests.swift` (the plan's two tests, with
   `CornerV2APIFake` presets `.proposedGeneralMission` and `.ambiguousAsterOrNorthwind` built from
   the fixture), `CornerUITests/CornerV2FlowUITests.swift` (sign in → the list shows General once
   and the project rows with missions indented; tapping a project opens the chat titled with the
   project; tapping a mission opens the chat titled `Project / Mission`; no agent rows anywhere;
   typing an unrelated one-off in the global intake shows a "Create mission in General"
   confirmation instead of creating; screenshots of each step to
   `rounds/evidence/R11-native-<step>.png` via the existing `ScreenshotCapture` helper). Run;
   paste the failures.
2. Implement: `WorkspaceStore` (replaces `RoomStore`'s list role; keeps cache invalidation at
   sign-out; `refresh()` calls `ensureWorkspace` once then subscribes to `workspaceTree`),
   `AppRoute` cases (`workspace`, `project(projectID:)`, `mission(missionID:)`,
   `visualTab(tabID:)`, `legacyArchive`), `RoomListView` → workspace tree (General with the normal
   projects, projects expandable to mission rows, `Files · N` and `+ New mission` rows like desktop
   R5, no agent filter, no agent-room creation, legacy rooms only behind `AppRoute.legacyArchive`
   search), `ChatView` receives `Thread` + `ProjectSummary` + `MissionSummary?` (title `Project` or
   `Project / Mission`; one surface for both; do not touch the message rendering beyond what the
   new inputs require, Task 5 does the rest).
3. Run the plan's Step 5 gate (unit + UI). PASS. Then the whole unit suite must stay green
   (`-only-testing:CornerTests`), and `scripts/screenshot-tour.sh` (the existing screen tour) must
   still run; if it depends on the old room list, update its steps to the tree and say so.
4. Commit per the plan's Step 6 (`feat(corner:corner-v2): navigate Corner by workspace project and
   mission`).

## Report `rounds/R11-native-models-nav.md`

Per task: failing then passing runs, gate lines, the plan-vs-backend JSON discrepancies you
resolved (table), the Convex URL switch you used, evidence paths, deviations, and what Task 5
will need.

## Hard rules

Never edit outside `ios-native/`. Never push. Never run two xcodebuilds at once. Never use
Karen's account or `neat-pony-216`. Never send a user id, room id, or agent id from the client.
Never put a URL, token, or account in source or tests (the env/plist switch is fine). Never
`git add -A`.
