# R26 — desktop live walk (L016, L017, L020, L021, L022)

Mission `corner:corner-v2`. Worktree `corner-v2-integration`, branch
`codex/corner-v2-integration` (never pushed). Preview:
https://corner-v2-integration-e8y3lftf3-aheads-projects-d2a4c70f.vercel.app
(`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud`,
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`).

Source of truth read before writing a line: the brief's evidence
(`WALK-web-03/05/06/08`, `DBG4-web-03`), `punch-list.md` rows L016/L017/
L020/L021/L022, the design export (`Corner v2.dc.html` + `HANDOFF.md`),
and `rounds/R27-desktop-composer-parity.md` (its tests + the design gate
kept green throughout — see Gates).

## The one structural decision (read first)

The brief says header status comes from run state (`v2Visual` runs), not
from event age. No query exposes the `runs` rows to the web client, and
desktop rounds never touch `convex/` — so the client mirrors those exact
semantics from the turn shape it can already see (`src/lib/runState.ts`,
new, pure + unit-tested):

- no blocks → Ready;
- newest block older than `RUN_STALE_MS` (10 min) → Ready (dead turns
  retire; Working can never stick);
- newest block is an agent TEXT → Ready (the answer landing is the
  observable `done`);
- otherwise (newest is a user send, agent step/question/file) → Working.

`needs-you` still wins over all of the above. The 2-minute
`lastActivityAt` recency heuristic in `headerStatus` is deleted. The
staleness bound only retires dead turns; the open/closed call itself comes
from the turn shape.

Two deliberate copy choices (no design string exists for either — verified
by grep over the export; both are one plain sentence in the design's
thinking-line style, 13px `--muted` with the design's `pulse` keyframes):

- optimistic line: "`<driver> is on it…`", driver = newest agent voice in
  the thread, falling back to the project name ("Paige is on it…" live).
- 45 s quiet notice: "`<driver> is taking a while — the reply will land
  here.`" (still, never silence; the header stays Working — the run is
  presumably still open).

## Before / after per row (all reproduced live, then fixed)

- **L021** — Before (`WALK-web-05-sent.png`): message sent 7:17 PM, header
  said Working, thread under the message silent until the reply ~11 s
  later. After (preview, Spring deck thread, demo bridge): the send flips
  the header to Working within ~2 s and "`Paige is on it…`" with the
  pulsing dot appears under the message (`R26-after-L021-sending.png`
  flow; line text logged: `Paige is on it…`); the first agent block
  (step or text) replaces it (`R26-after-L021-replied.png`); with no reply
  in 45 s the line becomes the quiet notice (verified offline with the new
  `audit_no_reply` stand-in flag — the live bridge answers everything
  under Aster in seconds, so the quiet path is not reachable live).
- **L016** — Before (`WALK-web-03/06`): Working on the idle probe thread
  and after the driver's reply. After: the quiescent deck thread reads
  Ready before a send (`R26-after-L016-quiescent.png`); after the bridge's
  turn completes the header is Ready (`R26-after-L016-done.png`;
  `R26-after-L021-working.png` shows Ready with the landed answer). A
  dead unanswered send retires to Ready at the 10-minute bound.
- **L017** — Before (`WALK-web-03-landing.png`): lone SITE card over a
  void on the artifact-only thread. After (fresh `R26 empty probe`
  mission + upload, zero messages): "`Nothing here yet. / Tell Aster what
  to make next — files on this thread live in the Visual Window.`", zero
  thread cards (`R26-after-L017.png`; the `Added aster-brief.pdf` notice
  proves the upload landed; the file opens from Context → Files).
  Boundary, disclosed: on threads WITH messages the unattached-artifact
  row stays — the design gate's `thread.pdf-badge` UI row and live-04's
  upload→`Open <title>` path both depend on a thread-column card, and no
  backend file-block exists to produce an inline one. File-kind messages
  always rendered inline next to their message (unchanged).
- **L020** — Before (`WALK-web-08-review.png`, `R18-work-review-live.png`):
  detached "Notes on …" panel AND the full composer beneath it. After:
  the checklist renders inside the composer's seat (joined card above the
  pill — the design's "pins become a checklist in the composer"); one
  bottom surface, verified live as `in-composer=1 detached=0
  composer-input=1` (`R26-after-L020-review.png`); toggling Review off (or
  sending the checklist) restores the plain composer. The pill stays
  mounted throughout: the design's own work-review anchors include the
  full composer (committed `R18-work-review-design.anchors.json`), so
  removing it would fail the gate by construction.
- **L022** — Before (`DBG4-web-03`): "Reading the project notes…" with a
  green check while the reply is 15–30 s out. After: the run's current
  step shows the design's in-progress state (2px `--success` ring, pulse,
  fg semibold — no check), the check only on completion
  (`R26-after-L022-step.png` live: pulsing ring, no check; the completed
  turn later checks). Single-label bridge steps read `now` iff they are
  the run's current step, else `done`; explicit `done`/`now`/`next`
  states (design seeds, fixtures) are preserved.

## Gates (all run in the worktree)

| command | output |
|---|---|
| `npm run lint` | 0 errors, 11 warnings (all pre-existing; zero on R26 lines) |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 23 files, 184 passed (was 21/171 in R27: +6 run-state incl. new file, rest other worker's additions — all green) |
| `PW_PORT=5174 npx playwright test --output e2e/results-orch` (desktop) | 109 passed, 0 failed on a fresh server (103 pre-existing + 6 new R26) |
| `LIVE_BASE_URL=<preview> npm run test:design` | exit 0 — `R18 visual gate: 0 screens failing, 0 UI rows failing.` |
| `LIVE_BASE_URL=<preview> npx playwright test --project live` | 9 passed, 2 skipped (R27 bar 9/2; brief bar 8/2) |

Live-07's review-send flow ("Send posts a message and turns review off
(composer returns)") passed on the preview, covering L020 end to end.

## Commits (scoped, none pushed)

- Worktree commit `e0ac19c` (11 files, nothing else staged):
  `src/lib/runState.ts` (new),
  `src/lib/workspace.ts` (`headerStatus` shape rule, surface skip),
  `src/v2/WorkspaceShell.tsx` (header subscribes the surface),
  `src/v2/ConversationSurface.tsx` (working line, empty state, live
  steps, checklist-in-composer), `src/components/Composer.tsx` (`review`
  slot), `src/v2/conversation.css` (line/empty/now/checklist-seat),
  `scripts/audit/fixtures.ts` (`audit_no_reply` flag only),
  `e2e/visual.spec.ts` (R26 describe ×6; P108 boots the long thread for
  a stable Working — same style assertions), `tests/v2/run-state.test.ts`
  (new), `e2e/__screenshots__/desktop/newroom-{plus,composer}.png`
  (re-baselined: empty state on new threads, Ready after reply).
- Left alone on purpose: `convex/*`, `.gitignore`, `e2e/chat.spec.ts`
  (another worker's uncommitted changes in the shared tree),
  `e2e/results-*/`, `/tmp` probes.

## Still off and why (non-empty, all disclosed)

1. The 10-minute staleness bound is a client-side approximation of "no
   open run" (backend runs are unreadable without `convex/` edits): a
   truly dead send can read Working for up to 10 minutes. `done` itself
   is instant (answer lands → Ready).
2. L017 clause 3 is fully applied to message-less threads only (see
   Boundary above); unattached artifacts on message-bearing threads keep
   their row until a backend file-block or a gate change says otherwise.
3. The quiet-notice and empty-state copy are app strings in the design's
   voice — the export has no 45 s notice and no empty-thread state (every
   design room ships with a thread).
4. The R25 probe thread from the walk is gone from the sidebar (R33
   traffic now dominates Recent); L017/quiet were verified live on a
   fresh `R26 empty probe` mission instead.
