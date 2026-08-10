# Corner AirPods Mode — Context

**Mission path:** `corner:airpods-mode`
**Status:** IN PROGRESS
**Updated:** 2026-08-10 (R18)

R18 closed the three reds R17 carried forward, and every one of them turned out
to be a MECHANISM rather than a wording problem — the same shape as R17:

1. *It named the wrong source for evidence it had just given.* `read_recent_activity`
   merged Corner room records and GitHub commits by TIMESTAMP ALONE, throwing away
   the relevance score both sources had just computed. Reproduced live: "App Store
   submission" resolved to a commit titled "the second word cap was hiding inside
   the evidence tool" — newest, and about nothing the caller asked. Relevance first,
   recency as tie-break, a phrase-match bonus, and our OWN commits (`corner:airpods-mode`,
   `corner:voice-chat`) excluded as self-evidence. Provenance now names the record the
   answer USED and demotes the rest to "also searched, not quoted".
2. *A spoken offer with no approval card.* Three layers, because the prompt alone
   had already lost this argument once: the evidence tool returns a well-formed
   `create_task` next_action (project + mission_slug carried out of the record so
   the card can actually execute), its `response_contract` makes the call mandatory,
   and the CLIENT raises the card itself when the model speaks an offer and forgets.
3. *A dropped signal ended the call.* Resumption handles had been issued since R17
   with nobody replaying them. `VoiceChat.jsx` now stores each handle and replays it
   after `goAway` or an unclean close — same conversation, no greeting, no second
   microphone gesture, because only the socket is rebuilt and the audio graph stays up.

**Standing lesson added by R18: the suite can rot into enforcing the bug.** The
focused test file had been red since R17 and red in the worst direction — it asserted
the 22-word cap, the 0.0 decode and the say-only-this contract, all deliberately
deleted. The gauntlet's unverified-boundary check graded WORD ORDER, failing a
perfect answer over word placement. Both re-pointed at the current contract, neither
loosened. **When a rule is deleted, delete it in all four places: prompt, tool
contract, gauntlet, focused test.**

Measured on production: `skeptical` **14/14 (was 11/14, first time ever green)**,
`core` **17/17**, focused suite 24/24. The reconnect path is code-verified and live in
the served bundle but has not been through a real dropped call on the phone.

R17 answered Patrik's "it can't hold a conversation" and it was not a model
problem. Four mechanisms were capping it, and three of them lived OUTSIDE the
voice prompt: the tool broker returned `response_contract: 'Say only
spoken_summary'` next to machine-built strings, `read_recent_activity` carried
its own second "at most 22 words" cap, and the conversation gauntlet asserted
`wordCount <= 24` on every substantive turn — so every past round of tuning made
the assistant shallower and no later round could undo it without going red.

**The standing lesson for this mission: a brevity rule in the prompt is only one
of three places brevity is enforced.** Check the tool `response_contract` and the
gauntlet checks before concluding the prompt is the problem, and never write a
`Say only spoken_summary` contract again — constrain the FACTS, never the WORDS.

**There is no deeper Live model.** Probed the production key against every Pro
and thinking variant: all 1008. Only `gemini-3.1-flash-live-preview` and
`gemini-2.5-flash-native-audio-preview-09-2025` open a session. Every future
"make it smarter" round has to come from the prompt and the broker.

Live on production and verified on the endpoint the phone calls. R17 shipped with
`core` 17/17 and `skeptical` 11/14; R18 cleared all three reds (see above).

New tool: `scripts/airpods-voice-bench.mjs` runs real multi-turn conversations
against a live session with real tools and can point at a LOCAL checkout, so a
prompt change is measured before it ships instead of on Patrik's phone.
**Updated:** 2026-08-09

The active product surface is `src/dashboard/cv6next/`. CV6 already embeds the legacy
`VoiceChat` transport inside its room composer, but that lifecycle is destroyed when the
composer changes and its visible controls still use CV3 styling. Existing voice APIs
provide Gemini Live context, create-project/create-mission tools, transcripts, and a
post-call handoff. This mission turns those pieces into a global, safe operating layer.

The working tree contains unrelated user changes in CV6 chat files. Preserve them and
keep this mission’s integrations narrow.

R14 reopened physical packaging after build 12 installed without app artwork. The
native AppIcon catalog points to a missing 1024×1024 PNG; the approved Corner favicon
asset is the source for the repaired build 13.

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

R5 reopened after successful iPad conversation testing exposed an iPhone-only entry
failure and the gap between conversational voice and a genuinely shared-control Corner
operator. The work targets both responsive visibility and grounded room/UI agency.

R5 is live from commit `842747e4`. The phone-wide CV6 shell now owns one consistent
headset entry across Home and Chat; the compact cockpit visualizes voice state and shows
screen context plus verified action receipts. Voice can resolve and read authoritative
rooms, navigate the visible UI through real effects, queue mission-backed work, report
cross-room state, and end naturally. Physical iPhone/AirPods retesting remains the final
device-level validation.
