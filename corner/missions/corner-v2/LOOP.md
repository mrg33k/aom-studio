# Corner v2 Build Loop

Started 2026-09-05 (Saturday), 10:30 PM Phoenix. Patrik's brief, verbatim intent:
"Use a workflow of muse spark 1.3 agents, use as many as you want and have them go hard with your
direction. Keep them detailed and loop until we fully complete this plan, it's deployed and confirmed
working with an e2e test including all features."

## The plan being executed

Spec and plans live in the corner-convex repo (committed on `main` at `11df05a`, carried on the
integration branch):

- `docs/superpowers/specs/2026-09-05-corner-v2-reorganization-design.md` (the product decisions)
- `docs/superpowers/plans/2026-09-05-corner-v2-backend-foundation.md` (7 tasks)
- `docs/superpowers/plans/2026-09-05-corner-v2-desktop-web.md` (6 tasks)
- `docs/superpowers/plans/2026-09-05-corner-v2-native-ios.md` (separate repo, no push access; hand-off)
- `docs/superpowers/specs/2026-09-05-corner-v2-design-gaps.md` (what Patrik is getting designed)
- `docs/design-reference/corner-v2/` (the authoritative Claude Design export)

Scope of this loop: backend foundation + desktop web, through Vercel deploy, with a Playwright e2e that
exercises every feature. Native iOS is briefed last as a file hand-off.

## Where the work happens

| What | Path |
|---|---|
| Integration worktree (ALL code work) | `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration` branch `codex/corner-v2-integration` |
| Main checkout (read-only for this loop; its `.env.local` points at LIVE) | `/Users/aom-inhouse/aom-studio-transfer/corner-convex` |
| Live Convex deployment (Karen's data; READ-ONLY, export only) | `neat-pony-216` (team `patrik-matheson`, project `corner`) |
| Rehearsal deployment (all migration writes go here first) | created in R1 as `dev/corner-v2-rehearsal-20260905` |
| Immutable backup | `/Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip` + `.sha256` |
| This mission | `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/` |

## Hard lines (every brief repeats these)

1. Nothing writes to `neat-pony-216`. Allowed against it: `npx convex export`, `npx convex function-spec`,
   `npx convex data` (reads). Forbidden: `import`, `deploy`, `dev`, `run`, `env set`, `--select`, and any
   mutation. The main checkout's `.env.local` is never edited.
2. The backup ZIP and its SHA never enter git. The `ledgerTokens` table holds a live secret; never print a
   token value into a report, brief, commit, or log.
3. Never `git add -A` / `git add .`. Stage the paths the brief names. Never push. Never force anything.
4. Two workers never edit the same file in the same round. Schema additions go in per-module files
   under `convex/v2Schema/` that `convex/schema.ts` spreads (set up in R2); after that only R2's worker
   touches `schema.ts`.
5. Tests come first and must fail before the implementation, then pass (the plans are TDD).
6. "Done" in a report means the worker ran the command and pasted the output. Claims without output are
   re-run by the orchestrator before anything is accepted.

## Roles

- **Orchestrator (Claude, this session):** writes briefs, launches workers, watches them, verifies every
  claim by re-running, commits/pushes, keeps this ledger, decides what reaches Patrik.
- **Workers (Muse Spark 1.3 via `run-worker.sh <brief>`):** one task each, from an extremely detailed
  brief. Muse needs every path, command, guardrail and acceptance check spelled out.

## WD-40 directive (Patrik, 2026-09-05, 10:55 PM Phoenix)

"/wd40 until its complete and e2e verified working like the design files." Test, fix, repeat; no
check-ins between rounds. Two acceptance gates define "like the design files":

1. **Comp-match review (every desktop round from R3 on, reviewer worker with `--safe`):** render
   `docs/design-reference/corner-v2/Corner v2.dc.html` in Playwright at 1440x900 in each storyboard
   state (Work, New, Setup, Login) and the built app in the same states; measure pane widths, header
   heights, row heights, type sizes, colours; write every difference as a punch item with numbers and
   `file:line`. Anti-aliasing is not a diff; a 2px header is.
2. **Live e2e (R6):** the full Playwright suite runs against the deployed preview on the production
   clone with a real test account, touching every feature in the plans' acceptance checklists, plus the
   offline stand-in suite. Both green, screenshots reviewed by the orchestrator, before the production
   cutover is proposed to Patrik.

## Round map

| Round | Backend plan | Desktop plan | Parallel? |
|---|---|---|---|
| R1 | Task 1 reconcile + backup + rehearsal | — | single worker (foundation) |
| R2 | Task 2 spine (owns schema.ts + v2Schema/ layout) | Task 1 tokens/contracts + Task 2 shell | yes: convex/ vs src/ |
| R3 | Task 3+4 mapping+history (one worker), Task 5 routing, Task 6 visual | Task 3 conversation surface | yes: separate v2Schema files |
| R4 | Task 7 cutover + production clone | Task 4 Visual Window + Task 5 settings | yes |
| R5 | verify on production clone | Task 6 legacy quarantine + full e2e | then deploy preview |
| R6 | — | Vercel preview → e2e against preview → production cutover | Patrik sees it |

## Round protocol

1. Orchestrator writes `briefs/R<n>-<name>.md`, launches `run-worker.sh R<n>-<name>`, watches with
   `watch-muse.py` on the newest `~/.local/share/muse/sessions/2026/MM/DD/<id>/session.jsonl`.
2. Worker writes `rounds/R<n>-<name>.md` with every command + output.
3. Orchestrator re-runs the acceptance commands in the worktree, reads the diff, commits with pathspecs.
4. Ledger line in `rounds/LEDGER.md`: round, what shipped, evidence, what is next.
5. Next round.

## What reaches Patrik

Design-direction calls, anything that deletes data, money (a paid Convex plan, a Vercel plan), the
production cutover itself, and hard blockers (credentials, push access). Everything else is a ledger line.
