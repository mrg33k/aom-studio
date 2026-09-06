# R13 — desktop Convex Auth (web signs in with a JWT so v2 works)

Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`. Base at start `184c576`; R12 committed `c6c0d24`
on top mid-round (foreign files untouched, uncommitted R12 files still in tree).

## Before / after

Before: `Auth.tsx` called legacy `users.signIn({ email })` (no password) and stored
`corner_session`. Every `v2*` function reads `getAuthUserId(ctx)` from the JWT, which
the web never had → `Not signed in` on any real backend. Offline hid it (stand-in
mocked the façades); live showed shell + permanent sidebar `LOADING…` (R8-live-06).

After: `ConvexAuthProvider` (same `ConvexReactClient`) owns the JWT; `/auth` is
email → password (`signIn("password", { email, password, flow })`, signUp links by
email server-side so Karen/Patrik keep rooms/reads/memberships); `users.viewer`
dual-writes the legacy `corner_session` for legacy screens + compat bridge; an auth
failure renders as a sign-in state everywhere, never LOADING, never blank.

## Env check (names only, never values)

```
$ npx convex env list --deployment adjoining-tiger-87 | grep -oE '^[A-Z_]+=' | sort
APNS_KEY_ID= APNS_TEAM_ID= APNS_TOPIC= ARCADE_API_KEY= AUTH_SEED_KEY=
CORNER_MIGRATION_SECRET= DEEPSEEK_API_KEY= JWKS= LEDGER_KEY= MUSE_API_KEY=
MUSE_BASE_URL= MUSE_MODEL= OPENAI_API_KEY= SITE_URL=
$ npx convex env list --deployment brilliant-scorpion-163 | grep -oE '^[A-Z_]+=' | sort
(same 14 names)
```

Both deployments have `JWKS` but **neither has `JWT_PRIVATE_KEY`**. Patrik has not run
`tools/copy-live-env.sh` yet. So `auth:signIn` fails server-side on both, and the
live run below is **blocked on env** (no keys generated or copied by this worker).
`neat-pony-216` untouched. No `convex/` changes at all (see deviations).

## Step 1 — failing tests first

New offline tests were written before the implementation ran green. First full run:

```
$ npm run e2e
1 failed — [desktop] e2e/visual.spec.ts › auth › sign-out clears the session and returns to /auth
  Error: getByText("Files") — strict-mode violation (h1 vs "view files" text)
68 passed (3.0m)
```

Fixed the assertion (`getByRole("heading", { name: "Files" })`), re-ran: **69 passed**.
After the later getRoom fix + regression test: **70 passed (3.0m), zero skips**.

## Step 2 — what changed (src)

- `src/main.tsx` — `ConvexAuthProvider client={convex}` around the existing
  `ConvexProvider` (same client; all calls carry the JWT once signed in).
- `src/lib/auth.tsx` — source of truth is `useConvexAuth()`; after auth,
  `users.viewer` dual-writes `corner_session` (userId, worldId, email, name);
  `signOut()` = Convex `signOut()` + `clearSession()`. The
  `worlds.resolveForSession` self-heal stays as the fallback for a session that
  exists without a JWT (legacy users mid-migration).
- `src/routes/Auth.tsx` — design's 620px column kept. Email + "Continue with
  email" → password step in the same column (`#password`, 56px `.v2-auth-email`,
  56px `.v2-auth-continue`, "First time here? Set a password" toggles
  signIn/signUp, inline `role=alert` error, "Back").
  `signIn("password", { email, password, flow })`. Post-login routes by workspace:
  `getNavigation` empty + no legacy rooms → `/onboarding`, else `/`.
  Google/Apple/SSO rows all disabled with "Not connected yet" tooltip. Legacy
  `users.signIn` kept ONLY behind `?legacy=1` with a visible
  "Legacy sign-in (no password)" label.
- Sign-out via `useAuth().signOut()` in `src/App.tsx` (drawer),
  `src/v2/WorkspaceSettings.tsx` (Profile), `src/components/CommandPalette.tsx`.
