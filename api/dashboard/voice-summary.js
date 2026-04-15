// POST /api/dashboard/voice-summary
//
// When Patrik ends a voice call in a "terminal room" (elon, studio, etc.), the
// transcript he accumulated during the call gets POSTed here. We ask Claude Haiku
// 4.5 to summarize it, then write ONE composed message to supabase-messages so the
// existing tmux relay pipes it to the terminal agent's inbox as a normal message.
//
// The composed message has a preamble so the terminal agent understands:
// "this is Patrik talking to you, relayed through a voice shortcut — act on it
// directly, the voice layer is not a collaborator."
//
// Why this exists: terminal rooms (elon, studio) are live Claude Code sessions.
// Their text chat goes straight to the session via tmux relay. Voice is the one
// case where Gemini Live runs (as the STT/voice layer only). On hang-up, the
// transcript comes here, Haiku summarizes it, and the summary lands in the terminal.

import crypto from 'crypto'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// Terminal rooms: live Claude Code sessions attached via tmux relay.
// Mirror of the same set in v2-gemini-chat.js and VoiceChat.jsx. Keep in sync.
const TERMINAL_AGENTS = new Set(['elon', 'studio'])

const SUMMARY_SYSTEM_PROMPT = `You summarize voice conversations between Patrik and his voice assistant.

The summary is delivered to his terminal agent (a Claude Code session) who will act on it. The terminal agent is the real worker -- you are just cleaning up the voice transcript into something actionable.

Rules:
- Extract DECISIONS and ACTION ITEMS only. Skip small talk and thinking-out-loud.
- If Patrik asked a question he expects answered, put it under "Open questions".
- Bullets over prose. No padding. No "I'd be happy to help" framing.
- Do NOT invent action items the transcript didn't cover.
- If the conversation didn't land on anything concrete, say so in one line.
- Refer to the transcript speaker as "Patrik" (the user) and "voice" (the AI side).

Output exactly this format:

## Summary
One to three tight sentences of what was discussed.

## Decisions
- ...

## Action items
- ...

## Open questions for the terminal agent
- ... (or write "(none)" if there are none)`

function buildPreamble({ agent, duration_secs, turn_count }) {
  const parts = []
  parts.push(`[VOICE CALL SUMMARY -- room=${agent}${duration_secs ? `, ${duration_secs}s` : ''}${turn_count ? `, ${turn_count} turns` : ''}]`)
  parts.push('')
  parts.push('Context: Patrik just had a voice conversation (Gemini Live for STT, Haiku for the summary below).')
  parts.push('Treat it as Patrik speaking to you directly. The voice layer is a shortcut, not a collaborator --')
  parts.push('it is not awaiting a response and has no further role.')
  parts.push('Act on the decisions and action items below the same way you would if Patrik typed them.')
  return parts.join('\n')
}

function formatTranscriptLines(transcript) {
  // transcript: [{role: 'user'|'model'|'model-text'|'system', text, ts?}]
  const lines = []
  for (const turn of transcript) {
    if (!turn || !turn.text) continue
    const who = turn.role === 'user' ? 'Patrik' : (turn.role === 'system' ? 'system' : 'voice')
    const text = String(turn.text).trim()
    if (!text) continue
    lines.push(`${who}: ${text}`)
  }
  return lines.join('\n')
}

async function callClaudeHaiku(transcriptText) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      system: [
        {
          type: 'text',
          text: SUMMARY_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: `Transcript:\n${transcriptText}` },
      ],
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${data?.error?.message || JSON.stringify(data).slice(0, 200)}`)
  const text = (data?.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()
  return text
}

async function writeMessage({ agent, text, client_id, user_id, user_name }) {
  const payload = {
    id: crypto.randomUUID(),
    agent,
    role: 'user',
    text,
    source: 'voice-summary',
    client_id: client_id || 'aom',
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
    const err = await resp.text()
    throw new Error(`Supabase ${resp.status}: ${err}`)
  }
  const rows = await resp.json()
  return rows?.[0] || payload
}

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Anthropic not configured' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const { agent, transcript, client_id, user_id, user_name, duration_secs } = req.body || {}
  if (!agent || typeof agent !== 'string') return res.status(400).json({ error: 'agent required' })
  if (!TERMINAL_AGENTS.has(agent)) {
    return res.status(400).json({ error: `voice-summary only supports terminal agents (${[...TERMINAL_AGENTS].join(', ')})` })
  }
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({ error: 'transcript required (non-empty array)' })
  }

  const transcriptText = formatTranscriptLines(transcript)
  if (!transcriptText.trim()) {
    return res.status(400).json({ error: 'transcript has no usable text' })
  }
  const turn_count = transcript.filter(t => t && (t.role === 'user' || t.role === 'model' || t.role === 'model-text')).length

  let summary = ''
  try {
    summary = await callClaudeHaiku(transcriptText)
  } catch (err) {
    return res.status(502).json({ error: `summary generation failed: ${err.message}` })
  }
  if (!summary) {
    return res.status(502).json({ error: 'summary generation returned empty' })
  }

  const preamble = buildPreamble({ agent, duration_secs, turn_count })
  const body = `${preamble}\n\n${summary}\n\n---\n\n## Full transcript\n${transcriptText}`

  try {
    const message = await writeMessage({ agent, text: body, client_id, user_id, user_name })
    return res.status(200).json({ ok: true, message_id: message.id, turn_count })
  } catch (err) {
    return res.status(502).json({ error: `failed to write message: ${err.message}` })
  }
}
