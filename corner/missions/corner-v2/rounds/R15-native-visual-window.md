# R15 — native durable Visual Window tabs (Task 7), review checklist + peek (Task 8), P022/P023

Mission `corner:corner-v2`. Worker: BUILDER, native plan Tasks 7 + 8
(plan `2026-09-05-corner-v2-native-ios.md` lines 694–863).
Native repo `AOM-EA/aom-studio/ios-native`, base `5d91e233` (R16 polish;
R14's `1e7e59eb` underneath — the base moved under me mid-round, no
conflicts, tree clean). Nothing outside `ios-native/` touched except this
report, its evidence PNGs, and the P022/P023 punch rows.

Commits (local only, never pushed):

- `4fb535e4 feat(corner:corner-v2): add durable native Visual Window tabs` (Task 7)
- `c79b33af feat(corner:corner-v2): add Corner v2 native review checklist` (Task 8)
- `65e49851 fix(corner:corner-v2): refresh renderer pin reads after review reset`
  (verification finding after the Task 8 gate; not amended per the no-rewrite rule)

Mode verdict: **fixture mode** (`V2_FIXTURE_STUB=1`). JWT still absent —
verified, not assumed:

```bash
cd /Users/aom-inhouse/aom-studio-transfer/corner-v2-integration
npx convex env get JWT_PRIVATE_KEY --deployment adjoining-tiger-87
# ✖ Environment variable "JWT_PRIVATE_KEY" not found (on dev deployment adjoining-tiger-87)
```

Same blocker since R11, owned by the backend track. Re-run line for after
the key lands (demo account, clean Keychain):

```bash
V2_FIXTURE_STUB=0 CONVEX_BASE_URL="https://<rehearsal-host>" \
TOUR_EMAIL="…" TOUR_PASSWORD="…" \
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/VisualWindowStoreTests \
  -only-testing:CornerTests/ReviewStoreTests \
  -only-testing:CornerUITests/VisualWindowUITests test
```

Simulators: `iPhone 17 Pro` (booted), `iPad Pro 13-inch (M5)` (plan says
"M4"; M5 is what exists — table row 10). Never `git add -A`, never pushed,
one xcodebuild at a time. No Karen account, no `neat-pony-216`.

## Task 7 — durable Visual Window tabs (plan Steps 1–7)

### Steps 1–2: failing first

New `CornerTests/VisualWindowStoreTests.swift` (plan's two + `close removes
only that tab and keeps order`, `select never calls open`, `relaunch
restores tabs, selection and page from the server session`, plus a
reopen-dedupes test) and `CornerUITests/VisualWindowUITests.swift`,
`xcodegen generate`, then:

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/VisualWindowStoreTests test 2>&1 | grep -E "error:" | head -5
```

```text
CornerTests/VisualWindowStoreTests.swift:27:83: error: cannot find type 'VisualWindowStore' in scope
CornerTests/VisualWindowStoreTests.swift:51:24: error: cannot find 'ArtifactRenderer' in scope
...
```

FAIL as required (the first run also proved the test files postdate the
last `xcodegen` — a bare `TEST SUCCEEDED` with no suites means the files
were never compiled; regenerate and re-run).

### Implemented (commit `4fb535e4`)

- `Corner/Stores/VisualWindowStore.swift` (new): tabs mirrored from
  `visualTabs`, `open` appends-if-new + selects + presents (the server
  dedupes by target), `close(id:)` removes only that id (selection falls to
  the first survivor; last close dismisses), `select` is network-free,
  renderer state cached per tab id (`updateState`), selection persisted per
  session in UserDefaults, 5s poll like `threadEvents`.
- `Corner/Views/VisualWindow/`: `VisualWindowHost` (generic over the chat;
  sheet with medium/large detents < 768pt, column beside the chat ≥ 768pt),
  `VisualWindowTabBar` (chips + close, selected underlined), `ArtifactRenderer`
  (dispatch + photo/code/error/unsupported views), `PDFArtifactView`
  (PDFKit + arrows + `Page N of M`), `QuickLookArtifactView` (reuses the
  legacy `QuickLookView`), `VideoArtifactView` (AVPlayer; YouTube IFrame
  embed), `WebArtifactView` (ephemeral store; Interact + desktop/mobile
  viewport → `state.siteViewport`).
- `Corner/Views/ChatView.swift`: v2 artifact blocks are tappable file cards
  (`visual-open-<artifactID>`) that call `open`; v2 screen wrapped in the host.
- `Corner/Services/RoomStore.swift` (stub only): `-v2SeedVisual` serves 6
  seeded artifacts + a card-carrying event, an `openVisualTab` echo with
  server-style dedupe, UserDefaults-backed tab rows; `-v2ResetVisual` clears
  them so each test starts clean and the relaunch test restores.
- Fixtures bundled: `aster-brief.pdf`, `hero.png` (renamed from
  `hero-portrait.png`), `walkthrough.mp4` (valid 2s h264, ffprobe-checked),
  new `site.html`, `brief.tsx` under `CornerTests/Fixtures/`; `project.yml`
  adds them to the app target (UI tests cannot inject files into the app).
- Legacy `FilePreviewView` stays for the 6 legacy room surfaces; the v2
  thread never had a `previewFile` — see deviation D1.

### Step 6 gate — PASS

iPhone (`VisualWindowStoreTests` 6/6 + `VisualWindowUITests` 3/3 at the time;
now 6 + 7 with Task 8's tests) and iPad (`VisualWindowUITests` all pass —
the column branch is proven by the evidence shot, not just the asserts).

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/VisualWindowStoreTests \
  -only-testing:CornerUITests/VisualWindowUITests test
# Executed 6 tests, with 0 failures … Executed 3 tests, with 0 failures … ** TEST SUCCEEDED **
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5)' \
  -only-testing:CornerUITests/VisualWindowUITests test
