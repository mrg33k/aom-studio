# Brief R33-chat-images-and-instant — pictures from words, instant pickup, no test noise (B3, C006 residual, C009, native run reads)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R31-chat-fast-and-honest.md` (the service you extend; one restart at the end),
`rounds/R27-desktop-composer-parity.md` §"Backend rows" B3 (the web's "Generate an image" contract:
client creates a `photo` artifact with `status:"generating"` via `v2Visual.createArtifact`, opens the
tab, and waits for a `storageId`), `rounds/LEDGER.md` DBG-4, `punch-list.md` rows **C006, C009**
(yours). Report: `rounds/R33-chat-images-and-instant.md`.

You are a headless worker, BUILDER of the chat lane, round six. Nobody will answer questions.

## Patrik's bar (7:15 PM)

"If the agent can't use the visual context window, generate an image based on a description,
understand the project in general, work like we are right here, we have more work to do."

## Build

1. **B3 — an image from a description, end to end.** A user message that arms "Generate an image"
   (web sends `imageTool`; the phone's commands chip does the same) or plainly asks for one ("make me a
   hero image for the spring deck, warm, Phoenix summer") produces a real image: the bridge runs a
   `looking`-free turn whose `step` says "Generating the image…", calls an image provider, uploads
   the bytes to Convex storage (`files:generateUploadUrl` → POST → `storageId`), and upgrades the
   pending `photo` artifact (or creates one) so the tab paints. Provider: whatever this Mac has a key
   for — check `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/.env` NAMES (never print values) and the
   `.agents/skills/higgsfield-generate/SKILL.md` + `~/.claude/skills` for an image skill; OpenAI has no
   credits (429). If no provider has credits, implement the provider seam with a deterministic local
   renderer (a real PNG: the prompt typeset on the project's brand ground with the brand colours from
   FACTS.md) so the pipeline is proven end to end, and name the provider Patrik should fund. Brand
   memory: the pack's FACTS/brand section feeds the prompt (never orange for Ambition, etc.). Stop:
   a `stop` on the run cancels before upload. Backend piece if needed (`v2Images.generate` action or an
   `upgradeArtifact` mutation in `convex/v2Visual.ts`): write it, unit-test it, and the orchestrator
   deploys — say so in the report.
2. **C006 — instant pickup.** DBG-4: first visible block 15-32 s after send. The sweep is the cost.
   Replace polling with a subscription where the backend offers one (Convex `subscribe` over HTTP is
   not available to a script, so: a lightweight `v2Native:threadsWithNewUserBlocks({ since })` query
   indexed by `createdAt` across the workspace, polled every 1.5 s — one call instead of 169), or an
   equivalent; target first agent block ≤ 3 s after send on production, measured in the report on
   Wolfpack and Ambition, and locked in the chat suite's timing test.
3. **C009 — test noise is not a fact.** Artifacts/messages authored by bots, probes, tests
   (`createdBy` bot, titles matching probe patterns, the `example.com` placeholder) never enter the
   "shipped / verified live" reasoning; a site is "live" only when a ledger row or FACTS says so.
4. **Native run reads (R24 ask).** Add `v2Native:runsForThread({ threadId })` (open runs + last done)
   so the phone can show "working" from run state like the web; unit test; orchestrator deploys.

## Gates and hard lines

74+ unit (`python3 scripts/test_v2_team_bridge.py`), chat suite live on production ≥ 9 pass / 1 skip
with the new image test (an armed image request yields a photo tab with bytes), the DBG four
questions rerun and scored. Never `neat-pony-216`; never touch `room-bridge`/`sse-bridge`; one
service restart at the end; no email/Telegram; no `src/`/`ios-native/`; commits scoped (`scripts/`,
`convex/` if needed with tests, mission folder, `e2e/chat.spec.ts`); never push. Report: the image
proof (prompt → PNG → tab screenshot), pickup timing before/after, the DBG score, gates, commits,
"for the orchestrator" (deploy), "for Patrik" (provider to fund; any fact guessed).
