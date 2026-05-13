# Image Gen Composer Icon — Mission Context

**Mission path:** `corner:imagegen-composer`
**What it is:** Left-side composer icon → popover → pick Gemini/Ideogram/OpenAI → next prompt routes to `/api/dashboard/image-gen` → image renders inline as assistant message.
**Status:** LIVE ON PROD — merged in PR #2 (commit `e9e434bc`) on 2026-05-13. Prod smoke confirms Gemini + Ideogram return 200; OpenAI is wired correctly but the API key has `billing_hard_limit_reached` (account issue, not code).
**Scaffolded:** 2026-05-13
**Shipped to prod:** 2026-05-13

## Current State (2026-05-13)

- ✅ Picker component + amber chip state — `src/dashboard/components/cv3/shared/ImageGenPicker.jsx`
- ✅ Both input bars wired — `ThreadInputBar.jsx` + `ProjectInputBar.jsx`
- ✅ Shell state + send routing — `ChatPanel.jsx`, `useChatSend.js` (new `runImageGen` helper)
- ✅ Backend route — `api/dashboard/image-gen.js` (handles all three providers via direct fetch, no SDKs)
- ✅ Inline image rendering reuses existing `MessageList.jsx` attachments path
- ✅ Dev env keys set in `.env.local`
- ✅ Vercel prod env: `GEMINI_API_KEY` (pre-existing), `OPENAI_API_KEY` (added), `IDEOGRAM_API_KEY` (added)
- ✅ Merged to `main` via PR #2, deployed via Vercel
- ✅ Prod smoke (R3.5): `gemini` → 200 + 619KB b64; `ideogram` → 200 + ephemeral URL; `openai` → 502 with provider's `billing_hard_limit_reached` (correct behavior — feature is wired right)
- ⚠️ OpenAI billing limit blocks the OpenAI path until the cap is raised or the account is topped up
- ❌ Supabase persistence — deferred (R5); images live in local React state only
- ❌ Per-tool options UI — deferred (R6)

## Worktree

`.claude/worktrees/imagegen-composer-icon` (branch `worktree-imagegen-composer-icon`, now merged). Local worktree directory retained for follow-up rounds.

## Important caveats

- OpenAI key and Ideogram key were pasted in chat transcript on 2026-05-12. **Rotate both** (still outstanding).
- OpenAI provider returns 502 in prod with `billing_hard_limit_reached`. Either raise the OpenAI account hard limit or accept that the OpenAI tile is dormant for now — the picker still exposes it.
- Image-gen sends bypass `chat-bridge` entirely — agents (EA / Elon) don't see the request or the result. Intentional for v1.
- Generated images don't persist past page reload (no Supabase write yet).
- Endpoint has no auth gate on incoming requests — anyone hitting `/api/dashboard/image-gen` can burn credits. Consistent with other `api/dashboard/*` routes, but worth tightening before scaling usage.
