# Corner AirPods Mode — Build

**Mission path:** `corner:airpods-mode`

### R16 — Native chat safe-area ownership (2026-08-09)

**Physical evidence:** Build 14 shows the Business Ops rich composer clipped above a
black strip approximately one home-indicator inset tall. The same authenticated rich
composer at 390×844 measures 100px tall, renders both rows, lands exactly 20px above
the room/viewport bottom, and has no document gap in the web surface.

**Root cause:** The native Capacitor shell sets `ios.contentInset = automatic`, which
asks WKWebView’s scroll view to add UIKit safe-area insets. CV6 already owns those
insets through `viewport-fit=cover`, `env(safe-area-inset-*)`, and its fixed viewport
shell, so the native wrapper reserves the bottom a second time and clips the composer.

**Scope:** Give safe-area ownership solely to CV6 by disabling WKWebView automatic
content inset adjustment, enforce that contract in the native regression suite, package
the correction as Corner 1.0 (15), and install it on Patrik’s paired iPhone.

**Implementation:** Capacitor now sets `ios.contentInset = never`, leaving CV6 as the
single owner of the phone safe areas. The native regression contract rejects a return
to automatic inset adjustment.

**Verification:** The real authenticated Business Ops rich composer at 390×844 renders
its 41px input and 34px action row inside a 100px card, ends 20px above the viewport,
and produces zero document gap or horizontal overflow. The focused AirPods suite passes
20/20, both mobile composer/viewport regression suites pass, the production-configured
Vite build and Capacitor sync pass, and `git diff --check` is clean.

**Native release:** The signed Corner 1.0 (15) archive contains `contentInset = never`,
passes strict code-signature validation, installed successfully on Patrik’s paired
iPhone, reports bundle version 15, and launched successfully.

**Production result:** Commit `2a917f00` fast-forwarded `main`; verified `aom-studio`
production deployment `aom-studio-6aoxsqj0w` reached READY and the canonical dashboard
returns HTTP 200.

**Status:** in progress — corrected build 15 installed; physical Business Ops composer confirmation pending

### R15 — Header-only idle voice entry (2026-08-09)

**Physical evidence:** Build 13 restores the correct app icon and room data, but when
voice is armed and its controls are closed, a persistent “Corner Voice” strip remains
fixed beneath the phone header. It covers the first room and materially reduces the
usable mobile canvas.

**Scope:** Remove the idle voice strip entirely. The headset button immediately left
of New room remains the single persistent voice entry; the full voice controls appear
only after the user explicitly opens them. Package the correction as Corner 1.0 (14)
and install it on Patrik’s paired iPhone.

**Implementation:** Removed the idle `corner-voice-dock` markup and all of its fixed
mobile/desktop styling. A regression contract now forbids that dock from returning in
either the provider or stylesheet while retaining the shared header portal.

**Verification:** On the real authenticated dashboard at 390×844, the closed state
rendered one headset entry, zero idle docks, zero voice panels, and zero horizontal
overflow. The headset opened the full controls and dismissed back to the unobstructed
room list. The focused AirPods suite passes 20/20 and the production-configured Vite
build passes.

**Native release:** The signed build 14 archive contains the full on-demand voice panel
but no idle dock markup or CSS. Corner 1.0 (14) installed and launched successfully on
Patrik’s paired iPhone, which reports bundle version 14.

**Production result:** Commit `0b8251f6` fast-forwarded `main`; verified `aom-studio`
production deployment `aom-studio-3tn09j98n` reached READY. The canonical dashboard
returns HTTP 200, its served JS/CSS contain the on-demand voice panel, and neither asset
contains the removed persistent dock.

**Status:** complete — header-only idle entry is live and build 14 is installed

### R14 — Restore the native app icon (2026-08-09)

**Physical evidence:** Corner 1.0 (12) is installed on Patrik’s iPhone, but iOS shows
no Corner artwork for the app. The AppIcon catalog references
`AppIcon-512@2x.png`, while that source file is absent from the catalog.

**Scope:** Restore the approved opaque Corner artwork at Apple’s required 1024×1024
size, verify the signed archive contains the compiled icon, version it as Corner 1.0
(13), install it on the registered iPhone, and verify iOS can render the installed
application icon.

**Repair result:** Restored the approved dark Corner mark as a tracked 1024×1024,
opaque AppIcon source. Xcode compiled it into the signed iPhone and iPad icon payloads;
the archive records `CFBundleIconName = AppIcon`, bundle version 13, a valid signature,
and the expected non-alpha 120×120 phone rendition.

**Physical verification:** CoreDevice installed and launched Corner 1.0 (13) on
Patrik’s iPhone. iOS generated a 528×528 installed-app icon for
`com.aheadofmarket.corner` with `Is Placeholder = false`; the returned pixels show the
correct dark Corner artwork. The focused AirPods suite passes 20/20 and
`git diff --check` is clean.

**Status:** complete — real Corner icon compiled, installed, and rendered by iOS

### R13 — Native production environment repair (2026-08-09)

**Physical evidence:** Corner 1.0 (11) installed and launched, but the phone rendered
only loading/error states. Comparing served production assets with the packaged native
assets showed the production bundle contains the live Supabase origin while build 11
contains none. The local Capacitor sync had built without Vercel's production
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, so native could not restore the user
session or authenticate room-data requests.

