# R23 — native entry is the thread (P070) + P071/P072/P073

Mission `corner:corner-v2`. Base: aom-studio `cfff8271` (later than the
required `0fa988ac`). Simulators only (iPhone 16e
`0A05C9AA-9835-4C66-BF7A-9B4CF15AD80D`); nothing installed to a device,
nothing pushed.

## What changed

P070 — the app opens into the conversation; the home tree is retired:

- `ios-native/Corner/Services/AppRouter.swift` — `entryRoute` (the thread
  the stack root shows), `resolveEntryRoute` (last open thread when it still
  exists, else General's, else first project), `rememberV2` (every thread
  arrival persists the entry), `pendingEntry` 60 ms deferred replace so a
  drawer/sheet dismissal in the same update does not swallow the swap, and
  `isEntryRoute` (thread destinations replace the root instead of stacking).
  `.workspace` resolves to the entry thread; no route leads to the tree.
- `ios-native/Corner/Views/RootView.swift` — the stack root is `V2EntryRoot`
  (entry thread, keyed loaders), not `RoomListView`.
- `ios-native/Corner/Views/V2DrawerView.swift` — drawer carries the retired
  tree's jobs: search field (`v2-drawer-search`), per-project `+`
  (`v2-drawer-project-add`), `Files · N` rows, recents; mission rows keep
  their title text exposed (`v2-drawer-mission-name`) with no swallowing
  label.
- `ios-native/Corner/Views/V2IntakeSheet.swift` (new) — intake lives in
  `V2IntakeStore`/`V2IntakeSheetView`, hosted at the entry.
- `ios-native/Corner/Views/ChatView.swift` — every thread arrival calls
  `rememberV2`, so the next cold start opens that thread.
- `ios-native/Corner/CornerApp.swift` — `-v2ResetEntry` clears the stored
  thread (Debug only), so the gate resolves deterministically to General.

P071 — thread nav title is the mission name only (`ChatView.swift:69`;
the legacy `compatRoom` keeps `Project / Mission` for identity/draft keys).
P072 — `PDFArtifactView.swift:104`: remote PDF bytes load off the main
actor (`PDFDocument(data:)` after a detached fetch); the synchronous
`PDFDocument(url:)` stalled the sheet's rise, leaving uncomposited white
below the stage.
P073 — `CornerUITests/R19ShootScreens.swift`: `frames()` waits for the
sheet anchor to stop moving (`settleSheetIfAny`/`waitForStable`) before the
dump and re-dumps once after a further settle when ids still read MISSING.

## Proof on live backend data (the design thread is gone — see below)

A probe (temporary, deleted after) opened the entry, navigated the drawer,
and opened a mission thread on the 16e sim against brilliant-scorpion-163:

```
R23PROBE entry-chat=1
R23PROBE tapping row label=A launch deck for the spring line
R23PROBE p071-title-ok=1 title=A launch deck for the spring line
R23PROBE subtitle=Harbor Coffee Live
R23PROBE cards=0 / peek=1 / sheet=1
R23PROBE sheet-el visual-sheet-close=1 review-toggle=1
  sheet-tab-preview=1 sheet-tab-context=1 sheet-status-text=1
```

So: entry IS the thread (P070), title = mission only with the project on
the line above (P071), the sheet opens with every gate id readable after it
settles (P073), and the sheet screenshot shows the dark `--surface` ground
with the status line under the PDF page (P072).

## The blocker: the e2e account lost Aster after 6:40 PM

The gate's thread/drawer/settings/sheet screens navigate to the design's
thread (Aster / Spring launch deck). That thread no longer exists on the
backend the app talks to:

- 6:37 PM sim-walk: 53/63, thread + drawer shot fine (Aster present; P071
  names it).
- `rounds/evidence/R23-native-entry-before.png` (home tree, captured
  ~6:40 PM) lists the **Aster** project.
- Gate runs at 8:31 PM, 8:35 PM, 8:38 PM (three sims, three lanes) all fail
  identically at the same step: the drawer opens, project and mission rows
  exist, but no row is named "Spring launch deck" (`R19STATUS thread
  missing no-thread` → whole cascade).
