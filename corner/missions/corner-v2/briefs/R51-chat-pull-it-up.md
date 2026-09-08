# Brief R51-chat-pull-it-up — "pull up X" opens the file in the Visual Window and sends the link; paths never leak

Mission: `corner:corner-v2` (chat lane). Folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`.
Read `LOOP.md`, `rounds/R50-chat-card-first.md` (the round you extend), `rounds/GOAL-walk-1.md` (the walk that
found these misses — Patrik graded 5/8 average), and the gateway round that provides the backend:
`corner/missions/gateway/rounds/G3-cards-tell-the-truth-and-files-open.md` (`projectFiles:search {world, subject, q}`,
`POST /gateway/open {world, subject, fileId}` → `{artifactId, threadId, link}`; the ledger token in
`~/.config/corner/ledger.env` authorises the gateway route — read it in the service the way the KIE key is
read, never print it). Code: `scripts/v2-team-bridge.py` + `scripts/test_v2_team_bridge.py` (plain `python3`).
Report: `rounds/R51-chat-pull-it-up.md`. Never `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## Build
1. **Paths never leak.** Contract: no filesystem paths in any reply (Patrik lives in a shared workspace).
   Boundary: strip/replace anything matching `(/|~/)?[\w.-]+(/[\w.-]+){2,}` or `projects/<slug>/<file>` with
   the file's title ("the Kraken Corps vision doc"). Unit test on the 1:16 PM reply ("…not a shareable link:
   projects/kraken-corps/VISION.md").
2. **Pull it up.** Intents "pull up / open / show me / send me the link to <x>" (and a bare "the <x> doc")
   → `projectFiles:search` for the scope's subject (fall back to the world) → best match → `/gateway/open` →
   the artifact opens in the Visual Window (the tab is the agent's `openTab`) → reply: "Opened <title> in the
   Visual Window — <link>" plus one line of what it is. No match → "I don't see a <x> for <project>; the
   closest I have is <top 2 titles>" — never "no such document exists" when the index has a near match.
   Timing: the open lands within 5 s of the send; the reply carries the link in the same turn.
3. **Files in the pack**: the card's file titles (from R50) are always listed so the driver can answer
   "what files do we have for X" without a search.
4. Keep every R37-R50 gate.

## Gates
- Unit suite = current + yours; ONE production restart (`r51-1`), demo bridge kickstart; proof on the design
  thread ONLY: "pull up the Aster brief" → the PDF tab opens + link in the reply; "pull up the spring deck
  cover" → the KIE image; an unknown name → the near-miss reply; zero paths anywhere. Zero sends on Patrik's
  threads. Commit scoped on AOM-EA. Report: before/after, contract diff, "for the orchestrator", "still off".
