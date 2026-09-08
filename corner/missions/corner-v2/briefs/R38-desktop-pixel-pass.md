# Brief R38-desktop-pixel-pass — three things the orchestrator's eyes caught on production that the gate did not

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R30-desktop-composer-wiring.md` (the round you extend), `punch-list.md`.
Tree: `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration` (HEAD `a633ff7`, clean). Design export:
`docs/design-reference/corner-v2` (work / work-visual-pdf screens). Production evidence: `/tmp/r18-vs-prod/`
(`R18-work-live.png`, `R18-work-visual-pdf-live.png` against their `-design.png`). Report:
`rounds/R38-desktop-pixel-pass.md`. Add rows **L027-L029** to `punch-list.md` (last row is L026).

You are a headless worker, BUILDER for the desktop web app. Nobody will answer questions.

- **L027 — the message header shows the raw account id and the time wraps.** Live: sender line
  `corner-v2-e2e+20260906t201253` (the email local part, from `authorLabel: sess?.name ?? "You"` in
  `ConversationSurface.tsx`) and `11:26 PM` breaking onto two lines at the narrow chat width
  (`R18-work-visual-pdf-live.png`). Design: `Patrik  6:41`. Rule: profile name when the account has one;
  otherwise the viewer's own messages say **You** and nobody's label is ever an email or contains `+`/`@`
  (derive a first name from the sign-up name field, never from the address). Time is `h:mm` (no AM/PM,
  as drawn), `white-space: nowrap`, right of the name, never a second line. Same rule where the native
  app reads `authorLabel` from the backend — if the label is computed server-side, fix it there once
  (`convex/v2Workspace.ts` surface) so both surfaces agree; note it "for the orchestrator" if you do.
- **L028 — tab chrome the design does not have.** Live tabs carry a `×` on the top-right corner and
  `‹ ›` reorder arrows that hang below the tab's bottom edge onto the strip border (zoom:
  `/tmp/prod-tabstrip-zoom.png`). Design: icon + label only, tabs scroll when they overflow. Keep close
  and reorder as real functions, but per the design: close on hover inside the tab's right padding
  (the label shortens, the tab never grows), reorder by drag (or arrows inside the tab, hover only,
  never past its box). At rest a tab looks exactly like the design's.
- **L029 — Search shows no shortcut.** Design: `Search  ⌘K` (hint right-aligned, muted). Live: `Search`.
  Add the hint and make ⌘K focus the field (and `/` when nothing is focused, if the design notes say so).
- Re-shoot `work`, `work-visual-pdf`, `work-visual-photo` at 1440 with the R18 gate and eyeball each
  against its design PNG; extend the gate's anchors so L027/L028/L029 would have failed before your fix.

Gates: lint 0 errors, vitest (187+), offline e2e (`PW_PORT=5174`, `--output e2e/results-orch`, run it
ONCE at the end — a native UI run is sharing the machine, keep the load down), `npm run test:design`
0/0, and the live suite against your preview (`LIVE_BASE_URL`, prebuilt deploy with
`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud`). Commit on `corner-v2-integration` with
scoped paths; never `--prod`; never touch `neat-pony-216`. Report: before/after PNGs per row, gate
numbers, commits, "for the orchestrator", "still off and why".
