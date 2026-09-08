# Brief R45-chat-armed-title-and-hedge-once — the armed image path names its tab honestly, and an unconfirmed fact is hedged once per thread, not once per answer

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R44-chat-honest-image-reply.md` (the round you extend; §5.1 and §5.2 are this
brief), `rounds/R42-chat-cite-only-when-it-matters.md` §6.1. Code: AOM-EA `scripts/v2-team-bridge.py` (HEAD
`45ff2370e`, contract `r44-1`) + `scripts/test_v2_team_bridge.py` (148/148, plain `python3`, never `-s`).
Backend deployed on `brilliant-scorpion-163`: `v2Visual.upgradeArtifact` now accepts an optional `title`
(`f786c47`). Service: launch agent `com.aom-ea.corner-v2-bridge` (:3100); demo bridge launch agent
`com.aom-ea.corner-v2-demo-bridge` (:3099). Report: `rounds/R45-chat-armed-title-and-hedge-once.md`.
Never `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## Build
1. **Armed path titles honestly.** In `run_image_pipeline`'s upgrade branch pass `title` (the same
   "Image study — <ask>" / "Generated image — <ask>" the create branch computes) so a client-created pending
   photo (web image menu / phone Generate) reads "Image study" when the local renderer answered. Unit test
   on the upgrade call's args; the existing R33 upgrade test keeps passing.
2. **Hedge once per thread.** An unconfirmed FACTS row (Ross email FILE vs Gmail draft, Ambition's week, GA
   on Wolfpack, contract date, lead attribution, September footage) gets its "…I think; confirm?" hedge the
   FIRST time it is stated in a thread; later answers in the same thread state it plainly with no hedge and
   no citation until Patrik answers (the ask is already on the table). Track "hedged" per thread + fact in
   the service state file (merge-on-save, like `turnsLastHour`). Unit test: two answers, one hedge.
3. **Acknowledge-and-clear.** If Patrik's message answers a hedged fact ("it's a Gmail draft", "yes",
   "sent it"), the driver acknowledges in words, marks the fact confirmed in the state, and never hedges it
   again — `.claude/rules/acknowledge-and-clear.md` is the rule. Unit test on the three phrasings.
4. Keep every R37/R40/R42/R44 gate.

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 148 + yours, all pass.
- ONE production service restart (contract `r45-1`), then the four-question probe (`/tmp/r38-dbg.py` →
  `/tmp/r45-dbg.py` → `/tmp/dbg-run15.json`) ≥ 7/8, zero scold / trailing cite / 401; Q1 and Q2 on Wolfpack
  in the same thread: the Gmail-Drafts hedge appears exactly once across the two answers. Restart the demo
  bridge with `launchctl kickstart -k gui/$(id -u)/com.aom-ea.corner-v2-demo-bridge`.
- No client-facing sends. Commit on AOM-EA with scoped paths; never `git add -A`. Report: before/after,
  contract diff, "for the orchestrator", "still off".
