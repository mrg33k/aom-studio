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

## 2026-08-08 — R3 physical-test report

The user supplied two iPhone screenshots after testing with AirPods. The microphone and
iOS recording indicator activated, but Corner stayed on “Connecting…” without greeting
or entering a usable conversation. The expanded settings UI inherited unreadable CV6
tokens, overlaid room cards and the composer, and exposed desktop-only shortcut copy on
mobile. The user also requested one consistent top-menu control from Home through Chat.

Production logs showed the authenticated voice-session request returned HTTP 200. Code
inspection then identified the client-side race: audio frames were sent as soon as the
socket opened, before Gemini acknowledged setup, and the session sent no initial turn
that would cause Corner to greet the caller.

## 2026-08-08 — R3 production release

R3 replaced the floating bottom panel with a single headphones button in the desktop
bar and mobile Home/Chat headers. Its compact opaque menu passed a 390×844 visual check
without overlapping the composer. Advanced options now open in a separate readable
sheet.

The transport now waits for Gemini `setupComplete` before streaming PCM, declares the
16 kHz sample rate, sends an initial greeting turn, times out after 12 seconds with
actionable copy, and permits retry from the error state. Focused tests passed 8/8 and
the clean production build passed. Commit `43877d24` deployed READY to the verified
`aom-studio` project; the canonical dashboard's served asset contains the R3 markers.
The next step is another physical iPhone/AirPods conversation smoke test.

## 2026-08-08 — R4 server handshake finding

The stored failed session contained Google's close reason: the socket treated the
ephemeral token as an unregistered caller. Live method/credential probes reproduced the
failure and verified `BidiGenerateContentConstrained` reaches `setupComplete` with the
same token. R4 opened to release that server-side method correction.

## 2026-08-08 — R4 production release

Commit `635cdeb9` changed the authenticated voice-session response to the constrained
Gemini Live method and passed API syntax plus 9/9 focused tests. Its clean `aom-studio`
production deployment reached READY. Physical iPhone/AirPods retesting is now unblocked.

## 2026-08-08 — R5 physical follow-up

The user confirmed the repaired conversation worked well on iPad, but the voice entry
was absent on iPhone. They requested a slimmer advanced interface, visible speaking
feedback, better cross-room understanding, clear work execution, natural conversation
ending, and real—not imagined—control of the Corner UI so voice and screen stay aligned.

## 2026-08-08 — R5 implementation and responsive verification

The iPhone defect was traced to surface ownership: mobile Home is rendered by the CV6
template screen, while the prior control was only mounted in selected React headers.
The entry now lives once in the phone-wide CV6 shell, while desktop keeps its shared-nav
entry. The voice menu is slimmer and shows speaking/thinking movement, active screen,
live transcript, and the last verified tool result.

The session now receives a sanitized visible-room catalog and active screen. New
tenant-authoritative tools list and read rooms, open the real UI, queue trackable work,
and end naturally after a short goodbye. The prompt explicitly forbids unverified UI or
completion claims. Twelve focused tests, syntax checks, the production build, and
authenticated visual checks at iPhone and iPad dimensions pass. Production deployment
is the remaining R5 step.

## 2026-08-08 — R5 production release

Commit `842747e4` fast-forwarded `main` and the verified `aom-studio` production
deployment reached READY. The canonical dashboard returned HTTP 200 and its served
client asset contains the new shared-screen and natural-session-end behavior. Both
voice APIs remain protected and returned 401 to unauthenticated probes. R5 is complete;
the user can now repeat the physical iPhone/AirPods conversation test.
# 2026-08-09 — Native build 6 and live evidence repair

Patrik reported that the native login should be dark or glass and connected his iPhone.
Corner 1.0 (5), containing the voice minimize/reopen control, was installed and launched.
The native login was then pinned to a safe-area-aware dark frosted-glass card and signed
Corner 1.0 (6) was archived, installed, and launched on the same device.

The live AirPods agent had incorrectly denied the known App Store submission. Diagnosis
showed it only received one room's recent snapshot and task totals. A new non-replayed,
tenant-scoped `read_recent_activity` tool now searches current Corner room evidence and
AOM GitHub commits, returns dated source labels, reports source availability honestly,
and forbids treating no match as proof an event did not happen. A production-data probe
found the TestFlight/App Store evidence in `corner:business-ops`. The repository is public
at `mrg33k/aom-studio`; lookup retries anonymously when the legacy optional token is stale.

Focused tests and the isolated production build pass. Release commit `f4bbb8c8` was
pushed to `main`; both the direct verified `aom-studio` deployment and the Git-triggered
deployment reached READY. Canonical authenticated checks returned 200 and showed the new
tool in the live Gemini declaration. An accidentally auto-created `airpods-mode-r6`
Vercel project was deleted and never used as release proof. Physical dark-login and AOM
voice-question confirmation remain before this round can be called complete.
