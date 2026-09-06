# Brief R14-native-chat-and-ledger — reliable v2 conversations without brain navigation, then routing provenance, cross-Project confirmation, and the activity ledger (native plan Tasks 5 + 6)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `rounds/R11-native-models-nav.md` (what exists: DTOs,
`DefaultCornerV2API`, `CornerV2APIFake`, `WorkspaceStore`, routes, the tree list, ChatView inputs,
the fixture/rehearsal switch `V2_FIXTURE_STUB`, the `Corner.Thread` qualification), and the R10
backend report (`decisionId`, subscribable reads, `submitReview` shape). Write your report to
`rounds/R14-native-chat-and-ledger.md`: every command with its output.

You are a headless worker, the BUILDER for native plan Tasks 5 and 6. Nobody will answer questions.

Plan: Tasks 5 and 6 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-native-ios.md`
(lines 535-692). Backend JSON wins over the plan's Swift snippets; table every discrepancy.

## Where things are, exactly

- Native repo `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native`, HEAD
  `f4b322d6` or later, clean. XcodeGen; regenerate on new files; one xcodebuild at a time;
  simulators `iPhone 17 Pro` / `iPhone SE (3rd generation)` / `iPad Pro 13-inch (M5)`.
- Backend: `convex/v2Native.ts` in `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`
  is the contract. `threadEvents({ threadId, after? })` is a reactive query (subscribe = poll with
  `after` if no WS client; R11 chose one; keep it). `send` returns `RouteDecision` with `decisionId`;
  `confirmProposal({ decisionId })`; `pendingConfirmations({})`, `confirmCrossProjectWrite({ id })`;
  `ledger({ workspaceId, after? })` → `LedgerItem[]` whose `kind` is one of `did decided asked
  learned started finished sent spent` (the plan's `route_changed`/`artifact_created` are NOT kinds
  the backend emits; the ledger's `description` sentence + `subjectIDs` carry that meaning; adapt
  the plan's `testLedgerExcludesTypingAndTokenEvents` to assert the real kinds and that no item's
  description is a raw chat line or a token/typing event).
- Rehearsal deployment (`adjoining-tiger-87`) now has live's env vars (sign-in works there once
  `JWT_PRIVATE_KEY` is present; check `npx convex env get JWT_PRIVATE_KEY --deployment
  adjoining-tiger-87 | wc -c` from the web worktree: > 1000 bytes means present). If present, run
  the UI tests in rehearsal mode (`V2_FIXTURE_STUB=0`) with the demo account; if absent, fixture
  mode, and say so.
- Nobody else is in `ios-native/`. A web worker may be in the web worktree; you never touch it.
  Never push. Stage only the plan's listed files (+ regenerated `project.pbxproj`).

## Task 5 (plan Steps 1-6)

Failing tests first (`CornerTests/ChatViewModelV2Tests.swift`, the plan's two plus:
`testOfflineSendReplaysOnceAfterReconnect` (outbox keyed by `threadID` + client event id; the
fake rejects with `.notConnectedToInternet` twice then accepts; exactly one server send),
`testPushRouteMapsToProjectMissionOrVisualTab`). Then implement: `ChatViewModel.start(thread:
project:mission:)` (events load + subscription + outbox replay), `send(_:)` (parses `@brain`,
sends routing metadata only, optimistic event, outbox on failure), visible agent labels, no agent
navigation state, Live Activity mapped only to the active thread's run, APNs → `AppRoute`. Keep the
disk-backed outbox; migrate its keys from room ids to `threadID` + client event id (one-time
migration on first launch; old entries with no thread mapping are dropped with a log line, never
replayed to a wrong thread). Gate per plan Step 5; commit per Step 6
(`feat(corner:corner-v2): run Corner v2 mission conversations on native`).

## Task 6 (plan Steps 1-6)

Failing tests first (`CornerTests/LedgerStoreTests.swift` adapted to real kinds;
`ChatViewModelV2Tests` confirmation test; UI flow: a route block shows `Project > Mission` + reason
+ Move; a pending confirmation card confirms once and disappears; the Activity screen lists ledger
items). Implement: route block rendering, provenance chips on cross-Project reads (`ProvenanceLink`
from the desktop shape is not in the native contract; render the `description` + `subjectIDs` of
`learned` ledger items tied to the thread, and say so), `confirmCrossProjectWrite` with the expiry
guard, `LedgerStore`, `LedgerActivityView` (reachable from the tree list's footer/gear area, never
from a room). Gate per plan Step 5; commit per Step 6
(`feat(corner:corner-v2): surface Corner v2 routing provenance and ledger`).

Evidence: `rounds/evidence/R14-native-<step>.png` for send/reply with agent label, offline queue
banner, route block with Move, confirmation card, Activity list; on iPhone 17 Pro.

## Report `rounds/R14-native-chat-and-ledger.md`

Per task: failing then passing runs, gate lines (unit + UI), evidence, the plan-vs-backend table,
deviations, what Task 7 (Visual Window) will need.

## Hard rules

Never edit outside `ios-native/`. Never push. One xcodebuild at a time. Never use Karen's account
or `neat-pony-216`. Never send a user id, room id, or agent id from the client. Never manufacture
ledger history locally. Never `git add -A`.
