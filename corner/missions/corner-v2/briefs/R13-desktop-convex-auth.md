# Brief R13-desktop-convex-auth — make the web app authenticate with Convex Auth so v2 works against a real backend

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `rounds/LEDGER.md` rows R8 and ENV, and `punch-list.md` P020.
Write your report to `rounds/R13-desktop-convex-auth.md`: every command with its output.

You are a headless worker, the BUILDER. Nobody will answer questions.

## The problem, exactly

The v2 backend derives the user from Convex Auth (`getAuthUserId(ctx)` reads the JWT). The web
client never obtains a JWT: `src/routes/Auth.tsx` calls the legacy `api.users.signIn({ email })`
(email only, no password, creates the user if missing) and stores a `corner_session` in
localStorage (`src/lib/session.ts`). Legacy functions accept that (`resolveViewer` fallback); every
`v2*` function throws `"Not signed in"`. The offline e2e never noticed because the stand-in mocks
the façades. Against the production clone the shell renders, the sidebar shows `LOADING…` forever,
the conversation pane is empty (evidence: `rounds/evidence/R8-live-06-second-project.png`).

The backend already has the right thing: `convex/auth.ts` = `@convex-dev/auth` with the `Password`
provider, `createOrUpdateUser` that links a sign-up to an EXISTING `users` row by email (so Karen
and Patrik keep their rooms, reads, memberships), `auth:changePassword`, and the migrated-user flow
(`mustChangePassword`). The native app already sends a Bearer JWT (R9). The web has to catch up.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `184c576` or later (R12 may have landed `aom-r12` on top).
  Offline e2e: `npm run e2e` (65 desktop tests, stand-in in `scripts/audit/mock-convex-react.tsx` +
  `fixtures.ts`). `npm test`, `npm run lint`, `npm run build`. Live spec (untracked, from R8):
  `e2e/live.spec.ts` + a `live` project in `playwright.config.ts` behind `LIVE_BASE_URL`; keep both,
  finish them, commit them (R8 could not).
- Deployments: rehearsal `dev:adjoining-tiger-87` (`.env.local`), production clone
  `prod:brilliant-scorpion-163` (`https://brilliant-scorpion-163.convex.cloud`). BOTH LACK
  `JWT_PRIVATE_KEY`/`JWKS` until Patrik runs `tools/copy-live-env.sh`; check with `npx convex env
  list --deployment adjoining-tiger-87 | grep -oE '^[A-Z_]+='` (names only, never values). If the
  keys are absent, do all the offline work, run the live suite anyway, and report the auth failures
  as "blocked on env"; do not generate keys yourself.
- Never touch `neat-pony-216`. Never touch `convex/` except the two additive items below. A backend
  worker may be in `convex/` (R12); on a foreign type error wait 60 s, retry ≤ 8.

## Step 1 — failing tests

Offline: extend the stand-in with a mock of `@convex-dev/auth/react` (`ConvexAuthProvider`,
`useAuthActions` → `{ signIn, signOut }`, `useConvexAuth` → `{ isLoading, isAuthenticated }`) that
flips a fixture flag; add e2e tests: `sign-in form takes email then password and lands in the
workspace`, `sign-up with a new email sets a password and lands in onboarding`, `wrong password
shows the error inline, no navigation`, `sign-out clears the session and returns to /auth`,
`unauthenticated v2 query shows the sign-in state, not loading` (P020: render `.v2-sidebar` with a
"Sign in to see your projects" row + button when the navigation query errors with `Not signed in`,
never a permanent LOADING). Run; paste failures.

Live: in `e2e/live.spec.ts` test 01 becomes the password flow (sign up with a fresh
`corner-v2-e2e+<ts>@aom-inhouse.com` + random 24-char password kept in `/tmp/corner-v2-e2e.env`
only; reload persists; sign out; sign in again with the password).

## Step 2 — implement

- `src/main.tsx`: wrap the app in `ConvexAuthProvider` (`@convex-dev/auth/react`) around the
  existing `ConvexProvider`/client (use `ConvexAuthProvider client={convex}`; keep the same
  `ConvexReactClient`).
