# PATTERN — what the best harnesses share, and what Corner should build from it

**Mission:** `corner:corner-v2` R82 (belongs to `corner:assistant-gauntlet`) · **Date:** 2026-09-17 · **Inputs:** ten structural briefs in this folder (OpenClaw, Claude Code, Claude Agent SDK, Codex CLI, Gemini CLI, Cursor, Cline/Roo, Goose, OpenHands, Letta), each read from code at a pinned commit except Cursor (docs excerpts; its domains are egress-blocked here) and Claude Code (docs).
**Patrik's frame:** "Behind it is the LLM of choice. The Harness is a bunch of readily available skills to fully run an agency in the form of a hard working and easy to talk to agent." Order of operations, not rules. "Never send" is a bad rule; approvals are a tier. Latency does not matter while real steps fire. Build for three years. Guide a normal model toward an AGI-feeling experience the way we build the app.

## 0. The one-paragraph answer

Every harness in the study is the same machine: **the model decides the next action by calling tools; the harness runs an ordered list of operations around each model call; skills are procedure files the model reads when their description matches; memory is three tiers (always-in-context core files, deferred files indexed by name, and an immutable log that is searched, never loaded); approvals are a decision stack in front of every risky tool call whose answers carry a scope and persist as rules; the UI renders one typed event stream the server owns; and the model is a provider behind one interface.** Nobody routes by regex. Nobody makes one completion per turn. Nobody has a "never" rule for sends; they have a tier. Corner's bridge has the pieces (hands, memory files, a ledger, a step channel, a gauntlet) and is missing the machine. The rest of this document is the machine, row by row, with what to adopt as is and what to adapt for an owner on a phone.

## 1. The loop: an ordered list of operations around a model call

**Shared pattern.** No planner and no router sit in front of the model (OpenClaw §1 "no planner and no router"; Codex §1 "no planner, no router"; Cline, Goose, OpenHands, Gemini, Letta the same). The model returns text or tool calls; the harness executes, appends results, and samples again until the model stops calling tools. The "order of operations" Patrik wants is literally how the two most mature loops are written now:

| Goose state machine (`agents/state_machine`, replacing a 6,161-line loop-with-flags) | Codex `run_turn` (`core/src/session/turn.rs`) |
|---|---|
| EntryHook → SlashCommand → Steer → MaxTurns → Compaction → ToolPairCompaction → ToolApproval → Skill → Recipe → ToolExecution → UnknownTool → Retry → StopHook → ExitOnError | pre-sampling compaction → discover MCP servers the input names → inject skills → record input + UserPromptSubmit hooks → loop: drain pending user input → step context → time reminder → sample → per tool call (approval → sandbox → execute) → needs follow-up? → Stop hooks |

OpenClaw's channel path is the same shape one level up: commands and directives are handled before any model call, then gather → prepare context → route → execute → finalize (§1).

**Budgets.** Explicit per-run caps exist where the harness is mature (Gemini 100 turns per prompt, OpenHands 500 iterations, Goose 1000 turns, Cline `maxIterations`, SDK `max_turns` with a typed `terminal_reason`). The two harnesses that bounded runs by wall clock only (OpenClaw 48 h, Cursor "no limit on tool calls") had to bolt on idle breakers and loop detectors after real incidents (OpenClaw §9: one heartbeat burned "$20–30 per incident"). Loop and stuck detection is universal: identical-call thresholds (Gemini 5, Cline 3 soft / 5 hard, OpenClaw 10/20/30), one nudge before halting (OpenHands "You've called X with the same arguments N times… try a different approach"; Gemini "take a step back"), empty-response retry with a nudge (Gemini, Goose 3, Roo, Letta 2).

**Mid-turn messages.** Nobody folds-and-drops. The field converges on **steer**: a message that arrives during a run is injected between tool batches (OpenClaw default mode `steer`, 500 ms debounce; Codex drains pending input between steps; OpenHands queues and never loses a message sent while finishing; Roo queues to the next ask; Cursor queues to run after the current task).

**Ending.** A turn never ends in silence: OpenClaw runs a tool-free finalization pass if tools ran but no answer was composed, and sends a fallback that names partial results ("timed out after Ns; 3 partial results are available"); Cline makes a failed request end with a retryable row; Codex breaks the turn, not the thread; Gemini's next-speaker check auto-continues a model that stopped mid-task.

