// POST /api/dashboard/task-message
//
// corner:task-rooms R3: mid-flight chat. Patrik (or any cross-tenant viewer)
// sends a message inside a task room; the row lands in the task's room
// (<world>:agent:task:<id>) tagged with metadata.task_id so the dashboard task
// drawer renders it and the sub-agent's inbox poll discovers it.
//
// R4 (post-completion follow-up): when the target task is terminal and the
// caller flags terminal=true, a fresh task is queued with the prior transcript
// and this message as the brief.
//
// Body: { task_id, text, client_id?, role?, terminal? }
//   task_id   (required) uuid of the target task.
//   text      (required) message body.
//   client_id (optional) viewer's world.
//   role      (optional) 'user' (default) or 'assistant' for sub-agent replies.
//
// Returns: { ok: true, message, task_status, followup } on success.
//
// Backend: Convex tasks:get + messages:send + tasks:queue
// (corner:retire-supabase R2, 2026-09-03).
//
// World gate: this endpoint can mint a queued task that copies the target
// task's project and repo and embeds the caller's text in the brief, so the
// caller must reach the world that owns the task (verifyTenant on the row's
// own client_id), or hold a grant on the task's project.

import { extractJwt, verifyTenant, callerIdentity, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null)

// Optional write key for the gated script-facing mutations (tasks:queue).
// Unset on dev today; JSON drops an undefined field.
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const jwt = extractJwt(req)
  if (!jwt) return res.status(401).json({ error: 'jwt required' })

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const taskId = String(body.task_id || '').trim()
  const text = String(body.text || '').trim()
  if (!taskId) return res.status(400).json({ error: 'task_id required' })
  if (!text) return res.status(400).json({ error: 'text required' })
  const clientId = (String(body.client_id || '').trim() || '').toLowerCase()
  const role = body.role === 'assistant' ? 'assistant' : 'user'

  // Load the task row so the message carries its agent + status.
  let taskRow = null
  try {
    taskRow = await convexQuery('tasks:get', { id: taskId })
  } catch {
    // Fall through with a thin metadata payload.
  }

  const agent = taskRow?.agent_identity || taskRow?.agent || `task:${taskId}`
  const taskStatus = taskRow?.status || null
  const taskClientId = String(taskRow?.client_id || clientId || '').toLowerCase()
  if (!taskClientId) return res.status(400).json({ error: 'client_id required when the task is unknown' })

  // World gate on the world that owns the task. A world holding a grant on the
  // task's project is admitted too.
  const identity = await callerIdentity(req).catch(() => null)
  try {
    await verifyTenant(taskClientId, req)
  } catch (err) {
    if (!(err instanceof TenantAuthError)) throw err
    let grantOk = false
    if (taskRow?.project && identity?.world) {
      const access = await convexQuery('projects:hasAccess', { slug: taskRow.project, worldId: identity.world }).catch(() => null)
      grantOk = !!access?.ok
    }
    if (!grantOk) {
      return res.status(err.status).json({
        error: `forbidden: this task belongs to world "${taskClientId}" and your session cannot reach it${taskRow?.project ? ` or its project "${taskRow.project}"` : ''}`,
      })
    }
  }

  const roomId = `${taskClientId}:agent:task:${taskId}`
  const metadata = {
    task_id: taskId,
    task_agent: agent,
    task_status: taskStatus,
    sender_client_id: clientId,
  }

  try {
    const messageId = await convexMutation('messages:send', {
      roomId,
      text,
      role,
      source: 'task-room',
      clientId: taskClientId,
      userId: role === 'user' && identity?.userId ? String(identity.userId) : undefined,
      userEmail: role === 'user' ? (identity?.email || undefined) : undefined,
      userName: role === 'user' ? (identity?.userName || undefined) : undefined,
      agentSlug: role === 'assistant' ? String(agent).split(':')[0] : undefined,
      metadata,
    })
    // messages:send does not keep the metadata bag. task_id is how the task
    // drawer and the sub-agent inbox poll find this row, so it is a second
    // write; a failure here must not lose the message that already landed.
    await convexMutation('messages:patchMetadata', { messageId: String(messageId), patch: metadata })
      .catch((err) => console.warn('[task-message] patchMetadata failed (ignored):', err?.message || err))
    const now = new Date().toISOString()
    const row = {
      id: String(messageId),
      agent: `task:${taskId}`,
      text,
      role,
      source: 'task-room',
      client_id: taskClientId,
      room_id: roomId,
      timestamp: now,
      metadata,
    }

    // R4: post-completion follow-up. When the original task is terminal and
    // the caller flagged terminal=true, queue a fresh task with the prior
    // transcript + this message as the brief.
    const terminalRequested = body.terminal === true
    const isTerminal = taskStatus === 'done' || taskStatus === 'failed'
    let followup = null
    if (terminalRequested && isTerminal && taskRow) {
      try {
        const thread = await convexQuery('messages:getThread', { roomId, limit: 60 }).catch(() => [])
        const transcriptText = (Array.isArray(thread) ? thread : [])
          .map((m) => `[${String(iso(m.createdAt) || '').slice(0, 19)}] ${m.role || (m.agentSlug ? 'assistant' : 'user')}: ${m.text || ''}`)
          .join('\n')
        const followupBody = [
          `# Follow-up on task ${taskId}`,
          ``,
          `## Original task`,
          ``,
          `**Title:** ${taskRow.title || ''}`,
          ``,
          `**Original brief:**`,
          ``,
          taskRow.text || taskRow.title || '(no brief)',
          ``,
          `## Prior transcript`,
          ``,
          transcriptText || '(no prior messages)',
          ``,
          `## New ask`,
          ``,
          text,
          ``,
          `---`,
          `## Continuity contract`,
          `- Treat the prior transcript as authoritative context.`,
          `- The new ask is a follow-up, not a fresh start. Acknowledge what the prior agent already did before adding new work.`,
          `- Finalize with task-complete.sh on THIS task id (the followup row), not the original.`,
        ].join('\n')
        followup = await convexMutation('tasks:queue', {
          key: CONVEX_KEY,
          row: {
            title: `[followup] ${(taskRow.title || '').slice(0, 90)}`,
            text: followupBody,
            description: followupBody,
            status: 'queued',
            source: 'task-room-followup',
            client_id: taskClientId,
            project: taskRow.project || null,
            project_path: taskRow.project_path || null,
            priority: 100,
            agent: taskRow.agent || undefined,
            agent_identity: taskRow.agent_identity || undefined,
            metadata: {
              ...(taskRow.metadata && typeof taskRow.metadata === 'object' ? taskRow.metadata : {}),
              followup_of: taskId,
              followup_message_id: row.id,
              mission_slug: (taskRow.metadata && taskRow.metadata.mission_slug) || null,
            },
          },
        })
      } catch (followupErr) {
        // Best effort. The user's message already landed.
        followup = { error: followupErr?.message || 'followup enqueue failed' }
      }
    }

    return res.status(200).json({ ok: true, message: row, task_status: taskStatus, followup })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'insert failed' })
  }
}
