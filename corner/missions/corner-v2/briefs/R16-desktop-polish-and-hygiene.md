# Brief R16-desktop-polish-and-hygiene — human sign-in errors (P021), verify-script flag safety, deploy-token inventory

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `punch-list.md` P021, and `rounds/R12-backend-aom-missions-and-cleanup.md`
("Decisions for you" 1 and 2). Write your report to `rounds/R16-desktop-polish-and-hygiene.md`.

You are a headless worker, the BUILDER. Nobody will answer questions.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `9c54f4a` or later. `npm run lint`, `npm run build`, `npm test`
  (150), `npm run e2e` (70). `.env.local` → rehearsal `adjoining-tiger-87`; never touch
  `neat-pony-216`. A native worker is in `ios-native/` (other repo); nobody else is in this
  worktree.

## Part A — P021: sign-in errors in plain words (`src/routes/Auth.tsx` + a test)

Map Convex Auth failures to sentences, rendered inline under the field (the R13 inline slot):
- password wrong / account exists with another password → "That password doesn't match. Try
  again, or set a new one if this is your first time."
- sign-up on an email that already has a password → "This email already has a password. Sign in
  instead." (switch the flow link accordingly)
- password too short (server says "at least 8 characters") → "Use at least 8 characters."
- network / server error (`Server Error`, missing env, request id) → "Couldn't reach Corner just
  now. Try again in a moment." with the raw message in the element's `title` and in
  `console.warn`.
Add an offline e2e per line (the stand-in's auth mock throws each shape). Never show a request id
or a `[CONVEX …]` prefix in the visible text.

## Part B — `scripts/v2-verify.mjs` flag safety

Today `--deployment` is silently ignored (R12 finding) and would have run against the wrong
deployment. Make the script: parse its flags strictly (unknown flag → exit 2 with the list of
accepted flags), support `--deployment <ref>` by passing it to every `npx convex …` call it makes
AND by reading the migration key from that deployment (`npx convex env get CORNER_V2_MIGRATION_KEY
--deployment <ref>` into a variable, never printed), refuse `neat-pony-216` in either `.env.local`
or `--deployment`, and print the resolved target deployment name at the top of every run. Keep
`--env-file` working. Add `tests/v2/verify-cli.test.ts` (vitest, spawns the script with `--help`,
an unknown flag, and `--deployment neat-pony-216`; asserts exit codes and messages; no network).

## Part C — deploy-token inventory (report only)

List (names only) the deploy keys that exist for the clone and rehearsal if the CLI can show them
(`npx convex deployment token --help`; if there is a list subcommand). Write the dashboard steps to
revoke `r12-deploy-key` and `clone-deploy-key`. Do not create or revoke anything.

## Gates

```bash
npm run lint && npm run build && npm test && npm run e2e
node scripts/v2-verify.mjs --help
node scripts/v2-verify.mjs --bogus; echo "exit=$?"
```

## Commit

```bash
git add src/routes/Auth.tsx src/v2/conversation.css scripts/audit/fixtures.ts scripts/audit/mock-convex-react.tsx e2e/visual.spec.ts e2e/__screenshots__/desktop scripts/v2-verify.mjs tests/v2/verify-cli.test.ts
git commit -m "fix: plain sign-in errors and strict verify-script flags"
```

Update P021 in `punch-list.md` with evidence `rounds/evidence/R16-auth-errors-1440.png`.

## Hard rules

Never touch `neat-pony-216`. Never print a key. Never edit `convex/`. Never `git add -A`. Never
push.