**Scope:** Rebuild the Capacitor client from the verified `aom-studio` production
environment, prove the live Supabase origin is embedded without exposing credentials,
version it as Corner 1.0 (12), sign, reinstall, and verify the installed version.

**Prevention:** `npm run ios:sync` now refuses to package when the Supabase URL or
public client key is absent or malformed, preventing another apparently valid but
unauthenticated native shell from being signed.

**Repair result:** Vercel's verified production environment produced the same
`main-kZLsYaig.js` asset as production web. The native asset now contains both the live
Supabase origin and canonical `https://www.aheadofmarket.com` API host. Corner 1.0 (12)
archived successfully with the registered ad hoc profile, installed on Patrik’s paired
iPhone, and returned a successful foreground launch receipt with no startup error in
the attached native console. The phone reports bundle version 12.

**Verification:** The missing-environment build gate rejects packaging, its valid-env
path passes, the focused AirPods suite passes 20/20, and `git diff --check` is clean.

**Status:** in progress — corrected build 12 installed; physical room-data confirmation pending

### R12 — Headset in the shared phone header (2026-08-09)

**User standard:** The headset control belongs in the same phone header row as the
Corner logo and other actions. On Home it must sit immediately left of the New room
`+` control, not consume a detached row above the screen.

**Scope:** Move the single live phone AirPods entry into the active CV6 header action
group while keeping the desktop entry unchanged and preventing duplicate controls as
template-backed screens rebind.

**Verification:** The focused AirPods suite passes 20/20, the production Vite build
passes, and `git diff --check` is clean. At 390×844 the real Home surface rendered one
headset control in the 72 px header with exact action order Headset, New room, Search,
Menu. Every control measured 42×42, horizontal overflow was zero, and the opened
Corner Voice panel stayed fully inside the viewport.

**Native packaging:** Corner 1.0 (11) carries the same header-row placement into the
Capacitor client so the installed phone app does not lag behind production web. The
client was synced and archived successfully at
`/tmp/corner-build11-adhoc.JhVBCP/Corner.xcarchive`, signed by AOM-INHOUSE with the
registered Patrik iPhone ad hoc profile. The archive reports bundle version 11 and
arm64. After Patrik reconnected the paired device, CoreDevice installed the archive
successfully. The phone reports `Corner 1.0 (11)` at bundle ID
`com.aheadofmarket.corner`, and the foreground launch command returned success.

**Production result:** Commit `665177ea` reached READY as verified `aom-studio`
production deployment `aom-studio-6077koe74`. The canonical dashboard returns 200 and
its served Corner bundle contains the new header-slot markers.

**Status:** complete — production live; build 11 installed and launched on Patrik’s iPhone

### R11 — Evidence-grounded conversation gauntlet (2026-08-09)

**User standard:** Corner Voice must stop sounding informed when it has not actually
checked current state. Conversation quality is part of capability: it must preserve
references across turns, distinguish knowledge from evidence, stay on topic, and use
receipts before making operational claims.

**Test plan:** Drive the live production Gemini session through multi-turn scripted
conversations, execute its tool calls through the authenticated production broker,
score claims against returned evidence, patch the system/tool contract, and rerun the
same gauntlet before release.

**R11 hardening pass:** The first strict production run failed compactness, exact-error,
dated-evidence, executable-next-step, and clean-ending checks. Workspace reads now
return three ranked priorities instead of dashboard totals. Exact task reads expose the
recorded error and a structured, approval-gated retry. AirPods output is capped at 22
words with low temperature, explicit calendar dates, no invented access history, and
a deterministic “Talk soon.” ending. Local syntax, diff, and 20 focused tests pass.

**Conflict removal:** A subsequent real five-turn call proved the model was still
following the older base voice-router ending policy, which explicitly required recaps,
monitoring promises, and offers to stay on. AirPods mode now receives its own base
ending and technical-work policy instead of contradictory instructions. Fresh evidence
reads also return a primary calendar-dated record and a concise spoken contract; status
speech is limited to two priorities. The production gauntlet now treats the audited end
receipt as terminal even when Gemini omits its normal turn-complete marker.

**Second live result:** Exact repeated failure evidence fell to 10 words and the
spoken ending became exactly “Talk soon.” The remaining failures were a 37-word
briefing with a generic question and a missing end tool receipt. The broker now hides
verbose task arrays from the live model, briefings explicitly terminate after their
ranked summary, evidence contracts exclude relative dates, and ending instructions
define a spoken goodbye without the audited tool call as failure.

**Evidence trust correction:** The next run passed compact status, exact failure,
retry, dated-record, and audited-ending behavior, but the App Store answer repeated a
39-word recent `room-bridge` assistant message. Voice handoffs and conversational
assistant echoes are now excluded from operational evidence ranking. A verified
App Store completion receipt is distilled into a 23-word statement that names its date,
recorded status, and the boundary between Corner history and live external state.

