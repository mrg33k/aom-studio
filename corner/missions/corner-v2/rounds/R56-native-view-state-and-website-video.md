# R56 — native view state + website video: the phone publishes what it's showing, follows the agent, sites play as horizontal video

`corner:corner-v2` · BUILDER (native iOS) · 2026-09-08 · mission
`corner/missions/corner-v2/` · extends R43 (eye + Visual Window) · Patrik's
SPEC-visual-window-companion.md (client side) · punch-list P094/P095/C016.
Backend (`v2Visual.setViewState` / `getSession`, live on
`brilliant-scorpion-163`) was taken as shipped — `convex/` does not exist in
this repo and nothing outside `ios-native/`, the mission tool, and this
report was touched.

## Before → after

Before: the eye cycled modes purely locally — the agent never learned what
the person was looking at (no `setViewState` writer existed), the agent's
move-on minimize had no client path (only fresh-tab arrivals raised the
window), and a site tab in FaceTime squeezed the desktop page into the
110×160 portrait box. The full-mode stage was full-width × screen/3
(374×269.5, 1.39:1 — not a video shape).

After: every mode tap, tab select, PDF page turn, and site-reader scroll
publishes `v2Visual:setViewState` (debounced ~300 ms, field-level diffs, one
sequential poll, no races); the thread's `getSession` rides the store's own
mirror tick — a new agent active tab raises + focuses (FaceTime if hidden),
an agent `mode=hidden` minimizes with nobody tapping; site tabs render the
desktop page as a 16:9 band in BOTH modes (sheet stage 374×210, FaceTime
docked band under the nav), scrollable inside, scroll reported back.

Evidence (all fresh this round, `rounds/evidence/`, 390 test sim):
website band in full — before `R19-native-eye-full-sim-390.png` (R43,
269.5 tall) → after `R56-native-website-band-full-sim-390.png` (210 tall,
16:9, desktop page, thread behind); FaceTime dock —
`R56-native-website-band-facetime-sim-390.png` (title strip + band, no
sheet, no portrait box); agent raise —
`R56-native-agent-raise-sim-390.png` (sheet on the site band, reached with
zero taps after returning to the pdf); agent minimize —
`R56-native-agent-minimize-sim-390.png` (thread only, eye-slash stays,
composer + sparkles chip + Plan guard intact).

## What shipped (files)

- P094 publish. `ios-native/Corner/Models/V2ViewState.swift` (new):
  `V2VisualSession` (lenient `getSession` decode — unknown mode strings
  fall back to full, never hidden), `V2ViewSnapshot` + `V2ViewStateDiff`
  (field-level diffs: mode tap → `{mode}`, select → `{tabId}`, page → 
  `{page}`, scroll → `{scroll}`; deselects send nothing).
  `ios-native/Corner/Services/V2ViewStateSync.swift` (new): the sync object
  — sinks eye mode + selection, takes page/scroll via the store, one
  never-reset ~300 ms timer (debounce + throttle in one), failed writes keep
  their baseline and retry on the next change, never surface. `CornerV2API`
  + endpoints + `DefaultCornerV2API`: `v2Visual:setViewState` (unset fields
  omitted, never null) and `v2Visual:getSession`.
- P095 consume. `VisualWindowStore`: `onSession` (session rides `load()`,
  tabs-then-session sequentially, best-effort `try?`) + `onPosition` (page
  turns forwarded from `updateState`, scroll via `noteScroll`).
  `V2ViewStateSync.applyRemote`: new agent tab → select + raise (FaceTime if
  hidden — R43's rule); agent `hidden` → `eye.set(.hidden)` (no flicker —
  set is a no-op when equal); last-writer-wins inside the 0.6 s conflict
  window (person's in-flight tap re-publishes instead of flickering);
  adoptions run suppressed + absorbed, so they never echo a write back.
  `ChatView`: owns the sync per thread, `attach` on appear (+ `onSession`
  wiring), `detach` + nil on disappear. Legacy path untouched (sync never
  attaches there).
- P094/P095 website band. `V2FaceTimeWindow.swift`: `V2SiteBandMetrics`
  (16:9, capped at a third — see decision below), `V2SiteBand` (one view for
  both modes; height derives from the ACTUAL width via aspectRatio), scroll
  KVO (2pt floor + 100 ms gate) into `noteScroll`; FaceTime site tabs dock
  as the full-width band (`v2-facetime-site`), document tabs keep the
  110×160 box untouched. `VisualWindowHost`: the sheet stage uses the band.
- Fixture rig for the agent path (no existing fixture run changes
  behaviour): `PreviewV2API.setViewState` records; `visualSession` answers
  only behind `-v2AgentSession=<mode>` (+ `-v2AgentTab=<artifactID>`),
  otherwise throws so the consume path stays inert everywhere else.
- Tests. Units `CornerTests/R56ViewStateTests.swift` (26: endpoint shapes,
  diff math, lenient decode, the four publishes, coalescing, retry,
  raise/focus, minimize, echo silence, LWW, tick-resend guard, band
  geometry). UI `CornerUITests/R56ViewStateUITests.swift` (5: band geometry
  full, band dock FaceTime, agent raise + focus via the rigged session with
  zero post-pdf taps, agent minimize with zero taps, the zoom-out guard:
  commands chip 32pt + card carries Plan + Work + eye present).
  R43's walk test now covers the site band in FaceTime (box reserved for
  pdf); R43's geometry pin updated to the 16:9 contract (below).
- Gate. `tools/native-design-vs-sim.mjs`: eye-full gains the band frame
  anchor (`visual-stage-web` 374×210 ±2). The thread screen already
  requires `v2-commands` (standing chip guard).

