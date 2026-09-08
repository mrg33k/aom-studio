# Brief R52-chat-referents-and-instant-pullup — "pull up the video you said glitched" opens that video, instantly

Mission: `corner:corner-v2` (chat lane). Folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`.
Read `LOOP.md`, `rounds/R51-chat-pull-it-up.md` (the round you extend), `punch-list.md` rows C017, C018,
`rounds/GOAL-walk-2.md`. Backend after G5: `projectFiles:search` indexes media deliverables (mp4/mov/png/jpg/pdf)
with titles; `/gateway/open` uploads and returns `{artifactId, threadId, link}`. Code: `scripts/v2-team-bridge.py`
+ tests (plain `python3`). Report: `rounds/R52-chat-referents-and-instant-pullup.md`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## What Patrik saw (6:19-6:20 PM, Ambition)
"what about the kinetic caption jobs we did?" → a good ledger-first answer naming the Elephante pt 2 cut and the
Sep 5 glitch. Then "just pull up the video you said glitched" → "I don't see a video you said glitched for
Ambition Mechanical yet." The driver had just named the video; it must resolve the reference.

## Build
1. **Referents.** "the video you said glitched", "that one", "it", "the cut you mentioned", "that deck" resolve
   to the most recent file/artifact the DRIVER named in this thread (its own last two messages first, then the
   card's files); search with that title, not the user's words. Unit tests on the 6:20 PM pair.
2. **Instant pull-up.** The moment `/gateway/open` returns, post the reply template ("Opened <title> in the
   Visual Window — <link>") as the turn's message — no model call for that turn (C017: the 93 s reply and the
   blank step). Step label = "Opening <title>…", never empty.
3. **Video/photo artifacts** open as their kind (video tab with the player; image tab); the reply adds one line
   of what it is (from the card/ledger), never invented content.
4. **No match** → name the two closest titles; never "I don't see a <x> yet" when the driver itself named one.

## Gates
- Unit suite green; ONE production restart (`r52-1`), demo bridge kickstart; proof on the design thread ONLY:
  driver names the Aster brief → "pull up the one you mentioned" opens the PDF with the link in < 5 s; zero
  sends on Patrik's threads. Commit scoped on AOM-EA. Report: before/after, contract diff, "still off".
5. **The first sentence is the answer (C021).** Never a canned "Noted — say the word and I'll start." as the
   streamed first sentence; for "what's the latest" the first sentence names the newest real deed with its day
   ("On Sep 3 GA4 tracking went live on both sites with custom events."). Unit test on the 7:09 PM reply.

