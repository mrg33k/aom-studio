# Corner Refactor Plan — Path to launch (rewrite 2026-04-19)

**Hook-scope note.** The canonical refactor-plan lives in `AOM-EA/projects/corner/refactor-plan.md`. The worker PreToolUse hook (R4e-3) blocks writes outside the assigned repo (`aom-studio`), so this file contains the rewritten "Path to launch" section only, not the full history. Merge into AOM-EA's copy: replace the sections `## Path to launch (R5–R8 draft, ratified 2026-04-19)` through the end of the file with the content below. R1–R4 history above that heading in AOM-EA's copy stays as-is.

**Paired with:** `projects/corner/vision-qa/2026-04-19.md` (eight findings, severity distribution 3×5 / 3×4 / 2×3).

---

## Preamble — why R9–R11 as drafted is dropped and what replaces it

R5–R8 all flipped ✓ DONE on 2026-04-19 under the "VISION commitment live at 100%" gate. R5c-real / R6a-real / R7b-real / R8a-real shipped 20/20 acceptance scripts the same day. Patrik's read afterwards: *"on my end not much has changed."* The vision-qa pass on 2026-04-19 confirms his read:

- **The EA is silent.** 3/3 messages to Elon from the dashboard went unanswered in 60s windows. Patrik's own `"hey are you there?"` from 1h before the run is still sitting with a double-tick and no reply. Elon's `agent_status.status` has read `working` since 2026-04-01 — 18 days.
- **Tasks are not at 95%.** Last 50 tasks = 30 done / 16 failed / 4 in-flight. 65.2% closed success rate. **13 of 16 failures (81%) are zombie workers** — the same pattern R4e-2 was supposed to close.
- **R5c-real's 20/20 is a false positive.** The listener source-allowlists `accept-R5c` and synthesizes `injected`/`replied` traces; the harness never exercises the real super-agent. When the super-agent is dead, the acceptance test is still green.
- **R6b's project cards are not rendering for the test user.** Daemon is writing `project_summary` events every 60s. UI doesn't surface them on Tasks view — the view shows a Files 242 list of static briefs instead.
- **Failure cards don't reach the home surface.** Rex's card on home shows the failure reason line but no retry button. R5b shipped the failure variant on Tasks, not on home AgentCards.

**R9–R11 as drafted is dropped.** That draft ordered tier caps → resurrection → multi-agent. Tier caps are irrelevant if nobody can talk to the EA; multi-agent is irrelevant if even one agent doesn't stay alive. The real ordering is: **fix the center** (super-agent liveness, the 18-day-stale status row, the zombie worker loop that makes every third task die) **then** fix the rest.

R9-pre (hardened gate) already landed today inside R5–R8 re-ship; its bug is that the only surface it gated was a scripted acceptance test — not a real user sends a real message. This rewrite fixes that too.

---

## Rounds — by severity (worst UX hit first)

Numbering restarts from R12 to avoid conflict with already-shipped R5–R11 draft rounds. Each round maps to one finding from the 2026-04-19 vision-qa doc. "Acceptance test" is the concrete script path that would fail today and pass when the round is live at 100% (100% reliability rule still applies — 19/20 = FAIL).

Round | Finding | Severity | Commitment |
------|---------|----------|-----------|
R12 — Super-agent liveness + silence pager | 1 + 3 + 4 (+ 7) | 5+5+4+3 | EA 100% reliable + typing indicator reflects reality + conversational create reachable |
R13 — Zombie worker kill-and-retry | 2 | 5 | Tasks ≥ 95% closed-success |
R14 — Failure surface on home | 5 | 4 | Smooth path to success, not a dead end |
R15 — Project card render on Tasks view | 6 | 4 | Every project card stays fresh on its own |
R16 — Acceptance-test anti-false-positive | (crosscuts all) | — | Acceptance tests can't pass while the product is dead |
R17 — Voice-first onboarding skin | 8 | 3 | Onboards users via voice-first when context is missing |

R12 and R13 are both launch blockers. R16 is in the list because without it the gate will keep lying — no further round can be trusted DONE until it lands.

---

### R12 — Super-agent liveness + silence pager  🔴 LAUNCH BLOCKER

**Traces to findings:** 1 (EA silence), 3 (stuck "working"), 4 (conversational create, downstream), 7 (cwd-wedge, root cause).

