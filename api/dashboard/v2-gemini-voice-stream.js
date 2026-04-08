// api/dashboard/v2-gemini-voice-stream.js
// WebSocket proxy: Browser audio -> Gemini Live API -> Browser audio
// Adds per-agent persona via Supabase agents table.
//
// Works with: vercel dev (local), custom Node.js server
// Production voice: use Supabase voice-live edge function (VITE_VOICE_WS_URL env var)
//
// Protocol (matches VoiceChat.jsx expectations):
//   client -> server: { type: 'audio', data: '<base64 PCM 16kHz>' }
//   client -> server: { type: 'ping' }
//   client -> server: { type: 'disconnect' }
//   server -> client: { type: 'setup_complete' }
//   server -> client: { type: 'audio', data: '<base64 PCM>' }
//   server -> client: { type: 'transcript', role: 'user'|'model', text: '...' }
//   server -> client: { type: 'turn_complete' }
//   server -> client: { type: 'interrupted' }
//   server -> client: { type: 'error', message: '...' }

import { WebSocketServer } from 'ws'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const GEMINI_LIVE_MODEL = 'models/gemini-2.0-flash-live-001'
const GEMINI_LIVE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

export const config = { api: { bodyParser: false } }

// Singleton WebSocketServer (reused across hot-reloads in local dev)
let _wss = null
function getWss() {
  if (!_wss) _wss = new WebSocketServer({ noServer: true })
  return _wss
}

// Load agent persona from Supabase agents table, scoped to client_id for isolation
async function loadAgentPersona(agentSlug, clientId) {
  if (!agentSlug || !SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    let url = `${SUPABASE_URL}/rest/v1/agents?slug=eq.${encodeURIComponent(agentSlug)}&limit=1&select=display_name,description,personality,voice_style,team_name`
    if (clientId) url += `&client_id=eq.${encodeURIComponent(clientId)}`
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const rows = await res.json()
    return Array.isArray(rows) ? rows[0] || null : null
  } catch {
    return null
  }
}

// Build Gemini system instruction from agent persona
function buildSystemInstruction(agentRow) {
  const voiceRules = `

VOICE CONVERSATION RULES:
- This is a REAL-TIME VOICE conversation. Keep responses SHORT -- 1 to 3 sentences max unless the user asks for detail.
- Sound like a person, not an AI. Be direct and natural.
- NO markdown, bullet points, lists, or headers. Your response will be spoken aloud.
- Match the user's energy and tone. If they're brief, be brief.`

  if (!agentRow?.display_name) {
    return `You are a helpful AI assistant.${voiceRules}`
  }

  const { display_name, description, personality, voice_style, team_name } = agentRow
  const team = team_name || 'this team'
  return `Your name is ${display_name}. You are a real team member at ${team}, not a chatbot.

WHO YOU ARE: ${description || `A helpful AI agent on ${team}.`}
YOUR PERSONALITY: ${personality || 'Direct, warm, and knowledgeable.'}
YOUR VOICE: ${voice_style || 'Natural and conversational.'}
${voiceRules}`
}

