# Room Checklists — Mission Build Plan

**Mission path:** `corner:room-checklists`
**Started:** 2026-07-21

## R1 — Per-room checklist composer

- Add a circular checklist control beside Work/Plan in every room composer.
- Build a compact checklist mode with multiple named, collapsible lists.
- Persist lists per tenant and canonical room key.
- Support add, rename, complete/reopen, delete, and Play-to-agent for items.
- Support explicit Copy or Move sharing to another room.
- Verify mobile and desktop chat paths, reload persistence, send behavior, and sharing.
- Deploy the verified round to the Corner lab.

### Shipped behavior

- Tenant-scoped `dash_room_checklists` persistence, separate from the agent plan.
- Canonical agent/project/mission room keys and a full nested-room share directory.
- Multiple editable accordion lists with editable, completable, deletable items.
- Explicit Play-to-agent through the room's existing Work/Plan-aware send path.
- Explicit Copy versus Move confirmation with independent destination copies.
- Bounded checklist-mode composer that preserves the typed chat draft and bottom anchor.

### Verification

- `19/19` CV6/source contract checks passed.
- `38/38` CV6 Playwright checks passed across mobile, desktop, keyboard geometry,
  bottom spacing, scrolling, live progress, multi-column chat, Email, Review, and files.
- Production build passed; existing unrelated OutreachTracker duplicate-style warnings remain.
- Live asset contains the checklist UI and `/api/dashboard/room-checklists` returns the
  expected authenticated-route guard (`401 jwt required`) when called unsigned.
- Deployment `dpl_B9itB5hQLE9vAxhWGbZhGNTyRGVa` is aliased to
  `https://lab.aheadofmarket.com`.

**Status:** shipped.

## R2 — Opaque, roomier checklist composer

- Replace the translucent composer/list layers with theme-aware solid surfaces.
- Give the checklist header, accordion rows, item rows, and share controls more breathing room.
- Preserve the mobile bottom anchor, bounded internal scroll, and circular action row.
- Re-run the focused checklist loop and the sibling mobile composer regression suite.

### Shipped behavior

- Dedicated solid composer, list-card, and control surfaces in dark, light, and glass themes.
- Taller accordion headings, item rows, inputs, share controls, and more internal spacing.
- The checklist remains bounded and internally scrollable while the composer stays on the
  existing keyboard-aware mobile bottom anchor.

### Verification

- `19/19` CV6/source contract checks passed.
- `38/38` CV6 Playwright checks passed, including the exact collapsed mobile list state,
  opacity assertions in glass mode, keyboard geometry, and the shared composer regressions.
- A clean build from commit `4c73b625` passed; existing unrelated OutreachTracker
  duplicate-style warnings remain.
- Live CSS exposes the solid dark/light/glass tokens and the authenticated checklist route
  returns `401 jwt required` when called unsigned with a room key.
- Deployment `dpl_2oLGCBg3opcWmMP3idhpaGZTsipB` is explicitly aliased to
  `https://lab.aheadofmarket.com`.

**Status:** shipped.

## R3 — Unsqueezed circular checklist controls

- Give every checklist icon action an explicit square footprint and circular aspect ratio.
- Increase the header, list, and item action diameters so the icons have breathing room.
- Keep the mobile header and item rows within the composer without clipping or shrinking.
- Render the collapsed and expanded mobile states and re-run the shared composer checks.

### Shipped behavior

- Header add/close actions now use fixed `42px` circular targets.
- List and item actions use fixed `38px` circular targets with larger icons.
- Explicit square sizing, aspect ratio, and non-shrinking flex geometry prevent oval controls.
- The checklist grid and destination select are width-bounded so every circle remains fully
  inside the composer in both collapsed and expanded states.

### Verification

- `19/19` CV6/source contract checks passed.
- `38/38` CV6 Playwright checks passed, including computed square dimensions, circular
  radius, full composer containment, mobile bottom geometry, and desktop parity.
- Clean build from commit `552c6285` passed; existing unrelated OutreachTracker
  duplicate-style warnings remain.
- Live bundle contains the fixed `42px` geometry and `1 / 1` aspect-ratio contract.
- Deployment `dpl_6maNgD89jjc4up3jbxGwWjeEACrd` is explicitly aliased to
  `https://lab.aheadofmarket.com`.

**Status:** shipped.
