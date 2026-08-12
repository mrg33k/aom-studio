# Integrations — Mission Build Plan

**Started:** 2026-08-08
**Mission path:** `corner:integrations`

## Rounds

### R1 — Make production the default deployment target

Correct repository guidance, workflow behavior, release checks, and historical mission notes that describe `lab.aheadofmarket.com` or `aom-studio-lab` as production. Lab must be documented and operated as opt-in staging. The default production surface is `https://aheadofmarket.com/dashboard` on the `aom-studio` Vercel project.

Implemented 2026-08-08:

- Added a mandatory environment contract to `AGENTS.md`: `aom-studio` and `aheadofmarket.com/dashboard` are production; Lab is staging and requires an explicit user request.
- Converted the Lab GitHub Action from automatic `main`/`lab` triggers to manual dispatch only and renamed every step as staging.
- Relinked this checkout's ignored `.vercel/project.json` to `aom-studio` so a bare local Vercel command no longer defaults to Lab.
- Reworked `scripts/check-deploy-staleness.sh` to query READY JSON deployments from the explicit `aom-studio` production project. The previous implementation discarded Vercel's human-readable table and could not reliably find a deployment.
- Corrected CV6 polish, room-checklist, and decision records so historical Lab deployments are labeled staging validation and never production proof.

Verification:

- Lab workflow YAML parses and has no push trigger.
- `bash -n scripts/check-deploy-staleness.sh` passes.
- The staleness check resolves the real production deployment and reports `origin/main` current.
- The local Vercel link names project `aom-studio`.
- Repository searches find no remaining affirmative Lab-as-production claim; remaining Lab references explicitly say staging or not production.

Release verification:

- Commit `d746f68d` was pushed to `main`.
- Vercel deployment `dpl_DuDDN31zBi3ipqkWfMuwzugGDrsA` reached Ready on project `aom-studio` and lists both `aheadofmarket.com` aliases.
- `https://aheadofmarket.com/dashboard` serves the new production entry asset.
- `aom-studio-lab` remained on its older `f537745c` staging deployment after the push, confirming that Lab no longer auto-deploys from `main`.

**Status:** shipped and verified on canonical production; Lab remained unchanged staging.

### R2 — Add OpenAI as a first-party dashboard brain

Add an OpenAI option to Corner's existing model controls, route requests through the server-side Responses API, and attribute usage to the authenticated tenant/user. The first release uses AOM-owned project credentials and does not expose or store customer API keys.

Planned verification:

- Provider and model-selection tests cover OpenAI routing and safe unavailable states.
- Usage limits are enforced before upstream requests and recorded from returned token usage.
- Dashboard picker and live response flow are checked at desktop and mobile/tablet widths.
- The exact release commit is deployed and verified on `https://aheadofmarket.com/dashboard`.

Implemented 2026-08-08 (release verification still in progress):

- Added `OpenAI GPT-5.6` to the authenticated per-room model picker with honest hosted-provider copy and immediate optimistic UI state.
- Added an allowlist to the model-preference API and made failed Supabase writes surface as failures instead of returning false success.
- Added a service-role-only usage ledger plus atomic reservation/finalization RPCs. Reservations serialize per tenant/month and enforce default per-user and per-tenant token ceilings before upstream spend.
- Added dashboard/API regression coverage for the OpenAI option, tenant-gated saves, invalid provider rejection, and failed preference writes.
- New bridge configuration: `OPENAI_API_KEY` is required server-side. Optional overrides are `OPENAI_ROOM_MODEL`, `OPENAI_ROOM_MAX_OUTPUT_TOKENS`, `OPENAI_ROOM_MAX_CONTEXT_CHARS`, `OPENAI_MONTHLY_USER_TOKEN_LIMIT`, `OPENAI_MONTHLY_TENANT_TOKEN_LIMIT`, `OPENAI_ORGANIZATION_ID`, and `OPENAI_PROJECT_ID`.
- The migration was applied alone in a transaction and recorded as `20260808180000`; its live reservation/finalization smoke test passed without leaving test rows.
- Eight dashboard/API tests, the focused browser spec, and the production Vite build pass. In-app browser QA confirms the OpenAI row is readable and reachable at 390×844, 1024×1366, and 1440×900.
- The bridge commit `0fba324d0` is on `master`; the live launchd daemon restarted cleanly and is polling with the new module.
- Activation blocker: the current OpenAI Platform key reaches the Responses API but returns `credit_balance_exhausted`. The usage event finalizes as failed with a request ID, and users get an honest billing notice with no Claude fallback. Successful answers require adding Platform credits.

