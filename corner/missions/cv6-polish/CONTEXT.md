# CV6 Polish - Mission Context

**Mission path:** `corner:cv6-polish`
**Status:** IN PROGRESS
**Started:** 2026-07-15

Patrik's product-polish push on Corner CV6: per-screen visual/UX/UI polish, driven by
rex with Codex CLI as the dev. Named targets: chat interaction feel, screen-to-screen
movement, Corner-logo loader, top bar consistency, simplification, touch responses,
and a first notifications system. See VISION.md for the directive, BUILD.md for rounds
and the per-round landing protocol.

Related missions: `corner:truth-contracts` (architecture guarantees this mission must
not break), `corner:cv6-loading-language` (honest loading copy stands),
`corner:agent-direct-chats` (roster + promotion shipped 2026-07-15).

R22 shipped the signed-in identity pass on 2026-08-08. Editable avatar pencils now
sit on the bottom-right edge, active-room presence is separate on the bottom-left,
and Settings Account plus the desktop profile control let each authenticated user
change their own picture, two initials, and color. The self-only API gate preserves
the rest of their account metadata. Commit `3c57b710` is live through Ready deployment
`dpl_GmMTfG8v1tTXH5T7P2Rh7H8rUFQR` at the production dashboard.
