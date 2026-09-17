# Cursor — structural brief

**Repo / source:** https://cursor.com/docs and https://cursor.com/changelog (closed source; latest entry 2026-09-10 "Projects") · **Read on:** 2026-09-17 · **Reader:** Claude (corner:corner-v2 R82)
**One line:** AI code editor plus CLI and cloud agents for developers; the same agent runs locally under approvals or in a cloud VM without them.
**Why it is in the study:** Patrik named it for approvals. Cursor's run-mode ladder (allowlist → sandbox → classifier subagent → ask the human) is the most worked-out "order of operations for the agent" in the set.

Access note: cursor.com is egress-blocked in this session, so claims come from official-page excerpts returned by search restricted to cursor.com / docs.cursor.com; gaps are marked "not documented".

## 1. The loop
- Model-driven: "Agent autonomously explores your codebase, edits multiple files, runs commands, and fixes errors" (https://cursor.com/docs/agent/overview). Nothing sits between user and model except Plan Mode (§4) and Auto routing (§6).
- Budget: "There is no limit on the number of tool calls" (same page). Context is the only budget: when it fills, Cursor "triggers a summarization step to give the agent a fresh context window with a summary of its work so far"; manual `/summarize` (https://docs.cursor.com/en/agent/chat/summarization).
- Turn end: the model stops; a `stop` hook returning `block` + reason "is treated as an automatic follow-up" (https://cursor.com/docs/hooks).
- Across turns: queued messages "run automatically when the current task finishes" (https://cursor.com/changelog/1-2); CLI `--resume`; conversation search is a tool the agent can call itself (https://cursor.com/changelog/side-chat).

## 2. Skills and tools
- Built-ins: Search, Read (incl. images), Edit, Delete, Shell, Task (subagent), MCP (https://cursor.com/docs/agent/tools). MCP definitions load lazily — "agents discover and load MCPs only when needed", A/B "reduced total agent tokens by 46.9%" (https://cursor.com/blog/dynamic-context-discovery).
- Skills = procedures: `SKILL.md` with `name`/`description` frontmatter in `.cursor/skills/`; the description is "used by agent to determine relevance"; optional `scripts/`, `references/`, `assets/` (https://cursor.com/docs/skills).
- Subagents: markdown in `.cursor/agents/`; "start with a clean context"; "inherit all tools from the parent" (https://cursor.com/docs/subagents).

## 3. Memory
- Rules: `.cursor/rules/*.mdc`, version-controlled, four attach modes — Always (`alwaysApply`), Auto Attached (path globs), Agent Requested (model fetches by description), Manual; `AGENTS.md` at root or nested ("more specific instructions taking precedence"); User rules and Team rules, where "Admins can configure whether or not each rule is required"; `/create-rule` in chat writes the file (https://cursor.com/docs/rules).
- Memories: "automatically generated rules based on your conversations ... scoped to your project", produced by "sidecar observation and tool calls"; on by default; Settings → Rules and Commands (https://docs.cursor.com/context/memories). Approval before a sidecar memory is saved: not documented.
- Cloud automations keep a `MEMORIES.md` "outside the agent's working filesystem" (https://cursor.com/docs/cloud-agent/automations). Projects sync "a set of files ... across every cloud and local machine its agents use ... If one agent figures out how to test a service, every future agent can use those instructions" (https://cursor.com/changelog/projects). Plans persist in `.cursor/plans/` (https://cursor.com/docs/agent/plan-mode).

## 4. Order of operations and approvals
**Sequence.** Cursor recommends Plan → Build → Review → Verify (https://cursor.com/blog/agent-best-practices). Plan Mode makes the first step explicit: the agent "researches your codebase, asks clarifying questions, and generates a reviewable plan you can edit before building"; Shift+Tab, and "Cursor also suggests it automatically when you type keywords that indicate complex tasks" (https://cursor.com/docs/agent/plan-mode). Agent Review (Quick/Deep) "can run automatically after every agent task" (https://cursor.com/docs/agent/agent-review).

**Tiers** (Cursor 3.6+, Settings → Agents → Approvals & Execution; https://cursor.com/docs/agent/security/run-modes, https://cursor.com/changelog/auto-review), applied to Shell, MCP and Fetch calls:
1. Allowlisted calls run immediately.
2. Else, if sandboxable, run in the sandbox (no protected reads, no writes outside approved paths, no arbitrary network); sandboxed agents "only request approval when they need to step outside it ... stopping 40% less often" (https://cursor.com/blog/agent-sandboxing).
3. Else a "classifier subagent ... decides whether to allow the call, try a different approach, or ask for your approval", judging "safety and how well the command matches your request"; the user "can steer the classifier agent by giving it custom instructions" (`autoRun.allow_instructions` / `block_instructions`, https://cursor.com/changelog/sdk-updates-jun-2026).
4. If blocked, "Cursor can try another approach. If the agent decides that the action makes sense despite what the classifier said, Cursor will show you an approval prompt."

Alternatives: Allowlist mode (listed commands only; rest sandboxed or asked) and Run Everything. Cursor calls all of it "best-effort guardrails rather than a hard security boundary" (https://cursor.com/docs/agent/security).

**Always-ask defaults:** every MCP connection, and "each tool call still needs individual approval" until allowlisted; workspace edits are free "except for configuration files which need your approval first"; `.cursorignore` blocks reads (https://cursor.com/docs/agent/security). Declarative lists: `Shell(git)`, `Read(.env*)`, `Write(**/*.key)`, `WebFetch(*.github.com)`, `Mcp(datadog:*)` under `allow`/`deny` (https://cursor.com/docs/cli/reference/permissions). Hooks return `"permission": "allow" | "deny" | "ask"` with `user_message`/`agent_message`; fail-open unless `failClosed: true` (https://cursor.com/docs/hooks). Unattended prompts: "Timed mode-switch approvals ... 15-second countdown and auto-reject when left unattended"; "approval prompts can't be skipped by a stray Enter"; the CLI "offers to persist 'Run Everything' after repeated use" (https://cursor.com/docs/cli/changelog).

**Undo:** Checkpoints are "automatic snapshots of Agent's changes"; hover a message → Restore Checkpoint to "roll back all changes Agent made after that point"; "reverts files only; it does not remove messages"; "stored locally and are separate from git"; "manual edits aren't tracked" (https://cursor.com/docs/agent/chat/checkpoints). Diffs: per-file accept/reject bar plus "Review changes" for the whole run (https://cursor.com/docs/agent/review).

**Cloud:** "The agent auto-runs all terminal commands ... This differs from the foreground agent" — VM isolation and egress controls replace approval (https://cursor.com/docs/cloud-agent/capabilities).

## 5. Steps and events to the UI
- Wire shape (CLI): NDJSON via `--output-format stream-json`: `system/init` (session_id, model, permissionMode), one `assistant` event per complete message "between tool calls", tool events, a final `result`; `--stream-partial-output` adds text deltas (https://cursor.com/docs/cli/reference/output-format). Cloud status is `running | finished | error`; webhooks fire only on `ERROR` or `FINISHED` (https://cursor.com/docs/cloud-agent/api/webhooks).
- Progress: the agent "breaks down longer tasks with dependencies, visible to you in chat ... It can update this list as work progresses" (https://cursor.com/changelog/1-2). "All local and cloud agents appear in the sidebar, including the ones you kick off from mobile, web, desktop, Slack, GitHub, and Linear" (https://cursor.com/docs/agent/agents-window).
- Questions: the ask-question tool "lets agents ask clarifying questions in any conversation. While waiting for your response, the agent can continue reading files, making edits, or running commands" (https://cursor.com/changelog/2-4).
- Stuck runs: terminal commands can be skipped or moved to background (https://cursor.com/docs/agent/tools/terminal); cloud webhooks report only terminal states. A "stalled but alive" signal: not documented.

## 6. Model portability
- One picker across modes; "Auto" routes each request through Cursor Router, so "the specific model can vary between turns" (https://cursor.com/docs/cursor-router). BYO keys for OpenAI/Anthropic/Google (https://cursor.com/help/models-and-usage/api-keys). Subagents take a `model` field.
- Rules, skills, hooks, run modes and checkpoints are model-independent. Per-model tool-call formats: not documented.

## 7. How they know it is good
- CursorBench: "real agent requests from engineers and researchers at Cursor, along with hand-curated optimal solutions", run "exactly as it would execute in the production environment"; measures accuracy plus "completion tokens, end-to-end latency, and inference cost"; refreshed "every few months" (https://cursor.com/blog/cursorbench).
- A/B telemetry on harness changes: the 46.9% token cut (§2) and "40% less often" approval stops (§4).

## 8. The feel: what the harness does so a normal model feels smarter than it is
- Anticipating: Tab "predicts your next editing location and jumps there" (https://cursor.com/help/ai-features/tab); Plan Mode auto-suggested on complex prompts (§4); queued follow-ups (§1).
- Recalling unasked: path-attached rules; Agent-requested rules the model fetches itself; conversation search as a tool; Projects files shared by every agent (§3).
- Showing the work: live to-do list updated mid-run; per-file diff bar; one sidebar with every agent from every surface (§5).
- Never dead-ending: classifier "try a different approach" before asking (§4); non-blocking clarifying questions; `stop`-hook follow-up loops; summarization instead of "context full"; cloud agents "hold a goal until it's met" and "automatically subscribe to PRs they create and drive them to completion, fixing CI and addressing bot comments" (https://cursor.com/changelog/08-19-26).
- One good question: Plan Mode's clarifying questions, in CLI "presented individually with a freeform 'Other' answer option" (https://cursor.com/changelog/2-4).
- Continuity: checkpoints, `.cursor/plans/`, memories, `--resume`, and a Projects coordinator that "brings the finished work back to you to check" (https://cursor.com/changelog/projects).

## 9. The one thing to copy outright
**Copy:** the Auto-review ladder (https://cursor.com/docs/agent/security/run-modes): allowlist → sandbox → classifier with owner-written allow/block instructions → ask, only as the last rung, with the classifier told to "try a different approach" first. For Corner: safe reads run; drafts and internal edits run; a small model checks "does this send / spend / delete match what the owner asked?"; only a mismatch produces a phone prompt, and that prompt auto-rejects on timeout (https://cursor.com/docs/cli/changelog).

**Avoid:** a persisted "Run Everything" that the CLI itself offers "after repeated use" (https://cursor.com/docs/cli/changelog). A tired owner on a phone will accept it; Cursor calls the allowlist "best effort" and says auto-run "introduces data exfiltration risk" (https://cursor.com/docs/cloud-agent/security-network). Corner should never offer to remove the last rung for external sends.
