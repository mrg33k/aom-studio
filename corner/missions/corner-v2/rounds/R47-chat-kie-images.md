# R47 — chat KIE images: KIE.ai is the image generator, now and forever

Worker: headless builder, chat lane round fourteen. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R46-chat-say-it-once.md`,
`rounds/R33-chat-images-and-instant.md` §image pipeline,
`rounds/R44-chat-honest-image-reply.md`, KIE skill
`.agents/skills/kie/SKILL.md`, `.agents/skills/kie/PIPELINE.md`,
`.agents/skills/kie/pipeline/kie.py`.
Code: AOM-EA `scripts/v2-team-bridge.py` (contract `r47-1`) +
`scripts/test_v2_team_bridge.py` (164/164, plain `python3`, never `-s`).
Service: launch agent `com.aom-ea.corner-v2-bridge` (:3100, wrapper
`scripts/corner-v2-bridge.sh` sources `corner/state/corner-v2-bridge.env`).
Demo bridge: launch agent `com.aom-ea.corner-v2-demo-bridge` (:3099, Paige
on the e2e account's Aster / Spring launch deck thread
`vd7f0v4dn3kjjx9qnt9acryemn8dyr95`). Report: this file. Never
`neat-pony-216`.

Verdict: the image turn is KIE-only end to end, proven live. One image ask
on the design thread → "Generating with KIE…" step at +1.0 s, a
"still rendering, 20 s" progress line mid-render, a real KIE photo in the
Visual Window at done 52.0 s with `meta.provider: kie`,
`meta.model: nano-banana-pro`, an honest two-block reply (prompt echo +
tab/next step, no invented scene), zero boundary rewrites. Unit suite
**164/164** (158 existing green + 6 net new R47). Committed AOM-EA (scoped
paths only, nothing pushed) plus the aom-studio report + evidence.
Production restarted **once**, healthy on contract **`r47-1`** with
`imageProvider: kie`, `kieKeyPresent: true`. Demo bridge reloaded
afterwards on the same build, pinned.

Rule compliance: every URL below is `brilliant-scorpion-163`; one
client-visible send this round (the labelled R47 walk image ask on the e2e
design thread via the demo bridge); zero sends on Patrik's
Wolfpack/Ambition threads. Scoped commits, nothing pushed. The key was
never printed, committed, or logged (health reports a boolean only).

## 1. Before / after

Before (`r46-1`): the turn rendered a local typeset "study" and disclosed
no-credits/Higgsfield. The Higgsfield seam (`higgsfield_argv`) was dead
code (defined, never called); no OpenAI image path existed in code at all
(only the chat-backend adapter, which stays).

After (`r47-1`, this round's walk turn on the design thread
`vd7f0v4dn3kjjx9qnt9acryemn8dyr95`):

> Ask (17:20:16 UTC): "R47 walk: make an image for the Spring deck hero,
> a founder on stage at sunrise, wide."

> Step "Generating with KIE…" at +1.0 s, step "still rendering, 20 s"
> mid-render, then: "KIE rendered the Spring deck hero for Aster:
> a founder on stage at sunrise, wide." / "It is open in the Visual
> Window tab 'Generated image — R47 walk: make an image for the Spring
> deck hero…'. Take a look and tell me if the framing works for slide
> one, and I can run a variation on your call."

Two blocks, each adding something (render fact, then tab + next step;
overlap ~0.33, kept under the R46 0.6 rule). The first block is a prompt
echo, which the brief allows; the eyeballed render matches it (founder on
stage, sunrise, wide, no text, no logos, no watermarks). The new artifact:
title `"Generated image — R47 walk: make an image for the Spring deck
hero…"`, `kind: photo`, `meta: {brand: Aster, model: nano-banana-pro,
provider: kie, status: ready, taskId: 764a27a549fecec78c34b344b6c2cd72,
prompt: <the ask>}`, 7,319,749 bytes `image/png` over HTTP with PNG
magic. Full turn text in `/tmp/r47-walk.json`; evidence
`rounds/evidence/R47-kie-image.png` (1440-wide copy of the KIE bytes;
full bytes verified by magic + length).

## 2. What changed (contract diff `r46-1` → `r47-1`)

- Version pin + every R31/R33/R35/R37/R40/R42/R44/R45/R46 rule stays
  verbatim (unit-pinned; the six `r46-1` version asserts bumped to `r47-1`
  as a deliberate contract bump, R42/R45 precedent).
- `run_image_pipeline` is KIE-only: `build_kie_prompt` (ask + brand art
  direction + standing negatives "no text, no lettering, no logos, no
  watermarks", unit-pinned to never carry logo/type instructions) →
  `kie.Job(prompt, model="nano-banana-pro")` via the skill's `kie.py`
  imported by path (`kie_module()`, never copied; tests inject a fake as
  `sys.modules["kie"]`) → `poll` in 20 s chunks to a 120 s budget with a
  "still rendering, N s" progress label after every timed-out chunk and a
  stop-check between chunks → first URL downloaded → upload through
  `files:generateUploadUrl` → `createArtifact`/`upgradeArtifact` with
  `meta.provider: kie`, `meta.model`, `meta.taskId`, `meta.prompt`,
  title `"Generated image — <ask>"` on both paths.
- Deleted: `higgsfield_argv` + its test, the unused `R33_IMAGE_PROVIDER`
  env switch. There was no OpenAI image path to delete (see §4.1).
- The local renderer survives ONLY as the failure card: timeout →
  "KIE didn't answer in time", error → "KIE error: \<plain reason\>",
  rendered on brand ground, titled `"Image failed — <ask>"` with the
  matching disclosure in the reply — never called a study, never the
  result. `honest_image_reply` now gates the failure card (ready KIE
  renders pass through; the contract carries the R44 describe-only rule,
  since only a vision read could verify a scene claim). Blank stays
  blank, so the R46 artifact-only plan still holds.
- `_answer_image` wires `ops["progress"]` to a step event on the run and
  voices ready/failed turns from one unified path (failure synthesis
  hands the model the exact disclosure).
- `/health` (service AND single-thread paths) reports
  `imageProvider: "kie"` and `kieKeyPresent` (boolean only).
- Wrappers: `scripts/corner-v2-bridge.sh` sources
  `~/.config/kie-api-key.env` when present (`set -a`); new
  `scripts/corner-v2-demo-bridge.sh` does the same for the demo bridge,
  and the demo plist now runs through it (no literal key in the plist —
  verified by grep: the only match is the file path in a comment).

## 3. Gates

- `python3 scripts/test_v2_team_bridge.py` = **164/164**
  (161 − 6 removed + 9 new: removed `test_r33_higgsfield_argv_shape` +
  5 `test_r44_*`; new 5 `test_r47_pipeline_*`/boundary/contract + 4
  prompt/submit/step/health; 4 R33 pipeline + R45 upgrade tests reworked
  onto the fake `kie` module, all other tests byte-unmodified).
  Tail: `PASS test_r47_*` × 9, `all tests passed`.
- Pre-flight through the exact production path (scratch, not a send):
  key auth HTTP 200 against `/api/v1/chat/credit` (balance 1890.0);
  `run_kie_render` → ready, task `41117975003f3fe5e4c2475e1604acc5`,
  42.0 s, one "still rendering, 20 s" line, 8,068,941 PNG bytes, magic
  `89504e470d0a1a0a`, eyeballed a real sunrise-stage photo
  (`/tmp/r47-preflight.png`).
- Walk (§1): step +1.0 s (service `step_s=0.7`), progress line,
  done 52.0 s (≤ 120 ✓), real KIE bytes in the Visual Window,
  `meta.provider: kie`, honest reply, zero `[r47]` rewrites (contract
  did the work). Demo handled 60 → 61 (my turn only).
- Health after restarts: production `ok`/`r47-1`/`kie`/`true`/
  `failedTicks 0`/`lastTickError null`; demo `:3099` pinned thread,
  paige, live, `r47-1`/`kie`/`true`.

## 4. For the orchestrator

1. **No OpenAI image path existed.** The brief's "tries Higgsfield and
   OpenAI" describes tonight's provider situation, not code: the only
   image-provider code was the dead Higgsfield argv builder (deleted)
   and the local renderer (now failure-card-only). The OpenAI
   chat-backend adapter and its key test are untouched — that is chat
   wording, not image gen.
2. **Path-import fix, worth one line.** Loading the skill's `kie.py` by
   path failed on this Mac's Python 3.9 (`sys.modules.get(...)` is None
   during dataclass processing); registering the module in
   `sys.modules` before `exec_module` fixes it. Caught by the
   pre-flight, never by the suite (fake module) — the pre-flight earned
   its credit.
3. **Failure card never fired live** (KIE answered both times); it is
   covered by unit tests only (timeout → card + disclosure + 5 progress
   lines; error → card + named reason). If you want it proven live,
   that is a deliberate-burn brief, not a gap in this one.
4. **Demo plist edits need unload/load, not kickstart.** A changed
   `ProgramArguments` only takes effect on reload; production (plist
   untouched) took the single `kickstart -k` as briefed.
5. KIE returned 2528×1696 for the walk (default 3:2/2K job); the Visual
   Window got the full 7.3 MB bytes, the report carries a 1440-wide
   copy. No rate-limit or credit pressure (1890 balance).

## 5. Still off and why

- **Done 52.0 s, almost all KIE + model time.** Arithmetic: pickup +
  pack + step 0.7 + KIE render ~40 + model ~11 single-pass Muse. The
  model-time half is the standing R40 cost; the KIE half is the product
  (a real photo, not a study). Progress lines keep the turn visibly
  alive during it.
- **Two reply blocks, not one** — legitimate under R46 (fact, then tab
  + next step), not the R46 stutter shape. A stricter one-block image
  rule would be a new brief, not this one.
- **`R1 Vision interview` still unflagged** in queued rows (standing Q4
  half-point, R42 §6.3 class) — not this lane.

## 6. Incidents (mine, all disclosed)

1. **One production restart, as briefed.** 17:19 UTC via `launchctl
   kickstart -k`; health `ok`/`r47-1`/`kie`/`true`/`failedTicks 0`
   immediately after. No second restart. Demo reloaded once afterwards
   (unload/load for the plist change), healthy and pinned.
2. **My first walk poll exited early** (15 s quiet vs a 52 s turn —
   the R40/R42/R44 harness-timeout class, fifth round running); the
   follow-up poll merged the full turn. Tester-side cadence, no extra
   send. My first event parser also misread the `threadEvents` shape
   (fields are `author`/`blocks`, not `authorType`/`kind`) — fixed in
   the follow-up; the step/reply/artifact evidence comes from the raw
   JSON either way.
3. **My hand-typed storage URL 404'd** (dropped UUID char, 274-byte
   error body, harmless GET); re-fetched the URL from the artifact
   record programmatically — 7,319,749 bytes, PNG magic.
4. **No other thread was answered.** The walk turn completed; demo
   handled 60 → 61 is exactly my ask. Production `turnsLastHour 6` at
   restart is other-lane traffic, untouched by me.
