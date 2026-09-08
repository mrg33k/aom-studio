# Brief R17-native-compmatch — measure the native iPhone app 1:1 against the design's Mobile flow, then fix every difference (P024 + P025…)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `punch-list.md` (P022-P024 are the native rows so far; P024 is
open and is yours), `rounds/R15-native-visual-window.md` (what shipped last on native and how the UI
tests are run), and `rounds/R6-review-compmatch.md` + `tools/cm-measure.mjs` (how the desktop was
measured: same anchors, same viewport, design vs built, ≤1px = pass). Write your report to
`rounds/R17-native-compmatch.md`: every command with its output, and one measurement table per screen.

You are a headless worker, the REVIEWER-THEN-BUILDER for the native app. Nobody will answer questions.

## Why this round exists

Patrik installed the native build on his iPhone 17 Pro Max at 2026-09-06 11:34 AM and said: "iOS native
needs a ton of work, have we looked at it 1:1 against the design?" The answer was no. The desktop was
measured element by element (15 anchors within 1px at 1440, P001-P109 all closed). Native was only
checked screen by screen from fixture-mode screenshots against HANDOFF section 4 prose. This round makes
native pass the same bar the desktop passed, and it does it against REAL data, because that is what is on
his phone.

## Design truth

`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/design-reference/corner-v2/`:
- `HANDOFF.md` section 4 "Mobile layout (iOS)": device 390×844, status bar 54, home indicator 134×5 at
  bottom 9, bottom actions 44 above it, gutter 20, nav bars 52 with 44pt targets, no chip borders,
  centered title with the PROJECT as the 12.5px line above, status as a 10px dot. Thread: composer 50px
  pill + 50px round send, Record inside the pill; artifact peek bar 60px above the composer with a live
  thumbnail and change count. Review sheet: half = top 22%, full = top 34px via the handle; underlined
  tabs, Review toggle, close; stage height = media height (240 half / 400 full, capped by aspect) +
  chrome (50, or 160 for timed media); checklist and Send only in review mode. Drawer: 84% width, logo +
  close up top, New / Project + row, Record a call, Recent, Projects with missions; identity + bell +
  gear at the bottom. Primary buttons 50px radius 14; secondary 48px; type 16px. Section 5 for the
  Login / Setup / Empty states, section 6 for pins.
- `Corner v2.dc.html` has the phone itself: the "Mobile flow" section renders a `[data-phone]` frame,
  390×844, radius 48, scaled by `phoneScale` (set the viewport tall enough, ≥ 1100px, so the scale is
  1.000, or read the scale and divide). Screens in the storyboard rail above the device: Log in → Setup
  (6 steps) → Empty → Thread → Review sheet → Menu drawer → Settings. Serve the export the way
  `tools/cm-measure.mjs` does (Playwright, NOT on port 5173: the web worktree's live suite is using it;
  use 5177), click through every rail entry, and screenshot each phone screen at scale 1 as
  `rounds/evidence/R17-native-<screen>-design.png`. Measure the anchors listed above with
  `getBoundingClientRect()` inside the phone frame (subtract the frame origin) and write them down
  BEFORE you look at the built app.

## Built truth (three sizes, real data)

Native repo `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native`, HEAD `f2999d95`
or later, clean. XcodeGen; one xcodebuild at a time; never push (no access); stage only files you
touched plus a regenerated `project.pbxproj`.

