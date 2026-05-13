# Image Gen Composer Icon — Last Conversation

**2026-05-12 → 2026-05-13**

Patrik asked what image-gen options are on hand. Recapped Gemini / Ideogram / OpenAI gpt-image (DALL·E 3 retired) / FLUX / Recraft; confirmed locally we have Gemini + Ideogram keys in `~/.config/` and OpenAI via the codex `imagegen` skill (not usable from Vercel routes).

Patrik then `/goal`'d the actual feature: image icon on the LEFT of the composer pill that opens a popover with the three on-hand tools. Chose: target both V3 and V4 (via shared `ChatPanel`), popover-and-chip UX (like mission chip), pinned tool routes the next send to a new `/api/dashboard/image-gen` route.

Shipped R1 (UI + backend) in worktree `imagegen-composer-icon`. Wired R2 env keys to `.env.local` (Patrik pasted the OpenAI key directly in chat — flagged for rotation; copied GEMINI from `.env.prod`; pasted IDEOGRAM directly too).

Patrik then asked whether this lived in a mission, said it should, and goal'd: **all agents always attach work to a mission, before work begins and updated on significant changes.** Mission scaffolded retroactively (this folder). Policy enforcement in master CLAUDE.md is the next move.

**Open follow-ups for Patrik:**
- Rotate OpenAI key + Ideogram key (both in chat transcript).
- Decide if image-gen should cross-post into agent context or stay direct.
- Resolve pre-existing `main.jsx → GameDashboard.jsx` import break before browser test.

Mission path: `corner:imagegen-composer`. Scaffolded 2026-05-13.