- Live dump 8:42 PM: projects are General, Harbor Coffee Live, Northwind;
  missions are "Remember To Renew The Studio Library",
  "Spring line follow-up", "A launch deck for the spring line". No Aster
  anywhere (all projects expanded; the query counts the whole tree, not
  just the visible rows).
- The app renders exactly what the backend serves (no client-side project
  filtering; `WorkspaceSummary` decodes or the whole list fails, and three
  projects do render). The drawer labels read correctly
  (`row[2] label=A launch deck for the spring line`), so this is not the
  R23 label change — it is the data.
- Window: between the 6:40 PM tree screenshot and the ~7:30 PM gate-1 run,
  i.e. inside the 6:20–6:45 PM production window (backend deploy `829f6f8`
  with `ensureGeneralCore`, auth-table copies).

The tour keeps looking for Aster / Spring launch deck on purpose:
repointing it at a lookalike mission would compare the wrong content and
manufacture a green gate. Restoring the account data is orchestrator /
backend territory — no native change can (or should) fix it.

## Gate record (one full run, for the books)

`cd corner/missions/corner-v2 && node tools/native-design-vs-sim.mjs`
(this session, 9:06–9:10 PM, sim 16e, `/tmp/r23/gate-record.log`):

- exit 1 — **26/64 checks pass, 38 open**.
- Tour statuses: `login ok`, `setup-1 ok`, `setup-6 ok` (every screen
  that does not need the design thread still shoots green);
  `thread missing no-thread`, `drawer missing no-drawer`,
  `settings missing no-drawer`, all four sheet screens
  `missing no-sheet`, `empty missing populated-account` (honest).
- Every missing screen fails at the same step — the drawer opens and
  rows exist, but no mission row reads "Spring launch deck" (see the
  blocker above). No P071/P072/P073-shaped failure remains underneath:
  the probe reads every one of those ids fine on a live thread.

| gate | command | result |
|---|---|---|
| units | `xcodebuild … -only-testing:CornerTests test` (16e) | 385/385, 0 failures |
| UI suites | 5 classes, `/tmp/r23/suites.xcresult` (16e) | 60 passed, 1 skipped (P061 by design), 1 failed = `ScreenTour/testTour` on the missing backend mission |
| R19 visual | `node tools/native-design-vs-sim.mjs` (16e) | exit 1, 26/64; login + setup-1 + setup-6 ok, thread/drawer/settings/sheets blocked on the missing Aster data |

## Suites

- `CornerTests`: **385/385, 0 failures** (this session, 16e sim).
- UI suites on the 16e (`/tmp/r23/suites.xcresult`): **60 passed,
  1 skipped, 1 failed**. The skip is P061 (skips by design in
  CompMatch). The failure is `ScreenTour/testTour` —
  "deck: drawer row Spring launch deck not found": the same missing
  backend data (the tour walks to the design thread), not a code
  regression — the independent probe dump shows no such mission in the
  served tree. `CompMatchUITests`, `DesignMatchUITests`,
  `VisualWindowUITests`, and `CornerV2FlowUITests` suites all pass.

## Entry before / after

- Before: `rounds/evidence/R23-native-entry-before.png` — the home tree
  (Corner header, headset/search/menu circles, "Message Corner…" bar,
  WORKSPACE with General + Aster, Legacy archive).
- After: `rounds/evidence/R23-native-entry-after.png` — cold start lands
  in the General thread (burger + title + composer pill, no tree).

## Commits

Scoped paths + regenerated `project.pbxproj` committed on top of
`cfff8271` (`feat(corner:corner-v2): R23 entry is the thread…`), no push
(per the brief).

## Still off and why

1. The R19 gate cannot go 63/63 (and P073's two-consecutive-63/63 proof
   cannot run) until Aster / Spring launch deck exists on the e2e account
   again — backend/account state, not code. Every screen that does not
   need the design thread (login, setup-1, setup-6) still shoots green.
2. P073's settle-then-dump is proven by the probe's 5/5 sheet reads, not
   by the full gate — same root cause.
