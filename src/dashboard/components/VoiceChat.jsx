// VoiceChat.jsx
// Gemini Live voice chat component.
//
// Architecture:
//   Browser mic (getUserMedia) -> AudioWorklet/ScriptProcessor -> PCM 16kHz mono
//   -> base64 encode -> WebSocket -> Supabase Edge Function (voice-live)
//   -> Gemini Live API -> audio response -> base64 PCM chunks
//   -> browser AudioContext -> playback queue
//
// Props:
//   agentSlug   - agent identifier ("bobby", "elon", etc.)
//   agentColor  - hex color for UI accents
//   clientId    - tenant ID
//   onTranscript(text, role) - called when transcript arrives (text, 'user'|'model')
//   onStatusChange(status)   - 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'

import React, { useState, useEffect, useRef, useCallback } from 'react'

// Supabase Edge Function URL for voice proxy
// Override via VITE_VOICE_WS_URL env var for local dev
const VOICE_WS_BASE = import.meta.env?.VITE_VOICE_WS_URL
  || (() => {
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || ''
    // Convert https://xxx.supabase.co -> wss://xxx.supabase.co/functions/v1/voice-live
    return supabaseUrl.replace('https://', 'wss://') + '/functions/v1/voice-live'
  })()

// Target sample rate for Gemini Live
const TARGET_SAMPLE_RATE = 16000

// AudioWorklet processor code (inlined as blob URL to avoid extra file)
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

    // input[0] is Float32 at the context's sample rate (not necessarily 16kHz)
    // Downmix to mono (already mono from getUserMedia constraint)
    const samples = input[0]

    for (let i = 0; i < samples.length; i++) {
      // Clamp and convert Float32 -> Int16
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
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(b64) {
  const binary = atob(b64)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i)
  }
  return buffer
}

