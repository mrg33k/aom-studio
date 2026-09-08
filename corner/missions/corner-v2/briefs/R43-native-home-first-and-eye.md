# Brief R43-native-home-first-and-eye — the app opens on the home screen, cards are distinct projects, and the eye icon cycles the Visual Window

Mission: `corner:corner-v2` (native lane). Folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`.
Read `LOOP.md`, `rounds/R41-native-home-welcome.md` and `rounds/R42-native-cv6-composer-bubbles-loader.md` (the
rounds you extend), `SPEC-visual-window-companion.md` (Patrik's spec), `punch-list.md` rows **P094-P097**.
Automated runs: iPhone 17 Pro `971E7446-…`, the 390 test sim "iPhone 16e (tests)" `4818124A-…`, iPad — NEVER
Patrik's 16e `0A05C9AA-…`. Report: `rounds/R43-native-home-first-and-eye.md`.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## Patrik (3:10 PM): "The app always opens in the Wolfpack conversation. Should open at the home screen."
1. **P097 — entry = home.** Every cold launch and every foreground-after-long-background lands on the home
   screen (the General welcome from R41), not the last thread. The last thread stays one tap away (Recent
   + the home cards). Deep links / notifications still open their thread. R23's "entry is the thread" rule is
   replaced by this; update its tests and the design gate's entry assertions.
2. **P096 — distinct cards.** The three home cards are three DISTINCT subjects (freshest first); pad with the
   onboarding rows when the world has fewer; never the same project twice.
3. **P094/P095 — the eye icon (client side).** Top-right of every chat: tap 1 → FaceTime mode (a small
   floating window top-right, ~110×160pt, showing the current tab live, draggable within the safe area);
   tap 2 → the full drawer context window (today's sheet); tap 3 → hidden (icon stays). The mode persists
   per thread. When the agent adds/opens an artifact while hidden, the window comes back in FaceTime mode
   (agent-driven open). Website tabs in FaceTime/full mode render the desktop page like a horizontal video
   on the vertical phone (about a third of the screen tall, scrollable inside).
4. Unit + UI tests for the entry rule, the distinct-cards rule, the eye cycle and persistence; gate anchors
   for the eye icon position and the FaceTime window box.

Gates (targeted, per Patrik 8:30 PM): units; ONLY the UI suites that cover the screens you touched (home,
entry, the eye/Visual Window) + yours; `node tools/native-design-vs-sim.mjs` ONCE on the 390 test sim. No
full suite set, no second gate pass, no iPad column — the orchestrator runs those once before the TestFlight ship. Stage scoped paths + regenerated `project.pbxproj`; commit on aom-studio; never push;
never install to a device; simulators only. Report: before/after PNGs (launch → home; the three eye modes),
gates, commit, "for the orchestrator", "still off".