Release verification:

- Dashboard commit `310bf1f8` was pushed to `main` and production deployment `dpl_DNQVDyip2beokkwmA4RDT7J5uPyU` reached Ready on the `aom-studio` project.
- The production staleness guard resolves `310bf1f8` as current for `aheadofmarket.com/dashboard`; the deployed lazy bundle contains the `OpenAI GPT-5.6` picker option.
- Canonical production correctly redirects unauthenticated browser sessions to `/login`. Authenticated interaction was covered by the focused browser spec, while responsive visual QA used the deterministic local demo at phone, iPad, and desktop widths.

**Status:** code, database, bridge, and dashboard shipped; successful OpenAI answers blocked only by Platform credits.

### R3 — Corner Runner: use each person’s local Codex subscription and computer

Build the first production-safe local-runner path for Corner. A paired runner stays on the user’s own Mac or PC, keeps ChatGPT/Codex credentials local, polls Corner through authenticated outbound HTTPS, and executes only inside a folder the user explicitly selected. Rooms may choose `Codex on this computer`; those turns queue for that user’s runner instead of the hosted Claude/OpenAI bridge.

Planned scope:

- Add one-time pairing, device revocation, presence, and device-bound bearer credentials.
- Add a tenant/user-owned job queue with atomic claims, leases, completion, and failure states.
- Add an installable Node runner that invokes the locally authenticated Codex CLI in an explicitly selected working directory and streams honest status back to Corner.
- Add dashboard connection/status controls and a local Codex model option that cannot be selected before a runner is paired.
- Make the existing central bridge explicitly stand down on local-Codex rooms so a message cannot receive two answers.
- Verify API authorization, queue isolation, local dry runs, responsive dashboard behavior, production build, and the canonical production deployment.

Security decisions:

- Never send or store ChatGPT/Codex credentials in Corner or Supabase.
- Never expose Codex app-server or a listener on the user’s LAN/public internet; the runner initiates every connection.
- Store only SHA-256 hashes of pairing/device secrets server-side; pairing secrets are single-use and expire.
- Default execution to the runner’s single configured root and Codex `workspace-write` sandbox with non-escalating approvals.

Implemented 2026-08-08 (release verification in progress):

- Added service-role-only pairing, device, and job tables with hashed secrets, expiring one-time codes, device revocation, presence, atomic claims, and expiring leases.
- Added authenticated browser APIs for pairing/status and device-token APIs for heartbeat, job claims, context retrieval, completion, and visible failure replies.
- Added the downloadable dependency-free Node runner. It requires each computer’s own `codex login --device-auth`, stores the device credential locally with mode `0600`, accepts only HTTPS or localhost HTTP, opens no inbound port, and confines Codex to one explicit root using `workspace-write` or opt-in read-only mode.
- Added the `Codex on this computer` room model, connection/status controls, device disconnect, and pairing instructions in CV6. Unpaired selections open setup instead of silently saving or falling back.
- Portal-mounted the connection dialog so transformed composer containers cannot push it below mobile viewports.
- Stamped local routes only after server-side JWT/device verification; the production bridge handoff guard is ready to ignore those stamped messages after dashboard release.
- Applied migration `20260808213000` alone after a dry run. The first transactional attempt correctly rolled back on the live `messages.id` text type; the corrected migration was then applied and recorded.

Verification so far:

