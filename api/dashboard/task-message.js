// POST /api/dashboard/task-message
//
// corner:task-rooms R3 — mid-flight chat. Patrik (or any cross-tenant viewer)
// sends a message inside a task room; the row lands in `messages` tagged with
// metadata.task_id so:
//   - the dashboard task drawer renders it (R2 dual-query path).
//   - the sub-agent's `scripts/sub-agent-poll-inbox.sh` discovers it between
//     tool boundaries and pauses to respond.
//
// R4 extension (post-completion follow-up) will kick off a fresh sub-agent
// dispatch from this endpoint when the target task is in a terminal state.
// For R3, terminal-state messages just land in `messages` like any other —
// the dashboard renders them, no dispatch fires.
//
// Body: { task_id, text, client_id?, role? }
//   - task_id   (required) — uuid of the target task.
//   - text      (required) — message body.
//   - client_id (optional) — viewer's world. Defaults to 'aom'.
//   - role      (optional) — 'user' (default) so the poll script picks it up.
//                            'assistant' for sub-agent replies (use the
//                            scripts/sub-agent-reply.sh helper instead).
//
// Returns: { ok: true, message: <inserted row> } on success.

import crypto from 'crypto'
import { extractJwt, verifyTenant, verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  // JWT required so the room is never anonymous. Per-room membership is a
  // follow-up; for R3 the floor is "authenticated dashboard user".
  const jwt = extractJwt(req)
  if (!jwt) return res.status(401).json({ error: 'jwt required' })

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const taskId = String(body.task_id || '').trim()
  const text = String(body.text || '').trim()
  if (!taskId) return res.status(400).json({ error: 'task_id required' })
  if (!text) return res.status(400).json({ error: 'text required' })
  const clientId = (String(body.client_id || '').trim() || '').toLowerCase()
  const role = body.role === 'assistant' ? 'assistant' : 'user'

  // Load the task row so we can include its agent + status in the message
  // metadata. This lets the drawer render with context (R4 reads status to
  // decide followup-dispatch vs inbox-append) without a second round trip.
  let taskRow = null
  try {
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?select=id,title,text,agent_identity,agent,status,client_id,project,project_path,metadata&id=eq.${encodeURIComponent(taskId)}&limit=1`,
      { headers: supabaseHeaders() },
    )
    if (sbRes.ok) {
      const rows = await sbRes.json()
      if (Array.isArray(rows) && rows[0]) taskRow = rows[0]
    }
  } catch {
    // If the lookup fails, fall through with a thin metadata payload — the
    // sub-agent poll path doesn't need the agent field, and R4 will re-load
    // the task row inside its dispatch path anyway.
  }

  const agent = taskRow?.agent_identity || taskRow?.agent || `task:${taskId}`
  const taskStatus = taskRow?.status || null
  const taskClientId = taskRow?.client_id || clientId

  // --- WORLD GATE (r7) ------------------------------------------------------
  // Until now the only check on this endpoint was "is there a JWT", and the
  // header comment above still describes that as the floor ("Per-room
  // membership is a follow-up"). It is not a follow-up: with `terminal: true`
  // this endpoint MINTS A QUEUED TASK further down, copying the target task's
  // project, project_path and metadata (including metadata.repo) and embedding
  // the caller's own `text` in the brief under "## New ask". VERIFIED: a
  // karens-world session posted terminal=true against an AOM-owned task id and
  // produced a status='queued' row carrying AOM's project and repo with
  // attacker-authored brief text. Task UUIDs are not secrets — they leak
  // through several read surfaces — so the uuid alone authorized code execution
  // in another world's checkout.
  //
  // Gate on the world that OWNS the task, read off the row (never a body
  // field) — the same shape retry-task.js already uses. When the task carries a
  // project, a world holding a project_access grant on it is admitted too, via
  // verifyProjectAccess: the sharing model says a granted world may work on the
  // project, and refusing them here would be the r2/r3 lockout again, invisible
  // to the super-admin who returns before either check.
  let verifiedTenant = null
  try {
    ({ tenant: verifiedTenant } = await verifyTenant(taskClientId, req))
  } catch (err) {
    if (!(err instanceof TenantAuthError)) throw err
    let grantOk = false
    if (taskRow?.project) {
      try {
        await verifyProjectAccess(taskRow.project, req)
        grantOk = true
      } catch (e2) {
        if (!(e2 instanceof TenantAuthError)) throw e2
      }
    }
    if (!grantOk) {
      return res.status(err.status).json({
        error: `forbidden: this task belongs to world "${taskClientId}" and your session cannot reach it${taskRow?.project ? ` or its project "${taskRow.project}"` : ''}`,
      })
    }
    verifiedTenant = taskClientId
  }

  const payload = {
    id: crypto.randomUUID(),            // messages.id is NOT NULL with no DB default
    agent: `task:${taskId}`,            // back-compat with legacy thread expansion
    text,
    role,
    source: 'task-room',
    client_id: taskClientId,
    timestamp: new Date().toISOString(),
    metadata: {
      task_id: taskId,
      task_agent: agent,
      task_status: taskStatus,
      sender_client_id: clientId,
    },
  }

  try {
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify(payload),
    })
    if (!sbRes.ok) {
      const errBody = await sbRes.text()
      return res.status(sbRes.status).json({ error: errBody })
    }
    const inserted = await sbRes.json()
    const row = Array.isArray(inserted) ? inserted[0] : inserted

    // R4 corner:task-rooms — post-completion follow-up. When the original
    // task is terminal (done|failed) AND the caller flagged terminal=true,
    // enqueue a fresh task row with the prior transcript + this new message
    // re-hydrated as the brief. task-runner picks it up and dispatches a
    // new sub-agent via the same Studio path. No new dispatch script needed.
    const terminalRequested = body.terminal === true
    const isTerminal = taskStatus === 'done' || taskStatus === 'failed'
    let followup = null
    if (terminalRequested && isTerminal && taskRow) {
      try {
        // Pull the prior transcript: both legacy task:<id> rows and the new
        // metadata.task_id rows (R2's dual-query pattern). 60-row cap so a
        // very-chatty task doesn't produce a 200KB brief.
        const [legacyRes, roomRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/messages?select=text,timestamp,role&agent=eq.${encodeURIComponent('task:' + taskId)}&order=timestamp.asc&limit=60`,
            { headers: supabaseHeaders() },
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/messages?select=text,timestamp,role,metadata&metadata->>task_id=eq.${encodeURIComponent(taskId)}&order=timestamp.asc&limit=60`,
            { headers: supabaseHeaders() },
          ),
        ])
        const legacyRows = legacyRes.ok ? await legacyRes.json() : []
        const roomRows = roomRes.ok ? await roomRes.json() : []
        const seen = new Set()
        const transcript = []
        for (const m of [...legacyRows, ...roomRows]) {
          const k = (m.timestamp || '') + '|' + (m.text || '')
          if (seen.has(k)) continue
          seen.add(k)
          transcript.push(m)
        }
        transcript.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
        const transcriptText = transcript
          .map(m => `[${(m.timestamp || '').slice(0, 19)}] ${m.role || '?'}: ${m.text || ''}`)
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
        const followupRow = {
          title: `[followup] ${(taskRow.title || '').slice(0, 90)}`,
          text: followupBody,
          description: followupBody,
          status: 'queued',
          source: 'task-room-followup',
          client_id: taskClientId,
          project: taskRow.project || null,
          project_path: taskRow.project_path || null,
          priority: 100,
          created_at: new Date().toISOString(),
          metadata: {
            ...(taskRow.metadata && typeof taskRow.metadata === 'object' ? taskRow.metadata : {}),
            followup_of: taskId,
            followup_message_id: row?.id || null,
            mission_slug: (taskRow.metadata && taskRow.metadata.mission_slug) || null,
          },
        }
        const fRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
          method: 'POST',
          headers: supabaseHeaders(),
          body: JSON.stringify(followupRow),
        })
        if (fRes.ok) {
          const fJson = await fRes.json()
          followup = Array.isArray(fJson) ? fJson[0] : fJson
        }
      } catch (followupErr) {
        // Follow-up dispatch is best-effort. The user's message still landed
        // in messages; the dashboard renders it. Failure here is reported in
        // the response payload, not by erroring the whole request.
        followup = { error: followupErr?.message || 'followup enqueue failed' }
      }
    }

    return res.status(200).json({
      ok: true,
      message: row,
      task_status: taskStatus,
      followup,
    })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'insert failed' })
  }
}
