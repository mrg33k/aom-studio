# Brief R46-chat-say-it-once — one disclosure, not two bubbles saying the same thing

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R45-chat-armed-title-and-hedge-once.md` (the round you extend),
`rounds/R44-chat-honest-image-reply.md` §2, `punch-list.md` row **C014**. Code: AOM-EA
`scripts/v2-team-bridge.py` (contract `r45-1`) + `scripts/test_v2_team_bridge.py` (154/154, plain `python3`,
never `-s`). Service: launch agent `com.aom-ea.corner-v2-bridge` (:3100). Demo bridge: launch agent
`com.aom-ea.corner-v2-demo-bridge` (:3099, Paige on the e2e account's Aster / Spring launch deck thread
`vd7f0v4dn3kjjx9qnt9acryemn8dyr95`). Report: `rounds/R46-chat-say-it-once.md`. Never `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## What the orchestrator saw at 7:20 AM on the design thread (`/tmp/img2-walk-45s.png`)
Image ask → two consecutive Paige blocks:
> "I couldn't reach the image model (no credits), so I made a typeset study with the brief on your brand
> colours. It's in the Visual Window. Add Higgsfield credits and I'll render the real hero."
> "What I made instead is a typeset study, the brief set in type on your brand colours, and it is open in
> the Visual Window. Higgsfield credits would let me render the actual cover shot."
Same content, two bubbles. Patrik reads that as a stutter.

## Build
1. **Say it once.** The image turn's plan carries ONE message block for the disclosure; if the model's
   text yields a second block whose content overlaps the first (same facts: no credits / typeset study /
   Visual Window / credits), the boundary keeps the first and drops the second. General rule for every
   turn: consecutive agent text blocks must each add something — a near-duplicate (≥ 0.6 token overlap after
   normalisation) is dropped. Unit test on the two sentences above and on a legit two-block answer that
   must survive (fact + next step).
2. **Verify on the design thread only** (e2e account, demo bridge): one image ask → exactly one disclosure
   block + at most one sentence that adds the next step. No sends on Patrik's Wolfpack/Ambition threads
   this round — the probe stays off (chat lane is parked for litter).
3. Keep every R37-R45 gate. ONE production service restart (contract `r46-1`) — required only because the
   same script serves production; then restart the demo bridge with
   `launchctl kickstart -k gui/$(id -u)/com.aom-ea.corner-v2-demo-bridge` and run the design-thread proof.

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 154 + yours, all pass; health `ok`/`r46-1`/`failedTicks 0`
  after the restart; design-thread proof PNG + the two block texts in the report.
- Commit on AOM-EA with scoped paths; never `git add -A`. Report: before/after, contract diff, "for the
  orchestrator", "still off".
