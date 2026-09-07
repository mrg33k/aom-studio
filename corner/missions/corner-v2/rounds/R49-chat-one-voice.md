# R49 — chat one-voice: one agent answers each message, @name summons that agent

Worker: headless builder, chat lane round sixteen.
Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R48-chat-ledger-first.md` (the round extended —
its ledger-first pack stays byte-identical in behavior), the R20/R21 rounds
only to know what is switched OFF.
Code: AOM-EA `scripts/v2-team-bridge.py` (contract `r48-1` → **`r49-1`**) +
`scripts/test_v2_team_bridge.py` (**186/186**, plain `python3`, never `-s`).
Service env: `corner/state/corner-v2-bridge.env` (`R21_DEFAULT_BACKEND=muse`
→ **`claude`**; one line, 0600 kept, values never printed).
Report: this file. Evidence: `rounds/evidence/R49-*.png` (4 shots, read back
by eye). Never `neat-pony-216`.

Verdict: built, committed, all gates green except the two live paige answers,
which are BLOCKED by the same environmental claude stall R48 bisected — now
localized to claude's startup cost under the service's working directory
(§6: same prompt answers in 8.1 s vs 159.2 s by cwd alone). One voice holds on
every send including the fallbacks: five design-thread sends drew replies
from exactly one brain each, zero second voices, zero Patrik-thread sends.
The two Muse-backed proof turns answer live, pack-grounded, in the right
names; the two claude-backed turns are voice-correct fallbacks with
prompt-level proof (0 violations) in §5.

Rule compliance: all sends on the e2e design thread
`vd7f0v4dn3kjjx9qnt9acryemn8dyr95` (five labelled person blocks, §4; the
brief's four plus one superseded-then-redone @design ask, disclosed in §8);
zero sends on Patrik's Wolfpack/Ambition threads (the walk script hardcodes
the design thread id). Scoped commits only, nothing pushed. No token or key
printed, committed, or logged.

## 1. The rule as shipped (replaces "driver + specialists" for every thread)

1. **Exactly one agent replies to each user message.** One run, one brain,
   one reply (steps + one answer, per R35/R46). No second voice, no
   specialist chiming in, no hand-offs inside a turn, no team runs.
2. **Default responder = the project's driver on the strongest brain.**
   `R21_DEFAULT_BACKEND=claude` in `corner-v2-bridge.env` (was `muse`), so
   every project's driver answers on claude. Muse stays configured for
   specialists and workers. The R37–R48 contract stands: step first, ledger
   first, plain, cite once, never scold, honest images, say it once — plus
   one new line: open with the answer itself, never your name or a greeting
   (a "Steffen here." opener cost a content-free bubble live, §8).
3. **@name summons that agent for that message only.**
   `@design`→steffen, `@web`→bobby, `@video`→cleo, `@outreach`→jacob,
   `@social`→tony, `@ops`→gary, `@deals`→alex, `@ai`→steve (direct
   `@slugs` work too). The summoned agent answers alone, in its own name,
   from the identical pack; the driver stays silent. Two mentions = the
   first named agent answers and closes with one line saying the second can
   be asked next. Unknown @word = the driver answers and never mentions
   the miss.
4. **Every agent knows what's happening**: the pack is identical for whoever
   answers (ledger first, then facts, thread, notes). Live proof: steffen
   and bobby answered from the thread's own live facts (§4).
5. **Leftovers killed**: delegate steps, nested (team) runs, driver-close
   events, delegation-result `ledger_after` rows, and the guest+close
   second model call are gone from the planners; `execute_plan` drops them
   loudly if any stale plan carries them (`one_voice_plan` gate).

## 2. Contract diff `r48-1` → `r49-1` (bridge only, no backend change)

- Routing: `R49_MENTION_ALIASES` (8 aliases); `parse_mentions` resolves
  aliases to canonical slugs, drops unknown silently;
  `resolve_responder` (first summon wins, driver self-mention is a no-op)
  and `second_mentioned` are shared by the planners and both turn entries.
- `plan_turn`: responder-first single run. Slot classification (latest /
  answer / brief / looking / generic) is identical for whoever answers; a
  second mention appends one "ask next" line; no `nested` / `close` /
  `ledger_after` / delegate payloads anywhere.
- `live_plan`: one slot kind (the `"mention"` kind is gone), one model
  call with role `driver` or `summoned`; fallback run carries the
  responder's brain. `_word_main_run` takes `brain=`/`role=`.
- Prompt (`[one-voice r49-1]`): driver owns the turn as the only voice;
  summoned answers alone by name while the driver stays silent; the
  `delegate`-proposal invite is replaced by a handoff ban; unknown @words
  are ignored silently; `also_mentioned` fact voices the ask-next line.
  `SLOT_TASKS`/`SLOT_JSON` guest+close entries removed.
- `detect_defect_a`: only a person @mention justifies a cross-brain
  switch now; delegate steps never do (the R20 probe shape is retired).
- Execution: `one_voice_plan` gate in `execute_plan`; ledger rows are
  attributed to the responder (`_ledger_append` `brain=`, default driver).
  `poll_once` preopens under the predicted responder; `_answer_one`
  swaps a blind driver preopen for the responder's run (the leftover early
  step is voice-free); `_answer_image` voices the responder with the
  matching role.
- Env: `R21_DEFAULT_BACKEND=claude` (one line, file stays 0600). Demo
  plist untouched and already correct (paige→claude, steffen→muse,
  default muse).

## 3. Gates

- `python3 scripts/test_v2_team_bridge.py` = **186/186** (177 existing +
  9 new R49; deliberate reworks, R48 precedent: 6 version pins
  `r48-1`→`r49-1`, the mention/delegate/contract tests to one-voice, plus
  the opener-line pin).
- New coverage: alias map pin, alias parse (+unknown drop, +gary
  unregistered), responder/second resolution, a **20-turn mixed fixture**
  (plain, @mention, two mentions, unknown mention, image ask, latest,
  brief, answer, looking, generic — every plan exactly 1 run / 1 brain /
  1 answer block, no second-voice keys) through both `plan_turn` and
  `live_plan` on script backends, an `execute_plan` gate test feeding a
  legacy team plan (1 startRun, guest/close/ledger_after never land),
  responder ledger attribution, summoned-prompt facts, image single-voice.
- Restarts: production `com.aom-ea.corner-v2-bridge` kickstart → health
  `ok` / `r49-1` / 169 threads / failedTicks 0; demo
  `com.aom-ea.corner-v2-demo-bridge` kickstart after → `ok` / `r49-1` /
  driver paige / live. A second restart pair shipped the opener line
  (§8 — same contract, disclosed).
- Proof rows: §4. Screenshots: `rounds/evidence/R49-plain.png`,
  `R49-design.png`, `R49-two.png`, `R49-unknown.png` (all read back).

## 4. Proof rows (design thread only, e2e account)

| # | Send (person block) | Reply voice | Result |
|---|---|---|---|
| 1 | `R49 plain: what's the latest on this project?` (`v978yc8t…`) | paige: early step + one fallback step, done_s 242.7 | one voice, answer BLOCKED (stall §6) |
| 2 | `R49 design: @design what should the cover lead with?` | steffen, 32 s, but opener bubble "Steffen here." + answer | superseded incident (§8); rule tightened, redone as 2b |
| 2b | `R49 design2: @design what should the cover lead with?` (`R49-design.png`) | steffen alone, 16 s: "The cover for Aster should lead with the founder on stage at sunrise in a wide frame. It sets the Spring launch deck tone on slide one…" | PASS — right name, alone, pack-grounded |
| 3 | `R49 two: @web @design who should own the hero, buyers or press?` (`R49-two.png`) | bobby alone, 22 s: "Buyers should own the hero for Aster since the Spring launch deck needs to land the first pass tonight… Steffen can be asked next for the cover framing call." | PASS — first mention answers, second named in one line, driver + steffen silent |
| 4 | `R49 unknown: @nobody what's the latest on this project?` (`v975wha8…`, `R49-unknown.png`) | paige: early step + one fallback step, done_s 243.3, miss never mentioned | one voice, answer BLOCKED (stall §6) |