**Repeatability pass 1:** All factual, routing, evidence, and ending checks passed; one
repair answer exceeded the speech limit by two words because it explained the same
next action twice. The workspace briefing also exposed duplicated failed tasks with an
identical title. Priority titles are now deduplicated and repairable task reads return
an exact cause-plus-action sentence: “Recorded failure: … Repair and retry it?”

**Transport guarantee:** Another repeated call spoke the exact goodbye but omitted the
model tool call, proving prompt-only closure cannot be made deterministic. The AirPods
client now detects explicit human end intent and, after a 600 ms window for Gemini's
own tool call, obtains the audited `end_voice_session` receipt itself. Duplicate calls
are suppressed. Spoken priority titles are capped at five words so a useful next-step
question cannot turn a status briefing into a monologue. The production build and all
20 focused tests pass.

**Reference recovery:** A subsequent production run showed Gemini receiving the exact
task UUID, then hallucinating `bobby-AOM-Sales-Bible.pdf` as the read identifier. The
broker now recovers the latest ranked priority from the same tenant/session's audited
workspace receipt when the model supplies an invalid identifier. This is read-only and
prevents the agent from asking the caller to reconstruct context it already fetched.

**UUID correction:** The first recovery pass covered malformed identifiers. A live
repeat showed Gemini can instead produce a syntactically valid UUID with one wrong
character. Task inspection now retries the session's audited priority when the supplied
UUID is valid-shaped but absent from the tenant, preserving the same read-only boundary.

**Repeatability passes 2–3:** Facts, routing, retry capability, dated evidence, and
audited endings stayed correct. Gemini intermittently appended “What's next?” or a
generic choice after already-complete briefings, creating 25–28 word turns. Those
phrases now fail the filler score. AirPods operational generation is deterministic at
temperature 0, and the companion-next-step rule explicitly exempts completed status
and evidence reads so they stop instead of manufacturing a check-in.

**Stale-memory removal:** The first deterministic run answered the outreach follow-up
from an older Bobby task in injected room context instead of calling the fresh task
receipt. Global AirPods sessions no longer receive volatile room messages, task lists,
completion lists, agent statuses, or room tape in their initial prompt. Those remain
available to normal room calls. AirPods operational claims must now come from its fresh,
tenant-scoped read tools, removing the pathway for confident stale-memory answers.

**Adversarial evidence pass:** Corner correctly named the dated Business Ops/GitHub
search and explicitly said live App Store Connect was not checked. When asked for the
next action, it resolved the Business Ops room but borrowed “Creating that mission”
from legacy room-call tool descriptions. Global AirPods sessions no longer receive
`create_project`, `create_mission`, or project-context tools; internal work stays on
`create_task`, and navigation stays on room tools. Unverified follow-ups now answer only
the missing live boundary instead of repeating the full record.

**Adversarial refinement:** The isolated-tool rerun remained honest but used 36 words
to explain provenance and proposed an unrelated workspace refresh. Evidence reads now
return `provenance_summary` and `unverified_summary` as concise broker facts. When no
direct external tool exists, the single next action must be an approval-gated
`create_task` for that exact external verification—not generic status or navigation.

**Self-evidence and authorization correction:** One adversarial run prematurely
created a QA verification task; that task was deleted immediately. Its existence then
polluted the next evidence search, proving action chatter must never be factual proof.
`airpods-mode` task messages are now excluded from evidence. Asking for the “best next
step” is explicitly non-authorizing: voice must offer a concise verification task and
wait for approval before calling `create_task`.

**Acknowledgement exclusion:** Deleting the QA task left its `task-ack` message behind;
that acknowledgement then outranked the durable App Store completion receipt. The
single QA acknowledgement was removed, and `task-ack` is now excluded from factual
evidence. `offer_next_action` is marked mandatory for unapproved work, with explicit
instructions never to narrate a fake approval card or its steps.

**Final production proof:** Three consecutive core production gauntlets passed every
check with 13–23 word factual turns, exact task-failure receipts, one executable retry,
dated App Store evidence, no filler, and audited two-word endings. The final skeptical
gauntlet also passed: 23-word bounded answer, 13-word provenance, 7-word unverified
boundary, 6-word approval-backed next action, and no task execution. All 74 QA-only
action audits were removed. The accidental QA task and its acknowledgement were also
removed. Deployment `aom-studio-2ptqc6ep0` reached READY on production.

**Native build 10:** The deterministic client-side end-receipt fallback was synced into
Capacitor, versioned as Corner 1.0 (10), and archived successfully with the registered
ad hoc profile and Apple Distribution identity. Patrik's iPhone was unavailable to
CoreDevice, so installation remains pending reconnection; server-side conversation
behavior is already live and requires only a fresh voice session.

**Status:** complete — production conversation contract proven; physical build 10 install pending phone availability

### R10 — Follow-up reasoning and task failure receipts (2026-08-09)

**Real-call evidence:** In session `c7d962ce`, Corner introduced two failed outreach
tasks, then could not answer why they failed. It ignored the task IDs already returned
by `read_workspace_status`, guessed noncanonical room keys, asked Patrik to reconstruct
the room structure, and changed the subject to App Store credentials.

**Root cause:** Both voice-created tasks were rejected with `metadata.repo missing;
front desk must set it`. The first was incorrectly assigned to Cleo; the attempted
correction created a duplicate Jacob task. Voice had no direct task-inspection route,
and room resolution accepted canonical keys but not the mission slug shorthand the
model supplied.

