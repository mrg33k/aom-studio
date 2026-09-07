# R24 — native send-and-sheet (P074, P075, P076, P077, P078, P079, P080)

`corner:corner-v2`. BUILDER, native iOS app. Headless, no questions asked.
Mission folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`

Patrik, 7:00 PM, iPhone 17 Pro Max, real account, production backend
(`brilliant-scorpion-163`): *"even in the screen shot the pdf is cut off.
the chat on ios is very rough looking and says im offline."*

## Verdict

All seven rows are fixed app-side, locked by tests, and verified on-device
screenshots. The shared-clone gate (`native-design-vs-sim.mjs`) stays red on
**backend-data grounds only** — the restored Spring-launch-deck thread is
empty (no messages, no artifacts, so the sheet cannot open) and R29/R31 probe
missions are flooding the drawer mid-run. No app-code check in the gate fails.

## 0. P080 FIRST — option taps answer in the thread

**Root cause (app).** `V2ChatModel.send` never sent `threadId`: every send —
option tap, typed answer, everything — went out as a room-less global route.
The server then did exactly what a global send does: ran routeCore, appended
a `Routed to …` receipt to the source thread, and returned a router
clarification card. The backend already accepts the in-thread send
(`v2Native:send` takes optional `threadId`, verified against the deployed
clone's function-spec, which also lists `mode: "work"|"plan"` and `model`):
with `threadId` set it appends the text to that thread, stores the decision
row *without* a routing block, and answers
`destinationThreadID == thread.id, needsClarification=false,
reason="Already in {path}."` — the web's `sendThreadMessage({threadId})`
contract. The app just never used it.

**Fix.**
- `CornerV2API.send` / `ConvexEndpoint.v2Send` / `DefaultCornerV2API` take
  `threadId`; `V2ChatModel.send` and `replayOutbox` always pass
  `thread.id`. The mode fallback keeps `threadId` on both attempts — an
  in-thread send never degrades into a global route.
- `WorkspaceStore.sendIntake` (global intake) still sends room-less, by
  contract.
- Option tap = select the radio (`selectedOptionID`, filled + `accessibilityValue`
  selected) AND send the option text through the same thread send. Typed
  answers while a question is open ride the same path. `start()` clears
  `lastDecision` so one thread's decision never cards the next.
- `PreviewV2API` mirrors the backend: `threadId` set resolves the owning
  project/mission and returns the `Already in {path}.` decision naming that
  thread; unset keeps the old routeMode behavior. `@brain` mentions still
  steer the reply in-thread.

**Lock.** Unit `testInThreadSendCarriesThreadId`,
`testGlobalIntakeSendCarriesNoThreadId`,
`testPlanModeFallbackFiresAndKeepsThreadId` (both attempts carry the thread;
this also proves the R19 mode fallback fires — it never had a unit test),
`testSendOmitsAbsentThreadId`, `testStartClearsThePreviousThreadDecision`.
UI `testV2QuestionOptionAnswersInThread` (fixture question block: tap selects
the radio, the option text echoes in-thread, no route card, title unchanged).
Real-backend check: one in-thread send to a live General mission thread
landed and echoed (see §1, probe B).

## 1. P075 — "Offline": the real rejection, and never mislabeling it again

**Repro on the real backend** (iPhone 17 Pro sim, e2e account, throwaway
in-process test, deleted after the round; creds from `/tmp/corner-v2-e2e.env`,
never typed or logged). Tree at 9 PM: General + Harbor Coffee Live +
Northwind, and **Aster / Spring launch deck is back** (the R23 blocker is
gone as data, see §5 for what is still missing on it).

No-write probes (blank text fails validation before any write), verbatim:

- `A1 threadId + mode:"plan" + blank` → `ConvexServiceError.server(
  "[Request ID: 12a635152b87642d] Server Error")`
- `A2 threadId, no mode, blank` → `ConvexServiceError.server(
  "[Request ID: 88ed88adb154e4d7] Server Error")`
- `A3 global, blank` → `ConvexServiceError.server(
  "[Request ID: 7a944bb74568db8c] Server Error")`
- `A4 bogus threadId + real text` → `ConvexServiceError.server(
  "[Request ID: b71c5c4b7f0f142d] Server Error")`

Then one real send, `threadId` set, text
`R24 probe <stamp> — send-path check, please ignore` → landed:
`destinationThreadID` = the thread, `needsClarification=false`,
`reason="Already in General > Remember To Renew The Studio Library."`,
and `threadEvents` echoed it (`B-echo count=1 total=1`).

**Root cause, two halves.** App half (fixed here): `send` enqueued on ANY
error and the banner read every queued entry as offline — the reason was
discarded in `catch { refreshQueued() }`. Backend half (not deployable from
here): the clone masks **every** rejection as `Server Error` — validation,
bogus thread, all of it. L004's `ConvexError` data codes (coded per R25, and
the reason the brief expected plain reasons) are still not on the clone, so
no client can distinguish denial from missing from invalid today. The 6:25 PM
deploy DID land `mode`/`threadId`/`model` (function-spec proves it), so the
`mode`-rejection era is over; whatever rejected Patrik's 7 PM sends is now
unrecoverable from logs — but every branch now surfaces truthfully.

**Fix (app).**
- `V2OutboxEntry.lastFailure` (persisted; old JSON decodes to nil):
  `.network` (bytes never left — URLError domain only) vs
  `.rejected(reason:)` (plain sentence per shape, the web's `plainQueryError`
  twin: signed-out / no-access / gone / masked-server / generic; raw envelope
  never reaches visible copy). `V2OutboxStore.recordFailure`.
- `sendBanner`: rejection dominates (`.notSent(count, reason)`), pure network
  failures read `.offline`, and an in-flight send with no failure shows **no
  banner** — a normal send no longer flashes "Offline" mid-round-trip.
- Banner UI: rejection variant (`v2-notsent-banner`, "Not sent — tap Retry",
  `v2-notsent-reason`, shared `v2-outbox-retry`) + the plain reason under each
  rejected echo bubble (`v2-queued-error`, the web's pattern). Offline variant
  keeps its id and copy. Retry replays; `replayOutbox` runs on foreground AND
  on reconnect (`V2ReconnectMonitor`, one shared `NWPathMonitor`, edge-fired
  notification the thread observes).

**Lock.** Unit: both banner branches, all `classify` shapes, old-JSON
decoding, banner cleared on success, monitor edge logic. UI
`testV2RejectedSendShowsNotSentAndRetries` (masked-rejection flag: banner +
kept-text reason + no offline banner + Retry lands it + banner clears);
existing `testV2OfflineQueueBannerAndReplay` still green (URLError branch).

## 2. P074 — the cropped PDF

**Root cause (app).** The stage rendered `PDFView` as
`.singlePageContinuous` + `autoScales`: the page fit the stage *width* and
ran past its bottom edge — "3 THINGS CHANGED" sliced. Worse, the arrows never
turned the view at all: `updateUIView` swapped the document but ignored
`page`, so next/prev moved the "Page N of M" label while the page sat still.

**Fix.** `displayMode = .singlePage` + `autoScales` (whole page visible,
letterboxed on the sheet's `--surface`), page turns driven in `updateUIView`
(index-compared, echo-safe, via the `PDFPageTurn` seam), and the
`PDFKitView` is framed to the fitted rect (`PDFPageFit`, pure + unit-tested)
— so the `visual-stage-pdf` AX frame *is* the page: the UI test reads the
page frame vs the stage and proves fit. Taps and pin markers ride the fitted
frame, so they stay page-relative under the letterbox. Incidental learning,
kept in the test: the 290 slot is media (~247) + footer (~43) per HANDOFF §6 —
the page fills the media remainder edge-to-edge of its height. Photo already
aspect-fit (`.fit`); untouched.

**Lock.** Unit `testPDFPageFitCentersPortraitPage` (1080×1350 in the slot →
232×290 centered, aspect kept), `testPDFPageFitNeverEmitsNaN`,
`testPDFPageTurnClamps` + the turn lands the view (fixture PDF). UI
`testP074PdfPageFitsStage`: frame height fills the media, aspect ≈ 0.8,
letterboxed narrower than the stage, arrows step to "Page 2 of".
Before: `evidence/R24-P074-before.png` (HEAD's sheet shot — the slice).
After: `evidence/R24-P074-after.png` (whole "ONE SEND. FIVE LIKES." page,
pager on 2 of 10).

## 3. P076 — the truncated placeholder

**Root cause (app), measured.** At 390 the pill held field + full ✦ Auto
chip (67) + mic (36) + send (50): the field got ~152pt for a ~201pt string.
Two discoveries on the way: (1) the multiline axis is UITextView-backed with
a ~5pt/side text inset (placeholder starts +4pt in on-device) — 10pt of the
field was never text room; a conditional-axis detour fixed the fit but
**dismissed the keyboard on the first keystroke** (focus does not survive the
backing swap — tried, UI test caught it, reverted, documented here so nobody
retries it); (2) the real ruler is TextKit, not advance sums.

**Fix.** Collapse per the brief's first option (chip metrics kept: 32pt,
8pt radius, same glyph): icon-only while the field is empty, label back with
typing; input set to the design's own 14.5px (P106); ≤2pt each from four
unlocked spacings (send gap 10→7, pill leading 17→11, trailing 4→3, gaps
4→3). Locked metrics untouched: outer 21 (P044), send 50 (P023), mic 36
(P041), copy (P038). Budget is shared truth: `V2ComposerMetrics` drives the
view and the test — field 213, inset 10, General needs 201.1 (Hanken Regular
14.5, TextKit), Aster 184.2.

**Lock.** Unit `testPlaceholderFitsAt390WithCollapsedChip` (both strings vs
the budget). UI `testP076ComposerPlaceholderFits` (General thread: chip
collapses ≤28 wide and expands with typing, field delivers ≥200pt on-device,
copy intact). After, eye-verified at 390: `evidence/R24-P076-after.png`
("Tell General what to make next" in full) and the gate's live thread shot
("Tell Aster what to make next" in full on real data).

## 4. P077 / P078 / P079 — seen on the live chat

- **P077 flat ground.** The thread painted `groundBackground()` — the glass
  wallpaper's bronze/steel glows under the Glass theme (Patrik's phone);
  the design thread is flat `--ground`. The thread now paints
  `flatGroundBackground()` (per-theme flat, no glow layer; dark is exactly
  #0f1319). UI `testP077ThreadGroundFlatInGlass` (`-glassPreview`): six
  gutter pixels read glass-flat #0C1218 ±14 — the glow would read 40+ higher.
  After: `evidence/R24-P077-after-glass.png`. Drive-by, caught mid-round: the
  `-glassPreview` hook **persisted** `cv6-theme=glass` to simulator defaults
  and re-themed every later suite run on that sim (P026/P051 failed with the
  drawer reading glass). `ThemeManager.preview(_:)` is now process-local by
  construction + unit-locked (`testThemePreviewDoesNotPersist`); the leaked
  default was scrubbed from all three sims.
- **P078 step-only rows.** The backend's `toNativeBlocks` steps case drops a
  label-only payload's label (`normSteps(nonArray)` → `[]`), so the app got
  `.steps([])` and painted an empty card under the agent header — the blank
  "Paige 7:10" row, web L011's twin. App: `V2StepsPrepare` filters blank
  labels, empty steps paint nothing (no empty card), unit-locked; fixture
  `-v2SeedStepOnly` + UI `testV2StepOnlyEventPaintsLabel` lock the symptom
  (label paints). After: `evidence/R24-P078-after.png` ("✓ Gathering the
  latest numbers"). The live label needs the one-line backend fix — spec in
  "for the orchestrator".
- **P079 routing UI.** Same root as P080: in-thread sends went global, so the
  thread showed the server's `Routed to …` receipt line plus the route card
  with Move. With `threadId` sends the server appends no routing block, and
  the card is gated (`v2ShowsRouteCard`: clarification/creation flags, or a
  destination other than this thread — global-intake routing still surfaces).
  `testV2RouteBlockWithMove` is repurposed to the new contract
  (`testV2InThreadSendShowsNoRouteCard` + `testV2GlobalIntakeConfidentRouteNavigates`
  proving routing UI lives on global sends), and the visual subtitle test now
  reaches Ship home page through the drawer. After:
  `evidence/R24-P079-after-inthread.png` / `R24-P079-after-intake.png`;
  P080's after: `evidence/R24-P080-after.png` (tapped option selected, its
  text echoed in-thread, no card).

## Gates

| Gate | Result |
|---|---|
| Unit (`CornerTests`, 16e) | **403/403 pass** (was 385; +18 R24). Gate needs 376+. |
| `CompMatchUITests` alone, 390 | 45 tests, 0 failures, 1 skipped (`testP061SetupFlow`, pre-existing skip). |
| `DesignMatchUITests` alone | 5 tests, 0 failures, 2 skipped (pre-existing). |
| `VisualWindowUITests` alone | 7/7. |
| `CornerV2FlowUITests` alone | 11/11 (5 new R24 functions — route-block repurposed into in-thread + intake — all green). |
| R23 gates kept green | Entry/drawer/nav flows untouched and passing (`testEntryThreadDrawerFlow`, tour sign-in→thread→drawer→settings all shoot in the gate); route-block behavior change is the briefed P079 contract, repurposed tests document it. |
| `node tools/native-design-vs-sim.mjs` ×2 | **exit 1 both runs — data-blocked, not code-blocked** (see "still off"). Every app-code check passes on live data, including the R24 areas: composer field 213pt, chip 22×32, record 36, send 50, ground/send tokens exact. |

New tests: 18 unit (`R24SendAndSheetTests`) + 8 UI (3 compmatch, 5 flow).
Failing gate checks (18, stable set): 5 drawer rows + 13 sheet checks.

## For the orchestrator (backend to deploy, phone to reinstall)

1. **Deploy the web worktree's `convex/`** (I did not touch it): L004's
   `ConvexError` data codes (coded, still undeployed — the clone masks
   everything as `Server Error`, which is why no plain send reason can reach
   any client today), plus the P078 one-liner in `toNativeBlocks`
   (`convex/v2Native.ts`, steps case) so a label-only payload rides as a
   single done row instead of `[]`:
   `steps: rows.length ? rows : (label ? [{ id: "step-0", label, state: "done" }] : rows)`
   (mirrors web `stepsFor`; the app already renders that shape).
2. **Backend data before the gate can pass**: the restored Spring-launch-deck
   thread is EMPTY (no messages, no artifacts — the tour's sheet step needs
   the R19-era PDF card/peek); the e2e drawer is flooded with R29/R31 probe
   missions (a dozen+, still arriving — one swipeUp scrolls New/Project+/
   Record off-screen out of the AX tree). Nothing app-side gates this.
3. **Robustness ask for `v2Native:send`**: accept an optional `clientEventId`
   and dedupe on `(threadId, clientEventId)`. Reason: the mode fallback
   retries once on any envelope error; for in-thread sends a *post-write*
   failure would double-append the user text today (arg-validation failures
   can't, they precede writes).
4. **Phone**: Patrik reinstalls from the next build (all rows are client-side
   rendering/send-path; no migration, outbox schema is backward-compatible).
   Note: my one real-backend probe (`R24 probe <stamp> — send-path check`)
   sits in General's "Remember To Renew The Studio Library" mission thread,
   plus whatever the driver replied there.

## Still off and why (empty is the goal — it isn't)

- **Gate exit 0**: blocked on (2) above — empty design thread + concurrent
  probe flood. Both runs fail the same 18 data-dependent checks; zero
  app-code checks fail.
- **Live P078 label + live plain reasons**: need the (1) deploy; the app
  already speaks both shapes (verified against fixture + unit).
- **Pins under the letterbox** stay stage-relative (pre-existing contract,
  unchanged; strictly better than before — continuous-scroll pins never knew
  the scroll offset).
- **>7-char project names beyond General** (e.g. Harbor Coffee Live) still
  ellipsis — normal iOS behavior, out of scope; the brief's lock string and
  Patrik's case both fit with measured margin.

## Commits (aom-studio, no push)

- R24 commit (this round): native `threadId` sends + truthful outbox banner +
  reconnect replay + PDF aspect-fit + real page turns + collapsing chip +
  placeholder budget + flat thread ground + steps hardening + route-card
  gating + option select + fixture seeds/flags + 18 unit + 8 UI tests +
  punch-list P074–P080 → fixed + this report + R24 evidence.
- HEAD at work: R31/R29 commits landed concurrently (shared tree); R24 sits
  on top, scoped paths only (`ios-native/...`, `punch-list.md`,
  `rounds/R24-*`, regenerated `project.pbxproj`).

Files: `ios-native/Corner/Services/CornerV2API.swift`,
`ios-native/Corner/Services/RoomStore.swift` (PreviewV2API only),
`ios-native/Corner/Services/V2ReconnectMonitor.swift` (new),
`ios-native/Corner/Views/ChatViewModel.swift`,
`ios-native/Corner/Views/ChatView.swift`,
`ios-native/Corner/Views/Theme.swift`,
`ios-native/Corner/Views/VisualWindow/PDFArtifactView.swift`,
`ios-native/Corner/CornerApp.swift` (preview hook only),
tests: `CornerTests/R24SendAndSheetTests.swift` (new),
`CornerTests/{ChatViewModelV2Tests,V2CommandsTests,Support/CornerV2APIFake}.swift`,
`CornerUITests/{CompMatch,CornerV2Flow,VisualWindow}UITests.swift`.
