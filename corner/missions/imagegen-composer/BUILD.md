# Image Gen Composer Icon — Mission Build Plan

**Started:** 2026-05-12
**Closed:** 2026-05-13 (DONE — Patrik confirmed)
**Mission path:** `corner:imagegen-composer`

**Paired with this mission's `VISION.md`.** Round-by-round plan, scoped to this mission.

## Rounds

### R1 — UI + backend scaffold (✅ landed in worktree `imagegen-composer-icon`)

**Date:** 2026-05-12

Shipped:
- `src/dashboard/components/cv3/shared/ImageGenPicker.jsx` — left-side icon button + popover (Gemini / Ideogram / OpenAI) + amber chip when a tool is pinned. Click-outside dismisses popover. Hard-codes only the tools with keys on hand.
- `src/dashboard/components/cv3/thread/ThreadInputBar.jsx` — picker rendered inside the pill on the left, before the `<input>`. Left padding 16→8px. Pill border turns amber when a tool is pinned. Placeholder swaps to *"Describe the image to generate…"*.
- `src/dashboard/components/cv3/project-chat/ProjectInputBar.jsx` — same treatment as thread bar.
- `src/dashboard/components/cv3/ChatPanel.jsx` — `selectedImageTool` state at shell, threaded into `useChatSend` and exposed via `sendValue` so both bars consume the same source of truth. Both V3 and V4 pick it up since they share `ChatPanel`.
- `src/dashboard/components/cv3/chat/useChatSend.js` — new `runImageGen` helper. `handleSend` (agent chat) and `sendProjectText` (project chat) short-circuit to it when a tool is pinned. Skips chat-bridge entirely. Returned image lands as an assistant message with `attachments: [{ url, mime: 'image/png' }]` so the existing inline image renderer in `MessageList.jsx:783–822` displays it without touching that file.
- `api/dashboard/image-gen.js` — POST route. Branches on `tool` ∈ `{openai, gemini, ideogram}`, calls each provider directly via fetch (no SDK deps), returns `{ url?, b64?, tool, prompt }`. Uses `OPENAI_API_KEY` / `GEMINI_API_KEY` / `IDEOGRAM_API_KEY` from env.

All six files parse cleanly via `esbuild --loader:.jsx=jsx`.

**Status:** code in worktree, awaiting merge.

### R2 — Env wiring (✅ done 2026-05-13)

- `OPENAI_API_KEY`, `GEMINI_API_KEY`, `IDEOGRAM_API_KEY` appended to `/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio/.env.local` (dev only).
- GEMINI value copied from existing `.env.prod`; OpenAI and Ideogram pasted by user.
- ⚠️ OpenAI and Ideogram keys were pasted in chat — Patrik to rotate both.
- Prod (Vercel) env push still pending.

**Status:** dev keys set; prod env push outstanding.

### R3 — Browser smoke test (skipped 2026-05-13; replaced by R3.5 prod smoke)

Revised by background agent driving `/goal Image Generation - Make image generation live on prod`. Two reasons local browser smoke was a poor ROI:

1. **The "blocker" was a false alarm.** `dashboard.html` → `src/dashboard/main.jsx` → missing `GameDashboard.jsx` is real, but `dashboard.html` is NOT in `vite.config.js` rollup inputs (lines 2684–2692) and `vercel.json` rewrites `/dashboard` → `/index.html`. The orphan affects `/dashboard.html` only — `npm run dev` is up on :5173 right now and `/dashboard` (index.html → src/main.jsx → CornerV3) returns 200.
2. **Local dev does not exercise the API.** `vite.config.js` has no middleware for `/api/dashboard/image-gen`. Vercel serverless functions only run under `vercel dev` or production. A local browser test would verify picker UI only, not the generate roundtrip — and the UI is small enough to read.

**Replaced by R3.5:** prod smoke — curl `/api/dashboard/image-gen` on prod after deploy with each of `gemini`, `openai`, `ideogram` and confirm 200 + image payload.

### R4 — Vercel env push (✅ done 2026-05-13)

