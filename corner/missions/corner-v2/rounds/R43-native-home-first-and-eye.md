# R43 — native home-first and the eye: the app opens on home, cards are distinct, the icon cycles the Visual Window

`corner:corner-v2` · BUILDER (native iOS) · 2026-09-08 · mission
`corner/missions/corner-v2/` · extends R41 (home) + R42 (composer/thread) · Patrik's
SPEC-visual-window-companion.md (client side) · punch-list P094–P097.

## Before → after

Before: every cold launch landed in the last thread (Wolfpack); the home
cards repeated one project (live: Aster ×3); the Visual Window was a static
sheet with no eye icon.

After: every cold launch — and every return from a long background — lands
on the home welcome (the R41 General screen); the three cards are three
distinct projects (live on the e2e account right now: one Aster ledger card
+ two onboarding fills — the world has one active subject); every chat
carries the eye top-right, cycling hidden → FaceTime → full → hidden, the
mode persisting per thread. Agent-opened tabs while hidden bring the window
back in FaceTime mode. Website tabs render the desktop page like a
horizontal video (~a third of the screen tall, scrollable inside) in both
FaceTime and full.

Evidence (all fresh this round, `rounds/evidence/`):
launch→home — before `R19-native-thread-sim-390.png` (a cold launch into a
conversation) → after `R19-native-home-sim-390.png` (the welcome, no title,
Aster + 2 onboarding cards); the three eye modes —
`R19-native-eye-full-sim-390.png` (sheet on the site tab, desktop page
374×269.5), `R19-native-eye-facetime-sim-390.png` (the 110×160 box top-right
with the PDF live, thread behind), `R19-native-eye-hidden-sim-390.png`
(thread only, slashed eye). 402-class copies of all five alongside.

## What shipped (files)

- P097 entry = home.
  `ios-native/Corner/Services/AppRouter.swift`: `resolveEntryRoute` always
  answers General (first project when General is absent) — R23's
  last-thread rule is deleted (`rememberV2`, the last-V2 keys, and
  `restoreLastRoom` are gone, with their RootView call). New:
  `longBackgroundThreshold` (300 s), `noteBackgrounded` /
  `shouldReturnHome` (pure, unit-pinned) / `goHome` (pops everything onto
  the home entry; callers skip it while a deep link / notification target
  is queued, so outside arrivals still open their thread via `open(_:)`).
  `ios-native/Corner/Views/RootView.swift`: records backgrounding, returns
  home on activation after a long background; the last thread stays one tap
  away through drawer Recent (`V2RecentStore.record` still fires per
  arrival) + the home cards. `-v2ResetEntry` now also clears per-thread eye
  modes (below).
- P096 distinct cards. `ios-native/Corner/Views/V2HomeWelcome.swift`:
  `HomeSuggestions.build` dedupes by tap destination (`projectID`) —
  subjects resolving to the same project collapse to their freshest card;
  onboarding pads the rest. R41's 20 builder tests pass unchanged (all used
  distinct projects); the Aster×3 world now yields 1 + 2 fills (live PNG
  above).
- P094/P095 the eye (client side).
  `ios-native/Corner/Views/V2EyeMode.swift` (new): `V2EyeMode`
  (hidden/facetime/full + `next`), `V2EyeModeStore` (UserDefaults per
  thread, default hidden so tap 1 → FaceTime; eye/eye.slash/eye.fill icons),
  `V2EyeOverlay` (the eye↔sheet contract as one modifier — the thread view
  no longer type-checks otherwise: every sheet raise lands in full with no
  call-site edits; the person's close — close circle, swipe, last tab —
  means hidden; full with no tabs shows nothing; facetime/hidden drop the
  sheet; all branches guarded so the onChange pair terminates).
  `ios-native/Corner/Views/VisualWindow/V2FaceTimeWindow.swift` (new): the
  ~110×160 floating box (title strip + live stage, tap pulls up to full),
  draggable with a safe-area clamp (`settledFrame` is pure, unit-pinned);
  `V2EyeWebView` (desktop-UA sandboxed WKWebView, scrollable inside, no
  picker/chrome) + `V2EyeWebMetrics.stageHeight` (screen/3).
  `ChatView.swift`: the 44pt eye button rightmost in the 52pt nav bar on
  every chat (gate: x334 y51 44×44), the PiP overlay under the drawer,
  `window.onExternalTabs` → hidden becomes facetime (agent-driven open).
  `VisualWindowStore.swift`: arrival detector — `start` baselines silently,
  later mirrors report never-adopted ids through `onExternalTabs`; the
  person's own opens adopt first and never fire.
  `VisualWindowHost.swift`: full-mode web tabs use the eye web view at
  screen/3 instead of the picker chrome (measured 374×269.5 on 390 ≈ 32%).
