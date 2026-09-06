# R6b — comp-match review (run by the orchestrator, 2026-09-06 3:50 AM)

The Muse reviewer could not run: with the sandbox on it cannot listen on 127.0.0.1:5173
(`EPERM`), and the relaunch with the sandbox off was blocked by the auto-mode classifier. The
orchestrator ran the measurement itself with `tools/cm-measure.mjs` (Playwright, 1440x900, design
`Corner v2.dc.html` Work state vs built `/c/project-aster` on the offline stand-in at commit
`e439eb6`). Evidence: `rounds/evidence/R6-cm-work-design.png`, `R6-cm-work-built.png`.

## PASS (|Δ| ≤ 1px, colours within 2/255)

| element | design | built |
|---|---|---|
| sidebar header | 279x56 | 279x56 |
| conversation header | 56 tall | 56 tall |
| search field | 251x40 @14,70, 14px | 251x40 @14,70, 14px |
| "+ New" button | 121x40, 14px/600, `#5B9BFF`, r9 | 121x40, 14px/600, `#5B9BFF`, r9 |
| "Project +" button | 123x40, 14px/600, rgba(255,255,255,.05), r9 | same |
| recent row | 263x38 | 263x38 |
| mission row | 263x38, 14px | 263x38, 14px |
| Files row height | 36 | 36 |
| New mission row height + colour | 36, `--faint`, 13.5px | 36, `--faint`, 13.5px |
| Preview / Context tabs | 15px/600, `--fg` active / `--muted` inactive, 56 tall | 15px/600, same colours, 55 tall |
| Review button size | 78x36, 14px/600 | 78x36, 14px/600 |
| agent body | 15px / 24px, `--fg` | 15px / 24px, `--fg` |
| user bubble text | 15px | 15px |
| question option title | 14.5px/600 | 14.5px/600 |
| composer font family | Hanken Grotesk | Hanken Grotesk |

## FAIL → punch list (P101-P109)

| element | design | built | punch |
|---|---|---|---|
| search field radius / fill | r9, rgba(255,255,255,.05) | r11, rgb(29,36,48) | P101 |
| sidebar row radius | 8 | 10 | P102 |
| sidebar row title weight | 500 | 400 | P103 |
| Files / New mission indent | x=30, w=241 | x=8, w=263 | P104 |
| Review button OFF state | transparent, `--muted`, r9 | `--surface-2`, `--fg`, r10 | P105 |
| composer placeholder size | 14.5px | 14px | P106 |
| Record chip | 77x28, r7 | 87x32, r8 | P107 |
| header status label | 13.5px, `--success` | 12px, `--muted` | P108 |
| footer name size | 14px | 13px | P109 |

## Not comparable in this run (noted, not failed)

- Conversation pane width: design 418px with a landscape YouTube artifact open; built 439px with
  nothing open. The aspect-driven formula was verified separately in R4 (portrait → 40vw pane).
- Visual stage box: design measured the YouTube frame; built had no artifact open.
- The thread in the built app was scrolled (negative y on message anchors); sizes still valid.

Remaining states (review pins, photo/site/video/code stages, Context, lightbox, notifications,
settings ×5, onboarding ×6, login, empty home, 1240/1000/999) were reviewed by eye from the R4-R6
evidence PNGs, not measured; P016-P019 came from that pass. A measured pass over those states is
worth a later reviewer run once the classifier lets one start.
