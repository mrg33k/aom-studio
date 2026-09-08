# Brief R41-desktop-follow-the-reply — after a send, the thread follows the step and the reply; nothing ever hides under the composer

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R39-desktop-surface-window.md` (the round you extend), `rounds/R26-desktop-live-walk.md`
(run-state header + optimistic line), `punch-list.md` rows **L031-L033**. Tree:
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration` (HEAD `a4fc532`, clean; production = the R39
tree). Report: `rounds/R41-desktop-follow-the-reply.md`.

You are a headless worker, BUILDER for the desktop web app. Nobody will answer questions.

## What the orchestrator saw on production at 4:40 AM (Patrik's own complaint, reproduced)
Sign in as the AOM tester (`/tmp/corner-v2-aom-tester.env`), open the Wolfpack thread
(`/c/vd73p369yk2492xr3petckqaa98dx40n`), send "What's the latest on Wolfpack? …", screenshots at 1/3/8/15/25 s
(`/tmp/walk-wolfpack-{1,3,8,15,25}s.png`):
- 1-3 s: "● Mom is on it…" under the sent message. Good. Header still says **Ready** (L031: the header must
  read Working the moment the optimistic line shows, not only when the run row lands).
- 8 s: the step card "Reading the project notes…" arrives **clipped behind the composer** — the thread did
  not follow it (L032). 15 s and 25 s: header Working → Ready, the reply landed **below the fold**; the user
  who just sent a message sees nothing move. This is "no sign I was getting a response".
- The scroll container's bottom inset is smaller than the composer: the last row can always sit under the
  pill (L033).

## Build
1. **Pinned-to-bottom after send.** A send pins the thread to the bottom; while pinned, every arriving row
   (working line, step, reply, artifact card) keeps the view at the bottom with the design's easing. The pin
   releases only when the user scrolls up more than ~120px; then the R22 "new messages" pill appears and a
   click re-pins. Never yank the view while the user is reading history.
2. **Bottom inset = composer height + 16px** (measure the pill, including its trays when open) so the last
   row is fully visible above the composer at every viewport (1440×900, 1280×800, 1024×768).
3. **Header truth (L031):** Working from the optimistic line on; Ready only when the run finishes.
4. **Prove it with an e2e that replays a turn**: offline stand-in (`PW_PORT=5174`) — send → step block
   arrives 2 s later → reply 4 s later; at each stage assert the newest row's box is fully inside the scroll
   viewport and above the composer's top edge; plus a scrolled-up variant asserting the pill instead. Then a
   live re-walk on your preview with the same five screenshots, filed as evidence.

Gates: lint 0 errors, tsc clean, vitest (198+), offline e2e (`PW_PORT=5174`, `--output e2e/results-orch`,
ONCE at the end — native UI suites share the machine), `npm run test:design` 0/0 on your preview
(`LIVE_BASE_URL`, prebuilt deploy with `VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud` and
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`), live suite 11 pass / 0 fail. One live
send on the Wolfpack thread as the tester is allowed for the re-walk (label it "R41 walk"). Commit on
`corner-v2-integration` with scoped paths; never `--prod`; never touch `neat-pony-216`; no `convex/` edits.
Report: the five before/after PNG pairs, gates, commits, "for the orchestrator", "still off and why".