# Executed 3 tests, with 0 failures … ** TEST SUCCEEDED **
```

Regression then: full `CornerTests` 351/351, `CornerV2FlowUITests` 6/6.

Evidence (all viewed by the worker): `R15-native-tabs.png` (iPhone cards +
sheet), `R15-native-broken.png` (retry tab), `R15-native-ipad-column.png`
(column beside the chat, live PDF pages).

### Step 7 — committed per the brief's message (plus required extras, D1)

```bash
git add Corner/Stores/VisualWindowStore.swift Corner/Views/VisualWindow Corner/Views/ChatView.swift \
  Corner/Services/RoomStore.swift project.yml .gitignore \
  CornerTests/VisualWindowStoreTests.swift CornerUITests/VisualWindowUITests.swift \
  Corner.xcodeproj/project.pbxproj CornerTests/Fixtures/aster-brief.pdf CornerTests/Fixtures/hero.png \
  CornerTests/Fixtures/walkthrough.mp4 CornerTests/Fixtures/site.html CornerTests/Fixtures/brief.tsx
git commit -m "feat(corner:corner-v2): add durable native Visual Window tabs"
# [main 4fb535e4] … 19 files changed
```

## Task 8 — review checklist + peek, P022/P023 (plan Steps 1–6)

### Steps 1–2: failing first

New `CornerTests/ReviewStoreTests.swift` (plan's test + max-four +
clientId→server-id mapping + remove/blank-no-call) and the two review UI
flows appended to `VisualWindowUITests.swift`:

```bash
xcodebuild … -only-testing:CornerTests/ReviewStoreTests test 2>&1 | grep -E "error:" | head -3
```

```text
CornerTests/ReviewStoreTests.swift:12:30: error: cannot find type 'V2ReviewStore' in scope
```

FAIL as required.

### Implemented (commit `c79b33af` + fixup `65e49851`)

- `V2ReviewStore` (new type appended to `ReviewStore.swift` per the plan's
  file list; the legacy queue keeps its contract/tests): per-artifact pins,
  cap 4 with a `limitHit` toast, blank notes never send (blank-only submit
  makes no network call), one network call per submit, echoed client ids
  mapped onto the kept pins, `reset()` after send (pins reset, review off).
- `ReviewPanelView` (new): numbered pin rows, note field (`review-note`),
  `Send N changes` (`review-send`, disabled at 0 so one tap is one
  checklist), `Nothing to change, carry on` (plain-text send + dismiss).
- Anchors per renderer: PDF/photo tap-to-point (+ page-aware markers),
  video `Pin moment` at the player clock, code line-number pins with gutter
  highlight. No tap-to-pin on web (Interact gesture conflict) — noted.
- Sheet/column: `Review` / `Review · N` toggle; panel only in review mode;
  review auto-expands the sheet to large (notes + Send don't fit half; the
  handle still drives it by hand after).
- P023: 50px pill with Record inside (real `SpeechService` dictation,
  mirroring the home composer) + 50px round send; 60px peek bar above the
  composer with the active tab's thumbnail + change count, tap reopens.
- P022: mission shows the project name 12.5px above the title
  (`chat-subtitle`); project shows the title only. `chat-screen` survives as
  a 1pt overlay leaf (all 6 existing flow tests pass unmodified).
- No approval button anywhere in the loop.

### Step 5 gate — PASS (final code, after the fixup)

```bash
# iPhone 17 Pro
xcodebuild … -only-testing:CornerTests/ReviewStoreTests \
  -only-testing:CornerUITests/VisualWindowUITests test