// PCM Int16 buffer -> AudioBuffer at target sample rate
function pcmToAudioBuffer(audioCtx, rawBuffer, sampleRate = TARGET_SAMPLE_RATE) {
  const int16 = new Int16Array(rawBuffer)
  const floatData = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    floatData[i] = int16[i] / 32768.0
  }
  const audioBuffer = audioCtx.createBuffer(1, floatData.length, sampleRate)
  audioBuffer.copyToChannel(floatData, 0)
  return audioBuffer
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VoiceChat({ agentSlug, agentColor = '#3B82F6', clientId = 'aom', onTranscript, onStatusChange }) {
  const [status, setStatus] = useState('idle') // idle | connecting | listening | speaking | error
  const [transcript, setTranscript] = useState([]) // { role, text, id }
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionSecs, setSessionSecs] = useState(0) // elapsed seconds for UI

  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const workletNodeRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const workletBlobUrlRef = useRef(null)
  const playQueueRef = useRef([]) // pending AudioBuffers to play
  const isPlayingRef = useRef(false)
  const pingIntervalRef = useRef(null)
  const sessionTimerRef = useRef(null)
  const resamplerRef = useRef(null) // OfflineAudioContext for resampling

  const updateStatus = useCallback((s) => {
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  // Sequential audio playback queue
  const playNextChunk = useCallback(() => {
    if (isPlayingRef.current || playQueueRef.current.length === 0) return
    const audioCtx = audioCtxRef.current
    if (!audioCtx) return

    isPlayingRef.current = true
    updateStatus('speaking')

    const buffer = playQueueRef.current.shift()
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    source.connect(audioCtx.destination)
    source.onended = () => {
      isPlayingRef.current = false
      if (playQueueRef.current.length > 0) {
        playNextChunk()
      } else {
        updateStatus('listening')
      }
    }
    source.start()
  }, [updateStatus])

  const enqueueAudio = useCallback((rawBuffer) => {
    const audioCtx = audioCtxRef.current
    if (!audioCtx) return
    try {
      const audioBuf = pcmToAudioBuffer(audioCtx, rawBuffer)
      playQueueRef.current.push(audioBuf)
      if (!isPlayingRef.current) playNextChunk()
    } catch (_) { /* malformed chunk, skip */ }
  }, [playNextChunk])

  // Resample a Float32Array from deviceSampleRate -> 16kHz using OfflineAudioContext
  const resampleToTarget = useCallback(async (float32Data, deviceSampleRate) => {
    if (deviceSampleRate === TARGET_SAMPLE_RATE) return float32Data

    const frameCount = Math.round(float32Data.length * TARGET_SAMPLE_RATE / deviceSampleRate)
    const offlineCtx = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE)
    const srcBuffer = offlineCtx.createBuffer(1, float32Data.length, deviceSampleRate)
    srcBuffer.copyToChannel(float32Data, 0)
    const src = offlineCtx.createBufferSource()
    src.buffer = srcBuffer
    src.connect(offlineCtx.destination)
    src.start()
    const rendered = await offlineCtx.startRendering()
    return rendered.getChannelData(0)
  }, [])

  const stopSession = useCallback(() => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null }
    if (sessionTimerRef.current) { clearInterval(sessionTimerRef.current); sessionTimerRef.current = null }

    // Disconnect mic
    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect() } catch (_) {} sourceNodeRef.current = null }
    if (workletNodeRef.current) { try { workletNodeRef.current.disconnect() } catch (_) {} workletNodeRef.current = null }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        try { wsRef.current.send(JSON.stringify({ type: 'disconnect' })) } catch (_) {}
        try { wsRef.current.close() } catch (_) {}
      }
      wsRef.current = null
    }

    // Close AudioContext
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch (_) {}
      audioCtxRef.current = null
    }

    // Revoke worklet blob URL
    if (workletBlobUrlRef.current) {
      URL.revokeObjectURL(workletBlobUrlRef.current)
      workletBlobUrlRef.current = null
    }

    playQueueRef.current = []
    isPlayingRef.current = false
    setSessionSecs(0)
    updateStatus('idle')
  }, [updateStatus])

  const startSession = useCallback(async () => {
    if (status !== 'idle') return
    setErrorMsg('')
    updateStatus('connecting')

    try {
      // 1. Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      mediaStreamRef.current = stream

      // 2. Create AudioContext
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: TARGET_SAMPLE_RATE,
        latencyHint: 'interactive',
      })
      audioCtxRef.current = audioCtx

      // Resume context (required for Safari)
      if (audioCtx.state === 'suspended') await audioCtx.resume()

      // 3. Set up capture: try AudioWorklet, fall back to ScriptProcessorNode
      const sourceNode = audioCtx.createMediaStreamSource(stream)
      sourceNodeRef.current = sourceNode

      let captureReady = false

      try {
        const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' })
        const blobUrl = URL.createObjectURL(blob)
        workletBlobUrlRef.current = blobUrl
        await audioCtx.audioWorklet.addModule(blobUrl)

        const workletNode = new AudioWorkletNode(audioCtx, 'pcm-capture')
        workletNodeRef.current = workletNode

        workletNode.port.onmessage = (e) => {
          if (e.data?.type === 'pcm' && wsRef.current?.readyState === WebSocket.OPEN) {
            const b64 = toBase64(e.data.chunk)
            wsRef.current.send(JSON.stringify({ type: 'audio', data: b64 }))
          }
        }

        sourceNode.connect(workletNode)
        captureReady = true
      } catch (_) {
        // AudioWorklet failed (older browser) -- use ScriptProcessorNode
      }

      if (!captureReady) {
        const bufferSize = 4096
        const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1)
        workletNodeRef.current = scriptNode // store for cleanup

        scriptNode.onaudioprocess = (e) => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) return
          const float32 = e.inputBuffer.getChannelData(0)
          const int16 = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]))
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          const b64 = toBase64(int16.buffer)
          wsRef.current.send(JSON.stringify({ type: 'audio', data: b64 }))
        }

        sourceNode.connect(scriptNode)
        scriptNode.connect(audioCtx.destination) // required for ScriptProcessorNode to fire
      }

      // 4. Open WebSocket to Supabase Edge Function
      const wsUrl = `${VOICE_WS_BASE}?agent=${encodeURIComponent(agentSlug)}&client_id=${encodeURIComponent(clientId)}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        // Start ping keepalive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)

        // Session timer
        sessionTimerRef.current = setInterval(() => {
          setSessionSecs(s => s + 1)
        }, 1000)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === 'setup_complete') {
            updateStatus('listening')
            return
          }

          if (msg.type === 'audio' && msg.data) {
            const rawBuffer = fromBase64(msg.data)
            enqueueAudio(rawBuffer)
            return
          }

          if (msg.type === 'transcript') {
            const entry = { role: msg.role, text: msg.text, id: Date.now() + Math.random() }
            setTranscript(prev => [...prev, entry])
            onTranscript?.(msg.text, msg.role)
            return
          }

          if (msg.type === 'turn_complete') {
            // Agent finished speaking -- if queue empty, go back to listening
            if (playQueueRef.current.length === 0 && !isPlayingRef.current) {
              updateStatus('listening')
            }
            return
          }

          if (msg.type === 'interrupted') {
            // User interrupted agent -- clear play queue
            playQueueRef.current = []
            isPlayingRef.current = false
            updateStatus('listening')
            return
          }

          if (msg.type === 'error') {
            setErrorMsg(msg.message || 'Voice session error')
            updateStatus('error')
            stopSession()
            return
          }
        } catch (_) { /* malformed message */ }
      }

      ws.onerror = () => {
        setErrorMsg('Voice connection failed. Check that the voice-live function is deployed.')
        updateStatus('error')
        stopSession()
      }

      ws.onclose = () => {
        if (status !== 'idle') {
          updateStatus('idle')
        }
      }

    } catch (err) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone access denied. Allow mic permission and try again.'
        : err?.name === 'NotFoundError'
        ? 'No microphone found. Plug in a mic and try again.'
        : `Failed to start voice: ${err?.message || err}`
      setErrorMsg(msg)
      updateStatus('error')
      stopSession()
    }
  }, [status, agentSlug, clientId, updateStatus, enqueueAudio, stopSession, onTranscript])

  const toggleSession = useCallback(() => {
    if (status === 'idle' || status === 'error') {
      startSession()
    } else {
      stopSession()
    }
  }, [status, startSession, stopSession])

  // Cleanup on unmount or agent switch
  useEffect(() => {
    return () => {
      stopSession()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When agentSlug changes, stop current session (parent will remount or user toggles)
  useEffect(() => {
    if (status !== 'idle') stopSession()
  }, [agentSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatSecs = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const isActive = status !== 'idle' && status !== 'error'
  const accent = agentColor

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Main voice control area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: '24px 20px',
      }}>
        {/* Mic button */}
        <button
          onClick={toggleSession}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: `2px solid ${isActive ? accent : 'rgba(255,255,255,0.15)'}`,
            background: isActive ? `${accent}22` : 'rgba(255,255,255,0.05)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 200ms ease',
            outline: 'none',
            position: 'relative',
          }}
        >
          {/* Pulse ring when listening */}
          {status === 'listening' && (
            <div style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: `2px solid ${accent}`,
              opacity: 0.4,
              animation: 'voicePulse 1.5s ease-in-out infinite',
            }} />
          )}
          {/* Waveform rings when speaking */}
          {status === 'speaking' && (
            <>
              <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `2px solid ${accent}`, opacity: 0.5, animation: 'voiceWave 0.8s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: `2px solid ${accent}`, opacity: 0.25, animation: 'voiceWave 0.8s ease-in-out 0.2s infinite' }} />
            </>
          )}
          <MicIcon
            size={32}
            color={isActive ? accent : '#6B7280'}
            muted={status === 'idle' || status === 'error'}
          />
        </button>

        {/* Status label */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}>
          <span style={{
            color: status === 'error' ? '#F87171' : isActive ? accent : '#6B7280',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {status === 'idle' && 'Tap to speak'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'listening' && 'Listening'}
            {status === 'speaking' && 'Responding'}
            {status === 'error' && 'Error'}
          </span>
          {isActive && (
            <span style={{ color: '#4B5563', fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {formatSecs(sessionSecs)} / 5:00
            </span>
          )}
          {status === 'error' && errorMsg && (
            <span style={{
              color: '#9CA3AF',
              fontSize: 11,
              fontFamily: "'Inter', system-ui, sans-serif",
              textAlign: 'center',
              maxWidth: 240,
              lineHeight: 1.4,
            }}>
              {errorMsg}
            </span>
          )}
        </div>
      </div>

      {/* Transcript area */}
      {transcript.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(59,130,246,0.08)',
          padding: '12px 16px',
          maxHeight: 120,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {transcript.slice(-8).map(entry => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <span style={{
                color: entry.role === 'model' ? accent : '#6B7280',
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                flexShrink: 0,
                paddingTop: 1,
                minWidth: 28,
              }}>
                {entry.role === 'model' ? 'AI' : 'You'}
              </span>
              <span style={{
                color: entry.role === 'model' ? '#D1D5DB' : '#9CA3AF',
                fontSize: 12,
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.4,
              }}>
                {entry.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes voicePulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.15; }
        }
        @keyframes voiceWave {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}

// Inline mic icon (avoids adding lucide dep for a single SVG)
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
