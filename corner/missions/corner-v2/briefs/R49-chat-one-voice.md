# Brief R49-chat-one-voice — one agent answers each message with the most intelligent answer; @name brings in a specific agent

Mission: `corner:corner-v2` (chat lane). Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R48-chat-ledger-first.md` (the round you extend — its ledger-first pack stays), the
R20/R21 team-protocol rounds only to know what you are switching OFF. Code: AOM-EA `scripts/v2-team-bridge.py`
+ `scripts/test_v2_team_bridge.py` (plain `python3`, never `-s`). Service env (never print values):
`corner/state/corner-v2-bridge.env` has `R21_DEFAULT_BACKEND=muse`, `R21_BACKENDS_JSON='{"steffen": "claude"}'`,
`R20_DEFAULT_DRIVER=mom`. Agents on disk: `corner/users/aom/agents/<slug>/AGENT.md` (steffen design, bobby web,
cleo video/content, jacob outreach, tony social, gary ops, alex deals, steve AI advisory, rex EA, mom driver,
paige the Aster driver). Report: `rounds/R49-chat-one-voice.md`. Never `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## Patrik, 11:05 AM (his words)
"It feels like we are running in circles. The UI looks great on desktop. Now we need the chat to work as
designed — simple but difficult task. Right now we have multiple agents speaking and none of them know
what's happening. We need to leave it to ONE agent that chimes in per message, the one with the most
intelligent answer. The user can request a specific agent by typing @design or something like that and
then that agent will chime in."

## The rule (this replaces the team protocol's "driver + specialists" for every thread)
1. **Exactly one agent replies to each user message.** No second voice, no specialist chiming in, no
   hand-offs inside a turn, no "team" runs. One run, one brain, one reply (steps + one answer, per R35/R46).
2. **Default responder = the project's driver on the strongest brain.** Set the driver's backend to `claude`
   for every project (`R21_DEFAULT_BACKEND=claude`; Muse stays available for specialists and workers, not
   for the answer the user reads). Keep the R37-R48 contract: step first, ledger first, plain, cite once,
   never scold, honest images, say it once.
3. **@name summons that agent for that message only.** `@design`/`@steffen`, `@web`/`@bobby`,
   `@video`/`@cleo`, `@outreach`/`@jacob`, `@social`/`@tony`, `@ops`/`@gary`, `@deals`/`@alex`,
   `@ai`/`@steve`. The summoned agent answers alone, in its own name, with the same pack; the driver stays
   silent for that message. Two mentions = the first named agent answers and says in one line that the
   second can be asked next. Unknown @word = the driver answers and does not mention the miss.
4. **Every agent knows what's happening**: the pack is identical for whoever answers (ledger first, then
   facts, thread, notes) — a summoned specialist never opens with "I don't have context".
5. **Kill the leftovers**: any code path that can emit two agent messages for one user block (specialist
   auto-invites, delegation-result rows, "team" runs, the demo bridge's second guest) is removed or hard-
   gated off; a unit test asserts one run per user block across a 20-turn mixed fixture (plain, @mention,
   two mentions, unknown mention, image ask).

## Gates
- Unit suite = current + yours, all pass (`python3 scripts/test_v2_team_bridge.py`).
- ONE production restart (contract `r49-1`) with the backend map change in `corner-v2-bridge.env`
  (edit the file in place, keep 0600, print nothing). Demo bridge restarted after
  (`launchctl kickstart -k gui/$(id -u)/com.aom-ea.corner-v2-demo-bridge`).
- Proof on the design thread ONLY (e2e account, Paige): four labelled sends — plain question, `@design`
  question, `@web @design` question, `@nobody` question — each gets exactly one agent reply from the right
  name; screenshots in `rounds/evidence/R49-*.png`; the answers read like someone who knows the project.
  Zero sends on Patrik's Wolfpack/Ambition threads.
- Commit on AOM-EA with scoped paths; never `git add -A`. Report: the rule as shipped, contract diff,
  the four proof rows, "for the orchestrator", "still off".

## ADDENDUM (orchestrator, 11:40 AM) — the claude backend must not load this repo's customizations
R48 §6 proved on this Mac: `claude -p` with the AOM-EA project customizations (hooks/plugins from
`.claude/settings.json`) hangs under machine load (2 × 120 s adapter timeouts → "I couldn't finish that
turn"), while `--setting-sources user` answers in ~7-24 s and `--safe-mode` in ~7 s; the prompt itself is
innocent. Since this round makes `claude` the default driver backend, the adapter MUST: run `claude -p` with
`--setting-sources user` (no project hooks, plugins, or MCP), from a neutral cwd (e.g. `/tmp/corner-bridge-cwd`,
not the repo), with `stdin=DEVNULL`, an explicit `--model` (the strongest available), and a 90 s timeout with ONE
retry on a fresh process. Unit-test the argv. Prove it live on the design thread under whatever load the machine
has: the four proof sends land answers, never the fallback step. If `claude` still cannot answer in 90 s twice
in a row, fall back to `muse` for that turn and say nothing about it to the user — but log `[r49] backend
fallback` so the orchestrator sees it. Health reports `driverBackend` and `backendFallbacksLastHour`.