**Done =** every super-agent tmux session (`elon`, `gary`, `studio`, and each user EA) has a watchdog that spawns a replacement within 60s of death; `agent_status.status` is cleared to `idle` on every successful reply AND swept by a daemon that resets any `working` row older than 30 min without an active tasks row; the R5c silence feed pages Patrik on iMessage + dashboard banner when any routed message has no `replied` trace within SLA (60s agent / 120s project); dashboard "typing" indicator is derived from a short-lived presence signal, not from the persisted status column.

**Sub-rounds.**

- **R12a — Status-clear on reply.** `scripts/relay-respond.py` writes `agent_status.status='idle'` + `current_task=null` after each successful reply. Idempotent. Migration nothing; this is a single call at the end of the reply path.
- **R12b — Stale-status sweep.** New `scripts/agent-status-sweep.py` (cron every 5m). Any row where `status != 'idle'` AND `updated_at < now() - 30min` AND no `tasks` row with `assigned_agent=slug` AND `status in ('queued','running')`, reset to `idle`. Launchd plist + dead-man's-switch heartbeat.
- **R12c — Resurrection watchdog.** `scripts/super-agent-watchdog.py` polls tmux every 15s for each expected super-agent (config table `super_agents` new in this sub-round; seed `elon`, `gary`, `studio`, `rex`). On missing session, spawn with original identity env + `--dangerously-skip-permissions`. Launchd keeps the watchdog itself alive.
- **R12d — Silence SLA pager.** `scripts/ea-silence-audit.py --strict --since 5m` on cron. Silent drop → post to Patrik via `scripts/agent-message.py --to gary` with message_id + agent + routed_at. Dashboard header: red banner while any silence alert is live. Auto-clear when reply lands.
- **R12e — TCC-wedge repair baked into watchdog.** Codify the grants-move procedure from `projects/foreman/research/cwd-wedge.md` into one-shot script; watchdog calls it before respawn.
- **R12f — Presence-based typing indicator.** UI stops deriving `● Working` + the three-dot animation from `agent_status.status`. New Supabase realtime channel `presence:agent:<slug>` with a 10s TTL row per super-agent; dashboard subscribes. When the presence row expires, the typing/working indicator fades. (Keep `agent_status` for long-lived state like `current_task` — just stop using it for realtime presence.)

**Acceptance test** — `scripts/accept/R12.py`:
1. Kill Elon's tmux session deliberately (`tmux kill-session -t elon-relay`).
2. Assert watchdog spawns a replacement within 60s (new PID, tape re-read).
3. From an authed dashboard session, send a message. Assert `replied` event within 60s SLA.
4. Assert `agent_status.elon.status='idle'` within 5s of reply.
5. Simulate wedge by killing the reply path only (not the tmux). Assert silence pager fires within SLA + dashboard red banner appears.
6. Repeat 20x. Zero silent drops = PASS.

**Ordering inside R12.** R12a + R12b ship first (they stop the dashboard from lying about Elon being "working" right now). R12c + R12d + R12e ship together (they're the real resurrection story). R12f ships last (it's UI-only; the others fix the data source it depends on).

**Veto-window gate.** Because R12 touches runtime daemon configuration, a 30-minute veto window (not 10) before R12c + R12d + R12e queue, posted to Elon's inbox. Patrik can `stop`/`wait`/`hold`.

---

### R13 — Zombie worker kill-and-retry  🔴 LAUNCH BLOCKER

**Traces to finding:** 2 (task success 65%).

**Done =** closed-task success rate ≥ 95% over a rolling 50-task window. Zombie failures (`worker tmux session exited without finalizing`) either root-caused and eliminated, OR auto-classified as transient and retried once before surfacing as `failed`.

**Sub-rounds.**

- **R13a — Postmortem sweep of the 13 zombie failures.** With R4e-2's stdout capture now live (`/tmp/task-<id>.worker.log`), read the tail of the last 13 zombies. Group by exit reason. Output: `projects/foreman/research/zombie-postmortem-2026-04-19.md` with per-class root cause + count + proposed fix. If one class dominates, fix at source (collapse to R13b + R13c, skip R13d).
- **R13b — Brief-order contradiction fix (if confirmed).** The R4e-2 theory was "brief-order contradiction causes the worker to exit on the final `scripts/task-complete.sh` call." If the postmortem confirms this, `scripts/queue-task.py` enforces a canonical brief shape at write time; the linear-flow template (R5a) has a mismatch guard baked in.
- **R13c — Supervisor around task-runner.** `scripts/task-runner.sh` wraps worker spawn in a supervisor loop. Exit code + stdout tail classifies outcome: finalize-hit (done/failed/needs_input via helper row), clean-exit (treat as unknown, mark `failed` with clear reason), dirty-exit (SIGKILL / panic / OOM — treat as transient, requeue once with `retry_count += 1`, max 1 retry). Supervisor publishes its own `task_worker_outcome` event so the dashboard can trace which failures were auto-retried.
- **R13d — Misroute preflight.** 3 of 16 failures are wrong-repo misroutes. Move `haiku-queue.py`'s repo-routing check from "post-hoc in worker" to "pre-queue in haiku". Reject briefs whose declared repo doesn't match the paths referenced in the brief body.

