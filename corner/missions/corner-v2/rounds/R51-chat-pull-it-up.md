# R51 — chat pull-it-up: "pull up X" opens the file and sends the link; paths never leak

Worker: headless builder, chat lane round eighteen.
Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R50-chat-card-first.md` (the round extended),
`rounds/GOAL-walk-1.md` (the walk: Wolfpack 3, Ambition 6, Kraken 6 → 5/8
average), the gateway G3 code that provides the backend
(`scripts/gateway/corner-gateway.py` POST `/gateway/open`, `convex`
`projectFiles:search` in the integration checkout — the referenced
`corner/missions/gateway/rounds/G3-*.md` file is not on disk; the G3 commits
`9676bcd53`/`be68178d7` are).
Code: AOM-EA `scripts/v2-team-bridge.py` (contract `r50-1` → **`r51-1`**) +
`scripts/test_v2_team_bridge.py` (**219/219**, plain `python3`).
Report: this file. Never `neat-pony-216` (the bridge refuses to start there).
No token or key printed, committed, or logged.

Verdict: built, committed on AOM-EA, all gates green. Every send this round
drew exactly one brain: three labelled proof sends on the e2e design thread
(PDF opens + link, KIE image opens + link, unknown name → near-miss), paige
alone each time. Zero sends on Patrik's threads. One deliberate deviation
from the brief's letter (§8): the file stage runs `search`-first with a
`list`+local-scorer fallback, because neither the deployed clone backend nor
the running gateway has the G3 route yet (§6).

Rule compliance: all sends on the e2e design thread
`vd7f0v4dn3kjjx9qnt9acryemn8dyr95` (the walk script `/tmp/r51-walk.py`,
scratch, not committed, hardcodes the design thread id and refuses any
other). Scoped commit only (2 scripts + this report), nothing pushed.

## 1. Before / after

Before (`r50-1`): "pull up the Wolfpack enhancement options plan for
September and send me the link" → "No Wolfpack enhancement options plan
exists as a document, so there is no link to send" (walk Q4, grade 0 — the
file existed). "Pull up the vision doc" → "…not a shareable link:
projects/kraken-corps/VISION.md" (walk Q4, path printed, grade 0.5).

After (`r51-1`, live on the design thread):
"R51 pullup: pull up the Aster brief" → paige, one run, done_s 17.5:
"Opened aster-brief.pdf in the Visual Window —
https://www.aheadofmarket.com/dashboard/c/vd7f0v4dn3kjjx9qnt9acryemn8dyr95?artifact=t17f93pfj00rv5gzkp5s3pdj898dzxvn.
It's a PDF from the Aster thread." The PDF tab is open in the session.
"R51 pullup: pull up the spring deck cover" → paige, one run, done_s 12.6:
"Opened Generated image — R47 walk: make an image for the Spring deck
hero… in the Visual Window — <link>?artifact=t173awq3wa3265cnvs64e2f6f58dzsf5.
It's an image from the Aster thread." The session's `activeTabId` is that
KIE photo tab.
"R51 pullup: pull up the zorg blorpt quarterly report" → paige, done_s 3.0:
"I don't see a zorg blorpt quarterly report for Aster; the closest I have
is Generated image — R47 walk: … and Image study — R46 walk: …." No tab
touched. Zero paths in all three replies (audited against the brief's
boundary regexes after URL-stripping: no matches).

## 2. What shipped (bridge)

Pull-up turn (`_answer_pullup`, mirrors `_answer_image`; wired into both
turn paths, standalone `poll_once` and service `_answer_one`, after the
image check): resolve FIRST (the open lands seconds after pickup, inside
the 5 s budget), then word the reply around the result.
- Intent (`pullup_query`, pure): pull up / open / show me / send me (the
  link to) `<x>` plus a bare "the `<x>` doc". Visual chrome
  (visual/window/tab/screen, "look at") and bare "open/show the
  deck|artifact|file" stay with the looking slot — the e2e looking send
  ("Open the deck in the Visual Window…", chat.spec.ts:53) still routes
  looking. "open" stays a noun elsewhere (open questions/asks/items out).
  Found live hazard while testing: `LOOKING_RE` claims "pull up the spring
  deck **cover**" via the bare word "deck" — hence the chrome/bare-object
  split instead of deferring to `is_looking_ask`.
- File stage (`_pullup_rows`): `projectFiles:search {world, subject, q}`
  (world = `resolve_world_slug`, subject = project slug). A pre-G3 backend
  falls back to `projectFiles:list` + `rank_pullup`, a port of the
  backend's `overlapScore`/`titleTokens` (same stopwords, same x0.9 name
  path, stable newest-first ties). Auth loss propagates; anything else
  degrades loudly with a log line, never a failed turn.
- Open stage (`_gateway_open` → `gateway_post_open`): POST
  `/gateway/open {world, subject, fileId}` (default
  `http://127.0.0.1:3110`, `CORNER_GATEWAY_URL` overrides) with Bearer
  [REDACTED] (`LEDGER_TOKEN` env, else `~/.config/corner/ledger.env` —
  the KIE-key pattern, read at call time, never logged). Returns
  `{artifactId, threadId, link, title}` → `v2Visual:openTab` on the
  returned thread → reply carries the returned link. Any failure falls
  through to thread artifacts (logged), never a failed turn.
