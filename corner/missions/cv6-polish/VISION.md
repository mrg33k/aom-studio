# CV6 Polish - Mission Vision

**Mission path:** `corner:cv6-polish`
**Started:** 2026-07-15
**Driver:** rex (EA supervises, verifies, lands). Dev: Codex CLI headless rounds.

## Patrik's directive (2026-07-15, verbatim intent)

Corner works but still feels clunky. Max out Codex on polishing what we have, per screen, with rex driving. The named pain points:

- UI interactions feel clunky in chat.
- Moving between screens feels clunky.
- The loader should be our logo filling up (or something more attractive), not a generic spinner.
- Top bar consistency across screens.
- UI simplification and ease of use everywhere.
- Touch responses (taps must feel acknowledged).
- Notifications: we currently have none; we want them.
- The goal is visual, UX, and UI polish. Simplify rather than add.

## The bar (CV6-SPEC, unchanged)

A control is WORKING only when, on the live site with the viewer's real data, a real
tap produces the real result AND survives a reload, at both 390x844 and 1440 widths.
Sample data or a nice screenshot is not proof. No fake UI: nothing on screen that is
not actually happening.

## Boundaries

- CV6 only (`src/dashboard/cv6next/`). Legacy CV3/CV4/CV5 untouched except shared contracts.
- Never break the truth-contracts guarantees (tenant context, backend-owned counts,
  shared renderer, honest local read-only mode).
- Design from the CV6 design system (`design-system-current`), never freestyle.