**Scope:** Make voice-created work executable with authorized repo/path metadata; add
receipt-backed task inspection; accept exact registered slugs as room shorthand; and
require follow-ups to use prior tool entities without changing subjects.

**Verification:** API syntax, 20 focused tests, and the production web build pass. An
authenticated local-handler probe against the exact failed Jacob task returned its
real production error and a correct spoken explanation. The single test audit row was
removed after verification.

**Production result:** Commit `cbbf18e2` fast-forwarded `main` and the verified
`aom-studio` production deployment reached READY. A canonical authenticated session
exposed `read_task_status`; the canonical action returned the real missing-repo failure
for the Jacob task. The test-only action audit was removed.

**Status:** in progress — phone conversation retest pending

### R9 — Native authenticated data origin (2026-08-09)

**Physical finding:** Corner 1.0 (7) installed and launched, but rooms and API-backed
content did not load. The bundled native bootstrap targeted the apex AOM domain, which
returns a 308 to the `www` canonical domain. WebKit drops the bearer token when an
authenticated fetch redirects across origins, leaving login intact but tenant APIs
unauthorized.

**Scope:** Point the native API bridge directly at the canonical `www` origin, add a
regression contract, rebuild, install, and repeat the physical data/voice smoke test.

**Physical result:** Corner 1.0 (8) archived, installed, and launched on Patrik's
registered iPhone. After launch, production logs showed authenticated HTTP 200 results
for room messages, missions tree, trackers, preferences, agent settings, room goals,
and workspace status on the final `www` host. This directly closes the build-7 data
authorization failure.

**R9 follow-up:** The server-side 200s did not prove WebKit could expose responses to
the app. Physical inspection still showed an empty shell. A native-origin preflight
reproduced the remaining boundary: protected dashboard endpoints can return 401 to
`OPTIONS`. Enable CapacitorHttp's native fetch/XHR patch so the installed app is not
subject to browser CORS preflights.

**Verification:** 20 focused tests and the production-configured web/native build pass.

**Native release:** Corner 1.0 (9), with CapacitorHttp enabled, archived, installed,
and launched on Patrik's registered iPhone.

**Status:** in progress — physical room-content and voice receipt confirmation pending

### R8 — Capability routes from real-call audit (2026-08-09)

**Evidence:** Six production voice sessions were joined to their durable action records.
The audit found a failed room read (`messages.mission` does not exist), conversational
room names that could not resolve `corner:airpods-mode`, an improvised “close room” claim,
an unlogged local-only end-session tool, unaudited fresh reads, and a mistaken task
assignment that was “corrected” by creating a duplicate instead of reassigning the task.

**Scope:** Add receipt-backed close-room, end-session, and task-reassignment routes;
repair mission room reads and conversational matching; audit every fresh read without
replaying stale results; and harden the live prompt against unsupported completion claims.

**Verification:** 19 focused tests, API syntax checks, the production web build, and
live authenticated broker probes pass. The live probes proved close-room and
end-session return receipts and write successful action-audit rows. Build 7 carries
the matching native UI-effect and session-ending client behavior.

**Production result:** Commit `64604e28` fast-forwarded `main`; the verified
`aom-studio` production deployment reached READY. The canonical dashboard returned
HTTP 200 and served the build containing the close-room effect; both voice endpoints
continued to reject unauthenticated requests. Signed Corner 1.0 (7) archived
successfully for Patrik's registered iPhone.

**Status:** in progress — physical build 7 installation and voice smoke test pending;
macOS currently reports the registered iPhone unavailable and does not see it on USB

### R7 — Native dark glass and current-source voice (2026-08-09)

**Evidence:** Physical build 5 proved the native shell was live, but login inherited a
saved daytime web theme. In the same device pass, Corner Voice incorrectly denied the
known App Store submission because it only held one room's snapshot and could not make
a fresh tenant-wide evidence check.

**Implemented:** Native login is pinned to a safe-area-aware dark frosted-glass card.
The AirPods broker adds a non-replayed `read_recent_activity` action that searches
tenant-scoped Corner room history and, for the AOM world only, recent configured GitHub
commits. Every result includes a dated source label; source availability is explicit,
and voice is instructed that no match is not proof an event did not happen.

**Native release:** Production-configured, Ad Hoc-signed Corner 1.0 (6) archived,
installed, and launched on Patrik's connected iPhone.

**Production result:** Release commit `f4bbb8c8` fast-forwarded `main`. The verified
`aom-studio` deployment reached READY. Canonical `https://www.aheadofmarket.com`
returned HTTP 200 for the dashboard; authenticated calls returned 200 from the new
activity action and exposed `read_recent_activity` in the live AirPods tool catalog.
A production-data probe found the App Store/TestFlight evidence in
`corner:business-ops`. The accidental isolated Vercel project created during linking was
removed; it was never used as production proof.

**Status:** in progress — physical dark-login and AOM voice-question confirmation pending

### R1 — Global voice operating layer (2026-08-08)

**Scope:**

