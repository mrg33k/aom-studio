# R48 — chat ledger-first: the dashboard brains read the organization ledger first, and stop writing noise into it

Worker: headless builder, chat lane round fifteen + the small backend edits.
Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R47-chat-kie-images.md`,
`corner/missions/ledger/VISION.md` + `BUILD.md` (hard rules observed:
append-only intact — nothing deleted, corrected, or merged; one sentence per
item; Convex only),
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/convex/ledger.ts`
+ `convex/v2Visual.ts`.
Code: AOM-EA `scripts/v2-team-bridge.py` (contract `r47-1` → **`r48-1`**) +
`scripts/test_v2_team_bridge.py` (**177/177**, plain `python3`, never `-s`).
Backend: `convex/ledger.ts`, `convex/v2Visual.ts`,
`tests/v2/ledger-noise.test.ts` (4 new). Report: this file. Never
`neat-pony-216` (reads only, via the bridge's own authed client — the same
reads production makes every turn; no `convex run/import/deploy` touched it).

Verdict: built, committed on both repos, all gates green, live pack-read
proven on production traffic — but the e2e live answer is BLOCKED by an
environmental model-backend stall (details §6, incidents §8). The exact
production prompt, run through the real model offline, answers ledger-first
and names the newest real ledger item (§5). The orchestrator should deploy
the backend (§7), then re-run the one-question walk when the machine is
quiet; no code change is needed for that.

Rule compliance: two client-visible sends this round, both the labelled R48
walk ask on the e2e design thread `vd7f0v4dn3kjjx9qnt9acryemn8dyr95` (second
send disclosed as an incident in §8); zero sends on Patrik's
Wolfpack/Ambition threads. Scoped commits only, nothing pushed. No token or
key printed, committed, or logged (health reports booleans/counters only).

## 1. Before / after

Before (`r47-1`): the pack read `v2Ledger:latest` (the run log) and rendered
it as a trailing `(e) LEDGER` section — noise rows and all:

```
PROJECT Aster (aster)
MISSION Spring launch deck -- no brief recorded
DRIVER @paige
(a) PROJECT NOTES (Mac files):
...
(e) LEDGER (project-scoped, newest first):
- [did] Made Generated image with KIE. (2026-09-07T17:21:08.000Z)
- [did] Finished a corner-v2-chat run. (2026-09-07T17:21:09.000Z)
(f) VISUAL WINDOW:
...
```

After (`r48-1`): the pack reads `ledger:latest {world, subjects:
[<project>, <mission>], since: <14d ago>, limit: 15}` and leads with it:

```
PROJECT Aster (aster)
MISSION Spring launch deck -- no brief recorded
DRIVER @paige
WHAT HAPPENED LAST (ledger, newest first, with who and when):
- [did] Today, agent:paige: Made Generated image with KIE. (2026-09-07T17:21:08.000Z)
(a) PROJECT NOTES (Mac files):
...
```

`v2Ledger:latest` left the pack. The run log is never presented as the
ledger anywhere (pack, slot text, synthesis fact, readback).

## 2. What the orchestrator measured, re-measured

`ledger:latest {world: aom, since: Sep 3, limit: 200}` just now: **200
rows: 175 match the shared noise predicate** (85 × "Started a
corner-v2-chat run.", 85 × "Finished a corner-v2-chat run.", 5 ×
Opened/Closed visual rows), **15 more are older providers' run rows**
("Started/Finished a r20-bridge run." × 13 with subject `wolfpack`,
"r35-probe" × 2), **10 are real** (6 terminal-hook rows from today incl.
"Switched to KIE.ai for image generation.", 4 Made/Added image rows).
So the dashboard side wrote ~190 noise rows, not 196 — the difference is 6
genuine terminal-hook items from this afternoon that postdate the
orchestrator's count.

Two discoveries that shaped the build:

1. **The design thread lives in another world.** Thread
   `vd7f0v4d…` (Aster / Spring launch deck) is in the e2e account's
   personal world `user-jx74…`, not `aom` — zero aster rows exist in `aom`.
   Its world holds ~200 rows with subjects `[aster, spring-launch-deck]`.
   The bridge therefore resolves the world per scope via
   `worlds:forViewer` (cached, `aom` fallback) instead of hardcoding it —
   the demo scope correctly reads `user-jx74…` while production scopes read
   `aom`.
