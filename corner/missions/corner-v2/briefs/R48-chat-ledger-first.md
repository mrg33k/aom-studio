# Brief R48-chat-ledger-first — the dashboard brains read the organization ledger first, and stop writing noise into it

Mission: `corner:corner-v2` (chat lane) — serves `corner:ledger`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R47-chat-kie-images.md` (the round you extend), `corner/missions/ledger/VISION.md`
+ `BUILD.md` (the ledger's own mission — its hard rules apply), `convex/ledger.ts` in
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration` (`ledger:latest {world, subject?, limit}`,
`ledger:append`), `convex/v2Visual.ts` `ledgerDid` (writes into the SAME `ledger` table). Code: AOM-EA
`scripts/v2-team-bridge.py` (contract `r47-1`) + `scripts/test_v2_team_bridge.py` (164/164, plain `python3`,
never `-s`). Report: `rounds/R48-chat-ledger-first.md`. Never `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane AND the small backend edits this needs. Nobody will
answer questions.

## Patrik, 10:30 AM (his words, condensed)
"Agents are not aware of our ledger… the JSON append ledger we created the other day to keep track of all
activity. The agents in the dashboard should understand exactly what the last thing that happened with any
project is. If this is not fully working then everything else breaks."

## What the orchestrator measured
`ledger:latest` on production: 200 items since Sep 3; 196 are noise written from the dashboard side —
`bridge` "Started/Finished a corner-v2-chat run" on every turn (`v2Ledger:append` → same table) and
`ledgerDid` "Opened/Closed/Pinned … in the Visual Window". The chat pack reads `v2Ledger:latest` (run
noise) and never `ledger:latest`. Result: "From the ledger there are no new entries" — true and useless.

## Build
1. **Stop the noise writers.** Bridge: no ledger item for run start/finish; the ONLY items a turn may
   append are real events — made an artifact ("Made the Wolfpack hero image with KIE"), decided, asked
   Patrik something, sent something. Backend `v2Visual.ledgerDid`: keep "Added/Updated <artifact>" (real
   work), delete the open/close/pin writes. `v2Visual` event type "ledger" stays (it is the driver's own
   deliberate item). Unit tests for the bridge; a convex-test for the backend.
2. **Readers ignore old noise.** A shared `isLedgerNoise(what)` (backend, exported and mirrored in the
   bridge) matches /^(Started|Finished) a corner-v2-chat run/ and /^(Opened|Closed|Pinned) .* (in the
   Visual Window|on )/; `ledger:latest` filters them server-side (append-only stays intact — nothing is
   deleted). Test with the real 200-row shape.
3. **Ledger first in the pack.** `context_pack` reads `ledger:latest {world, subject: <project slug>,
   limit: 15}` (plus the mission slug when the thread has one) and puts it at the TOP of the pack as
   "WHAT HAPPENED LAST (ledger, newest first, with who and when)"; `v2Ledger:latest` leaves the pack. The
   contract: answer "what's the latest" from the ledger items first, in time order, naming the day
   ("Yesterday Cleo cut the three Ambition clips…"); the thread and the notes come after. When the ledger
   has nothing for the project in 14 days, say so once, plainly ("Nothing has been logged for Wolfpack
   since Aug 28."), and never call the run log "the ledger".
4. **Health**: `/health` reports `ledgerReads` (count) and `ledgerLastItemAt` per pack.

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 164 + yours; vitest tests/v2 green; `npx tsc --noEmit` clean.
- Backend deploy: you have no deploy key — commit the convex change on `corner-v2-integration` (scoped) and
  write the exact deploy line in "for the orchestrator"; the orchestrator deploys.
- ONE production service restart (contract `r48-1`) after the orchestrator's deploy is NOT possible for you
  to sequence — so restart on your commit anyway (the bridge tolerates the old backend: if `ledger:latest`
  lacks the filter, the bridge's mirror filters), then ONE labelled question on the design thread as the e2e
  account ("R48 walk: what's the latest on this project?") — the answer names the newest real ledger item.
  Zero sends on Patrik's Wolfpack/Ambition threads.
- Commit on AOM-EA with scoped paths; never `git add -A`. Report: before/after pack head, the noise
  counts, contract diff, "for the orchestrator" (deploy line), "still off".
