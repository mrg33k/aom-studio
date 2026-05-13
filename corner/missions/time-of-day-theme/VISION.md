# Vision — `corner:time-of-day-theme`

The app should feel like it lives in the same room as the user.
Arizona is on permanent MST (UTC−7, no DST). The dashboard's theme
follows local daylight: light from 6:30am to 7:30pm, dark otherwise.
The user can override the auto behavior from a single top-nav control
and that override sticks.

The login screen is the first surface to inherit this. It should also
feel smaller, sleeker, more futuristic than the current 400px-wide
"Corner." treatment — restrained, single-purpose, with a backdrop
that hints at the time of day.

## Non-goals (this round)

- Re-skinning the existing dark `C` palette into a full light palette
  for the dashboard. That is a separate, larger round (see BUILD.md
  follow-ups). This round ships the *plumbing* — the hook, the
  override toggle, and the data-attr — plus the login surface that
  proves the loop.