- Promote CV6 voice from a room-composer feature to a dashboard-wide session.
- Add activation, brief narration, attention batching, safe action execution, and
  room-aware conversation handoffs.
- Add the web/native boundary and an iOS packaging path.
- Preserve tenant isolation, verified speaker attribution, and existing CV6 changes.

**Implemented:**

- Global CV6 AirPods provider with wake/shortcut/button activation, explicit states,
  settings, quiet hours, and proactive attention batching.
- Gemini Live sessions use short-lived ephemeral tokens; tool calls route through a
  tenant-verified, allowlisted, idempotent, audited action broker.
- Durable sessions, room segments, action audit entries, attention queue, and a
  structured-handoff migration with no raw-audio storage.
- Capacitor iOS shell with native on-device “Hey Corner” detection, voice audio mode,
  lock-screen audio entitlement, and media-control activation.
- Simulator target compile-check completed successfully with Xcode 26.3.

**Verification:**

- `npm run test:airpods` — 6/6 passed.
- `npm run build` — passed.
- API syntax + `Info.plist` validation — passed.
- `xcodebuild` iOS simulator compile — passed.
- Tenant context and identity contracts — passed. The aggregate tenant command still
  reports two unrelated, pre-existing hardcoded slugs in `api/client-parts.js` and
  `api/prospect-report.js`.

**Release configuration:**

- Apply `supabase/migrations/20260808000000_airpods_mode.sql` before enabling the mode.
- `AIRPODS_CONFIRMATION_SECRET` may be set to a dedicated HMAC secret; the service-role
  key is the server-only fallback.
- `VITE_CORNER_API_ORIGIN` overrides the native shell API origin; the default is
  `https://lab.aheadofmarket.com`.
- A signed physical-device/TestFlight pass remains required to validate long-running
  lock-screen behavior and permissions under App Store conditions.

**Status:** complete — implementation and simulator verification shipped; release validation remains

### R2 — Production mobile-web release (2026-08-08)

**Scope:**

- Isolate R1 from unrelated shared-workspace changes in a clean release tree.
- Apply the AirPods data migration to the production Supabase project.
- Deploy to the verified `aom-studio` Vercel project and validate the canonical
  `https://aheadofmarket.com/dashboard` surface on a mobile viewport.
- Keep native-only wake phrase and lock-screen behavior clearly separated from the
  mobile-web button experience.

**Release decision:** The native shell fallback API origin was changed from the staging
Lab host to the canonical production origin, `https://aheadofmarket.com`. A future
staging build must set `VITE_CORNER_API_ORIGIN` explicitly.

**Production migration:** Applied only `20260808000000_airpods_mode.sql` to the linked
Supabase production project and marked that exact version applied. Bulk `db push` was
not used because the local migration directory contains unrelated historical versions
that are absent from the remote ledger.

**Clean-release verification:**

- Vercel link inspected: project `aom-studio`, ID
  `prj_QevbLDIRNclQwfVBuzahOtF7NuDC`, Ahead's projects scope.
- AirPods tests — 6/6 passed.
- Tenant context and hardcoded-identity contracts — passed.
- API syntax and `git diff --check` — passed.
- Production Vite build — passed from the isolated release worktree.

**Production result:**

- Release commit `ab2f6aea` was pushed as a fast-forward to `main`.
- Vercel Git deployment `aom-studio-15z75l2kp-aheads-projects-d2a4c70f.vercel.app`
  reached READY for project `aom-studio`.
- Canonical `https://aheadofmarket.com/dashboard` returned HTTP 200 at a 390×844
  mobile viewport. The available test browser was not signed in, so it correctly
  redirected to `/login`; authenticated visual interaction remains a user smoke test.
- All four `airpods_*` tables were verified in production.
- Both new production API routes were verified present and correctly returned 401
  `jwt required` without a session.
- `npm ci` reported 29 dependency-audit findings in the existing dependency tree
  (1 low, 15 moderate, 11 high, 2 critical); no automatic breaking audit fix was run.

**Status:** complete

### R6 — Trusted handoffs and deterministic room navigation (2026-08-08)

**Evidence:** Authenticated post-release use exposed two coupled failures. Internal
approval-control text (`Use action ... with these arguments`) was persisted as a human
voice turn and routed into Business Ops, where the room agent correctly classified it as
prompt injection. Separately, the live model proposed `open_room` with empty arguments,
so the voice layer could claim progress without resolving or verifying a destination.

**Scope:**

- Separate real human speech/text from client-generated control turns throughout the
  transcript and handoff pipeline.
- Resolve rooms against an authoritative tenant-scoped room directory before navigation;
  reject ambiguity and missing destinations with actionable alternatives.
- Return navigation receipts to Gemini only after CV6 acknowledges the requested surface.
- Harden room handoff provenance so downstream agents can distinguish trusted voice
  summaries from user instructions and never execute embedded control syntax.
- Add regression, adversarial, and longer multi-room conversation tests.

**Implementation:**

- Added canonical `room_key` resolution with ambiguity refusal, tenant/project access
  checks, room discovery, and fresh room-status reads.
- Added a request/receipt navigation protocol. Voice now receives success only after
  CV6 accepts the room or tool destination; rejected and timed-out moves remain errors.
