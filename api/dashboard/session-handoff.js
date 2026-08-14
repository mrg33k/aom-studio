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
//
// ── 2026-07-27 r7, corner:tenant-isolation — TWO HOLES LEFT BY THAT PASS ─────
// verifyTenant(world_id) proves only WHICH WORLD the caller may act in. It says
// nothing about a PROJECT (it consults project_access only for a tenant spelled
// 'shared:<slug>' — see the SCOPE WARNING in _lib/verifyTenant.js), and this
// endpoint took `project` raw from body.project or from chat_key='project:<slug>'
// and wrote it onto the row.
//
//   KARENS_MEMBER POSTs {world_id:'karens-world', chat_key:'project:rex'}
//   -> row lands client_id='karens-world', project='rex'   (replayed: HTTP 200)
//
// rex has no projects row, so on the NEXT request arm (A) of the participation
// floor sees a karens-world row under project 'rex' and verifyProjectAccess
// admits her via 'unregistered-project' — and she writes AOM's rex CONTEXT.md,
// the file rule 5 makes every AOM agent read fresh as canon. That is the r3
// durable-prompt-injection exploit verbatim, through a door r4/r5 never wired,
// because this endpoint POSTs to /rest/v1/messages DIRECTLY and never touches
// writeMessageRow (where the r4 gate lives).
//
// Second hole, same row: world_id was never written at all, so the column took
// its DB DEFAULT. That is the exact defect r5 called the root fix — a defaulted
// 'aom' on a karens-world row over-admits AOM and under-admits Karen.
//
// Both closed with the EXISTING model, nothing invented: makeProjectScopeAuthorizer
// (the r4 decision function, same one create-project-from-chat.js and
// create-mission-from-drawer.js reuse) and deriveRowWorld (the r5 derivation).
// FAILURE MODE matches writeMessageRow rather than the create endpoints: a denied
// scope DROPS the project tag and still writes the trigger, because losing the
// handoff means an agent's session state is never written down. There is nothing
// dangerous left in an unscoped row — with no `project` column there is no
// presence evidence to mint.
import crypto from 'crypto'
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'
import { makeProjectScopeAuthorizer, deriveRowWorld } from '../_lib/write-message.js'

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
    verified = await verifyTenant(world_id || '', req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const identity = await callerIdentity(req).catch(() => null)
  const authorUserId = identity?.userId || verified.userId || null
  const authorUserName = identity?.userName || null

  const agentSlug = resolveAgentFromChatKey(chat_key, agentParam)
  // Project slug: prefer explicit field, else parse from chat_key
  const requestedProject = (projectParam && typeof projectParam === 'string' && projectParam.trim())
    ? projectParam.trim()
    : (chat_key.startsWith('project:') ? chat_key.slice('project:'.length) : null)

  // Tenant comes from verifyTenant, not from the body string.
  const clientId = verified.tenant

  // MAY THIS TENANT TAG THIS PROJECT? The r4 authorizer, reused — the same
  // decision writeMessageRow makes about a project tag on a chat row, which is
  // exactly what this row is (role='user', source='corner-dashboard'). It admits
  // the shared-room tenant, the holder world, a project_access grant, the
  // holder's world admins, a world with participation evidence under the slug,
  // and first-claim on a slug nobody has ever spoken in.
  //
  // DROP, don't refuse: a denied tag writes the handoff trigger unscoped into
  // the caller's own 1:1 with the agent instead of failing the click. The drop
  // is stamped on the row (metadata.project_scope_denied) so it is visible in
  // the data, which is also the detection signal for someone probing here.
  let projectSlug = requestedProject
  let scopeDenied = null
  if (projectSlug) {
    let verdict
    try {
      verdict = await makeProjectScopeAuthorizer({ req, clientId })(projectSlug)
    } catch (e) {
      // Fail closed. An authorizer that threw decided nothing, and an unchecked
      // project tag is the whole vulnerability.
      verdict = { ok: false, via: 'error', reason: String((e && e.message) || e) }
    }
    if (!verdict || !verdict.ok) {
      scopeDenied = {
        requested: projectSlug,
        via: (verdict && verdict.via) || 'denied',
        reason: (verdict && verdict.reason) || 'not reachable from this world',
      }
      console.warn(
        `[session-handoff] project scope DENIED: tenant "${clientId}" may not tag project "${projectSlug}" — ${scopeDenied.reason}; writing the handoff trigger unscoped`,
      )
      projectSlug = null
    }
  }

  // world_id is DERIVED and always written — never left to the column default.
  // Borrowed from the writer (deriveRowWorld) rather than repeated here, for the
  // same reason create-project-from-chat.js borrows it: a rule copied by hand is
  // a rule that drifts, and a 'shared:<slug>' tenant is a ROOM, not a world, so
  // stamping the tenant raw would put a room name in the world column. There the
  // author's own world answers; when even that is unknown the column is written
  // NULL — honest absence, never somebody else's world.
  const stampedWorld = deriveRowWorld({ clientId, worldId: identity?.world || verified.world || null })
  if (stampedWorld.via === 'unresolved') {
    console.warn(
      `[session-handoff] world unresolved for tenant "${clientId}" — writing world_id NULL rather than letting the database default it`,
    )
  }

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
      // The RESOLVED slug — null when the scope was refused, so the audit trail
      // records where the row actually landed, not what was asked for.
      project: projectSlug || null,
      ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
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
    // Only ever the SCOPE-AUTHORIZED slug. A refused tag is dropped, which also
    // removes the presence evidence the read-side floor would later be asked to
    // trust — that is the whole point of gating the write.
    ...(projectSlug ? { project: projectSlug } : {}),
    // UNCONDITIONAL (r5 contract): an omitted key takes the DB DEFAULT, which is
    // a false claim of AOM participation on every other world's row. Explicit
    // null is honest absence and the column is nullable.
    world_id: stampedWorld.world,
    // Verified author. Both fields, or neither — a half-identity renders as
    // "You" to everyone and reads as Patrik to any agent downstream.
    ...(authorUserId ? { user_id: authorUserId } : {}),
    ...(authorUserName ? { user_name: authorUserName } : {}),
    // 'user', not 'human' — messages_sender_role_check allows only
    // (admin|user|owner|NULL). See the note in dashboard/supabase-messages.js.
    ...(authorUserId ? { sender_role: 'user' } : {}),
    metadata: {
      handoff_trigger: true,
      chat_key,
      initiated_by: 'handoff-nudge',
      requested_by_name: authorUserName,
      // Observable in the DATA, not only in a log line nobody tails.
      ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
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
