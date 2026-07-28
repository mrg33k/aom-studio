// POST /api/dashboard/foreman-pause — write /tmp/foreman-pause signal (pause)
// DELETE /api/dashboard/foreman-pause — delete signal + re-queue foreman (resume)
//
// Body: { taskId: string, missionSlug: string }
// Foreman checks Path("/tmp/foreman-pause") after each round and exits cleanly if present.
//
// AUTH + INPUT (r7:open-agent-surface, 2026-07-27). This endpoint was
// unauthenticated with `Access-Control-Allow-Origin: *` and it was the worst
// door in the open surface, for two independent reasons:
//
//   1. TASK INJECTION -> AGENT EXECUTION. The DELETE branch INSERTS a
//      `status:'queued'` tasks row whose `text` was built by interpolating the
//      caller's `missionSlug` straight into a command string. task-runner.sh
//      claims queued rows and write_brief() drops that `text` verbatim into the
//      brief a live Claude Code worker then executes (scripts/task-runner.sh
//      line 646). So an unauthenticated POST could put arbitrary instructions
//      in front of an agent holding this repo's credentials. `taskId` was the
//      only required field and a random UUID satisfied it — the row did not
//      even have to exist, because every field falls back to a default.
//   2. A FILESYSTEM WRITE + a DoS. POST wrote /tmp/foreman-pause, which halts
//      every foreman loop on the box; anyone could freeze all autonomous work.
//
// Both are now gated on the TASK'S OWN client_id — resolved from the row first,
// then verifyTenant against it, exactly the shape retry-task.js uses for the
// same "re-queue a brief a worker will execute" hazard. And missionSlug is
// validated against the mission-path grammar so it can no longer smuggle
// anything into the command string even from inside the world.

import { promises as fs } from 'fs'
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js'

const SIGNAL_PATH = '/tmp/foreman-pause'

// Mission paths are colon-joined lowercase slugs (`corner:launch-readiness`).
// Anything else — whitespace, quotes, `;`, `&&`, `$(`, newlines, a leading dash
// that would read as a flag — is refused before it can reach a command string.
const MISSION_SLUG_RE = /^[a-z0-9][a-z0-9-]*(:[a-z0-9][a-z0-9-]*)*$/

function validMissionSlug(value) {
  const s = String(value || '').trim()
  return s.length > 0 && s.length <= 120 && MISSION_SLUG_RE.test(s)
}
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function sbPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase POST ${path} → ${res.status}: ${text.slice(0, 300)}`)
  try { return JSON.parse(text) } catch { return null }
}

async function sbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase PATCH ${path} → ${res.status}: ${text.slice(0, 300)}`)
  }
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${text.slice(0, 300)}`)
  try { return JSON.parse(text) } catch { return null }
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST,DELETE')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!['POST', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'POST or DELETE only' })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const body = req.body || {}
  const { taskId, missionSlug } = body

  if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
    return res.status(400).json({ error: 'valid taskId required' })
  }

  // ── Gate on the task's OWN world ────────────────────────────────────────
  // Resolve the row before deciding anything, so the tenant compared against is
  // the one that owns the work rather than one the caller named. A taskId that
  // matches no row is refused outright: the old code happily invented a whole
  // task from defaults for an unknown UUID, and that was the injection vector.
  let original = null
  try {
    const rows = await sbGet(
      `tasks?id=eq.${encodeURIComponent(taskId)}&select=title,text,description,project,project_path,client_id,source,metadata&limit=1`,
    )
    original = Array.isArray(rows) ? rows[0] : null
  } catch (err) {
    return res.status(502).json({ error: `task lookup failed: ${err.message}` })
  }
  if (!original) return res.status(404).json({ error: 'task not found' })

  const taskWorld = String(original.client_id || '').trim().toLowerCase()
  if (!taskWorld) {
    // A task with no tenancy cannot be authorized against anything. Refuse
    // rather than fall back to a default world — a default is what let this
    // endpoint act as though every task belonged to the same tenant.
    return res.status(409).json({ error: 'task has no client_id; cannot authorize' })
  }

  try {
    await verifyTenant(taskWorld, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return sendAuthError(res, err)
    return res.status(500).json({ error: err?.message || 'auth check failed' })
  }

  // Input validation runs AFTER the gate: an unauthenticated prober should get
  // a flat 401 rather than a validation message that tells them the field name,
  // the grammar, and that they were close.
  if (missionSlug !== undefined && missionSlug !== null && missionSlug !== '' && !validMissionSlug(missionSlug)) {
    return res.status(400).json({ error: 'invalid missionSlug' })
  }

  try {
    if (req.method === 'POST') {
      // Pause: write signal file + mark task metadata
      await fs.writeFile(SIGNAL_PATH, `paused by dashboard ${new Date().toISOString()}\n`)

      // Update task metadata to record pause intent
      await sbPatch(`tasks?id=eq.${encodeURIComponent(taskId)}`, {
        metadata: { foreman_pausing: true, mission: missionSlug || null },
      }).catch(() => { /* non-fatal — metadata patch is advisory */ })

      return res.status(200).json({ ok: true, action: 'paused', signal: SIGNAL_PATH })
    }

    if (req.method === 'DELETE') {
      // Resume: delete signal file + re-queue the foreman task.
      // `original` was already fetched (and authorized) above — re-fetching it
      // here is what let the unauthorized path build a task out of defaults.
      await fs.unlink(SIGNAL_PATH).catch(() => { /* ok if already gone */ })

      const prevMeta = (original?.metadata && typeof original.metadata === 'object') ? original.metadata : {}
      const mission = missionSlug || prevMeta.mission || null

      if (!mission) {
        return res.status(400).json({ error: 'missionSlug required to restart foreman' })
      }
      // The stored metadata.mission is re-validated too. It is not caller input
      // on THIS request, but it was caller input on some earlier one, and a
      // value that reaches a command string has to clear the grammar every time
      // rather than only on the hop that happened to introduce it.
      if (!validMissionSlug(mission)) {
        return res.status(400).json({ error: 'invalid mission slug on task' })
      }

      const { randomUUID } = await import('crypto')
      const now = new Date().toISOString()

      const newTask = {
        id: randomUUID(),
        title: original?.title || `Foreman: drive ${mission}`,
        text: `python3 scripts/foreman-orchestrate.py --mission ${mission} --loop`,
        description: `python3 scripts/foreman-orchestrate.py --mission ${mission} --loop`,
        status: 'queued',
        source: 'dashboard-foreman-resume',
        // The authorized task's own tenancy. No default: taskWorld is non-empty
        // by the time we get here (checked above), so the re-queued row can only
        // ever land in the world the original belonged to.
        client_id: taskWorld,
        project: original?.project || 'corner',
        project_path: original?.project_path || '',
        priority: 0,
        created_at: now,
        metadata: {
          repo: 'corner',
          created_via: 'foreman-resume',
          model: prevMeta.model || 'opus',
          is_foreman: true,
          mission,
          resumed_from: taskId,
        },
      }

      const inserted = await sbPost('tasks', newTask)
      const task = Array.isArray(inserted) ? inserted[0] : inserted

      return res.status(200).json({ ok: true, action: 'resumed', newTaskId: task?.id || null })
    }
  } catch (err) {
    console.error('[foreman-pause] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
