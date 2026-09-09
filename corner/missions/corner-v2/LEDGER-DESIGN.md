# Ledger zoom-out + redesign (2026-09-08, Patrik + Claude)

Patrik: "point Corner at folders → it forces any agent that works in those folders to write to the
ledger → all work tracked. I don't know how it gets filed per project yet — that's what I want help with."
And: agents claimed this was already built; be diligent, prove it, stop the runaround.

## What is actually true today (proven, not claimed)

Two subagents traced the write and read paths; I then reproduced a room's exact query against the live
cloud ledger. Findings, evidence-backed:

- **The pipes work.** Terminal work is written to the cloud ledger within ~1 min of a session ending, by a
  Stop hook (`scripts/hooks/ledger-append.py`, wired at `.claude/settings.json` Stop) and the gateway daemon
  (`scripts/gateway/corner-gateway.py`), both POSTing `ledger:append` to Convex `brilliant-scorpion-163`. No
  local-JSON-with-a-dead-sync; it's transcript → Convex directly. The append never filters (noise predicates
  run only on read).
- **The read works.** The bridge (`scripts/v2-team-bridge.py`, launchd `com.aom-ea.corner-v2-bridge`, live on
  the Mac) reads `ledger:latest` from the SAME `brilliant-scorpion-163` every turn. Query proof (2026-09-08
  ~22:10): a `subjects:["corner"]` read returns R60 fixes, build-22 install, R59/R11/R14, "started ledger
  redesign"; a `subjects:["wolfpack"]` read returns the GMB-photo work. The recent work is up there and
  readable.

So the failure is NOT "nothing is written" or "nothing syncs." It's two real gaps:

### Gap 1 — filing is a guess, and rooms are walled per project
Each room only sees ledger rows tagged with its own subject (`ledger_read_subjects`, `v2-team-bridge.py`).
That per-project wall is fine, EXCEPT the *tagging* is done by an AI summarizing the transcript and guessing
the project subject (`ledger-append.py` haiku summary + `INFRA_RE`). Guess wrong → filed to the wrong room →
invisible there. That is the unreliability. And a client room can never see cross-project/org work, which
clashes with Patrik's "one ledger, everything visible" mental model.

### Gap 2 — deployment sprawl
Four Convex backends exist: `brilliant-scorpion-163` (writers + bridge + current dashboard),
`neat-pony-216` (corner-convex dev; its ledger's newest Corner row is Sep 3), `lovable-weasel-178`,
`happy-otter-123`. Which one the dashboard talks to depends on which env a deploy wired in. Right now the
live dashboard bundle references `brilliant-scorpion-163` (correct), but a wrong deploy silently points the
rooms at a backend with none of this work — random breakage. (`lovable-weasel-178` is already on Patrik's
delete list.)

## The design (Patrik's drawing, made deterministic)

Chosen room-visibility model (Patrik, 2026-09-08): **Project + org feed** — each room shows its own
project's work PLUS an always-available org-wide "all activity" view.

1. **Folder = project (deterministic tagging).** Corner points at folders; a `folders → project` registry
   maps a working directory to its project slug. The forced Stop hook derives the subject from the session's
   cwd/repo via that registry, NOT an AI guess. The AI summary still writes the *sentence*; the *subject* is
   deterministic. Fallback to the current heuristic only when the cwd matches no registered folder.
2. **Project + org read.** The bridge reads two slices: the room's project subjects (as today) AND a recent
   org-wide slice (all subjects, world-scoped), surfaced as the "across your projects" feed. A room can then
   answer both "what's new here" and "what have we done lately" (any room).
3. **One backend.** All writers, the bridge, and the dashboard target one canonical Convex deployment
   (`brilliant-scorpion-163`); the other three are retired (Patrik-owned: delete `neat-pony-216`,
   `lovable-weasel-178`, `happy-otter-123` once nothing references them). Until then, pin every deploy's
   `VITE_CONVEX_URL` to the canonical one and assert it in CI/the deploy step.

## Build order
- R-ledger-1: folder→project registry + deterministic subject in `ledger-append.py` (+ unit test on the
  cwd→project mapping). Highest reliability win; low risk (append still works).
- R-ledger-2: bridge project + org feed read (additive).
- R-ledger-3 (Patrik): consolidate/delete the extra Convex deployments; pin the dashboard env.

## Still to verify with Patrik
Which exact room(s) he asked when it "didn't understand" — a client room asked about Corner-app work is
working-as-scoped, not a bug. The org feed (this design) removes that confusion.
