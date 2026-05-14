# Context — `corner:time-of-day-theme`

**Status:** NEW

Opened 2026-05-13 in the cv4-r5-cv3-replica-reset worktree, immediately
after the R7.21 cutover (CV4 became canonical at `/dashboard`).

The dashboard currently has one dark palette (`src/dashboard/lib/cv3Colors.js`).
Every CV4/CV3 component pulls colors from `C` directly. Login.jsx
hardcodes `#040810` for its background.

Files touched in this round:
- `src/dashboard/hooks/useThemeMode.js` (new) — Arizona time-of-day +
  override-aware hook.
- `src/pages/Login.jsx` — redesign + light/dark variants.
- `src/dashboard/cv4/ContextNav.jsx` — add theme toggle button.

The mission `corner:files-in-app` is the next round (task #34) and is
independent of this one.
