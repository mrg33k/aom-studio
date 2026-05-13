# CV4 Redesign — Last Conversation

## 2026-05-13 — bg takeover of three dashboard tasks

User `/goal`-ed: get the three active dashboard tasks, see if their workers know to work in cv4, and if not, cancel them and take them on directly, landing in cv4 on origin/main as a new branch.

All three tasks (308b311c avatar 4-square, 862e2d8f right-click outline, b47e9b16 login+theme+chips) referenced CornerV3 in their text and meta_repo was `corner` (legacy). Workers had no cv4 awareness. Dismissed all three via `/api/dashboard/task-action` `dismiss` action, then mid-session the user confirmed "the /dashboard slug is now supposed to be Cv4" — so the `/dashboard` route now mounts `CornerV4`.

While inspecting, a worker for 308b311c shipped the avatar fix to origin/main (`114488a`). Rebased onto that and implemented the remaining two:

- Right-click outline on message bubbles in `MessageList.jsx` (used by both V3 and CV4 chat).
- Login auto-theme seed (`localStorage.theme` set by time of day, gated on a user-override flag).
- Route swap so `/dashboard` → `CornerV4`. `/dashboard/cv3` and `/dashboard/v2` still reach the old CornerV3.

The "three chips above task search" requirement is already satisfied in `TasksPanelCv4.jsx` — the search input is the top of the scrollable content, no elements above it.

Pushed as `worktree-cv4-three-task-takeover` to origin.
