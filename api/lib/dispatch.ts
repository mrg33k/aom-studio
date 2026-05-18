/**
 * dispatch.ts — R-SDK-1 deliverable, ported to aom-studio (R-SDK-1.5)
 *
 * The single dispatch() helper that retires task-runner.sh + dispatch-to-studio.py
 * + queue-task.py + write_brief. One call → one Managed Agents session in
 * background → one audit row written to Supabase → one dispatch_id returned.
 *
 * Uses Claude Managed Agents API (beta header managed-agents-2026-04-01) per
 * the Thariq move (corner:sdk-native-dispatch research §3.5 Q3).
 *
 * Mission: corner:sdk-native-dispatch
 * Source-of-truth copy: corner/missions/sdk-native-dispatch/code/dispatch.ts
 * (in AOM-EA — the research/design home). This file IS the production copy.
 *
 * Status: code complete, NOT smoke-tested against live infra yet. Smoke
 * test in R-SDK-2 by wiring Studio's DISPATCH inbox to call this helper.
 *
 * Dependencies (add to aom-studio/package.json):
 *   "@anthropic-ai/sdk": current with beta.agents/environments/sessions support
 *   "@supabase/supabase-js": existing
 *
 * Env vars expected:
 *   ANTHROPIC_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DispatchArgs {
  /** The full brief content. Per .claude/rules/sub-agent-context-pass.md:
   *  carries verbatim user ask + pre-Read file content + expected output shape
   *  + escape hatch. NO defensive framing (priming-hallucination memory). */
  prompt: string;

  /** Agent identity. "claude" (default catch-all) or specific
   *  ("bobby" for frontend, "cleo" for video, "steffen" for brand, etc.) */
  agentName?: string;

  /** Model to use. Default opus per studio-dispatch-protocol.md. */
  model?: string;

  /** Mission slug for the audit row (e.g. "corner:mission-panel"). */
  missionSlug?: string;

  /** Project slug for the audit row. */
  projectSlug?: string;

  /** Title for the session (shown in audit + dashboard). */
  title: string;

  /** System prompt override. Defaults to a minimal prompt with the
   *  verify-before-done contract per Patrik SDK Q4-A. */
  system?: string;
}

export interface DispatchResult {
  /** Supabase tasks-row id (audit table). */
  dispatchId: string;

  /** Managed Agents session id (for streaming events). */
  sessionId: string;

  /** AsyncIterable of session events. */
  stream: AsyncIterable<unknown>;
}

// ─── Defaults ──────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-opus-4-7";

const DEFAULT_SYSTEM = `You are a sub-agent dispatched to complete a specific task.

Read the prompt below carefully. Verify your work before claiming complete:
- For frontend changes: use Chrome MCP to navigate the live page, take a
  screenshot, capture console output. Describe what you observed.
- For API endpoints: curl the endpoint, paste the response.
- For scripts: run the script with realistic inputs, show output.
- For database changes: query the affected table, confirm the row state.

Return your work as the natural session result. Include a one-line
summary of what you did and where to see it.

If the task is structurally impossible or you need information not
provided, return early with a clear explanation of what's missing.
# Merging your work (double dutch)

You are running inside an isolated git worktree on your own branch. When
your work is verified and ready to ship:

1. Commit your changes locally on your worktree branch.
2. Watch the commit log on the base branch you'll merge into (usually
   main). Run \`git log --oneline -5 main\` and re-check every few seconds.
3. If another sub-agent is mid-merge (recent commits within the last ~10
   seconds, or you see an uncommon push velocity), wait. Don't push.
4. When the base branch is quiet, switch in, rebase or merge cleanly,
   and push. Then return to your worktree.
5. If your push is rejected because someone else pushed first, pull,
   rebase, re-verify your work still applies, and push again.

Active, polite, no central queue. Like double dutch jump rope: every
sub-agent is the merger, watching the rope, jumping in on a clear beat.
`;

// ─── The helper ────────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultHeaders: { "anthropic-beta": "managed-agents-2026-04-01" },
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function dispatch(args: DispatchArgs): Promise<DispatchResult> {
  const { data: auditRow, error: auditErr } = await supabase
    .from("tasks")
    .insert({
      title: args.title,
      status: "queued",
      agent: args.agentName ?? "claude",
      metadata: {
        project: args.projectSlug,
        mission_slug: args.missionSlug,
        model: args.model ?? DEFAULT_MODEL,
        source: "sdk-managed-agents",
      },
    })
    .select("id")
    .single();

  if (auditErr || !auditRow) {
    throw new Error(`dispatch: audit row insert failed: ${auditErr?.message}`);
  }

  const dispatchId = auditRow.id;

  const agent = await anthropic.beta.agents.create({
    name: args.agentName ?? "claude",
    model: args.model ?? DEFAULT_MODEL,
    system: args.system ?? DEFAULT_SYSTEM,
  });

  const environment = await anthropic.beta.environments.create({
    name: `dispatch-${dispatchId}`,
    config: { language: "en" },
  });

  const session = await anthropic.beta.sessions.create({
    agent: agent.id,
    environment_id: environment.id,
    title: args.title,
  });

  await supabase
    .from("tasks")
    .update({
      status: "running",
      metadata_partial: { session_id: session.id, agent_id: agent.id },
    })
    .eq("id", dispatchId);

  await anthropic.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: args.prompt }],
      },
    ],
  });

  const stream = await anthropic.beta.sessions.events.stream(session.id);

  void watchSessionForAudit(dispatchId, stream);

  return { dispatchId, sessionId: session.id, stream };
}

// ─── Background audit watcher ──────────────────────────────────────────────

async function watchSessionForAudit(
  dispatchId: string,
  stream: AsyncIterable<unknown>,
) {
  let lastAgentMessage = "";
  let lastError: string | null = null;

  try {
    for await (const event of stream as AsyncIterable<{
      type: string;
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    }>) {
      if (event.type === "agent.message") {
        lastAgentMessage = event.content?.[0]?.text ?? lastAgentMessage;
      } else if (event.type === "agent.error") {
        lastError = event.error?.message ?? "unknown error";
      } else if (event.type === "session.status_idle") {
        await supabase
          .from("tasks")
          .update({
            status: lastError ? "failed" : "done",
            metadata_partial: {
              result_text: lastAgentMessage,
              error: lastError,
            },
          })
          .eq("id", dispatchId);
        return;
      }
    }
  } catch (err) {
    await supabase
      .from("tasks")
      .update({
        status: "failed",
        metadata_partial: {
          result_text: lastAgentMessage,
          error: err instanceof Error ? err.message : String(err),
        },
      })
      .eq("id", dispatchId);
  }
}
