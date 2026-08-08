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

R3 reopened after physical mobile-web testing. Production logs show the phone's
`/api/dashboard/voice-session` request returned 200, localizing the silent failure to
the browser-to-Gemini handshake. The repair moves controls into the top header and
prevents microphone audio from being sent before `setupComplete`.

R3 is live from commit `43877d24`. AirPods mode now enters from the top navigation on
desktop, mobile Home, and mobile Chat. The compact menu no longer covers the composer;
Gemini audio starts only after setup, and Corner receives an explicit greeting turn.

R4 reopened after the stored physical-session transcript revealed Google's exact 1008
close reason. Live probes verified ephemeral tokens require
`BidiGenerateContentConstrained`; the standard method accepts API-key callers only.

R4 is live from commit `635cdeb9`. The authenticated voice-session endpoint now pairs
its ephemeral token with the constrained Gemini Live socket method.
