# Brief R31-chat-fast-and-honest — first sentence in 20 s, never a promise, attachments read, own runs never "news" (C004, C005, C006, C007, C008 seed)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R29-chat-grounding.md` (pack v2 + `r21-2`, the service you extend and restart
once at the end), `rounds/LEDGER.md` rows DBG-1 and DBG-2 (the scores), `punch-list.md` rows
**C004, C005, C006, C007, C008** (yours). Report: `rounds/R31-chat-fast-and-honest.md`.

You are a headless worker, BUILDER of the chat lane, round five. Nobody will answer questions.

## Build

1. **C006 — fast and visible.** Measure a turn end to end on Wolfpack (pack build, adapter startup,
   model time, block writes) and print the split. Then: emit the first `step` ("Reading the project
   notes…") within 2 s of picking up the block, BEFORE the brain runs; stream the reply into the
   `message` block as sentences arrive (Claude via `claude -p --output-format stream-json` or the
   Muse streaming seam; if neither streams, write the first sentence as its own block within 20 s and
   append); driver backend per project from `R20_DRIVERS_JSON`/`R21_BACKENDS_JSON` — make the
   default driver the FASTER first-sentence backend by measurement (report both), keep cost visible.
   Target: first visible agent block ≤ 3 s, first sentence ≤ 20 s, done ≤ 45 s. Add these as
   assertions in `e2e/chat.spec.ts` (live mode) with generous but real limits.
2. **C005 — a turn never ends on a promise.** Contract `r21-3`: "I will … now / next / report back"
   is banned as a closing line. If the brain needs to read something it says so in a `step` and
   the bridge runs a second pass with the thing read (attachments, a file, the ledger) — max 3
   passes per turn, all inside one run. Gate + retry + unit test with a fake brain that promises.
3. **C007 — attachments in the pack.** For messages in the thread window with files
   (`payload.files`, artifacts on the thread), pull text/markdown/pdf content (first ~4k chars
   each, newest first; `pdftotext` or pdf.js is fine) into a section "(g) attached files". Prove
   with Ambition's `brand-guidelines.md`: the reply must quote the colours and rules.
4. **C004 — own runs are not news.** The service's run bookkeeping goes to the ledger with
   `kind: "run"` (or not at all) and is excluded from "latest"; every existing "Started/Finished a
   corner-v2-chat run" row is filtered out of the pack. Prove on Wolfpack: "latest" never mentions
   chat runs.
5. **C008 seed — facts the files do not have.** Create `corner/users/aom/projects/wolfpack/FACTS.md`
   and `corner/users/aom/projects/ambition/FACTS.md` (find the right folder names under
   `corner/users/aom/projects/`) from
   `/Users/aom-inhouse/.claude/projects/-Users-aom-inhouse-aom-studio-transfer-AOM-EA/memory/`
   (the `project_wolfpack_*`, `project_ambition_*`, `feedback_wolfpack_*`, `feedback_ambition_*`
   files: site live 2026-09-03, GA urgent, contract signed (never re-ask), lead attribution, weekly
   update format, video kit navy #1B2A4A + red #C41E3A never orange, ships 1350×1080, footage on
   Google Drive `Client/AMBITION MECH SERVICES/<Month>`, Google Ads consultant, Jobber revenue line,
   full social management since 2026-08-28 …). Dated lines, one fact per line, sources named. The
   pack reads FACTS.md first in section (a). Then rerun the four DBG questions yourself (tester
   creds `/tmp/corner-v2-aom-tester.env`, never in a report; the Playwright script pattern is in the
   DBG-1 row) and score them in the report against FACTS.md.

## Hard lines

Never `neat-pony-216`; never touch `room-bridge`/`sse-bridge`; one service restart at the end;
no email/Telegram; no `src/`/`ios-native/`; commits scoped (`scripts/`, the two FACTS.md, the
mission folder; web worktree `e2e/chat.spec.ts`); never push. Report: the timing split before/after,
the DBG rerun transcript with scores, the four gates, commits, "for Patrik" (which facts you were not
sure about — list them for him to confirm, never guess a client fact).