**For Corner.** The bridge's turn becomes an ordered ops list: fast commands (undo, stop reminders, clear) → steer → budget → compaction → skill catalog + triggers → sample → per tool call (hook → policy → confirm → execute → item) → follow-up? → stop hooks → finalize-never-silent → journal, ledger, push. Budget: a small explicit tool-call cap and a wall clock, exhaustion posts the landed steps plus one offer (the task lane already exists for the long tail). Latency is not a budget input; real steps are.

## 2. Skills and tools: SKILL.md by description, tools by schema, MCP as the seam

**Shared pattern.** Nine of ten use `SKILL.md` files with `name` and `description` frontmatter (the AgentSkills spec), and load them lazily: names and descriptions go into a budgeted `<available_skills>` catalog; the body is read only on a match, through a tool (OpenClaw `read`, budget 150 skills / 18,000 chars, a seven-line prompt contract: "Clear match: read exact location; obey. Several: most specific. None: read none."; Gemini `activate_skill`; Cline and Letta a `Skill` tool described as "a BLOCKING REQUIREMENT before any other response"; Codex injects `$mentioned` bodies; OpenHands appends a keyword- or path-triggered body to the user message). Gating at load time by required binaries, env and config (OpenClaw `requires`), so a skill the machine cannot run is not offered.

Tools are JSON-schema functions, and **MCP is the extension protocol everywhere** (Goose: MCP is the only tool model; Claude Code, Codex, Gemini, Cline, OpenClaw bundles, OpenHands wraps). MCP's `readOnlyHint` / `destructiveHint` annotations feed approvals (Goose, OpenHands). Large catalogs defer schemas behind a `tool_search` (Claude Code, Codex, OpenClaw, Cursor measured a 46.9 % token cut). Goose's docs: stay under ~25 live tools. Tool results and tool errors both return as messages the model reads: "the errors become prompts" (Goose).

**For Corner.** AOM-EA already holds 318 skills under `.claude/skills/` and 11 under `.agents/skills/`. That catalog, rendered by description and gated by what the machine can run, **is the replacement for the regex intent chain**: the model picks the procedure. The hands (read project, search files, open on stage, read inbox, file a fact, rename/undo, remind, write deliverable, run task, generate image, send) become one MCP server, which every lane can consume and which is the model-portability seam. Live tool count stays small; the skills carry the breadth.

## 3. Memory: three tiers, a memory tool, and a consolidation pass

**Shared pattern.**

| Tier | Who has it | Loaded |
|---|---|---|
| Core, always in context, budgeted | Letta core blocks (`persona`, `human`, root `*.md`); OpenClaw `AGENTS.md`/`SOUL.md`/`USER.md`/`MEMORY.md` (60,000 chars total); OpenHands two-tier `MEMORY.md` (6,000 chars); Codex memories (8,900 bytes); Claude auto memory (200 lines); Gemini hierarchical `GEMINI.md` | every turn |
| Deferred, indexed by name and description | Letta external files under `MEMORY.md`; OpenClaw daily `memory/YYYY-MM-DD.md`; Gemini per-directory context loaded when a tool touches the path | on demand by tool or trigger |
| Immutable log, searched never loaded | Letta recall over transcripts; OpenHands "the log is the memory"; Codex rollout JSONL; Goose SQLite sessions + `chatrecall`; OpenClaw `memory_search` (hybrid relevance × 30-day recency × importance) | by search tool |

Writers: the agent in-turn through a memory tool (Letta `memory` with a required `reason`, no-op rejection and one git commit per edit; Goose "always confirm with the user before saving"), plus a **background consolidation pass** (OpenClaw dreaming light → REM → deep; Letta a reflection subagent that extracts mistakes and corrections first, then preferences, facts, contradictions, procedures, and "fixes the stale entry at the source, never appends the new version alongside the old"; Codex phase-1 extraction and phase-2 consolidation; Gemini a skill-extraction agent), plus a pre-compaction flush of durable facts (OpenClaw). Corrections are write triggers: Letta names "I already told you that" as one; OpenClaw's rule is "no hidden state", the owner edits the Markdown. Provenance is a column the model cannot write (OpenClaw `owner | agent | untrusted | system`).

