// POST /api/dashboard/foreman-pause    write /tmp/foreman-pause signal (pause)
// DELETE /api/dashboard/foreman-pause  delete signal + re-queue foreman (resume)
//
// Body: { taskId: string, missionSlug: string }
// Foreman checks Path("/tmp/foreman-pause") after each round and exits cleanly if present.
//
// AUTH + INPUT (r7:open-agent-surface, 2026-07-27). This endpoint used to be
// unauthenticated and was the worst door in the open surface:
//
//   1. TASK INJECTION -> AGENT EXECUTION. The DELETE branch inserts a
//      `status:'queued'` task whose `text` was built by interpolating the
//      caller's `missionSlug` straight into a command string. task-runner.sh
//      claims queued rows and a live Claude Code worker then executes them.
//   2. A FILESYSTEM WRITE + a DoS. POST wrote /tmp/foreman-pause, which halts
//      every foreman loop on the box.
//
// Both are gated on the TASK'S OWN client_id: the row is resolved first, then
// verifyTenant runs against it. missionSlug is validated against the
// mission-path grammar so it cannot smuggle anything into the command string.
//
// corner:retire-supabase (2026-09-03): the task row is read with tasks:get,
// patched with tasks:update and re-queued with tasks:queue on Convex.

import { promises as fs } from 'fs'
import { applyCors } from '../_lib/originAllowlist.js'

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!r.ok) throw new Error(`convex ${kind} ${path}: HTTP ${r.status}`)
  const data = await r.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}
const convexQuery = (path, args, token) => convexCall('query', path, args, token)
const convexMutation = (path, args, token) => convexCall('mutation', path, args, token)

class AuthError extends Error {
  constructor(message, status = 403) { super(message); this.name = 'AuthError'; this.status = status }
}

function bearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null
  return null
}

// Who is calling. Throws 401 when the request carries no valid session.
async function requireCaller(req) {
  const token = bearerToken(req)
  if (!token) throw new AuthError('sign-in required', 401)
  let who = null
  try { who = await convexQuery('users:verifyToken', {}, token) } catch { who = null }
  if (!who || !who.userId) throw new AuthError('invalid session', 401)
  const world = who.world ? String(who.world).toLowerCase() : null
  let superAdmin = false
  try { superAdmin = !!(await convexQuery('worlds:isAdmin', { worldId: 'aom' }, token)) } catch { superAdmin = false }
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, superAdmin, token }
}

// May the caller act inside `tenant`? A world slug admits an aom admin
// (Patrik) everywhere and any member of that world. "shared:<project>" admits
// a world that holds the project or a grant on it.
async function verifyTenant(tenant, req) {
  const t = String(tenant || '').trim().toLowerCase()
  if (!t) throw new AuthError('tenant required', 400)
  const who = await requireCaller(req)
  if (who.superAdmin) return { ok: true, tenant: t, ...who, isAdmin: true }
  if (t.startsWith('shared:')) {
    const slug = t.slice('shared:'.length)
    const access = who.world ? await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null) : null
    if (access && access.ok) return { ok: true, tenant: t, ...who, isAdmin: false }
  } else {
    const m = await convexQuery('worlds:membership', { worldId: t }, who.token).catch(() => null)
    if (m && m.role) return { ok: true, tenant: t, ...who, isAdmin: m.role === 'owner' || m.role === 'admin' }
    if (who.world === t) return { ok: true, tenant: t, ...who }
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" cannot access "${t}"`, 403)
}

function sendAuthError(res, err) {
  return res.status(err?.status || 403).json({ error: err?.message || 'forbidden' })
}

const SIGNAL_PATH = '/tmp/foreman-pause'

// Mission paths are colon-joined lowercase slugs (`corner:launch-readiness`).
// Anything else (whitespace, quotes, `;`, `&&`, `$(`, newlines, a leading dash
// that would read as a flag) is refused before it can reach a command string.
const MISSION_SLUG_RE = /^[a-z0-9][a-z0-9-]*(:[a-z0-9][a-z0-9-]*)*$/

