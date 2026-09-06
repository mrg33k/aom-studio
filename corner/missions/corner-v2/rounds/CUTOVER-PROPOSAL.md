# Corner v2 — production cutover proposal (draft for Patrik)

Status: DRAFT, 2026-09-06 9:25 AM Phoenix. Not executed. Nothing here runs until Patrik says go.

## What "cutover" means here

The website (Vercel project for corner-convex) today talks to the Convex DEV deployment
`neat-pony-216`. Cutover = the website starts talking to the production deployment
`brilliant-scorpion-163` (project `corner-v2-production`), which holds a verified copy of live plus
the v2 schema, code, and migrations. No DNS, no domain, no data deleted anywhere. `neat-pony-216`
stays untouched as the rollback target.

## Preconditions (all must be true; each has evidence in `rounds/`)

1. Offline desktop suite green on the branch: yes (`9c54f4a`: lint 0, vitest 150, e2e 70).
2. Clone has live's environment variables: 13/15 yes; `JWT_PRIVATE_KEY` and `APNS_PRIVATE_KEY`
   pending Patrik's re-run of `tools/copy-live-env.sh`.
3. Live suite green against a preview pointed at the clone with a fresh account: NOT YET (blocked
   on 2). Target: 11/11 in `e2e/live.spec.ts`.
4. Karen's data on the clone: 365 messages, 6 projects, 3 missions, checksums 9/9, `v2_dual_write`.
5. AOM data on the clone: 47 projects, 121 missions, checksums 168/168, `v2_dual_write`.
6. Old clients keep working through the compat bridge in dual-write: unit-proven (`compat-fixtures`);
   the shipped iPhone build has NOT been pointed at the clone yet (native v2 is mid-build; the old
   iOS app talks to live and would keep talking to live until its own release).

## The delta problem (the step that bites)

The clone was imported from the 2026-09-05 10:58 PM backup. Everything written on live after that
(Karen's messages today, Patrik's rooms, ledger rows from the Mac hooks) is NOT on the clone. So
the switch needs a short freeze and a re-sync:

1. Announce a 15-minute freeze (Karen + Patrik + the Mac hooks; stop `sse-room-bridge`/routine
   daemons that write to live).
2. Fresh full export of live with storage (`npm run backup:v2-live` with a new dated path).
3. Import it into the clone with `--replace-all` (wipes the clone's v2 rows too), then re-run the
   two migrations with the committed manifests (`scripts/v2-verify.mjs … --apply` twice per
   workspace; they are idempotent and checksum-verified), re-record gates, re-activate dual-write.
   ~20 minutes end to end on today's numbers (R4/R12 timings).
4. Only then flip the website.

Alternative with no freeze: a delta importer (rows newer than the snapshot). Not built; not worth
building for a one-time switch on this data size.

## The switch

- Vercel: set `VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud` and
  `VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site` on the production environment,
  redeploy `codex/corner-v2-integration` merged to `main`. That is `vercel --prod`, which is
  Patrik's hand by LOOP.md.
- The Mac hooks and scripts that write the ledger (`LEDGER_KEY` writers, `ledgerTokens`) point at
  the deployment URL in their config; they follow the same env switch (list of files to be
  produced by the cutover round; the ledger token row was copied with the data so the token stays
  valid).
- iPhone app: unchanged until its own release; it keeps working against live via the compat
  bridge only if it is ALSO pointed at the clone; otherwise it keeps writing to `neat-pony-216`
  and those writes are NOT mirrored. Decision needed: either release native v2 at the same time
  (weeks away) or ship a one-line URL change to the current iOS build first (TestFlight), or accept
  that the phone is read-only/stale during the gap. Recommendation: URL-change build first.

## Rollback

Set the two Vercel env vars back to `neat-pony-216` and redeploy `main` at the pre-cutover commit.
Data written to the clone during the window would be stranded (same delta problem in reverse), so
the rollback decision should be made within the first hour, while the volume is small enough to
re-key by hand.

## After the switch

- `v2_dual_write` for 7 days with the reconciliation script run daily (gate for `v2_primary`).
- Then `promotePrimary`, then remove compat paths per the plan's delivery step 8.
- Delete the stray empty deployment `lovable-weasel-178` and revoke the `r12-deploy-key` /
  `clone-deploy-key` tokens in the Convex dashboard (no CLI path).
- Rotate the APNS key (exposed fragment in the 2026-09-06 transcript) and set the new value on live
  and the clone.

## Decisions for Patrik

1. Go / no-go once the live suite is 11/11.
2. Freeze window (15 min) — when.
3. iPhone: URL-change TestFlight build first, or wait for native v2.
4. Keep the current `SITE_URL` on the clone (the R4 worker set it) or set it to the production
   site URL before the switch (needed for password-reset emails if those get enabled).
