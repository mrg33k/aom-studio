# Corner Codebase Audit — Final Report (ln-620 coordinator)

**Run ID:** run-20260511-211201-corner-audit
**Date:** 2026-05-11
**Target:** `/Users/aom-inhouse/aom-studio-transfer/aom-studio` (Corner application, version aom-v17 17.2.1)
**Workers:** ln-621 through ln-629 (9 parallel auditors)
**Research basis:** Vite + React + Supabase + Vercel best-practice sources, May 2026 (see `research-evidence.md`)

---

## Executive Summary

The Corner app is **two systems wearing one repo**: a strong product surface that ships and a weak ops/build/secret-hygiene surface that's been allowed to drift through 17 major rewrites. The product code is more solid than the score suggests — React patterns are clean, concurrency is excellent (9.5/10), RLS coverage is correct, no SQL/XSS surface. The problem is the *boundary around the code*: secrets in git, no real CI gates, no production diagnosability, no fail-fast config, and a pile of dead routes nobody's removed.

This is not "rip up the app and start over." This is "the foundation is fine, the building inspection failed on the wiring and the smoke detectors."

**Overall verdict:** **CONDITIONAL FAIL — must close 4 critical security items before next user touches production. Everything else is ranked work, not blockers.**

**Composite score across 9 audits: 4.7 / 10.**

| Worker | Domain | Score | Verdict |
|---|---|---|---|
| ln-621 | Security boundary | 4.3 | **CRITICAL** — secrets in git, GitHub token in client, missing tenant check |
| ln-622 | Build delivery gate | 2.8 | **HIGH** — build lies about success, no linter, no test runner, no CI gates |
| ln-623 | Duplication / over-abstraction | 6.5 | MEDIUM — 3 fixable items (SiteNav, supabase client, subscription hook) |
| ln-624 | Maintainability hotspots | 4.8 | MEDIUM — 5 god-files (3,114 / 1,228 / 1,026 / 958 / 934 LOC) |
| ln-625 | Dependency / reuse | ~6/10 | MEDIUM — Firebase + Supabase both live, playwright unused, version lag |
| ln-626 | Dead code | 0.0 | HIGH (volume) — 56 deletable items, very low fix risk |
| ln-627 | Diagnosability | 2.8 | HIGH — bare console.error everywhere, no correlation IDs, no metrics |
| ln-628 | Concurrency correctness | **9.5** | **PASS** — Realtime cleanup + dedup is genuinely solid; don't touch |
| ln-629 | Runtime lifecycle / config | 3.5 | MEDIUM — no fail-fast on missing env, no health probes, no central validation |

---

## Today, before anything else (the 5 things that don't wait)

These are not "next sprint" items. These are "today" items. Everything else can be ranked.

1. **Rotate every key in `.env.prod`, `.env.vercel`, `.env.seed`, `.env.pulled`.** Anthropic, Gemini, Supabase service-role + anon, Resend, Vercel OIDC. Change the dashboard password. Anyone with git history access has all of these right now.
2. **Pull `VITE_GITHUB_TOKEN` and `VITE_DASHBOARD_PASSWORD` out of the client bundle.** Move GitHub calls behind `/api/github-proxy`. Replace dashboard-password flow with a server-validated session.
3. **Add `verifyTenant()` to `api/dashboard/chat.js:442`.** That endpoint uses the Supabase master key without checking which tenant is calling — anyone can spoof a `client_id`.
4. **Clean git history with BFG Repo-Cleaner.** Until the history is scrubbed, the rotated keys are still discoverable in old commits.
5. **Fix the lying build.** `src/App.jsx:16` imports a non-existent default export from `ServicesGrid.jsx`. Vite logs the error and exits 0. Add `build.rollupOptions.onwarn` config that promotes module-resolution warnings to errors. Fix the import while you're there.

---

## Prioritized Remediation Plan

### Tier 0 — TODAY (security blockers)
1. Rotate keys (ln-621 F1) — L
2. Move GitHub token + dashboard password server-side (ln-621 F2) — M
3. Add `verifyTenant` to chat.js (ln-621 F3) — M
4. Clean git history (ln-621 F1 followup) — L
5. Fix lying build + ServicesGrid import (ln-622) — S

