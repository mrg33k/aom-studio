// POST /api/dashboard/session-handoff
//
// Records a `session_handoff_requested` event when the user clicks "Write
// handoff" on the in-chat handoff nudge, and posts the trigger message into
// the room's chat thread so the agent actually receives the signal and writes
// CONTEXT.md + last-conversation.md per the follow-the-room-canon rule.
//
// Body: { world_id, chat_key, agent?, project? }
//   chat_key  '<agent_slug>' | 'project:<slug>' | 'home'
//   agent     resolved agent slug (e.g. 'elon', 'rex'). Defaults to parsing
//             chat_key if omitted.
//   project   project slug for project rooms. Undefined for agent 1:1 and home.
//
// Auth: verifyTenant on world_id, author from the JWT, dashboard CORS. The
// project tag is scope-checked; a denied tag is dropped (the trigger still
// lands in the caller's own 1:1 with the agent) and stamped on the row.
//
// Backend: Convex tasks:logEvent + messages:send (corner:retire-supabase R2,
// 2026-09-03). The user-role row is what the dispatcher routes to the agent.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

export const config = { maxDuration: 10 }

// Optional write key for the gated script-facing mutations (tasks:logEvent).
// Unset on dev today; JSON drops an undefined field, so nothing changes until
// the deployment sets TASKS_KEY.
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
]

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))
}

function applyCors(req, res) {
  const origin = req.headers?.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

// Derive the agent slug from chat_key when the caller didn't pass it.
// Falls back to 'elon' for project rooms and home.
function resolveAgentFromChatKey(chatKey, agentParam) {
  if (agentParam && typeof agentParam === 'string' && agentParam.trim()) {
    return agentParam.trim()
  }
  if (!chatKey || chatKey === 'home') return 'elon'
  if (chatKey.startsWith('project:')) return 'elon'
  return chatKey
}

// May this tenant tag this project? Holder world or a grant passes, a world
// admin passes, and an unregistered slug is a first claim.
async function authorizeProjectScope({ tenant, isAdmin, slug }) {
  if (isAdmin) return { ok: true, via: 'world-admin' }
  const access = await convexQuery('projects:hasAccess', { slug, worldId: tenant }).catch(() => null)
  if (access?.ok) return { ok: true, via: access.role === 'owner' ? 'holder-world' : 'project-access-grant' }
  const registered = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null)
  if (!registered) return { ok: true, via: 'first-claim' }
  return { ok: false, via: 'denied', reason: `project "${slug}" belongs to world "${registered.ownerWorld}"` }
}

// The trigger message sent into the room's chat thread. Written as role:'user'
// so the dispatcher routes it to the agent like any other ask.
const HANDOFF_TRIGGER_TEXT = [
  '[Handoff requested] Please write your current session state to this room\'s',
  'CONTEXT.md and last-conversation.md right now: what\'s in flight,',
  'key decisions made this session, what\'s next. Follow the',
  'follow-the-room-canon rule. Confirm when done.',
].join(' ')

export default async function handler(req, res) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // `user_id` is deliberately not read from the body.
  const { world_id, chat_key, agent: agentParam, project: projectParam } = req.body || {}
  if (!chat_key || typeof chat_key !== 'string') {
    return res.status(400).json({ error: 'chat_key required' })
  }

  let verified
  try {
    verified = await verifyTenant(world_id || '', req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const identity = await callerIdentity(req).catch(() => null)
  const authorUserId = identity?.userId || verified.userId || null
  const authorUserName = identity?.userName || verified.userName || null
  const authorEmail = identity?.email || verified.email || null

  const agentSlug = resolveAgentFromChatKey(chat_key, agentParam)
  const requestedProject = (projectParam && typeof projectParam === 'string' && projectParam.trim())
    ? projectParam.trim().toLowerCase()
    : (chat_key.startsWith('project:') ? chat_key.slice('project:'.length).toLowerCase() : null)

  // Tenant comes from verifyTenant, not from the body string.
  const clientId = verified.tenant

  let projectSlug = requestedProject
  let scopeDenied = null
  if (projectSlug) {
    let verdict
    try {
      verdict = await authorizeProjectScope({ tenant: clientId, isAdmin: !!verified.isAdmin, slug: projectSlug })
    } catch (e) {
      verdict = { ok: false, via: 'error', reason: String((e && e.message) || e) }
    }
    if (!verdict || !verdict.ok) {
      scopeDenied = { requested: projectSlug, via: verdict?.via || 'denied', reason: verdict?.reason || 'not reachable from this world' }
      console.warn(`[session-handoff] project scope DENIED: tenant "${clientId}" may not tag project "${projectSlug}"; ${scopeDenied.reason}; writing the handoff trigger unscoped`)
      projectSlug = null
    }
  }

  // 1. Log the event (history record, non-fatal if it fails).
  try {
    await convexMutation('tasks:logEvent', {
      key: CONVEX_KEY,
      event: {
        event_type: 'session_handoff_requested',
        agent: agentSlug,
        payload: {
          world_id: clientId,
          chat_key,
          agent: agentSlug,
          project: projectSlug || null,
          ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
          user_id: authorUserId ? String(authorUserId) : null,
          user_name: authorUserName,
          source: 'handoff-nudge',
        },
      },
    })
  } catch (_) {
    // Event logging failure must not block the trigger message.
  }

  // 2. Write the trigger message into the room's chat thread.
  const roomId = projectSlug ? `${clientId}:project:${projectSlug}` : `${clientId}:agent:${agentSlug}`
  const triggerMeta = {
    handoff_trigger: true,
    chat_key,
    initiated_by: 'handoff-nudge',
    requested_by_name: authorUserName,
    ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
  }
  try {
    const messageId = await convexMutation('messages:send', {
      roomId,
      text: HANDOFF_TRIGGER_TEXT,
      role: 'user',
      source: 'corner-dashboard',
      clientId,
      userId: authorUserId ? String(authorUserId) : undefined,
      userName: authorUserName || undefined,
      userEmail: authorEmail || undefined,
      metadata: triggerMeta,
    })
    // messages:send does not keep the metadata bag; the handoff_trigger flag
    // is what the agent side looks for, so it is written as a second step.
    await convexMutation('messages:patchMetadata', { messageId: String(messageId), patch: triggerMeta })
      .catch((err) => console.warn('[session-handoff] patchMetadata failed (ignored):', err?.message || err))
    return res.status(200).json({ ok: true, message_id: String(messageId), agent: agentSlug, project: projectSlug })
  } catch (err) {
    return res.status(502).json({ error: `failed to write trigger message: ${err.message}` })
  }
}
