# R41 — desktop follow the reply (L031–L033): after a send, the thread follows the step and the reply

Mission `corner:corner-v2`. Worktree `corner-v2-integration`, branch
`codex/corner-v2-integration`, commit `06df502` (scoped, 7 files,
+310/−16, not pushed). Preview:
https://corner-v2-integration-3fmjd20ez-aheads-projects-d2a4c70f.vercel.app
(bundle `index-D2kJVkrh.js`, served = built; bundle references
`brilliant-scorpion-163` 1×, `neat-pony-216` 0× — prebuilt deploy,
`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud` +
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`, never
`--prod`). `convex/` untouched. `neat-pony-216` untouched.

Reads first: `LOOP.md`, `rounds/R39-desktop-surface-window.md` (extended),
`rounds/R26-desktop-live-walk.md` (run-state header + optimistic line),
the brief's five walk shots (`/tmp/walk-wolfpack-{1,3,8,15,25}s.png`,
copied to `rounds/evidence/` as the before-half of each pair below).

## Root cause (one sentence each)

- **L032:** the follow effect depended on `[all.length]` — but since R39
  the read is a newest-N window, so on Wolfpack-scale threads every
  arrival slides the window at a *constant* 200 rows and the effect never
  fired: no pin, and not even the R22 pill (it is raised by the same
  effect). Small threads kept working, which is why every offline test
  stayed green while production sat still.
- **L031:** the header reads only the newest *server* row, so between the
  optimistic send and the server echo it still saw the old agent text and
  read Ready while the thread already showed "Mom is on it…".
- **L033:** the thread's bottom inset was a fixed `70vh` void — the pinned
  view could rest a screen past the last row — instead of the live
  composer height + 16.

## What shipped

- **Follow by identity, not count** (`src/v2/ConversationSurface.tsx`):
  the effect key is now
  `length|firstId|lastId`, which fires on appends, window slides, and the
  optimistic/echo swap alike. Easing unchanged (smooth `scrollIntoView`
  unless reduced motion — the design's easing).
- **A send pins** (`handleSend` forces `atBottomRef`, drops the pill):
  even from scrolled-up. The pin still releases on scroll-up past ~120px
  (`anchorGap`, unchanged); arrivals while reading without sending raise
  the R22 pill, whose click re-pins.
- **Header truth** (`src/lib/pendingSend.ts` new + `WorkspaceShell.tsx`):
  a per-thread send signal, raised on send and cleared on first agent
  block / failure / unmount / `/clear`. The header ORs it in —
  `ready + pending → working` — so Working spans the optimistic line
  onward; needs-you still wins; Ready still waits for the run to
  observably finish (agent text).
- **Measured inset** (ConversationSurface + `conversation.css`): a
  `ResizeObserver` on the real `.composer` sets `--v2-bottom-inset` =
  height + 16px, so open trays (reply, `/clear` confirm, dictation) and
  the docked review checklist count. It replaces the `70vh` padding (see
  "for the orchestrator" 2). The `v2-newmsg` pill rides the same
  variable, so it always floats just above the composer.
- **Offline proof** (`scripts/audit/fixtures.ts`): `audit_follow_turn=1`
  replays a full turn — echo now, label-only step +2 s, text reply +4 s.
  `tests/v2/pending-send.test.ts` (3 tests) locks the signal.
  `e2e/visual.spec.ts` "R41 follow the reply" (3 tests): the staged turn
  on the windowed big thread asserting the newest row fully inside the
  viewport and above the composer at send/step/reply with the row count
  locked at 200 throughout (the regression shape); header Working from
  the optimistic line, Ready after the reply; a scrolled-up variant
  (send re-pins, later arrival shows the pill, click re-pins, never a
  yank); the inset = composer + 16 at 1440×900, 1280×800, 1024×768 and
  with the `/clear` tray open.
- **R22 migration (contract decision, surfaced):** the old L010 test
  asserted a scrolled-up *send* shows the pill — that directly
  contradicts this brief's item 1 ("a send pins"). The test now locks
  send-re-pins; the pill-while-reading path it used to cover lives on in
  the R41 scrolled-up test. Details in "Still off" 1.

## Before / after (the five pairs; before = production walk, after = preview walk, one "R41 walk" send)

| T+ | before (production) | after (preview `…-3fmjd20ez-…`) |
|---|---|---|
| 1 s | `walk-wolfpack-1s.png`: "Mom is on it…", header **Ready** | `R41-walk-after-1s.png`: "Mom is on it…", header **Working**; newest bottom 727 ≤ composer top 804 |
| 3 s | `walk-wolfpack-3s.png`: line good, header still **Ready** | `R41-walk-after-3s.png`: header **Working**, pinned (727 ≤ 804) |
| 8 s | `walk-wolfpack-8s.png`: "Reading the project notes…" **clipped behind the composer** | `R41-walk-after-8s.png`: my message + the in-progress step (pulsing ring, no check — L022 holds) **fully above the composer**, header Working |
| 15 s | `walk-wolfpack-15s.png`: Working, reply below the fold | `R41-walk-after-15s.png`: header Working, pinned (727 ≤ 804) |
| 25 s | `walk-wolfpack-25s.png`: Ready, the reply landed **below the fold** | `R41-walk-after-25s.png`: header Ready, reply "Wolfpack site is live at wolfpackcompanies.com, from the thread." **fully above the composer** (781 ≤ 804) |

Walk telemetry (logged by the walk script, full lines in the run
output): rows 201 at T+1/3 (200-row window + optimistic temp) → 200 from
T+8 on (window slides, view follows); line text "Mom is on it…" → null
once the first agent block lands; header Working → Ready only when the
reply lands.

## Gates (all run in the worktree / against the preview, final tree)

| command | output |
|---|---|
| `npm run lint` | 0 errors, 11 warnings (all pre-existing — back at 11: my two new warnings were fixed, not waived) |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 27 files, 202 passed (198 at R39 → 199 via orchestrator's `6ed6de7` + 3 R41) |
| `PW_PORT=5174 npx playwright test --output e2e/results-orch` | **123 passed, 0 failed** (final run; see "Still off" 1 for the first run) |
| `LIVE_BASE_URL=<preview> npm run test:design` | 0 screens / 0 UI rows failing (L027–L029 rows green on the R41 tree) |
| `LIVE_BASE_URL=<preview> npx playwright test --project live` | 11 passed, 2 skipped (the two pre-existing conditional skips), 0 failed |

TDD note (LOOP hard line 5): the new staged-turn test fails on the old
surface and passes on the new one — verified by swapping
`HEAD:src/v2/ConversationSurface.tsx` back in: `step: newest row settles
above the composer — expected ≤ 805, received 901`, i.e. the exact 96px
of Patrik's clipped step card. File restored byte-identical after
(`diff -q` clean).

## Commits (scoped, none pushed)

- Worktree `06df502` (7 files, +310/−16):
  `src/v2/ConversationSurface.tsx` (identity follow, send-pins,
  signal wiring, inset measurement), `src/lib/pendingSend.ts` (new),
  `src/v2/WorkspaceShell.tsx` (header OR), `src/v2/conversation.css`
  (measured inset, pill rides it), `scripts/audit/fixtures.ts`
  (`audit_follow_turn`), `e2e/visual.spec.ts` (R41 ×3, R22 migration),
  `tests/v2/pending-send.test.ts` (new ×3).
- Left alone on purpose: `convex/*`, `.vercel/` (ignored), `dist/`
  (ignored), `e2e/results-*/` (generated), `/tmp` probes and the
  `/tmp/r41-walk.cjs` re-walk script. `httprobe.tmp.mjs` (untracked,
  pre-existing, not mine) untouched.
- Mission folder (this report + `rounds/evidence/R41-walk-*` and the
  `walk-wolfpack-*` before-copies): uncommitted, left for the
  orchestrator (R38/R39 precedent).

## For the orchestrator

1. **Contract decision — R22 test migrated, not just edited.** Old L010
   locked "scrolled-up send → pill, no follow"; this brief orders "a send
   pins". Both cannot hold, so the R22 test now locks send-re-pins and the
   R41 scrolled-up test owns the pill-while-reading path. If you would
   rather keep the old behavior for sends (pill instead of pin), say so —
   it is a one-line revert in `handleSend` plus restoring the R22 block —
   but then Patrik's "I sent a message and nothing moved" stands.
2. **HANDOFF §6 deviation, deliberate.** "Latest sits at the top of the
   pane (70vh bottom padding makes this possible)" — no code path ever
   scrolled newest-to-top (R22 pins the end anchor to the viewport
   bottom), so the 70vh only created a void the view could rest in past
   the last row. The inset is now composer + 16. One-line revert in
   `conversation.css` restores 70vh if the design side wants the void
   back, but then L033's formula has nowhere to live in this layout (the
   composer is in-flow, not an overlay — verified against the walk
   pixels, not assumed).
3. **Preview `…-3fmjd20ez-…` is up and green** (design 0/0, live 11/0);
   production redeploy remains Patrik's call as usual. Note: `vercel
   pull --yes` was needed before `vercel build` again (settings stale);
   auth (`vercel whoami` = mrg33k) worked.
4. **Native may carry the same bug class.** iOS now reads `threadEvents`
   windowed (`limit: 200`, R40-native) — if its thread view follows by
   row *count*, window slides will starve it exactly the way L032
   starved the web. Worth one line in the next native brief; not
   verified here (desktop round, no simulator run).
5. **C012 is visible in the walk reply** ("…wolfpackcompanies.com, from
   the thread."): the suffix-citation tic the voice round owns. Left
   alone — flagging so the citation lands in the right round, not as a
   drive-by here.

## Still off and why (non-empty, all disclosed)

1. The gate e2e ran twice on the final tree, not once: the first full
   run went 122 + 1 fail — the R22 scrolled-up-send block (see "for the
   orchestrator" 1). The fail was the stale contract, not the
   implementation: the send correctly re-pinned while the test still
   demanded the pill. Migrated the block, re-ran targeted (R22 + all 3
   R41 green), then ran the final full gate (123 green). No snapshot was
   regenerated. (Also note: the first gate's `| tail -6` masked
   Playwright's exit code — the pipeline exits 0 either way. The final
   gate ran unmasked with `GATE_EXIT=0`.)
2. "Ready only when the run finishes" is still the observable
   approximation (agent text = done, R26 semantics): a turn that posts
   mid-turn text and keeps working with steps would flicker Ready
   mid-turn. The client cannot read backend `runs` rows without
   `convex/` edits — same standing limitation as R26, unchanged.
3. The walk reply took ~25 s to land on Wolfpack (Mom, service-side
   latency per C006/R35) — unchanged by this round, which only moves
   the viewport, never the brain. First paint of the step was fast;
   nothing here changes turn latency.
4. The inset falls back to 112px for the first frame before the
   `ResizeObserver` measures (then composer + 16 exactly, e2e-locked).
   Unmeasurable in practice; stated for completeness.
5. One live send on the Wolfpack thread as the tester, labeled "R41
   walk" — the single allowed send. It started a real Mom turn (site /
   contract / waiting-on all answered); no other thread touched, nothing
   else written anywhere.
