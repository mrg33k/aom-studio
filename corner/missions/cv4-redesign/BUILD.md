# CV4 Redesign — BUILD log

### R-CV4-takeover — three dashboard tasks routed to cv4

Background takeover: three dashboard tasks (308b311c, 862e2d8f, b47e9b16) were queued at workers that target the `corner` repo / CornerV3 component. Cancelled them via dashboard dismiss action and reimplemented in CornerV4 + cv4 surfaces.

**Files touched**

- `src/main.jsx` — `/dashboard` (and `:project*` variants) now mount `CornerV4` instead of `CornerV3`. `CornerV3` kept reachable at `/dashboard/cv3` and `/dashboard/v2` as a fallback. CV4 is the dashboard.
- `src/dashboard/components/cv3/thread/MessageList.jsx` — when the right-click / long-press context menu is open, the targeted message bubble (user or assistant) renders a 1.5px teal outline (`rgba(52,211,153,0.55)`) with a small `outlineOffset`. `data-menu-target` is on the bubble div for testability. Both bubble branches preserve their normal styling otherwise.
- `src/pages/Login.jsx` — at successful sign-in, seeds `localStorage.theme` to `light` (07:00–18:59 local) or `dark` (otherwise), unless `localStorage.themeUserSet === '1'` is present. No theme toggle is rendered on the login screen. The dashboard reads `localStorage.theme` when/if a switcher lands; the in-app nav toggle (when added) must `localStorage.setItem('themeUserSet','1')` so it sticks.
- `corner/missions/cv4-redesign/*` — mission scaffold added (CONTEXT, VISION, BUILD, RESEARCH, last-conversation, research/).

**Per-task notes**

- **308b311c (avatar 4-square):** already landed on origin/main as `114488a fix(corner:launch-mvp): agent avatar image renders as 4-square mosaic`. Worker shipped while we were inspecting; the dashboard row was dismissed after the merge so it shows as cancelled in the queue but the fix is on main. Rebased the takeover branch onto that commit.
- **862e2d8f (right-click context-menu outline):** implemented as described above in `MessageList.jsx`.
- **b47e9b16 (login + auto theme + remove 3 chips):**
  - Part 1 (login redesign): kept the existing animated-mesh, single-`Corner.` logo, two clean fields, "Invite only" footer layout — already a "clean look" with no decorative chrome to strip. No invented design.
  - Part 2 (auto theme by time of day): seed on sign-in only, respects user override flag.
  - Part 3 (remove three elements above task search): the CV4 task panel (`TasksPanelCv4.jsx`) already places the search input at the top of the scrollable content with nothing above it. Verified via live DOM inspection on prod — no elements stack above the search input. Nothing to remove.

**Status:** done — committed on `worktree-cv4-three-task-takeover`, pushed as a new branch off `origin/main`.
