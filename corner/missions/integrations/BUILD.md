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

**Status:** complete; ready to commit and push through the production-connected `main` branch.