`GEMINI_API_KEY` already in prod (added 42 days ago, confirmed via `vercel env ls production`). Pushed the missing two:

```bash
vercel env add OPENAI_API_KEY production
vercel env add IDEOGRAM_API_KEY production
```

**Status:** done.

### R4.5 — Merge & deploy (✅ done 2026-05-13)

- Rebased worktree branch onto current `origin/main` (clean rebase, conflict surfaces on `useChatSend.js` from `3cd24dc` didn't actually overlap with image-gen branches).
- Opened PR #2 → Vercel preview built green → merged via `gh pr merge --merge` (commit `e9e434bc`). Auto-redeploy to production succeeded (`https://aom-studio-2axy0el2w-aheads-projects-d2a4c70f.vercel.app` → Ready in ~41s).
- Local cleanup of feature branch deferred — `gh pr merge --delete-branch` errored because main is checked out in the parent worktree path; remote branch still on origin. Non-blocking.

### R3.5 — Prod smoke (✅ done 2026-05-13)

`curl -X POST https://www.aheadofmarket.com/api/dashboard/image-gen` with `{"prompt": "a single red square on white"}`:

| tool      | result | notes                                                                 |
|-----------|--------|-----------------------------------------------------------------------|
| gemini    | ✅ 200  | 619676-byte b64 payload                                               |
| ideogram  | ✅ 200  | ephemeral URL (`https://ideogram.ai/api/images/ephemeral/…`)         |
| openai    | ❌ 502  | provider returned `billing_hard_limit_reached` — endpoint mapping correct, account issue |

OpenAI billing block was confirmed against `api.openai.com/v1/images/generations` directly with the same key — same error. Action: raise OpenAI hard limit (Patrik) or accept the OpenAI tile is dormant for now.

**Status:** done. Feature is live on prod for Gemini + Ideogram; OpenAI dormant until billing fix.

### R5 — Persistence (deferred)

Generated images currently live in local React state only. Reload loses them. Mirror the optimistic-message → `bridgeResult.messageId` pattern in `useChatSend.js:209` to write the assistant message + attachment URL to Supabase. Likely involves a new event type or extending chat-bridge to accept image-gen results.

**Status:** deferred; not blocking v1.

### R6 — Per-tool options (deferred)

Add a small "⚙" next to the chip exposing size / quality / aspect ratio / transparent bg / style refs per provider. Defaults are fine for v1.

**Status:** deferred; not blocking v1.

### R7 — Mission policy written into agent instructions (✅ done 2026-05-13)

Triggered by Patrik's observation that this work shipped without a mission attached — exactly the drift problem missions are supposed to prevent, made worse because this is a background-agent session.

Landed:
- `aom-studio/CLAUDE.md` (new) — repo-level rule. "Missions are mandatory" with before/during checklist + extra-strictness clause for background agents.
- `~/Library/Application Support/aom-ea/rag-mirror/CLAUDE.md` — new section "Corner Missions (Mandatory Attachment)" before the existing "Active Missions (Compaction-Safe)" section, with the same background-agent escalation.
- `~/.claude/projects/-Users-aom-inhouse/memory/missions-mandatory.md` — feedback memory so future Claude Code sessions load the rule. Indexed in MEMORY.md.

Background-agent rule (strict form, codified in all three): state mission path in first message → write stub `BUILD.md` round entry before first code edit → update BUILD.md on every significant transition → append to `last-conversation.md` before returning `result:` → name worktree after mission slug → if no mission knowable, `needs input:` and stop, do not fabricate.

This mission was created retroactively (R1 + R2 shipped before the mission existed). Going forward, that retro pattern is the failure mode the rule is designed to prevent.

**Status:** policy lives in the three files above; effective on next agent read.

---

## Open questions

- Should image-gen results be cross-posted into agent context (so the EA can reference an image the user just generated)? Currently the bridge isn't invoked at all on the image path.
- Vector output (Recraft) is the obvious next provider to add — but no key on hand. Decide later if/when sourced.