**Acceptance test** — `scripts/accept/R13.py`:
1. Queue 20 synthetic tasks mixing happy-path + intentional-panic + intentional-killed-parent.
2. Assert ≥ 19 reach `done` or `failed` with a human-readable reason (never `worker tmux session exited without finalizing`).
3. Assert any `killed` subprocess retries once and the retry completes.
4. Pull last 50 real tasks after one day of normal operation, assert closed-success ≥ 95%.

Steps 1–3 are the scripted gate; step 4 is the "does it hold in prod" gate that must go green before R13 flips DONE.

---

### R14 — Failure surface on home  🟠

**Traces to finding:** 5 (fail-and-recover UX).

**Done =** when any of the user's agents has a failed task as its latest activity, the AgentCard on `/dashboard` home shows the failure reason inline + a one-click retry button + a chevron that expands to the full failure insights panel. Tasks view (not home) lifts failed tasks above the files list.

**Sub-rounds.**

- **R14a — AgentCard failure variant.** Port the R5b failure-card UX from Tasks view onto the home AgentCard component. When `agent.latest_activity.status === 'failed'`, render reason + retry + insights chevron. Click retry → reuse the same requeue endpoint R5b already wired.
- **R14b — Tasks view re-order.** Failed-and-active tasks float above the Files list; files list collapses to a count-only section that expands on click.

**Acceptance test** — `scripts/accept/R14.py`:
1. Force a task to fail via bad brief (intentional `failed` row with reason).
2. Authenticated dashboard session loads `/dashboard`. Assert failed task's AgentCard shows reason line, retry button (clickable), and chevron.
3. Click retry. Assert new task queues with `retry_of=<original_id>`.
4. Navigate to Tasks view. Assert failed task is above the Files list.

---

### R15 — Project card render on Tasks view  🟠

**Traces to finding:** 6 (project cards not visible).

**Done =** Tasks view renders a per-project accordion card for every active project in the user's world, with the current `project_summary` event data (active / queued / shipped / next) visible. Cards sit above the Files list and are not gated by filter state.

**Sub-rounds.**

