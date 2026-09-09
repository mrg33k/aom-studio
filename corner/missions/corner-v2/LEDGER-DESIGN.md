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

## Live-room proof (2026-09-08 ~22:15, drove Patrik's Chrome on the dashboard)
Asked the live Ambition room "what's the latest we did on Ambition in the last few hours?" → Mom answered
correctly from the ledger: "Today an agent added Captions data… you added the Élephante Part 1 9:16 reframe
with captions and end card… started planning captions and an end card for Élephante pt 2." So the LEDGER
READ WORKS end-to-end (not an agent's claim — observed live). The thing that actually failed for Patrik in
that same room at 9:51 was a different query: "pull up the latest video we finished" → "I don't see a latest
video." That is the files index, not the ledger.

## CONFIRMED separate bug — media not in the files index (the "pull up the video" failure)
Queried `projectFiles:list {world:aom, subject:ambition-mechanical}`: 60 files, kinds = notes 2, audio 4,
document 48, url 1, sheet 5 — **ZERO video**. The deliverable videos exist on disk
(`corner/users/aom/projects/ambition-mechanical/deliverables/edit-sessions/elephante-captions/ELEPHANTE
SERVICE REPAIR - CAPTIONS.mp4` etc.), are NOT `seg_*` workfiles, and are NOT excluded by `is_skipped`
(`gateway_common.py:122` — no edit-sessions/media rule). Yet none reach the index. So the drop is in the
gateway's per-subject files-index `entries` builder (feeding `sync_subject`, `corner-gateway.py:655`) — a
kind filter there is excluding `video` (and likely `image`). FIX: include video/image deliverables in
`entries` (mirror the `.mp4/.mov` handling that `title_for_rel` already does for ledger deeds), then rebuild
the Ambition index and re-verify "pull up the latest video" opens the file. This is C018/G5 territory.

## Remaining rounds (tracked)
- R-ledger-1 folder→project tagging: DONE + verified (`AOM-EA a0d779a8f`).
- Video-in-index fix (above): the gateway `entries` builder includes video/image; rebuild + verify the
  pull-up. NEXT.
- R-ledger-2 org feed (Patrik's chosen model): DONE + verified live (`AOM-EA eaf6ed1bc`). The bridge reads
  a recent org-wide slice (empty `subjects` = all subjects, proven live against `brilliant-scorpion-163`)
  alongside the project slice, surfaced as an "ACROSS YOUR PROJECTS" pack section that names each row's
  project. Proof: the Ambition room, asked "across ALL my projects, what have we gotten done in the last day
  or two?", answered "On Ahead of Market you updated the AOM globe... On Corner you shipped the agent
  connections panel... On Native iOS you updated the V2 connections sheet." (2026-09-08 11:28, drove Patrik's
  Chrome). The org slice is context-only: it does not feed a room's own "latest" fact and does not inflate
  ledgerReads. Unit: `test_r48_context_pack_reads_org_ledger_first` now pins both reads.
- R-ledger-3 (Patrik-owned): consolidate to one Convex backend; delete neat-pony-216 / lovable-weasel-178 /
  happy-otter-123; pin the dashboard `VITE_CONVEX_URL`.