### Tier 1 — THIS SPRINT (hygiene that compounds)
6. Install `pino` + correlation-ID middleware (ln-627) — 8h
7. Add `/api/health` + `/api/ready` + central config validator (ln-629) — 4h
8. Install eslint, wire `npm run lint`, prune 69 unused exports (ln-622) — 6h
9. Pick Vitest, wire `npm test` (ln-622) — 3h
10. Delete the 56 dead-code items (ln-626) — 2-3h, very low risk
11. Replace `process.env.X || fallback` patterns with explicit fail-fast (ln-621 F4 + ln-629) — 4h

### Tier 2 — THIS QUARTER (architectural lifts)
12. Pick **one** of Firebase or Supabase. Plan the retirement of the other (ln-625). This is real work — auth migration, data migration, surface inventory. But every day both stay live is interest accruing.
13. Refactor the 5 god-files (ln-624):
    - `BrandGuidelinesV4.jsx` (3,114 LOC) → data-driven from `brandSystem.json` + generic section renderer
    - `VoiceChat.jsx` (1,228 LOC) → extract `useVoiceWebSocket`, `useAudioPlayback`, `VoiceChatTranscript`
    - `CornerV3.jsx` (934 LOC) → extract `useCornerState()` with useReducer + provider
    - `MessageList.jsx` (958 LOC) → per-type `MessageRenderer_<Type>` + registry
    - `R65LiveThread.jsx` (1,026 LOC) → extract choreography hook + per-step components
14. Extract `api/_lib/supabaseClient.js` factory + `useSupabaseSubscription` hook (ln-623) — kills two duplications in one move

### Tier 3 — WHEN CONVENIENT (low-priority cleanup)
15. Upgrade Vite 5 → 7, Tailwind 3 → 4 (ln-625)
16. Remove unused `playwright`, `npm prune` postgres bloat (ln-625)
17. Add Prometheus / OpenTelemetry metrics (ln-627 tier-3)
18. Extract `SiteNav`/`SiteNavR4` shared base (ln-623 P1)
19. SIGTERM handlers if you ever move off Vercel (ln-629)

---

## Deduplicated Issue Table