// Store a transcript line to Supabase, scoped to client_id
async function storeTranscript(clientId, agentSlug, role, text, sessionId) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !clientId || !text) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/voice_transcripts`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        client_id: clientId,
        agent_slug: agentSlug || null,
        session_id: sessionId,
        role,
        text,
        created_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(3000),
    })
  } catch (_) {
    // Non-blocking -- transcript storage failures must not kill the voice session
  }
}

// Handle one voice session: clientWs <-> Gemini Live API
async function handleVoiceSession(clientWs, agentSlug, clientId) {
  // Reject sessions without a client_id -- voice data must always be scoped
  if (!clientId) {
    clientWs.send(JSON.stringify({ type: 'error', message: 'client_id is required for voice sessions' }))
    clientWs.close()
    return
  }

  const { randomUUID } = await import('crypto')
  const sessionId = randomUUID()

  const agentRow = await loadAgentPersona(agentSlug, clientId)
  const systemInstruction = buildSystemInstruction(agentRow)

  const { WebSocket: WS } = await import('ws')
  const geminiWs = new WS(`${GEMINI_LIVE_WS}?key=${GEMINI_API_KEY}`)

  let geminiReady = false

  function safeClose(ws) {
    try { if (ws.readyState === 1) ws.close() } catch (_) {}
  }

  function closeAll() {
    safeClose(geminiWs)
    safeClose(clientWs)
  }

  geminiWs.on('open', () => {
    geminiWs.send(JSON.stringify({
      setup: {
        model: GEMINI_LIVE_MODEL,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: { voice_name: 'Puck' },
            },
          },
        },
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
      },
    }))
  })

  geminiWs.on('message', (data) => {
    if (clientWs.readyState !== 1) return
    try {
      const msg = JSON.parse(data.toString())

      // Session setup complete
      if (msg.setupComplete !== undefined) {
        geminiReady = true
        clientWs.send(JSON.stringify({ type: 'setup_complete' }))
        return
      }

      const sc = msg.serverContent
      if (!sc) return

      // Audio and text from model
      const parts = sc.modelTurn?.parts || []
      for (const part of parts) {
        if (part.inlineData?.data) {
          clientWs.send(JSON.stringify({ type: 'audio', data: part.inlineData.data }))
        }
        if (part.text) {
          clientWs.send(JSON.stringify({ type: 'transcript', role: 'model', text: part.text }))
          storeTranscript(clientId, agentSlug, 'model', part.text, sessionId)
        }
      }

      // Model finished speaking
      if (sc.turnComplete) {
        clientWs.send(JSON.stringify({ type: 'turn_complete' }))
      }

      // User interrupted the model
      if (sc.interrupted) {
        clientWs.send(JSON.stringify({ type: 'interrupted' }))
      }

      // User speech transcript (STT)
      if (sc.inputTranscript?.text) {
        clientWs.send(JSON.stringify({ type: 'transcript', role: 'user', text: sc.inputTranscript.text }))
        storeTranscript(clientId, agentSlug, 'user', sc.inputTranscript.text, sessionId)
      }
    } catch (_) {}
  })

  geminiWs.on('error', (err) => {
    if (clientWs.readyState === 1) {
      clientWs.send(JSON.stringify({ type: 'error', message: `Gemini connection error: ${err.message}` }))
    }
    closeAll()
  })

  geminiWs.on('close', () => safeClose(clientWs))

  // Forward client audio to Gemini
  clientWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === 'ping') return

      if (msg.type === 'disconnect') {
        closeAll()
        return
      }

      if (msg.type === 'audio' && msg.data && geminiReady && geminiWs.readyState === 1) {
        geminiWs.send(JSON.stringify({
          realtime_input: {
            media_chunks: [{ mime_type: 'audio/pcm;rate=16000', data: msg.data }],
          },
        }))
      }
    } catch (_) {}
  })

  clientWs.on('close', () => safeClose(geminiWs))
  clientWs.on('error', () => safeClose(geminiWs))
}

export default async function handler(req, res) {
  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
    return
  }

  // Non-WebSocket requests: GET transcripts or health check
  if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
    if (req.method === 'GET') {
      const clientId = (req.query?.client_id || '').trim().toLowerCase()
      if (!clientId) {
        res.status(400).json({ error: 'client_id required to fetch voice transcripts' })
        return
      }
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        res.status(500).json({ error: 'Supabase not configured' })
        return
      }
      try {
        const agentSlug = (req.query?.agent || '').trim()
        const sessionId = (req.query?.session_id || '').trim()
        const limit = Math.min(parseInt(req.query?.limit || '50', 10) || 50, 200)
        let url = `${SUPABASE_URL}/rest/v1/voice_transcripts?client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=${limit}`
        if (agentSlug) url += `&agent_slug=eq.${encodeURIComponent(agentSlug)}`
        if (sessionId) url += `&session_id=eq.${encodeURIComponent(sessionId)}`
        const r = await fetch(url, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          signal: AbortSignal.timeout(5000),
        })
        if (!r.ok) {
          res.status(r.status).json({ error: await r.text() })
          return
        }
        const transcripts = await r.json()
        res.status(200).json({ transcripts, client_id: clientId })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
      return
    }
    // Non-GET, non-WebSocket: health check
    res.status(200).json({
      status: 'ok',
      endpoint: 'v2-gemini-voice-stream',
      model: GEMINI_LIVE_MODEL,
      note: 'WebSocket: ?agent=<slug>&client_id=<id> | GET ?client_id=<id>[&agent=<slug>][&session_id=<id>] for transcripts',
    })
    return
  }

  // Upgrade to WebSocket and handle session
  const wss = getWss()
  wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const agentSlug = url.searchParams.get('agent') || ''
    const clientId = (url.searchParams.get('client_id') || '').trim().toLowerCase() || null
    handleVoiceSession(ws, agentSlug, clientId)
  })
}