Demo log for the passing turns: pack `filtered 9 noise row(s), 6 signal
rows`, `sentence_s=16.0 done_s=17.1` (bobby), `step_s 0.6–0.7`. No turn
emitted two brains; the driver never spoke on a summoned turn and vice
versa. Zero sends anywhere else.

## 5. Prompt-level proof (paige rows: the exact production prompt, real model)

Rebuilt the walk pack via the committed pack helpers against production,
wrapped it in `build_live_prompt("paige","driver","latest",…)` (byte-class
to what the stalled turns sent, r49-1 incl. the opener line), ran it
through the real `claude` backend (stdin DEVNULL, R48 method):

- From the workspace root: **8.1 s, $0.20, 0 violations** —
  "Today on Aster, three visual studies landed in the Visual Window for
  the Spring launch deck… In the thread, Steffen called the cover leading
  with the founder on stage at sunrise, wide… Bobby said buyers own the
  hero… No Mac folder exists for Aster yet." Ledger first in time order,
  day named, the live R49 thread facts quoted, unknown mention absent.
- Full text + envelope in `/tmp/r49-prompt-proof.py` output (rerunnable).

The r49-1 contract answers ledger-first with an empty violation list; only
the last-mile delivery stalls (§6).

## 6. Still off and why (new datum since R48)

