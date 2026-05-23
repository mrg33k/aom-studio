// POST /api/dashboard/voice-handoff
//
// R28 (2026-04-21): close the loop when a voice call ends. The dashboard
// POSTs the full transcript here and this endpoint writes ONE messages
// row with role='user' source='voice-handoff', which supabase-listener.py
// then forwards into the agent's relay-inbox-<slug>.jsonl. The agent
// (in tmux) receives the message like any other user input and can act
// on it. The dashboard AWAITS this call before firing the 'call ended'
// state change, so the agent always learns what was said.
//
// Works for every agent (not just terminal rooms). Raw-transcript style
// with a short preamble so the agent understands "this was voice, treat
// it as Patrik talking to you directly." Existing `voice-summary`
// endpoint still runs for terminal rooms as a richer Haiku summary
// fire-and-forget, but voice-handoff is the guaranteed delivery path.

import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

function buildPreamble({ agent, duration_secs, turn_count }) {
  const meta = []
  if (duration_secs) meta.push(`${duration_secs}s`)
  if (turn_count) meta.push(`${turn_count} turns`)
  const metaStr = meta.length ? `, ${meta.join(', ')}` : ''
  return (
    `[VOICE CALL HANDOFF -- room=${agent}${metaStr}]\n` +
    '\n' +
    'Context: Patrik just ended a voice call with you. The transcript below is the full conversation.\n' +
    'The voice layer is a shortcut, not a collaborator -- it is not awaiting a response and has no further role.\n' +
    'Act on anything Patrik said the same way you would if he had typed it.'
  )
}

function formatTranscript(transcript) {
  if (!Array.isArray(transcript)) return ''
  const lines = []
  for (const turn of transcript) {
    if (!turn || !turn.text) continue
    const who = turn.role === 'user' ? 'Patrik'
      : turn.role === 'system' ? 'system'
      : 'voice'
    const text = String(turn.text).trim()
    if (!text) continue
    lines.push(`${who}: ${text}`)
  }
  return lines.join('\n')
}

async function writeMessage({ agent, text, client_id, user_id, user_name, project, mission_slug }) {
  const payload = {
    id: crypto.randomUUID(),
    agent,
    role: 'user',
    text,
    source: 'voice-handoff',
    client_id: client_id || 'aom',
    ...(project ? { project } : {}),
    ...(mission_slug ? { metadata: { mission_slug } } : {}),
    ...(user_id ? { user_id } : {}),
    ...(user_name ? { user_name } : {}),
  }
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
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
    throw new Error(`Supabase ${resp.status}: ${await resp.text()}`)
  }
  const rows = await resp.json()
  return rows?.[0] || payload
}

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const { agent, transcript, client_id, user_id, user_name, duration_secs, project, mission_slug } = req.body || {}
  if (!agent || typeof agent !== 'string') {
    return res.status(400).json({ error: 'agent required' })
  }
  // 2026-05-23 defensive guard: reject room-key-shaped agent values. A real
  // agent slug is a single token like 'rex', 'elon', 'gary'. Values containing
  // ':' or '/' are room keys (e.g. 'project:corner') that the frontend should
  // have decomposed into agent + project. Letting them through writes a
  // malformed routing row the bridge can't decode.
  if (/[:\/]/.test(agent)) {
    return res.status(400).json({
      error: `malformed agent slug ${JSON.stringify(agent)} — pass agent + project separately`,
    })
  }
  if (!Array.isArray(transcript) || transcript.length === 0) {
    // Empty transcript = user muted the whole call or session never got
    // a chance to capture. Don't write an empty row; not an error.
    return res.status(200).json({ ok: true, skipped: 'empty transcript' })
  }

  const transcriptText = formatTranscript(transcript)
  if (!transcriptText.trim()) {
    return res.status(200).json({ ok: true, skipped: 'no usable text' })
  }

  const turn_count = transcript.filter(
    (t) => t && (t.role === 'user' || t.role === 'model' || t.role === 'model-text'),
  ).length
  const preamble = buildPreamble({ agent, duration_secs, turn_count })
  const body = `${preamble}\n\n## Full transcript\n${transcriptText}`

  try {
    const message = await writeMessage({ agent, text: body, client_id, user_id, user_name, project, mission_slug })
    return res.status(200).json({ ok: true, message_id: message.id, turn_count })
  } catch (err) {
    return res.status(502).json({ error: `failed to write message: ${err.message}` })
  }
}
