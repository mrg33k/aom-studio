# Brief R19-native-design-vs-simulator — design phone screenshots vs the SIMULATOR, side by side, fix until they match; and put the composer's commands chip back

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `punch-list.md` (P022-P024 and every P025+ row R17 added), and
`rounds/R17-native-compmatch.md` (the measurement round that ran before you: what it fixed, what
it left, which simulator it created). Write your report to
`rounds/R19-native-design-vs-simulator.md`: every command with its output, one difference table
per screen.

You are a headless worker, REVIEWER-THEN-BUILDER for the native iOS app (SwiftUI, no web views for
product UI). Nobody will answer questions.

## Patrik's words (the target)

12:22 PM: "The iPhone needs to be native iOS code and tested against the simulator. You have to
take the screenshots from the design and the screenshots from what's live on … iOS NATIVE from
THE SIMULATOR and compare the two. For the iOS Native we lost our command button in the composer
even in our claude design files."

## Design truth

`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/design-reference/corner-v2/`
`Corner v2.dc.html` → the "Mobile flow" section: a `[data-phone]` frame 390×844 (scale it to 1.0
by giving the viewport ≥ 1100px height or divide by `phoneScale`), storyboard rail: Log in → Setup
(6 steps) → Empty → Thread → Review sheet → Menu drawer → Settings. `HANDOFF.md` §4 (mobile) and
§6 (pins). R17 already saved `rounds/evidence/R17-native-<screen>-design.png` for these; reuse
them if they are at scale 1.0 and complete, else re-shoot (Playwright on port 5177, never 5173).

## Built truth = the simulator against the real backend

Native repo `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native` (XcodeGen; one
xcodebuild at a time; never push; stage only what you touched + regenerated `project.pbxproj`).
`Config.swift` defaults to the production clone `https://brilliant-scorpion-163.convex.cloud`
(auth keys present). Account: `/tmp/corner-v2-e2e.env` (`CORNER_V2_E2E_EMAIL` /
`CORNER_V2_E2E_PASSWORD`; never in a report, commit or caption); sign in through `SignInView`.
That workspace is being shaped by the desktop worker to mirror the design (project Aster with
three missions, Northwind, Cellar Door, a Spring launch deck thread with a PDF tab) — use what is
there; add what is missing through the app's own UI.

Simulators: the 390-wide device R17 used (design size), `iPhone 17 Pro` (402×874), and
`iPhone 17 Pro Max` (440×956, Patrik's phone). Screenshot every design screen on all three:
`rounds/evidence/R19-native-<screen>-sim-390.png` (+ `-402`, `-440`). Same account, same data,
status bar as-is.

## The comparison (this is the test)

For every screen: `rounds/evidence/R19-native-<screen>-side-by-side.png` (design left, simulator
390 right, same scale) and `-diff.png` (pixelmatch on the 390 pair, threshold 0.1), plus a table
`element | design | simulator | Δ | verdict | data-or-UI`. Then a script
`corner/missions/corner-v2/tools/native-design-vs-sim.mjs` (or `.py`) that, given the booted
simulator and the design export, shoots the screens (drive the app with the XCUITest tour or
`xcrun simctl io … screenshot` after `xcrun simctl launch` with the screen-tour arguments), builds
the pairs and exits non-zero on any UI row off by more than 1pt / wrong token colour / wrong font
/ missing or extra element. That script is the native visual e2e Patrik asked for; the orchestrator
must be able to re-run it in one command.

## Fix everything the table says (this is the build)

Every UI row → `P0NN` row in `punch-list.md` (continue R17's numbering) → fix in Swift → build →
re-shoot → `fixed (R19) <evidence>`. Loop until only data rows remain. Unit suite (355+) and the
existing UI flows (VisualWindowUITests, flows, R17's CompMatch tests) stay green; add a UI test per
fix in `CornerUITests/DesignMatchUITests.swift`.

## The composer's commands chip (Patrik's second point)

The v2 pill composer (R15: pill + Record + round send) lost the commands chip the native app had.
Put it back INSIDE the design's pill, left of Record: the sparkles chip with the live label, and the
menu exactly as `Corner/Views/ChatView.swift` `commandsMenu` already implements for the legacy
room path — Work / Plan picker (Plan = "Corner will propose a plan first", persisted per thread,
sent as `mode` with the message when the backend accepts it), Model submenu, Specialist submenu
when the conversation has one, "Files in this conversation" (the project's Files), "Generate an
image". Reuse that code; do not write a second menu. The chip's look follows the design's Record
chip (same height, radius, 12px label) so the pill still reads as the design with one more chip.
Backend field: the desktop worker (R18) may add an optional `mode` to `v2Workspace.sendMessage`;
the clone cannot be redeployed by either of you today (deploy key pending with Patrik), so the app
must send without it when the field is unknown (strict envelope decoding: read R9's transport rules).

## Hard lines

- Do not install to any physical device (the orchestrator does). Do not touch the web worktree's
  `src/` or `convex/`. Never 5173.
- No AI judge; the script and the side-by-sides are the gate, Patrik is the final gate.
- Report: table of screens (design / sim / side-by-side / diff paths, UI rows open → fixed, data
  rows), "what changed" with commit hashes, "still off and why" (empty is the goal), "for the
  orchestrator" (reinstall on the phone), "for Patrik".