- 18 focused Node tests pass for model allowlisting, preference precedence, fail-closed routing, secret formats, prompt boundaries, HTTPS enforcement, and server-owned route markers.
- Two focused Playwright flows pass, including the rule that an unpaired local-Codex selection opens setup without saving the room model.
- The Vite production build and syntax checks pass; the downloadable runner prints its help cleanly.
- Responsive in-app QA confirms the runner dialog is centered and fully reachable at 390×844 and desktop width after the portal fix.
- The bridge handoff regression test and Python compile check pass.

Release verification:

- Dashboard commit `7d15a83c` was pushed to `main`; production deployment `dpl_5noRFqS8fvzQDsBwwuqbpNXHjez9` reached Ready on the verified `aom-studio` project.
- The production staleness guard resolves `7d15a83c` as current. The canonical dashboard serves the new bundle and the canonical runner download is valid JavaScript containing the local ChatGPT device-login flow.
- Migration `20260808213000` is present in remote history. Valid-shaped nonexistent pairing and device credentials reach the live database-backed APIs and fail safely with `400`/`401`.
- Bridge commit `6b56db4ad` was pushed to `master`; `com.aom-ea.bridge-daemon` restarted from PID 27432 to 1763, passed startup/backfill, and resumed inbox polling with exit code 0.

**Status:** shipped and verified on canonical production; an authenticated paired-computer turn is the next user-level acceptance check.

### R4 — Auto fallback from Claude to the sender's Corner Runner

When Auto encounters a Claude subscription pause or usage cap, hand the existing
authenticated user turn to that sender's paired Corner Runner before trying hosted
fallback providers. Preserve tenant/user/device ownership, enqueue the original
message only once, and keep the existing non-Codex fallback path when no usable
runner is paired.

Implementation and release checks:

- Auto messages receive a server-owned Codex fallback marker only while the sender's paired runner is online; browser-supplied markers are stripped.
- The room bridge detects subscription-disabled, paused, suspended, and usage-limit failures, queues the original turn idempotently to that exact verified device, and only then falls through to existing hosted providers.
- `AOM Studio Mac` is paired to `/Users/aom-inhouse/aom-studio-transfer/AOM-EA`, installed as a persistent LaunchAgent, and heartbeat-verified online.
- The runner's canonical server was corrected to `https://www.aheadofmarket.com`; the former apex redirect stripped its authorization header.
- 16 focused Node tests, 22 bridge honesty tests, Python compilation, and the Vite production build pass.

Production proof:

- Dashboard/API commit `d653658f` deployed as Vercel production `dpl_DnkcJcNED91VJoARWrqkRGjm2guf` and serves both the `Auto (Claude → Codex)` UI and canonical runner endpoint.
- Bridge commits `e090cc81a` and `cb36f5376` are on `master`; the room bridge restarted healthy as PID 90621.
- Authenticated `bridge-smoke` turn `5234926d` hit the real disabled-subscription banner, queued runner job `051f5a81`, and returned `FALLBACK_SMOKE_OK_2` with source `corner-runner` and `local_codex: true`.
- Live counters after acceptance: `codex_fallback_queued=1`, `codex_fallback_unavailable=0`.

**Status:** shipped and verified on canonical production.

### R6 — Public newcomer onboarding and searchable sources

Build one first-run contract across web and native iOS that takes a person from
account creation to a useful Corner without requiring them to understand the
project/mission/agent model first. The flow introduces Corner, offers a default
brain, lets the user bring files and connect Gmail or Outlook as explicitly
read-only searchable sources, gathers enough context to propose a starting
workspace, and ends with a concrete first project. Every optional connection
remains available later from Settings.

Scope and release checks:

- Add Google and Microsoft account entry alongside email without conflating
  account authentication with permission to search mail.
- Replace the premature three-question completion path with a resumable,
  accessible first-run flow on desktop and mobile web.
- Reuse the existing Gmail and Outlook OAuth integrations, returning users to
  the exact onboarding step after consent.
- Add honest local-file import staging and clear read-only email permission
  language; no send, delete, archive, or mailbox mutation in onboarding.
- Add the same welcome/source/brain decisions to native iOS and keep source
  management reachable from Settings.
- Persist onboarding progress and completion server-side where available, with
  a local recovery path that cannot strand a signed-in user.