# ReviewStoreTests: Executed 4 tests, 0 failures
# VisualWindowUITests: Executed 7 tests, 0 failures — ** TEST SUCCEEDED **
# iPad Pro 13-inch (M5)
xcodebuild … -only-testing:CornerUITests/VisualWindowUITests test
# Executed 7 tests, 0 failures — ** TEST SUCCEEDED **
```

Full `CornerTests`: **355/355** on the final tree. `CornerV2FlowUITests`
6/6 on the pre-fixup tree (the fixup touches only VisualWindow renderer
files the flow tests never open; stated, not re-run).

Evidence (`rounds/evidence/`, all viewed): `R15-native-sheet-half.png`
(medium sheet, live PDF p1, `Page 1 of 10`), `R15-native-sheet-full-pins.png`
(full, white selected pin on the page, `Review · 1`, `Send 1 change`),
`R15-native-peek.png` (peek `Teaser / 2 changes` + pill + mic + round send),
`R15-native-review-pins.png`, `R15-native-review-send.png` (toggle back to
`Review`, `0 pins`), `R15-native-ipad-column.png` (column + peek + composer).

### Step 6 — committed per the brief's message (+ `CornerV2DTO.swift`,
`VisualWindowHost.swift`, and the fixup commit — deviations D7/D11)

```bash
git add Corner/Services/ReviewStore.swift Corner/Views/VisualWindow/ReviewPanelView.swift \
  Corner/Views/VisualWindow/ArtifactRenderer.swift Corner/Views/VisualWindow/PDFArtifactView.swift \
  Corner/Views/VisualWindow/VideoArtifactView.swift Corner/Views/VisualWindow/VisualWindowHost.swift \
  Corner/Models/CornerV2DTO.swift Corner/Views/ChatView.swift \
  CornerTests/ReviewStoreTests.swift CornerUITests/VisualWindowUITests.swift \
  Corner.xcodeproj/project.pbxproj
git commit -m "feat(corner:corner-v2): add Corner v2 native review checklist"
# [main c79b33af] … 11 files changed, 1047 insertions(+), 100 deletions(-)
git add Corner/Views/VisualWindow/VideoArtifactView.swift \
  Corner/Views/VisualWindow/ArtifactRenderer.swift Corner/Views/VisualWindow/PDFArtifactView.swift \
  Corner/Views/VisualWindow/ReviewPanelView.swift
