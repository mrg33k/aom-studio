# CV6 Loading Language - Mission Research

**Started:** 2026-07-14

## Initial Evidence

Before R1, CV6 had inconsistent loading treatments:

- App entry auth/lazy boot used an unbranded spinner or generic text.
- Shared template loading used a small spinner plus skeleton rows.
- Tracker, Files, Command, Review, and Support kit screens had inline spinner strings.
- Some copy suggested indefinite progress even when earlier truth-contract work required loads to settle into empty or error states.

## Constraints

- Use only CV6 semantic tokens for the primitive.
- Respect existing theme attributes and theme variable overrides.
- Keep loading state separate from empty/error/offline/unconfigured state.
- Preserve the practical audit assertions for Files, Tracker, and Command.
