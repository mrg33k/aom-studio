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

**Status:** in progress.
