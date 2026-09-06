# Brief R8-deploy-preview-live-e2e — Vercel preview of the integration branch against the production clone, then a real end-to-end run with a real account touching every feature

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40 gate 2), `rounds/R4-backend-cutover.md` (the production clone:
deployment name, URL, both workspaces in `v2_dual_write`, the migration key handling), and
`docs/superpowers/audits/2026-09-06-production-clone.json` in the worktree. Write your report to
`rounds/R8-deploy-preview-live-e2e.md`.

You are a headless worker, the BUILDER + TESTER. Nobody will answer questions. PRECONDITION: the
R4 cutover report must exist and say both workspaces are `v2_dual_write` on the clone; if it does
not, write `blocked: R4-backend-cutover has not run` in your report and stop.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD = the R7 desktop fixes commit or later. `.env.local` points at
  the REHEARSAL deployment; the production clone's name/URL are in the R4 report. You never touch
  `.env.local`, never touch `neat-pony-216`.
- Vercel: the corner-convex project is already linked (`.vercel/` is gitignored; if it is missing,
  `npx vercel link --yes` and paste which project it linked; if it links to the LIVE production
  project, that is fine for a PREVIEW deploy, but you must never run `--prod`). Memory note: a
  Vercel `402 DEPLOYMENT_DISABLED` means team billing; stop and report, do not debug.
- Live e2e credentials: create ONE fresh test account on the CLONE only via the app's own sign-up
  (email `corner-v2-e2e+<timestamp>@aom-inhouse.com`, a random 24-char password stored ONLY in
  `/tmp/corner-v2-e2e.env`, never in the repo, never in the report). Karen's and Patrik's accounts
  are never used or touched by tests.

## Step 1 — preview deploy against the clone

```bash
npx vercel pull --yes --environment=preview
npx vercel build
npx vercel deploy --prebuilt --env VITE_CONVEX_URL=<clone .convex.cloud URL> --env VITE_CONVEX_SITE_URL=<clone .convex.site URL> 2>&1 | tail -20
```

Record the preview URL. Open it headless; `document.title` and the sign-in screen must render
within 5 s; paste the timing. Confirm with `curl -sI <preview>/` that it is 200 and that the JS
bundle references the CLONE URL, not `neat-pony-216` (`curl -s <bundle> | grep -o '[a-z-]*-[0-9]*\.convex\.cloud' | sort -u`).

## Step 2 — the live suite

Create `e2e/live.spec.ts` (Playwright project `live`, added to `playwright.config.ts` behind
`process.env.LIVE_BASE_URL`, desktop 1440x900, no screenshot comparison, `retries: 1`) covering,
against the preview URL with the test account, every feature in the two plans' acceptance
checklists:

1. Sign up, sign in, sign out, sign in again (session persists across reload).
2. Onboarding six steps to a first project + mission; lands on `/c/<threadId>`.
3. Sidebar: project + mission rows, `+ New`, `Project +`, `+ New mission` (creates a real mission),
   chevron collapse persists across reload, Recent updates after sending, needs-you dot appears
   when an agent question block arrives (skip with a logged note if no agent is wired; do NOT fake).
4. Conversation: send text (persists across reload and in a second browser context signed in as
   the same account), retry on a forced network failure (block the Convex origin with
   `page.route`, send, unblock, retry succeeds), paperclip upload of `public/fixtures/aster-brief.pdf`
   creates an artifact that opens a Visual Window tab, `@brain` mention chip renders.
5. Global routing: type in the sidebar `#global-input` a sentence naming the project → route
   banner path + Move; an unrelated one-off → proposal → "Create mission in General" creates it
   and General shows it.
6. Cross-project: create a second project; from the first, propose a write to the second (use the
   `audit_propose_write=1` flag path R5 documented, or the kebab), confirm, the second thread shows
   the linked block, the first shows the summary, a second confirm fails.
7. Visual Window: open pdf, photo, site, code from file cards; tabs order/close/reorder/active
   persist across reload and in the second context (shared session); Preview/Context persist;
   Review: 4 pins max (toast on 5th), send checklist → message + review off after resolve;
   lightbox + Escape; email/tracker tool tabs show the deferred state.
8. Settings: five sections render; Appearance preference persists; notifications popover opens at
   the footer bell.
9. Ledger visibility: after the session, `v2Ledger.latest` (call through the app? No: verify via
   `npx convex run` is unsigned and fails; instead assert from the UI that Context view lists the
   provenance/ledger lines the session produced, if the Context view shows them; otherwise log
   "ledger UI not surfaced" as a finding, not a failure).
10. Isolation: a second fresh account cannot see the first account's project (navigate to its
    `/c/<threadId>` URL → access denied state, not the content).
11. Legacy compatibility: the OLD route `/room/<legacy room id>` for a mapped Karen room? NO —
    never use Karen's data. Create a legacy-shaped room through the compat path only if a public
    mutation allows it; otherwise assert that `/room/<unknown>` renders the not-blank fallback.

Run: `LIVE_BASE_URL=<preview> npx playwright test --project live`. Every test passes or is
`test.skip` with a one-line reason that names a missing backend capability (never a UI defect).
Screenshots of every step to `rounds/evidence/R8-live-<step>.png` (page.screenshot in the test).

## Step 3 — the offline suite still green + cleanup

```bash
npm run lint && npm run build && npm test && npm run e2e
```

Then remove the test accounts' data from the CLONE only, through the app's own delete-account
path if it exists (`users:deleteAccount` is a live function; use it via the UI, not via a key).
If no UI path exists, leave the two accounts and list their emails in the report.

## Commit

```bash
git add e2e/live.spec.ts playwright.config.ts
git commit -m "test: live desktop e2e against the production clone preview"
```

Never commit the preview URL's env, `/tmp` files, or credentials.

## Report `rounds/R8-deploy-preview-live-e2e.md`

Preview URL; bundle-URL proof; first-paint timing; the live run's per-test table (pass/skip +
reason); evidence paths; offline gate outputs; findings that are backend gaps (for the
orchestrator's next backend brief); what a human should click before the production cutover.

## Hard rules

Never `vercel --prod`. Never touch `neat-pony-216`. Never use Karen's or Patrik's accounts. Never
put a credential in the repo or the report. Never skip a test to hide a UI defect. Never
`git add -A`. Never push.
