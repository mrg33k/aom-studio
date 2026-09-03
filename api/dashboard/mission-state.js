// GET /api/dashboard/mission-state?project=<slug>&mission=<rawSlug|project:slug>
//
// corner:mission-rooms R4: state-of-the-mission card payload.
//
// Returns the snapshot the mission room renders above the chat so the user
// sees where things stand the moment they walk in. No more empty room.
//
// corner:retire-supabase (2026-09-03): chat stats come from the mission's
// Convex room (rooms:resolveCanonical, then messages:getThread), and the
// state board line for the mission (records:recent) rides along as `record`.

import fs from 'node:fs/promises'
import path from 'node:path'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'

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

// May the caller reach this project? The holder world and any world with a
// grant pass (projects:hasAccess). A project with no registry row is admitted
// when the caller's world already has a room for it.
async function verifyProjectAccess(projectSlug, req) {
  const slug = String(projectSlug || '').trim().toLowerCase()
  if (!slug) throw new AuthError('project required', 400)
  const who = await requireCaller(req)
  const project = await convexQuery('projects:lookupBySlug', { slug }, who.token).catch(() => null)
  const base = { ok: true, projectSlug: slug, projectId: project?.projectId || null, ownerWorld: project?.ownerWorld || null, registered: !!project, tenant: project?.ownerWorld || who.world || null, ...who }
  if (who.superAdmin) return { ...base, via: 'super-admin', isAdmin: true }
  if (who.world) {
    const access = await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null)
    if (access && access.ok) return { ...base, via: access.role === 'owner' ? 'holder-world' : 'project-access-grant' }
    if (!project) {
      const rooms = await convexQuery('rooms:listRooms', { worldId: who.world }, who.token).catch(() => [])
      const hit = (Array.isArray(rooms) ? rooms : []).some(r => String(r.project || '').toLowerCase() === slug)
      if (hit) return { ...base, via: 'unregistered-project' }
    }
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" has no access to project "${slug}"`, 403)
}

function resolveMission(projectSlug, missionSlug) {
  const missions = missionsRegistry?.missions || []
  const qualified = missionSlug.includes(':') ? missionSlug : `${projectSlug}:${missionSlug}`
  for (const m of missions) {
    if (m.slug === qualified) return m
    if (!missionSlug.includes(':') && m.project_slug === projectSlug && m.raw_slug === missionSlug) return m
  }
  return null
}

function parseBodyHints(text) {
  if (!text) return { headline: null, next_line: null }
  let body = text
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 4)
    if (end !== -1) body = text.slice(end + 4)
  }
  const lines = body.split('\n')
  let headline = null
  let next_line = null
  let inStatusSection = false
  let collectingHeadline = false
  const headlineBuffer = []
  for (const ln of lines) {
    const trimmed = ln.trim()
    if (/^#+\s*(status|what'?s next|what next|next|r\d+)\b/i.test(trimmed)) {
      inStatusSection = true
      continue
    }
    if (inStatusSection && /^#+\s+/.test(trimmed)) inStatusSection = false
    if (inStatusSection && trimmed && !trimmed.startsWith('#') && !next_line) {
      next_line = trimmed
        .replace(/^[-*]\s+/, '')
        .replace(/^\*\*([^*]+)\*\*\s*[—\-]?\s*/, '$1: ')
        .slice(0, 240)
    }
    if (!headline) {
      if (!collectingHeadline) {
        if (trimmed.startsWith('#') || trimmed === '') continue
        collectingHeadline = true
        headlineBuffer.push(trimmed)
      } else {
        if (trimmed === '' || trimmed.startsWith('#')) {
          headline = headlineBuffer.join(' ').slice(0, 320)
          collectingHeadline = false
          headlineBuffer.length = 0
        } else {
          headlineBuffer.push(trimmed)
        }
      }
    }
  }
  if (!headline && headlineBuffer.length > 0) headline = headlineBuffer.join(' ').slice(0, 320)
  return { headline, next_line }
}

