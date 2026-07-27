// POST /api/dashboard/session-handoff
//
// R75-b3 (2026-04-24): records a `session_handoff_requested` event when the
// user clicks "Write handoff" on the in-chat handoff nudge.
//
// R75-b4 (2026-05-27): wires up the button for real. In addition to logging
// the event, this endpoint now injects a trigger message into the room's chat
// thread so the agent actually receives the signal and writes CONTEXT.md +
// last-conversation.md per the follow-the-room-canon rule.
//
// Body: { world_id, chat_key, agent?, project? }
//   chat_key  -- '<agent_slug>' | 'project:<slug>' | 'home'
//   agent     -- resolved agent slug (e.g. 'elon', 'rex'). Frontend resolves
//                via getProjectEA(). Defaults to parsing chat_key if omitted.
//   project   -- project slug for project rooms (e.g. 'corner'). Undefined for
//                agent 1:1 and home threads.
//
// AUTH (corner:identity-attribution, 2026-07-27). This writes a role='user'
// source='corner-dashboard' row, and supabase-listener.py dispatches that into
// the target agent's relay inbox — so it makes a real agent burn a turn writing
// CONTEXT.md and last-conversation.md. Unauthenticated it was world-choosing,
// identity-spoofing (`user_id` came straight off the body) and a free DoS on any
// room. Now: verifyTenant on world_id, author from the JWT, dashboard CORS.
import crypto from 'crypto'
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const config = { maxDuration: 10 }

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

// Derive the agent slug from chat_key when the caller didn't pass it explicitly.
// Falls back to 'elon' for project rooms and home.
function resolveAgentFromChatKey(chatKey, agentParam) {
  if (agentParam && typeof agentParam === 'string' && agentParam.trim()) {
    return agentParam.trim()
  }
  if (!chatKey || chatKey === 'home') return 'elon'
  if (chatKey.startsWith('project:')) return 'elon'
  // Anything else is treated as a direct agent slug
  return chatKey
}

// The trigger message sent into the room's chat thread. Written as role:'user'
// so supabase-listener picks it up via the standard routing path.
// The agent reads this and, per follow-the-room-canon, writes CONTEXT.md +
// last-conversation.md before replying.
const HANDOFF_TRIGGER_TEXT = [
  '[Handoff requested] Please write your current session state to this room\'s',
  'CONTEXT.md and last-conversation.md right now — what\'s in flight,',
  'key decisions made this session, what\'s next. Follow the',
  'follow-the-room-canon rule. Confirm when done.',
].join(' ')

export default async function handler(req, res) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  // `user_id` is deliberately NOT read from the body any more (RULE 1).
  const { world_id, chat_key, agent: agentParam, project: projectParam } = req.body || {}
  if (!chat_key || typeof chat_key !== 'string') {
    return res.status(400).json({ error: 'chat_key required' })
  }

  let verified
  try {
    verified = await verifyTenant(world_id || 'aom', req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const identity = await callerIdentity(req).catch(() => null)
  const authorUserId = identity?.userId || verified.userId || null
  const authorUserName = identity?.userName || null

  const agentSlug = resolveAgentFromChatKey(chat_key, agentParam)
  // Project slug: prefer explicit field, else parse from chat_key
  const projectSlug = (projectParam && typeof projectParam === 'string' && projectParam.trim())
    ? projectParam.trim()
    : (chat_key.startsWith('project:') ? chat_key.slice('project:'.length) : null)

  // Tenant comes from verifyTenant, not from the body string.
  const clientId = verified.tenant

  const supabaseHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  // 1. Log the event (existing behaviour — history record, non-fatal if it fails).
  const eventPayload = {
    id: crypto.randomUUID(),
    event_type: 'session_handoff_requested',
    agent: agentSlug,
    payload: {
      world_id: clientId,
      chat_key,
      agent: agentSlug,
      project: projectSlug || null,
      user_id: authorUserId,
      user_name: authorUserName,
      source: 'handoff-nudge',
    },
    timestamp: new Date().toISOString(),
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(eventPayload),
    })
  } catch (_) {
    // Non-fatal — event logging failure shouldn't block the trigger message.
  }

  // 2. Write the trigger message into the room's chat thread.
  // role:'user' + source:'corner-dashboard' is what supabase-listener.py
  // accepts in its allowed_sources list to route the message to the agent.
  const messagePayload = {
    id: crypto.randomUUID(),
    agent: agentSlug,
    role: 'user',
    text: HANDOFF_TRIGGER_TEXT,
    source: 'corner-dashboard',
    client_id: clientId,
    ...(projectSlug ? { project: projectSlug } : {}),
    // Verified author. Both fields, or neither — a half-identity renders as
    // "You" to everyone and reads as Patrik to any agent downstream.
    ...(authorUserId ? { user_id: authorUserId } : {}),
    ...(authorUserName ? { user_name: authorUserName } : {}),
    ...(authorUserId ? { sender_role: 'human' } : {}),
    metadata: {
      handoff_trigger: true,
      chat_key,
      initiated_by: 'handoff-nudge',
      requested_by_name: authorUserName,
    },
    timestamp: new Date().toISOString(),
  }

  try {
    const msgResp = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(messagePayload),
    })
    if (!msgResp.ok) {
      const errText = await msgResp.text()
      return res.status(502).json({ error: `failed to write trigger message: ${errText}` })
    }
    const rows = await msgResp.json()
    const insertedId = (Array.isArray(rows) ? rows[0]?.id : rows?.id) || messagePayload.id
    return res.status(200).json({ ok: true, message_id: insertedId, agent: agentSlug, project: projectSlug })
  } catch (err) {
    return res.status(502).json({ error: `failed to write trigger message: ${err.message}` })
  }
}
