# Image Gen Composer Icon — Mission Vision

**Source of truth for this mission.** Inherits from `Corner` but scoped to the work this mission carries.

**Mission path:** `corner:imagegen-composer`
**Paired with this mission's `BUILD.md`.** VISION = what/why, BUILD = how/when.

---

## What this mission IS

A left-side icon on the chat composer that lets the user generate images from the dashboard without leaving the bar. Click the icon → popover with the three image-gen tools we have keys for (Gemini, Ideogram, OpenAI gpt-image-1.5) → pick one → it pins as an amber chip in the bar → next prompt sent routes to that provider via `/api/dashboard/image-gen` → result lands inline in the thread as an assistant message with an attached image.

## North star

Generating an image from a Corner chat takes one click and one prompt — same friction as sending a message.

## Pillars

1. **Composer-native** — lives inside the existing pill, on the LEFT of the input. No modal, no new page. Reuses the mission-chip visual pattern so it feels like the rest of CV4.
2. **One-click tool pick** — popover with the tools we *actually have keys for*. No greyed-out aspirational options.
3. **Result is a normal message** — the generated image renders via the existing `<attachments>` path in `MessageList.jsx`, so no special viewer.
4. **Works in V3 and V4** — both Corners share `ChatPanel`, so the same wiring lights up both surfaces.

## Out of scope (for v1)

- Per-tool options UI (size, quality, transparency, aspect ratio, style refs). Defaults to 1:1, standard quality across providers.
- Persistence to Supabase chat history. Generated images live in local React state; reload loses them.
- Routing image-gen through the SSE bridge / agent reply path. The bypass is intentional — image gen is direct, not agent-mediated.
- Recraft, FLUX, Replicate, fal.ai — only three tools have keys on hand.

## Change log

- **2026-05-13** — Mission scaffolded retroactively after R1 (UI + backend) shipped to worktree. Inherits parent: Corner.
