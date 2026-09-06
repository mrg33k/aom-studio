# R21 — chat live brains (the third lane, round two)

Worker: headless builder. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R20-chat-team-protocol.md`, `briefs/R20-chat-team-protocol.md`,
`punch-list.md` (L010 open, R18 owns `src/`).

Verdict: the protocol holds with real brains. Claude-backed and Muse-backed
drivers run the same six-step conversation with byte-identical STRUCTURE
(steps → question → decided → guest → close, test 8 green), all wording is
live (18/18 replies from Claude/Muse, zero canned lines in live mode), the
wording gate passes on every reply, defects A/B/C checks are unweakened and
green in both modes, and a contract-breaking brain is contained to one plain
step + done (test 9 green). OpenAI could not speak: its key has no credits
(HTTP 429), and the live refusal was contained exactly like the fake one.

Rule compliance: nothing pointed at `neat-pony-216` (bridge refuses at
import, unit-tested; all runs against `brilliant-scorpion-163`); launch
agents untouched; own bridge instances only (:3099 main, :3098 fake),
both killed at the end (ports verified free, no bridge processes);
no email/Telegram/client sends; no `src/` or `ios-native/` edits, no
`convex/` changes; test account only from `/tmp/corner-v2-e2e.env` (never
below); live full-suite runs used: 3 of the allowed 6 (A-attempt, A2, B),
plus 2 single-turn API probes (smoke, OpenAI refusal) and targeted
single-test re-runs. Nothing pushed.

## 0. Recon (commands + outputs)

CLIs and seams (R20's `muse ask` seam is wrong; `exec` is the entry):

```
$ muse --help | head -8            # Commands: ... exec (headless) ...
$ ~/.local/bin/muse exec "Reply with exactly this word and nothing else: ok"
tbh: reasoning effort ultra is not available ...; using xhigh
ok                                 # real-time 0m1.834s
$ claude -p "Reply with exactly ..." --output-format text
ok                                 # real-time 0m5.517s
$ claude -p "Reply with exactly: ok" --output-format json | head -c 300
{"duration_api_ms":2012,...,"total_cost_usd":0.1676795,
 "usage":{"input_tokens":2,...,"output_tokens":4,...}}   # json envelope: usage + cost
$ ~/.local/bin/muse exec --json "Reply with exactly: ok" | tail -2
... "run.terminal.completed" ... "text":"ok"             # JSONL envelope, no token usage
```

Contract probes (mini version of the R21 contract, one call per brain):

```
$ claude -p "$(cat /tmp/r21-probe-contract.txt)" --output-format text   # 8.4s
{"steps": ["Confirming Aster brand kit source", "Drafting eight-slide outline"],
 "reply": "On it for the Aster spring launch deck. Eight slides, first pass tonight. ...", "done": false}
$ ~/.local/bin/muse exec "$(cat /tmp/r21-probe-contract.txt)"          # 12.7s
{"steps": ["Start Aster deck", "Shape eight slides"],
 "reply": "Got it, starting your Aster spring launch deck ...", "done": false}
```

Both obeyed strict JSON first try. OpenAI via the repo pattern:

```
$ python3 ask-gpt.py probe → RuntimeError: gpt-4o: HTTP 429 insufficient_quota
  You have no credits remaining.   # key exists in AOM-EA/.env (presence only, never printed)
```

Preview (R20-verified `lzus6n15k` re-verified clone-backed; `vercel ls` empty in this shell):

```
$ for h in lzus6n15k iwjkvlcid gp93nkygq n942kwga8 8ysfjie48; do curl .../$h-.../auth → all 200
$ curl .../lzus6n15k.../assets/index-BUGOpkKt.js | grep -o ...
brilliant-scorpion-163.convex.cloud happy-otter-123.convex.cloud   # happy-otter is the error-string example
```

Suite base: `LIVE_BASE_URL=https://corner-v2-integration-lzus6n15k-aheads-projects-d2a4c70f.vercel.app`.

## 1. What was built (bridge: same protocol, live wording)

`scripts/v2-team-bridge.py` (+~470 lines): the bridge still owns routing
(`plan_turn`), structure (runs/events/ledger/delegate payloads) and ledger
formats; a live brain supplies WORDING for fixed slots only. `live_plan`
deep-copies the script skeleton and fills text fields via one adapter call
per run; any slot that fails twice fails the WHOLE turn to
`{"steps": [{"label": "I couldn't finish that turn."}]}` + done —
never canned lines in live mode, never silence.