1. **390-wide phone (the design's device).** Use a simulator whose logical width is 390
   (`xcrun simctl list devicetypes` → an iPhone 16 / 16e / 15 / 14; create one with
   `xcrun simctl create` if none exists). Every measurement table is at this size.
2. **iPhone 17 Pro (402×874)** — the existing booted simulator, for the UI tests.
3. **iPhone 17 Pro Max (440×956)** — Patrik's phone. Create the simulator if missing. Every screen
   gets a screenshot here too; anything that only breaks at this width is a punch row.

Real backend: `Config.swift` now defaults to the v2 production clone
`https://brilliant-scorpion-163.convex.cloud`, and the clone has the auth keys (sign-up and sign-in
work; the web live suite proved it at 11:40 AM). A real test account on the clone is in
`/tmp/corner-v2-e2e.env` (`CORNER_V2_E2E_EMAIL` / `CORNER_V2_E2E_PASSWORD`, written by the web live
suite; that workspace already has a project and a mission). Sign in with it through the app's own
`SignInView` (email + password). The password never appears in a report, a commit, or a screenshot
caption. If the file is missing, create an account through the web preview
`https://corner-v2-integration-8ysfjie48-aheads-projects-d2a4c70f.vercel.app/auth` with Playwright
(`e2e/live.spec.ts` `passwordFlow` shows the selectors) using a fresh `corner-v2-e2e+r17…@aom-inhouse.com`
address and a random password, and write it to that same file with mode 0600.

Scale: Patrik's own workspace is AOM = 47 projects + 121 missions. The test account will not have
that, so extend the fixture (`V2_FIXTURE_STUB` mode) to 47 projects / 121 missions with real-length
titles (take titles from
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/audits/2026-09-06-aom-r12-reconciliation.json`)
and shoot the drawer, Recent, and the collapsed/expanded project rows at that density. Anything that
truncates badly, overlaps, or scrolls wrong at that size is a punch row.

## What to compare, screen by screen

For each design screen (Log in, Setup step 1 and step 6, Empty, Thread with an artifact peek, Review
sheet half + full with pins, Menu drawer, Settings) produce the pair
`R17-native-<screen>-design.png` / `R17-native-<screen>-built-390.png` (+ `-built-440.png`) and a
table: `anchor | design (x,y,w,h or value) | built | Δ | verdict`. Anchors, minimum: nav bar height
and title/subtitle sizes and positions; the status dot; gutters; composer pill height/radius and the
Record chip inside it; the round send; the peek bar height and its thumbnail; sheet top offsets for
half/full; tab underline; Review toggle; stage height; checklist rows and the Send button; drawer
width, its header, the New / Project + row, Record a call, section labels, row heights, the identity
row with bell + gear; login rows (Google/Apple/SSO 72 → whatever the phone design shows, email, Continue);
setup progress segments, Back/Continue heights; primary 50/r14 and secondary 48; body type 16.
Colours: read the design's computed colour at the anchor and the built pixel at the same anchor (the
tokens are in HANDOFF section 2; the app's `Theme`/token file must map 1:1).

Every Δ > 1pt, every missing element, every wrong colour or weight, every element the design does not
have = one row `P0NN | native <screen> | what differs | design | built | file:line | R17 | open` appended
to `punch-list.md` (continue from P025). Then FIX them, all of them, in this round: smallest diff that
makes the anchor match, a UI test that locks each fix (one assertion per row, on the 390 device where
the number is the design number), re-shoot the pair, update the row to `fixed (R17) rounds/evidence/…`.
Loop: measure → fix → build → test → re-measure until a full pass has zero open native rows. P024 (the
Preview / Context underlined tabs in the review sheet header) is in this pass.

## Hard lines for this round

- Design wins over the current Swift. Where the plan's Swift snippets and the design disagree, the
  design wins; where the backend JSON and the plan disagree, the backend wins (R9/R10 rule).
- Do not touch `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/src` or `convex`, and do
  not bind port 5173. The web is mid-cutover.
- Do not change `Config.swift` defaults. Do not install to any physical device (the orchestrator
  re-installs on Patrik's phone after your round).
- The full unit suite (355 at R15) and the existing UI flows (VisualWindowUITests 7, flows 6) stay
  green; run them and paste the counts. Add your new UI tests to `CornerUITests/CompMatchUITests.swift`.
- Never stage screenshots into `corner/users/**`. Evidence goes under `rounds/evidence/` only.
- Report format: tables, then "what changed" with commit hashes, then "still off and why" (empty is the
  goal), then "what the orchestrator must do" (reinstall on the phone; anything needing Patrik).
