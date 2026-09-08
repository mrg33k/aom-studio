# Brief R42b-native-finish — finish R42: gates on the uncommitted tree, fix the reds, commit

Mission: `corner:corner-v2` (native lane). Folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`.
Read `briefs/R42-native-cv6-composer-bubbles-loader.md` (the round). The previous worker went idle for two hours
after its last edit (2:44 PM) and never ran gates or committed. Its work sits UNCOMMITTED in aom-studio
`ios-native` (`git status`: ~9 files incl. `Corner/Views/ChatView.swift`, `Corner/Views/V2CV6Polish.swift`,
`CornerUITests/CompMatchUITests.swift`). Do not discard it. Report: `rounds/R42-native-cv6-composer-bubbles-loader.md`
(write it fresh: what shipped per item P089-P093, gates, commit, "still off").
Automated runs: iPhone 17 Pro `971E7446-394B-4EF6-9796-8D9D1F916994`, the 390 test sim "iPhone 16e (tests)"
`4818124A-CCAF-4386-9970-85F17A660AC7`, iPad — NEVER Patrik's 16e `0A05C9AA-9835-4C66-BF7A-9B4CF15AD80D`.
Before suites on a test sim: terminate + uninstall the app and
`xcrun simctl spawn <sim> defaults delete com.aheadofmarket.corner cv6-theme`.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

1. Read the diff (`git diff`) and finish what is half-done against the brief's five items; keep changes
   scoped to the composer, command menu, thread rows, loader, and glow.
2. Gates: units; the UI suites alone (CompMatch, DesignMatch, VisualWindow, CornerV2Flow, ComposerParity,
   R32Wiring, R41HomeWelcome); `node tools/native-design-vs-sim.mjs` exit 0 twice; iPad column.
3. Commit on aom-studio with scoped paths + regenerated `project.pbxproj`; never push; simulators only.
4. Report with side-by-sides (design | sim) per item, gates, commit hash, "for the orchestrator" (TestFlight
   ship), "still off and why". Budget: finish within 400 steps; if a gate cannot go green, commit what is
   green and say exactly what is red.
