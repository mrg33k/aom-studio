// hello
// VoiceChat.jsx
// Gemini Live voice chat -- direct browser-to-Google connection.
//
// Architecture:
//   Browser mic (getUserMedia) -> AudioWorklet/ScriptProcessor -> PCM 16kHz mono
//   -> base64 encode -> WebSocket DIRECTLY to Gemini Live API
//   -> audio response -> base64 PCM chunks -> browser AudioContext -> playback
//
// No proxy, no edge function. Browser fetches session config from Vercel API,
// then connects to Google's WebSocket endpoint.
//
// Props:
//   agentSlug   - agent identifier ("rex", "bobby", etc.)
//   agentName   - optional display name for the agent; falls back to agentSlug.
//                 Drives the transcript speaker label — it used to be the
//                 literal string "REX" for every agent on every call.
//   agentColor  - hex color for UI accents
//   clientId    - tenant ID
//   onTranscript(text, role) - called when transcript arrives.
//                 TEXT FIRST, ROLE SECOND. Every call site in this file passes
//                 (text, role); a host that destructures (role, text) posts the
//                 word "user"/"model" as the message body and files every turn
//                 as the human (the CV6 bug found 2026-07-27).
//   onStatusChange(status)   - 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'

// Voice pipeline verified working 2026-04-07.

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { authFetch } from '../lib/authFetch.js'

// Terminal rooms: live Claude Code sessions attached via tmux relay.
// Text in these rooms bypasses the dashboard chat API entirely (handled by the
// tmux relay). Voice calls DO run Gemini Live, but the transcript is summarized
// at call-end via /api/dashboard/voice-summary (Claude Haiku) and piped to the
// terminal as one consolidated message.
// 'ea' joins (LR-4a, 2026-05-05) so EA voice calls produce the same
// scaffolds + chat-room landings as the typed text path of LR-2/LR-3.
// Mirrors api/dashboard/voice-summary.js TERMINAL_AGENTS — keep in sync.
const TERMINAL_AGENTS = new Set(['elon', 'gary', 'ea'])

// Target sample rate for Gemini Live input
const TARGET_SAMPLE_RATE = 16000
// Gemini Live output is 24kHz
const GEMINI_OUTPUT_RATE = 24000

