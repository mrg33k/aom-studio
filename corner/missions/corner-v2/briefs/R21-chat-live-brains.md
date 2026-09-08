# Brief R21-chat-live-brains — the team protocol with REAL brains: Claude, Muse, OpenAI speak through the same driver/context/run/ledger mechanics, and the chat suite still passes

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R20-chat-team-protocol.md` (the protocol as implemented, the adapter
seams, the honest gaps), `briefs/R20-chat-team-protocol.md` (the six assertions), and
`punch-list.md` (L010 is the UI defect R20 found). Write your report to
`rounds/R21-chat-live-brains.md`: every command with its output.

You are a headless worker, BUILDER of the chat lane, round two. Nobody will answer questions.

## Where R20 left it (verified by the orchestrator 2:12 PM)

`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/scripts/v2-team-bridge.py` (HEAD `ce0d76103`+):
driver ownership, per-turn context pack, structured runs (`v2Visual.startRun/appendEvent/finishRun`),
delegation, ledger writes; `R20_BRAIN_MODE=script` speaks canned lines; `live` mode has adapter
seams for Claude (`claude -p`), Muse (`~/.local/bin/muse`), OpenAI (`openai_room_provider.py`) that
are unit-tested but have never produced real wording. 15 unit tests
(`python3 -s scripts/test_v2_team_bridge.py`), 7 Playwright `chat` tests in the web worktree
(`LIVE_BASE_URL=<preview> TEST_BRIDGE_URL=http://127.0.0.1:3099 npx playwright test --project chat --output e2e/results-orch`),
all green in script mode on the clone. Newest preview URL: `rounds/LEDGER.md`.

## This round

1. **Live brains, same protocol.** `R20_BRAIN_MODE=live`: the driver (Paige for Aster per R20's
   map, `R20_DRIVERS_JSON`) and the guest brains produce real wording from the context pack. Each
   adapter gets ONE system contract (the same for all brains, versioned in the bridge): who you are
   (the label), what you own (driver or guest), the context pack verbatim, the output contract
   (JSON: `steps[]`, optional `question{prompt, options[2..4]}`, optional `delegate{brain, task}`,
   `looking{artifact|tab}` optional, `reply` text ≤ 120 words, `done` boolean), and the rules
   (answer "latest" from the ledger rows given; never speak as another brain; never invent a
   file, a person, or a decision that is not in the pack). Parse strictly; a malformed reply is a
   retry once, then a plain "I couldn't finish that turn" step + `done`, never silence.
2. **The suite passes in live mode.** Same 7 tests; where an assertion depends on canned text,
   change the assertion to a property (the ledger fact appears in the reply; the question block
   has options; the guest's contribution is labelled; the driver closes) — never weaken the
   defects A/B/C checks. Add test 8: the same six-step conversation run twice with two different
   driver brains (e.g. Claude-backed and Muse-backed) yields the same STRUCTURE (steps → question
   → decided ledger → guest → close), proving the brains are interchangeable under the protocol.
   Add test 9: a brain that ignores the contract (inject a fake adapter returning free text) is
   contained: the person sees one plain step and a closed run, not garbage, not silence.
3. **Wording quality gate, deterministic.** For every live reply in the suite write
   `rounds/evidence/R21-reply-<brain>-<step>.txt` and assert: mentions the Project or Mission by
   name at least once per turn, no em dashes, no "As an AI", ≤ 120 words, the "latest" reply
   contains the decided option's text. These are checks, not a judge.
4. **Latency and cost line.** Per brain: median seconds per turn and tokens (if the CLI reports
   them) in the report; a turn over 45 s is a finding, not a pass.
5. **Keep it honest about what the clone lacks.** No `convex/` changes this round (the redeploy
   key is pending); delegation still rides step payloads, `done` is the writer's receipt — say so.

## Hard lines

- Never point anything at `neat-pony-216` (the bridge refuses; keep it that way). Never touch the
  launch agents. Own bridge instance on :3099 only; kill it when done.
- No client-facing sends, no email, no Telegram. Test account from `/tmp/corner-v2-e2e.env` (never
  in a report). Real brains cost money: cap the run — the suite in live mode at most 6 times total.
- Do not edit `src/` or `ios-native/`. AOM-EA commits scoped to `scripts/` + the mission folder;
  web worktree commits scoped to `e2e/chat.spec.ts`; never push.
- Report: 9 tests before/after per mode, wording gate table, latency/cost table, what changed with
  commits, "for Patrik": the driver map recommendation for AOM's real projects (which brain drives
  which project and why, one line each) and anything a real brain refused or hallucinated.
