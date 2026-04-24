// POST /api/dashboard/session-handoff
//
// R75-b3 (2026-04-24): records a `session_handoff_requested` event when the
// user clicks "Write handoff" on the in-chat handoff nudge. This is advisory
// signal only -- a future worker can subscribe to these events to actually
// write `last-conversation.md` for the scoped agent/project. For now the UI
// simply resets the exchange counter and the event lands in the `events`
// table as history.
//
// Body: { world_id, chat_key, user_id? }
// chat_key is either `<agent_slug>` for agent threads, `project:<slug>` for
// project chats, or `home` for the home EA surface.
import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const config = { maxDuration: 10 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const { world_id, chat_key, user_id } = req.body || {}
  if (!chat_key || typeof chat_key !== 'string') {
    return res.status(400).json({ error: 'chat_key required' })
  }

  const payload = {
    id: crypto.randomUUID(),
    event_type: 'session_handoff_requested',
    agent: chat_key,
    payload: {
      world_id: world_id || null,
      chat_key,
      user_id: user_id || null,
      source: 'handoff-nudge',
    },
    timestamp: new Date().toISOString(),
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      return res.status(502).json({ error: `Supabase ${resp.status}: ${await resp.text()}` })
    }
    const rows = await resp.json()
    return res.status(200).json({ ok: true, event_id: rows?.[0]?.id || payload.id })
  } catch (err) {
    return res.status(502).json({ error: `failed to write event: ${err.message}` })
  }
}