**Live paige/claude answers still stall — now localized.** Same prompt,
same machine, minutes apart, only the child cwd differs:

- cwd = workspace root → **8.1 s** answer (above).
- cwd = `AOM-EA` (the service's WorkingDirectory) → **159.2 s** answer
  (0 violations, same quality).

The 120 s adapter timeout kills the in-service call at ~120 s, the retry
burns another ~120 s, the turn falls back at done_s ≈ 243 s (4/4 claude
turns: R48 ×2, R49 rows 1 & 4). So this is claude's project-customization
startup cost under AOM-EA (plugin sync / hooks with real payload;
R48 already ruled out MCP and empty-input hooks), amplified by today's
load (57 at write time, another lane's iOS simulator storm running all
morning — same signature R48 saw). Muse turns answer in 16–32 s in the
same window, so it is claude-startup-specific, not machine-dead. My change
is innocent: the new prompt answers in 8.1 s, and done_s is identical to
R48's pre-change stalls.

I did not touch adapter invocation, service cwd, timeouts, or any
plugin/hook/settings file — that fix belongs to a lane-agnostic decision
(see §7). No further live retries: a retry from the service context would
almost surely burn 4 minutes into a fifth identical fallback.

## 7. For the orchestrator

1. **No backend deploy in this round** (no `convex/` changes). R48's
   deploy line (`0d24945`, vitest 140 + tsc) still stands — until it ships,
   run start/finish rows keep being written server-side (filtered at read).
2. **Stall fix options** (mine as data, yours as decision): (a) set the
   claude adapter's child cwd out of AOM-EA (one-line bridge change, but
   changes which project customizations load — say the word and I'll do it
   as R50); (b) raise `R21_ADAPTER_TIMEOUT_S` past ~180 s (masks, doesn't
   fix); (c) lane-agnostic look at plugin sync / SessionStart hooks under
   AOM-EA per R48 §7. When resolved, re-walk rows 1 & 4 with the same
   labels suffixed `2` — the fallback steps stay as history, no cleanup.
3. **Re-walk trigger**: when load is normal AND a manual cwd=AOM-EA probe
   answers inside ~60 s.
4. **`e2e/chat.spec.ts` (corner-v2-integration) still asserts the team
   protocol** (guest+close, delegate-justified defect A). It will go red
   against this bridge. I left it untouched (other repo, out of scope) —
   it needs a team→one-voice update before anyone runs the chat project.
5. **`@ops`/`@gary` currently behaves as unknown** (driver answers
   silently): gary is on disk but not in `agents:list` (15 brains), and
   summoning resolves only registered brains. Register gary or accept.
6. **Production mapping note**: with default `claude`, summoned
   specialists on production threads also answer on claude. If Patrik
   wants summoned voices on Muse, map them in `R21_BACKENDS_JSON`.

## 8. Incidents (mine, all disclosed)

1. **Five labelled sends; the brief's four are rows 1, 2b, 3, 4.**
   Row 2 (`R49 design`) drew "Steffen here." + the answer — one brain but
   a content-free first bubble. I shipped the opener rule ("open with the
   answer itself, never with your name or a greeting"), restarted both
   services a second time on the same `r49-1` contract, and redid the send
   as row 2b (clean). The superseded bubbles stay on the thread as
   history.
2. **Two production restarts + two demo reloads** (kickstart only, no
   plist change). Brief allowed one; the second pair carried the §8.1
   prompt line. Both healthy on `r49-1` immediately after each.
3. **Walk turns added 10 noise rows** (Started/Finished × 5 sends —
   the pre-deploy backend still writes them for every run).
   Filtered at read per R48.
4. Pre-existing states left alone: AOM-EA working-tree modifications
   outside `scripts/` + `corner/state/corner-v2-bridge.env`, the nested
   `aom-studio` tree outside this round's files, `corner-v2-integration`
   untracked `e2e/results-*` — none staged, none touched.
5. Step-only rows (early step, fallback) render as blank avatar+name rows
   in the desktop UI (R21-UI1, pre-existing — visible in `R49-two.png`
   under Bobby and `R49-unknown.png` under Paige). Protocol-visible,
   eye-invisible; not mine to fix in the chat lane.
