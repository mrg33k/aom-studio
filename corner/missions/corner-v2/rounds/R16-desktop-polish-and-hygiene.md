# R16 — desktop polish and hygiene (P021 sign-in errors, verify-script flag safety, deploy-token inventory)

Worker: BUILDER. Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`,
branch `codex/corner-v2-integration`, base `9c54f4a`.
Commit `91d122f` ("fix: plain sign-in errors and strict verify-script flags"). No push.

## Outcome

Done. P021 fixed: Convex Auth failures render as plain sentences in the R13
inline slot, one per shape, with the raw message in the element's `title`
(and `console.warn` for server failures) — no request id or `[CONVEX …]`
prefix in visible text. `scripts/v2-verify.mjs` parses flags strictly
(unknown → exit 2 with the accepted list), supports `--deployment <ref>`
(key via `npx convex env get … --deployment <ref>`, never printed), refuses
`neat-pony-216` in both `.env.local` and `--deployment`, and prints the
resolved target deployment first on every run. Deploy-token inventory is
report-only: the CLI has no list subcommand, so names come from round
reports; nothing created or revoked. `neat-pony-216` untouched (zero calls).

## Part A — P021: sign-in errors in plain words

`mapAuthError(raw, flow)` in `src/routes/Auth.tsx` (exported, flow-aware):

| failure | visible sentence |
|---|---|
| wrong password / account exists with another password (sign-in) | "That password doesn't match. Try again, or set a new one if this is your first time." |
| sign-up on an email that already has a password | "This email already has a password. Sign in instead." (+ auto-flips `flow` to `signIn`, so the link reads "First time here? Set a password") |
| server says "at least 8 characters" (also the client-side sign-up check, reworded to match) | "Use at least 8 characters." |
| `Server Error` / request id / network shape (incl. the exact P021 raw string) | "Couldn't reach Corner just now. Try again in a moment." with raw in `title` + `console.warn("[auth] sign-in failed:", raw)` |
| anything else | "Couldn't sign you in. Try again in a moment." (raw in `title`) |

The slot is the R13 inline `role="alert"` div, now with
`data-testid="auth-error"` and `title={raw}` whenever raw differs from the
visible text. Fixed sentences mean the visible text can never contain a
request id or `[CONVEX …]` prefix.

Stand-in (`scripts/audit/mock-convex-auth-react.tsx`): one-shot
`audit_auth_failure` flag throwing five realistic shapes
(`convex-wrong-password`, `exists-other-password`, `duplicate-signup`,
`short-password`, `server-error` — all `[CONVEX A(auth:signIn)] [Request ID: …]`
prefixed). Consumed on first use so a retry exercises the normal path.

E2E (`e2e/visual.spec.ts`, offline, 5 new + 1 updated): each line asserts
the sentence, `not.toContainText("Request ID"/"CONVEX")`, URL stays `/auth`,
plus `title` =~ /Request ID/ where applicable, the flow-link flip for the
duplicate case, and a `console.warn` containing the request id (via
`expect.poll`) for the server case.

```bash
npm run e2e   # 75 passed (3.2m) — was 70, +5 R16 auth lines
```

Evidence: `rounds/evidence/R16-auth-errors-1440.png` (1440×900, wrong-password
state showing the plain sentence inline; reviewed — no raw text visible).

## Part B — `scripts/v2-verify.mjs` flag safety

- Strict parse: unknown flags, `--flag=value` on booleans, missing values,
  and positionals → exit 2 with `accepted flags: …`. `--flag=value`
  accepted for value flags. `--help` → exit 0 with usage + accepted list.
- `--deployment <ref>`: the migration key comes from
  `npx convex env get CORNER_V2_MIGRATION_KEY --deployment <ref>` (new
  `convexEnvGet` helper — the only `npx convex` call the script makes, so it
  carries `--deployment` by construction; value held in a variable, never
  printed). Pair with the matching `--env-file` for the API URL (documented
  in `--help`). `--env-file` behavior unchanged.
- Refusals: `neat-pony-216` in `--deployment` → refused in `parseArgs`
  (before the `--run-id`/`--mapping` checks, so the bare flag is refused
  rather than misreported); in `.env.local` → refused as before.
- `target deployment: <resolved>` prints first on every run
  (`--deployment` wins over `CONVEX_DEPLOYMENT`).

`tests/v2/verify-cli.test.ts` (vitest, 4 tests, no network — all paths exit
in arg parsing): `--help` → 0 + usage/`--deployment`/`--env-file`;
`--bogus` → 2 + `unknown flag` + accepted list; `--deployment
neat-pony-216` → 1 + `target deployment:` + refusal; bare `--deployment`
→ 2 + `needs a value`.

```bash
node scripts/v2-verify.mjs --help            # exit 0, usage + 16 accepted flags
node scripts/v2-verify.mjs --bogus; echo "exit=$?"   # exit=2
node scripts/v2-verify.mjs --run-id probe --mapping docs/superpowers/migrations/aom-v2-mapping.r12.json | head -1
# target deployment: dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
npm test   # 18 files, 154 passed (was 150, +4 verify-cli) — zero Unhandled
```

## Part C — deploy-token inventory (report only)

- `npx convex deployment token --help` lists only
  `create | delete | help` — **no list subcommand**, so the CLI cannot show
  existing keys. Inventory is from round reports (names only, nothing
  printed, nothing created/revoked):
  - clone (`corner-v2-production` / `brilliant-scorpion-163`):
    `clone-deploy-key` (R4, functions deploy), `r12-deploy-key` (R12,
    functions re-push).
  - rehearsal (`dev:adjoining-tiger-87`): no deploy key was ever created
    (deploys via `npx convex dev --once` on the login session).
- Dashboard revoke steps (not executed): open
  `dashboard.convex.dev/t/patrik-matheson/corner-v2-production` → Settings →
  Deploy Keys → Revoke next to `r12-deploy-key`, then `clone-deploy-key`
  (revoke the R12 key first; the clone key was the last one used to push
  functions, so revoke it only when no further clone pushes are planned).
  Do not touch `neat-pony-216`, `descriptive-flamingo-718`,
  `adjoining-tiger-87`, or `lovable-weasel-178`. CLI equivalent (also not
  executed): `npx convex deployment token delete <name> --deployment
  patrik-matheson:corner-v2-production:production`.

## Gates (final code, this round)

```bash
npm run lint    # 0 errors, 11 warnings (pre-existing exhaustive-deps notes)
npm run build   # ✓ built in 1.80s
npm test        # Test Files 18 passed (18) / Tests 154 passed (154)
npm run e2e     # 75 passed (3.2m)
```

## Commit

```bash
git add src/routes/Auth.tsx src/v2/conversation.css scripts/audit/fixtures.ts scripts/audit/mock-convex-react.tsx scripts/audit/mock-convex-auth-react.tsx e2e/visual.spec.ts e2e/__screenshots__/desktop scripts/v2-verify.mjs tests/v2/verify-cli.test.ts
git commit -m "fix: plain sign-in errors and strict verify-script flags"
# [codex/corner-v2-integration 91d122f] 5 files changed, 348 insertions(+), 25 deletions(-)
# git log: 91d122f / 9c54f4a … ; git status: clean
```

No push, per hard rules.

## Deviations (one, load-bearing)

1. **Staged `scripts/audit/mock-convex-auth-react.tsx` though the brief's
   pathspec names `mock-convex-react.tsx`.** The brief requires "the
   stand-in's auth mock throws each shape" — that mock lives in
   `mock-convex-auth-react.tsx` (the `@convex-dev/auth/react` alias in
   `scripts/audit/vite.config.ts`), not in `mock-convex-react.tsx`
   (the `convex/react` alias), which needed no change. The listed
   `src/v2/conversation.css`, `scripts/audit/fixtures.ts`, and
   `mock-convex-react.tsx` were staged anyway (clean no-ops); the error
   slot keeps its R13 inline styles in `Auth.tsx`, so no CSS change was
   needed.

## Hard rules kept

`neat-pony-216` zero calls (only string-refused); no key printed (the new
`convexEnvGet` returns the value, nothing logs it); `convex/` untouched;
no `git add -A` (explicit pathspecs only); no push. Punch-list P021 flipped
to `fixed (R16)` with the evidence path.