| # | Severity | Title | Workers | Action |
|---|---|---|---|---|
| 1 | CRITICAL | Live production secrets tracked in git history (.env.prod, .env.vercel, .env.seed, .env.pulled) | 621, 626 | REMOVE_SECRET |
| 2 | CRITICAL | `VITE_GITHUB_TOKEN` + `VITE_DASHBOARD_PASSWORD` bundled into client JS (`src/pages/Social.jsx:5,8`) | 621 | REMOVE_SECRET, HARDEN_SECURITY_BOUNDARY |
| 3 | HIGH | `/api/dashboard/chat.js:442` uses service-role key without `verifyTenant()`, `Access-Control-Allow-Origin: *` | 621 | HARDEN_SECURITY_BOUNDARY |
| 4 | HIGH | Sensitive default fallbacks across `/api/` routes (`process.env.X \|\| <hardcoded>`) | 621, 629 | REMOVE_SENSITIVE_DEFAULT |
| 5 | HIGH | Vite build exits 0 despite fatal module-resolution error (`src/App.jsx:16` → `ServicesGrid.jsx`) | 622 | FIX_DELIVERY_GATE |
| 6 | HIGH | No linter wired (69 unused exports accumulated) | 622 | FIX_DELIVERY_GATE |
| 7 | HIGH | No test runner wired despite test files existing (`tests/*.test.mjs`) | 622 | FIX_DELIVERY_GATE |
| 8 | HIGH | No type-checking (JSDoc absent, no tsconfig) | 622 | FIX_DELIVERY_GATE |
| 9 | HIGH | No structured logger — 36+ bare `console.error` calls in /api/ with no context | 627 | STRUCTURE_LOGS |
| 10 | HIGH | No correlation IDs propagated frontend → API → Supabase | 627 | PROPAGATE_CORRELATION |
| 11 | HIGH | No `/api/health` or `/api/ready` probes | 629 | ADD_CONFIG_VALIDATION |
| 12 | HIGH | No centralized startup config validation | 621, 629 | ADD_CONFIG_VALIDATION |
| 13 | HIGH | Firebase + Supabase both active in production code paths (dual-auth debt) | 625 | REMOVE_DEPENDENCY (eventually) |
| 14 | HIGH | 56 deletable items: 45 unreachable component files, 4 legacy route dirs (demo/growth-plan/outreach/proposals), v2-main.jsx, 3 stale `.env` files | 626 | DELETE_DEAD_CODE |
| 15 | HIGH | `BrandGuidelinesV4.jsx` is 3,114 LOC | 624 | REFACTOR_HOTSPOT |
| 16 | HIGH | `VoiceChat.jsx` is 1,228 LOC mixing websocket + audio + mic + UI | 624 | REFACTOR_HOTSPOT |
| 17 | HIGH | `R65LiveThread.jsx` is 1,026 LOC with inline choreography | 624 | REFACTOR_HOTSPOT |
| 18 | HIGH | `MessageList.jsx` 958 LOC, single map() rendering 8 message types in cascading conditionals | 624 | REFACTOR_HOTSPOT |
| 19 | HIGH | `CornerV3.jsx` 934 LOC, 20+ useState, no reducer | 624 | REFACTOR_HOTSPOT |
| 20 | MEDIUM | `SiteNav.jsx` and `SiteNavR4.jsx` 90% identical | 623 | MERGE_DUPLICATION |
| 21 | MEDIUM | API route Supabase client init duplicated 3x with inconsistent env-var naming | 623 | MERGE_DUPLICATION |
| 22 | MEDIUM | Dashboard Realtime subscription boilerplate repeats across components | 623 | MERGE_DUPLICATION |
| 23 | MEDIUM | Magic-string constants for chain/task statuses scattered across `MessageList.jsx` and `useTasksPanel.js` | 624 | EXTRACT_CONSTANT |
| 24 | MEDIUM | Vite 5 (current 7), Tailwind 3 (current 4) — 1-2 major versions behind | 625 | PATCH_DEPENDENCY |
| 25 | MEDIUM | Unused `playwright` dependency (~5MB) | 625 | REMOVE_DEPENDENCY |
| 26 | MEDIUM | 12 transitive postgres packages (~12MB) | 625 | REMOVE_DEPENDENCY |
| 27 | MEDIUM | No Prometheus / OpenTelemetry metrics instrumentation | 627 | ADD_DIAGNOSTIC_SIGNAL |
| 28 | LOW | No SIGTERM/SIGINT handlers (only relevant off Vercel) | 629 | FIX_SHUTDOWN |
| 29 | LOW | No Supabase client cleanup on shutdown (only relevant off Vercel) | 629 | FIX_SHUTDOWN |

---

## Deduplication / Conflict Resolution Notes

Resolved per `codebase_audit_worker_boundaries.md`:

- **ln-621 + ln-629 on env defaults** — both touched it; resolved per the rule (ln-629 owns startup validation, ln-621 owns the security risk of the fallback containing a secret). Both kept as one consolidated finding (#4 + #12 in the table).
- **ln-626 + ln-621 on `.env` files** — ln-626 flagged stale `.env.seed` / `.env.local` / `.env.vercel` as deletable; ln-621 flagged them as containing live secrets. Same files, complementary actions. Consolidated into finding #1 + a sub-action in #14.
- **ln-623 + ln-624 on repeated code** — no actual conflict. ln-623's three findings are cross-file duplications; ln-624's five findings are large-single-file complexity. Different problems, same codebase. Both kept.
- **ln-627 + ln-629 on health checks** — ln-629 owns the `/api/health` and `/api/ready` probes (#11); ln-627 owns the structured logging + correlation IDs that *populate* those probes' usefulness (#9 + #10). Both kept, scope distinct.
- **v2-main.jsx** — ln-626 initially flagged for deletion; ln-623 verified it's an intentional minimal single-page variant. **ln-623 wins** (it did the deeper context verification). Removed from delete list.

---

## What's GOOD (and don't touch)

- **Concurrency (ln-628, 9.5/10).** The "active flag" pattern in your Realtime subscriptions, the dedup logic in `useChatMessages.js`, the useEffect cleanup — all solid. R74 self-healing pattern is doing its job. No races, no leaks, no deadlocks. Don't touch.
- **RLS coverage** (ln-621 `migrations/015_add_client_client_id_and_rls.sql`). RLS enabled on all 6 core tables, policies correct, post-migration assertions verify. Compliant.
- **SQL injection / XSS** (ln-621 sampling). React JSX auto-escapes; no raw SQL string-builds; Supabase REST uses parameterised queries. No issues found in sampled paths.
- **No YAGNI debt** (ln-623). `clientConfig.js` and other utilities are all actually used. No speculative abstractions sitting unused.
- **Bootstrap order** (ln-629). The init sequence itself is fine; the gaps are around what happens when env vars are missing, not the order things start.

---

## Open Questions / Warnings

1. **April 2026 Vercel incident** — research evidence flags a Vercel edge function env var exposure window in early April 2026. If any of the now-leaked keys were rotated AFTER April 2026, they may have been transiently exposed. Worth checking deployment timestamps before assuming key rotation is sufficient.
2. **Firebase vs Supabase** — both are in active production paths. The decision of which to retire is not just a tech decision (it affects auth UX, data migration, and existing user accounts). Surface this to the product side before scheduling the retirement.
3. **`/api/local/file.js`** — naming suggests filesystem access from a serverless function. Vercel serverless has ephemeral storage; if this is reading/writing actual files, that's an architecture concern not flagged by any single worker. Worth a one-off audit.
4. **24+ unaudited `/api/` routes** — ln-621's audit sampled `/api/dashboard/chat.js` deeply; the same `verifyTenant` + service-role pattern likely repeats. A targeted sweep of every `/api/dashboard/*` and `/api/worlds/*` is the right next move.
5. **`.fallow-report*.md` files at repo root** — 7 of them, all from today, all very large. These should be moved into the fallow tool's own subdirectory or `.gitignored`; they pollute the root and bloat clones.

---

## Cleanup Note

Per `audit_final_report_contract.md`, the temporary per-worker markdown reports will be removed after this final report lands. The retained artifacts are:

- This report (`ln-620--final-report.md`) — durable.
- All worker JSON summaries under `evaluation-worker/` — retained for traceability.
- `research-evidence.md` — retained.

Worker reports that will be removed during Phase 6 cleanup:
- `ln-621--report.md`
- `ln-622--report.md`
- `ln-623--report.md`
- `ln-624--report.md`
- `ln-625--report.md`
- `ln-626--report.md`
- `ln-627--report.md`
- `ln-629--report.md`

(ln-628 did not persist a markdown report — agent returned summary inline; no cleanup needed for that file.)

---

## Sources (evidence basis, May 2026)

- [Vite Env Variables and Modes](https://vite.dev/guide/env-and-mode) — `VITE_*` prefix → client bundle, security warning
- [Supabase Security Guide](https://supabase.com/docs/guides/security) — RLS per-table, service-role usage
- [Sprocket Security: Vite secrets compromise](https://www.sprocketsecurity.com/blog/hunting-secrets-in-javascript-at-scale-how-a-vite-misconfiguration-lead-to-full-ci-cd-compromise)
- [Vercel April 2026 Security Incident](https://dev.to/benriemer/the-vercel-april-2026-security-incident-what-every-developer-actually-needs-to-know-5c95)
- [Supabase Hardening](https://supabase.com/blog/hardening-supabase)
- [Deepstrike: misconfigured Supabase at scale](https://deepstrike.io/blog/hacking-thousands-of-misconfigured-supabase-instances-at-scale)
- [Vibe-Eval: Vercel Security Review 2026](https://vibe-eval.com/safety/vercel/)