**Two things to avoid.** Memory edits that only take effect on the next recompile (Letta needed a `<memory_update>` injection to cover the gap); and letting a background job pollute memory with its own probe output (OpenClaw excludes cron and heartbeat sessions from durable candidates, which is exactly the 119 self-written offer rows that crowded Corner's ledger on 2026-09-14).

**For Corner.** The shape already exists on disk and needs the tiers made explicit: standing facts per project are core files with a description; the day journal is deferred dated files under an index; the ledger is the log. The 15-minute story pass becomes the reflection pass with mistakes-first extraction. The dump is a write trigger. An edit lands in the pack before the next call in the same session. Gauntlet and test threads never write to core (provenance).

## 4. Order of operations for approvals: a decision stack, scoped answers, persisted rules, no dead ends

This is the strongest convergence in the study and the direct answer to "never send is a horrible rule".

**Shared pattern, in the order every harness runs it:**
1. **The tool declares what the human must see.** Gemini's `ToolCallConfirmationDetails` union (a diff, a command, server + args, a question); the SDK's `title` ("Claude wants to read foo.txt") and `display_name`; Goose's `ToolConfirmation { tool_name, arguments, prompt }`; OpenHands forces a 10-word `summary` and a risk field into every non-read-only tool schema.
2. **A decision function runs before any ask.** Goose: user rule → the tool's `read_only_hint` → a cached one-shot judge → default ask, returning `{approved, needs_approval, denied}`. Cursor: allowlist → sandbox → a classifier steered by owner-written allow and block instructions → ask the human last, with the classifier told to "try a different approach" first. Claude Code: mode → `allow` / `deny` / `ask` lists → a PreToolUse hook → `auto` classifier. Codex: PermissionRequest hooks → Guardian reviewer → user. Gemini: hook → TOML policy with priority bands (default < extension < workspace < user < admin) → confirm. Roo: one function returning `approve | deny | ask | timeout`. Letta: a ten-step checker with an unbypassable memory guard at step 0.
3. **Answers carry a scope, and "always" persists as a rule.** Gemini `ProceedOnce / ProceedAlways (session) / ProceedAlwaysAndSave` with labels "Allow once", "Allow for this session", "Allow for this file in all future sessions", "No, suggest changes"; Goose `AlwaysAllow / AllowOnce / Cancel / DenyOnce / AlwaysDeny`, the Always answers written back as rules; Codex `Approved / ApprovedForSession / Denied { rejection }`; the SDK's `updated_permissions` with a destination (session, project, user); OpenClaw `allow-once / allow-always / deny` minting an allowlist row bound to the binary's hash.
4. **A denial goes back to the model as a tool result with the reason.** Goose `DECLINED_RESPONSE`; SDK `deny(message)`; Cline `TOOL_REJECTION_SUFFIX`; OpenClaw's reviewer returns a reason "so the agent picks a safer route"; Gemini's cancel button reads "No, suggest changes", turning a refusal into instructions.
5. **The ask is an item in the same stream, awaited on a channel that survives reconnect.** Goose yields the confirmation as a message marked user-only (the model never sees it); Cline brokers `approval.requested / approval.resolved` on the hub so any attached client can answer; OpenClaw registers a two-phase approval with a stable id, delivers a native card to the origin chat or the approver's DM, accepts `/approve <id> allow|always|deny` as text fallback, and pauses the run's time budget while waiting; OpenHands makes `WAITING_FOR_CONFIRMATION` a status, and accept is simply "run again".
6. **Unattended has a defined default.** Cursor auto-rejects on a countdown; Roo picks the first suggestion on timeout; OpenClaw's `ask_user` defaults to 900 s then "continue with best judgment", and a closed turn invalidates its pending approval; Codex has `TimedOut` as an answer.

**Three things to avoid, each from a harness that learned it.** Do not let the model grade its own risk as the gate (OpenHands' default analyzer returns the model's self-reported risk with confirmation off by default); the tier comes from the tool's annotation or the owner's rule. Do not offer to remove the last rung for external sends (Cursor's CLI "offers to persist Run Everything after repeated use" and calls its own allowlist "best effort"). Do not build the matrix (Codex's approval × sandbox × granular × execpolicy × Guardian × hooks is ~2,000 lines; Corner has no shell, its risky verbs are send and spend, and three answers suffice).

**For Corner: how "send" works.** `send_email` (and later pay, delete, post) exists as a tool, annotated destructive, default tier **ask**. The ask shows the draft and the recipient as the details. The answers are "send", "always for replies to this thread / this recipient", "not this one, here is why". The always answer is a rule per recipient or per account that the owner can see and remove. A "no" returns the reason to the model, which continues ("left as a draft on your stage"). Reads never ask. Drafts and internal edits (facts, journal, drawer) run under allow with a reversal in the action log. A pending ask survives the phone reconnecting, expires with the turn, and never blocks the rest of the turn where the tool allows it (Cursor's questions are non-blocking). Nothing in the harness says "never".

## 5. Steps and events to the UI: one server-owned stream the phone renders

**Shared pattern.**
- **One small typed vocabulary, decoupled from internals.** Codex collapses ~80 internal events to eight JSONL line types over typed items with a `status` (`thread.started`, `turn.started/completed/failed`, `item.started/updated/completed`, `error`; items: message, command, tool call, file change, todo list). Cline's `ClineMessage { ts, ask | say, text, partial }` with `ts` as identity and partial upsert. Goose's `AgentEvent::Message` of content blocks. OpenHands' append-only `Event` log with `parent_id`. Gemini's 18-type union with a pre-built `display` before anything runs.
- **The loop runs on the server; the client renders.** Gemini's own lesson: its React hook re-submits tool results and owns continuation across ~2,300 lines, so every non-terminal client must reimplement the loop. OpenHands: the UI and the LLM context are both projections of the same log.
- **Every tool call is a row before it runs, with a human caption.** OpenHands' forced `summary`; Gemini's `display`; Cline's tool row before execution; Codex `item.started`.
- **Status is pushed on the same stream.** OpenHands `ConversationStateUpdateEvent(key="execution_status")` "so the UI never polls"; Cline's authoritative turn phase `streaming | completed | awaiting_followup | error | resumable`; OpenClaw lifecycle `start | finishing | end | error | waiting-approval`.
- **A failed run ends with a retryable row, never a stuck spinner** (Cline: `ask:api_req_failed` is always the last row). **Text streams as deltas with a pre-minted id** so the durable message replaces the live slot (OpenHands). **Reconnect replays** (`resend since`, Cline hub attach, Letta protocol v2 snapshots).
- **Stalls have named states and a heartbeat.** OpenClaw republishes `busy` every 60 s, classifies `session.long_running` after 2 min with no progress and `session.stalled`, and aborts at a bound; Codex reconnects after 300 s idle up to five times and reconciles unfinished items at turn end.
- **A question is an item, not an error.** Codex's `RequestUserInput` shape (1–3 questions, 2–3 options, recommended first, header ≤ 12 chars, client adds "Other"); its headless mode rejects questions outright, which the brief names as the thing not to copy.
- **Progress over a chat channel.** OpenClaw edits one message: a status headline, plan steps (done / current / pending), tool rows and approval requests, created 1.5 s after real work starts and replaced by the answer; when the main model is quiet a cheap model narrates (≥ 12 s apart, ≤ 280 chars, ≤ 30 per turn); slow tools emit typed progress after 5 s; typing indicators on enqueue.

**For Corner.** The Convex thread is the append-only log; run status, heartbeat and pending asks are events on it; the phone's ticker, the active-rooms strip and the needs-you badge are projections. Reply binding is the item's parent id. Item lifecycle per Codex plus a question item. The v2 turn machine (working → quiet → stalled → offline) reads named states from the stream instead of a local clock. The active-rooms strip is OpenClaw's edited progress message.

## 6. Model portability: identical loop, tools, prompt sections and memory; per-model wire only

**Shared pattern.** What stays identical across models everywhere: the loop, the tool schemas, the prompt sections, memory, permissions, compaction. What is per model: wire format, context window, tool-call format (native vs XML or prompt-mocked: Roo, Goose `toolshim`, OpenHands `non_native_fc`), thinking quirks, error classes. Provider registries are the norm (Cline 200+ ids over the Vercel AI SDK; Goose ~50 plus ACP agents as providers; OpenClaw ~60 provider plugins; OpenHands litellm with a `ModelFeatures` registry and the rule "policy: never in llm.py"; Letta `pi-ai` with a forbidden-fixups boundary). Per-model prompt differences are limited to named sections (OpenClaw allows a provider to replace exactly three). Switching mid-session is universal (`/model`); fallback chains are turn-local and never persisted as the selection (OpenClaw).

**Two shapes for "a CLI as the model", both established.** (A) The harness owns the loop and uses the CLI only as a token source (OpenClaw's `extensions/anthropic/cli-backend.ts` reuses a local Claude login; Cline and Goose run their own loops over providers). (B) The harness delegates the loop to the CLI agent and treats it as a provider that manages its own context (Goose's ACP providers for Claude Code and Codex, which skip Goose's compaction; the Claude Agent SDK). Patrik's working hypothesis is (B). The field mostly runs (A). This is the first cage, not a decision.

**For Corner.** The Swap station is runnable once the hands are MCP and the contract is one file: run the same prompts per pin and diff action logs and steps, not wording (Cline's `tool_used` and Claude's plugin-eval `tool_order` graders are the judge).

## 7. The feel: structures that make a normal model feel smarter than it is

Cross-exemplar, with the file that does it:
- **Orientation every turn, without being asked.** A turn-context block with time, remaining budget, environment and what changed since the model last looked (Goose `moim.rs`; Codex time reminder and world-state diff; Roo `environment_details`; Codex "as the budget gets low, become more direct").
- **Recall by trigger, zero model calls.** OpenClaw injects at most three curated memory entries whose trigger phrases score ≥ 0.72 against the message; OpenHands appends keyword- and path-triggered skills; Gemini loads a directory's context when a tool touches it; Letta's first turn lists recent and relevant prior conversations.
- **Act, and arrange the follow-through.** OpenClaw's Execution Bias ("act now… no plan-only finish when tools can act… final claim needs evidence or named blocker") and Promised Work ("before ending a turn, arrange an available completion or watch path"); Letta and OpenClaw: never promise future work without creating a cron; standing intents matched by prefilter on every turn (OpenClaw); Cline's agenda store of follow-ups awaiting approval.
- **Keep going when the model stops short.** Gemini's next-speaker check auto-sends "Please continue"; Stop hooks that refuse a premature finish (OpenHands, Letta, Codex, Cursor); OpenHands' critic re-runs a task below threshold.
- **Show the work as items.** A live plan item (Codex `update_plan`, "at most one step in progress"; Cursor's to-do; Gemini `write_todos`; OpenClaw `progress_card`); every tool call a captioned row; narration by a cheap model when quiet (OpenClaw); spinner text from MCP progress (Goose).
- **Never dead-end.** Errors as tool results the model reads; deny with a reason; one nudge before stuck; compaction instead of "context full"; partial results named on timeout; a vision tool offered instead of failing on an image (OpenHands); the cancel button that reads "No, suggest changes" (Gemini).
- **One good question.** Forced shape: one to three questions, two to four options, recommended first, "Other" always, never "shall I proceed" (Codex, OpenClaw, Cline, Letta, Gemini); non-blocking where possible (Cursor).
- **Continuity.** Consolidation between sessions (dreaming, reflection) with mistakes first; "last run three days ago"; frustration phrases as write triggers; identity edited incrementally (Letta "avoid complete loss of self").

## 8. What this does to the earlier draft (the hypotheses, judged)

| Hypothesis in the first plan | Study verdict |
|---|---|
| Hands as a registry with rules in code | **Confirmed**, as one MCP server with `readOnlyHint` / `destructiveHint`; rules become the approval stack (§4) and provenance (§3), not a "no send tool" |
| The model's own CLI owns the loop | **Open**: both shapes exist (§6); Cage 1 |
| A step per tool call, emitted at execution | **Confirmed** (OpenHands `summary`, Gemini `display`, Codex items) |
| Pack shrink; the model fetches the rest | **Adapted**: budgeted core tier plus trigger injection (§3, §7), not fetch-only |
| Heartbeat and liveness on the phone | **Confirmed**, as status events pushed on the stream and named stall states (§5) |
| Reply binding by user-block id | **Confirmed**: parent ids on items (§5) |
| `ask_user` ends the loop | **Replaced**: a question item with a timeout default, non-blocking where the tool allows (§4, §5) |
| "Never send"; ack-claim gates | **Replaced** by the tiered send tool and harness-generated acks from tool results (§4) |
| Regex intent chain, `tool_intent.py` classifier | **Dropped**: the skills catalog plus model tool choice is the router (§2) |
| Fold mid-turn asks (newest wins) | **Replaced** by steer (§1) |

## 9. Adopt as is, adapt, avoid

**Adopt as is (with the source to read first).**
1. Skills catalog: `SKILL.md` by description, lazy read, requirement gating, budget (OpenClaw `src/agents/system-prompt.ts:268-275`, `skill-prompt-limits.ts`).
2. Hands as one MCP server; tool annotations drive tiers (Goose `extension_manager`, SDK `create_sdk_mcp_server`).
3. Approval stack + scoped answers + persisted rules + deny-with-reason (Goose `permission/permission_inspector.rs:150-205`, `agents/tool_execution.rs:149-240`; Gemini `tools/tools.ts:986-1114`, `scheduler/scheduler.ts:612-717`; SDK `_internal/query.py:484-536`).
4. Item lifecycle + question item (Codex `exec/src/exec_events.rs:8-133`, `protocol/src/request_user_input.rs:9-71`).
5. Append-only log with status on the stream; UI as projection (OpenHands `conversation/state.py:48-79`, `event/conversation_state.py`).
6. Three-tier memory with a memory tool and a mistakes-first reflection pass (Letta `system-prompt-compilation.ts`, `tools/descriptions/MemoryV2.md`, `subagents/builtin/reflection-v2.md`); dreaming and provenance (OpenClaw `extensions/memory-core`).
7. Chat-channel progress: one edited message with plan, tool rows, narration (OpenClaw `channels/progress-draft-compositor.ts`, `auto-reply/reply/progress-narrator.ts`).
8. Standing intents and "create a cron instead of promising" (OpenClaw `standing-intents-tool.ts`; Letta `scheduled-task-prompt.ts`).
9. Failed run ends with a retryable row; approvals brokered as events any client can answer (Cline `message-translator.ts:1943-1965`, `hub/.../approval-handlers.ts:38-58`).
10. Ordered operations list as the loop (Goose `agents/state_machine/mod.rs`; Codex `session/turn.rs:163-785`).
11. Judges: `tool_used` / `tool_order` graders (Claude plugin eval), OpenClaw's Personal Agent Benchmark Pack (reminder round-trip, preference recall, approval-denial stop, task status honesty, no fake progress, failure recovery) as the hands station, Gemini's answer-vs-act evals, Cline's pass@k.

**Adapt for an owner on a phone.** No shell, no sandbox: collapse the approval matrix to three answers plus "always". No file checkpoints: the action log with reversals for drawer actions, git for memory (Letta), and the tier for sends because there is no undo for a sent email. Unattended by default: timeouts resolve to the safe answer and the turn continues. Loop server-side, phone renders only. Budgets small and explicit.

**Avoid.** A time-only budget (OpenClaw). Loop-with-flags (Goose). Model-graded risk as the gate (OpenHands). A persisted "run everything" for sends (Cursor). Loading a repo's hooks and plugins into a chat turn (Claude Code, the 159 s). Memory edits that wait for the next recompile (Letta). Headless rejection of questions (Codex). A UI-owned loop (Gemini). `unrestricted` as the default mode for an agent that can send (Letta).

## 10. The cages this study sets up (replacing the earlier list)

Each with the house format: two named contenders, one automated fair test, keep the winner, delete the loser, max three rounds. The shared fixture is built first and is not a contender: the hands MCP server, the approval stack, the item stream, the skills catalog, the gauntlet's hands station.

1. **Loop owner.** A "harness loop, CLI as token source" (OpenClaw / Cline shape; Muse and Claude CLIs as providers, if Muse exposes a completion mode with tool schemas: spike 0) vs B "CLI agent owns the loop, hands via MCP, harness watches the stream" (Goose ACP / SDK shape, Patrik's hypothesis). Test: 16-prompt gauntlet + hands station + Swap station (identical action logs on Muse and Claude), step fidelity on the phone, reconnect mid-turn.
2. **Mid-turn messages.** Steer (inject between tool batches) vs queue in order. Fold-and-drop is out. Test: a three-message burst; every ask answered under its own question.
3. **Progress on the phone.** One edited progress item (plan + tool rows + narration) vs per-step rows in the thread. Test: the phone walk plus "no fake progress" and "task status honesty" scenarios.
4. **Recall.** Trigger injection of ≤ 3 curated facts with zero model calls vs fetch-by-tool only. Test: preference-recall and "what did Ross say" prompts, grounded score, latency to first step.
5. **The voice.** Gemini's two payloads per tool result (`llmContent` for the model, `returnDisplay` for the human) suggests the shape: A short bubble with long output to the stage as a document vs B document-shaped bubbles. Test: `format_fits_ask` across the set plus the phone walk.

## 11. Open items for Patrik

- Prune or add exemplars before Phase 1 (Cursor is docs-only here; OpenAI's Agents SDK, Anthropic's Managed Agents and LangGraph were not read).
- Say what "kick ass" means in checkable terms for the judge: the OpenClaw benchmark pack is the closest existing list; pick the ten scenarios that would make you trust it with your day.
- Which sends get a standing "always" tier from day one (replies within a thread? a named client?), and which never do (new recipients, money).