function validMissionSlug(value) {
  const s = String(value || '').trim()
  return s.length > 0 && s.length <= 120 && MISSION_SLUG_RE.test(s)
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST,DELETE')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!['POST', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'POST or DELETE only' })
  }

  const body = req.body || {}
  const { taskId, missionSlug } = body

  if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
    return res.status(400).json({ error: 'valid taskId required' })
  }

  // Gate on the task's OWN world. Resolve the row before deciding anything, so
  // the tenant compared against is the one that owns the work rather than one
  // the caller named. A taskId that matches no row is refused outright.
  let original = null
  try {
    original = await convexQuery('tasks:get', { id: taskId })
  } catch (err) {
    return res.status(502).json({ error: `task lookup failed: ${err.message}` })
  }
  if (!original) return res.status(404).json({ error: 'task not found' })

  const taskWorld = String(original.client_id || '').trim().toLowerCase()
  if (!taskWorld) {
    return res.status(409).json({ error: 'task has no client_id; cannot authorize' })
  }

  let verified
  try {
    verified = await verifyTenant(taskWorld, req)
  } catch (err) {
    if (err instanceof AuthError) return sendAuthError(res, err)
    return res.status(500).json({ error: err?.message || 'auth check failed' })
  }

  // Input validation runs AFTER the gate: an unauthenticated prober gets a
  // flat 401 rather than a validation message.
  if (missionSlug !== undefined && missionSlug !== null && missionSlug !== '' && !validMissionSlug(missionSlug)) {
    return res.status(400).json({ error: 'invalid missionSlug' })
  }

  try {
    if (req.method === 'POST') {
      // Pause: write signal file + mark task metadata
      await fs.writeFile(SIGNAL_PATH, `paused by dashboard ${new Date().toISOString()}\n`)

      // Record pause intent on the task (metadata is merged server-side).
      await convexMutation('tasks:update', {
        key: CONVEX_KEY,
        id: taskId,
        patch: { metadata: { foreman_pausing: true, mission: missionSlug || null } },
      }, verified.token).catch(() => { /* non-fatal: advisory */ })

      return res.status(200).json({ ok: true, action: 'paused', signal: SIGNAL_PATH })
    }

    if (req.method === 'DELETE') {
      // Resume: delete signal file + re-queue the foreman task.
      await fs.unlink(SIGNAL_PATH).catch(() => { /* ok if already gone */ })

      const prevMeta = (original?.metadata && typeof original.metadata === 'object') ? original.metadata : {}
      const mission = missionSlug || prevMeta.mission || null

      if (!mission) {
        return res.status(400).json({ error: 'missionSlug required to restart foreman' })
      }
      // The stored metadata.mission is re-validated too: a value that reaches
      // a command string has to clear the grammar every time.
      if (!validMissionSlug(mission)) {
        return res.status(400).json({ error: 'invalid mission slug on task' })
      }

      const now = new Date().toISOString()
      const newTask = {
        title: original?.title || `Foreman: drive ${mission}`,
        text: `python3 scripts/foreman-orchestrate.py --mission ${mission} --loop`,
        description: `python3 scripts/foreman-orchestrate.py --mission ${mission} --loop`,
        status: 'queued',
        source: 'dashboard-foreman-resume',
        // The authorized task's own tenancy. No default.
        client_id: taskWorld,
        project: original?.project || 'corner',
        project_path: original?.project_path || '',
        priority: 0,
        created_at: now,
        created_by: verified.userId ? String(verified.userId) : undefined,
        metadata: {
          repo: 'corner',
          created_via: 'foreman-resume',
          model: prevMeta.model || 'opus',
          is_foreman: true,
          mission,
          resumed_from: taskId,
        },
      }

      const task = await convexMutation('tasks:queue', { key: CONVEX_KEY, row: newTask }, verified.token)
      return res.status(200).json({ ok: true, action: 'resumed', newTaskId: task?.id || null })
    }
  } catch (err) {
    console.error('[foreman-pause] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
