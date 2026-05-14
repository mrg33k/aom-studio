# Last conversation — `corner:time-of-day-theme`

## 2026-05-13 — Opened

User asked: login screen feels too bulky; should be small, sleek, clean,
futuristic. Background themed by Arizona time-of-day (light 6:30am–7:30pm,
dark otherwise). Main app should default to the same time-of-day
behavior with a top-nav override.

Decision: scope R1 to the *plumbing* (hook + body data-attr + toggle)
plus the login surface. Defer the full dashboard re-palette to R2 so
this round actually ships in one session.

Tasks: #35 (login + theme), #36 (app-wide theme + nav override).
