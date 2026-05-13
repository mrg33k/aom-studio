# CV4 Redesign — Mission Context

**Mission path:** `corner:cv4-redesign`
**What it is:** Simplify the cv3 dashboard layout into a cleaner cv4 view. CornerV4.jsx is the active dashboard surface; CornerV3 is being phased out. Iterates as rounds (R1..Rn).
**Status:** IN PROGRESS — last shipped R7.1 (tasks-as-right-drawer, chat centered, blended) on origin/main as of 2026-05-13.

## Active scope (this worktree)

Takeover of three dashboard tasks that were originally scoped to CornerV3 but should land in cv4:

1. **R-CV4-avatar-fix** — fix agent avatar rendering as 2x2 mosaic instead of a single image (CSS background-repeat or img sizing). (was dashboard task 308b311c)
2. **R-CV4-rightclick-outline** — when the right-click context menu is open, apply a subtle outline (1-2px, low-opacity teal) to the targeted message bubble. (was dashboard task 862e2d8f)
3. **R-CV4-login-theme-chips** — three sub-changes:
   - Clean-look login screen redesign.
   - At login time, auto-pick light/dark theme by local time (7am-7pm = light, else dark). No theme toggle on the login screen — nav toggle still works post-login.
   - On task view, remove the three elements above the search bar.
   (was dashboard task b47e9b16)
