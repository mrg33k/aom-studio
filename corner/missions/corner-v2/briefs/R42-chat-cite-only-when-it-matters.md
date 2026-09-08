# Brief R42-chat-cite-only-when-it-matters — plain answers, a source named only when it changes what Patrik does

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R40-chat-health-and-voice.md` (the round you extend), `rounds/LEDGER.md` rows R40 →
"LIVE RE-WALK (desktop, after R41)", `punch-list.md` row **C012**. Code: AOM-EA `scripts/v2-team-bridge.py`
(HEAD `1fbb84131`, contract `r40-1`) + `scripts/test_v2_team_bridge.py` (138/138, plain `python3`, never `-s`).
Service: launch agent `com.aom-ea.corner-v2-bridge` (:3100; `/health` now honest — `status`, `failedTicks`,
`lastTickError`). Demo bridge :3099 runs the same script pinned to `R20_THREAD=vd7f0v4dn3kjjx9qnt9acryemn8dyr95`
(env `/tmp/r21-live-bridge.envlist`). Probe: `/tmp/r38-dbg.py` → copy to `/tmp/r42-dbg.py` writing
`/tmp/dbg-run13.json`. Report: `rounds/R42-chat-cite-only-when-it-matters.md`. Production backend
`brilliant-scorpion-163`; never `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## What Patrik reads today (production, 5:21 AM, Wolfpack)
"Wolfpack site is live at wolfpackcompanies.com, from the thread." / "Contract is signed by Ross and closed,
from the project notes." / "…the Ross shoot dates follow up, from the project notes." — R40 moved the prefix
tic to a suffix tic. Three citations in three sentences. Patrik's voice rule for the whole system: simple,
brief, warm; a citation is a tax on every sentence.

## Build
1. **Cite only when it matters.** A source is named only when (a) two sources disagree, (b) the fact is older
   than 7 days and the answer depends on it being current, or (c) the claim is unconfirmed (e.g. "drafted in
   Gmail Drafts" has never been confirmed by Patrik — say "in your drafts, I think; confirm?"). Otherwise a
   plain sentence. Never more than one citation per answer; never as a trailing ", from the X." clause —
   fold it in ("Your notes still say…"). Contract rule + a boundary pass that strips trailing source
   clauses and a unit test on the exact three sentences above.
2. **Unconfirmed facts wear a light marker** in the pack ("unconfirmed" flag on FACTS rows Patrik has not
   answered: Ross email FILE vs Gmail draft, Ambition's week, GA on Wolfpack, contract date, lead attribution,
   September footage) so the driver hedges once, plainly, instead of asserting.
3. **Keep every R37/R40 gate**: step ≤ 1.5 s, done ≤ 15 s on Ambition, no scold, no repeated opener,
   health honest, zero 401s.

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 138 + yours, all pass.
- ONE production service restart (contract `r42-1`), then the four-question probe on production: ≥ 7/8 by
  the DBG-4 scoring, at most one citation per answer and none as a trailing clause, an explicit hedge on
  the Gmail-Drafts claim. Restart the :3099 demo bridge on the same build afterwards (pinned, env file).
- No client-facing sends; the bot only answers in the tester's threads. Commit on AOM-EA with scoped paths;
  never `git add -A`. Report: the before/after sentences, contract diff, "for the orchestrator", "still off".
