# Brief R40-native-window-and-scroll — the phone loads the newest 200 rows, lands at the bottom, and renders web-made quotes

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R32-native-wiring.md` (the round you extend; its §Still off is your list),
`rounds/LEDGER.md` rows "NATIVE READ WINDOW" and R32, `punch-list.md`. Tree: aom-studio `ios-native`
(HEAD `f2b63db0`). Backend deployed on `brilliant-scorpion-163`: `v2Native.threadEvents` now takes
`limit` (newest N from links + blocks) and reads `after` off the indexes (Wolfpack: full 4.5 s / 1438
rows → `limit: 40` 0.42 s → `after` 0.30 s); native text blocks carry `replyTo {messageId, sender,
snippet}` when the stored payload has one (`a4fc532`). Report: `rounds/R40-native-window-and-scroll.md`.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

- **First load asks for the newest 200** (`CornerV2API.swift v2ThreadEvents` passes `limit: 200` when
  there is no `after`); polls keep `after`. An "Earlier messages" row at the top when exactly 200 came
  back (same quiet single line the web draws: 12.5px, faint, centred; tap → `limit` +200, scroll held).
  Measure on the tester's Wolfpack-sized thread read-only: first paint before/after in ms, in the report.
- **Land at the bottom** on open and after send (R32 flagged: a fresh launch rests at the top of a long
  thread, so live delays look like missing messages); the R22-style "new messages" pill when the user has
  scrolled up and rows arrive; never yank the scroll while the user is reading.
- **Cross-device quotes**: decode `replyTo` from `threadEvents` text blocks (already pinned client-side
  per R32) and drop the local echo re-attach once the server field is present; prove web → phone with a
  quote made on the web (`/tmp/corner-v2-e2e.env` account, design thread) rendering on the phone.
- **Follow by identity, not by count.** The web's follow effect was keyed on row count and starved the
  moment the read became a sliding 200-row window (R41 root cause, L032): every arrival slid the window at a
  constant length and nothing scrolled. With `limit: 200` on the phone the same trap is waiting — key the
  follow/"new messages" logic on the newest row's id (and first id), never on `count`. Unit-pin it.
- **P082 — tab chrome at rest.** The sheet's tab strip shows a `×` on every tab at rest (`/tmp/sim402.png`,
  5:40 AM); the design draws icon + label only. Hide the close at rest; close by swipe-to-delete on the tab or
  a long-press menu (iOS idiom), never a visible `×` unless the tab is being edited. Add the anchor to
  `tools/native-design-vs-sim.mjs` so it would have failed before the fix.
- **iPad column** stays green (ComposerParity + R32Wiring on `iPad Pro 13-inch (M5)`).

Gates: 465+ unit, the six UI suites alone (CompMatch, DesignMatch, VisualWindow, CornerV2Flow,
ComposerParity, R32Wiring) — the runner dies with "signal kill" under load; `node
tools/native-design-vs-sim.mjs` exit 0 twice. Stage scoped paths + regenerated `project.pbxproj`; commit on
aom-studio; never push; never install to a device; simulators only. Report: rows before/after with PNGs,
the first-paint numbers, gates, commits, "for the orchestrator" (phone reinstall), "still off and why".
