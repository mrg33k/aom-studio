# Decision record — WorkersShell.jsx (Background work window, corner:one-corner M19)

## agent

Rex.

## artifact

`src/dashboard/cv6next/WorkersShell.jsx` plus its entry points (ChatDesktop rail
pin, DesktopNav top-bar icon, SharedNav mobile drawer row) and
`api/dashboard/dismiss-followup.js`. Shipped in aom-studio e409d7a9 + 5656ea72 and
validated on Lab staging at lab.aheadofmarket.com; that validation was not production proof.

## call

I am shipping this because it does the one thing Patrik asked for — background
work out of every chat, into one window that behaves exactly like Email — and
because the screen is designed around an action, not a display. The user's goal
here is "is anything still owed to me, and what do I do about the stalled ones";
every row answers with three visible controls (Start it / Chase it / Dismiss),
and Dismiss is the control that never existed anywhere before. I kept the row
DNA from the in-chat card that already survived a Steffen send-back round
(2026-07-27: one bordered accent control per row, durations never bare clocks,
two-line clamp on promise sentences) rather than inventing a new language, and
what I changed for the cross-room context is exactly what the context changes:
the room name is now real information ("in Socials · +18 more in that room"),
so it took the meta slot. The alternative I rejected: tappable rows that open
the room — building mission-room objects wrong creates phantom rooms, so it is
queued, not smuggled in.

## measured

Staging spacing/type/balance census of the mounted column (chrome-devtools
evaluate_script on lab.aheadofmarket.com, 2026-07-28):

```json
{"columnWidth":399,
 "balance":[{"i":0,"centroid":0.47,"span":0.92},{"i":1,"centroid":0.5,"span":0.92},
            {"i":2,"centroid":0.43,"span":0.92},{"i":3,"centroid":0.4,"span":0.71},
            {"i":4,"centroid":0.5,"span":0.92},{"i":5,"centroid":0.44,"span":0.92},
            {"i":6,"centroid":0.4,"span":0.71},{"i":7,"centroid":0.5,"span":0.92}],
 "spacingValues":[4,8,12,16],"offgrid":[],
 "fontSizes":[12,13,14],
 "imagesChecked":0,"svgAnchors":2}
```

PASS by the spacing-density standard: every live spacing value on the 4/8 scale
(off-grid = []), 4 distinct spacing values (cap 10), 3 font sizes (cap 8), no
section leaning with span < 0.65 (no ONE-SIDED), no consecutive same-side leans
(no STACKED). design_visual_probe conditions: 0 images so DISTORTED/OVERFLOW
cannot fire; anchors present (header glyph + accent section dots).

design_facts.py on the source: fonts var(--font-mono) for numerics only, weights
600/500, borders 1px var(--accent)/var(--hair)/var(--divider), radius 10, no
banned serif.

Functional, verified on Lab staging in robot Chrome: window opened with 4 promise groups;
Dismiss on followup 48e2d40c removed the row, count 4->3, Supabase row
confirmed `status='dismissed'`; Socials thread shows no card above the
composer. Deployed chunk CornerCV6-UIwC5IcY.js carries "Background work" x4,
"dismiss-followup" x1.

## uncertain

- Dismiss and Chase it carry identical ghost weight. I chose not to make
  Dismiss read destructive (it releases a promise, it does not delete work),
  but a user might expect the remove-action to look different from the two
  send-actions, and I have not watched Patrik use it.
- "Start it / Chase it" from this window post into the promise's room via a
  payload I derived from the followup row, not through a mounted room's own
  send. I verified the payload shape against useRoomThread.send by reading, and
  only exercised Dismiss live — a Start-it tap on a MISSION-scoped promise is
  the path I could not verify without polluting a real room.
- The ChatDesktop rail pin (chatlist screen) is a code twin of the Email row
  directly above it but I never got that screen on screen — I verified the
  top-bar icon and the column, not that row's rendering.
- The empty state is written, not rendered live (there were always promises).

## would_change

Tappable rows that open the promise's room in a chat column — needs correct
mission-room object construction, queued in BUILD.md. A per-room grouping
header once the list regularly exceeds ~8 items. Exercise the empty state and
the mission-scoped Start-it path in a scratch room.

## risk

If the send routing for mission promises is wrong, a "Start it" instruction
lands in the project's general room instead of the mission room — visible to
Patrik as a misplaced message, annoying but recoverable, and the Dismiss path
(the one that touches data) is verified. If the window's world-wide scope ever
leaks across tenants it would be through running-tasks/dismiss-followup, both
tenant-gated by verifyTenant with the PATCH scoped to client_id. Blast radius
of a bad dismiss: one promise row released early — re-arm is a one-row status
flip back to pending.
