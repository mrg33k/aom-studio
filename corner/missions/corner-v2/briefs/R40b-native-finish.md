# Brief R40b-native-finish — finish R40-native: two red UI tests, the pending gates, the commit

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `briefs/R40-native-window-and-scroll.md` and `rounds/R40-native-window-and-scroll.md` (the previous
worker's report; it ran out of steps with gates PENDING and nothing committed). The R40 work sits
UNCOMMITTED in aom-studio `ios-native` (12 modified files + new `Corner/Data/V2FollowState.swift` +
`CornerTests/R40NativeWindowTests.swift`; evidence `rounds/evidence/R40-*.png`). Do not discard it. Report:
append a "## R40b finish" section to `rounds/R40-native-window-and-scroll.md` and fill in its PENDING gates.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## The orchestrator's verification of the uncommitted tree (2026-09-07 6:23-7:20 AM, iPhone 16e sim, each suite alone)
- Units 486/486 green. CompMatch 45 (1 skip), DesignMatch 5 (2 skip), VisualWindow 8/8, R32Wiring 8/8 green.
- `tools/native-design-vs-sim.mjs` 68/68 (first pass).
- **CornerV2Flow 12: 1 failure** — `testEarlierMessagesRowExpandsTheWindow`: "a full 200-row window shows no
  Earlier messages row" (log `/tmp/native-verify-r40/CornerV2FlowUITests.log`).
- **ComposerParity 14: 1 failure** — `testReplyQuote`: "no rendered quote card on the reply" (log
  `/tmp/native-verify-r40/ComposerParityUITests.log`). R40 deleted the local re-attach so the quote comes only
  from the server field; the fixture's fake API (`CornerTests/Support/CornerV2APIFake.swift` / the UI fixture
  feed) must echo `replyTo` on the sent block the way production does (`v2Native.threadEvents` text blocks
  carry `replyTo` since `a4fc532`). Fix the fixture to match production, not the app to match the fixture.

## Do
1. Make both tests green for the right reason (fixture parity for the quote; the Earlier row when exactly
   `limit` rows came back for the window test — check what the fixture returns for the 200 case).
2. Run the gates yourself, each suite alone: units, CompMatch, DesignMatch, VisualWindow, CornerV2Flow,
   ComposerParity, R32Wiring; `node tools/native-design-vs-sim.mjs` exit 0 twice; iPad ComposerParity +
   R32Wiring on `iPad Pro 13-inch (M5)`.
3. Commit on aom-studio with scoped paths: the 12 modified files, the 2 new sources, the regenerated
   `project.pbxproj`, the report, the R40 evidence PNGs, the punch-list P082 flip. Never push; never install
   to a device; simulators only.
4. Report: the two fixes (one sentence each), the filled gate numbers, the commit hash, "for the
   orchestrator" (phone reinstall), "still off and why".