git commit -m "fix(corner:corner-v2): refresh renderer pin reads after review reset"
# [main 65e49851] … 4 files changed, 121 insertions(+), 70 deletions(-)
```

## Plan-vs-backend discrepancies (backend won every time)

| # | Plan says | Backend serves (`convex/v2Native.ts`, `convex/v2Visual.ts`) | Resolution |
|---|---|---|---|
| 1 | `openVisualTab(kind:)` raw kind | `NATIVE_TO_CORE_KIND`: `web`→`site`, `genericFile`→`file`, rest identity; unknown throws `Unsupported tab kind` | Client sends native spelling; server maps |
| 2 | `title` stored per open | Artifact tabs keep the ARTIFACT title; client `title` honored only for legacy/tool tabs (`openTabCore`) | Stub mirrors: resolves title from the artifact |
| 3 | `state` free-form (`["seconds": …]`) | `state` keys `page/timecodeMs/codeLine/siteViewport/reviewing`, applied at open; no update mutation in v2Native (`setTabPositionCore`/`setReviewCore` live in `v2Visual.ts` only) | State rides `open`; cached locally per tab after; unit test uses `timecodeMs` |
| 4 | Each open appends | `openTabCore` dedupes by target, returns the existing row, sets `activeTabId` | Store appends-if-new, always selects |
| 5 | `submitReview(artifactId:pins:)` shape as in the snippet | Pins `{id?, clientId?, anchor, text, isDone?}`; returns `{checklistId, pins: [{clientId?, id}]}` with the clientId echo | New pins send `clientId`, map the echo to server ids |
| 6 | `CornerV2APIFake(tabs: [.pdf(page: "4"), .web])` | N/A (test double): no such init, no such tab literal | Handlers configured per test; unique session per test (selection persists in UserDefaults) |
| 7 | Commit `feat: …` (no scope) | Repo convention carries the mission scope | Brief's `feat(corner:corner-v2): …` used for all three commits |
| 8 | iPad `M4` (Step 6) | Only `iPad Pro 13-inch (M5)` exists on this Mac | Gates ran on M5 |
| 9 | Fixture `hero.png` | Web fixtures ship `hero-portrait.png` | Copied renamed; tabled |
| 10 | PDF `Page N of M` from state | Renderer counts locally | PDFKit counts 10 pages in the bundled `aster-brief.pdf` (`Page 1 of 10` in evidence) |
| 11 | `Thread.visualSessionID` assumed | Present on `threadForProject`/`threadForMission` (`visualSessionID`, camelCase) | Used as the store's session key; stub derives `session-<threadID>` the same way |
| 12 | Web pins like other renderers | N/A (client-side): Interact toggle owns taps on the page | No tap-to-pin on web; point/time/line everywhere else |

## Deviations (all in the code comments too)

- D1 (T7 staging): extra `RoomStore.swift` (stub seeds — the only home for
  `PreviewV2API`), `project.yml` (bundle media into the app target),
  `.gitignore` (`!CornerTests/Fixtures/*.png` — the studio root ignores
  `*.png`); `RootView.swift` / `FilePreviewView.swift` / `CornerApp.swift`
  UNCHANGED — the legacy file-preview sheet stays for the 6 legacy room
  surfaces; v2 never had a `previewFile`.
- D2: `VisualWindowHost` is generic over the chat content; same contract as
  the plan snippet.
- D3: selection persists per session client-side (the session row's
  `activeTabId` is write-only through v2Native).
- D4: photo/code views live in `ArtifactRenderer.swift`, YouTube in
  `VideoArtifactView.swift` (plan lists no photo/code files).
- D5: error-tab container identifiers removed — R14 swallowing (the retry
  leaf must stay addressable). Found via a real UI failure, fixed honestly.
- D6 (T8): `V2ReviewStore` is a new type (legacy `ReviewStore` untouched);
  `ReviewPin.id`/`artifactID` `let`→`var` for id mapping + submit stamping.
- D7: `submit()` keeps the id-mapped pins; the panel `reset()`s after
  (HANDOFF pins-reset). Blank-only submit makes no call.
- D8: review auto-expands the sheet to large (half can't fit notes + Send).
- D9: third commit instead of amending the Task 8 commit (no-rewrite rule).
- D10: UI tests re-query elements before each tap (a pre-keyboard capture
  goes stale when the sheet shifts — silent misses, found via wait failures).
- D11: post-send the panel HIDES (no `review-send` to match) — the test
  asserts the toggle back to `Review` + Send absent. An earlier draft of this
  failure looked like a broken submit; debug prints proved the app correct
  (`pins=0 reviewing=false`) and the expectation wrong.
- D12 (real app bug, fixup commit): renderer views hold the store in a plain
  property, so SwiftUI skips them when inputs are unchanged — the video count
  froze at "3 pins" after reset (screenshot-proven). Pin counts/markers/
  gutter highlights now read through `@ObservedObject` children
  (`VideoReviewBar`, `ObservedStageMarkers`, `ObservedGutterNumber`).

## What Tasks 9–10 need

- Task 9 (email/tracker tabs, only after desktop production acceptance + the
  common-surface TestFlight gate): `UnsupportedArtifactView` is the current
  renderer for `.email`/`.tracker`; v2Native has NO email/tracker reads, so
  the normalized thread/detail records the plan wants have no endpoint yet —
  backend gap to close first. Then `EmailArtifactView`/`TrackerArtifactView`,
  `AppRouter` context links, removal of the standalone Email/Tracker nav
  entries, `ToolArtifactRendererTests`.
- Task 10 (release gate): `AccessibilityV2UITests` (email/tracker tabs,
  Dynamic-Type reachability of Send/pill/close), push/`CornerApp` release
  work, `ios/README.md` subscribe/poll documentation (visual tabs poll at
  5s; thread events at 2s).
- Re-run this round's gates with `V2_FIXTURE_STUB=0` once `JWT_PRIVATE_KEY`
  lands on `adjoining-tiger-87` (the one blocker, unchanged since R11).
- Still open in fixture: agent checklist tick-off rendering (`ThreadBlock.checklist`
  currently a "N review notes" line), video first frame black in stills
  (valid 2s h264; AVPlayer loads async — motion is fine), half-sheet Send
  with 4 pins may need a scroll (ScrollView handles it; the large detent
  covers the common case).
- Handoff state: `CornerTests` 355/355 green, `VisualWindowUITests` 7/7 on
  iPhone 17 Pro AND iPad Pro 13-inch (M5), `CornerV2FlowUITests` 6/6 green;
  working tree clean; never pushed.
