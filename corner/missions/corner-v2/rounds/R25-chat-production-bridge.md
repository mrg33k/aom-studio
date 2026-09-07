# R25 — chat production bridge (the third lane, round three)

Worker: headless builder. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R20-chat-team-protocol.md`,
`rounds/R21-chat-live-brains.md`, `rounds/LEDGER.md` (PRODUCTION LIVE row).

Verdict: the service is built, unit-pinned, and proven on production with
everything EXCEPT the bot's own identity — which is blocked on two things
only the orchestrator can do (backend deploy + bot password reset, both with
exact commands below). Live suite on production: **8/8 green** (tests 1–7 in
one shot on probe E + test 9 fake containment; test 8 skipped — needs a
second driver pass, R21 already proved interchangeability). Service mechanics
proven on production (dry run: 8 threads watched, 1 turn answered in ~10 s,
kill-switch exit 0). The launchd service is installed but NOT started: with
broken bot creds it would crash-loop, so starting it is the orchestrator's
first post-recovery step.

Rule compliance: nothing pointed at `neat-pony-216` (import-time refusal
kept, now unit-tested in both modes); `room-bridge` (95055) / `sse-bridge`
(95059) untouched; no email/Telegram/client-facing sends; no `src/` or
`ios-native/` edits; ports 3100–3102 used for my runs only, all down now;
port 3099 belongs to a stale foreign bridge (PID 9029, not mine, untouched);
no `git add -A`; nothing pushed. Test passwords live only in
`/tmp/corner-v2-e2e.env` and `/tmp/corner-v2-bridge-bot.env` (both 0600,
values never appear below).

## 0. What runs where (as this report lands)

Nothing of mine is running. PIDs from this round are all reaped (verified:
`curl :3100/:3101/:3102` refuse, no `v2-team-bridge` in `ps` but PID 9029):

| Process | Port | Log | State |
|---|---|---|---|
| `com.aom-ea.corner-v2-bridge` (plist installed, NOT loaded) | 3100 | `AOM-EA/corner/state/corner-v2-bridge.log` (absent — never started) | starts on orchestrator `bootstrap` after auth recovery |
| dry-run service (this round) | 3100 | shell output only | exited 0 via STOP file, verified |
| live suite bridge (this round) | 3101 | shell output only | terminated after green run |
| fake bridge (this round) | 3102 | shell output only | terminated after green run |
| foreign stale bridge, PID 9029 (started Sep 6 19:04, live, thread `vd7c62…`) | 3099 | not mine | left alone |

## 1. Bot identity: one line of config, one incident, two orchestrator steps

**Shipped (uncommitted in the worktree at report time; commit below):**
`convex/lib/members.ts` gains `bridge@aom-inhouse.com` with an R25 comment,
plus `tests/v2/aom-members.test.ts` (2 tests, green in 602 ms). Auth chain
verified by reading code: listed email → `ensureHomeMembership` joins the
`aom` world as owner at sign-up; `homeWorld` prefers the `aom` membership, so
even a pre-deploy personal account heals to AOM once added.

**Incident (my bug, full disclosure):** the Playwright web sign-up failed
with "Couldn't reach Corner just now" (screenshot `/tmp/r25-bot-signup.png`;
the web form appears to send `flow: signIn` for an unknown email — possible
sign-up regression, one line for R18). I fell back to the API `signUp` flow,
which succeeded and created the users row. I then called
`auth:changePassword` (returned `ok: true`) — but my script crashed on a
later line BEFORE writing the new password to `/tmp/corner-v2-bridge-bot.env`,
so the file still holds the dead Playwright-attempt password and the real one
is lost. Both passwords now fail with masked Server Error, as does every
wrong password on this deployment (verified: ghost email + wrong e2e password
mask identically — the mask is normal here, not evidence of corruption; the
e2e account still signs in fine). The account is recoverable, not lost.

**For the orchestrator (in order):**

1. Deploy the backend with the members.ts change (I did NOT deploy):
   `cd /Users/aom-inhouse/aom-studio-transfer/corner-v2-integration && CONVEX_DEPLOY_KEY=$(cat /tmp/r18-deploy-key) npx convex deploy -y`
   (loop's own pattern; worktree `convex/` is otherwise clean — only
   `members.ts` modified there). Verify: bundle/code timestamp newer than
   this round.
2. Reset the bot password (needs a deployment key the worker never sees):
   `auth:adminSetPassword` with `AUTH_SEED_KEY`/`TASKS_KEY`,
   `{email: bridge@aom-inhouse.com, password: <new random>, temporary: false}`,
   then write it to `/tmp/corner-v2-bridge-bot.env` mode 0600. (My
   `changePassword` path works but needs a working sign-in first.)
3. Add the bot to AOM: `worlds:ensureMemberships` with the key (adds every
   listed email; idempotent). Confirm: sign in as the bot,
   `users:viewer` → `worldId k1798fjd7haec6r0ywkqzv5j858cgahm`, and
   `worlds:resolveForSession({worldId})` → `slug: "aom"`.
4. `launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.aom-ea.corner-v2-bridge.plist`
   then run the R25 service check + phone proof below.

## 2. Worlds the bot sees (measured, not assumed)

- AOM world: id `k1798fjd7haec6r0ywkqzv5j858cgahm`, slug `aom`
  (resolved via `worlds:resolveForSession({worldId:"aom"})` → healed:true).
  The bot's home WILL be this world after step 3 above; `getNavigation`
  returns only the home world's threads, so the service can only ever answer
  AOM threads. Karen's world membership cannot be checked from any public
  query (no membership enumeration exists); the enforced invariant is
  home-world scoping. Confirm Karen's AOM membership in the dashboard before
  launch — if her threads live in AOM, the bot will (by design) answer them.
- The e2e account does NOT live in AOM: its world is
  `k176v4rce6px3n8zfsjmzy6dpn8dzc37`, slug `user-jx74…` (personal). Its Aster
  is a personal copy. Consequence for the phone proof: the bot joining AOM
  does NOT make it a member of the e2e world. Either add the bot to the e2e
  world by hand (no public mutation does this — dashboard), or do the phone
  proof signed in as Patrik in AOM. The AOM proof stays ledger +
  `threadEvents`, per the brief.

## 3. What was built (service mode behind `R25_MODE=service`)

`scripts/v2-team-bridge.py` (+~330 lines, stdlib only): `R25_MODE=service`
selects a `ServiceBridge` that signs in as the bot, sweeps `getNavigation`
every tick (default 15 s), and polls `v2Native:threadEvents` per thread for
person entries newer than the thread's durable baseline. Each thread gets a
rebound R20 `Bridge` scope (same `plan_turn`/`live_plan`/`context_pack`/
`execute_plan`) with per-thread `handled` set, `last_ts`, run history, and
error counts in `R25_STATE_DIR/<threadId>.json` (+ `service.json` for the
hourly counter) — durable across restarts. First sight baselines history
(never answers pre-start threads); only `authorType == "user"` blocks are
handled, so it never answers its own (agent) blocks, and the service never
calls `sendMessage` itself. Identity: per-scope `provider`
`corner-v2-chat`, `surface` `terminal:corner-v2-chat`, event ids `r25-*`;
ledger `who` was already `agent:<brain>` — the string "bridge" appears
nowhere the person can see (verified in §5).

Rails: per-thread lock + global in-flight set (a thread never gets two
driver turns at once); pool cap `R25_MAX_CONCURRENCY` (default 3); hourly
turn cap `R25_MAX_TURNS_PER_HOUR` (default 60, skipped turns stay unhandled
for a later hour); adapter timeout per call + `R25_TURN_BUDGET_S` (default
240 s, flagged `over-budget` in the log — deliberately not preempted, killing
a turn mid-run would corrupt runs); kill switch `R25_STOP_FILE`
(default `/tmp/corner-bridge.STOP`) checked every tick → clean exit 0;
per-block retry cap `R25_MAX_RETRIES` (default 3, then `error-gave-up`).
One log line per turn: `thread=… brain=… secs=… cost=… outcome=…`
(`done|fallback|skipped-cap|error|error-gave-up`, `|over-budget` suffix).
Service refuses `R20_BRAIN_MODE != live` (exit 2) unless `R25_ALLOW_SCRIPT=1`
for mechanics dry runs, and refuses `neat-pony-216` at import in both modes.
`/health` + `/r20/state` stay suite-compatible (`thread/driver/handled/runs`
follow `R20_THREAD` as the primary thread) with a `service` extra
(threads, inFlight, turnsLastHour, nav titles, stop-file presence).

`scripts/test_v2_team_bridge.py`: 9 new tests (service refusal of live in
both modes, live-only gate, ISO/change-signal, hourly cap + prune, log-line
shape, fallback detection, no-"bridge" identity, bot-env cred loading).
**35/35 green** (`python3 scripts/test_v2_team_bridge.py`).

Launchd: `scripts/corner-v2-bridge.sh` (reads the 0600 env file itself,
`exec`s the bridge, no secrets in the plist), `corner/state/
corner-v2-bridge.env` (0600, production tuning, port 3100), `~/Library/
LaunchAgents/com.aom-ea.corner-v2-bridge.plist` (KeepAlive, 60 s throttle,
stdout+stderr to `corner/state/corner-v2-bridge.log`, only PATH+HOME in
EnvironmentVariables). In-process `fcntl` singleton lock (exit 4 on a
duplicate — the `bridge-singleton-guard` pattern: the keeper keeps running).

## 4. Proof on production I: live suite 8/8 (Muse driver, Claude guest)

Bridge: test-mode, `R20_BRAIN_MODE=live`, `R21_DEFAULT_BACKEND=muse`,
`R21_BACKENDS_JSON={"steffen":"claude"}`, port 3101 (3099 was held by the
stale PID 9029). Suite: `LIVE_BASE_URL=https://corner-convex.vercel.app`
(production), tests 1–7 in ONE invocation on probe E (thread
`vd77w4q34x8vtnrt9qy9vdjv9x8dzdw2`, mission `ts70q9sgtfnt9y78g03c1zvwys8dybq8`,
kept live as the proof thread) + test 9 with the fake bridge on 3102:

```
Running 7 tests using 1 worker
  ✓ 1 brief → ONE structured driver turn ... 7 defects ... 7 passed (2.3m)
  ✓ 9 a contract-breaking brain is contained, never silent (18.1s)
```

Test 8 skipped (needs a second live driver pass; R21 test 8 already proved
Claude/Muse interchangeable). Per-call record (`liveCalls`): 9/9 ok first
attempt, zero fallbacks — Muse driver 3.7–8.2 s (median ~6 s, no token
meter, $0 marginal), Claude guests 14.8 s ($0.3639) + 10.1 s ($0.3657).
Suite Claude spend ≈ $0.73. Wording gate re-verified over all 9 E-thread
replies (evidence `rounds/evidence/R25-reply-*.txt`, shots
`R25-chat-live-{1..6}.png`): 13–71 words, zero em-dashes, zero "as an AI",
every reply names Aster/the mission, step 4 carries "Buyers". Honest
carry-overs: both Steffen guests refused to invent colours/stills (asked for
the kit source/hex — correct), driver closes smooth the caveat a little
("Your Ink Signal Bone colour check stays in" — the R21 §8.5 template
overstatement, still open, one-line bridge change); `latest` leads with a
backend run-row before the Buyers fact (R21 §6.7, unchanged).

Transients, disclosed: test 1's backend-poll timed out twice (first runs on
probes B and C) while the backend turn had landed correctly ~10 s after the
send in both cases (verified by direct re-query within minutes: steps +
2-option question, run `done`, ledger `asked`). Cause undetermined — the
identical read path reproduced in node returns predicate=true. Next two runs
(test 1 on D in 24.9 s; full 7/7 on E in 2.3 m) were clean. No bridge-side
defect found; treating as harness flakes, not suppressing: the failures are
in this report, not in a skip.

