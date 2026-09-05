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

### R0-ios — built, blocked on credentials (2026-09-05, 11:18 AM Phoenix)
aom-studio `ec008095`: `CornerUITests/ScreenTour.swift` (25-frame tour), `scripts/screenshot-tour.sh` (3 devices), 11 accessibility identifiers, project regenerated. Zero frames: both repo test accounts return `InvalidSecret` from neat-pony-216, and the sign-in canvas saturates the main thread so XCUITest cannot snapshot (P005). Follow-up brief `briefs/R0b-ios.md` adds a `-screenTour` gate on ambient animation; needs a working tour account first.
**Status:** blocked (credentials), R0b queued

### R1-web — shipped (2026-09-05, 11:45 AM Phoenix)
corner-convex `bb9bb2e` (P001 unread selector + fixture, P002 send-failure UI with retry, P004 dead CSS) and `8455154` (24 new tests, 83 baselines: sign-in, new room, upload, send failure, settings, email, themes everywhere, palette, empty list, skeleton, wrapping). 125 passed, verified independently. Sign-in timing baseline: ~1.4-1.5 s to first paint, dominated by a fixed 1200 ms splash. New items P008-P014.
**Status:** shipped, pushed

### R2-web-review — shipped (2026-09-05, 12:03 PM Phoenix)
All 140 web frames reviewed by a read-only worker. 15 new items P015-P029 (6 first-minute), plus P030 from the orchestrator's own look. Worst: notifications leak raw event types and timestamps with unreadable titles, Settings ignores the Light theme on its own page, tool follow-up garbles and echoes, composer covers the last agent row. R3-web-fix queued behind R2-web-fix.
**Status:** shipped
