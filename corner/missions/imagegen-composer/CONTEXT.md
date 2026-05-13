# Image Gen Composer Icon — Mission Context

**Mission path:** `corner:imagegen-composer`
**What it is:** Left-side composer icon → popover → pick Gemini/Ideogram/OpenAI → next prompt routes to `/api/dashboard/image-gen` → image renders inline as assistant message.
**Status:** IN PROGRESS — code in worktree, env keys set in dev `.env.local`, browser smoke test blocked by pre-existing `GameDashboard.jsx` import break.
**Scaffolded:** 2026-05-13

## Current State (2026-05-13)

- ✅ Picker component + amber chip state — `src/dashboard/components/cv3/shared/ImageGenPicker.jsx`
- ✅ Both input bars wired — `ThreadInputBar.jsx` + `ProjectInputBar.jsx`
- ✅ Shell state + send routing — `ChatPanel.jsx`, `useChatSend.js` (new `runImageGen` helper)
- ✅ Backend route — `api/dashboard/image-gen.js` (handles all three providers via direct fetch, no SDKs)
- ✅ Inline image rendering reuses existing `MessageList.jsx` attachments path (no edit to that file, which has user's uncommitted changes)
- ✅ Dev env keys set — `OPENAI_API_KEY`, `GEMINI_API_KEY`, `IDEOGRAM_API_KEY` in `.env.local`
- ❌ Browser smoke test — blocked by `main.jsx:3` importing missing `./GameDashboard.jsx`
- ❌ Vercel env push — queued
- ❌ Supabase persistence — deferred (R5)

## Worktree

`/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio/.claude/worktrees/imagegen-composer-icon` on branch `worktree-imagegen-composer-icon`. 6 file changes; all parse-clean via esbuild.

## Important caveats

- OpenAI key (`sk-proj-...`) and Ideogram key were pasted in chat transcript. **Rotate both.**
- Image-gen sends bypass `chat-bridge` entirely — agents (EA / Elon) don't see the request or the result. Intentional for v1; revisit if cross-pollination needed (open question in BUILD.md).
- Generated images don't persist past page reload (no Supabase write yet).