## 5. Proof on production II: service dry run (script brains, e2e creds)

`R25_MODE=service R25_ALLOW_SCRIPT=1`, port 3100, state in
`/tmp/r25-dryrun-state`: signed in as the e2e account, baselined 7 threads,
discovered the fresh `R25 dry-run probe` on the next tick and answered the
brief in ~10 s — one line in the log:

```
[r25] turn thread=vd7022j4egbv0nma5zexpqn4bn8dy22h brain=paige secs=2.8 cost=- outcome=done
```

Backend check: `paige/steps` + `paige/question` (2 options, runId, brain);
ledger `asked | agent:paige | terminal:corner-v2-chat | Asked whether the
first deck pass is for Buyers or Press`; backend auto-rows read
`corner-v2-chat run`. No "bridge" string anywhere person-visible. Health
endpoint showed `threads: 8, turnsLastHour: 1`. STOP file → `kill switch
present, stopping`, exit 0. Probe archived afterwards.

## 6. NOT proven (blocked on §1): the bot's first real turn + the phone

- R25 service check (bot creates "R25 service check" in General, ONE message
  as the bot, driver answers ≤ 30 s): needs bot sign-in (step 2) + AOM
  membership (step 3) + running service (step 4). Exact sequence for the
  orchestrator is §1 steps 2–4, then send via `v2Workspace:sendMessage` as
  the bot and watch `/r20/state` + `threadEvents`.
