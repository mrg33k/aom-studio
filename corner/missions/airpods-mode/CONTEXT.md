# Corner AirPods Mode — Context

**Mission path:** `corner:airpods-mode`
**Status:** DONE
**Updated:** 2026-08-08

The active product surface is `src/dashboard/cv6next/`. CV6 already embeds the legacy
`VoiceChat` transport inside its room composer, but that lifecycle is destroyed when the
composer changes and its visible controls still use CV3 styling. Existing voice APIs
provide Gemini Live context, create-project/create-mission tools, transcripts, and a
post-call handoff. This mission turns those pieces into a global, safe operating layer.

The working tree contains unrelated user changes in CV6 chat files. Preserve them and
keep this mission’s integrations narrow.

R1 now provides the global CV6 runtime, ephemeral Gemini credentials, tenant-scoped
action and handoff APIs, durable attention data, and a compilable Capacitor iOS shell.
No raw audio is stored. The remaining work is operational release work: apply the
database migration, configure production secrets/origin, and validate wake/background
behavior on a signed physical device before TestFlight/App Store distribution.

R2 was authorized to release the mobile-web portion to the canonical production
dashboard. Production deployment must use a clean release tree and the verified
`aom-studio` Vercel project; Lab is not release proof.

R2 is live in production from commit `ab2f6aea`. The canonical dashboard serves the
release, the Supabase schema is present, and unauthenticated probes confirm the new API
routes fail closed. Mobile-web activation is available after sign-in through the visual
AirPods-mode control. Wake phrase and sustained lock-screen operation remain native-iOS
capabilities requiring signed-device/TestFlight validation.

## R3 — the first real call never connected (2026-08-08)

Patrik's first AirPods session (`997f4ee8`, 16:24 UTC) ran 82 seconds and captured
zero words. The stored transcript is two model lines: "Connecting to voice..." then
"Disconnected: Method doesn't allow unregistered callers (callers without established
identity). Please use API Key or other form of API c". The handoff that reached the
corner room therefore carried no content at all — summary "Voice conversation
completed." over an empty conversation.

**Root cause.** `voice-session.js` mints an ephemeral token (correct — the long-lived
key must not reach the browser) but hands it to `BidiGenerateContent`, which only
accepts an API key. Ephemeral tokens are only accepted by
`BidiGenerateContentConstrained`. Google closes the socket at handshake with code 1008
before setup, so the client shows a generic disconnect and the session is recorded as
"completed".

**Verified live against the Live API on 2026-08-08** using the production key:

| method | credential | result |
|---|---|---|
| `v1beta.BidiGenerateContent` | `?key=<api key>` | setupComplete |
| `v1beta.BidiGenerateContent` | `?access_token=<tok>` | CLOSED 1008 — reproduces Patrik's error verbatim |
| `v1beta.BidiGenerateContentConstrained` | `?access_token=<tok>` | setupComplete |
| `v1alpha.BidiGenerateContentConstrained` | `?access_token=<tok>` | setupComplete |

Two further findings from the same pass:

- `systemInstruction` IS honored on `BidiGenerateContentConstrained` (codeword probe
  returned verbatim), so the speaker-identity and workspace-context prompt is unaffected.
  This was worth checking — a token-scoped session that silently dropped the system
  prompt would have re-opened the "the model thinks Courtney is Patrik" failure.
- Do NOT pin the model into the token via `bidiGenerateContentSetup`. A constrained
  token returns CLOSED 1011 "Internal error encountered." The setup message stays
  client-side.

**Fix.** One method name, plus building the socket URL directly instead of string-replacing
the key out of it.

**Not the cause, but worth knowing:** the production `GEMINI_API_KEY` value carries a
trailing newline. Tested — undici and Google both tolerate it, so it is harmless today.
Separately, that key is still the one created 129 days ago; the 2026-07-27 security note
in `voice-session.js` says it was served publicly and must be ROTATED, and it has not been.
