# Convex multi-agent room patterns

## Executive summary

The strongest pattern is to persist the user message in a mutation and schedule
an internal action or durable workflow in the same transaction. The action reads
the authoritative room/thread context, chooses a bounded roster, runs specialists,
and writes each reply back through a mutation. Reactive clients then update from
the same rows without a second message store or polling bridge.

## What established implementations do

1. Convex's Agent guidance saves a prompt message transactionally, then calls
   `ctx.scheduler.runAfter(0, ...)` to generate the response outside the mutation.
2. Convex workflows add retryable, idempotent steps and bounded parallel fan-out.
3. Multi-agent examples share one durable thread while routing or handing work to
   specialists based on structured decisions and available context.
4. Recent team-room projects such as Commonly and Agent Room use resident agents
   that consume room events from a durable cursor and post replies to that room.
   Their transport differs, but the useful invariant is the same: one event log,
   explicit cursor/idempotency, and agents that contribute only when relevant.

## Recommendation for Corner

- Keep `messages.sendMessage` as the atomic ingress and schedule one dispatch job
  with the new message ID.
- Make the dispatcher idempotent by recording the source message and selected
  roster before execution.
- Route a maximum of three agents using explicit mentions, the room specialist,
  and a structured relevance decision over room/thread context.
- Execute agents through server actions, not inside a database mutation.
- Persist typing/turn states and final replies in Convex; web uses subscriptions,
  while the raw-HTTP iOS client reconciles only against Convex.
- Remove canned response text from the production fallback. A provider failure is
  an explicit failed turn, not a fabricated specialist answer.

## Sources

- Convex Agent usage: https://docs.convex.dev/agents/agent-usage
- Convex Agent overview: https://docs.convex.dev/agents/overview
- Convex Agent workflows: https://docs.convex.dev/agents/workflows
- Convex scheduled functions: https://docs.convex.dev/scheduling/scheduled-functions
- Convex Workflow component: https://github.com/get-convex/workflow
- Commonly team rooms: https://github.com/Team-Commonly/commonly
- Agent Room: https://github.com/agent-room-alkl/agent-room