- iPhone 17 Pro simulator screenshot (`971E7446-…`, booted, Corner
  installed): needs the above, plus the world problem from §2 — the sim must
  be signed in as someone who shares a world with the bot (Patrik in AOM is
  the clean path; the e2e account cannot see AOM threads).

## 7. Commits (scoped paths only, nothing pushed)

- AOM-EA (to commit): `scripts/v2-team-bridge.py`,
  `scripts/test_v2_team_bridge.py`, `scripts/corner-v2-bridge.sh`,
  `corner/state/corner-v2-bridge.env`,
  `aom-studio/corner/missions/corner-v2/rounds/R25-chat-production-bridge.md`
  (this file) + `rounds/evidence/R25-chat-live-{1..6}.png` +
  `rounds/evidence/R25-reply-*.txt`. NOT committed: `e2e/results-r25/`,
  `/tmp` probes/scripts (left for re-runs).
- Web worktree (to commit): `convex/lib/members.ts`,
  `tests/v2/aom-members.test.ts`. Nothing else (the worktree has other
  lanes' uncommitted files — I staged nothing outside these two).
- Plist lives outside git (`~/Library/LaunchAgents/`), installed not loaded.

Production writes this round (all labelled probes, all archived except E):
dry-run probe (archived), suite probes A–D + fake (A–D + fake archived, E
live as proof), their turns + ledger rows. No other thread was answered by
any of my bridges (baselines only).

## 8. Caps, rollback, costs

Caps (env file): 3 concurrent turns, 60 turns/hour/workspace, 240 s
turn-budget flag, 3 retries/block, adapter 120 s/call, STOP file.
Rollback: `launchctl bootout gui/$UID/com.aom-ea.corner-v2-bridge` AND
`touch /tmp/corner-bridge.STOP` (bootout alone restarts clean on next load;
STOP alone spin-exits every 60 s under KeepAlive — do both), then
`launchctl print` to confirm down. State files survive in
`corner/state/corner-v2-bridge/` for a later resume. Costs observed:
Muse $0 marginal, Claude ≈ $0.36/guest turn; a busy production hour (60
turns, mixed) ≈ $10–20 worst case if every turn pages Claude — the default
map pages Claude only for Steffen mentions.

## 9. For Patrik

Two decisions are yours, both one-liners. Driver map (unchanged since R20,
still a guess with a rationale): **Paige drives Aster** (proved again
tonight: clean closes, ledger-faithful `latest`), Steffen for brand-led
projects, Mom everywhere else — it lives in `R20_DRIVERS_JSON` in
`corner/state/corner-v2-bridge.env`, no redeploy to change. Bot email:
**bridge@aom-inhouse.com is now in the AOM member list** (one-line diff,
waiting on the orchestrator's deploy) — the bot joins AOM as owner at its
first sign-in and answers every v2 thread there as Paige/Mom/Steffen, never
as "bridge". Nothing answers the new web or the phone until the deploy +
password steps land; the service, the suite proof (8/8 live on production),
and the launchd wiring are all done and waiting.