- Split human speech, typed turns, QA scripts, and system controls. Approval CTA and
  navigation receipts remain inside the live model session but never enter user history.
- Versioned downstream handoffs as trusted server artifacts and removed control/QA
  turns before summaries, room segmentation, or agent delivery.
- Preserved natural voice-session ending and the latest room-reliability contracts from
  production while integrating the action-first voice canvas.

**Verification:** Focused AirPods suite 16/16, API syntax, `git diff --check`, and the
clean production Vite build all pass. Authenticated production multi-room testing is
the remaining release gate.

**Status:** in progress

### R5 — Phone entry, shared-control voice cockpit, and room intelligence (2026-08-08)

**Evidence:** Physical follow-up testing found the control available on iPad but absent
on iPhone. Conversation worked, but the speaking state had no useful visualization,
controls felt oversized, room references were weakly grounded, work execution was
unclear, UI-navigation claims were not trustworthy, and the ending was awkward.

**Scope:**

- Make the voice entry persistent and visible at phone widths across Home and Chat.
- Ship a slimmer, more advanced voice cockpit with speaking/listening visualization.
- Ground the agent in the actual room inventory and active room, give it truthful UI
  navigation and scoped work actions, narrate cross-room state clearly, and recognize
  natural requests to end the conversation.

**Implementation:**

- Moved the phone entry from individual React headers into the CV6 shell, which also
  covers the template-rendered iPhone Home surface that caused the missing control.
- Rebuilt the compact menu as a 296 px voice cockpit with animated speaking/thinking
  signal, shared-screen context, live transcript, and explicit action receipts.
- Supplied the authenticated visible-room catalog to the voice session and added
  tenant-authoritative room listing, room reads, UI navigation, task-backed work, and
  a natural `end_voice_session` handoff.
- Tightened the system contract so the agent cannot claim a room read, screen change,
  or completed action until the corresponding tool reports success.

**Verification:**

- Focused AirPods suite — 12/12 passed.
- Production Vite build — passed.
- API syntax and `git diff --check` — passed.
- Authenticated local CV6 visual QA passed at 390×844 and 768×1024. Each viewport
  exposed exactly one top-menu entry, had zero horizontal overflow, and rendered the
  296×176 menu fully inside the viewport without covering the composer.

**Production result:**

- Commit `842747e4` fast-forwarded `main` and deployed to the verified `aom-studio`
  production project as `aom-studio-abzvqvu3f-aheads-projects-d2a4c70f.vercel.app`.
- The deployment reached READY; canonical `https://aheadofmarket.com/dashboard`
  returned HTTP 200 and served the new shared-screen and natural-session-end markers.
- Both protected voice APIs were verified present and returned 401 without a signed-in
  Corner session.

**Status:** complete

### R4 — Constrained Gemini credential repair (2026-08-08)

**Evidence:** The first physical session stored Google's WebSocket close message:
`Method doesn't allow unregistered callers`. The API successfully minted an ephemeral
token but paired it with the API-key-only `BidiGenerateContent` method.

**Scope:** Return the verified `BidiGenerateContentConstrained` socket URL whenever the
browser receives an ephemeral token, preserving the server-side long-lived key.

**Verification:** Live production probes reproduced close 1008 on the standard method
and reached `setupComplete` on the constrained method. API syntax, diff checks, and the
focused AirPods suite pass (9/9).

**Production result:** Commit `635cdeb9` fast-forwarded `main`; verified `aom-studio`
deployment `aom-studio-ezlf1skel-aheads-projects-d2a4c70f.vercel.app` reached READY.

**Status:** complete

### R3 — Mobile legibility and voice handshake recovery (2026-08-08)

**Evidence:** Physical iPhone/AirPods testing showed the floating panel overlapping the
CV6 composer with low-contrast inherited tokens and oversized settings controls. The
microphone activated, but the session stayed on “Connecting…” and Corner never greeted
the caller or advanced into a usable conversation.

**Scope:**

- Replace the mobile panel with an opaque, compact, CV6-safe surface that never covers
  the message composer; move advanced settings into a readable sheet.
- Put one persistent headphones control in the desktop bar and the mobile Home/Chat
  headers.
- Gate microphone frames on Gemini's setup acknowledgement, send a short greeting turn,
  include the PCM sample rate, time out stalled connections, and support retry.

**Verification:**

- Focused AirPods tests — 8/8 passed, including handshake ordering and header presence.
- Production Vite build — passed from the isolated R3 release worktree.
- 390×844 visual check — menu measured 320×169 at the top edge, used opaque cool-ink
  colors, and did not overlap the composer (`menu.bottom=235`, `composer.top=758`).
- `git diff --check` — passed.

**Production result:**

- Release commit `43877d24` fast-forwarded `main`.
- Verified project `aom-studio` deployment
  `aom-studio-dwnyk4c9u-aheads-projects-d2a4c70f.vercel.app` reached READY.
- Canonical `https://aheadofmarket.com/dashboard` returned HTTP 200 after redirect and
  its served main asset contains the new greeting, retry, sample-rate, and top-menu UI.

**Status:** complete

### R17 — The assistant could not hold a conversation, and the suite was enforcing it (2026-08-09)

