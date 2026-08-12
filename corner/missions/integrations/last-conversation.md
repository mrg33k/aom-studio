# Integrations — Last Conversation

## 2026-08-08 — Production/staging policy correction

Patrik clarified that Lab is staging, not production. The current round is auditing and correcting documentation, workflows, and release checks so production is the default deployment target and Lab is used only when explicitly requested.

The correction is complete. Agent guidance now makes `aom-studio` / `aheadofmarket.com/dashboard` the default and prohibits Lab use without an explicit request. The Lab workflow is manual-only, the local Vercel link points at production, the deployment staleness script queries the production project by name using JSON, and historical Lab release notes now identify those checks as staging rather than production proof. Syntax and live production-staleness validation passed. Unrelated shared-workspace changes were preserved.

Commit `d746f68d` was pushed through `main`. Production deployment `dpl_DuDDN31zBi3ipqkWfMuwzugGDrsA` reached Ready on `aom-studio`, listed the canonical AOM aliases, and the real dashboard served its new entry asset. A separate query of `aom-studio-lab` showed that Lab remained on the older `f537745c` staging deployment, confirming the push did not touch staging.

## 2026-08-08 — OpenAI room brain

Patrik approved an AOM-managed OpenAI brain for chat rooms. The first release uses a private server-side Platform key, keeps BYOK out of scope, and meters every request by authenticated tenant and user. The dashboard picker now includes OpenAI GPT-5.6, validates saved providers, and reports failed saves. Migration `20260808180000` adds a service-role-only usage ledger with atomic monthly reservation and finalization RPCs.

The bridge now hard-routes selected OpenAI rooms through the Responses API with bounded room context, `store: false`, medium reasoning, a pseudonymous safety identifier, and no silent Claude fallback. Its release commit `0fba324d0` is live and the daemon restarted cleanly. Unit, API, focused browser, build, migration, and responsive in-app checks pass. The real upstream smoke reached OpenAI and recorded a request ID, but the current project returned `credit_balance_exhausted`; enabling OpenAI Platform billing is still required for successful answers.

Dashboard commit `310bf1f8` was pushed to `main`. Vercel deployment `dpl_DNQVDyip2beokkwmA4RDT7J5uPyU` reached Ready on `aom-studio`, the production staleness guard matched the release, and the canonical deployed bundle contains the OpenAI picker. The canonical dashboard sent the unauthenticated verification browser to `/login` as expected; authenticated picker behavior remains covered by the passing focused browser test.

## 2026-08-08 — Corner Runner

Patrik approved a local runner so every Corner user can select `Codex on this computer`, authenticate with their own ChatGPT subscription, and let Corner work only inside a folder they choose. The release uses expiring one-time pairing, device-bound tokens stored only on the computer, outbound HTTPS polling, and the Codex CLI’s workspace sandbox. Corner never receives ChatGPT credentials and opens no inbound network port.

The production database migration `20260808213000`, dashboard pairing/status UI, queue APIs, downloadable Node runner, and central-bridge handoff are live. Dashboard commit `7d15a83c` deployed as Vercel production `dpl_5noRFqS8fvzQDsBwwuqbpNXHjez9`; bridge commit `6b56db4ad` is on `master`, and the daemon restarted cleanly as PID 1763. Eighteen Node tests, two focused browser flows, the production build, syntax checks, mobile/desktop visual QA, remote migration history, canonical runner download, and safe live API failure paths all pass. The first authenticated paired-computer turn remains the user-level acceptance check.

## 2026-08-11 — Auto falls back to Codex

Patrik reported that the Claude organization subscription was disabled and Auto exposed the failure instead of switching models. The audit found that Codex existed only as an explicit room route, the bridge's automatic ladder started with hosted providers, and the exact production banner put “disabled” before “subscription,” outside the old usage-limit matchers.

R4 makes an online paired Corner Runner the first Auto fallback. The authenticated dashboard write path strips untrusted fallback metadata and stamps the sender's verified online device. When Claude fails, the bridge reads the original message row, rechecks user, tenant, device ownership, revocation, status, and heartbeat freshness, then idempotently queues the turn before Gemini/Kimi/DeepSeek. Receipt bookkeeping cannot trigger a duplicate second lane after the durable job exists.

The authenticated dashboard session paired this Mac as `AOM Studio Mac`, limited it to the AOM-EA workspace, and installed a persistent LaunchAgent. Pairing exposed a separate production defect: `https://aheadofmarket.com` redirects to `www` and strips the runner Authorization header. The downloadable runner and this device now use the canonical `https://www.aheadofmarket.com`; the device is heartbeat-online. Focused Node and bridge suites, Python compilation, and the Vite production build pass.

