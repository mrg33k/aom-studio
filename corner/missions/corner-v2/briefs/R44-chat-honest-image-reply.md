# Brief R44-chat-honest-image-reply — the driver describes what was actually made, never what was asked for

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R42-chat-cite-only-when-it-matters.md` (the round you extend),
`rounds/R33-chat-images-and-instant.md` §image pipeline (`run_image_pipeline`, `image_plan_for`, provider
`r33-local`), `punch-list.md` rows **C013**, C009. Code: AOM-EA `scripts/v2-team-bridge.py` (HEAD `ff46c20b7`,
contract `r42-1`) + `scripts/test_v2_team_bridge.py` (143/143, plain `python3`, never `-s`). Service: launch
agent `com.aom-ea.corner-v2-bridge` (:3100). Demo bridge: launch agent `com.aom-ea.corner-v2-demo-bridge`
(:3099, pinned). Report: `rounds/R44-chat-honest-image-reply.md`. Production `brilliant-scorpion-163`; never
`neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## What happened on production at 6:00 AM (Wolfpack thread, orchestrator's own send)
Ask: "make an image for the Wolfpack site hero, a plumber at a Phoenix jobsite at sunrise, wide."
Pipeline: step "Generating the image…" → artifact in the Visual Window at 30 s — the picture is the local
brand renderer's typeset study (the prompt set in type on the brand ground; Higgsfield at 0 credits, OpenAI
429). Reply: **"It shows a plumber at a Phoenix jobsite at sunrise in a wide frame. Let me know if you want
it warmer, tighter, or with a different angle."** — a description of the ask, not of the artifact. Patrik
opens the tab and sees text on a navy card. This is the C009 class (a probe artifact reported as fact) and
it is the worst thing the driver can do: confident and wrong about something he can see.

## Build
1. **The reply is generated from the pipeline result, not from the ask.** `run_image_pipeline` returns
   `provider` (`r33-local` | `higgsfield` | `openai` | …) and what it actually rendered; `image_plan_for`
   takes that and the reply says, for the local renderer: "I couldn't reach the image model (no credits),
   so I made a typeset study with the brief on your brand colours — it's in the Visual Window. Add Higgsfield
   credits and I'll render the real hero." For a real provider: describe only what the provider returned
   (prompt echo allowed: "a wide sunrise jobsite scene"), never invent details.
2. **Never describe an artifact the driver has not seen.** Contract rule: content claims about artifacts
   come only from artifact metadata (`meta.provider`, `meta.prompt`, `meta.status`) or from a real
   vision read; otherwise say what was made and where it is. Boundary check: a reply on an image turn
   whose provider is `r33-local` that contains scene words from the prompt ("shows", "plumber", "sunrise")
   without the placeholder disclosure is rewritten to the disclosure. Unit test on the exact reply above.
3. **The artifact title says what it is**: "Image study — <ask>" for the local renderer, "Generated image
   — <ask>" only for a real provider; the Visual Window tab then reads honestly too (title comes from the
   bridge's `createArtifact`/`upgradeArtifact`; no web change).
4. Keep every R37/R40/R42 gate (step ≤ 1.5 s, done ≤ 15 s on Ambition, no scold, cite-once, health honest).

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 143 + yours, all pass.
- ONE production service restart (contract `r44-1`), then: one image ask on the Wolfpack thread as the
  tester (label "R44 walk") — the reply carries the disclosure, the tab title says "Image study", no scene
  claims; plus the four-question probe (`/tmp/r38-dbg.py` → `/tmp/r44-dbg.py` → `/tmp/dbg-run14.json`)
  ≥ 7/8, zero 401s. Restart the demo bridge via `launchctl kickstart -k gui/$(id -u)/com.aom-ea.corner-v2-demo-bridge`.
- No client-facing sends. Commit on AOM-EA with scoped paths; never `git add -A`. Report: the before/after
  reply, contract diff, "for the orchestrator", "still off".
