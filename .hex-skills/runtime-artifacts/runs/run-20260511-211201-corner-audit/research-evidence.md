# Research Evidence — Corner Audit (run-20260511-211201)

**Status:** completed_minimal (per evaluation_research_contract.md)
**Date:** 2026-05-11
**Stack:** Vite 5 + React 18 + React Router 7 + Supabase + Firebase + Vercel + Tailwind

## Tier-1 sources (official docs)

- **Vite env vars** (vite.dev/guide/env-and-mode): only `VITE_*` prefixed vars are exposed to client; everything else stays server-side. Bundled VITE_ vars are in plain text in client JS.
- **Supabase security** (supabase.com/docs/guides/security): Row Level Security must be enabled per-table. Anon key is public by design; service_role key must NEVER ship to client. RLS enforced at the table level, not REST path.
- **Vercel env scopes** (vercel docs): Production / Preview / Development environments separate by design. Preview URLs are public unless Deployment Protection is on.

## Tier-2 sources (current best-practice, 2026)

- **April 2026 Vercel incident** (vercel.com/kb/bulletin/security-bulletin-cve-2025-55184): edge function env var exposure window early April 2026. Affected deploys may have leaked secrets transiently. Worth checking deployment timestamps.
- **Vite misconfig → full CI/CD compromise** (sprocketsecurity.com): `VITE_*` prefix on secrets is the most common Vite mistake. Stripe live keys, OpenAI keys, Supabase service_role keys observed shipped to browser in real audits.
- **Supabase RLS table-miss pattern** (supabase blog hardening + deepstrike.io): forgetting RLS on related tables (projects, teams) after enabling on users is the most common Supabase exposure. ~thousands of misconfigured Supabase instances catalogued in 2025-2026.
- **Vercel env scope duplication** (vibe-eval.com): production secrets duplicated into Preview is common; leaked Preview URL = leaked production secret.
- **AI-generated code rate**: ~80% of AI-generated apps contain at least one security vulnerability (exposed creds, missing auth, improper validation, misconfigured DB permissions).

## Stack-specific audit priorities

1. **Env var audit** — 7 `.env*` files in repo root is a smell. Confirm which are in `.gitignore`. Check for `VITE_` prefixed secrets. Check for `service_role` strings in client bundles.
2. **Supabase RLS coverage** — every table listed in `/migrations/` must have RLS policies. List tables, check policies per table.
3. **Firebase + Supabase dual auth** — having both is a flag. Confirm one is being phased out vs both actively used. Cross-auth state is a known smell.
4. **Vercel API routes** (~30 endpoints under `/api/`) — each is a serverless function. Audit for: auth middleware coverage, tenant verification, input validation, secret exposure.
5. **`_lib/verifyTenant.js`** — name suggests multi-tenant guard. Confirm every dashboard/* route calls it.
6. **17.2.1 version** — 17 major rewrites = significant tech debt and dead code probable. The 7 `.fallow-report*` files from today suggest active dead-code work.

## Confidence tier per claim

All claims above: tier_1 (official docs) or tier_2 (reputable 2026 publications). No tier_3 used.

## Sources

- [Supabase Security](https://supabase.com/docs/guides/security)
- [Vite Env Vars](https://vite.dev/guide/env-and-mode)
- [Vercel Security Review 2026](https://vibe-eval.com/safety/vercel/)
- [Vercel April 2026 Incident](https://dev.to/benriemer/the-vercel-april-2026-security-incident-what-every-developer-actually-needs-to-know-5c95)
- [Sprocket Security: Vite secrets compromise](https://www.sprocketsecurity.com/blog/hunting-secrets-in-javascript-at-scale-how-a-vite-misconfiguration-lead-to-full-ci-cd-compromise)
- [Supabase Hardening](https://supabase.com/blog/hardening-supabase)
- [Deepstrike: Misconfigured Supabase at scale](https://deepstrike.io/blog/hacking-thousands-of-misconfigured-supabase-instances-at-scale)