- ONE system contract (`LIVE_CONTRACT_VERSION = "r21-1"`, `build_live_prompt`):
  label, driver/guest ownership, the context pack verbatim, per-slot JSON
  shape (`steps[]`, `reply` ≤ 80 words headroom under the 120 gate,
  `question` for brief, `done`, optional `delegate{brain,task}`), and the
  rules (ledger rows for latest, name the project/mission, no em dashes,
  never "As an AI", never another brain's voice, never invent a file, a
  person, or a decision). Same text for Claude, Muse, OpenAI; only
  label/owner/slot-facts vary. A `delegate{}` proposal is only executed when
  the person @mentioned that brain (none proposed in any run).
- Strict parse (`parse_live_json`: the reply must BE a JSON object; one
  markdown fence tolerated as transport), slot validation
  (`validate_live_slot`: exact step count, non-empty reply/question,
  latest must name the decided option), one retry with the specific
  violations quoted, then fallback. Gate violations (em-dash/as-ai/too-long)
  are accepted with flags, never rewritten.
- Backends per agent slug: `R21_BACKENDS_JSON` + `R21_DEFAULT_BACKEND`
  (`backend_for`; `script` = keep skeleton, flagged; `fake` = free-text
  contract-breaker). Fixed R20 seam bug: Muse is `muse exec`, not `muse ask`
  (which does not exist). Claude uses `--output-format json` (usage+cost);
  Muse plain `exec` (seconds only, no token meter); OpenAI is a direct
  stdlib chat-completions call with `response_format json_object` and usage
  capture (the shared room provider's Convex metering is deliberately not
  touched by the test bridge).
- Timing/cost/gate record per call in `/r20/state` (`liveCalls`: slot,
  brain, backend, seconds, tokens_in/out, cost_usd, model, attempts,
  violations, ok). Bad backend names fail fast in `setup()`.
- `scripts/test_v2_team_bridge.py`: 11 new unit tests (contract sameness +
  version, strict parse incl. fence/failures, slot shapes, gate checks,
  per-slug resolution + default + unknown-raises, fake→fallback plan,
  script→skeleton-verbatim, `_apply_wording` keeps structure/options,
  argv shapes + fake-never-JSON, OpenAI key rule + invalid-key raises).
  26/26 green (`python3 -s scripts/test_v2_team_bridge.py`).

`e2e/chat.spec.ts` (+218/-12): mode-aware suite. `LIVE` comes from bridge
`/r20/state`; defects A/B/C checks byte-identical in both modes. Script
mode keeps exact-text asserts; live mode asserts properties (ledger fact in
reply; question block with the bridge-fixed Buyers/Press options; labelled
guest + driver close; looking state + status line) plus runtime-snippet
rendered asserts (the reply's own first 40 chars must paint — stronger than
canned-text matching). New: test 8 (structure equality across two driver
backends + wording-difference tripwire), test 9 (fake backend contained),
`userBlockTime` server-clock anchoring (see §4), wording-gate helper
mirroring the bridge, evidence writer
`rounds/evidence/R21-reply-<brain>-<step>[suffix].txt`.

## 2. The suite, before/after per mode (commands + outputs)

Script mode (bridge `R20_BRAIN_MODE=script`, mission "R21 script regression",
thread `vd72mtv57mhch934f5g2cbhjm98dx0cj`):

```
$ LIVE_BASE_URL=<preview> TEST_BRIDGE_URL=http://127.0.0.1:3099 \
  npx playwright test --project chat --output e2e/results-orch
Running 9 tests using 1 worker
  ✓  1 brief → ONE structured driver turn (10.5s)
  ✓  2 decided ledger row (10.5s)
  ✓  3 @mention → labelled guest + driver close (10.4s)
  ✓  4 latest from the ledger (10.2s)
  ✓  5 rapid pair serialised (16.5s)
  ✓  6 looking tab + status line (10.3s)
  ✓  defects: no A, no C (226ms)
  -  8 (live only)   -  9 (live only)
  2 skipped, 7 passed (1.3m)
```

Live run B, Muse-backed driver (bridge `R20_BRAIN_MODE=live`,
`R21_BACKENDS_JSON='{"steffen": "claude"}' R21_DEFAULT_BACKEND=muse`,
mission "R21 live brains B", thread `vd71svz0q6wv2pks8phvfwekts8dwwfe`,
`R21_COMPARE_THREAD=<A2-thread> R21_EVIDENCE_SUFFIX=-B`):