- Verify focused auth/onboarding tests, the production web build, native iOS
  compilation/tests, and responsive visual behavior.

Implemented 2026-08-11:

- Replaced the old first-login questionnaire with one resumable five-step web
  path: introduction, default/paid brain choice, files and searchable mail,
  starting work, review, and creation. New users are gated into this path.
- Made account entry public through email signup plus Google, Microsoft, and
  Apple OAuth. Account authentication remains separate from Gmail/Outlook data
  permission.
- Added Gmail and Outlook onboarding consent with materially narrower read-only
  scopes (`gmail.readonly` and `Mail.Read`), exact-step OAuth return, connection
  status, and explicit no-send/delete/archive/move language.
- Added local file staging (20 files, 20 MB each), workspace/project creation,
  one Corner guide, metadata completion, and upload after tenant identity is
  established.
- Added a native SwiftUI first-run flow with the same brain/source/workspace
  decisions, native file picking, authenticated mailbox OAuth launch, and
  account creation/provider sign-in parity.
- Responsive browser QA reached the review screen at 390×844 with a 390 px
  document width (no horizontal overflow). Eight focused API/contract tests,
  the Vite production build, project-file validation, and an iPhone 17 simulator
  build pass.

Launch activation still required:

- Enable/configure Apple, Google, and Azure providers in Supabase and add the
  approved web/native callback URLs. The buttons fail honestly until enabled.
- Confirm Gmail and Microsoft OAuth app credentials, consent-screen publishing,
  and production redirect URI. Google verification timing is external.
- The Claude/ChatGPT/Gemini rows record the preferred brain and point users to
  later connection; consumer account connectors still require their separate
  provider/MCP approval or the shipped local Corner Runner.
- Run a real clean-account acceptance pass against production, archive/sign the
  iOS build, and complete App Store privacy/submission metadata. This round has
  not been deployed.

**Status:** implementation and local verification complete; provider activation and production release pending.

### R7 — Activate public auth, mail consent, and production onboarding

Configure the production Supabase auth providers and Google/Microsoft mail OAuth
applications, deploy the locally verified R6 onboarding release to the canonical
`aom-studio` production project, and complete one clean-account acceptance pass
through account creation and first-run setup.

Activation checklist:

- Verify production project identity before changing Supabase or Vercel state.
- Enable Apple, Google, and Azure account providers with the required production
  and `corner://auth-callback` redirects.
- Confirm Gmail readonly and Microsoft Mail.Read consent apps are published and
  use the canonical production callback endpoint.
- Deploy a clean committed release to `aom-studio`, verify canonical served
  assets, then run a fresh-account onboarding acceptance test.
- Record any provider review, MFA, DNS, legal metadata, or App Store dependency
  as an external blocker without weakening scopes or using a test-only bypass.

Progress 2026-08-11:

- Corrected production Supabase Auth from the stale `sourcing.directory` site
  URL to `https://www.aheadofmarket.com`, added both canonical web origins plus
  `corner://auth-callback`, and enabled Google using the existing production
  `corner-integrations` client.
- Added the Supabase callback URI to that Google client. The Google audience is
  External / In production. Gmail API is enabled, and `gmail.readonly` is now
  registered as the only onboarding mail scope.
- Google classifies `gmail.readonly` as restricted. Its verification form now
  requires Corner's use-case declaration and a YouTube demo of the deployed
  connection flow; approval cannot be claimed until those artifacts are
  supplied and Google completes review.
- Microsoft/Entra activation is blocked on Microsoft console authentication;
  production has no `OUTLOOK_OAUTH_CLIENT_ID` or secret yet. Apple activation
  is blocked on creating/confirming the Apple Services ID and six-month client
  secret in the Apple Developer account.
- Production deployment `dpl_BTyJZjF9nHHr6xABPpz7SVKpnc9k` is Ready on the
  verified `aom-studio` project and carries all canonical AOM aliases.
- A clean production email account successfully reached onboarding. Its first
  workspace creation uncovered an invalid UUID comparison in the collision
  check; commit `f7d43fcc` fixed and redeployed it. The same clean account then
  reached `YOUR CORNER IS READY`. The temporary acceptance user was deleted.