- Thread stage: the pack's `visualArtifacts` (new; live-only, capped 20)
  scored the same way → `openTab` on this thread → bridge-built dashboard
  link (same shape as the gateway's `artifact_link`).
- Reply: "Opened `<title>` in the Visual Window - `<link>`." (hyphen, per
  R37 — the brief's em dash does not survive the gate) plus one
  `pullup_kind_line` ("It's a PDF from the project files."). Live wording
  uses the existing "looking" slot with facts pinning the exact two
  sentences and character-exact link copy; `ensure_link_in_reply` replaces
  a link-less/garbled reply with the scripted shape, so the turn always
  delivers the link. `_LiveFatal` → scripted shape (not the generic
  fallback — the open already succeeded). The plan carries an artifact
  event + the message (the C001 gate's justification, like
  `image_plan_for`); ledger stays empty (opens are R48 noise). The miss
  path is fully deterministic (no model call — done_s 3.0): "I don't see
  a `<x>` for `<project>`; the closest I have is `<top 2>`", top 2 from
  file hits then artifact titles; never "no such document exists" while
  anything is near.
- Paths never leak: `scrub_paths` replaces the brief's boundary
  (`(/|~/)?a/b/c…`, `projects/<slug>/<file>`) with the file's title
  ("the Kraken Corps vision doc"), dashboard links stashed first and
  restored verbatim, idempotent. Enforced at the `_event` choke point
  (streams, scripted lines, fallbacks all pass through it) and at the
  `_voice` wording boundary; `contains_path` backs a new `path-leak`
  `check_reply_text` flag (non-fatal, recorded); the contract RULES line
  now bans printing paths ("name the file's title instead ('the Kraken
  Corps vision doc'); dashboard links are always fine").
- Files in the pack: the card's `- Files:` line now lists TITLES
  (`title (kind)`, name fallback) — "Wolfpack: Website Enhancement
  Options + September Plan (document)" — so "what files do we have for
  X" answers from the pack without a search.
- Health: `pullupOpens` on both `/health` paths (service aggregate +
  single). Observed live: demo `pullupOpens 2`, prod `pullupOpens 0`.

Contract diff `r50-1` → `r51-1`: `LIVE_CONTRACT_VERSION` bump; R51 pure
block (`pullup_query`, `rank_pullup`/`pullup_overlap`/`pullup_tokens`,
`scrub_paths`/`contains_path`, reply/kind/miss/link builders,
`gateway_post_open`/`gateway_writer_token`/`PullupOpenError`,
`dashboard_link`); `visualArtifacts` in every pack; `_pullup_rows` /
`_gateway_open` / `_answer_pullup`; pullup branches in both turn paths;
`path-leak` detector; path RULES sentence; title-kind Files line;
`_pullup_opens` + health. Adapter argv/cwd/stdin, backends map, default
`claude`, and every R37–R50 gate unchanged.

## 3. Gates

- `python3 scripts/test_v2_team_bridge.py` = **219/219** (198 existing +
  21 new R51; deliberate reworks: 13 version pins `r50-1`→`r51-1` only —
  the R50 Files-line pins use name-only fixtures and still pass, since
  the title change falls back to names).
- New coverage: intent verbs + bare-doc + chrome/bare-object split +
  open-question guard; scorer ranking/stopwords/0.9-name-path/stability;
  the 1:16 PM walk reply scrub; deep/home links/idempotency; detector;
  reply shapes (hyphen, link, kind lines, 2/1/0 miss, articles, path in
  ask); link guarantee (keep/swap/garbled); gateway client (ok, no-token,
  404, unreachable, token never in errors) + token reader (env wins, file
  fallback, missing → ""); card title-kind line; `_voice`+`_event`
  scrub with link intact; search→list fallback incl. auth propagation;
  file-hit / artifact-hit / miss / gateway-failure plans
  (events, links, tabs, counters, no ledger); contract RULES pin;
  `pullupOpens` health aggregate.
- Restarts: production `com.aom-ea.corner-v2-bridge` kickstart → `ok` /
  `r51-1` / 169 threads / failedTicks 0 (the ONE, §8); demo
  `com.aom-ea.corner-v2-demo-bridge` kickstart → `ok` / `r51-1` / driver
  paige. No further restarts.
- Proof rows: §4. Suite: no `convex/` or client changes, so no e2e
  rewrite this round; the R50 suite's looking send still routes looking
  (verified by regex + untouched `plan_turn`/`is_looking_ask`).

## 4. Proof rows (design thread only, e2e account)

| # | Send (person block) | Reply voice | Result |
|---|---|---|---|
| 1 | `R51 pullup: pull up the Aster brief` (`v970zptvs8…`) | paige, one run, done_s 17.5 | PASS — "Opened aster-brief.pdf in the Visual Window - <link>?artifact=t17f93…", PDF tab open; log: search-unavailable → list 0 rows → opened thread artifact |
| 2 | `R51 pullup: pull up the spring deck cover` (`v97fmctwtx…`) | paige, one run, done_s 12.6 | PASS — opened the R47 Spring-deck-hero KIE photo, `activeTabId` is its tab, link in reply |
| 3 | `R51 pullup: pull up the zorg blorpt quarterly report` (`v9742rmny1…`) | paige, done_s 3.0 (deterministic miss, no model call) | PASS — near-miss with top-2 titles, no tab touched, never "no such document exists" |

Demo log for the turns: `[r51] files: search unavailable (…Server
Error); list fallback`, `list user-jx74…/aster rows=0 hits=0`,
`[r51] pullup: opened thread artifact '…'`. Demo `handled` 111 → 114
(exactly my three sends), `pullupOpens 2`. Zero sends anywhere else.

## 5. For the orchestrator

1. **The clone backend predates G3 files reads.** `projectFiles:search`
   and `projectFiles:resolveThread` both throw masked Server Error on
   `brilliant-scorpion-163` (authenticated, any world) while
   `projectFiles:list` works — the deploy lags the checkout (same story
   as R50 §7.3's `upgradeArtifact` suspicion). The bridge's list
   fallback carries the file stage until a backend redeploy; no bridge
   change needed when it lands (search-first).
2. **The running gateway predates the G3 POST route.** `POST
   127.0.0.1:3110/gateway/open` → `501 Unsupported method ('POST')`
   (process up since 10:54; the G4 lane is actively working around it —
   left running, not my lane to restart). Verified auth-adjacent only to
   the extent possible: `token_present: true` on `/health`; unit tests
   pin the client. When the gateway restarts and picks up `do_POST`, the
   bridge's file-hit path goes live with no bridge change. A G4 worker
   is active — coordinate the gateway restart with that lane.
3. **"Fall back to the world" is implemented as documented:** every file
   call is scoped `{world, subject}` with the world from
   `resolve_world_slug` (its standing `aom` fallback); the backend
   generation fallback is search→list. Cross-subject world-wide search
   is not in the G3 API (single-subject queries only), so there is no
   broader world stage to call — flagging in case the brief meant more.
4. **World-slug note:** the demo bot's world slug is
   `user-jx74…` (visible in the `[r51] files:` log lines), not
   `e2e-world` — R50's shorthand. `e2e-world` matches no world row, so
   those queries correctly throw; nothing to fix.
5. **No backend deploy in this round** (no `convex/` changes), no client
   changes. The `R25` service path is wired (`_answer_one`) but proof is
   demo-only per the brief; prod got exactly one restart and no sends.

## 6. Still off and why

1. **Old artifact titles carry em dashes into pull-up replies.** Send 2's
   reply quotes "Generated image — R47 walk…" verbatim (R50 hyphenated
   new titles at both sources; old rows keep theirs). The `em-dash`
   gate flags it in `live_calls` (visible, never rewritten, per the R37
   rule) — disclosed, not scrubbed.
2. **The file→gateway→open path is unit-proven, not live-proven.** Live
   proof ran list-fallback (empty) → thread artifacts, because the demo
   world has zero synced `projectFiles` rows (no Aster Mac folder —
   `[r29] grounding: folder=MISSING`, unchanged) AND findings 1–2 above.
   First live file-hit will exercise gateway error branches new to
   production (`501` → artifact fallback is already the observed shape).
3. **Tie fragility on generic cover asks.** "spring deck cover" scores
   the R47 hero and the R46 study identically (0.67); stable
   newest-first order picks R47 today. Any 0.67 winner is still "the KIE
   image", but a growing artifact pile will need recency tie-breaks.
4. **Scrub edge:** `24/7/365`-shaped prose matches the brief's boundary
   and would be titled ("the 365 file"). Kept brief-exact; no reply has
   hit it.

## 7. Incidents (mine, all disclosed)

1. **Three labelled person sends + one 404-shaped gateway probe**, all
   on the design thread except the probe (localhost, no side effects:
   unknown fileId). Zero Patrik-thread sends; prod got the single
   allowed restart and answered nothing of mine.
2. **My first probe round ran unsigned** (fresh `ConvexClient` never
   signs in — `setup()` does) and looked like missing backend
   functions; re-ran signed-in before concluding findings 1–2.
3. Pre-existing states left alone: AOM-EA working-tree modifications
   outside `scripts/` + this report (dozens, not mine — unstaged,
   untouched), `corner-v2-integration` results dirs, the G4 lane's
   running workers.