2. **The brief's two patterns miss the 15 old-provider run rows**, 13 of
   which carry subject `wolfpack` and would leak into Wolfpack packs as
   "news". Kept the shared predicate brief-exact (widening it server-side
   could false-positive real future "Started a …" items — the ledger
   VISION's own example starts that way), and the bridge read path filters
   `is_ledger_noise OR is_run_noise` (the standing R31 rule already covers
   any-provider run bookkeeping). Server filter stays narrow and safe;
   chat-lane reads are fully clean either way.

## 3. What changed (contract diff `r47-1` → `r48-1`)

Backend (`corner-v2-integration` commit `0d24945`, branch
`codex/corner-v2-integration`, NOT deployed — no key):
- `convex/ledger.ts`: exported `isLedgerNoise(what)` — exactly the two
  brief patterns; `ledger:latest` filters it server-side (rows stay in the
  table) and accepts a singular `subject` alias merged with `subjects`.
- `convex/v2Visual.ts`: deleted 7 noise writes — openTab ×2, closeTab,
  addPin, removePin, startRun, finishRun. Kept: create/upgrade artifact
  Added/Updated, sendChecklist "Sent …" (a real `sent` event), and the
  driver's deliberate `ledger` event type.
- `tests/v2/ledger-noise.test.ts` (new, 4 tests): predicate pins, the
  200-row noise shape filters to 4 signal rows newest-first, the singular
  alias, and end-to-end (open/close/pin/run write zero rows; artifact +
  deliberate ledger event write).

Bridge (AOM-EA commit `2b2b5aa1c`, contract `r48-1`):
- Reads: `context_pack` + `ledger_latest` call `ledger:latest {world,
  subjects: [project + mission], since: 14d, limit: 15}`; `v2Ledger:latest`
  gone from the pack; `worlds:forViewer` world resolution (cached, `aom`
  fallback, auth loss propagates, failures never cached).
- Pack: WHAT HAPPENED LAST leads with `[kind] Day, who: what (at)`; empty
  14-day window renders "Nothing has been logged for X since <date>."
- Contract: `latest` slot + synthesis fact answer from ledger first in
  time order naming the day, empty-line wording pinned, "The run log is
  not the ledger" stated; `latest_body` (script path) same order + the
  plain empty sentence (the banned literal "nothing in the ledger" still
  never appears anywhere).
- Writes: `_ledger_append` refuses noise (second lock behind the backend
  fix); only made/decided/asked/sent rows leave a turn.
- Health: `ledgerReads` + `ledgerLastItemAt` on both `/health` paths
  (service aggregates all scopes).

## 4. Gates

- `python3 scripts/test_v2_team_bridge.py` = **177/177** (164 existing +
  13 new R48; deliberate contract-bump reworks, R47 precedent: 6 version
  asserts `r47-1`→`r48-1`, 6 test fakes `v2Ledger:latest`→`ledger:latest`,
  the pack-order test to the new ledger-first order; `ledger_subjects()`
  semantics untouched).
- `npx vitest run tests/v2` = **22 files / 140 tests green** (136 existing
  + 4 new); `npx tsc --noEmit` clean.
- Production restart: ONE `launchctl kickstart -k` of
  `com.aom-ea.corner-v2-bridge` on the commit → `ok`/`r48-1`/`failedTicks
  0`/169 threads. Demo reloaded after (plist untouched, kickstart only) →
  `ok`/`r48-1`, pinned thread, paige.
- Live pack-read proof (production traffic, not a probe): demo log
  `[r48] ledger: filtered 9 noise row(s), 6 signal rows in pack`, health
  `ledgerReads 2`, `ledgerLastItemAt 2026-09-07T17:21:08.746Z` (= the R47
  "Made Generated image" row — newest real item).
- e2e live answer: BLOCKED, see §6. Prompt-level proof obtained instead
  (§5).

## 5. Prompt-level proof (exact production prompt, real model)

Rebuilt the walk pack offline via the committed `context_pack` against
production, wrapped it in `build_live_prompt("paige","driver","latest",…)`
(byte-identical to what the turn sent), ran it through the real `claude`
backend: answered in ~7–9 s (full text in `/tmp/r48-answer.json`):

> "Latest on Aster: today I made a typeset image study for the spring deck
> cover, then a second study for the Spring deck hero, and after that the
> hero rendered properly as a founder on stage at sunrise, wide, now open
> in the Visual Window. The thread has scope settled: buyer-facing first
> pass across all eight slides, campaign film held for press. …"

Ledger items first, in time order, day named; newest real item (the R47
KIE hero render) named; thread and notes after. The R48 contract holds end
to end except the last-mile delivery (§6).

## 6. Still off and why

**The live design-thread answer did not land.** Both walk turns built the
correct pack (log lines above) but the `claude` model backend timed out
twice per turn (done_s 245 s / 243 s ≈ 2 × 120 s adapter timeouts) and
each turn fell back to the silent containment step ("I couldn't finish
that turn."). Root-cause evidence, all Bisected with the committed code:

- The R48 prompt is innocent: the byte-identical prompt answers in ~7–9 s
  (§5); the PRE-R48 prompt (from git HEAD) hangs identically — old and new
  contract fail the same way.
- The hang is in project-customization startup, not content: from
  AOM-EA, `--safe-mode` (6.8 s) and `--setting-sources user` (23.8 s)
  answer; full customizations hang. `--strict-mcp-config` still hangs, so
  it is not MCP; all six startup/submit hooks exit in ≤0.3 s with empty
  input. Prime suspect is plugin sync or a hook with real payload under
  machine duress — environmental, outside this lane (not touched: no
  settings/hook/plugin file was modified this round).
- Machine duress is real: load averaged 14–31 through the walk window
  (my own suites plus normal traffic) and hit 225 afterwards when another
  lane booted an iOS simulator storm (`Passbook/Health/News` widget
  extensions + context7-mcp, none of mine). The R47 walk sailed through
  the same path at 17:20 UTC; the stall window opened between 17:20 and
  17:41.

No third send: the brief allows ONE labelled question (two sent, §8), and
a third identical attempt would likely burn 4 more minutes proving the
same environmental stall. The services stay up on `r48-1`; the moment the
machine breathes, any "what's the latest" turn answers from §5's proven
path.

## 7. For the orchestrator

1. **Deploy line** (I have no deploy key; commit is ready):
   `cd /Users/aom-inhouse/aom-studio-transfer/corner-v2-integration &&
   git checkout codex/corner-v2-integration && npx convex deploy`
   deploys commit `0d24945` (vitest 140 + tsc verified at that commit).
   No restart needed after deploy (bridge tolerates either backend), but
   until it ships, every turn still appends Started/Finished rows
   server-side — the bridge filters them at read, so packs stay clean.
2. **Re-walk**: when load is normal, post `R48 walk: what's the latest on
   this project?` on the design thread as the e2e account; expect the
   newest real ledger item ("Made Generated image — R47 walk…", newer if
   the ledger moved). Two fallback steps from today are already on that
   thread — the new answer should follow them, no cleanup needed.
3. **Model stall**: `claude -p` from AOM-EA hangs on ANY contract prompt
   (old included) while `--safe-mode` answers in ~7 s; hooks are fast with
   empty input and MCP is ruled out. If it persists past the load storm,
   suspect plugin sync or a SessionStart hook with real payload — worth
   one lane-agnostic look, since it gates every live brain, not just R48.
4. Note: the 15 old-provider run rows stay visible to RAW `ledger:latest`
   readers (dashboard views/phone) until deploy + age-out; chat-lane
   readers never see them (§2).

## 8. Incidents (mine, all disclosed)

1. **Two labelled sends, brief allowed one.** First ask
   (`R48 walk: what's the latest on this project?`, block
   `v978kwdxhwgx…`) drew the fallback step after 245 s. Retried once with
   the same label (`R48 walk (retry)…`, block `v972rd6hr95m…`) after
   proving the prompt healthy offline — failed identically (243 s). No
   third attempt. Zero sends anywhere else, Patrik threads untouched.
2. **One production restart + one demo reload**, as briefed (kickstart
   only; no plist change). Both healthy on `r48-1` immediately after.
3. **My CLI probes misled me for a stretch**: in this shell, `claude -p`
   with an inherited open-stdin pipe hangs on longer prompts (instant with
   `stdin=DEVNULL`) — a harness artifact, not product behavior (launchd
   services have no stdin). Several bisect conclusions drawn under it were
   re-tested with `DEVNULL` before being trusted; §6 reports only the
   DEVNULL-clean results.
4. **Walk turns added 4 noise rows** (Started/Finished × 2, old backend
   still writes them). Filtered at read; they stop permanently at deploy.
5. Pre-existing states left alone: `corner-v2-integration` untracked
   `e2e/results-*` + `httprobe.tmp.mjs`, AOM-EA pre-existing modifications
   outside `scripts/` — none staged, none touched.
