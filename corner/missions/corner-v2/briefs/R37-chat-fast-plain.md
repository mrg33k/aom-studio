# Brief R37-chat-fast-plain — the step lands in a second on every thread, Wolfpack answers as fast as Ambition, and the driver never scolds

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R35-chat-step-first.md` (the round you extend), `rounds/R33-chat-images-and-instant.md`
§contract, `rounds/LEDGER.md` rows DBG-4 → R35 → "R37 pre-read". Code: AOM-EA `scripts/v2-team-bridge.py`
(+ `scripts/test_v2_team_bridge.py`, run with plain `python3`, never `python3 -s` — the `-s` drops PIL).
Service: launch agent `com.aom-ea.corner-v2-bridge` (:3100, `scripts/corner-v2-bridge.sh`, contract `r33-2`
now). Probe: `/tmp/r37-dbg.py` (four questions, tester account `/tmp/corner-v2-aom-tester.env`, writes
`/tmp/dbg-run7.json`; copy it to `/tmp/r37-dbg-b.py` → `/tmp/dbg-run8.json` for your re-runs). Report:
`rounds/R37-chat-fast-plain.md`. Backend is production `brilliant-scorpion-163`; never write to `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## What the 2:01 AM probe on production showed (`/tmp/dbg-run7.json`, service log lines 686-703)

| thread | pickup | step visible | pack | model | first sentence | done |
|---|---|---|---|---|---|---|
| Wolfpack Q1 | 1.4 s | **5.1 s** | 3.1 s | **15.2 s** | 23.0 s | 24.1 s |
| Wolfpack Q2 | 2.1 s | **7.1 s** | 3.1 s | 8.3 s | 18.1 s | 19.6 s |
| Ambition Q3 | 1.3 s | 1.4 s | 0.7 s | 5.2 s | 6.9 s | 8.4 s |
| Ambition Q4 | 0.7 s | 1.1 s | 0.9 s | 10.0 s | 11.6 s | 13.0 s |

1. **The step is not first on Wolfpack.** 3.7-5 s pass between pickup and the step on Wolfpack, 0.1 s on
   Ambition. Something project-sized runs before the step write. Find it (log every call with its ms
   for one turn), move it after the step. Target: step visible ≤ 1.5 s after pickup on every thread.
2. **Wolfpack pack = 3.1 s with the `limit: 40` surface already in place**, so the surface was not the
   cost. Profile the pack per call (surface, project notes cache, FACTS, artifacts, ledger, tabs, nav)
   and fix the slow one(s). Target ≤ 1.0 s warm, ≤ 2.0 s cold.
3. **Model 15 s on Wolfpack vs 5 s on Ambition** = pack size. Budget the pack (FACTS first, then the
   newest thread rows, then notes trimmed to a token budget); log the pack size per turn. Target: first
   sentence ≤ 8 s, done ≤ 15 s for a notes question on either project.
4. **Never scold.** Q1's reply opened "From the thread you keep asking for site, contract and blocker with
   no new facts added." A repeated question gets answered again, plainly, as if first asked. No comment on
   the asker's pattern, ever. Contract rule + a unit test + strip-at-the-boundary if the model does it anyway.
5. The probe gave up on Q1 at ~23 s while the answer landed at 24 s. With 3 fixed that is moot, but the
   web shows the "on it…" line and the step during that window — verify on aheadofmarket.com/dashboard
   (→ corner-convex.vercel.app) that nothing goes blank between step and first sentence.

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 111 + yours, all pass (no `-s`).
- Probe on production after your ONE service restart (contract `r37-1`): all four rows meet the targets
  above; you score the four answers the DBG-4 way (2 points each) and I re-score — ≥ 7/8, no scold.
- No client-facing sends; the bot only answers in the AOM tester's threads. Commit on AOM-EA with scoped
  paths (`scripts/v2-team-bridge.py`, `scripts/test_v2_team_bridge.py`, `scripts/corner-v2-bridge.sh`
  only if needed); never `git add -A`. Report: before/after table, what the slow calls were, contract diff,
  "for the orchestrator", "still off and why".
