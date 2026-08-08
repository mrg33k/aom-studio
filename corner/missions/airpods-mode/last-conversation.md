# Corner AirPods Mode — Last Conversation

## 2026-08-08 — Mission kickoff

The user chose CV6, a persistent Corner concierge, mobile walkaround use, tiered action
authority, the “Hey Corner” wake phrase, `Command-Shift-Space` on web, brief narration,
autonomous follow-up, configurable attention batching (roughly every two minutes), and
topic-segmented room handoffs with a collapsed full transcript. Implementation began as
R1 with the mission ledger created before product edits.

## 2026-08-08 — R1 implementation complete

The global runtime now persists above CV6 across rooms and tools. It supports the native
wake phrase, web shortcut/button, brief live voice, settings, quiet hours, and proactive
attention batching. Gemini Live sessions receive one-use ephemeral credentials and
global tool calls pass through an authenticated, tenant-scoped, idempotent action broker
with durable audits. Session finalization stores a structured transcript and posts
room-specific handoffs; raw audio is never submitted or stored.

Added the durable attention/session/action migration and a Capacitor iOS project with a
native `CornerAirPods` plugin for on-device phrase detection, voice audio routing, speech
prompts, background-audio declaration, and lock-screen media activation.

Verification completed: focused tests 6/6, Vite production build, API syntax, plist,
tenant context/identity, and Xcode simulator compile all passed. The repo aggregate tenant
guard still reports two unrelated pre-existing `aom` slugs. Release handoff is to apply
the migration, configure production secret/origin values, and validate permissions plus
long-running lock-screen behavior on a signed physical device before TestFlight.

## 2026-08-08 — R2 production release

The user authorized production deployment and mobile-web testing. Because the shared
checkout contained unrelated edits, R1 was isolated into a clean mission-named release
worktree based on the latest `origin/main`. The linked Vercel project was verified as
`aom-studio` before release.

The Supabase migration ledger contained several unrelated pending local versions, so a
bulk push was not used. Only `20260808000000_airpods_mode.sql` was applied through the
production management API and that exact version was recorded as applied. The four
tables were verified afterward.

Commit `ab2f6aea` passed focused AirPods tests, tenant context/identity contracts, API
syntax, diff checks, and a clean production build, then fast-forwarded `main`. Its Vercel
production deployment reached READY. The canonical dashboard returned HTTP 200 at a
390×844 viewport; the available browser was signed out and correctly redirected to
`/login`, so the authenticated control still needs the user's phone smoke test. Both new
API routes were present and returned `401 jwt required` without credentials.
