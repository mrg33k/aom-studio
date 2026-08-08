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