- `src/lib/auth.tsx`: source of truth becomes `useConvexAuth()`; after `isAuthenticated`, load
  `api.users.viewer` (exists live) and WRITE the legacy `corner_session` from it (userId, worldId
  via `worlds.forViewer`/`homeWorld`, email, name) so every legacy screen and the compat bridge keep
  working during dual-write; `clearSession()` on sign-out. Read the merged file first; it already
  has a "session self-heal via worlds.resolveForSession" path — keep it as the fallback for a
  session that exists without a JWT (legacy users mid-migration), but new sign-ins go through
  Convex Auth.
- `src/routes/Auth.tsx`: the design's 620px column stays; the email field + "Continue with email"
  now advances to a second step in the same column: password field (56px, `Space Mono` off, normal
  text field), "Continue" 56px, a muted line "First time here? Set a password" that switches
  `flow` between `signIn` and `signUp`, inline error under the field on failure (never an alert),
  and "Back". Calls `useAuthActions().signIn("password", { email, password, flow })`. On success:
  onboarding if the user has no v2 workspace yet (`v2Native.workspaceTree` null or
  `v2Workspace.getNavigation` empty and no legacy rooms), else `/`. Google/Apple/SSO rows stay
  disabled with the tooltip. Keep the legacy `users.signIn` call ONLY behind a
  `?legacy=1` query flag with a visible "Legacy sign-in (no password)" label, for the compat bridge
  tests; it is not the default path.
- Sign-out: `useAuthActions().signOut()` then `clearSession()`, navigate to `/auth`.
- P020: `src/v2/WorkspaceSidebar.tsx` (or `src/lib/workspace.ts`): when `useWorkspaceNavigation()`
  errors with `Not signed in`, render the sign-in row; when it errors otherwise, render the error
  text with a Retry; LOADING only while `undefined`.
- Backend (additive only): if `api.users.viewer` does not return `worldId`, add
  `convex/v2Workspace.whoAmI({})` query → `{ userId, email, name, workspaceId, workspaceSlug }` from
  `requireViewer` + `homeWorld`, and use it instead. Nothing else in `convex/`.
- `scripts/audit/mock-convex-react.tsx` / `fixtures.ts`: the auth mock above; every existing test
  that seeded `corner_session` keeps working because the stand-in treats a seeded session as
  authenticated.

## Step 3 — gates

```bash
npm run lint
npm run build
npm test
npm run e2e
```

All green, zero skips (new tests included). Then, if the auth keys are present on the clone:

```bash
npx vercel pull --yes --environment=preview && npx vercel build && npx vercel deploy --prebuilt --env VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud --env VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site 2>&1 | tail -3
LIVE_BASE_URL=<new preview url> npx playwright test --project live 2>&1 | tail -30
```

Paste the per-test table. If keys are absent, run it anyway, paste the table, and mark the run
"blocked on env: JWT keys absent on the clone". Evidence to `rounds/evidence/R13-*.png` (offline:
the four auth states; live: whatever passes).

## Step 4 — commit

```bash
git add src/main.tsx src/lib/auth.tsx src/lib/session.ts src/lib/workspace.ts src/routes/Auth.tsx src/v2/WorkspaceSidebar.tsx src/v2/workspace.css src/v2/conversation.css scripts/audit/mock-convex-react.tsx scripts/audit/fixtures.ts e2e/visual.spec.ts e2e/live.spec.ts playwright.config.ts e2e/__screenshots__/desktop convex/v2Workspace.ts
git commit -m "feat: sign the web in through Convex Auth so v2 works against a real backend"
git log --oneline -3 && git status
```

Never commit `/tmp` files, preview URLs in env files, or credentials.

## Report `rounds/R13-desktop-convex-auth.md`

The before/after auth flow; the four offline auth states with evidence; the live table; whether
the clone had keys; what still fails live and why (be exact: backend gap vs UI defect vs env);
deviations.

## Hard rules

Never send a client-asserted user id to a v2 function. Never keep LOADING as the answer to an auth
error. Never touch `neat-pony-216`. Never generate or copy secrets. Never `vercel --prod`. Never
`git add -A`. Never push.
