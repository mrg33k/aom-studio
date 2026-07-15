# CV6 Polish - Research Notes

## Design sources (read before any visual round)

- Design system (canonical): AOM-EA repo,
  `corner/missions/general/missions/corner-ui-cv6/deliverables/design-system-current/`
  (stable symlink; never path through a dated folder).
- Theme tokens: `src/dashboard/cv6next/cv6.css` — three themes; dark ground
  `--ink-900`, light `#F6F6F7`, accent `--blue-500`/`#3B82F6`. Fonts via `--font-sans`
  / `--font-mono` tokens only. Syne is banned repo-wide.
- Corner mark: `public/cv6/assets/corner-logo.svg` + `corner-logo-white.svg`.
- Motion vocabulary already in cv6.css: `spin` (1.05s linear), `statPulse` (1.7s).
- CV6 `.doc` reading paper is forced light in every theme; ink on it uses fixed colors
  (#1a1a1a / #6a6a72), never theme tokens.
- Mobile: respect safe-area insets (the #1 recurring mobile bug class); template
  action controls get button semantics via `cv6kit/templateEngine.js`.

## Verification patterns that work in this repo

- Vite must bind IPv4 explicitly: `npx vite --port <p> --strictPort --host 127.0.0.1`.
- Run vite + playwright inside tmux (harness kills long browser runs otherwise).
- `?demo=<surface>` no-auth fixtures mounting real components with seeded data beat
  data-pipe seeding every time (R5b/R5d/R7 lesson).
- POST intercepts on bare paths, no `?**`; assert accessible names via getByRole.
- Specs: `tests/cv6-practical-audit.spec.mjs` (desktop+mobile journey, zero console
  errors in local mode), `tests/cv6-message-renderer.spec.mjs` (5),
  `tests/cv6-file-previews.spec.mjs` (2). Extend, never regress.

## Notifications round inputs (R9)

- Real event sources already in the system: `events` table (`message_step`),
  needs-you Catch Up derivation, review queue handoffs, `active_processes` heartbeats.
- Rule: no fake UI; system-level for every tenant; iMessage is not a push channel.