My calls (brief-silent, documented): 16:9 is exact while "about a third" is
approximate — on a 19.5:9 phone both cannot hold (16:9 full-bleed is ~26% of
the height; a true third would be 12.4:9, not a video shape), so the ratio
binds and the third caps (`V2SiteBandMetrics`, landscape included).
`removeDuplicates` on the sync sinks (below). Fixture `visualSession`
throws without the rig flag (existing suites provably inert).

## Gates

- Units: `CornerTests` **562/562** on the 390 test sim `4818124A-…`
  (536 carried + 26 new in `R56ViewStateTests`; R43's geometry pin updated
  to the 16:9 contract in place, not added).
- UI, each suite alone, 390 test sim (never Patrik's 16e `0A05C9AA-…`):
  R56ViewState **5/5**, R43HomeFirstAndEye **5/5** (updated walk),
  VisualWindow **8/8**, DesignMatch **5/5** (2 pre-existing skips, untouched).
- `node tools/native-design-vs-sim.mjs --screens
  thread,home,eye-full,eye-facetime,eye-hidden,sheet-half,sheet-full` —
  **exit 0, 65/65 checks pass, 0 open, ONCE** (plus one `--skip-shoot`
  re-read of the same pass data for the verdict text — no re-shoot).
  402/440 shots rode along per the script's design; anchors evaluate on
  390. iPad untouched, no second pass, no full suite set.
- Simulators only; nothing installed to a device; never pushed.

## The red found and fixed (not shipped red)

1. Both agent UI tests red on the first pass: the store's mirror tick
   re-sets `selectedTabID` to its current value every 5 s, and plain
   `@Published` fires on every set — each tick refreshed
   `lastLocalActionAt`, so the consume path NEVER adopted (permanent
   last-writer-wins for nobody). Fixed with `removeDuplicates()` on both
   sync sinks + `testTickReseenSelectionDoesNotBlockConsume` pinning it.
   Without the UI tests this would have shipped as a dead consume path
   with green units.
2. Band geometry red: the sheet content column is 374 wide, not 390 — a
   screen-derived height rendered 374×219 (1.71:1). Fixed by deriving
   height from actual width (`.aspectRatio(16/9)`); the metric keeps the
   third as a cap. Gate reads 374.0×210.3, diff 0.3pt.
3. The raise test's first shape was unproovable (the agent's tab must exist
   before the session can name it): rewritten so the person opens both
   tabs, returns to the pdf, and the session turns to the site — zero taps
   after that.

## Commits

On aom-studio (this repo), never pushed: the code + tool + evidence commit
(following). Scoped paths: `ios-native/Corner/Models/V2ViewState.swift`,
`ios-native/Corner/Services/V2ViewStateSync.swift`,
`ios-native/Corner/Services/CornerV2API.swift`,
`ios-native/Corner/Services/RoomStore.swift`,
`ios-native/Corner/Stores/VisualWindowStore.swift`,
`ios-native/Corner/Views/ChatView.swift`,
`ios-native/Corner/Views/VisualWindow/V2FaceTimeWindow.swift`,
`ios-native/Corner/Views/VisualWindow/VisualWindowHost.swift`,
`ios-native/CornerTests/R56ViewStateTests.swift`,
`ios-native/CornerTests/R43NativeHomeFirstAndEyeTests.swift`,
`ios-native/CornerTests/Support/CornerV2APIFake.swift`,
`ios-native/CornerUITests/R43HomeFirstAndEyeUITests.swift`,
`ios-native/CornerUITests/R56ViewStateUITests.swift`,
`ios-native/Corner.xcodeproj/project.pbxproj` (xcodegen-regenerated),
`corner/missions/corner-v2/tools/native-design-vs-sim.mjs`,
`corner/missions/corner-v2/rounds/R56-native-view-state-and-website-video.md`,
`corner/missions/corner-v2/rounds/evidence/R56-*.png` (4 new) +
`R19-native-eye-{full,facetime,hidden}-sim-390.png` (gate re-shoots).

## For the orchestrator

- Punch-list: P094/P095/C016 client halves are built and gated; backend
  was taken as shipped (I never saw `convex/` — it is not in this repo).
  Worth a live-thumb check before TestFlight: with two test accounts (or
  the bridge) confirm a real `setViewState` write lands (client sends
  `threadId` as the raw id string, same shape as every `v2Native` call —
  inspect one, I could not: fixture + unit fakes only) and that the
  5 s session lag on the move-on minimize feels instant enough.
- Geometry decision above (16:9 exact, third as cap) changes SHIPPED
  pixels (R43's 281-tall stage → 210). If Patrik prefers the taller stage,
  it is one metric + anchor; say so before the ship.
- `-v2AgentSession` / `-v2AgentTab` are new fixture flags; the full-suite
  pre-ship pass should confirm no suite passes them accidentally (only the
  R56 suite does).
- DesignMatch carries 2 pre-existing skips (not mine).

## Still off

- Deck/document scroll: QuickLook owns its controller — no offset is
  observable, so `scroll` publishes from the site reader only. Page turns
  publish from PDF arrows; QL-wrapped decks report nothing.
- Session lag is the 5 s mirror tick (no socket on the native transport):
  the agent's minimize/raise lands ≤ ~5 s after the write, plus one grace
  tick when it races a person tap (last-writer-wins by design).
- The sheet's outer ScrollView can compete with the band's inner scroll
  for vertical drags starting on the band; the band's fixed height keeps
  the page readable, but a drag that escapes to the sheet scrolls the
  sheet. Not observed failing; named so it is not a surprise.
- `lastViewStateWrite` on the fixture is app-process-local (the test
  process cannot read it) — publish wire proof is unit-level by
  construction.
