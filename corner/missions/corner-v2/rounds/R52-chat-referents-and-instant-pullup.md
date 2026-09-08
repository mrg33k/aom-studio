# R52 — chat referents + instant pull-up (done by hand, 2026-09-07 8:45 → 9:05 PM)

Contract `r52-1`, AOM-EA `dbedc4a45`. Both bridges restarted (production :3100, demo :3099);
per-thread floors held, so nothing was re-answered.

## What changed
1. **Referents (C018).** "pull up the video you said glitched", "that one", "the one you mentioned",
   "the cut you talked about" resolve against the project's file rows (`projectFiles:list`, newest
   first) plus the thread's live artifacts, scored by how much of each candidate's title the driver's
   last two messages contain (+0.25 when the ask's kind word matches the candidate, halved when it
   contradicts; bar 0.5). The winner opens by its own fileId/title, never by the person's words.
   Unresolved → the plain search runs on the content words ("video glitched"); nothing anywhere →
   "I couldn't tell which one you mean; the closest I have is X and Y" — never "I don't see a … yet"
   when the driver itself named something.
2. **Instant pull-up (C017).** The reply is the template the moment `/gateway/open` (or openTab)
   lands — no model call. Step label "Opening <title>..." before the open (never blank). One line of
   what it is comes from the ledger (newest row covering ≥ half the title's tokens), never invented.
   The artifact's kind comes from the gateway response (video/photo/pdf) so it opens as its kind.
3. **First sentence = the answer (C021).** The UI-claim gate's fallback is the newest ledger deed with
   its day ("Sep 3 bobby: Deployed GA4 tracking…"), never "Noted -- say the word and I'll start".
   Contract text: for a latest/status ask the first sentence names the newest real deed with its day,
   never a name, greeting, "Noted", or acknowledgement.

## Gates
- Unit: `python3 scripts/test_v2_team_bridge.py` → **229/229** (219 + 10 new R52 tests incl. the
  6:20 PM Ambition pair: driver text naming the Elephante cut → `ELEPHANTE SERVICE REPAIR - CAPTIONS`
  score 0.75, the endcard PNG never wins a "video" ask).
- Live proof, design thread only (`/tmp/r51-walk.py`, e2e account, zero sends on Patrik's threads):
  1. "which brief do we have for Aster right now? name it" → paige: "The one brief we have for Aster is
     aster-brief.pdf, the PDF from this thread." (done_s 14.9)
  2. "pull up the one you mentioned" → `[r52] referent: 'one you mentioned' -> 'aster-brief.pdf'
     score=1.00`, steps "Reading the project notes..." → "Opening aster-brief.pdf...", reply "Opened
     aster-brief.pdf in the Visual Window - …?artifact=t17f93…. It's a PDF from the Aster thread."
     **done_s 3.7** (was 93 s on 2:09 PM's turn).

## Still off
- Ambition's real mp4 pull-up needs the G6 preview transcode (85 MB cut → 502 at upload); the
  referent will resolve to it once the files index carries the edit-sessions mp4 (G5 indexed media;
  verify on the next Patrik walk).
- The ledger line under an opened file depends on the ledger naming the file's title words; the
  backfill sentences mostly do.