**Evidence:** Patrik, on the live product: "when I have conversations with the
corner assistant it just cant hold a conversation like we do or dive into things
too much." Diagnosed by running real multi-turn sessions rather than by reading
the prompt.

**Root causes — four, and only one of them was the prompt:**

1. `voice-session.js` ended the AirPods block with "HARD SPOKEN OUTPUT CONTRACT:
   routine responses are at most 22 spoken words", over a base prompt still
   telling the concierge it is "NOT a planner, NOT a critic, the Claude team
   handles the thinking, DO NOT push back". AirPods inherited the room widget's
   router framing. Role and voice are now mode-dependent.
2. `airpods-action.js` was dictating the words, not just the facts.
   `read_workspace_status` built `spoken_summary` as `<5-word title> is <status>`
   joined by semicolons and returned `response_contract: 'Say only
   spoken_summary'`. No prompt could beat an explicit say-only-this contract.
   Same in `read_task_status` (raw error columns) and `read_recent_activity`,
   which carried a SECOND "at most 22 words" cap on the most substantive
   question type in the product.
3. Asked "is that the same thing you mentioned at the start of this call", it
   called `read_recent_activity` and answered "I did not find a matching record."
   It searched the database to recall its own conversation.
4. `airpods-conversation-gauntlet.mjs` asserted `wordCount <= 24` on every
   substantive turn, so each round of tuning made it shallower and no later
   round could undo it without going red. It also opened sessions as `rex` while
   the product mounts `corner` — it was tuning a different agent.

**Also found while measuring:**
- `generationConfig` never carried `temperature`. Computed, returned, dropped.
  The dashboard slider controlled nothing; the AirPods 0.0 override was a no-op.
- `TODAY` and `read_recent_activity`'s date both rendered UTC on a UTC server,
  so after ~5pm Phoenix every dated claim named tomorrow. Measured: it told the
  caller a task it had just created landed "today, August 10th" at 18:07 on the 9th.
- No `contextWindowCompression`: a session TERMINATED at its context ceiling
  rather than rolling. The 8-minute call in R4 was a ceiling, not a success.
- `silenceDurationMs: 2000` — two seconds of enforced dead air per turn.
- `repairableScope` did not match "repo lock held by zombie", so the assistant
  could explain a stuck task and then had no retry to offer.

**NO DEEPER MODEL EXISTS.** Probed the production key against every Pro and
thinking Live variant; all return 1008 "not found ... for bidiGenerateContent".
Only `gemini-3.1-flash-live-preview` and
`gemini-2.5-flash-native-audio-preview-09-2025` accept a session. Depth has to
come from the prompt and the broker. Recorded so nobody re-runs the probe.

**Measured, live, same questions before and after:**

| turn | before | after |
|---|---|---|
| "why is that the top one" | 18w record echo | 35w explanation |
| "walk me through what has to happen" | 23w + a pitch | 55w walkthrough |
| "what would you do, and why not the other" | 37w | 55w with the comparison |
| "is that the same thing" | searched, found nothing | answered from memory |
| first word out of its mouth | 2s VAD + 7.1s median | 0.7–2.2s |
| the opening briefing | `Finalize contact list research is failed; Mobile reskin R2b — CHAT: is failed.` | `Two things need you: Jacob's Finalize contact list research failed, started yesterday, and Bobby's Mobile reskin R2b failed, started three days ago.` |

**Verification:** shipped to production and confirmed on the live endpoint the
phone actually calls (`nativeBootstrap.js` defaults to www.aheadofmarket.com):
temperature 0.85 present, contextWindowCompression present, sessionResumption
present, silenceDurationMs 700, no 22-word cap, assistant framing present,
`TODAY: Sunday, August 9, 2026`. Gauntlet `core` **17/17 green on production**.

**Status:** complete, with three known reds carried forward.

### R18 — Open: three reds on the skeptical scenario (2026-08-09)

`skeptical` finishes 11/14 on production. Not loosening the checks to clear them.

1. *Provenance is inconsistent, and this one is real.* Asked what it checked, it
   said "Checked GitHub mrg33k/aom-studio ... 2 matching commits" one turn after
   quoting a **Corner room** record from corner:business-ops. It reported the
   wrong source for the evidence it had just given. `provenance_summary` is built
   from `primary.source_label` while the spoken answer blends `items[]`, so the
   two can disagree. Fix: make the spoken answer cite the same record provenance
   describes, or drop provenance to whatever the answer actually used.
2. *The proposal card is not being raised.* It says "I can queue a task to verify
   the actual submission status. Want me to?" in words but does not call
   `offer_next_action`, so there is no card and no approval path. Spoken intent
   without the structured action is the failure mode R4 built that tool to stop.
3. *Grading keyword.* "explicitly dated and bounded" requires the literal word
   "unverified"; the answer bounded itself with "but I haven't checked" instead.
   Substantively correct, keyword miss. Lowest priority of the three.

**Still open from earlier rounds, unchanged by R17:** `VoiceChat.jsx` has no
`goAway` or `onclose` recovery, so a dropped signal still ends a call outright.
`sessionResumption` handles are now being issued — the server half exists and the
client half does not.

