# Brief R50-chat-card-first — every answer starts from the project's state card; the loose ends of one-voice closed

Mission: `corner:corner-v2` (chat lane). Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R49-chat-one-voice.md` (the round you extend) + its ADDENDUM in
`briefs/R49-chat-one-voice.md` (the orchestrator shipped the adapter hardening as `da6cebc35`: keep it),
`corner/missions/gateway/rounds/G2-state-cards.md` §5.3 (the EXACT pack change — implement it verbatim),
`punch-list.md`. Code: AOM-EA `scripts/v2-team-bridge.py` (HEAD `da6cebc35`, contract `r49-1`) +
`scripts/test_v2_team_bridge.py` (187/187, plain `python3`, never `-s`). Backend deployed on
`brilliant-scorpion-163`: `projectCards:get {world, subject}` / `list {world}`, `projectFacts:pending`,
`ledger:latest` noise-filtered. Web repo `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`
(`e2e/chat.spec.ts` still asserts the old team protocol). Report: `rounds/R50-chat-card-first.md`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## Build
1. **Card first in the pack** (G2 §5.3 verbatim): parallel `projectCards:get` read; rendered as section
   `(0) STATE CARD (derived, never hand-edited — read first)` with status, last (what + who + when), next,
   waiting-on lines (source `fact` lines hedged once per thread per R45), confirmed fact count, file names;
   null card → section omitted; read failure → `[r50] card read failed` log line, never a failed turn.
   Synthesis order: card → ledger → thread → notes. Health: `cardReads`, `cardAt`. Unit tests on the
   rendering and the failure path.
2. **Answer shape for "what's the latest"**: first sentence = the card's `last` in plain words with the day
   and who ("Yesterday Claude decided to generate clean images for the eight Wolfpack services."), second =
   next step, third (only if any) = what is waiting on Patrik. No citations, no run talk.
3. **`@ops`/`@gary`**: register gary as a summonable brain (agents list) or map `@ops` → gary explicitly;
   unit test.
4. **`e2e/chat.spec.ts` → one voice**: rewrite the team-protocol assertions in the web repo's chat suite to
   the R49 rule (one run per user block, @summon answers alone, unknown @ → driver). Run it against your
   restarted service (`TEST_BRIDGE_URL`), green. Commit on `corner-v2-integration` scoped to that file.
5. Keep every R37-R49 gate; the claude adapter argv/cwd/stdin stay as shipped.

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 187 + yours; ONE production restart (contract `r50-1`) +
  demo bridge kickstart; proof on the design thread ONLY (e2e account): "what's the latest" answers card-first
  with day + who; `@design` answers alone; `@ops` answers as Gary. Zero sends on Patrik's threads.
- Commit on AOM-EA with scoped paths; never `git add -A`. Report: before/after answers, contract diff,
  "for the orchestrator", "still off".