```
  ✓  2 answering the question records a decided ledger row (13.3s)
  ✓  3 @mention gets ONE labelled contribution, then the driver closes (30.6s)
  ✓  4 'latest' is read from the ledger, not invented (15.0s)
  ✓  5 two rapid messages serialise under one driver (32.4s)
  ✓  6 the looking event opens a tab the person can see (17.5s)
  ✓  defects: no A anywhere, no C anywhere (117ms)
  ✓  8 two driver backends yield the same structure (628ms)
  -  9 (needs TEST_FAKE_BRIDGE_URL)
  1 skipped, 8 passed (2.2m)      # test 1 passed above the scroll (9/9 with T9 below)
```

Live test 9, fake backend (second bridge `:3098`,
`R21_DEFAULT_BACKEND=fake`, mission "R21 fake containment"):

```
$ ... TEST_FAKE_BRIDGE_URL=http://127.0.0.1:3098 npx playwright test --project chat -g "9:"
  ✓  9 a contract-breaking brain is contained, never silent (8.4s)
  1 passed (17.0s)
```

Fake-bridge state after: 4 handled probes → 4 runs, all `done`;
each probe: 2 fake attempts (`adapter-or-parse`) then `turn-fallback`.
The person got one plain step per probe, never free text, never silence.

Live run A2, Claude-backed driver (`R21_BACKENDS_JSON='{"steffen": "muse"}'`,
mission "R21 live brains A2", thread `vd75ahj93fezk3njcvjxnp6yg58dxj3r`):
tests 1–5 green; test 6's TURN completed backend-side (looking state, tab,
status line, live reply all landed) but the test's own read failed on the
clock-skew bug (§4) before writing step-6 evidence — backfilled post-hoc
from the run's backend blocks with the gate re-verified (disclosed, not
re-worded). First A attempt (mission "R21 live brains A") went 2/2 before
the step-label rendered-assert bug (§4); its thread was retired, not reused.

Per-mode scoreboard:

| mode | 1 | 2 | 3 | 4 | 5 | 6 | 7(def) | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| script | pass | pass | pass | pass | pass | pass | pass | skip (live-only) | skip (live-only) |
| live B + T9 | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| live A2 | pass | pass | pass | pass | pass | turn-OK/test-read-bug | n/a (serial stop) | — (compare source) | — |

## 3. Test 8: interchangeable brains (quoted, re-verified post-hoc)

Canonical per-run `brain:kinds` (both threads, read-only re-query):

```
A2 STRUCT: paige:steps,question; paige:text; paige:steps,text; steffen:text; paige:steps,text;
           paige:steps,text; paige:steps,text; steffen:text; paige:steps,text
B  STRUCT: paige:steps,question; paige:text; paige:steps,text; steffen:text; paige:steps,text;
           paige:steps,text; paige:steps,text; steffen:text; paige:steps,text   # identical, asserted in-suite
```