### R18 — The three reds, and a suite that had rotted into enforcing the bug (2026-08-10)

**Trigger:** Patrik, on the R17 summary card: "Yes, do those." The three reds
R17 refused to paper over.

**Baseline, measured before touching anything:** production `skeptical` 11/14.
Three fails, and only one was the one R17 predicted — the model is
non-deterministic, so the red set moves between runs while the underlying
mechanisms stay put.

**1. It named the wrong source for the evidence it had just given.**
`readRecentActivity` merged room records and commits with
`sort((a,b) => timestamp)` — discarding the relevance score BOTH sources had
just computed one function earlier. Reproduced on production before the fix:
query "App Store submission" returned as its primary record a commit titled
*"the second word cap was hiding inside the evidence tool"*. Newest, and about
nothing the caller asked. The spoken contract pointed at that commit while the
model sensibly answered from the business-ops room record further down
`items[]`; provenance then read out the commit's source. Not a wording bug — a
ranking bug wearing a wording bug's clothes.
- Relevance first, recency as tie-break.
- A phrase-match bonus (+3), because a record containing the caller's actual
  phrase is about their subject and one scattering the same words usually is not.
- Our own commits excluded (`corner:airpods-mode`, `corner:voice-chat`) — the
  commit-side half of the self-evidence rule room messages already had. Needed
  immediately: the R18 commit message itself says "App Store" a dozen times and
  outranked the provisioning receipt within an hour of shipping the first half.
- `provenance_summary` now states what was USED and demotes everything else to
  "also searched, not quoted"; `evidence_used` pins answer and provenance to the
  same record.

**2. A spoken offer that never became a card.** Measured: *"I can queue a task
to verify the App Store status. Want me to?"* — no tool call, so no card, so the
caller's "yes" had nothing to land on. Three layers, because the prompt had
already lost this argument once:
- the evidence tool returns a well-formed `create_task` next_action, with
  project + mission_slug carried out of the record via `roomTaskScope` so the
  card would actually execute rather than fail on missing scope;
- its `response_contract` makes the call mandatory in the same turn;
- `VoiceChat.jsx` raises the card itself when a turn speaks an offer and no
  `offer_next_action` fired.

**3. A dropped signal ended the call.** `sessionResumption` handles had been
issued since R17 with no client replaying them. The client half now stores each
`sessionResumptionUpdate` handle and replays it in the setup message after
`goAway` or an unclean close: same conversation, no greeting, no re-sent opening
prompt. Only the socket is rebuilt — the microphone, audio graph and worklet stay
up, which is also why no second user gesture is needed on iOS. Three attempts with
backoff (0.4s / 1.5s / 4s); never after a deliberate hang-up (`manualStopRef`),
never on a connect that never worked (`everReadyRef`), and bound in `onerror` too
because browsers fire error before close and the old teardown won the race.

**The suite had rotted into enforcing the bug.** `tests/airpods-mode.test.mjs`
had been failing since R17 and failing in the worst direction: it asserted the
22-word cap, `temp = 0.0`, `response_contract: 'Say only spoken_summary'` and
"Include calendar_date" — every one of them deliberately deleted by R17 as the
cause of the shallowness. Re-pointed at the current contract and INVERTED where
the old rule must never come back (`doesNotMatch`). The gauntlet's
unverified-boundary check graded WORD ORDER: it failed *"The current live status
in App Store Connect is still unverified."* because the literal string "app store
connect status" was absent. Grades substance now; both halves still required.
Nothing was loosened.

**Two speech defects surfaced by consecutive core runs and fixed in the same pass:**
- the briefing read a raw title whole — *"Mobile reskin R2b — CHAT: steps flow
  through the bar, one card that never grows"* — the last field still passing
  through unphrased. Cut at the first structural separator, cap the tail.
- *"It looks like we can repair and retry it"* — hedging a diagnosis it had just
  read. The prompt already banned "looks like" and lost, so the ban moved into
  the tool contracts, where two rounds have now proved contracts beat the prompt.

**Verification (all on production, the endpoint the phone calls):**
- `skeptical` **14/14**, twice. First time green since the scenario existed.
- `core` **17/17**.
- Focused suite **24/24**.
- Live endpoint probe: provenance, `evidence_used`, spoken summary and the
  proposal's project/mission all name the same business-ops record.
- Served production bundle greps positive for `sessionResumptionUpdate` and
  `client_backstop` — the client half is really deployed, not just committed.
- Dashboard renders signed-in at 1440×813 with the headphones control mounted.

**Not verified:** the reconnect path has not survived a real dropped call on a
phone. It is code-verified, unit-pinned and live; it needs one walk out of Wi-Fi
range to be called proven.

**Housekeeping:** production disk was at 100% (118Mi free) and the build could
not write `dist/`. Four stale release worktrees removed after confirming every
HEAD was an ancestor of `origin/main` — the same stale-worktree population that
caused the 2026-08-07 deploy clobber. 8.1Gi free after.

**Production result:** commits `ec61108b`, `b5df6ef6`, `da65f322` on `main`;
deployed from a worktree created fresh at `origin/main`, rebased onto a
concurrent `corner:bridge` push before the final deploy so it could not revert
another agent's work.

**Status:** complete