async function readContextBody(missionEntry) {
  if (!missionEntry?.path) return ''
  const candidates = [
    path.resolve(process.cwd(), '..', missionEntry.path, 'CONTEXT.md'),
    path.resolve(process.cwd(), missionEntry.path, 'CONTEXT.md'),
  ]
  for (const p of candidates) {
    try { return await fs.readFile(p, 'utf8') } catch { /* try next */ }
  }
  return ''
}

// Chat activity for the mission: newest message time and how many messages
// the room's thread holds (capped at the thread window of 400).
async function lastMessageStats({ worldSlug, projectSlug, rawSlug, token }) {
  const empty = { last_message_at: null, message_count: 0 }
  if (!worldSlug || !rawSlug) return empty
  try {
    const room = await convexQuery('rooms:resolveCanonical', { worldSlug, kind: 'mission', key: rawSlug, project: projectSlug }, token)
    if (!room) return empty
    const lastAt = room.lastMessageAt || room.lastMessage?.createdAt || null
    const thread = await convexQuery('messages:getThread', { roomId: String(room._id), limit: 400 }, token).catch(() => [])
    const rows = Array.isArray(thread) ? thread : []
    const newest = rows.length ? rows[rows.length - 1].createdAt : lastAt
    return {
      last_message_at: newest ? new Date(newest).toISOString() : null,
      message_count: rows.length,
    }
  } catch {
    return empty
  }
}

// The state board line for this mission, when one exists in the recent set.
async function missionRecord(qualifiedSlug, token) {
  try {
    const recent = await convexQuery('records:recent', { limit: 60 }, token)
    const hit = (Array.isArray(recent) ? recent : []).find(r => r.entity === `mission:${qualifiedSlug}`)
    return hit ? { line: hit.line, updated_at: new Date(hit.updatedAt).toISOString(), updated_by: hit.updatedBy || null } : null
  } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })

  const projectSlug = String(req.query.project || '').trim().toLowerCase()
  const missionSlug = String(req.query.mission || '').trim()
  if (!projectSlug || !missionSlug) {
    return res.status(400).json({ error: 'project and mission required' })
  }

  // The gate is PROJECT access, not world equality: the holder world, any
  // world holding a grant, and the super-admin all pass.
  let verified
  try {
    verified = await verifyProjectAccess(projectSlug, req)
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const rawSlug = missionSlug.includes(':') ? missionSlug.split(':').slice(-1)[0] : missionSlug
  const worldSlug = verified.ownerWorld || verified.world || null
  const entry = resolveMission(projectSlug, missionSlug)
  if (!entry) {
    const qualified = missionSlug.includes(':') ? missionSlug : `${projectSlug}:${missionSlug}`
    const msgStats = await lastMessageStats({ worldSlug, projectSlug, rawSlug, token: verified.token })
    return res.status(200).json({
      slug: qualified,
      name: rawSlug.replace(/-/g, ' '),
      status: 'unscaffolded',
      is_done: false,
      last_updated_disk: null,
      last_message_at: msgStats.last_message_at,
      message_count: msgStats.message_count,
      headline: 'This mission has no on-disk home yet. The chat works; ask the agent to scaffold the mission files when you are ready.',
      next_line: null,
      record: null,
    })
  }

  const qualified = entry.slug
  const [ctx, msgStats, record] = await Promise.all([
    readContextBody(entry),
    lastMessageStats({ worldSlug, projectSlug, rawSlug: entry?.raw_slug || rawSlug, token: verified.token }),
    missionRecord(qualified, verified.token),
  ])
  const { headline, next_line } = parseBodyHints(ctx)

  return res.status(200).json({
    slug: qualified,
    name: entry.name,
    status: entry.status,
    is_done: !!entry.is_done,
    last_updated_disk: entry.last_updated || null,
    last_message_at: msgStats.last_message_at,
    message_count: msgStats.message_count,
    headline,
    next_line,
    record,
  })
}