- Tests. Units `CornerTests/R43NativeHomeFirstAndEyeTests.swift` (18:
  same-project collapse incl. mission+parent sharing one card, distinct
  projects untouched, background predicate incl. clock/nil/force, cycle
  order + icons, per-thread persistence + unknown-value fallback, arrival
  baselining/local-adopt silence/re-mirror silence, PiP default seat
  {268,158} 110×160 + drag clamp, web stage thirds).
  RouteTests entry section rewritten to the home contract (+ deep-link-over-
  home, goHome pops). UI `CornerUITests/R43HomeFirstAndEyeUITests.swift`
  (5: cold launch → home + eye present, relaunch after visiting Aster →
  home, `-v2HomeOnForeground` background return → home, the full
  hidden→full→hidden→facetime→full walk incl. the web stage, per-thread
  persistence across relaunch). CornerV2Flow's relaunch test now asserts
  home (`testLaunchOpensHomeNotATree`); VisualWindow's relaunch test gains
  `-v2ResetEntry` (clears the eye, keeps the tabs); the flow drawer test
  gains `-v2ResetVisual`.
- Tour + gate. `R19ShootScreens`: `v2-eye` joins the thread dump;
  `testShoot12EyeFull` / `13EyeFaceTime` / `14EyeHidden` (fixture mode,
  deterministic tabs). `tools/native-design-vs-sim.mjs`: three anchor-only
  screens (eye required everywhere; facetime box x268 y158 110×160;
  sheet/facetime forbidden in hidden; web stage required in full) + a `y`
  dimension for frame anchors (new capability, same convention).

My calls (brief-silent, documented): the person's sheet close means
hidden, the agent's close/open means FaceTime — on iPhone the sheet covers
the eye, so the close IS the ring's full→hidden step, and the spec's
"closed = a small floating window" is the agent's act (a user who could
never reach hidden would break tap 3); without this, hidden is
unreachable on iPhone. `-v2ResetEntry` clearing eye modes (not a new flag)
because every fixture suite already launches with it — found the hard way
(see below).

## Gates

- Units: `CornerTests` **536/536** on the 390 test sim (517 carried + 18
  new + 1 net RouteTests).
- UI, each suite alone, 390 test sim `4818124A-…` (never Patrik's 16e
  `0A05C9AA-…`): R43HomeFirstAndEye **5/5**, R41HomeWelcome **4/4**,
  CornerV2Flow **12/12**, VisualWindow **8/8**.
- `node tools/native-design-vs-sim.mjs --screens
  thread,home,eye-full,eye-facetime,eye-hidden,sheet-half,sheet-full` —
  **exit 0, 63/63 checks pass, 0 open, ONCE** (`/tmp/r43-gate.log`;
  `--skip-shoot` re-ran only to capture the full verdict text from the
  same pass data — no re-shoot, no new test runs). The 402/440 shots rode
  along per the script's design; anchors evaluate on 390. iPad untouched,
  no second pass, no full suite set.
- Simulators only; nothing installed to a device.

## The red found and fixed (not shipped red)

`testDrawerCarriesEveryHomeAction` failed mid-round ("the drawer never
opened"): an earlier R43 run had left eye=full + persisted tabs on the
shared fixture thread, so the launch auto-raised the sheet over the drawer
button. Real hermeticity gap, not a flake: per-thread eye persistence
outlives the suite that wrote it. Fixed by folding eye-clearing into
`-v2ResetEntry` (every fixture suite's base arg) + `-v2ResetVisual` on the
one flow test that seeded without resetting. Full flow suite re-run green
12/12 after.

## Commits

On aom-studio (this repo), never pushed: the code + tool + evidence commit
(s
...[truncated 2085 chars]