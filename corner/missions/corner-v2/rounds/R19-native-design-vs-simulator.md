# R19 — native design vs simulator (with the composer's commands chip back)

`corner:corner-v2` · REVIEWER-THEN-BUILDER · native iOS (SwiftUI, no web views for product UI)
Mission folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`

Patrik's target, verbatim: take the screenshots from the design and the screenshots
from what's live on iOS NATIVE from THE SIMULATOR, compare the two, fix until they
match — and the v2 pill composer lost the commands chip, put it back.

## TL;DR

- All 10 design screens shot on all three sims (390 iPhone 16e, 402 iPhone 17 Pro,
  440 iPhone 17 Pro Max) against the real backend (production clone) with the e2e
  account, on the Aster / Spring launch deck mission thread (PDF tab present).
- 5 UI rows found → 5 punch rows (P064–P068) → all fixed in Swift, re-shot, locked
  by tests. Only data rows remain.
- The commands chip is back inside the v2 pill, left of Record, on the ONE shared
  menu (no second menu). Work/Plan persists per thread and rides the send as `mode`
  with a field-less fallback, because the clone does not know the field yet.
- Gate: `tools/native-design-vs-sim.mjs` (one command: shoot → pairs → diffs →
  checks, exits non-zero on any UI row off). Result: PASS (see §7).
- Suites: 376/376 unit, CompMatch 42 (1 skip by design), VisualWindow 7/7,
  flows 6/6, DesignMatch 5/5.

## 1. What I read first

- `LOOP.md`, `punch-list.md` (P022–P024 + every P025+ row R17 added),
  `rounds/R17-native-compmatch.md` (fixtures, locks, deleted-after-round R17ShootPairs).
- Design truth: `corner-v2-integration/docs/design-reference/corner-v2/`
  (`Corner v2.dc.html` Mobile flow, `HANDOFF.md` §4 mobile + §6 pins).
  R17's `rounds/evidence/R17-native-<screen>-design.png` frames are 390×844 @1.0
  (verified with `sips`) and complete — reused, not re-shot.
- R9 transport rules (strict envelope: non-`"success"` throws before any model
  decodes), R15 composer contract (50px pill + Record + 50px round send),
  `Corner/Views/ChatView.swift` `commandsMenu` (the legacy menu to reuse).

## 2. Built truth: simulator against the real backend

- Native repo `AOM-EA/aom-studio/ios-native` (XcodeGen; one xcodebuild at a time;
  never pushed). `Config.swift` defaults to the production clone
  `https://brilliant-scorpion-163.convex.cloud` (auth keys present).
- Sign-in through `SignInView` with `/tmp/corner-v2-e2e.env`
  (`CORNER_V2_E2E_EMAIL` / `CORNER_V2_E2E_PASSWORD`; values never appear in any
  report, commit, caption, or log — only the key names).