- P020: `src/lib/workspace.ts` — `useWorkspaceNavigation()` /
  `useConversationSurface()` catch the re-thrown query error, return undefined,
  stash it (`workspaceNavigationError()` / `conversationSurfaceError()`,
  `isNotSignedInError()`); new `useRoom()` never-throw wrapper for
  `rooms:getRoom`. `WorkspaceSidebar` renders "Sign in to see your projects" +
  button when signed out / "Not signed in", error text + Retry (reload) for
  other errors, LOADING only while genuinely waiting. `ConversationSurface`
  shows the same states in-pane; `WorkspaceShell` has a `PaneErrorBoundary`
  around conversation + visual panes (remounted on auth flip); `Home` treats a
  nav error as empty (no permanent loader, no redirect loop); `App`,
  `WorkspaceShell`, legacy thread all read `rooms:getRoom` through `useRoom()`.
- `src/v2/workspace.css` — `.v2-signin-row/.v2-signin-btn/.v2-pane-signin` styles.
- No backend change: `api.users.viewer` already returns `worldId`
  (`convex/users.ts` viewerShape), so the brief's conditional `whoAmI` was unneeded.
- Stand-in: `scripts/audit/mock-convex-auth-react.tsx` (new;
  `ConvexAuthProvider`/`useAuthActions`/`useConvexAuth`), aliased in
  `scripts/audit/vite.config.ts`; `fixtures.ts` gains the password table
  (seed `sam@example.com`), `users:viewer`, `corner_new_user` empty-workspace
  behavior, and `Not signed in` throws for unauthenticated
  `v2Workspace:getNavigation/getConversationSurface` (mirrors `requireViewer` +
  convex/react re-throw). `audit_fail_getroom=1` reproduces the clone's
  `rooms:getRoom` server error for unknown ids.

## Step 3 — gates (final, after all edits)

```
$ npm run lint   → EXIT=0 — "11 problems (0 errors, 11 warnings)" (R6 baseline count)
$ npm run build  → EXIT=0 — tsc clean, vite built
$ npm test       → EXIT=0 — 17 files, 150 passed
$ npm run e2e    → EXIT=0 — 70 passed, zero skips
```

Lint note: `npm run lint` exits nonzero while R8's git-ignored generated dirs
exist (`.vercel/output`, `e2e/report` — thousands of errors in vendored bundles,
zero in source). I `rm -rf`'d them (regenerable, ignored) before the gate runs;
they reappear with every `vercel build` / e2e run. Suggest adding them to
`eslint.config.js` `ignores` upstream (did not edit shared config myself).

## Deploys (preview only, never --prod)

- `npx vercel pull --yes --environment=preview` → OK.
- First `vercel build` + `deploy --prebuilt` → preview `…-becwa2qw3-….app`, but the
  bundle referenced `adjoining-tiger-87`: `--env` on deploy does NOT rebake
  Vite build-time vars (local `.env.local` wins). Rebuilt with
  `VITE_CONVEX_URL=…brilliant-scorpion-163.convex.cloud VITE_CONVEX_SITE_URL=…`
  on the command line (no file edited) → bundle refs clone 1×, rehearsal 0×,
  "Set a password" 1×. Redeployed → `…-n942kwga8-….app` (bundle
  `index-5WhhXz_A.js`, curl-verified).
- After the getRoom fix: rebuilt, redeployed → final preview
  `https://corner-v2-integration-8ysfjie48-aheads-projects-d2a4c70f.vercel.app`
  (bundle `index-DJ53K88u.js`, clone 1× / rehearsal 0×, curl-verified).

## Live run — blocked on env (except test 11)

```
$ LIVE_BASE_URL=https://corner-v2-integration-n942kwga8-aheads-projects-d2a4c70f.vercel.app \
  npx playwright test --project live
11 failed (01 @33s, 02–09 @~16s each, 10 @33s, 11 @~4s; each retried 1×)
```

