# Brief R47-chat-kie-images — KIE.ai is the image generator, now and forever

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R46-chat-say-it-once.md` (the round you extend), `rounds/R33-chat-images-and-instant.md`
§image pipeline, `rounds/R44-chat-honest-image-reply.md`, and the KIE skill: `.agents/skills/kie/SKILL.md`,
`.agents/skills/kie/PIPELINE.md`, `.agents/skills/kie/pipeline/kie.py` (`Job`, `submit(job) → (taskId,
family)`, `poll(taskId, family) → [urls]`, env `KIE_API_KEY`, base `https://api.kie.ai`, default model
`nano-banana-pro`). Code: AOM-EA `scripts/v2-team-bridge.py` (contract `r46-1`) +
`scripts/test_v2_team_bridge.py` (161/161, plain `python3`, never `-s`). Service: launch agent
`com.aom-ea.corner-v2-bridge` (:3100, wrapper `scripts/corner-v2-bridge.sh` sources
`corner/state/corner-v2-bridge.env`). Demo bridge: launch agent `com.aom-ea.corner-v2-demo-bridge` (:3099,
Paige on the e2e account's Aster / Spring launch deck thread `vd7f0v4dn3kjjx9qnt9acryemn8dyr95`). Report:
`rounds/R47-chat-kie-images.md`. Never `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## Patrik, 7:40 AM: "we use KIE.ai for image gen now and forever."
Today the image turn tries Higgsfield (0 credits) and OpenAI (429) and falls back to a local typeset
"study". That fallback is not a product. The KIE key lives in `~/.config/kie-api-key.env` (0600; the
orchestrator verified it against `/api/v1/chat/credit`). Never print it, never commit it, never log it.

## Build
1. **KIE is the only provider.** `run_image_pipeline` submits through the skill's `kie.py` (import it by path,
   do not copy it): `Job(prompt=…, model="nano-banana-pro", …)` with the brand's art direction folded in and
   the skill's standing negatives ("no text, no lettering, no logos, no watermarks" — type and logos are
   composited afterwards, never generated); `poll` with a 120 s budget; download the first URL; upload
   through `files:generateUploadUrl`; `createArtifact`/`upgradeArtifact` with `meta.provider: "kie"`,
   `meta.model`, `meta.taskId`, `meta.prompt`; title "Generated image — <ask>". Delete the Higgsfield and
   OpenAI paths and their tests; the local renderer survives ONLY as the failure card ("KIE didn't answer
   in time / KIE error: <plain reason>") titled "Image failed — <ask>", with the disclosure in the reply —
   never called a study, never presented as the result.
2. **The turn stays honest and alive while KIE works.** Step "Generating with KIE…" at once; a progress
   line every 20 s ("still rendering, 40 s"); the reply describes only what KIE returned (the prompt echo
   is allowed, invented scene details are not — R44 rule stands).
3. **Wire the key into the service** without exposing it: the wrapper `scripts/corner-v2-bridge.sh` also
   sources `~/.config/kie-api-key.env` if present (`set -a`), the demo bridge plist gets the same via its
   own wrapper or `EnvironmentVariables` read from that file — NOT a literal value in the plist. `/health`
   reports `imageProvider: "kie"` and whether the key is present (boolean only).
4. **Unit tests** with a fake `kie` module: submit → poll → upload → artifact; timeout → failure card;
   KIE error → failure card; prompt carries the negatives and never the brand's logo/type instructions.

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 161 − removed + yours, all pass.
- ONE production service restart (contract `r47-1`), demo bridge restarted after; then ONE real image ask on
  the design thread as the e2e account (label "R47 walk"): "Generating with KIE…" step, a real KIE image in
  the Visual Window (PNG/JPG from KIE, not the renderer), `meta.provider: kie`, honest reply, done in
  ≤ 120 s. Zero sends on Patrik's Wolfpack/Ambition threads. Report the KIE model, task id, elapsed time,
  and the PNG in `rounds/evidence/R47-kie-image.png`.
- Commit on AOM-EA with scoped paths (`scripts/v2-team-bridge.py`, `scripts/test_v2_team_bridge.py`,
  `scripts/corner-v2-bridge.sh`, the demo plist wrapper if you add one); never `git add -A`; never commit or
  print a key. Report: before/after, contract diff, "for the orchestrator", "still off".
