# corner:corner-smooth-loop — Build log

### R0 — infrastructure (2026-09-05, 10:45 AM Phoenix)
Three Muse workers in parallel: native screen tour (XCUITest + 3-device script), web E2E ground truth on this Mac (macOS baselines + composer docking), feature inventory for both platforms.
**Status:** in progress

### R0-ios — native screen tour (2026-09-05, ~11:30 AM Phoenix)
Shipped: `ios-native/CornerUITests/ScreenTour.swift` (23-frame tour 00–22),
`ios-native/scripts/screenshot-tour.sh` (3-device runner), 11 kebab-case
accessibility identifiers in Views, regenerated `Corner.xcodeproj`.
**Status: BLOCKED — the `.tour.env` demo credentials are rejected by
neat-pony-216 (`InvalidSecret at retrieveAccount`, verified twice by direct API
replication); zero frames on iPhone 17 Pro + iPhone SE, iPad not attempted.**
Secondary: the animated login backdrop burns ~57% CPU and starves XCUITest
snapshots (hard-aborts the test). Evidence + next steps: `rounds/R0-ios.md`.

### R0-web — shipped (2026-09-05, 11:09 AM Phoenix)
corner-convex `2efc452` pushed: 38 baselines regenerated on this Mac, composer assertion now waits for the 0.2 s enter animation to settle. 36/36 green, verified by the orchestrator independently. Report `rounds/R0-web.md`. New punch items P003, P004.
**Status:** shipped
