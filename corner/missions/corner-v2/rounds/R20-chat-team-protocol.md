# R20 — chat team protocol (the third lane)

Worker: headless builder. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Spec section: "Agent brains" in
`corner-v2-integration/docs/superpowers/specs/2026-09-05-corner-v2-reorganization-design.md`.

Verdict: the lane works. Before: 0/6 (no agent runtime answers v2 threads at
all). After: 7/7 Playwright `chat` tests green against the clone, plus 15/15
bridge unit tests. One real UI defect filed for R18 (conversation lands
~700px past the last message, arrival view is blank); the protocol is proven
at the backend + DOM level, and the Visual Window lane paints correctly.

Rule compliance: nothing pointed at `neat-pony-216` (the bridge refuses to
start there, unit-tested); no email/Telegram/client-facing sends; no `src/`
or `ios-native/` edits; one bridge instance on port 3099 only, killed at the
end; no `git add -A`; nothing pushed. Test account credentials stayed in
`/tmp/corner-v2-e2e.env` (values never appear below).

## 0. Recon (commands + outputs)

The backend already stores turns; nothing answers them. `v2Workspace.sendMessage`
inserts a user `threadBlocks` row and returns `{blockId}` — no scheduler or
dispatch exists anywhere in `v2Workspace.ts` / `v2Visual.ts`:

```
$ grep -rn "dispatchMessage\|schedule" convex/v2Workspace.ts convex/v2Visual.ts
(no output)
```

Runs + events exist and predate the clone (`startRun` added in `453baf7`, R3):

```
$ git log --oneline --all -S "startRun" -- convex/
453baf7 feat: add shared v2 visual window state
```

`v2Visual.startRun/appendEvent/finishRun/listEvents` are therefore on the clone;
`message|step|question` events write `threadBlocks` with `agentSlug=run.brain`,
`looking` opens/focuses a tab and sets `lookingWhy`, `question` payload
`{text, options:[{key,title,sub?,rec?}]}` renders the UI `QuestionBlock`.
`v2Ledger.append` requires one-sentence `what` (backend `normalizeWhat` rejects
`/[.!?]\s+[A-Z]/`, masked as `Server Error` on the production clone),
subjects must be slugs, kinds must be in
`did,decided,asked,learned,started,finished,sent,spent`. There is NO query that
reads `runs` (only `listEvents` per run id) — see "redeploy" below.

