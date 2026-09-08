# R42-native-cv6-composer-bubbles-loader — the phone thread wears CV6, not iOS defaults

Brief: `briefs/R42-native-cv6-composer-bubbles-loader.md` (P089–P093, Patrik's 11:30–11:48 AM annotations).
Finish brief: `briefs/R42b-native-finish.md`. Previous worker's tree was carried uncommitted; R42b verified it,
fixed one real regression it left, ran every gate, committed. Code commit `7c3c3c21` (this report follows separately).

## What shipped per item

- **P090 command card.** The sparkle chip's iOS `Menu` is gone. A tap raises `V2CommandsCard`
  (`ios-native/Corner/Views/V2CV6Polish.swift`): solid `raised2`, hairline, 12pt radius, ~260pt wide,
  44pt rows, 14.5 medium ink labels, 18pt `inkSoft` icons, dividers between the four groups
  (Work/Plan + mode caption in the web's verbatim copy, Model with chevron + sub-line, Specialist when a
  roster exists, Files/Image, Talk/Read-checklist). Model/Specialist drill into in-card pickers with Back.
  Anchored above the chip via `anchorPreference`, no blur, no scrim, outside tap dismisses.
  Design | sim: `rounds/evidence/R27-review-02-commands-menu.png` (desktop rhythm) |
  `rounds/evidence/R42-native-commands-card.png` (shot below: Work✓, Plan + caption, Model — Auto +
  `Auto (Claude → Codex)`, Files, Generate, Talk, dimmed Read-checklist).
- **P091 composer pill.** Pill is 50pt on `surface` with its hairline always (accent on focus only);
  sparkle chip + mic inside as CV6 chips (32pt, hairline, 15pt icons — kept the R28 gate-anchored 32,
  not the brief's approximate 28), 50pt round accent send outside, spacing per `V2ComposerMetrics`.
  Send Tadeusz stays 50×50 (gate: 50.0×50.0, 0.0 drift).
- **P092 thread rows.** `V2ThreadType` pins the design at 390: 16pt gutters, 14pt row spacing, agent name
  12.5 semibold ink + time 11 muted on one line, body 15/22 ink via `hankenFixed` (never Dynamic-Type
  scaled), user bubble accent 16pt radius (6pt tail) capped at 74% of the measured thread width, stamp
  11 muted right-aligned under it. Gate anchors: `v2-agent-label` x16 (16.0) h17 (17.0),
  `v2-event-time` h14 (14.3). CompMatch P034/P044 re-pinned (15pt line box 18.6–20.8, two 22pt lines
  41.5–45.5, gutter x16). Design | sim: `R17-native-thread-design.png` |
  `R19-native-thread-sim-390.png` / `R19-native-thread-side-by-side.png`.
- **P089 loader.** All four spinner branches (cold entry, project/mission/tab switches) show
  `V2LoadingMark`: the Corner lockup fading/scaling in over ~600ms over a breathing tint, no text, no
  card, no fake wait (branch clears the moment the load lands). Reduce Motion / tour: static mark.
  Sim: `rounds/evidence/R42-native-loader-mark.png`. UI test seeds a 6s hold (`-v2SeedLoader`) and
  asserts zero `Opening` copy on screen, then the thread still lands.
- **P093 glow.** `V2ComposerGlow` + `V2AmbientGlow`: two tinted ellipses (project's sidebar avatar tint,
  General = app accent; garbage tint falls back to accent) drifting on a 10s loop inside a 140pt band
  clipped to the pill's footprint (pill/send gap stays flat ground, P039 lock held), 12–15% opacity,
  +boost for 1s when a reply lands on an awaited send (`v2BoostGlowIfReplied`; initial loads never
  boost). Reduce Motion / tour: frozen. Sim: `rounds/evidence/R42-native-composer-glow.png`
  (subtle by spec — 12–18% by design).

## R42b fix (the red the previous worker left)

Its chip was `Button { } .buttonStyle(.plain)`. On iPad that silently breaks the **sibling paperclip
Menu**: the popover never presents (`testAttachMenu` "no Photo Library row", 0/3 iPad; phone green —
iPhone uses the sheet path). Bisected on the iPad sim: not the glow, not the card overlay, not the
Button, not the anchor — `.buttonStyle(.plain)` alone reproduces it. Fix: default button style on the
chip (explicit `inkSoft` foreground keeps the look; press is a system dim). Bisect trail: Menu→pass,
anchorless Button→pass, anchor-only→pass, +plain→fail, final tree→pass. Comment pinned at the chip.

## Gates

- Units: `CornerTests` **517/517** on the 390 sim (506 carried + 11 new `R42NativeCV6Tests`).
- UI, each suite alone, 390 test sim `4818124A-…` (never Patrik's 16e; terminate + uninstall +
  `defaults delete … cv6-theme` before the runs): R42NativeCV6 **6/6**, CompMatch **45 (1 skip, 0 fail)**,
  DesignMatch **5/5**, VisualWindow **8/8**, CornerV2Flow **12/12**, ComposerParity **14/14**,
  R41HomeWelcome **4/4**, R32Wiring **7/8** (below).
- `node tools/native-design-vs-sim.mjs` **exit 0, 78/78 — four passes** (`/tmp/r42-gate1/2.log` pre-fix,
  `/tmp/r42-gate3/4.log` on the final tree; the only delta is the style removal, zero layout impact).
- iPad Pro 13-inch (M5) `3BFA26A5-…`: ComposerParity **14/14**, R32Wiring **8/8** (post-fix).

## Commits

On aom-studio, never pushed: `7c3c3c21` (code + tool + re-shot R19 evidence + 4 new R42 evidence PNGs,
scoped paths + regenerated `project.pbxproj`), then this report. punch-list P089–P093 + LEDGER left
untouched for the orchestrator (shared tracker files, out of the scoped paths).

## For the orchestrator (TestFlight ship)

Phone reinstall = rebuild + run from `7c3c3c21`; nothing installs to a device from here. Suggested:
flip P089–P093 to done citing this report. No backend ask from this round. Reads added: none (fixture
only; the glow tint reads the already-loaded project summary).

## Still off and why

1. **R32Wiring phone 7/8 — `testFailedUploadRetriesAlone` wedges** ("main thread busy 30s" in a text
   query after the fixture send). Pre-existing, not R42: reproduced identically on stashed base HEAD
   (pair fails on base, victim-first pair passes on base, solo passes on base 2/2); in-suite it fails
   ~always on the phone sim while iPad goes 8/8. Order/load-dependent fixture-infra flake — needs a
   fixture round, not a reopen of R42. Commit what is green per the brief; this is the one red.
2. ComposerParity phone needed a second run (first: `testReturnSends` cold-start "entry thread never
   appeared" after reinstall; solo 10s + full re-run 14/14 green). Infra, same class as (1).
3. Chips are 32pt, brief said 28pt: kept the R28 gate-anchored measurement (anchor `h32` = 32.0 exact);
   the brief's number was approximate, the gate is exact.
4. Composer outer padding stays 21 (R24 placeholder budget); only the thread column moved to 16.
5. Chip press feedback is now the system dim (price of the iPad fix); static look unchanged.
6. iPad home/loader/card not screenshotted (suites green there; phone pixels verified).
7. Sim thread shots carry live R51 probe rows (Paige, pullups), not fixtures — pixelmatch diffs are
   evidence-only by gate design; geometry is what the gate pins.