| # | result | why (exact) |
|---|---|---|
| 01 sign up → reload → sign out → sign in | FAIL, blocked on env | Password UI renders live; `auth:signIn` answers `[CONVEX A(auth:signIn)] [Request ID: aa14ab9b3f1b81cb] Server Error Called by client` (inline alert, no navigation). Server-side signing needs `JWT_PRIVATE_KEY`, absent on the clone. |
| 02 onboarding | FAIL, downstream | no authenticated session (STATE_A never written) |
| 03 sidebar | FAIL, downstream | same |
| 04 conversation | FAIL, downstream | same |
| 05 routing | FAIL, downstream | same |
| 06 cross-project | FAIL, downstream | same |
| 07 visual | FAIL, downstream | same |
| 08 settings | FAIL, downstream | same |
| 09 ledger | FAIL, downstream | same |
| 10 isolation (account B sign-up) | FAIL, blocked on env | same `auth:signIn` server error as 01 |
| 11 unknown room/route | FAIL then **PASS** | first run: blank `<body>` — **UI defect, not env** (see below). Fixed, rebuilt, redeployed, re-ran on final preview: **1 passed (8.2s)** |

Test-11 root cause (probed live with console capture): `/room/<unknown>` →
`rooms:getRoom` throws server-side for the malformed id → real `useQuery`
re-throws during render in `App.tsx` (and `WorkspaceShell`) with no boundary →
React unmounts the whole tree → empty body. Fixed with the never-throw
`useRoom()` at all three `getRoom` call sites. Also failed in R8 (same mechanism).
Live evidence after fix (`rounds/evidence/R8-live-11-unknown-room.png`,
`R8-live-11-unknown-route.png`): shell renders; sidebar shows the P020 sign-in
row (stale session, no JWT — correct); conversation/visual panes show
"Couldn't load…" + raw Convex error + Retry via the boundary (error is a bad-id
Server Error, correctly classified as non-auth).

## Offline evidence (four auth states, reviewed)

- `rounds/evidence/R13-offline-01-password-step.png` — password step (reviewed)
- `rounds/evidence/R13-offline-02-signup-step.png` — sign-up variant
- `rounds/evidence/R13-offline-03-wrong-password.png` — inline error (reviewed)
- `rounds/evidence/R13-offline-04-signed-out-sidebar.png` — sidebar sign-in row +
  conversation sign-in prompt, no LOADING (reviewed)

## Deviations from the brief

1. No `convex/` change: the conditional `whoAmI` was unnecessary — `users.viewer`
   already returns `worldId`. Nothing else in `convex/` touched.
2. Removed the legacy auto-redirect on `/auth` (session → bounce to `/`): with no
   JWT that looped `/` (error-as-empty) ↔ `/auth` for mid-migration users, and it
   would bounce password-upgraders out of the form. Authenticated users still
   route out via the JWT effect; legacy sessions reach the upgrade form.
3. `Home` on nav error renders the empty home (sidebar carries the sign-in row)
   instead of redirecting — same loop avoidance.
4. Commit pathspec files `src/lib/session.ts`, `src/v2/conversation.css`,
   `convex/v2Workspace.ts` are unchanged (add is a no-op for them) — no edit was
   needed in any of them.
5. Deleted orphan snapshot `e2e/__screenshots__/desktop/auth-sent.png` (sent-card
   UI no longer exists); `auth-empty/auth-invalid` pass unchanged.
6. Test 11 fix (`useRoom`, regression test) is extra scope but same P020 defect
   class, found live, verified live.

## What still fails live and why

- 01–10: **env** — clone lacks `JWT_PRIVATE_KEY`. Unblocks the moment Patrik runs
  `tools/copy-live-env.sh` and the suite re-runs; no code change needed. The
  e2e password lives in `/tmp/corner-v2-e2e.env` only (never committed).
- 11: fixed and green.
- No backend gap and no remaining UI defect known; the client now surfaces
  backend errors (inline alert / sign-in row / error+Retry) instead of
  LOADING-forever or blank.

## Commit

`feat: sign the web in through Convex Auth so v2 works against a real backend`
paths per the brief (session.ts / conversation.css / v2Workspace.ts unchanged,
add is a no-op). Never pushed. No `/tmp` files, preview URLs in env files, or
credentials committed.