Clone probe (test account sign-in works, R18's Aster workspace present):

```
$ python3 /tmp/r20-probe.py
email: cor***
signin ok, token len 598
viewer: {... "email": "corner-v2-e2e+20260906t124908@aom-inhouse.com",
  "isAdmin": true, "onboarded": true, "role": "owner",
  "worldId": "k175sgenzzryepf5e87na5stw98dw95w"}
NAV keys: <class 'list'>
 {"title": "Aster", "kind": "project", ... "threadId": "vd72bj428cpbs2zrhw086f530x8dwv1y"}
 {"title": "Spring launch deck", "kind": "mission", ...}
 {"title": "Cellar Door", ...} {"title": "Harbor Coffee Live", ...} ...
```

Notably the shared deck thread already held R18's scripted messages
(`Build the Aster spring launch deck...` + `Buyers. Keep the film for press.`)
with ledger rows and visual tabs — so the e2e uses its own missions and never
touches R18's threads.

Agents on the clone (`agents:list`): bobby, colton, elmo, steffen, jacob,
elon, alex, steve, cleo, tony, paige, pixel, mom, rex, researcher — 15 brains,
no `aster` agent. Legacy rooms carry no specialist either
(`listRoomsForWorkspace` returned 2 `New Project` rooms, no agent fields), and
v2 `projects` has no agent column; only missions have `agentBinding` (unset on
all Aster missions). So no project→agent mapping exists anywhere: the driver
map is new in the bridge (see "for Patrik").

Preview choice. `8ysfjie48` is live and clone-backed (happy-otter is only an
error-string example in the bundle):

```
$ curl .../8ysfjie48.../assets/index-DJ53K88u.js | grep -o ...
1 brilliant-scorpion-163.convex.cloud
```

`vercel ls` later showed the ledger-newest `iwjkvlcid` (1h old, also
clone-backed, verified the same way) plus unledgered newer R18 builds. The
suite ran on `8ysfjie48`; both previews were probed for the UI finding below.

Ports: 3003 OPEN (live bridge, untouched), 3099 free (mine), 5177 in use
(avoided). `claude` CLI present, `muse` 1.0.3 present.

## 1. Before: 0/6 (no agent runtime)

`/tmp/r20-before.py` sent the six scripted steps via `v2Workspace.sendMessage`
to the unwatched archived smoke thread and evaluated each step assertion with
short waits (bridge watches a different thread; verified by id):

```
sent all six steps; waiting 20s for any agent turn...
new agent blocks since t0: 0
BEFORE step 1-one driver turn with step+question: FAIL
BEFORE step 2-decided row within 10s: FAIL
BEFORE step 3-steffen contribution + driver close: FAIL
BEFORE step 4-latest reply carries ledger fact: FAIL
BEFORE step 5-serialised distinct done runs: FAIL
BEFORE step 6-looking tab active + status line: FAIL
before-run conclusion: 0/6 (no agent runtime without the bridge)
```

All three of Patrik's failures reproduce trivially: several brains never
answer at all, so nothing is in sync, nobody drives, and there is no ledger
fact to be stale about.

## 2. What was built

AOM-EA `scripts/v2-team-bridge.py` (~830 lines, stdlib only): a test bridge
instance. Convex Auth sign-in (password flow, single-use refresh handling),
per-thread serial poll loop (1.5 s), `/health` + `/r20/state` (driver, runs
with done receipts, handled blocks — what the e2e asserts against). Refuses
`neat-pony-216` at import (exit 3, unit-tested).

AOM-EA `scripts/test_v2_team_bridge.py`: 15 unit tests, repo pattern
(`scripts/test_*.py`, importlib import, plain runner):

```
$ python3 scripts/test_v2_team_bridge.py
PASS test_adapters_build_argv_without_running
PASS test_answer_records_decided_row
PASS test_defect_a_flags_unjustified_switch_and_passes_delegation
PASS test_defect_b_requires_ledger_fact_in_reply
PASS test_defect_c_requires_run_trace
PASS test_driver_resolution_prefers_binding_then_map_then_default
PASS test_latest_answer_quotes_the_decided_row
PASS test_ledger_what_keeps_one_sentence
PASS test_match_option_by_title_or_key
PASS test_mention_plans_delegate_contribute_close
PASS test_mentions_parse_in_order_and_known_only
PASS test_pending_ask_consumed_by_later_user_text
PASS test_refuses_live_deployment
PASS test_step1_plans_structured_driver_turn_with_question
all tests passed
```

Web worktree `e2e/chat.spec.ts` + `chat` Playwright project (gated on
`LIVE_BASE_URL` like `live`; `desktop` now ignores both live and chat specs).
Seven tests: the six scripted steps plus a whole-thread defects sweep.
Sends go through the real UI composer (`#composer-input` + Enter);
assertions read live backend state (surface, `listEvents`, `latest`,
`getSession`, bridge `/r20/state`); every step waits for the rendered content
and screenshots to `rounds/evidence/R20-chat-<step>.png`.

```
$ npx eslint e2e/chat.spec.ts playwright.config.ts && echo LINT-OK
LINT-OK
$ npx tsc --noEmit -p . | grep -E "chat.spec|playwright.config"
(no output: no type errors in these files)
```

Two bugs found and fixed during the build (both with outputs in §4):
(a) the backend's one-sentence ledger rule (masked as Server Error) killed the
first live turn — the bridge now sanitises `what` client-side
(`Bridge.ledger_what`, unit-tested); (b) pending-ask detection read only the
last-20 display window, so a stale question outside it looked answered — it
now reads the last 100.

## 3. After: 7/7 green on the clone

Bridge (own port, clone URL, script brains, fresh probe thread):

```
[r20] watching vd72dhxam8edbrkpmphsyamt9n8dxmca (Aster > R20 team chat probe)
      driver=@paige brains=15
[r20] listening on 127.0.0.1:3099 -> https://brilliant-scorpion-163.convex.cloud
```

Smoke turn before writing the suite (user brief via API, reply in <5 s):

```
sent: {"status": "success", "value": {"blockId": "v97fbhttkkpkmc1h658n9zzwhh8dxvaa"}}
t+5s agent blocks: 2
    ('paige', 'steps', '{"brain": "paige", "label": "Reading the Aster brand kit ...", "runId": "v57b9h81..."})')
    ('paige', 'question', '{"brain": "paige", "options": [{"key": "buyers", ...}, {"key": "press", ...}], "runId": ...}')
events: ..."type": "step", "seq": 1.0 ... "type": "question" ... "afterEventId": "r20-...-1"
ledger: did | Finished a r20-bridge run. | ['thread:vd7fjv2f...']
ledger: did | Started a r20-bridge run. | [...]
```

Suite runs (LIVE_BASE_URL=`8ysfjie48` preview, bridge on 3099):

```
Running 7 tests using 1 worker
  ✓  1 ... 1: the brief gets exactly ONE structured driver turn (10.8s)
  ✓  2 ... 2: answering the question records a decided ledger row (10.3s)
  ✓  3 ... 3: @mention gets ONE labelled contribution, then the driver closes (10.5s)
  ✓  4 ... 4: 'latest' is read from the ledger, not invented (9.6s)
  ✓  5 ... 5: two rapid messages serialise under one driver (14.0s)
  ✓  6 ... 6: the looking event opens a tab the person can see (10.5s)
  ✓  7 ... defects: no A anywhere, no C anywhere in the scripted thread (143ms)
  7 passed (1.3m)
```

(First full pass; steps 1–3 screenshots kept. A later re-run re-verified
steps 4–6 + defects after render-wait hardening: `4 passed (43.3s)`. The
scripted thread is `Aster > R20 team chat probe`,
thread `vd72dhxam8edbrkpmphsyamt9n8dxmca`; bridge `/r20/state` holds all run
ids with done receipts. Screenshots `rounds/evidence/R20-chat-{1..6}.png`.)

Per-step after-state: (1) one run, brain paige, events `[step, question]`,
options Buyers/Press, no second slug. (2) `decided` row
`Decided Buyers for Who is this first pass for?` visible via `latest` in the
same turn. (3) order paige-delegate-step → steffen text → paige close, plus a
`did` delegation-result row. (4) driver reply contains `Buyers`, quoted from
the scoped ledger row. (5) rapid pair → 3 runs (1 ack + delegate pair), ids
distinct, all `done`, no defect A. (6) `getSession.looking={tabId, why}`,
`activeTabId == looking.tabId`, tab open, `.v2-looking` status line
`Looking at Aster spring launch deck · showing … for review` asserted in the
page and visible in `R20-chat-6.png`. Final sweep: defect A [] and defect C []
over the whole thread.

## 4. Incidents during the run (honest log)

- The first live turn wrote events but missed its `asked` ledger row: prod
  masks the/backend one-sentence validation as `Server Error`; direct
  reproduction confirmed it (`v2Ledger:append` → `{"status":"error",
  "errorMessage":"[Request ID: …] Server Error"}`), root cause
  `normalizeWhat` vs my two-sentence `what`. Fixed client-side
  (`ledger_what`), turn-retried cleanly. Lesson recorded in the code: the
  bridge never lets a turn fail silently on ledger writes (the message stays
  unhandled and retries; partial runs are visible as two runs).
- A retry-loop scare while the old bridge ran stale code: assessed via
  surface counts (`1 user, 2 paige-steps, 1 question, 1 text`) — the
  pending-ask fallback consumed the message instead of duplicating, so no
  runaway. Old bridge killed, polluted smoke mission archived, fresh mission
  created for the final run.
- Empty-conversation screenshots: three trace-level forensics rounds (DOM
  snapshots, network log, screencast frames) first suggested missing queries,
  then the layout probe settled it — 28–32 `.v2-msg` in the DOM on every load
  (runner, scripts, both previews), boxes laid out ABOVE the viewport
  (scrollTop 2736/2748 max, last message 40px above the fold). Scrolling up
  900px paints the full team conversation (see `R20-chat-scrolled.png`: Paige
  labels, @steffen pills, Steffen's contribution, driver close, looking ask).
  Not a protocol failure; filed as UI row R20-U1 below. Brutal-findings rule
  applied: the suite additionally waits for rendered content before every
  screenshot, so a recurrence fails loudly instead of passing on backend
  state alone.
- Playwright `chat` project needed `test.setTimeout(180_000)` per test: cold
  preview boot + a full turn exceeds the repo 60 s default (first attempt hit
  the cap mid render-wait).

## 5. The protocol as implemented (one paragraph each)

Driver. `resolve_driver`: `mission.agentBinding` wins, else the bridge
`PROJECT_DRIVERS` map (`{"aster": "paige"}`, `R20_DRIVERS_JSON`), else
`R20_DEFAULT_DRIVER` (`mom`). The driver owns every turn; a guest brain
appears only via `@mention` (parsed against live `agents:list`) or the
scripted delegate path, always in a nested run with `brain=<guest>` so the
block label is the guest's, and the driver's run always emits the closing
message. Two agent texts from different brains with no delegate-step or
mention between them fail `detect_defect_a` (unit-tested + asserted live).

Context pack. Assembled by the bridge per turn, never by the brain:
project/mission identity + goal/summary (no `CONTEXT.md` or v2 project
description exists — gap noted), `v2Ledger.latest` scoped to
`[projectSlug, missionSlug]` and filtered to `thread:<id>` links, last 20
surface messages (pending-ask scans the last 100), `v2VisualWindow.getSession`
(tabs/active/review/looking), pending ask, mentions, the person text.
`format_context_pack` renders the single text every brain reads (script mode
consumes it directly; live-mode adapters receive it as the prompt).

Turns. Every turn is `startRun(provider=r20-bridge, brain=…)` →
`appendEvent(step|looking|question|message)` chained with `afterEventId` →
scoped `v2Ledger.append` rows → `finishRun(done)`. Delegation is a `step`
event with `payload.kind=delegate {to, task}` (no `delegate` event type
exists on the clone) with the guest contribution as a nested run and the
driver close on the outer run. Every payload carries `runId`+`brain`, which is
what makes defect C checkable. `done` is the `finishRun` receipt (kept in
bridge state; there is no runs read query — see redeploy).

Ledger. The sync bus: `asked` (question posed), `decided` (option locked in,
step 2 asserts ≤60 s, observed same-turn), `did` (delegation results), plus
the backend's automatic run start/finish rows — all with scoped subjects and
`thread:<id>` links. Step 4 answers solely from `latest_decided` for the
thread; with no decided row the driver says so instead of inventing.

## 6. Commits (staged paths only, no push)

- AOM-EA: `scripts/v2-team-bridge.py`, `scripts/test_v2_team_bridge.py`,
  `aom-studio/corner/missions/corner-v2/rounds/R20-chat-team-protocol.md`
  (this file) + `rounds/evidence/R20-chat-{1..6,scrolled}.png`.
- Web worktree: `e2e/chat.spec.ts`, `playwright.config.ts` (chat project;
  desktop ignores live+chat). No `convex/` changes were needed — everything
  the protocol requires is already deployed.

## 7. What the clone redeploy adds (backend work, not in this round)

1. `delegate` (and `done`) first-class `agentEvents` types — today delegation
   rides inside `step` payloads by necessity.
2. A runs read path (`v2Runs.listByThread` / `get`) — today `done` is only
   provable via the writer's receipt + `listEvents`; the suite trusts bridge
   state for run status.
3. A project-level agent binding (registry `projects` has no agent column;
   only `mission.agentBinding` exists) so the driver map lives in data, not
   bridge config.
4. A `CONTEXT.md`-equivalent readable per project (v2 project description
   field) for section 1 of the context pack.
5. UI rows for R18 (owns `src/`): **R20-U1** conversation auto-scroll lands
   ~700px past the last message on long threads (arrival view blank;
   `scrollTop` 2736/2748 max, last `.v2-msg` 40px above fold; repro thread +
   both previews named above; arrival screenshots + `R20-chat-scrolled.png`
   as proof); **R20-U2** archived missions still listed in nav on `8ysfjie48`
   (fixed in newer builds — `iwjkvlcid` hides them); no other rendering gaps
   (question radios, steps, @pills, `.v2-looking` all paint once scrolled
   into view).

## 8. For Patrik

Which brain drives AOM's projects today: nothing did — no mapping existed
anywhere (no `aster` agent in the registry, no specialist on legacy rooms, no
agent column on v2 projects, no `agentBinding` on any Aster mission). I set
it: **Paige drives Aster** (client-success brain owns the client
conversation; Steffen is the brand specialist it delegates to), Mom drives
everything unmapped. That is a guess with a rationale, one line of config to
change (`R20_DRIVERS_JSON`), and it belongs in project data (redeploy item 3).

Two things I did not do: wire real LLM wording (script brains speak canned
lines; every protocol mechanic — driver ownership, live context packs,
structured runs, ledger sync — is real and asserted, but an LLM still has to
be plugged into the adapters for production wording), and fix the blank
arrival view (R20-U1, fifteen seconds of scrolling for the person, R18's
call). The lane is proven; those are the two gaps before it is shippable.
