# <Exemplar> — structural brief

**Repo / source:** <url> at <commit or docs date> · **Read on:** 2026-09-17 · **Reader:** <agent>
**One line:** what it is and who it is for.
**Why it is in the study:** the one thing Corner should learn from it.

Rules for this brief: structure over opinion. Every claim cites a file path (or a docs URL for closed products) and, where it helps, a short excerpt. Say "not found" rather than guess. Six sections, same order in every brief, so PATTERN.md can be built row by row.

## 1. The loop
How a turn runs from the user's message to the reply. Who decides the next action (the model, a planner, a router). Budgets (steps, tokens, time) and what happens when they run out. How a turn ends. Multi-turn: what carries from one turn to the next inside a session.

## 2. Skills and tools
How capabilities are declared (tool schemas, skill files, MCP, plugins). How they are discovered and loaded into a turn (all up front, lazily, by trigger). How the agent picks one. How a tool result gets back to the model. Any distinction between "skills" (procedures) and "tools" (calls).

## 3. Memory
What persists across turns, sessions and machines. What is loaded up front vs. fetched on demand. Files, databases, summaries, "memory files". How corrections land. Anything like a journal or a ledger of what was done.

## 4. Order of operations and approvals
The sequence the agent is set up to follow (gather, plan, act, verify, report, or whatever it actually is). Approval tiers: what runs on its own, what asks once, what always asks. How a "send" or a destructive action is handled. Checkpoints, undo, rollback. How the user loosens or tightens the tiers (modes, allowlists, rules files).

## 5. Steps and events to the UI
The event stream shape (what a step, a tool call, a message, a question look like on the wire). How progress renders while the model works. How a stalled, timed-out or dead run is surfaced. Streaming of text vs. steps.

## 6. Model portability
How the model is abstracted (provider layer, adapter, gateway). What stays identical across models (prompts, tools, loop). What is per-model (tool-call format, context limits, quirks). How a user switches.

## 7. How they know it is good
Their evals, benchmarks, dogfooding, or telemetry. What they measure.

## 8. The feel: what the harness does so a normal model feels smarter than it is
Patrik, 2026-09-17: "we can't make the LLMs give us AGI level thinking but we can guide it for the user's sake towards an AGI feeling experience the way we create our app." List the structures, not prompts, that produce that feeling here: anticipating the next step, recalling the right thing unasked, showing the work while it runs, never dead-ending (a partial result and an offer instead of silence or a refusal), asking one good question instead of guessing, continuity across sessions. For each, the file path and how it works.

## 9. The one thing to copy outright
One structure, with the file path, that Corner should adopt as is. And one thing to avoid, with why.