**Status:** production web and clean-account acceptance complete; Google mail verification, Microsoft credentials/consent, and Apple developer credentials remain externally blocked.

Microsoft activation resumed after Patrik created the Microsoft account. Create
the multitenant/personal-account Entra registration, configure Supabase account
auth and Corner's separate Outlook Mail.Read consent callback, then store the
new credentials in production and verify both initiation paths.

Progress 2026-08-12:

- Registered the `Corner` Entra application for organizational and personal
  Microsoft accounts with the Supabase Auth callback and canonical production
  Outlook callback.
- Added delegated `User.Read`, `Mail.Read`, `Mail.ReadWrite`, and `Mail.Send`.
  This supports mailbox search, draft creation/editing, and user-authorized send;
  no application/background mail permission or tenant-wide consent was added.
- Created the production client secret (rotation due 2028-08-11), enabled Azure
  auth in production Supabase, and stored the Outlook client ID/secret as
  encrypted production Vercel environment variables.
- Microsoft now blocks external user consent for newly registered multitenant
  apps until the publisher is verified with a Microsoft Partner Network ID.
  Technical configuration can ship, but public Microsoft consent remains gated
  on Partner Center enrollment/publisher verification.

Release verification:

- Commit `419cb7a1` is pushed on `codex/corner-full-pass-r16`; production
  deployment `dpl_Bdhy3YTP7mrnRg8tBz3jf7jSWUNG` is Ready and carries both
  canonical `aheadofmarket.com` aliases.
- The canonical dashboard returns 200. The Outlook connection endpoint now
  reaches its authentication gate (401 when called without a Corner session,
  rather than missing-credential 503), proving the production credentials load.
- Supabase Azure authorization returns 302 to Microsoft's `common` endpoint
  with the new Corner client ID and the registered Supabase callback.
- Production build and JavaScript syntax checks pass.

**Status:** Microsoft technical activation shipped and verified; public external consent remains blocked on Microsoft publisher verification.

### R5 — Live Codex progress and single-owner room routing

Stream safe, user-facing progress from the local Codex runner into the existing
room step timeline so desktop and mobile show that Codex has claimed a turn,
is working, and has stopped. Prevent the shadow room bridge from also accepting
a server-verified local-runner turn, which otherwise creates a second reply and
can attach work steps to the wrong point in the conversation.

Planned checks:

- Convert Codex JSONL lifecycle events into generic progress labels without
  exposing raw shell commands, local paths, model reasoning, or credentials.
- Authenticate every progress write against the claimed device and job, and
  derive room/user scope from the original server-owned message.
- Emit the existing `message_step` shape, including the settled sentinel used
  by both desktop and mobile waiting indicators.
- Make both bridge implementations yield only when a matching verified runner
  job exists for the message, device, user, and tenant.
- Latch a successful Auto fallback to `Codex on this computer` for that room;
  subsequent messages bypass Claude until the user changes the model in Settings.
- Verify focused tests, production build, canonical deployment, and a live
  tool-using turn with exactly one assistant reply.

Release verification:

- Dashboard/API commit `3363db1b` and documentation commit `b3bab658`
  shipped through Vercel production `dpl_H4TzdxqTqczy4M1D8adpeT6FKNYn`;
  the canonical runner download contains the progress stream implementation.
- Bridge commits `5dbf5bcf6` and `d1b8141b2` are on `master`; the room bridge
  restarted on the new code and a live `/chat` ownership probe returned
  `localRunner: true` without creating a second hosted turn.
- The Wolfpack preference is now `project:wolfpack = codex-local`. New room
  messages bypass Claude until Settings changes that model back.
- Live runner job `15c7dcd0` emitted claim, working, completed, and settled
  events from `corner-runner`, then wrote its final `local_codex: true` reply.
- 12 focused Node tests, 25 bridge tests, JavaScript/Python syntax checks, and
  the production Vite build pass.

**Status:** shipped and verified on canonical production.
