# R0-ios — native screen tour (BLOCKED: demo credentials rejected)

Date: 2026-09-05. Worker headless, repo `AOM-EA/aom-studio` on `main`.

## What shipped (committed, unpushed)

- `ios-native/CornerUITests/ScreenTour.swift` — `ScreenTour/testTour()`, the full
  00–22 frame tour. `continueAfterFailure = true`, interruption monitor
  (Allow/Don't Allow/OK/Not Now), `TOUR_EMAIL`/`TOUR_PASSWORD` from env,
  Keychain-skip branch, set-password gate (`01b-set-password` + fail, never sets
  one), `timing` text attachment + `NSLog`, per-step `NN-slug-MISSING` + fail +
  continue. Never taps `send`; draft typing is cleared; theme round-trips to the
  original. Forces the real backend (`UITEST_REAL_BACKEND=1` in launch env —
  without it the app silently uses FakeTransport and any future green would
  prove nothing).
- `ios-native/scripts/screenshot-tour.sh` (executable) — `[device …]`, defaults
  to the three R0 devices; sources `.tour.env`; `xcodegen generate`;
  per-device slug dir under `deliverables/screen-tour/<STAMP>/`; exact-name udid
  resolve; boot + dark appearance + 9:41 status bar; build-for-testing then
  test-without-building (`-derivedDataPath build/tour`, log to file);
  attachments exported + renamed from `manifest.json`; `timing.txt`;
  `summary.md`, whose path is the last line. Fresh-slate uninstall before
  attempt 1 (genuine sign-in UI); on failure one AUTO_SIGNIN bootstrap + one
  rerun (Keychain path), then stop. No signing overrides needed (Debug sim
  builds sign "to run locally", same as `grade-ios-simulator.sh`).
- 11 `accessibilityIdentifier`s in Views (only kind of app change this round):
  see table below. Regenerated `Corner.xcodeproj` via xcodegen.

## What ran

Working invocations (no overrides):

```
xcodebuild build-for-testing -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,id=<UDID>' -derivedDataPath build/tour
TEST_RUNNER_TOUR_EMAIL=… TEST_RUNNER_TOUR_PASSWORD=… \
xcodebuild test-without-building -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,id=<UDID>' -derivedDataPath build/tour \
  -only-testing:CornerUITests/ScreenTour \
  -resultBundlePath <out>/<slug>.xcresult
```

| Device | Output folder | Result |
|---|---|---|
| iPhone 17 Pro | `ios-native/deliverables/screen-tour/20260905-105816/iphone-17-pro/` (+ superseded `20260905-105315/`) | build ok, test hard-aborted, **0 frames** |
| iPhone SE (3rd gen) | `ios-native/deliverables/screen-tour/20260905-110418/iphone-se-3rd-generation/` (attempt 1 UI + attempt 2 Keychain-path) | build ok, both attempts aborted, **0 frames** |
| iPad Pro 13-inch (M5) | — | never attempted (stopped per brief step 6) |

Frames: none produced on any run. MISSING everything:
`00-signin-empty, 01-signin-filled, 02-home, 03-home-scrolled, 04-home-bottom,
05-search-open, 06-menu-open, 07-new-room-sheet, 08-room, 09-room-scrolled-up,
10-room-keyboard, 11-room-typed, 12a-room-files, 12b-room-settings,
12c-room-history, 13-back-home, 14-files, 15-tracker, 16-review, 17-email,
18-settings-sheet, 19-notifications-sheet, 20-background-work, 21-theme-light,
22-theme-restored`. Timing numbers: none obtained (no `timing` attachment ever
produced). Failure logs live next to each output folder (`*.build.log`).

## Hard blocker — sign-in fails, reported exactly, runs stopped

`TOUR_EMAIL`/`TOUR_PASSWORD` from `ios-native/.tour.env` are rejected by
`neat-pony-216.convex.cloud`. Direct replication of the app's own
`auth:signIn` call (`POST /api/action`, verified reachable, 200 in ~0.4 s)
returns, twice deterministically:

```
http: 200, status: error
errorMessage: Server Error — Uncaught Error: InvalidSecret at retrieveAccount
```

So even a perfect UI run would land on "That email and password did not match
an account." Attempt budget spent: 1 scripted AUTO_SIGNIN bootstrap + 1 manual
bootstrap + 2 direct API checks (identical result). Needs from orchestrator: a
working demo password (or confirmation the account exists / is not in
must-change-password), then rerun `scripts/screenshot-tour.sh` with no changes.

## Secondary finding — the login screen starves UI snapshots (evidence-backed)

Every test attempt died with `Failed to get matching snapshots … main thread
busy for 30.0s` on the sign-in screen, which hard-aborts the test despite
`continueAfterFailure`. `sample` of the app at the login form: **~57% CPU**,
~half of main-thread samples inside `ASCIIBackground.body` (per-frame Canvas
re-rasterizing ~1500 CoreText glyphs on main; `.drawingGroup()` does not help
because the draw closure itself re-executes every tick), plus the 30 fps mesh
Canvas. On this loaded host the main run loop never drains, so the snapshot
service starves. Two consequences for later rounds: (a) any UI test touching
sign-in is a lottery until the backdrop stops pegging main (侯 real battery
finding too, not just test-infra); (b) I replaced all `descendants(.any)`
queries with type-scoped lookups in `ScreenTour.swift` — broad queries were the
first victim, but scoped ones starve too once main is saturated. Home/chat
screens use the static `groundBackground()` and are unaffected (per code read;
unproven by run — no run ever got past sign-in).

## Code-read findings (unverified by run — no fixes this round)

- `waitingRow` (`RoomListView.swift:663`) is defined but never inserted into the
  home list, so frame `16-review` has no entry point when it is not wired up;
  expect MISSING even after auth is fixed unless the queue is non-empty AND the
  row is wired in.
- `BackgroundWorkView` sheet has no Done/Close button (drag-to-dismiss only);
  the tour dismisses it with a swipe.

## Identifiers added (all kebab-case, Views only)

| Identifier | File:line |
|---|---|
| `search-chip` | `RoomListView.swift:222` |
| `home-menu` | `RoomListView.swift:253` |
| `new-room-button` (×2: standalone + pill row) | `RoomListView.swift:352`, `:406` |
| `email-card` | `RoomListView.swift:642` |
| `tools-files` | `RoomListView.swift:654` |
| `tools-tracker` | `RoomListView.swift:660` |
| `waiting-card` | `RoomListView.swift:669` |
| `room-more-options` | `ChatView.swift:207` |
| `new-room-sheet` | `NewRoomSheet.swift:171` |
| `notifications-sheet` | `NotificationsView.swift:106` |
| `settings-sheet` | `AccountView.swift:101` |
| `background-work-sheet` | `BackgroundWorkView.swift:308` |

No change to `ScreenshotCapture.swift`, `SharedBackendAcceptance.swift`,
`project.yml`, `.tour.env` (never printed, never staged). `ios-native/.gitignore`
already excluded `.tour.env`, `build/`, `deliverables/` — nothing of mine to add.

## First impressions (from the only real pixels: sign-in stills, SE + 17 Pro)

- Password dots carry thin horizontal strike-like lines across them — check on
  device whether that is the SecureField or backdrop glyphs bleeding through.
- The animated glyph field clumps densely right behind the password label in
  some frames — busiest exactly where the form is quietest.
- Empty-form muted Sign in button, placeholders, corner marks, INVITE ONLY
  footer all render as designed; nothing clipped at SE or 17 Pro widths.
- Status-bar override (9:41, full battery) applies on script runs only; manual
  captures show carrier text — cosmetic, expected.

## Next

1. Working demo credentials → rerun `cd ios-native && scripts/screenshot-tour.sh`
   unchanged (fresh UI-sign-in attempt first, Keychain retry behind it).
2. If snapshots still starve on sign-in, the backdrop needs a static/cheap mode
   before the tour can photograph 00/01 — that is a Track 2 fix with its own round.
