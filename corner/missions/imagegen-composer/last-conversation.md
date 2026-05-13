# Image Gen Composer Icon — Last Conversation

**2026-05-12 → 2026-05-13**

Patrik asked what image-gen options are on hand. Recapped Gemini / Ideogram / OpenAI gpt-image (DALL·E 3 retired) / FLUX / Recraft; confirmed locally we have Gemini + Ideogram keys in `~/.config/` and OpenAI via the codex `imagegen` skill (not usable from Vercel routes).

Patrik then `/goal`'d the actual feature: image icon on the LEFT of the composer pill that opens a popover with the three on-hand tools. Chose: target both V3 and V4 (via shared `ChatPanel`), popover-and-chip UX (like mission chip), pinned tool routes the next send to a new `/api/dashboard/image-gen` route.

Shipped R1 (UI + backend) in worktree `imagegen-composer-icon`. Wired R2 env keys to `.env.local` (Patrik pasted the OpenAI key directly in chat — flagged for rotation; copied GEMINI from `.env.prod`; pasted IDEOGRAM directly too).

Patrik then asked whether this lived in a mission, said it should, and goal'd: **all agents always attach work to a mission, before work begins and updated on significant changes.** Mission scaffolded retroactively (this folder). Policy enforcement in master CLAUDE.md is the next move.

**Open follow-ups for Patrik:**
- Rotate OpenAI key + Ideogram key (both in chat transcript).
- Decide if image-gen should cross-post into agent context or stay direct.
- Resolve pre-existing `main.jsx → GameDashboard.jsx` import break (orphan file; delete `dashboard.html` + `src/dashboard/main.jsx` is the cleanest fix).

Mission path: `corner:imagegen-composer`. Scaffolded 2026-05-13.

---

**2026-05-13 (afternoon — background agent driving `/goal` "Make image generation live on prod")**

Picked up the mission from the BUILD.md ledger. Plan was R3 (local smoke) → R4 (env push) → merge → deploy. Re-read the codebase and the "blocker" — discovered `dashboard.html` isn't in `vite.config.js` rollup inputs and `vercel.json` rewrites `/dashboard` → `/index.html`, so the GameDashboard.jsx orphan only affects the unused `/dashboard.html` route. `npm run dev` was running fine on :5173. Also noticed `vite.config.js` has no local middleware for `/api/dashboard/image-gen`, so local browser smoke would only exercise picker UI — not the actual generate roundtrip. Skipped R3, defined R3.5 (prod smoke instead).

R4 (env push): `GEMINI_API_KEY` already in prod (added 42d ago). Added `OPENAI_API_KEY` and `IDEOGRAM_API_KEY` to Vercel production via `vercel env add`.

Rebase + merge: rebased onto current `origin/main` (no conflicts — `useChatSend.js` overlap with the recent `R-CV4-5` commit `3cd24dc` didn't actually collide). Opened PR #2 — Vercel preview built green — merged. Direct push to main was blocked by the auto classifier, which forced the PR path (good — paper trail). Merge commit `e9e434bc`. Vercel auto-deployed to prod in ~41s.

R3.5 prod smoke: Gemini ✅ 200 + 619KB b64. Ideogram ✅ 200 + ephemeral URL. OpenAI ❌ 502 — confirmed against `api.openai.com` directly with the same key: `billing_hard_limit_reached`. The endpoint mapping is correct; the OpenAI account is over its cap.

**Net:** image gen is live on prod. Two of three providers fully functional end-to-end. OpenAI is wired correctly and just needs the billing limit raised (or the account topped up) to come online.

**Open follow-ups (new this round):**
- Raise OpenAI hard limit so the OpenAI tile in the picker works.
- Tidy: delete dead `dashboard.html` + `src/dashboard/main.jsx` orphan (not blocking).
- Tighten: `/api/dashboard/image-gen` has no caller-auth gate. Same as other `api/dashboard/*` routes but worth a future round.

**Mission closed 2026-05-13** — Patrik replied "complete this project this is complete" after the prod smoke confirmed Gemini + Ideogram healthy. Status flipped IN PROGRESS → DONE in `CONTEXT.md`. Follow-ups above are tracked but do not reopen the mission; they belong to a future round or a different mission (e.g., a future `corner:api-hardening` for the auth-gate item).
