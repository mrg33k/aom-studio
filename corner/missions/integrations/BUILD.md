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

**Status:** in progress.