Ledger kind histories with `limit: 200` (the suite's `limit: 50` window
now truncates A2's oldest rows after later probes; the full histories match):

```
A2 LEDGER200: did,did,asked,did,did,decided,did,did,did,did,did,did,did,did,did,did,did,did,did,did,did,did,did,did
B  LEDGER200: did,did,asked,did,did,decided,did,did,did,did,did,did,did,did,did,did,did,did,did,did,did,did,did,did
```

(The leading `did,did` are the backend's automatic run start/finish rows
around the first turns; `asked`/`decided` are the bridge's; the suite
asserted this equality live at T8 time, 628 ms.) The wording-difference
tripwire also held: no two driver replies are equal across runs — both
brains really spoke, nothing fell back to canned lines (zero
`turn-fallback` records on either main bridge).

## 4. Wording quality gate (deterministic; per reply)

Suite-asserted on every live reply; re-verified here over all 16 evidence
files (18 replies). Rule per reply: names Aster or the mission, no em
dashes, no "As an AI", ≤ 120 words; step 4 additionally carries the decided
option's text ("Buyers").

| step | brain | backend (A2 / B) | words (A2 / B) | gate |
|---|---|---|---|---|
| 1 question | paige | claude / muse | 18 / 17 | CLEAN both. A2: "For the Aster spring launch deck, who should slide one land with first?" B: "For the Aster spring launch deck first pass tonight, who should the eight slides speak to first?" |
| 2 confirm | paige | claude / muse | 46 / 34 | CLEAN both; both name Buyers + Aster. |
| 3 guest | steffen | muse / claude | 44 / 64 | CLEAN both. BOTH guests refused to invent colour values and asked for the kit source/hex (see §6). |
| 3 close | paige | claude / muse | 54 / 31 | CLEAN both; both name Aster + mission. |
| 4 latest | paige | claude / muse | 64 / 41 | CLEAN both; both contain "Buyers". A2 also carries Ink/Signal/Bone from the ledger did-row. |
| 5 generic+close | paige | claude / muse | 64+63 / 34+39 | CLEAN (per-reply counts). |
| 5 guest | steffen | muse / claude | 45 / 56 | CLEAN both; both refuse the film still (no footage in pack) and say where to drop it. |
| 6 looking | paige | claude / muse | 66 / 43 | CLEAN both. A2 recalls the closing-slide dates + Steffen's still + palette from earlier turns. |

Full texts: `rounds/evidence/R21-reply-<brain>-<step>[-B].txt` (unsuffixed =
A2 Claude-driver run, `-B` = B Muse-driver run). Step-6 A2 file was
backfilled from the run's backend blocks after the test's read failed on
the clock bug below — content is the run's own reply, gate re-verified.

## 5. Latency and cost (per bridge `liveCalls`; a turn over 45 s: none)

Run A2 (Claude driver, Muse guest) — seconds are adapter wall time:

```
brief   paige   claude  8.0s  in=2    out=59   $0.354  attempts=1 ok viol=[]
answer  paige   claude  9.1s  in=2    out=98   $0.357  attempts=1
guest   steffen muse    7.7s  (no meter)
close   paige   claude 11.7s  in=2    out=119  $0.349  attempts=1
latest  paige   claude  9.8s  in=2    out=144  $0.362  attempts=1
generic paige   claude 10.1s  in=2    out=186  $0.364  attempts=1
guest   steffen muse    5.4s
close   paige   claude  8.9s  in=2    out=124  $0.363  attempts=1
looking paige   claude 10.0s  in=2    out=145  $0.366  attempts=1
```

Run B (Muse driver, Claude guest):

```
brief   paige   muse    5.4s
answer  paige   muse    3.2s
guest   steffen claude 11.5s  in=2    out=285  $0.363  attempts=1
close   paige   muse    8.4s
latest  paige   muse    5.7s
generic paige   muse    5.7s
guest   steffen claude  9.1s  in=2    out=113  $0.363  attempts=1
close   paige   muse    4.1s
looking paige   muse    7.1s
```

Smoke (Claude brief): 8.7 s, out=57, $0.396. OpenAI probe: 429 on all
three chain models, $0, contained in ~10 s wall.

Medians: Claude 9.8 s/turn (n=13, max 11.7), Muse 5.7 s/turn (n=10, max
8.4). Claude spend ≈ $3.64 total (13 calls × ~$0.28–0.40); Muse reports no
usage (runs under its own auth, $0 marginal here); OpenAI $0 (no credits).
Slowest suite test: T5, 32.4 s (two full turns + browser). No turn over
45 s — no latency findings. `tokens_in=2` is the envelope's cache
accounting (the probe showed ~12–16k cached/creation tokens beside it);
reported as-reported.

## 6. Incidents and honest log

1. T3 live, first A run: my rendered assert `getByText("Asking @steffen")`
   failed — delegate step LABELS do not paint. DOM snapshot of the passing
   turn shows the delegate row as avatar + name + time with no label text;
   R20's `R20-chat-scrolled.png` confirms it (two blank Paige rows at 1:37
   PM; only messages/questions/pills paint). Fixed the suite to assert what
   the person sees: runtime snippets of the guest + close messages.
   New UI row for R18 (owns `src/`): **R21-UI1** — `step` events with only a
   label render as blank labelled rows; a step-only turn (including the
   "I couldn't finish that turn" containment fallback) is protocol-visible
   but eye-invisible. Backend delivers it; the UI does not paint it.
2. Clock skew: this Mac runs ~13–14 s ahead of the Convex server clock, so
   `Date.now()`-anchored "blocks since t0" reads intermittently drop the
   turn's own blocks (killed A2's test 6 read; the turn itself was fine).
   Fixed with `userBlockTime` (anchor to the just-written user block's
   server `createdAt`); applied to tests 1–6 and 9.
3. State-file handling: I deleted the run-A state file and restarted on the
   same mission — the bridge re-handled 3 old messages and duplicated the
   brief turn (one extra step+question on the retired thread). Operator
   error, disclosed: the state file IS the dedup; never delete it under a
   live mission. Retired that thread; A2/B are single-pass and clean.
4. T9 first runs: backend kind string is `"steps"`, not `"step"` (my assert
   was wrong; the bridge was right). Fixed.
5. OpenAI: prom
...[truncated 3888 chars]

Ledger probe (for test 8 design): `v2Ledger:latest` with `["aster"]`
returns rows, extra subjects don't narrow (match-ANY) — so one query scopes
both live threads.