- **R15a — Diagnose R6b render path.** Confirm whether `ProjectCardsList.jsx` is (a) gated on a filter, (b) below-the-fold, (c) not deployed. Ship the minimal fix for whichever it is.
- **R15b — Card data contract.** Component reads `payload.summary_md` + `payload.recent_activity` + `payload.open_task_count` from the latest `project_summary` event per slug. Falls back to "no data yet" card with a link to kick the daemon if no event has landed for that slug in the last 10 min.
- **R15c — Freshness label.** Cards show the timestamp of their source event + a color-coded dot (green < 2 min, yellow < 10 min, red ≥ 10 min — matches the daemon's own freshness SLA).

**Acceptance test** — `scripts/accept/R15.py`:
1. Authed dashboard session loads Tasks view with no project filter.
2. Assert at least N cards render (N = `SELECT count(*) FROM agent_status WHERE type='project' AND hidden=false AND client_id=<world>`).
3. For each card, assert its DOM includes the `summary_md` text from the matching latest `project_summary` event.
4. Assert every card's freshness label is green (event within 2 min).

---

### R16 — Acceptance-test anti-false-positive  🟠

**Traces to:** the refactor-plan gate itself (the reason we're running this round at all).

**Done =** no acceptance test can pass by short-circuiting or synthesizing the pipeline stage it claims to verify. A round does not flip DONE without one end-to-end acceptance path that a product user could actually traverse.

**Sub-rounds.**

- **R16a — Remove source-allowlist short-circuit for acceptance.** `scripts/supabase-listener.py` stops synthesizing `injected`/`replied` traces for `accept-*` sources. Acceptance tests either exercise the real super-agent (preferred) or declare themselves "instrumentation-only" in the narrative and never count as the gate.
- **R16b — Real-user-path acceptance for every user-facing round.** Every round whose VISION commitment is user-observable (R12, R13, R14, R15, R17 in this plan) gains a `scripts/accept/<round>_user.py` that drives an authed dashboard session end-to-end. Foreman refuses to flip DONE without this second variant passing.
- **R16c — Commit-hash + diff gate.** `foreman-orchestrate.py` refuses to call `mark_round_done` when the build task's commit hash is `unknown` OR the diff touched zero files matching the round's expected paths (paths declared in the ROUNDS dict). This closes the "R8a shipped zero code but flipped DONE" failure mode that was supposed to be closed by R9-pre.
- **R16d — Reopen gate for the four re-ships.** R5c-real, R6a-real, R7b-real, R8a-real are reopened pending `*_user.py` acceptance variants per R16b. They were flipped DONE on instrumentation-only tests; the vision-qa pass proves instrumentation-only isn't enough.

**Acceptance test** — `scripts/accept/R16.py`:
1. Run `scripts/accept/R5c_user.py` (new). This variant sends a real dashboard message and polls for a real `replied` event from `elon` (not from `accept-R5c`). Before R12: FAIL. After R12 + R16: PASS 20/20.
2. Attempt to flip a fake round DONE via `foreman-orchestrate.py` with `commit=unknown`. Assert refusal.
3. Attempt with `commit` non-empty but diff touching zero paths declared for the round. Assert refusal.

R16 does not flip DONE independently — it's the guard rail for R12–R15 + R17. When R12–R15 + R17 all hold against their `*_user.py` variants, R16 is retroactively ✓ DONE.

---

### R17 — Voice-first onboarding skin  🟡

**Traces to finding:** 8 (voice-first onboarding).

**Done =** a fresh invite-accepted user lands at `/dashboard/welcome` and is met by a voice-first intake. 30 seconds into recording, EA has a transcript; 60 seconds in, the user's first project + first task + EA persona are scaffolded and the user is on the normal home view. Zero forms.

**Sub-rounds.**

- **R17a — Welcome route.** `src/pages/DashboardWelcome.jsx`. Rendered when user has zero `projects` rows in their world. Full-screen voice intake (phone icon prominent, microphone secondary).
- **R17b — Intake processor.** `api/dashboard/voice-intake.js` accepts the transcript + client_id. Calls `scripts/new-project.py` logic (already extracted for R7a-real) to scaffold a first project from the transcript content. Queues a first task "Let's build your first thing". Creates the user's EA persona row.
- **R17c — Redirect gate.** After scaffold completes (polled every 2s from the welcome page), redirect to `/dashboard`.

**Acceptance test** — `scripts/accept/R17.py`:
1. Create a fresh invite, accept, land authed with zero projects.
2. Assert browser URL is `/dashboard/welcome` (not `/dashboard`).
3. Submit a 30s audio fixture via `data-testid="voice-intake"` input.
4. Within 60s, assert projects count for the world is 1, task count ≥ 1, agent persona row present.
5. Assert redirect to `/dashboard` happened.

R17 ships only after R12 (voice intake needs the super-agent alive) + R13 (first-task shouldn't zombie).

---

### Out of scope for R12–R17 (still deferred)

- **Per-account resource caps + tier enforcement** — R9 / R9a / R9b / R9c as drafted remain deferred. Tier caps don't matter if the EA is silent. Revisit when R12 and R13 are both green-in-production.
- **Pro-tier multi-agent provisioning (R11).** Same reason.
- **Bundle code-split / api-cleanup / cv3 prop-forwarding.** Unchanged from prior plan — low priority.
- **Local tmux on user's computer / 3-step release cycle tooling / Stripe Checkout / skills marketplace / game world.** Unchanged — shelved or aspirational.

---

### Ship order

1. **R12a + R12b** (status-clear on reply + stale-status sweep) — ship first and immediately. Closes finding 3 in an afternoon. No risk; two files.
2. **R13a** (zombie postmortem from the stdout captures R4e-2 already writes). No code shipped, just a diagnosis doc.
3. **R16c** (commit-hash + diff gate) — lands before R12c/d/e, because the next round's DONE flip needs to be trustworthy.
4. **R13b + R13c + R13d** in parallel after R13a — sharp root cause if dominant class, supervisor loop, misroute preflight.
5. **R12c + R12d + R12e** (resurrection + silence pager + wedge repair) — the big one. 30-min veto window.
6. **R12f + R14 + R15 + R16a + R16b + R16d** in parallel — all UI or non-risky.
7. **R17** last — voice onboarding.

**Launch gate.** R12 ✓ + R13 ✓ + R14 ✓ + R15 ✓ + R16 ✓, each with `*_user.py` passing 20/20 against the real product path. R17 nice-to-have before first external invite, not a hard gate (invites can start with manual onboarding).