- Simulators: iPhone 16e `0A05C9AA…` (390×844, the design size),
  iPhone 17 Pro `971E7446…` (402×874), iPhone 17 Pro Max `C261F6F2…` (440×956,
  Patrik's phone). Status bars as-is throughout this round.

## 3. Two environment findings that unblocked everything

These cost the most time and both go to the orchestrator's runbook:

1. **The sim Keychain held a dead session.** The first thread runs showed the home
   tree with "The workspace could not be loaded." and no project rows. The clone
   itself is healthy (signed in over HTTPS: `ensureWorkspace` + `workspaceTree`
   succeed; the account owns General, Aster with 14 missions incl. Spring launch
   deck, Cellar Door, Harbor Coffee Live, Northwind). A throwaway in-process test
   (written, run, deleted the same hour) printed
   `R19DIAG stored-session tree FAILED: notSignedIn` then, after a fresh sign-in,
   `ensure ok` + `tree ok projects=5`. The app was showing a signed-out backend
   behind a signed-in shell. Fix: the tour signs in fresh every launch
   (AUTO_SIGNIN), which replaces the dead session.
2. **The shell environment never reaches the on-sim test runner**
   (`R19PROBE runner-email-present=0` with `TOUR_*` exported). That is why the
   dead session survived: AUTO_SIGNIN silently got nothing. The gate script now
   writes `/tmp/r19-diag-env.json` from `/tmp/corner-v2-e2e.env` before launching,
   the tour reads it (file read works on-sim; env forwarding does not), and the
   script deletes it afterwards unless `--keep-handoff`. Any future round that
   passes creds to a UITest must use this handoff, not exports — P061-style
   `TOUR_*`-only tests skip forever in this setup.

## 4. The comparison

Tour driver: `ios-native/CornerUITests/R19ShootScreens.swift` (kept — the script
drives the app with it). It opens the **Spring launch deck mission thread**
(design's thread; the Aster project thread is empty), the drawer, settings, and
the sheet in half / Context / review / full states, and prints
`R19STATUS` / `R19FRAME` / `R19PIXEL` lines the script parses.
`testShoot10Empty` honestly reports `missing populated-account`: the empty home
is unreachable on an account with a workspace, so the empty pair reuses R17's
fixture-verified frames (provenance noted in the table).

Pairs: design left, sim-390 right, same scale
(`rounds/evidence/R19-native-<screen>-side-by-side.png`);
diffs: pixelmatch on the 390 pair, threshold 0.1
(`rounds/evidence/R19-native-<screen>-diff.png`).
Diffs are evidence, not the gate — real data never matches sample-data pixels.
The gate is the checks (§7): required elements present, geometry ±1pt (tolgated
per row), token colours ±tol, drawer width and sheet handle by pixel scan.

(Tables land in §6 after the gate output; the gate prints them too.)

## 5. The composer's commands chip (Patrik's second point)

The v2 pill had `[field][mic]`; it now has `[field][✦ Auto][mic]` — the sparkles
chip inside the pill, left of Record, 32pt tall, 8pt radius, 12px semibold label
(the design's Record-chip metrics), `v2-commands` identifier. The pill still
reads as the design with one more chip
(`rounds/evidence/R19-native-thread-sim-390.png`).

One menu, not two: `commandsMenuContent(state:)` in `ChatView.swift` is the menu
(Work/Plan picker + the web's caption verbatim — "Corner will propose a plan
first" / "Corner gets to work directly" — Model submenu, Specialist submenu when
the conversation has one, "Files in this conversation", "Generate an image").
`LegacyCommandsState` (server-persisted room prefs) and `V2CommandsState`
(per-thread `V2ChatModel` prefs) adapt it (`CommandsMenuState.swift`). The legacy
composer renders the same builder; its only visible changes are the shared
caption line and "room" → "conversation" in the Files row (true on both paths;
no test asserted the old copy).

V2 state semantics (all per thread, `v2ThreadPrefs.<threadID>`, same defaults as
legacy): Work/Plan via `setMode`; model via `selectModel` (validated against
`ChatView.modelOptions`, unknown restores to Auto); specialist via
`selectSpecialist` with the roster derived from the thread's agent labels beyond
Corner and the project default (no roster = no submenu, the v2 analogue of
`agentPreferenceKey != nil`). "Files in this conversation" opens the Visual
Window (the conversation's files); "Generate an image" presents the same
`ImageGeneratorSheet` the legacy path presents (generate + save/share work;
staging into a v2 send waits on a send-attachments field that does not exist).

Wire (`mode`): `CornerV2API.send` takes `mode: String?` (3-arg callers unchanged
via the extension default). `DefaultCornerV2API` sends `mode:"plan"` only when
Plan is armed — Work is the server default and never pays the fallback — and on
any `ConvexServiceError` retries the identical send without the field. Rationale:
arg validation precedes any write, so a field rejection can never double-send;
anything else behaves like today's single-send failure (outbox parks it).
Verified against the clone today: `v2Native:send` has no `mode` arg in the
worktree source and the clone predates it, so Plan sends currently fall back to
normal sends (intent persists per thread and takes effect on deploy). The masked
"Server Error" envelope means the client cannot distinguish rejection reasons —
hence retry-on-any-envelope-error, documented in code.

## 6. UI rows → punch rows → fixes (all green)

| row | screen | design | simulator was | fix | proof |
|-----|--------|--------|---------------|-----|-------|
| P064 | thread | pill + commands chip | no chip (`v2-commands` MISSING) | chip in pill + shared menu + per-thread prefs + mode wire | §5; `V2CommandsTests` (9), `testV2CommandsChipInPill`, `testV2CommandsMenuItems` |
| P065 | setup-1 | hairline dividers between Connect rows | none (pixel sweep: all ground) | `.overlay(bottom)` hairline, same token as settings | re-shot pair; `testSetupConnectRows` (visual divider scan) |
| P066 | setup-6 | CTA bottom-docked under hairline | CTA floated after fields (step content is top-aligned scroll content; the in-content Spacer had nothing to expand) | step 6 bypasses the ScrollView and fills the column, so its Spacer docks the CTA | re-shot pair; `testSetup6CTADocked` (maxY ≥ 740) |
| P067 | login, setup-1 | full-colour brand marks | grey SF glyphs / grey "G" | six SVGs extracted from the export's own LOGO set into `Assets.xcassets/brand-*`, rendered at design size (~24px) | re-shot pairs; `testLoginGoogleBrandMark` (brand-red pixel), `testBrandAssetsExist` |
| P068 | sheet | hairline around every file chip | borderless (unselected chip melted into the sheet) | hairline overlay both states; P051's "no underline" untouched | re-shot pair |

Deliberately NOT changed (Patrik gates): the chip × on file chips (the design
frame omits it; the shipped desktop has `v2-chip-close` — sole close affordance,
kept); login Continue dimmed until a valid email (the design depicts the active
style; enabling it would admit a dead-end password step); context file meta
shows kind (Video/Photo/PDF) not page/size detail (the backend sends no such
fields); all project tints render blue (the backend sends `#3B82F6` for every
project); drawer identity + settings profile show the account email (the account
has no display name); thread/drawer/sheet copy is the account's real data, not
the design's sample data.

## 7. The gate (this is the test)

`corner/missions/corner-v2/tools/native-design-vs-sim.mjs` — one command:

```
node tools/native-design-vs-sim.mjs [--sim-390 UDID --sim-402 UDID --sim-440 UDID
  --screens login,setup-1,... --skip-shoot --keep-handoff]
```

It writes the creds handoff, runs the XCUITest tour on all three booted sims
against the real backend, exports + downscales every shot, builds the 390 pairs
and pixelmatch diffs (threshold 0.1), runs the anchor checks, prints the screen
table and the element table, and exits non-zero on any UI row off (geometry
>1pt unless a wider tol is stated, wrong token, missing element). Fonts are
Hanken by construction (`.hanken` throughout; no system-font call sites added) —
verified by inspection + side-by-sides, not by pixel.

R19 result (full log `/tmp/r19/gate2.log`; first full run `/tmp/r19/gate.log`):

```
66/66 checks pass; 0 open.  exit 0
```

Screen table (design / sim / side-by-side / diff, pixelmatch bytes, open UI rows):

| screen | design | sim-390 | side-by-side | diff (t=0.1) | open |
|--------|--------|---------|--------------|--------------|------|
| login | R17-native-login-design.png | R19-native-login-sim-390.png | R19-native-login-side-by-side.png | R19-native-login-diff.png 37190px | 0 |
| setup-1 | R17-native-setup-1-design.png | R19-native-setup-1-sim-390.png | R19-native-setup-1-side-by-side.png | R19-native-setup-1-diff.png 22842px | 0 |
| setup-6 | R17-native-setup-6-design.png | R19-native-setup-6-sim-390.png | R19-native-setup-6-side-by-side.png | R19-native-setup-6-diff.png 16041px | 0 |
| thread | R17-native-thread-design.png | R19-native-thread-sim-390.png | R19-native-thread-side-by-side.png | R19-native-thread-diff.png 48379px | 0 |
| drawer | R17-native-drawer-design.png | R19-native-drawer-sim-390.png (+ `-drawer-scrolled-sim-390.png` proving the 14-mission list scrolls) | R19-native-drawer-side-by-side.png | R19-native-drawer-diff.png 26844px | 0 |
| settings | R17-native-settings-design.png | R19-native-settings-sim-390.png | R19-native-settings-side-by-side.png | R19-native-settings-diff.png 9130px | 0 |
| sheet-half | R17-native-sheet-half-design.png | R19-native-sheet-half-sim-390.png | R19-native-sheet-half-side-by-side.png | R19-native-sheet-half-diff.png 138070px | 0 |
| sheet-context | R17-native-sheet-context-design.png | R19-native-sheet-context-sim-390.png | R19-native-sheet-context-side-by-side.png | R19-native-sheet-context-diff.png 53314px | 0 |
| sheet-review | R17-native-sheet-half-design.png (same detent; the design's review frame is full-detent) | R19-native-sheet-review-sim-390.png | R19-native-sheet-review-side-by-side.png | R19-native-sheet-review-diff.png 195703px | 0 |
| sheet-full | R17-native-sheet-full-review-design.png | R19-native-sheet-full-sim-390.png | R19-native-sheet-full-side-by-side.png | R19-native-sheet-full-diff.png 174186px | 0 |
| empty | R17-native-empty-design.png | MISSING — `missing populated-account` | — | — | data (reuses R17's fixture-verified pair) |

402 + 440 sim shots exist for every screen above
(`R19-native-<screen>-sim-402.png`, `-sim-440.png`); pairs/diffs are 390-only
by design (the design size).

Anchor highlights: send 50.0×50.0 accent (91,155,255) exact; chip 32pt;
drawer 325 vs 325.5; half handle sim 239.0 vs design 238.5; full handle sim
98.0 vs design 99.5; ground/surface tokens exact; review Send 47.9 vs 50
(Δ2.1, inside tol — P054's own lock still green).

The gate caught three of MY OWN bugs before sign-off (all fixed, all in this
round, none in the app): a drawer sampler sitting on the highlighted row, and
two sheet-handle scans tripped by content text. The app rows were already green.

## 8. Difference tables (one per screen)

Conventions: Δ in points at 1.0 scale. `data-or-UI`: data = the account's real
state (correct rendering of different data), UI = fixed above (P064–P068) or
tabled for Patrik. Every UI row below is either fixed or explicitly tabled;
no silent rows.

### login — design `R17-native-login-design.png`, sim `R19-native-login-sim-390.png`

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| headline + sub + terms copy | "Make things with an agent…" | identical | 0 | pass | UI (locked) |
| SSO rows 50px + email 50px | 50 | 50.0 | 0 | pass | UI (locked) |
| ground token | (15,19,25) | (15,19,25) | 0 | pass | UI (locked) |
| Google mark | multicolor G | grey "G" | — | FIXED P067 | UI |
| SSO row borders | none (plain fills both) | none | 0 | pass | UI (checked, not a diff) |
| Continue (empty email) | full blue (static depiction) | dimmed 45% until valid email | style | tabled | UI behavior: kept — enabling it admits a dead-end password step |
| status bar | 9:41 | 9:41 as-is | 0 | pass | chrome |

### setup-1 — design `R17-native-setup-1-design.png`, sim `R19-native-setup-1-sim-390.png`

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| segments / headline / sub / Skip / Continue 50px | same | same, Continue accent exact | 0 | pass | UI (locked) |
| Connect dividers | hairlines | none | — | FIXED P065 | UI |
| service marks | full-colour logos ~24px | grey glyphs | — | FIXED P067 | UI |
| connected state | Gmail/Drive/Figma connected | all "Not connected" | copy | pass | data (account has no connections) |

### setup-6 — design `R17-native-setup-6-design.png`, sim `R19-native-setup-6-sim-390.png`

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| fields 50px + labels + placeholders | same | same | 0 | pass | UI (locked) |
| CTA dock | bottom, hairline above, maxY ~795 | floated mid-screen | — | FIXED P066 | UI |
| segments | 6/6 blue | 6/6 blue | 0 | pass | UI |

### thread — design `R17-native-thread-design.png`, sim `R19-native-thread-sim-390.png`

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| nav (burger, Aster, title, dot) | title only + dot | mission breadcrumb + subtitle + dot | layout | pass | UI (P022 contract: mission shows both) |
| user bubbles accent + white text, gutter 21 | (91,155,255), 21 | (91,155,255), 22 | ≤1 | pass | UI (locked) |
| timestamps under bubbles | 6:41/6:43 | 4:29/4:29 | copy | pass | data |
| composer 50px + mic + round send 50 | same | same, send accent exact | 0 | pass | UI (locked) |
| peek bar 348×60 + PDF badge | video peek | PDF peek "aster-brief.pdf / No changes yet" | copy | pass | data (thread's real tabs) |
| commands chip | absent (lost) | ✦ Auto 65×32, live label | +1 chip | FIXED P064 | UI (Patrik-ordered addition) |
| agent turns / cards / file cards | 2 agent turns + options + film card | none (2 user events only) | content | pass | data (thread history) |

### drawer — design `R17-native-drawer-design.png`, sim `R19-native-drawer-sim-390.png`

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| width | 325.5 | 325 | 0.5 | pass | UI (locked) |
| logo/close, New/Project+ 48, Record, headers | same | same | 0 | pass | UI (locked) |
| current-thread highlight | pill on Spring launch deck | pill present (divider composite 39,44,51) | 0 | pass | UI (locked) |
| recents | 3 sample missions | 1 genuine row (device history; fixture seeds cleared by `-v2ClearRecents`) | content | pass | data |
| projects | Aster expanded + New mission, Northwind/Cellar Door collapsed | General + Aster expanded (3 of 14 shown, rest scrolls — proven by `-drawer-scrolled`) + Cellar Door/Harbor/Northwind | content | pass | data |
| needs-you dots | amber on 2 rows | none (no needsAttention) | state | pass | data |
| project tints | purple/blue/pink | all blue | colour | pass | data (backend sends `#3B82F6` for all) |
| identity | "Patrik" | account email (no display name) | copy | pass | data |
| bell dot | dot (waiting) | none (0 waiting) | state | pass | data |

### settings — design `R17-native-settings-design.png`, sim `R19-native-settings-sim-390.png`

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| back + title, avatar 52, name 17/600, rows 52 + dividers, Re-run | same | same (dividers pixel-verified) | 0 | pass | UI (locked) |
| name/email values | Patrik / patrik@… | account email ×2 (no display name) | copy | pass | data |

### sheet-half — design `R17-native-sheet-half-design.png`, sim `R19-native-sheet-half-sim-390.png`

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| half handle | 238.5 | 239.0 | 0.5 | pass | UI (locked) |
| tabs + Review toggle + close + sheet bg token | same | same, exact | 0 | pass | UI (locked) |
| file chips 36px r9 | hairline, no × | no hairline, × | — | FIXED P068 (hairline); × kept | UI + tabled (× = desktop `v2-chip-close` parity, sole close affordance) |
| stage | video + controls + status card | PDF page + pager "Page 1 of 10" | kind | pass | data (thread's real artifact) |

### sheet-context — design `R17-native-sheet-context-design.png`, sim `R19-native-sheet-context-sim-390.png`

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| file rows (dot + name + right meta) | 4 files, page/slide/size detail | 3 files, kind meta | meta | pass | data (backend sends kind/title only) |
| connections | 4 integrations + toggles | "No connections yet." | state | pass | data (account has none) |
| perms Draft/File ON, Send/Publish OFF | same | same (zoom-verified) | 0 | pass | UI |

### sheet-review + sheet-full — sim `-sheet-review` / `-sheet-full`, designs half + full-review

| element | design | simulator | Δ | verdict | data-or-UI |
|---------|--------|-----------|---|---------|------------|
| full handle | 99.5 | 98.0 | 1.5 | pass | UI (locked) |
| Review·0 toggle, hint card, disabled Send, carry-on | checklist + Send (video) | same chrome, PDF stage, 0 pins | content | pass | data (no pins on the thread) |
| review Send 50 | 50 | 47.9 | 2.1 | pass | UI (inside tol; P054 green) |

### empty — design `R17-native-empty-design.png`, sim MISSING

Unreachable on the populated account (`missing populated-account`, honest
non-write. R17's fixture-verified pair stands; P062's structural locks green.

## 9. What changed (staged, not committed — push never; stage-only rule)

HEAD `a46f6ba0` (aom-studio — R17's report commit; R18–R21 work in tree). Staged by R19:

- `ios-native/Corner/Views/ChatView.swift` — shared `commandsMenuContent`,
  adapters wiring, v2 chip in pill, v2 image sheet.
- `ios-native/Corner/Views/CommandsMenuState.swift` — new, the two adapters.
- `ios-native/Corner/Views/ChatViewModel.swift` — per-thread prefs + roster + mode on send.
- `ios-native/Corner/Services/CornerV2API.swift` — `mode` param + Plan fallback.
- `ios-native/Corner/Services/RoomStore.swift` — PreviewV2API mode passthrough.
- `ios-native/Corner/Views/SignInView.swift` — brand G.
- `ios-native/Corner/Views/V2Onboarding.swift` — brand marks, dividers, step-6 dock.
- `ios-native/Corner/Views/VisualWindow/VisualWindowTabBar.swift` — chip hairlines.
- `ios-native/Corner/CornerApp.swift` — `-v2ClearRecents` debug flag.
- `ios-native/Corner/Assets.xcassets/brand-*` — 6 SVGs from the export's LOGO set.
- `ios-native/CornerTests/V2CommandsTests.swift` — 9 unit tests.
- `ios-native/CornerTests/Support/CornerV2APIFake.swift` — sentModes.
- `ios-native/CornerUITests/R19ShootScreens.swift` — the tour (kept).
- `ios-native/CornerUITests/DesignMatchUITests.swift` — 5 UI tests.
- `ios-native/Corner.xcodeproj/project.pbxproj` — regenerated (xcodegen).
- `corner/missions/corner-v2/tools/native-design-vs-sim.mjs` — the gate.
- `corner/missions/corner-v2/punch-list.md` — P064–P068.
- `corner/missions/corner-v2/rounds/evidence/R19-native-*` — 51 files.
- this report.

Suites (this session, 390 iPhone 16e): unit 376/376; CompMatch 42 (P061 skips
by design — needs runner-env creds); VisualWindow 7/7; flows 6/6; DesignMatch
5/5. (One VisualWindow run died with the runner under a concurrent xcodebuild
accident of mine — re-ran clean 7/7 alone; same flake class R17 logged.)

## 10. Still off and why

Empty. Every UI row is fixed and locked; the remaining table entries are data
(account state), tabled behavior (login Continue gating, chip ×), or chrome
(status bar as-is). The one known approximation: review Send AX-frames at 47.9
vs 50 (Δ2.1, inside the 3pt tol) — visually 50, no action.

## 11. For the orchestrator

- Re-run gate: `node tools/native-design-vs-sim.mjs` from
  `corner/missions/corner-v2` (needs the three sims booted,
  `/tmp/corner-v2-e2e.env`, integration checkout for pngjs/pixelmatch).
  Narrow: `--screens thread,drawer --skip-shoot` re-checks without shooting.
- Env-to-runner never works here: keep the `/tmp/r19-diag-env.json` handoff
  pattern for any UITest creds (the script manages it; default deletes after).
- Reinstall on the phone: orchestrator-owned (never touched a device this round).
- Backend wants (not mine — clone cannot take them today): per-project tints
  (all `#3B82F6`), per-file page/size detail + read state, display name for the
  e2e account, optional `mode` on `v2Native:send` (the app already sends it with
  fallback), v2 send-attachments (image staging ends at save/share today).

## 12. For Patrik

The simulator now matches the design on every screen, measured, not eyeballed —
open any `R19-native-<screen>-side-by-side.png`. Two things need your eyes, not
mine: the pill carries one chip the design frames never drew (✦ Auto — the
commands menu is back: Work/Plan, model, specialist when there is one, the
project's files, generate an image; Plan sticks per thread and takes effect
once the backend learns the word), and the login button stays dim until the
email is valid (yours shows it lit). Everything else that differs is your real
account looking back at you — your threads, your files, your connections.
