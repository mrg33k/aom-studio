# PLAN — Corner on a substrate: OpenClaw as the engine, Corner as the agency layer

Status: APPROVED by Patrik 2026-09-17 (session plan file copied here so it survives the session). Mission: `corner:corner-v2` (R83, continues R82's harness study) / `corner:assistant-gauntlet`. Execution: this session writes `corner/openclaw/` (plugins, config, workspace, brief) and the bridge exclusion flag, commits and pushes; a Mac-side agent runs the spike from the brief; Patrik reads the report and the phone walk.

## Context

R82 read ten agent harnesses from their code. Finding: they are all the same machine (a model-driven loop as an ordered list of operations, SKILL.md skills by description, MCP hands, three-tier memory with a consolidation pass, an approval stack with scoped persisted answers, one server-owned event stream, a provider layer), and Corner's bridge has none of it structurally. Rebuilding that machine well is months of one-person work that ends where the field already is.

One of the ten is most of Corner's engine, free: OpenClaw, MIT, foundation-stewarded, "no paid tier, hosted service, or token", 167 plugins, providers for Anthropic, OpenAI, Google, Meta and local models, a CLI-login backend pattern, channel plugins, native apps, team deployment, cron, standing intents, dreaming, approvals in chat, progress in chat, a personal-agent benchmark pack. Its README: "Models and agent harnesses (Claude, Codex, local models) are plugins you can swap without changing anything else."

Patrik's read of this on 2026-09-17: "so you're saying we use OpenClaw as the bridge for free and keep it moving making the best app for agency owners?" Yes, with edges: it replaces the bridge (loop, router, pack, reminders, story pass, push logic), not the app, the stage, the skills or Convex; it is free in money, not in ownership (a fast-moving public codebase becomes the engine); it is one gateway per owner or team.

This plan is the house way to find out: a two-day spike, then a cage match, with the current bridge as the control. Corner keeps building the agency layer (native app, Visual Window, client rooms, skills, memory layout, install) throughout.

## 1. What OpenClaw would own vs. what Corner keeps

| Corner today | On OpenClaw | Source |
|---|---|---|
| Bridge loop, regex router, pack builder, claim gates | the agent loop; deleted | `packages/agent-core/src/agent-loop.ts` |
| Muse via `muse exec` text-only | built-in Meta provider, `muse-spark-1.3`, tools + streaming; AOM's key (confirmed 2026-09-17) | `extensions/meta` |
| Claude via `claude -p`, OpenAI via API | provider plugins; model is a per-session setting (`/model`, `sessions.patch`) | `extensions/anthropic` (incl. CLI-login backend), `extensions/openai` |
| 318 skills, chat reaches none | `SKILL.md` catalog by description in `<workspace>/skills`, per-agent allowlist (catalog budget 18,000 chars) | `docs/tools/skills.md`, `openclaw migrate claude` |
| Reminders JSON + bridge tick, routines, 6 h offers | `automations` tool (at / every / cron), delivery `announce` into the session; standing intents; heartbeat | `src/agents/tools/cron-tool-schema.ts`, `extensions/memory-core/src/standing-intents-tool.ts` |
| Story pass after 15 idle min | nightly dreaming (no idle trigger exists) writing `MEMORY.md`, `DREAMS.md` | `docs/concepts/dreaming.md` |
| Standing facts, journal, ledger, state cards | core files (`AGENTS.md`, `USER.md`, `MEMORY.md`), `memory/YYYY-MM-DD.md`, per-project `FACTS.md` searchable via `memory.search.extraPaths`; ledger stays in Convex | `src/agents/workspace.ts:61-66`, `docs/reference/memory-config.md:437-456` |
| "Never send" in the prompt | approvals in chat: allow once / always / deny, `/approve <id>` text fallback, always → allowlist row | `src/auto-reply/reply/commands-approve.ts`, `docs/tools/exec-approvals.md` |
| One step line then silence | progress draft: one edited message with plan steps, tool rows, narration | `src/channels/progress-draft-compositor.ts` |
| Needs-you push from the bridge | the channel plugin's outbound on `lifecycle` end + the existing `notify:sendNeedsYouPush` | Corner plugin |
| Home chat + project rooms + missions | one channel, one session per conversation id (`agent:<agent>:<channel>:<kind>:<id>`); rooms bindable to agents | `src/routing/session-key.ts:207-262`, `docs/concepts/agent-bindings.md` |
| **Kept by Corner** | native app, Convex (threads, runs, events, artifacts, tree, ledger, review), Visual Window, file gateway on :3110, memory files, skills content, task-lane workers on the Muse CLI, gauntlet | |

**Tenancy edge.** One gateway is one trust domain. Corner-internal worlds can share a gateway as separate agents; a true customer tenant (Karen, Ben, Andocia) needs its own gateway (`openclaw fleet` cells, `docs/gateway/multi-tenant-hosting.md`). That matches "an install per agency" and does not match "many customers on one server".

## 2. The two Corner plugins

### 2a. What the Corner side already fixes (contracts the plugins must honor)

**The phone talks to Convex only** (`ios-native/Corner/Services/CornerV2API.swift:30-108, 146-303`; `ConvexService.swift`). Nothing on the phone changes if the engine behind Convex changes. The calls that matter:
- Send: `v2Native:send {text, mentioning, preferredProjectId?, mode?, threadId?, model?, clientEventId?, imageTool?, replyTo?}`.
- Read: `v2Native:threadEvents {threadId, after | limit}` polled every 2 s; `v2Native:runsForThread {threadId}` (open run = Working); `v2Native:activeRooms` every 8 s (needs-you badge).
- Stage: `v2Native:visualTabs / openVisualTab / closeVisualTab`, `v2Visual:setViewState`, `v2Visual:getSession`, `v2Visual:createArtifact` + `files:generateUploadUrl`.
- Tree and rooms: `v2Native:workspaceTree`, `v2Workspace:getNavigation`, `v2Projects:rename/archive/move/create…`, `v2Native:ledger`, `ledger:latest`, `v2Native:pendingConfirmations`.
- Connections: `arcade:*`. Push registration: `POST /api/push/register-device` (Vercel), not Convex.
- The model pin rides on each send as `model`; mode as `mode`. Persisted prefs via `preferences:*`.

**What the bridge writes today, which a channel plugin must reproduce** (`scripts/v2-team-bridge.py`):
- Discover: `v2Native:threadsWithNewUserBlocks {since}` (:11759).
- Run: `v2Visual:startRun {threadId, provider, brain}` → `{runId}` (:8045); `v2Visual:appendEvent {runId, eventId, type: step|message|question, payload, afterEventId?}` (:8052); `v2Visual:appendToBlock` for streamed text (:9601); `v2Visual:finishRun {runId, status}` (:8105).
- Stage: `POST http://127.0.0.1:3110/gateway/open {world, subject, fileId, threadId?}` with the ledger bearer token (gateway `corner-gateway.py:1364`), then `v2Visual:openTab {threadId, target:{kind:"artifact", artifactId}, openedBy:"agent"}` (:8640). File ids are `sha1(repo-relative path)[:12]` (:7493).
- Needs-you: `v2Native:needsYouStatus {threadId}` then `notify:sendNeedsYouPush {threadId, title, body, missionId|projectId}` (:10899-10951), gated by `needs_you_push_allowed`.
- Drive: `v2Projects:renameProject/renameMission/archive*/moveMission/createMission/createProject/unarchive*` (:11030-11149).
- Ledger: `v2Ledger:append {workspaceId, item{who, surface, what ≤240, subjects, links, kind}}` (:8028). Journal: files (below).

**Memory on disk** (root `corner/users/aom/projects/<slug>/`, `v2-team-bridge.py:134`):
- Standing facts `FACTS.md` with a dated "Standing facts as of …" block written by `file_dump_facts` (:4186); read with `CONTEXT.md`, `BUILD.md`, `VISION.md`, `updates/`.
- Journal `journal/YYYY-MM-DD.jsonl` (one object per turn) and the main `corner/users/aom/journal/`; story pass writes `YYYY-MM-DD.md` after 900 s idle (:3731, :4005).
- State cards: Convex `projectCards:get`. Deliverables `deliverables/`. Reminders `corner/state/corner-v2-bridge/reminders.json` (:11651).

**Readers and hands to wrap:** Gmail via `arcade:arcadeExecute {userId, tool:"Gmail.ListEmails"|"Gmail.ListEmailsByHeader"}` (:3583-3660), accounts from `arcade:emailAccountsForWorld`; KIE images via `.agents/skills/kie/pipeline/kie.py` (:2783-2851); the task lane `corner_task_lane.launch_worker` (Muse with `--trust-workspace --disable-sandbox` in the repo, :590-614).

**Muse today:** chat turns run `muse exec --json --user-input-auto-resolve --disable-approval --disable-web-tools --workspace <empty dir> --max-model-steps 40` with no `--trust-workspace`; the bridge parses exactly two events, `run.output.delta` and `run.terminal.completed` (:6497-6510). No tool-call event is parsed. The guide names a second seam: `muse serve` over stdio (the MSP wire protocol, `MUSE-PROMPTING-GUIDE.md:57`), which is the candidate for a real provider integration.

### 2b. OpenClaw side: channel, hands, provider (verified in the v2026.9.4 clone)

**Channel plugin (the phone via Convex; the app stays untouched).** Template: `extensions/raft` (plugin object `src/channel.ts:26-109`, entry `index.ts:4-13`, manifest `"channels":["raft"]`). Inbound is `channelRuntime.routing.resolveAgentRoute` then `channelRuntime.inbound.run({channel, accountId, raw, adapter:{ingest, resolveTurn}})` (`extensions/raft/src/inbound.ts:32-110`); the context to populate is `src/channels/inbound-event/context.ts:83-113` (sender, conversation {kind, id, label}, message {rawBody, commandBody, bodyForAgent}). Outbound: `outbound.sendText` or `defineChannelMessageAdapter`. Progress drafts: `channels.<id>.streaming.mode = "progress"` plus `message.live.capabilities` and `defineFinalizableLivePreviewAdapter` (`docs/plugins/sdk-channel-plugins/message-adapter.md:57-68`). Approvals: core owns the `/approve` text fallback; a native card is optional. Built-in `/approve /model /new /reset` come free when the user text is in `message.commandBody`. Minimal channel about 150 lines.

**Session keying.** Home thread → the agent's main session (direct). Each project room and mission → a group peer with its own conversation id → its own session, transcript and queue (`agent:<agentId>:corner:group:<threadId>`, `src/routing/session-key.ts:252-262`). Rooms can be bound to different agents with their own workspace and memory via bindings.

**Hands plugin.** `defineToolPlugin` (template `extensions/llm-task/index.ts:8-28`; contract `docs/plugins/tool-plugins.md:76-115`): one file, a dozen `tool({name, description, parameters, execute})` entries. `api.registerTool` (template `extensions/lobster/index.ts:6-28`) for hands that need `sessionKey` (open on stage, remind). No MCP server process needed.

**Provider.** `extensions/meta`: Meta's hosted OpenAI-compatible API, models `muse-spark-1.1/1.2/1.3`, streaming and tool calling (`extensions/meta/README.md:3-13`, `index.ts:14-37`). AOM has the key. The CLI-backend path is text-only for unknown JSON dialects (`src/agents/cli-output-records.ts:17-52`), so the `muse` CLI stays where it already runs with real tools: the task-lane workers.

**The other way in for the phone (later cage).** OpenClaw's own iOS app (`apps/ios`, shared `apps/shared/OpenClawKit`) connects as `role: node` over WebSocket RPC v4 (`chat.send`, `sessions.*`, `agent` → `{runId, acceptedAt}`, `agent.wait`; streams `lifecycle`, `assistant`, `tool`). `docs/gateway/external-apps.md` is the documented path for an external SwiftUI app.

**Install.** Node 24.16+ or 26; `npm install -g openclaw@latest --allow-scripts=openclaw`; `openclaw onboard --install-daemon`; config `~/.openclaw/openclaw.json` (JSON5, hot reload; examples `docs/gateway/configuration-examples.md:13-55`); state under `~/.openclaw/`; local plugins via `openclaw plugins install --link ./dir`.

## 2c. Step zero (Patrik, 2026-09-17: "do that now")

Copy this plan into the repo so it survives the session: `corner/missions/corner-v2/PLAN-openclaw-substrate.md` in aom-studio, next to the R82 study, with a one-line R83 stub in `BUILD.md` pointing at it. Commit and push to `claude/keen-galileo-5ymy6n`. Nothing else in the repo changes in that commit.

## 3. The build: two plugins, one workspace, one brief

**Repo layout (AOM-EA, new):**
```
corner/openclaw/
  README.md                       what this is, how to link, how to roll back
  config/openclaw.json5           pinned config, copied to ~/.openclaw/openclaw.json
  corner-convex-channel/          TS channel plugin, mirrors extensions/raft
    index.ts, openclaw.plugin.json, package.json, src/{channel,gateway,inbound,outbound,convex,runs}.ts
  corner-hands/                   TS tool plugin, mirrors extensions/llm-task
    index.ts, openclaw.plugin.json, src/tools/*.ts, src/{convex,scope}.ts
  workspace/                      AGENTS.md, USER.md, MEMORY.md, skills-allowlist.txt
  briefs/S0-openclaw-spike.md     the Mac-side brief
  rounds/                         S0-report.md lands here
```
Both plugins in TypeScript (the plugin SDK is TS only). The hands call Convex over HTTP directly: the bridge's `ConvexClient` (`scripts/v2-team-bridge.py:227-340`) is sixty lines of `POST /api/{query|mutation|action}` with password sign-in and re-sign-in on 401, ported once so channel and hands share one token and one recovery path. Python is shelled out only where the CLI already is the interface: `kie.py` for images and `corner_task_lane.launch_worker` for task-lane workers. Pin `openclaw@2026.9.4` in `peerDependencies` exactly as `extensions/raft/package.json` does.

**Channel plugin.** Poll `v2Native:threadsWithNewUserBlocks {since}` every 2 s as `tick_fast` does (:11759), per-thread `since` persisted in `~/.openclaw/state/corner-channel.json` so a restart never re-answers; drop any thread not in `channels.corner.allowThreads`. Thread → conversation: the home thread is `kind: "direct"` (the agent's main session); each project or mission room is `kind: "group", id: <threadId>` (its own session). Context: `sender {id, name}`, `conversation.label` from the navigation, `message.rawBody` and `commandBody` = the block text so `/model`, `/new`, `/approve` come free, `bodyForAgent` = text plus a one-line room header the hands scope-check against. Write-back is the run protocol the phone already renders: `v2Visual:startRun` on accept, `appendToBlock` for text deltas (one growing bubble), one `appendEvent step` per new tool row deduped by label as `_event` does, `finishRun` on final. Progress drafts: `streaming.mode: "progress"` with `defineFinalizableLivePreviewAdapter`, where preview = startRun plus first block, edit = diff tool rows into steps, finalize = close. Approvals: core's `/approve` text fallback; the channel writes the approval as a `question` event and rewrites the next yes/no on that thread into `/approve <id>` or `/deny <id>` while it is pending (a tapped card posts text on the thread too, so one path serves both). Announce deliveries (reminders) get their own startRun/message/finishRun. A watchdog finishes any run past the turn budget with a short error so `runsForThread` never shows a zombie (the gauntlet's `wait_for_reply` needs `open == []`). After finish: `needsYouStatus` → `sendNeedsYouPush` with the existing throttle gate (:10899-10951). About 1.5 days.

**Hands plugin.** `defineToolPlugin` entries; S marks tools registered with `api.registerTool` because they need the session key. `src/scope.ts` maps session key → `{world, threadId, projectSlug}` from the channel's state; no tool takes world or thread from the model.

| Tool | Wraps | Tier |
|---|---|---|
| `corner_room_context` S | `projectCards:get`, `v2Workspace:getNavigation`, FACTS head | read |
| `corner_read_project {slug, file?}` | disk `corner/users/aom/projects/<slug>/` | read |
| `corner_find_file {query}` S | gateway files index, id = sha1(path)[:12] | read |
| `corner_open_file {fileId}` S | `POST :3110/gateway/open` then `v2Visual:openTab` | side effect, idempotent |
| `corner_read_inbox {sender?, n?}` S | `arcade:emailAccountsForWorld`, `arcadeExecute Gmail.ListEmails / ListEmailsByHeader` | read |
| `corner_send_email {to, subject, body}` S | `arcadeExecute Gmail.SendEmail` (no send code exists today) | destructive, ask only |
| `corner_note_fact {slug, facts[]}` S | `file_dump_facts` semantics (:4186) | write |
| `corner_write_deliverable {slug, name, markdown}` S | disk `deliverables/`, open, `v2Ledger:append` | write |
| `corner_drive {action, what, to?}` S | `v2Projects:*` (:11030-11149), last action kept per session for undo | reversible |
| `corner_remind {when, what, rule?}` S | OpenClaw `automations` with delivery announce to the thread | write |
| `corner_make_image {prompt}` S | `kie.py`, `v2Visual:createArtifact`, openTab | write |
| `corner_run_task {brief}` S | `corner_task_lane.launch_worker` (:602) | destructive, ask |

About 1.5 days.

**Provider.** `agents.defaults.model.primary: "meta/muse-spark-1.3"`; the key as `MODEL_API_KEY` in the gateway's launchd environment or via the onboarding step that writes the auth profile (`extensions/meta/index.ts:24-28`). Day 0 proves it with one `curl` to `/v1/responses` and `openclaw models status`. The `muse` CLI stays only inside `corner_run_task` workers.

**Workspace and memory.** Workspace at `~/.openclaw/workspace-corner-aom`, outside the aom-ea checkout, because project memory scoping keys on the git remote and a workspace inside the repo would tag every turn as aom-ea work. `AGENTS.md` = the Muse assistant template plus house rules; `USER.md` = Patrik; `MEMORY.md` = curated from `lessons.md` and `decisions.md`. The Corner journal keeps its writer: the channel appends one line per turn in the bridge's schema. `memory.search.extraPaths` = the projects directory (`**/FACTS.md`, `CONTEXT.md`, `updates/**`) and the journal directory, as real directories, not symlinks. Skills: copy about thirty agency skills from `.claude/skills` into `<workspace>/skills`, listed in `skills-allowlist.txt` and in `agents.entries.corner.skills`; the whole 318 blow the catalog budget. The idle story pass becomes nightly dreaming; `reminders.json` becomes automations. About 0.5 day.

**Bridge change (day 1).** There is no thread-exclusion flag today. Add `R25_SKIP_THREADS` to `corner/state/corner-v2-bridge.env`, honored in `fast_candidates` (`v2-team-bridge.py:3378`), about ten lines plus a unit test, so two engines never answer one thread.

## 4. The spike (two days, Mac-side agent from `briefs/S0-openclaw-spike.md`)

- **Day 0 (quarter day):** Node ≥ 24.16; `MODEL_API_KEY` present and one `curl` returns a completion; `~/.config/corner/bridge-bot.env` readable; `curl 127.0.0.1:3110/health` ok; `LEDGER_TOKEN` present; the simulator boots with the QA account.
- **Day 1:** `npm install -g openclaw@2026.9.4 --allow-scripts=openclaw`; `openclaw onboard --install-daemon`; copy the config; `openclaw plugins install --link` both plugins; one agent `corner`; `allowThreads` = the Corner QA thread plus a second sandbox project, "Corner QA Home", whose thread stands in for General for the two `from_home` gauntlet prompts (a `GAUNTLET_HOME_THREAD_ID` env read in `find_home_thread`); set `R25_SKIP_THREADS`, restart the bridge, and prove exclusion before enabling OpenClaw (one message on the QA thread, no reply in 60 s). Then start the gateway and send "hello".
- **Day 2:** `python3 scripts/corner-conversation-gauntlet.py` unchanged except the env; then the five hands asks by hand on the simulator: open a named file on the stage, read inbox by sender, rename then undo, yes-to-offer deliverable, "remind me in 1 minute".
- **Report** (`rounds/S0-report.md`): the house line `OPTION A: PASS/FAIL | OPTION B: PASS/FAIL`, per-prompt scores out of 9, reply latency, first-step time, a screenshot per hands ask, and the zero-writes-outside-sandbox check (`git status` on the projects directory minus corner-qa).
- **Stop conditions:** any write outside the sandbox (stop, remove the thread from the allowlist); a zombie run older than the turn budget; a gauntlet mean more than one point under the control; any hands ask that passes only in curl.

## 4b. The cage (1.5 days, after a passing spike)

A = OpenClaw, B = the current bridge as control, on the same sixteen prompts, the hands station, and a phone walk on the simulator. Promotion: A beats B twice, the second time on cleared threads; zero writes outside the sandbox; every tool call visible as a step on the phone; no zombie runs. Rollback: remove the thread from `allowThreads` and from `R25_SKIP_THREADS`; the bridge resumes on its next tick. After promotion, the bridge is retired lane by lane and deleted when no thread runs it.

Later, app-facing cage: A' channel over Convex (phone unchanged) vs B' the phone speaks the gateway RPC directly (`docs/gateway/external-apps.md`). B' means a new transport conforming to `MessageTransport` (`ios-native/Corner/Services/MessageTransport.swift`), a WebSocket client with device pairing, and reconciling `chat.send` and `agent.wait` streams with the `threadEvents` and `runsForThread` shapes in `CornerV2API.swift`. Three to five days, not before A wins.

## 5. Verification

- Day 0 checks are pass/fail lines in the report.
- The judge is unchanged: `scripts/corner-conversation-gauntlet.py` (sends via Convex, waits for the reply on the thread, Sonnet rubric out of 9), plus the five hands asks with rule-based checks on Convex state (tab opened, tree renamed then restored, deliverable file plus tab, reminder fired within 90 s) and the simulator screenshots.
- Bridge exclusion: `python3 scripts/test_v2_team_bridge.py` stays green with the new `R25_SKIP_THREADS` test; the day-1 "no reply in 60 s" proof.
- Plugin unit tests: `corner-hands` scope injection (a tool called with a foreign world or thread refuses), `corner_send_email` never executes without an approval, `corner-convex-channel` run protocol (startRun → steps → block → finishRun, zombie watchdog) against a fake Convex.
- Phone gate per GOAL.md: a pass only in curl does not count; the walk on the logged-in simulator, then a day on Patrik's phone.

## 6. Risks and the edges that stay true

- **Ownership.** The engine becomes a public codebase at v2026.9.4 that ships often. Pin the version, upgrade on a cadence, keep the two Corner plugins thin so upgrades are a plugin-SDK diff. This is the "you own it" trust line the 2026-09-13 audit wanted for sales, and it is also a dependency.
- **Skills catalog budget.** 18,000 chars of names and descriptions; 318 skills will not all fit. Start with an allowlist of the agency skills that matter in chat; raise the limit or split agents later.
- **Memory scoping is keyed by git remote**, not by project name. Per-client facts stay searchable through `extraPaths`; true per-project boosts need each client as its own repo or worktree.
- **No idle trigger.** The 15-minute story pass becomes nightly dreaming. If the same-evening story matters, the channel plugin can fire a cron from its own idle signal.
- **One gateway per untrusted tenant.** Customer worlds are separate installs. That is the agency-install shape, and it changes the SaaS shape.
- **Still Mac-resident:** the file gateway on :3110, the journal and facts on disk, the task-lane Muse workers. The Mac-asleep question is unchanged by this plan.
- **Liveness on the phone.** Convex stays the log the phone reads. The channel plugin must write a heartbeat on the run or the thread from OpenClaw's `lifecycle` stream, or the phone still cannot tell a slow turn from a dead engine.
- **Two engines, one thread.** Until the cage is decided the bridge must skip the threads OpenClaw claims (an exclusion list in `corner/state/corner-v2-bridge.env`), or both answer.
- **The spike is on the Mac, not here.** This session writes the brief, config and plugin skeletons and pushes them; a Mac-side agent runs them. The first real result is that agent's report.

## 7. Decisions

**Made (2026-09-17):**
1. OpenClaw is the engine, subject to the spike and the cage. Corner builds the agency layer: the native app, the Visual Window, client rooms, skills, memory layout, the install.
2. No second engine. The cage is OpenClaw vs the current bridge as control. The app-facing cage later is channel-over-Convex vs direct gateway RPC from SwiftUI.
3. Muse first, through OpenClaw's built-in Meta provider (`muse-spark-1.3`) with AOM's existing key. The `muse` CLI stays for task-lane workers.
4. A Mac-side agent executes from a brief this session writes.
5. The spike keeps the phone untouched: the channel plugin over Convex, so the existing gauntlet runner is the judge as is.

**Still Patrik's, at the spike report:**
- Whether the cage-1 result is decisive enough to retire the bridge lane by lane, or whether a second round runs.
- Which worlds share the studio gateway and which get their own install.
- Which sends get a standing "always" tier from day one and which never do (the send tool ships in ask tier only).
- Whether to run the app-facing cage (direct gateway RPC) or keep Convex as the only wire.
