# Brief R22-desktop-live-defects — four things the live lanes found in the desktop web, fixed and locked

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R18-desktop-design-match.md` (the design gate you must keep green:
`LIVE_BASE_URL=<preview> npm run test:design`), and `punch-list.md` rows **L010, L011, L012, L013**
(yours). Write your report to `rounds/R22-desktop-live-defects.md`: every command with its output.

You are a headless worker, BUILDER for the desktop web. Nobody will answer questions.

## The four rows

- **L010** long threads arrive scrolled ~700px past the last message (blank arrival view). Found by
  the chat lane; evidence `rounds/evidence/R20-chat-scrolled.png`. Arrive with the newest message
  in view, and stay pinned to the bottom while new agent blocks stream in unless the person has
  scrolled up (then show a "new messages" affordance, design-styled, not a browser default).
- **L011** `step` events that carry only a label paint as blank rows (avatar + name + time, no
  text). Found by the live-brains lane. The steps card must render the label; the containment
  fallback ("I couldn't finish that turn") must be visible.
- **L012** message file cards render the title in a monospace face; the design's card
  (`The 2026 Playbook · v2 / PDF · 10 pages`) is the regular sans. Match the design card exactly
  (icon tile, title 14/600, meta line in `--muted`, kebab on the right).
- **L013** a local `video` artifact paints a ~60px player strip in the Visual Window; the design's
  stage is the full media area (HANDOFF §6: stage = media height, 16:9 to the pane width for
  video). Same for `photo` if it is also collapsing.

## Method

Reproduce each on the live preview first (newest URL in `rounds/LEDGER.md`; test account
`/tmp/corner-v2-e2e.env`, never in a report), screenshot before, fix in `src/v2/*`, add one offline
test per row in `e2e/visual.spec.ts` (the stand-in already has long threads, step-only events can be
added to `scripts/audit/fixtures.ts`, the video fixture is `public/fixtures/walkthrough.mp4`),
redeploy (`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud npx vercel build --yes && npx vercel deploy --prebuilt --yes`
from the worktree; curl the bundle for `brilliant-scorpion-163` before trusting it), screenshot
after, and keep ALL gates green: `npm run lint` 0 errors, `npx vitest run`, `PW_PORT=5174 npx playwright test --output e2e/results-orch`
(desktop, 83+), `LIVE_BASE_URL=<your preview> npm run test:design` (13 screens, 0 UI rows), and the
live suite `LIVE_BASE_URL=<your preview> npx playwright test --project live --output e2e/results-orch`
(no worse than 8/11; 05 waits on a backend redeploy). Update the four rows to `fixed (R22) <evidence>`.

## Hard lines

Stage scoped paths only; commit on `codex/corner-v2-integration` (HEAD `9c46546` or later); never
push; never edit the design export; never touch `convex/` (redeploy key pending) or `ios-native/`;
port 5174 for the stand-in (5173 may be taken), never 5177/3099. Report: the four rows before/after
with evidence paths, gates table, commits, final preview URL, "still off and why" (empty is the goal).