Dashboard/API commit `d653658f` deployed as Vercel production `dpl_DnkcJcNED91VJoARWrqkRGjm2guf`; the canonical site serves the new Auto label and corrected runner. Bridge commits `e090cc81a` and `cb36f5376` are on `master`, and the daemon restarted healthy as PID 90621. The first live smoke exposed that the final transcript delivery path still treated the disabled-subscription banner as an answer; `cb36f5376` unified final-block API errors and limit banners under the fallback classifier. The second authenticated smoke, turn `5234926d`, then queued job `051f5a81` and returned exactly `FALLBACK_SMOKE_OK_2` from source `corner-runner` with `local_codex: true`. Live counters read one queued Codex fallback and zero unavailable.

## 2026-08-11 — Codex activity is visible and fallback is sticky

Patrik reported that Wolfpack showed neither the normal progress bar nor current steps on web/mobile, while old steps appeared later. The live audit found that local Codex completed the first turn in about 12 seconds, but the runner discarded all `codex exec --json` stdout and posted only the final response. The shadow SSE room bridge also accepted the same server-verified local turn, producing hosted notices/replies and confusing step ownership.

R5 converts only safe Codex lifecycle events into the existing `message_step` contract: the device claim, generic project-reading/checking/editing labels, and a settled sentinel. Raw commands, paths, reasoning, and credentials never enter the event stream. Progress writes require the authenticated device plus an active matching job and derive tenant, room, agent, project, and parent message from the original server-owned row. Because CV6 desktop and mobile already consume this same endpoint, both now receive the indicator without separate UI forks. The shadow bridge independently re-verifies the stored local marker and matching user/tenant/device job before yielding.

Patrik then clarified that fallback mode should remain on Codex instead of probing Claude on every turn. A successful Auto fallback now writes `codex-local` into the room's existing Settings preference; choosing Auto/Claude in Settings is the explicit switch back. Wolfpack was set to `project:wolfpack = codex-local` immediately. Dashboard/API commit `3363db1b` and docs commit `b3bab658` deployed as production `dpl_H4TzdxqTqczy4M1D8adpeT6FKNYn`; bridge commits `5dbf5bcf6` and `d1b8141b2` are on `master`. Live runner job `15c7dcd0` emitted visible Corner Runner steps and settled before writing a `local_codex: true` reply, and the restarted shadow bridge returned `localRunner: true` for a verified ownership probe.

## 2026-08-11 — Public newcomer onboarding full pass

Patrik defined the public first-run experience: people should be able to begin
free with notes and a Corner brain, choose their preferred future AI connection,
bring files, optionally make Gmail or Outlook searchable, and arrive at a useful
set of projects without understanding Corner's internal project/mission/agent
taxonomy. This must work on web and native iOS and remain available later from
Settings.

R6 replaces the old questionnaire with a guided welcome/brain/sources/work/review
flow and gates incomplete accounts into it. Email account creation and Apple,
Google, and Microsoft entry are now present. Mail permission is requested later
and separately with Gmail readonly or Microsoft Mail.Read scopes. The flow stages
files, creates a workspace plus starting project rows and a Corner guide, records
the selected brain, then completes account metadata. The native implementation
mirrors those decisions, launches mail OAuth with the signed-in JWT, picks files
natively, and establishes the new tenant before guarded uploads.

Eight focused tests pass, the Vite production build passes, an iPhone 17 simulator
build succeeds, and browser QA reached the complete review screen at 390×844 with
no horizontal overflow. This code is not deployed. Provider credentials/consent
publishing, production callback allowlists, real clean-account acceptance, iOS
signing/archive, and App Store metadata remain. Claude/ChatGPT/Gemini preferences
are collected honestly, but consumer subscription connectors still depend on
their separate provider/MCP approval or the existing local Corner Runner.

## 2026-08-11 — R7 production auth activation and acceptance

Patrik asked to activate Apple/Google/Microsoft in Supabase, publish Gmail and
Microsoft consent, deploy the web release, and exercise one entirely new account
on production. The audit found the linked Supabase project still used
`http://sourcing.directory` as its Auth site and had no redirect allowlist or
enabled social providers. Google mail credentials already existed, while
Microsoft mail and Apple web-auth credentials did not.

Supabase Auth now uses `https://www.aheadofmarket.com`, accepts both AOM web
origins and `corner://auth-callback`, and has Google enabled with the existing
`corner-integrations` OAuth client. That client now includes the Supabase
callback. Google shows External / In production. Gmail API is enabled and
`gmail.readonly` is registered, but Google marks it restricted and requires a
written use case plus a YouTube demo before verification can be submitted.
Microsoft console access stopped at login, and Apple still needs its Developer
Services ID/key and rotating web secret.

Commits `236a2ecf` and `f7d43fcc` deployed to canonical production. A brand-new
email account entered onboarding. The first finalization exposed that
`create-agents` compared a workspace slug against `worlds.client_id` UUID;
PostgREST rejected it and the fail-closed branch mislabeled every workspace as
claimed. The fix queries `worlds.slug`, redeployed as production
`dpl_BTyJZjF9nHHr6xABPpz7SVKpnc9k`, and the clean account then reached
`YOUR CORNER IS READY`. The temporary user was deleted. The release branch was
pushed as `codex/corner-full-pass-r16`.