const WORKLET_CODE = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = []
    this._bufferSize = 0
    this._chunkSamples = 1600 // 100ms at 16kHz
  }
  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true
    const samples = input[0]
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      this._buffer.push(s < 0 ? s * 0x8000 : s * 0x7FFF)
      this._bufferSize++
      if (this._bufferSize >= this._chunkSamples) {
        const chunk = new Int16Array(this._buffer.splice(0, this._chunkSamples))
        this._bufferSize -= this._chunkSamples
        this.port.postMessage({ type: 'pcm', chunk: chunk.buffer }, [chunk.buffer])
      }
    }
    return true
  }
}
registerProcessor('pcm-capture', PCMCaptureProcessor)
`

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(b64) {
  const binary = atob(b64)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return buffer
}

function pcmToAudioBuffer(audioCtx, rawBuffer, sampleRate = GEMINI_OUTPUT_RATE) {
  const int16 = new Int16Array(rawBuffer)
  const floatData = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) floatData[i] = int16[i] / 32768.0
  const audioBuffer = audioCtx.createBuffer(1, floatData.length, sampleRate)
  audioBuffer.copyToChannel(floatData, 0)
  return audioBuffer
}

// Default settings
const DEFAULT_SETTINGS = { voice: 'kore', temperature: 0.8 }

// Voice options with descriptive labels
const VOICE_OPTIONS = [
  { id: 'kore',          label: 'Kore',          desc: 'Firm' },
  { id: 'puck',          label: 'Puck',          desc: 'Upbeat' },
  { id: 'charon',        label: 'Charon',        desc: 'Informative' },
  { id: 'aoede',         label: 'Aoede',         desc: 'Breezy' },
  { id: 'fenrir',        label: 'Fenrir',        desc: 'Excitable' },
  { id: 'orus',          label: 'Orus',          desc: 'Firm' },
  { id: 'zephyr',        label: 'Zephyr',        desc: 'Bright' },
  { id: 'leda',          label: 'Leda',          desc: 'Youthful' },
  { id: 'callirrhoe',    label: 'Callirrhoe',    desc: 'Easy-going' },
  { id: 'autonoe',       label: 'Autonoe',       desc: 'Bright' },
  { id: 'enceladus',     label: 'Enceladus',     desc: 'Breathy' },
  { id: 'iapetus',       label: 'Iapetus',       desc: 'Clear' },
  { id: 'umbriel',       label: 'Umbriel',       desc: 'Easy-going' },
  { id: 'algieba',       label: 'Algieba',       desc: 'Smooth' },
  { id: 'despina',       label: 'Despina',       desc: 'Smooth' },
  { id: 'erinome',       label: 'Erinome',       desc: 'Clear' },
  { id: 'algenib',       label: 'Algenib',       desc: 'Gravelly' },
  { id: 'rasalgethi',    label: 'Rasalgethi',    desc: 'Informative' },
  { id: 'laomedeia',     label: 'Laomedeia',     desc: 'Upbeat' },
  { id: 'achernar',      label: 'Achernar',      desc: 'Soft' },
  { id: 'alnilam',       label: 'Alnilam',       desc: 'Firm' },
  { id: 'schedar',       label: 'Schedar',       desc: 'Even' },
  { id: 'gacrux',        label: 'Gacrux',        desc: 'Mature' },
  { id: 'pulcherrima',   label: 'Pulcherrima',   desc: 'Forward' },
  { id: 'achird',        label: 'Achird',        desc: 'Friendly' },
  { id: 'zubenelgenubi', label: 'Zubenelgenubi', desc: 'Casual' },
  { id: 'vindemiatrix',  label: 'Vindemiatrix',  desc: 'Gentle' },
  { id: 'sadachbia',     label: 'Sadachbia',     desc: 'Lively' },
  { id: 'sadaltager',    label: 'Sadaltager',    desc: 'Knowledgeable' },
  { id: 'sulafat',       label: 'Sulafat',       desc: 'Warm' },
]

const EXPLICIT_END_INTENT = /\b(?:end (?:the )?(?:conversation|call|session)|hang up|stop listening|goodbye|bye|that'?s all|i'?m done)\b/i

const VoiceChat = forwardRef(function VoiceChat({ agentSlug, agentName = null, agentColor = '#3B82F6', clientId = 'aom', projectSlug = null, missionSlug = null, onTranscript, onStatusChange, onVolumeChange, onToolAction, autoStart = false, initialVoice = 'kore', onVoiceChange, sessionMode = 'room', airpodsSessionId = null, handoffOnStop = true, onSessionEnd = null, initialPrompt = null }, ref) {
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionSecs, setSessionSecs] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [lastUserTranscript, setLastUserTranscript] = useState('')
  const isMutedRef = useRef(false)
  const sessionIdRef = useRef(null)
  const summaryPostedRef = useRef(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(`corner-voice-settings-${agentSlug}`)
      const base = saved ? JSON.parse(saved) : {}
      return { ...DEFAULT_SETTINGS, ...base, voice: initialVoice }
    } catch { return { ...DEFAULT_SETTINGS, voice: initialVoice } }
  })
  const [availableVoices, setAvailableVoices] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const playbackCtxRef = useRef(null)
  const workletNodeRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const workletBlobUrlRef = useRef(null)
  const playQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const pingIntervalRef = useRef(null)
  const sessionTimerRef = useRef(null)
  const statusRef = useRef('idle')
  const sessionReadyRef = useRef(false)
  const connectTimeoutRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)
  const volumeLevelRef = useRef(0)
  const inputAccRef = useRef('')   // accumulates user transcription chunks per turn
  const outputAccRef = useRef('')  // accumulates model transcription chunks per turn
  // Mirror of the transcript state. stopSession reads this synchronously to build
  // the final transcript for /api/dashboard/voice-summary without racing React state.
  const transcriptRef = useRef([])
  const previewWsRef = useRef(null)
  const endTimerRef = useRef(null)
  const endFallbackTimerRef = useRef(null)
  const endIntentRef = useRef(false)
  const endReceiptRef = useRef(false)
  // ── 2026-08-10, corner:airpods-mode R18 — surviving a dropped signal ────────
  // A call on a phone walks out of Wi-Fi range, the socket closes, and until now
  // that ended the conversation outright. The server has been issuing session
  // resumption handles since R17; these refs are the client half that actually
  // replays one. sessionConfigRef keeps the config so a reconnect never has to
  // re-acquire the microphone — the audio graph stays up, only the socket is
  // rebuilt, which is also why this works without a fresh user gesture on iOS.
  const sessionConfigRef = useRef(null)
  const resumeHandleRef = useRef(null)
  const bindSocketRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef(null)
  const resumingRef = useRef(false)
  const manualStopRef = useRef(false)
  // Backstop for the spoken offer that never became a card: the last structured
  // next_action a tool handed us, and whether this turn actually raised it.
  const lastNextActionRef = useRef(null)
  const offeredThisTurnRef = useRef(false)
  const turnTextRef = useRef('')
  const scheduleReconnectRef = useRef(null)
  // Only a call that actually got going is worth buying back. A socket that
  // never reached setupComplete is a failed connect, and retrying that behind
  // the caller's back just hides the real error.
  const everReadyRef = useRef(false)

  // Keep transcriptRef in sync with transcript state. On every transcript change
  // the effect commits the latest array to the ref. stopSession also merges any
  // still-in-flight inputAccRef/outputAccRef content before posting.
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  const addSystemMessage = useCallback((text) => {
    setTranscript(prev => [...prev, { role: 'system', text, id: Date.now() + Math.random() }])
  }, [])

  // NOTE (corner:voice-chat, 2026-07-27): a dead `saveTranscript` helper used to
  // live here. It wrote voice turns straight to the old messages API route
  // with NO author — and nothing called it, so it was a landmine waiting for
  // someone to wire it up and reintroduce unattributed rows. Removed. Persisting
  // a turn is the HOST's job, through onTranscript: the host is the only layer
  // that knows who is on the call (see ProjectVoiceChatHost / VoiceChatHost /
  // Cv6FullComposer, all of which attach the signed-in user's identity).

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      isMutedRef.current = next
      // When unmuting, send activity end to signal "I'm done"
      if (next && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
      }
      return next
    })
  }, [])

  const previewVoice = useCallback(async () => {
    if (previewLoading) return
    if (previewWsRef.current) {
      try { previewWsRef.current.close() } catch (_) {}
      previewWsRef.current = null
    }
    setPreviewLoading(true)
    try {
      // authFetch: voice-session verifies the caller's tenant and names the
      // speaker from the JWT. A bare fetch reads as an unverified caller and
      // gets a deliberately context-free session back.
      const sessionRes = await authFetch('/api/dashboard/voice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentSlug, client_id: clientId, voice: settings.voice, mode: sessionMode, session_id: airpodsSessionId }),
      })
      if (!sessionRes.ok) throw new Error('Session API failed')
      const sessionConfig = await sessionRes.json()

      const audioChunks = []
      const ws = new WebSocket(sessionConfig.wsUrl)
      previewWsRef.current = ws
      let setupDone = false

      ws.onopen = () => { ws.send(JSON.stringify(sessionConfig.setupMessage)) }

      ws.onmessage = (event) => {
        try {
          const raw = event.data instanceof ArrayBuffer
            ? new TextDecoder().decode(event.data)
            : event.data
          const msg = JSON.parse(raw)

          if (msg.setupComplete !== undefined && !setupDone) {
            setupDone = true
            ws.send(JSON.stringify({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text: 'Say exactly: Hello, this is a voice preview.' }] }],
                turnComplete: true,
              },
            }))
          }

          const sc = msg.serverContent
          if (!sc) return

          if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData?.data) audioChunks.push(fromBase64(part.inlineData.data))
            }
          }

          if (sc.turnComplete) {
            try { ws.close() } catch (_) {}
            previewWsRef.current = null
            if (audioChunks.length > 0) {
              const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: GEMINI_OUTPUT_RATE })
              const totalLen = audioChunks.reduce((s, b) => s + new Int16Array(b).length, 0)
              const combined = new Int16Array(totalLen)
              let off = 0
              for (const chunk of audioChunks) {
                const int16 = new Int16Array(chunk)
                combined.set(int16, off)
                off += int16.length
              }
              const floatData = new Float32Array(combined.length)
              for (let i = 0; i < combined.length; i++) floatData[i] = combined[i] / 32768.0
              const audioBuf = ctx.createBuffer(1, floatData.length, GEMINI_OUTPUT_RATE)
              audioBuf.copyToChannel(floatData, 0)
              const source = ctx.createBufferSource()
              source.buffer = audioBuf
              source.connect(ctx.destination)
              source.onended = () => { try { ctx.close() } catch (_) {} }
              source.start()
            }
            setPreviewLoading(false)
          }
        } catch (_) {}
      }

      ws.onerror = () => { previewWsRef.current = null; setPreviewLoading(false) }
      ws.onclose = () => { previewWsRef.current = null; setPreviewLoading(false) }

      // Safety timeout: 10s
      setTimeout(() => {
        if (previewWsRef.current === ws) {
          try { ws.close() } catch (_) {}
          setPreviewLoading(false)
        }
      }, 10000)
    } catch (_) {
      setPreviewLoading(false)
    }
  }, [previewLoading, agentSlug, clientId, settings.voice])

  const updateStatus = useCallback((s) => {
    statusRef.current = s
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  const sendTextTurn = useCallback((text, options = {}) => {
    const safe = String(text || '').trim()
    if (!safe || !sessionReadyRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return false
    const origin = String(options.origin || 'typed')
    wsRef.current.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: safe }] }],
        turnComplete: true,
      },
    }))
    setTranscript(prev => [...prev, { role: 'user', text: safe, origin, id: Date.now() + Math.random() }])
    onTranscript?.(safe, 'user', { origin })
    updateStatus('thinking')
    return true
  }, [onTranscript, updateStatus])

  const sendControlTurn = useCallback((text) => {
    const safe = String(text || '').trim()
    if (!safe || !sessionReadyRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return false
    wsRef.current.send(JSON.stringify({
      clientContent: {
 turns: [{ role: 'user', parts: [{ text: `[CORNER SYSTEM CONTROL, not spoken by the user]\n${safe}` }] }],
        turnComplete: true,
      },
    }))
    updateStatus('thinking')
    return true
  }, [updateStatus])

  const applyUiEffect = useCallback((effect) => new Promise((resolve) => {
    if (!effect?.request_id) { resolve({ ok: false, error: 'navigation request id missing' }); return }
    let settled = false
    const finish = (receipt) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      window.removeEventListener('cv6:airpods-ui-effect-result', onResult)
      resolve(receipt)
    }
    const onResult = (event) => {
      if (event?.detail?.request_id === effect.request_id) finish(event.detail)
    }
    const timer = setTimeout(() => finish({ ok: false, request_id: effect.request_id, error: 'CV6 did not acknowledge navigation' }), 1800)
    window.addEventListener('cv6:airpods-ui-effect-result', onResult)
    window.dispatchEvent(new CustomEvent('cv6:airpods-ui-effect', { detail: effect }))
  }), [])

  // Load voice settings from agent-specific key when agentSlug or initialVoice changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`corner-voice-settings-${agentSlug}`)
      const base = saved ? JSON.parse(saved) : {}
      setSettings({ ...DEFAULT_SETTINGS, ...base, voice: initialVoice })
    } catch { setSettings({ ...DEFAULT_SETTINGS, voice: initialVoice }) }
  }, [agentSlug, initialVoice])

  // Save temperature to localStorage when it changes (voice is persisted server-side)
  useEffect(() => {
    try { localStorage.setItem(`corner-voice-settings-${agentSlug}`, JSON.stringify({ temperature: settings.temperature })) } catch {}
  }, [settings.temperature, agentSlug])

  // Sequential audio playback (uses separate 24kHz playback context)
  const playNextChunk = useCallback(() => {
    if (isPlayingRef.current || playQueueRef.current.length === 0) return
    const playCtx = playbackCtxRef.current
    if (!playCtx) return
    if (playCtx.state === 'suspended') { playCtx.resume() }
    isPlayingRef.current = true
    updateStatus('speaking')
    const buffer = playQueueRef.current.shift()
    const source = playCtx.createBufferSource()
    source.buffer = buffer
    source.connect(playCtx.destination)
    source.onended = () => {
      isPlayingRef.current = false
      if (playQueueRef.current.length > 0) playNextChunk()
      else updateStatus('listening')
    }
    source.start()
  }, [updateStatus])

  const enqueueAudio = useCallback((rawBuffer) => {
    const playCtx = playbackCtxRef.current
    if (!playCtx) return
    try {
      const audioBuf = pcmToAudioBuffer(playCtx, rawBuffer, GEMINI_OUTPUT_RATE)
      playQueueRef.current.push(audioBuf)
      if (!isPlayingRef.current) playNextChunk()
    } catch (_) {}
  }, [playNextChunk])

  const stopSession = useCallback(async () => {
    // Deliberate teardown. Every reconnect path checks this flag first, so
    // hanging up can never be mistaken for a dropped signal and silently
    // redial the caller.
    manualStopRef.current = true
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null }
    reconnectAttemptsRef.current = 0
    resumingRef.current = false
    resumeHandleRef.current = null
    sessionConfigRef.current = null
    lastNextActionRef.current = null
    if (endTimerRef.current) { clearTimeout(endTimerRef.current); endTimerRef.current = null }
    if (endFallbackTimerRef.current) { clearTimeout(endFallbackTimerRef.current); endFallbackTimerRef.current = null }
    // Flush any pending transcripts BEFORE tearing down (prevents message loss)
    const pendingInput = inputAccRef.current?.trim()
    if (pendingInput) {
      inputAccRef.current = ''
      setTranscript(prev => [...prev, { role: 'user', text: pendingInput, origin: 'speech', id: Date.now() + Math.random() }])
      onTranscript?.(pendingInput, 'user', { origin: 'speech' })
      console.log('[VoiceChat] Final user transcript:', pendingInput)
      setLastUserTranscript(pendingInput)
    }
    const pendingOutput = outputAccRef.current?.trim()
    if (pendingOutput) {
      outputAccRef.current = ''
      setTranscript(prev => [...prev, { role: 'model-text', text: pendingOutput, id: Date.now() + Math.random() }])
      onTranscript?.(pendingOutput, 'model')
    }

    // R28 (2026-04-21): close the loop so the agent actually learns what was
    // said. Every voice call -- terminal room or not -- AWAITS a POST to
    // /api/dashboard/voice-handoff before tearing down. The endpoint writes
    // a Convex messages row with source='voice-handoff' (messages:send), and
    // the Convex dispatcher hands it to the agent. No fire-and-forget -- that was the bug
    // (typing indicator fires, nothing reaches the agent).
    //
    // Terminal rooms (elon, gary) ALSO get the existing voice-summary
    // fire-and-forget call for the richer Haiku summary. If that lands,
    // great. If not, voice-handoff guaranteed a baseline delivery.
    //
    // Idempotency: stopSession can fire multiple times (mute toggle, agent
    // swap, component unmount cleanup). Guard the POST with summaryPostedRef
    // keyed off sessionIdRef. The guard clears in startSession on a fresh
    // session id.
    if (sessionIdRef.current && !summaryPostedRef.current) {
      const base = Array.isArray(transcriptRef.current) ? transcriptRef.current : []
      const finalTranscript = [...base]
      if (pendingInput) finalTranscript.push({ role: 'user', text: pendingInput, origin: 'speech' })
      if (pendingOutput) finalTranscript.push({ role: 'model-text', text: pendingOutput })
      const hasContent = finalTranscript.some(t => t && typeof t.text === 'string' && t.text.trim())
      if (hasContent) {
        summaryPostedRef.current = true
        updateStatus('wrapping-up')
      const transcriptBody = finalTranscript.map(t => ({ role: t.role, text: t.text, ...(t.origin ? { origin: t.origin } : {}) }))

        // Terminal rooms: fire-and-forget the richer Haiku summary in parallel.
        if (handoffOnStop && TERMINAL_AGENTS.has(agentSlug)) {
          authFetch('/api/dashboard/voice-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent: agentSlug,
              client_id: clientId,
              duration_secs: sessionSecs,
              transcript: transcriptBody,
            }),
          }).catch(err => console.warn('[VoiceChat] voice-summary POST failed:', err))
        }

        // Awaited: the guaranteed handoff. Tear-down does NOT race ahead.
        //
        // authFetch, NOT bare fetch (corner:voice-chat, 2026-07-27). This POST
        // writes a row the receiving agent EXECUTES, so the endpoint now
        // requires a real session and derives the speaker from the JWT rather
        // than believing a name in the body. Without the Authorization header
        // the call 401s and the agent never hears the call.
        if (handoffOnStop) try {
          const resp = await authFetch('/api/dashboard/voice-handoff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent: agentSlug,
              client_id: clientId,
              duration_secs: sessionSecs,
              transcript: transcriptBody,
              // 2026-05-23 fix: project rooms supply these so voice-handoff
              // writes the row in the correct (project, mission) scope
              // instead of falling back to a 1:1 with the agent.
              ...(projectSlug ? { project: projectSlug } : {}),
              ...(missionSlug ? { mission_slug: missionSlug } : {}),
              // NOTE: no user_id / user_name here on purpose. The speaker is
              // resolved server-side from the session — a client-supplied
              // author would be a claim, not an identity.
            }),
          })
          if (!resp.ok) {
            console.warn('[VoiceChat] voice-handoff non-200:', resp.status, await resp.text().catch(() => ''))
          }
        } catch (err) {
          console.warn('[VoiceChat] voice-handoff POST failed:', err)
        }
        try {
          await onSessionEnd?.({
            sessionId: airpodsSessionId || sessionIdRef.current,
            durationSecs: sessionSecs,
            transcript: transcriptBody,
          })
        } catch (err) {
          console.warn('[VoiceChat] onSessionEnd failed:', err)
        }
      }
    }

    if (connectTimeoutRef.current) { clearTimeout(connectTimeoutRef.current); connectTimeoutRef.current = null }
    sessionReadyRef.current = false
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null }
    if (sessionTimerRef.current) { clearInterval(sessionTimerRef.current); sessionTimerRef.current = null }
    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect() } catch (_) {} sourceNodeRef.current = null }
    if (workletNodeRef.current) { try { workletNodeRef.current.disconnect() } catch (_) {} workletNodeRef.current = null }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) { try { wsRef.current.close() } catch (_) {} }
      wsRef.current = null
    }
    if (audioCtxRef.current) { try { audioCtxRef.current.close() } catch (_) {} audioCtxRef.current = null }
    if (playbackCtxRef.current) { try { playbackCtxRef.current.close() } catch (_) {} playbackCtxRef.current = null }
    if (workletBlobUrlRef.current) { URL.revokeObjectURL(workletBlobUrlRef.current); workletBlobUrlRef.current = null }
    sessionIdRef.current = null
    endIntentRef.current = false
    endReceiptRef.current = false
    setIsMuted(false)
    isMutedRef.current = false
    playQueueRef.current = []
    isPlayingRef.current = false
    setSessionSecs(0)
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    analyserRef.current = null
    volumeLevelRef.current = 0
    setVolumeLevel(0)
    updateStatus('idle')
  }, [updateStatus, onTranscript, agentSlug, clientId, sessionSecs, projectSlug, missionSlug, handoffOnStop, onSessionEnd, airpodsSessionId])

  const ensureAirpodsEndReceipt = useCallback(async () => {
    if (sessionMode !== 'airpods' || endReceiptRef.current) return
    endReceiptRef.current = true
    const args = {}
    onToolAction?.({ phase: 'working', action: 'end_voice_session', args })
    try {
      const resp = await authFetch('/api/dashboard/airpods-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          session_id: airpodsSessionId || sessionIdRef.current,
          action: 'end_voice_session',
          arguments: args,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      const result = resp.ok ? data : { ok: false, error: data.error || `Action failed (${resp.status})` }
      onToolAction?.({ phase: result.ok === false ? 'error' : 'done', action: 'end_voice_session', args, result })
      if (result.closing === true && result.ok !== false) {
        if (endTimerRef.current) clearTimeout(endTimerRef.current)
        endTimerRef.current = setTimeout(() => {
          endTimerRef.current = null
          stopSession()
        }, 1800)
      } else {
        endReceiptRef.current = false
      }
    } catch (err) {
      endReceiptRef.current = false
      onToolAction?.({ phase: 'error', action: 'end_voice_session', args, result: { ok: false, error: err.message } })
    }
  }, [sessionMode, clientId, airpodsSessionId, onToolAction, stopSession])

  const scheduleEndReceiptFallback = useCallback((modelText = '') => {
    if (sessionMode !== 'airpods' || !endIntentRef.current || endReceiptRef.current) return
    if (!/talk soon|goodbye|bye/i.test(String(modelText))) return
    if (endFallbackTimerRef.current) clearTimeout(endFallbackTimerRef.current)
    endFallbackTimerRef.current = setTimeout(() => {
      endFallbackTimerRef.current = null
      ensureAirpodsEndReceipt()
    }, 600)
  }, [sessionMode, ensureAirpodsEndReceipt])

  const startSession = useCallback(async () => {
    if (status !== 'idle' && status !== 'error') return
    setErrorMsg('')
    setTranscript([])
    transcriptRef.current = []
    setLastUserTranscript('')
    inputAccRef.current = ''
    outputAccRef.current = ''
    sessionReadyRef.current = false
    endIntentRef.current = false
    endReceiptRef.current = false
    manualStopRef.current = false
    everReadyRef.current = false
    resumingRef.current = false
    resumeHandleRef.current = null
    reconnectAttemptsRef.current = 0
    lastNextActionRef.current = null
    offeredThisTurnRef.current = false
    turnTextRef.current = ''
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null }
    sessionIdRef.current = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    summaryPostedRef.current = false
    updateStatus('connecting')

    try {
      // 1. Fetch session config from our API.
      //
      // authFetch, NOT bare fetch (corner:voice-chat, 2026-07-27). voice-session
      // now derives BOTH the caller's tenant (verifyTenant) and the speaker's
      // name (callerIdentity) from this request's JWT. Without the header the
      // endpoint correctly treats the call as unverified and hands back a
      // session with NO workspace context and no speaker name — the agent would
      // pick up the phone knowing nothing and no one.
      const sessionRes = await authFetch('/api/dashboard/voice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentSlug,
          client_id: clientId,
          voice: settings.voice,
          temperature: settings.temperature,
          mode: sessionMode,
          session_id: airpodsSessionId,
        }),
      })
      if (!sessionRes.ok) throw new Error(`Session API ${sessionRes.status}`)
      const sessionConfig = await sessionRes.json()
      if (sessionConfig.availableVoices) setAvailableVoices(sessionConfig.availableVoices)

      // 2. Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      mediaStreamRef.current = stream

      // 3. Create AudioContexts (separate for input 16kHz and output 24kHz)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: TARGET_SAMPLE_RATE,
        latencyHint: 'interactive',
      })
      audioCtxRef.current = audioCtx
      if (audioCtx.state === 'suspended') await audioCtx.resume()

      const playbackCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: GEMINI_OUTPUT_RATE,
        latencyHint: 'playback',
      })
      playbackCtxRef.current = playbackCtx
      if (playbackCtx.state === 'suspended') await playbackCtx.resume()

      // 4. Set up mic capture
      const sourceNode = audioCtx.createMediaStreamSource(stream)
      sourceNodeRef.current = sourceNode

      // Volume level detection via AnalyserNode (runs in parallel with PCM capture)
      const analyserNode = audioCtx.createAnalyser()
      analyserNode.fftSize = 256
      analyserNode.smoothingTimeConstant = 0.6
      analyserRef.current = analyserNode
      sourceNode.connect(analyserNode)
      const freqData = new Uint8Array(analyserNode.frequencyBinCount)
      const measureVol = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(freqData)
        let sum = 0
        for (let i = 0; i < freqData.length; i++) sum += freqData[i]
        const normalized = Math.min(1, (sum / freqData.length) / 75)
        const rounded = Math.round(normalized * 100) / 100
        if (rounded !== volumeLevelRef.current) {
          volumeLevelRef.current = rounded
          setVolumeLevel(rounded)
          onVolumeChange?.(rounded)
        }
        rafRef.current = requestAnimationFrame(measureVol)
      }
      rafRef.current = requestAnimationFrame(measureVol)

      let captureReady = false

      try {
        const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' })
        const blobUrl = URL.createObjectURL(blob)
        workletBlobUrlRef.current = blobUrl
        await audioCtx.audioWorklet.addModule(blobUrl)
        const workletNode = new AudioWorkletNode(audioCtx, 'pcm-capture')
        workletNodeRef.current = workletNode
        workletNode.port.onmessage = (e) => {
          if (e.data?.type === 'pcm' && sessionReadyRef.current && wsRef.current?.readyState === WebSocket.OPEN && statusRef.current !== 'speaking' && !isMutedRef.current) {
            wsRef.current.send(JSON.stringify({
              realtimeInput: {
                audio: {
                  data: toBase64(e.data.chunk),
                  mimeType: `audio/pcm;rate=${TARGET_SAMPLE_RATE}`,
                },
              },
            }))
          }
        }
        sourceNode.connect(workletNode)
        captureReady = true
      } catch (_) {}

      if (!captureReady) {
        const bufferSize = 4096
        const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1)
        workletNodeRef.current = scriptNode
        scriptNode.onaudioprocess = (e) => {
          if (!sessionReadyRef.current || wsRef.current?.readyState !== WebSocket.OPEN || statusRef.current === 'speaking' || isMutedRef.current) return
          const float32 = e.inputBuffer.getChannelData(0)
          const int16 = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]))
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              audio: {
                data: toBase64(int16.buffer),
                mimeType: `audio/pcm;rate=${TARGET_SAMPLE_RATE}`,
              },
            },
          }))
        }
        sourceNode.connect(scriptNode)
        scriptNode.connect(audioCtx.destination)
      }

      // 5. Connect directly to Gemini Live WebSocket
      addSystemMessage('Connecting to voice...')
      sessionConfigRef.current = sessionConfig
      const ws = new WebSocket(sessionConfig.wsUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      // 10s timeout -- if setupComplete never arrives, kill it
      connectTimeoutRef.current = setTimeout(async () => {
        if (statusRef.current === 'connecting') {
          addSystemMessage('Connection timed out. Gemini did not respond.')
          await stopSession()
          setErrorMsg('Couldn’t connect. Tap the AirPods button to retry.')
          updateStatus('error')
        }
      }, 12000)

      // Every handler below is bound through this function so a reconnect can
      // rebuild the socket without rebuilding the microphone, the audio graph,
      // or this component's state. `ws` is a parameter, so the reconnected
      // socket gets its own closure.
      const bindSocket = (ws) => {
      ws.onopen = () => {
        // Send setup message (model config, system instruction, voice). On a
        // reconnect the stored resumption handle rides along, which is what
        // makes Gemini continue the SAME conversation instead of meeting the
        // caller as a stranger halfway through their sentence.
        const handle = resumingRef.current ? resumeHandleRef.current : null
        const setupMessage = handle
          ? { ...sessionConfig.setupMessage, setup: { ...sessionConfig.setupMessage.setup, sessionResumption: { handle } } }
          : sessionConfig.setupMessage
        ws.send(JSON.stringify(setupMessage))

        // Session timer (one only — a reconnect must not double-count seconds)
        if (!sessionTimerRef.current) sessionTimerRef.current = setInterval(() => setSessionSecs(s => s + 1), 1000)
      }

      ws.onmessage = async (event) => {
        try {
          const raw = event.data instanceof ArrayBuffer
            ? new TextDecoder().decode(event.data)
            : event.data
          const msg = JSON.parse(raw)

          // Setup complete
          if (msg.setupComplete !== undefined) {
            if (connectTimeoutRef.current) { clearTimeout(connectTimeoutRef.current); connectTimeoutRef.current = null }
            sessionReadyRef.current = true
            everReadyRef.current = true
            if (resumingRef.current) {
              // Resumed mid-call: no greeting, no re-sent opening prompt. The
              // caller was mid-conversation; the correct behaviour is to be
              // listening again, quietly.
              resumingRef.current = false
              reconnectAttemptsRef.current = 0
              setErrorMsg('')
              addSystemMessage('Reconnected.')
              updateStatus('listening')
              return
            }
            addSystemMessage('Connected. Listening.')
            updateStatus('listening')
            if (initialPrompt) {
              ws.send(JSON.stringify({
                clientContent: {
                  turns: [{ role: 'user', parts: [{ text: initialPrompt }] }],
                  turnComplete: true,
                },
              }))
            }
            return
          }

          // The server hands out a fresh resumption handle as the conversation
          // advances. Keep the newest one; it is the only thing that can buy
          // the call back after a drop.
          if (msg.sessionResumptionUpdate) {
            const update = msg.sessionResumptionUpdate
            if (update.resumable && update.newHandle) resumeHandleRef.current = update.newHandle
            return
          }

          // goAway means this connection is about to be closed by the server.
          // Reconnect BEFORE it dies rather than waiting for the drop, so the
          // caller hears nothing at all.
          if (msg.goAway) {
            console.log('[VoiceChat] goAway received, reconnecting into the same conversation')
            scheduleReconnectRef.current?.('server recycle')
            return
          }

          // Server content (audio, text, turn complete, transcriptions)
          if (msg.serverContent) {
            const sc = msg.serverContent

            // Model turn with audio/text parts
            if (sc.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const rawBuffer = fromBase64(part.inlineData.data)
                  enqueueAudio(rawBuffer)
                }
                if (part.text) {
                  setTranscript(prev => [...prev, { role: 'model', text: part.text, id: Date.now() + Math.random() }])
                  onTranscript?.(part.text, 'model')
                }
              }
            }

            // Input transcription (what the user said) -- accumulate chunks, save full turn on finished
            if (sc.inputTranscription?.text) {
              inputAccRef.current += sc.inputTranscription.text
              if (sc.inputTranscription.finished) {
                const text = inputAccRef.current.trim()
                inputAccRef.current = ''
                if (text) {
                  if (sessionMode === 'airpods' && EXPLICIT_END_INTENT.test(text)) endIntentRef.current = true
                  setTranscript(prev => [...prev, { role: 'user', text, origin: 'speech', id: Date.now() + Math.random() }])
                  onTranscript?.(text, 'user', { origin: 'speech' })
                  console.log('[VoiceChat] User said:', text)
                  setLastUserTranscript(text)
                  // Persistence handled by parent onTranscript callback
                }
              }
            }

            // Output transcription (what the model said) -- accumulate chunks, save full turn on finished
            if (sc.outputTranscription?.text) {
              turnTextRef.current += sc.outputTranscription.text
              outputAccRef.current += sc.outputTranscription.text
              if (sc.outputTranscription.finished) {
                const text = outputAccRef.current.trim()
                outputAccRef.current = ''
                if (text) {
                  setTranscript(prev => [...prev, { role: 'model-text', text, id: Date.now() + Math.random() }])
                  onTranscript?.(text, 'model')
                  scheduleEndReceiptFallback(text)
                  // Persistence handled by parent onTranscript callback
                }
              }
            }

            // Turn complete -- flush any pending transcriptions (fallback if finished never fires)
            if (sc.turnComplete) {
              // Flush pending user input transcript
              const pendingInput = inputAccRef.current.trim()
              if (pendingInput) {
                inputAccRef.current = ''
                if (sessionMode === 'airpods' && EXPLICIT_END_INTENT.test(pendingInput)) endIntentRef.current = true
                setTranscript(prev => [...prev, { role: 'user', text: pendingInput, origin: 'speech', id: Date.now() + Math.random() }])
                onTranscript?.(pendingInput, 'user', { origin: 'speech' })
              }
              // Flush pending model output transcript
              const pending = outputAccRef.current.trim()
              if (pending) {
                outputAccRef.current = ''
                setTranscript(prev => [...prev, { role: 'model-text', text: pending, id: Date.now() + Math.random() }])
                onTranscript?.(pending, 'model')
                scheduleEndReceiptFallback(pending)
              }
              // ── R18: the spoken offer that never became a card ──────────────
              // Measured on production 2026-08-10: "I can queue a task to verify
              // the App Store status. Want me to?" — said out loud, no
              // offer_next_action call, so nothing appeared on screen and the
              // caller's "yes" had nothing to accept. The prompt asks for the
              // call; a prompt is not a guarantee. If the model speaks an offer
              // in a turn where it raised no card, and a tool already handed us
              // a structured next_action, raise that card here.
              const spokenTurn = turnTextRef.current.trim()
              turnTextRef.current = ''
              const spokenAnOffer = /\b(want me to|shall i|should i|i can (?:queue|create|start|set up|run|open))\b/i.test(spokenTurn)
              if (sessionMode === 'airpods' && spokenAnOffer && !offeredThisTurnRef.current && lastNextActionRef.current) {
                const pendingAction = lastNextActionRef.current
                console.log('[VoiceChat] Spoken offer with no card; raising the tool-supplied next_action', pendingAction)
                onToolAction?.({
                  phase: 'proposal',
                  action: pendingAction.action,
                  args: pendingAction.arguments || {},
                  title: pendingAction.title,
                  summary: pendingAction.summary,
                  steps: pendingAction.steps || [],
                  raisedBy: 'client_backstop',
                })
              }
              offeredThisTurnRef.current = false
              if (playQueueRef.current.length === 0 && !isPlayingRef.current) {
                updateStatus('listening')
              }
            }

            // Interrupted
            if (sc.interrupted) {
              playQueueRef.current = []
              isPlayingRef.current = false
              updateStatus('listening')
            }

            return
          }

          // Tool calls from Gemini. Task creation no longer happens mid-call --
          // the post-call summary handles that. Only lookup_context and update_context survive.
          if (msg.toolCall) {
            const calls = msg.toolCall.functionCalls || []
            console.log('[VoiceChat] Tool calls:', calls)
            const responses = []

            for (const call of calls) {
              const args = call.args || {}
              let result = {}

              if (call.name === 'lookup_context') {
                try {
                  const resp = await authFetch(`/api/dashboard/voice-context-lookup?q=${encodeURIComponent(args.query || '')}`)
                  const data = await resp.json()
                  if (data.results?.length) {
                    addSystemMessage(`Found ${data.count} relevant items for "${args.query}"`)
                    result = { results: data.results }
                  } else {
                    result = { results: [], message: `Nothing found for "${args.query}"` }
                  }
                } catch (err) {
                  result = { error: err.message }
                }
              } else if (call.name === 'update_context') {
                try {
                  // Extract project slug from agentSlug (format: "project:corner")
                  const projSlug = agentSlug?.startsWith('project:') ? agentSlug.slice(8) : ''
                  if (!projSlug) {
                    result = { error: 'update_context only works in project chats' }
                  } else {
                    let ragResp = null
                    let fetchErr = null
                    try {
                      ragResp = await authFetch(`${window.location.protocol}//${window.location.host}/api/dashboard/voice-context-update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slug: projSlug, section: args.section, content: args.content, action: args.action || 'append' }),
                      })
                    } catch (e) {
                      fetchErr = e
                    }

                    if (ragResp?.ok) {
                      result = { updated: true, section: args.section, message: `Context updated: ${args.section}` }
                      addSystemMessage(`Updated project context: ${args.section}`)
                    } else {
                      // Surface the real failure reason (network / permission /
                      // RAG down / 5xx) instead of a generic toast.
                      let reason = ''
                      if (fetchErr) {
                        reason = `Network error: ${fetchErr.message || fetchErr.name || 'fetch failed'}`
                      } else if (ragResp) {
                        try {
                          const body = await ragResp.json()
                          reason = body?.error || body?.message || `HTTP ${ragResp.status}`
                        } catch {
                          reason = `HTTP ${ragResp.status}`
                        }
                      } else {
                        reason = 'No response from voice-context-update endpoint'
                      }
                      result = { updated: false, error: `Failed to update context: ${reason}` }
                      addSystemMessage(`Context update failed: ${reason}`)
                    }
                  }
                } catch (err) {
                  result = { error: err.message }
                }
              } else if (call.name === 'create_project' || call.name === 'create_mission') {
                const prevStatus = status
                updateStatus('creating')
                try {
                  // authFetch on every voice tool call: these create real
                  // projects/missions and edit project context. They must carry
                  // the caller's credential so the server can gate them and
                  // record who asked, not accept an anonymous request.
                  const resp = await authFetch('/api/dashboard/voice-create-entity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      entity_type: call.name === 'create_project' ? 'project' : 'mission',
                      name: args.name,
                      description: args.description || '',
                      ...(call.name === 'create_project' ? { team: args.team } : { project: args.project }),
                      client_id: clientId,
                      agent_slug: agentSlug,
                    }),
                  })
                  const data = await resp.json()
                  if (data.ok) {
                    const label = call.name === 'create_project'
                      ? `Project created: ${data.name}`
                      : `Mission created: ${data.name} (under ${data.parent_slug})`
                    addSystemMessage(label)
                    result = { ok: true, name: data.name, slug: data.slug || data.mission_slug, message: label }
                  } else {
                    result = { ok: false, error: data.error || 'Creation failed' }
                    addSystemMessage(`Creation failed: ${result.error}`)
                  }
                } catch (err) {
                  result = { ok: false, error: err.message }
                  addSystemMessage(`Creation error: ${err.message}`)
                } finally {
                  updateStatus(prevStatus === 'creating' ? 'listening' : prevStatus)
                }
              } else if (sessionMode === 'airpods' && call.name === 'offer_next_action') {
                offeredThisTurnRef.current = true
                result = { ok: true, offered: true, spoken_summary: `I can ${args.title || 'take the next step'}.` }
                onToolAction?.({ phase: 'proposal', action: args.action, args: args.arguments || {}, title: args.title, summary: args.summary, steps: args.steps || [] })
              } else if (sessionMode === 'airpods') {
                if (call.name === 'end_voice_session') {
                  if (endFallbackTimerRef.current) { clearTimeout(endFallbackTimerRef.current); endFallbackTimerRef.current = null }
                  endReceiptRef.current = true
                }
                onToolAction?.({ phase: 'working', action: call.name, args })
                try {
                  const resp = await authFetch('/api/dashboard/airpods-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      client_id: clientId,
                      session_id: airpodsSessionId || sessionIdRef.current,
                      action: call.name,
                      arguments: args,
                    }),
                  })
                  const data = await resp.json().catch(() => ({}))
                  result = resp.ok ? data : { ok: false, error: data.error || `Action failed (${resp.status})` }
                  // Remember the most recent structured proposal a tool handed
                  // back, so the turn-complete backstop has something real to
                  // raise if the model speaks the offer and forgets the card.
                  if (result?.next_action?.action) lastNextActionRef.current = result.next_action
                  if (result.ui_effect) {
                    const navigationReceipt = await applyUiEffect(result.ui_effect)
                    result = { ...result, navigation_receipt: navigationReceipt, navigation_acknowledged: navigationReceipt.ok === true }
                    if (!navigationReceipt.ok) result = { ...result, ok: false, error: navigationReceipt.error || 'CV6 navigation was not acknowledged' }
                  }
                  if (result.closing === true && result.ok !== false) {
                    if (endTimerRef.current) clearTimeout(endTimerRef.current)
                    endTimerRef.current = setTimeout(() => {
                      endTimerRef.current = null
                      stopSession()
                    }, 1800)
                  } else if (call.name === 'end_voice_session') {
                    endReceiptRef.current = false
                  }
                } catch (err) {
                  result = { ok: false, error: err.message }
                  if (call.name === 'end_voice_session') endReceiptRef.current = false
                }
                onToolAction?.({ phase: result.ok === false ? 'error' : result.needs_clarification ? 'clarification' : result.requires_confirmation ? 'confirmation' : 'done', action: call.name, args, result })
              } else {
                result = { error: `Unknown function: ${call.name}` }
              }

              responses.push({ id: call.id, name: call.name, response: result })
            }

            // Send tool responses back to Gemini
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                toolResponse: { functionResponses: responses },
              }))
            }
            return
          }

          // Catch unrecognized messages (could be Gemini errors)
          if (msg.error) {
            const errDetail = msg.error.message || msg.error.status || JSON.stringify(msg.error)
            addSystemMessage(`Gemini error: ${errDetail}`)
            console.error('[VoiceChat] Gemini error:', msg.error)
            setErrorMsg(errDetail)
            stopSession()
            updateStatus('error')
            return
          }

          // Log anything else so we can debug
          console.log('[VoiceChat] Unhandled message:', msg)

        } catch (_) {}
      }

      ws.onerror = async () => {
        // Browsers fire error THEN close on an abnormal drop. Without this the
        // old teardown ran first and the reconnect in onclose never got a
        // chance — the call was already dismantled.
        if (scheduleReconnectRef.current?.('socket error')) return
        addSystemMessage('Voice connection failed. Check network and try again.')
        await stopSession()
        setErrorMsg('Voice connection failed. Tap the AirPods button to retry.')
        updateStatus('error')
      }

      ws.onclose = (event) => {
        // Flush any pending transcripts on unexpected close (network drop, timeout)
        const pendingInput = inputAccRef.current?.trim()
        if (pendingInput) {
          inputAccRef.current = ''
          if (sessionMode === 'airpods' && EXPLICIT_END_INTENT.test(pendingInput)) endIntentRef.current = true
          setTranscript(prev => [...prev, { role: 'user', text: pendingInput, origin: 'speech', id: Date.now() + Math.random() }])
          onTranscript?.(pendingInput, 'user', { origin: 'speech' })
        }
        const pendingOutput = outputAccRef.current?.trim()
        if (pendingOutput) {
          outputAccRef.current = ''
          setTranscript(prev => [...prev, { role: 'model-text', text: pendingOutput, id: Date.now() + Math.random() }])
          onTranscript?.(pendingOutput, 'model')
          scheduleEndReceiptFallback(pendingOutput)
        }

        if (statusRef.current !== 'idle') {
          if (event.code !== 1000) {
            const reason = event.reason || `closed (code ${event.code})`
            // A dropped signal is not the end of the conversation any more.
            if (scheduleReconnectRef.current?.(reason)) return
            addSystemMessage(`Disconnected: ${reason}`)
            setErrorMsg(reason)
            updateStatus('error')
          } else {
            addSystemMessage('Session ended.')
            updateStatus('idle')
          }
        }
      }
      }

      bindSocketRef.current = bindSocket
      bindSocket(ws)

      // Rebuild the socket, keep the call. Returns true when a reconnect was
      // actually scheduled, so the caller knows whether to fall through to the
      // old "the call is over" error path. Three attempts with backoff: past
      // that it is not a blip, and pretending otherwise strands the caller
      // listening to silence.
      const scheduleReconnect = (reason) => {
        if (manualStopRef.current) return false
        if (!everReadyRef.current) return false
        if (endIntentRef.current || endReceiptRef.current) return false
        if (!sessionConfigRef.current || !mediaStreamRef.current) return false
        if (reconnectTimerRef.current) return true
        if (reconnectAttemptsRef.current >= 3) return false
        const attempt = ++reconnectAttemptsRef.current
        const delay = [400, 1500, 4000][attempt - 1] || 4000
        sessionReadyRef.current = false
        resumingRef.current = true
        updateStatus('connecting')
        addSystemMessage(attempt === 1
          ? 'Signal dropped. Reconnecting…'
          : `Still reconnecting (attempt ${attempt} of 3)…`)
        console.warn('[VoiceChat] reconnecting after', reason, 'attempt', attempt)
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null
          if (manualStopRef.current) return
          try {
            const previous = wsRef.current
            if (previous && previous.readyState === WebSocket.OPEN) { try { previous.close() } catch (_) {} }
            const next = new WebSocket(sessionConfigRef.current.wsUrl)
            next.binaryType = 'arraybuffer'
            wsRef.current = next
            bindSocketRef.current?.(next)
          } catch (err) {
            addSystemMessage(`Reconnect failed: ${err?.message || err}`)
            setErrorMsg('Lost the connection. Tap the AirPods button to start again.')
            updateStatus('error')
          }
        }, delay)
        return true
      }
      scheduleReconnectRef.current = scheduleReconnect

    } catch (err) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone access denied. Allow mic permission and try again.'
        : err?.name === 'NotFoundError'
        ? 'No microphone found. Plug in a mic and try again.'
        : `Failed to start voice: ${err?.message || err}`
      addSystemMessage(msg)
      await stopSession()
      setErrorMsg(msg)
      updateStatus('error')
    }
  }, [status, agentSlug, clientId, settings, updateStatus, enqueueAudio, stopSession, onTranscript, addSystemMessage, sessionMode, airpodsSessionId, initialPrompt, onToolAction, applyUiEffect, scheduleEndReceiptFallback])

  const toggleSession = useCallback(() => {
    if (status === 'idle' || status === 'error') startSession()
    else stopSession()
  }, [status, startSession, stopSession])

  useEffect(() => { return () => { stopSession(); if (previewWsRef.current) { try { previewWsRef.current.close() } catch (_) {} previewWsRef.current = null } } }, []) // eslint-disable-line
  useEffect(() => { if (status !== 'idle') stopSession() }, [agentSlug]) // eslint-disable-line
  useEffect(() => { if (autoStart) startSession() }, []) // eslint-disable-line

  useImperativeHandle(ref, () => ({
    start: startSession,
    stop: stopSession,
    sendText: sendTextTurn,
    sendControl: sendControlTurn,
    toggleMute,
    get isMuted() { return isMutedRef.current },
  }), [startSession, stopSession, sendTextTurn, sendControlTurn, toggleMute])

  const formatSecs = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // Who the agent side of the live transcript is labelled as. Was hardcoded
  // 'REX' for every agent on every call (corner:voice-chat, 2026-07-27) — a
  // call with Bobby read as a call with Rex. Real identity, always.
  const agentLabel = String(agentName || agentSlug || 'agent').toUpperCase()

  const isActive = status !== 'idle' && status !== 'error'
  const statusColor = { idle: '#4B5563', connecting: '#F59E0B', listening: '#60A5FA', speaking: '#34D399', error: '#F87171' }[status] || agentColor
  const statusLabel = { idle: 'Tap to speak', connecting: 'Connecting', listening: 'Listening', speaking: 'Responding', error: 'Error' }[status] || status

  // Volume-reactive button animation (only when listening)
  const isListening = status === 'listening'
  const volumeScale = isListening ? 1 + volumeLevel * 0.12 : 1
  const volGlowOpacity = isListening && volumeLevel > 0.05 ? Math.round(volumeLevel * 120).toString(16).padStart(2, '0') : ''
  const volGlowSize = isListening ? Math.round(volumeLevel * 48) : 0
  const micButtonShadow = isActive
    ? (volGlowOpacity
        ? `0 0 ${volGlowSize}px ${statusColor}${volGlowOpacity}, 0 0 0 1px ${statusColor}33, 0 8px 32px ${statusColor}25, inset 0 1px 0 rgba(255,255,255,0.08)`
        : `0 0 0 1px ${statusColor}33, 0 8px 32px ${statusColor}25, inset 0 1px 0 rgba(255,255,255,0.08)`)
    : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Settings panel */}
      {showSettings && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,16,32,0.5)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#60A5FA', fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Voice Settings
            </span>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'rgba(148,168,200,0.6)', cursor: 'pointer', fontSize: 14 }}>
              Done
            </button>
          </div>

          {/* Voice Selection */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ color: 'rgba(148,168,200,0.7)', fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Voice Selection
              </label>
              <button
                onClick={previewVoice}
                disabled={previewLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 5, cursor: previewLoading ? 'not-allowed' : 'pointer',
                  background: previewLoading ? 'rgba(96,165,250,0.05)' : 'rgba(96,165,250,0.1)',
                  border: '1px solid rgba(96,165,250,0.25)', outline: 'none',
                  color: previewLoading ? 'rgba(96,165,250,0.4)' : '#60A5FA',
                  fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'all 0.15s',
                }}
              >
                {previewLoading ? (
                  <>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'voiceSpin 0.8s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Playing…
                  </>
                ) : (
                  <>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Preview Voice
                  </>
                )}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {(availableVoices.length > 0
                ? availableVoices.map(id => VOICE_OPTIONS.find(o => o.id === id) || { id, label: id, desc: '' })
                : VOICE_OPTIONS
              ).map(({ id, label, desc }) => {
                const isSelected = settings.voice === id
                return (
                  <button
                    key={id}
                    onClick={() => { setSettings(s => ({ ...s, voice: id })); onVoiceChange?.(id) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s',
                      background: isSelected ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid rgba(96,165,250,0.45)' : '1px solid rgba(255,255,255,0.06)',
                      outline: 'none', width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: isSelected ? '#60A5FA' : 'rgba(148,168,200,0.85)', textTransform: 'capitalize' }}>{label}</span>
                      {desc && <span style={{ fontSize: 9, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: isSelected ? 'rgba(96,165,250,0.65)' : 'rgba(100,130,180,0.4)', letterSpacing: '0.03em' }}>{desc}</span>}
                    </div>
                    {isSelected && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2,6 5,9 10,3" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Temperature slider */}
          <div>
            <label style={{ color: 'rgba(148,168,200,0.7)', fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif", display: 'block', marginBottom: 4 }}>
              Temperature: {settings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0" max="2" step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: '#60A5FA' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(100,130,180,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        </div>
      )}

      {/* Main voice control area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 24, padding: '28px 20px', position: 'relative',
      }}>
        {/* Settings gear + current voice indicator (top right) */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          {!showSettings && (
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)',
                borderRadius: 5, padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
              title="Change voice"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: '#60A5FA', textTransform: 'capitalize', letterSpacing: '0.04em' }}>
                {(VOICE_OPTIONS.find(o => o.id === settings.voice) || { label: settings.voice }).label}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: showSettings ? '#60A5FA' : 'rgba(100,130,180,0.4)',
              padding: 4, transition: 'color 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>

        {/* Ambient glow */}
        {isActive && (
          <div style={{
            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, ${statusColor}18 0%, transparent 70%)`,
            animation: 'voiceAmbient 3s ease-in-out infinite', pointerEvents: 'none',
          }} />
        )}

        {/* Mic button */}
        <button
          data-testid="voice-toggle"
          data-voice-status={status}
          data-voice-agent={agentSlug}
          onClick={toggleSession}
          disabled={status === 'connecting'}
          style={{
            width: 88, height: 88, borderRadius: '50%',
            border: `2px solid ${isActive ? statusColor + 'AA' : 'rgba(100,130,180,0.2)'}`,
            background: isActive
              ? `radial-gradient(circle at 40% 35%, ${statusColor}30 0%, ${statusColor}10 60%, transparent 100%)`
              : 'radial-gradient(circle at 40% 35%, rgba(100,140,220,0.12) 0%, rgba(60,90,160,0.06) 100%)',
            cursor: status === 'connecting' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: isListening
              ? 'border 180ms ease, background 180ms ease, box-shadow 60ms linear, transform 60ms linear'
              : 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            outline: 'none', position: 'relative',
            transform: `scale(${volumeScale})`,
            boxShadow: micButtonShadow,
          }}
        >
          {(status === 'listening' || status === 'speaking') && (
            <div style={{ position: 'absolute', inset: -22, borderRadius: '50%', border: `1px solid ${statusColor}`, opacity: 0.12, animation: 'voiceRingOuter 2.4s ease-in-out infinite 0.4s' }} />
          )}
          {(status === 'listening' || status === 'speaking') && (
            <div style={{ position: 'absolute', inset: -13, borderRadius: '50%', border: `1.5px solid ${statusColor}`, opacity: 0.25, animation: 'voiceRingMid 2s ease-in-out infinite 0.15s' }} />
          )}
          {isActive && (
            <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `2px solid ${statusColor}`, opacity: status === 'speaking' ? 0.55 : 0.35, animation: status === 'speaking' ? 'voiceRingInnerFast 0.7s ease-in-out infinite' : 'voiceRingInner 1.8s ease-in-out infinite' }} />
          )}
          {status === 'connecting' ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'voiceSpin 0.8s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <MicIcon size={34} color={isActive ? statusColor : '#4B6080'} muted={status === 'idle' || status === 'error' || isMuted} />
          )}
        </button>

        {/* Last user transcription -- shown below mic button after speech is captured */}
        {lastUserTranscript ? (
          <p style={{
            margin: 0, padding: '8px 12px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.18)',
            borderRadius: 8, maxWidth: 260,
            color: 'rgba(180,200,230,0.85)',
            fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif",
            lineHeight: 1.5, textAlign: 'center',
          }}>
            {lastUserTranscript}
          </p>
        ) : null}

        {/* Mute/Done button (visible when active) */}
        {isActive && (
          <button
            onClick={toggleMute}
            style={{
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
              background: isMuted ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
              border: isMuted ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: isMuted ? '#F87171' : 'rgba(148,168,200,0.7)',
              fontSize: 11, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '0.06em', textTransform: 'uppercase',
              transition: 'all 150ms ease', outline: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isMuted ? (
                <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="3" y1="3" x2="21" y2="21" stroke="#F87171" /></>
              ) : (
                <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" /></>
              )}
            </svg>
            {isMuted ? 'Muted' : 'Mute'}
          </button>
        )}

        {/* Waveform bars (speaking) */}
        {status === 'speaking' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
            {[0, 0.1, 0.2, 0.05, 0.15, 0.3, 0.08].map((delay, i) => (
              <div key={i} style={{ width: 3, borderRadius: 2, background: statusColor, opacity: 0.7, animation: `voiceBar 0.9s ease-in-out ${delay}s infinite` }} />
            ))}
          </div>
        )}

        {/* Equalizer dots (listening) */}
        {status === 'listening' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, opacity: 0.6, animation: `voiceDot 1.4s ease-in-out ${delay}s infinite` }} />
            ))}
          </div>
        )}

        {/* Status badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: isActive ? `${statusColor}14` : 'transparent',
            border: isActive ? `1px solid ${statusColor}30` : '1px solid transparent',
            borderRadius: 12, padding: isActive ? '3px 10px' : '0',
          }}>
            {isActive && status !== 'connecting' && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}`, animation: 'voiceLiveDot 1.5s ease-in-out infinite' }} />
            )}
            <span style={{ color: statusColor, fontSize: 11, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {statusLabel}
            </span>
          </div>
          {isActive && (
            <span style={{ color: 'rgba(100,140,200,0.6)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>
              {formatSecs(sessionSecs)}
            </span>
          )}
          {/* Current voice label */}
          {isActive && (
            <span style={{ color: 'rgba(100,140,200,0.35)', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", textTransform: 'capitalize' }}>
              {settings.voice}
            </span>
          )}
          {status === 'error' && errorMsg && (
            <span style={{ color: 'rgba(248,113,113,0.8)', fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", textAlign: 'center', maxWidth: 240, lineHeight: 1.5, marginTop: 2 }}>
              {errorMsg}
            </span>
          )}
        </div>
      </div>

      {/* Transcript area */}
      {transcript.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(59,130,246,0.12)', padding: '10px 16px 14px', maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {transcript.slice(-8).map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {entry.role === 'system' ? (
                <span style={{ color: 'rgba(148,168,200,0.45)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontStyle: 'italic', lineHeight: 1.45 }}>
                  {entry.text}
                </span>
              ) : (<>
                <span style={{ color: (entry.role === 'model' || entry.role === 'model-text') ? agentColor : 'rgba(100,130,180,0.7)', fontSize: 9, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, paddingTop: 2, minWidth: 26 }}>
                  {(entry.role === 'model' || entry.role === 'model-text') ? agentLabel : 'YOU'}
                </span>
                <span style={{ color: (entry.role === 'model' || entry.role === 'model-text') ? 'rgba(210,225,255,0.9)' : 'rgba(150,175,220,0.7)', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.45 }}>
                  {entry.text}
                </span>
              </>)}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes voiceRingInner { 0%, 100% { transform: scale(1); opacity: 0.35; } 50% { transform: scale(1.12); opacity: 0.12; } }
        @keyframes voiceRingInnerFast { 0%, 100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.18); opacity: 0.2; } }
        @keyframes voiceRingMid { 0%, 100% { transform: scale(1); opacity: 0.25; } 50% { transform: scale(1.1); opacity: 0.08; } }
        @keyframes voiceRingOuter { 0%, 100% { transform: scale(1); opacity: 0.12; } 50% { transform: scale(1.06); opacity: 0.04; } }
        @keyframes voiceSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes voiceAmbient { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.6; } }
        @keyframes voiceBar { 0%, 100% { height: 4px; opacity: 0.4; } 50% { height: 20px; opacity: 0.9; } }
        @keyframes voiceDot { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.5); opacity: 0.8; } }
        @keyframes voiceLiveDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
})

export default VoiceChat

function MicIcon({ size = 24, color = '#6B7280', muted = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" stroke="#EF4444" strokeWidth="2" />}
    </svg>
  )
}