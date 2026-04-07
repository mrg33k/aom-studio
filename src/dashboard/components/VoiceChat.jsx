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
//   agentColor  - hex color for UI accents
//   clientId    - tenant ID
//   onTranscript(text, role) - called when transcript arrives
//   onStatusChange(status)   - 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'

import React, { useState, useEffect, useRef, useCallback } from 'react'

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

export default function VoiceChat({ agentSlug, agentColor = '#3B82F6', clientId = 'aom', onTranscript, onStatusChange }) {
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionSecs, setSessionSecs] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('corner-voice-settings')
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch { return DEFAULT_SETTINGS }
  })
  const [availableVoices, setAvailableVoices] = useState([])

  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const workletNodeRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const workletBlobUrlRef = useRef(null)
  const playQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const pingIntervalRef = useRef(null)
  const sessionTimerRef = useRef(null)

  const updateStatus = useCallback((s) => {
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  // Save settings to localStorage when they change
  useEffect(() => {
    try { localStorage.setItem('corner-voice-settings', JSON.stringify(settings)) } catch {}
  }, [settings])

  // Sequential audio playback
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
      if (playQueueRef.current.length > 0) playNextChunk()
      else updateStatus('listening')
    }
    source.start()
  }, [updateStatus])

  const enqueueAudio = useCallback((rawBuffer) => {
    const audioCtx = audioCtxRef.current
    if (!audioCtx) return
    try {
      const audioBuf = pcmToAudioBuffer(audioCtx, rawBuffer, GEMINI_OUTPUT_RATE)
      playQueueRef.current.push(audioBuf)
      if (!isPlayingRef.current) playNextChunk()
    } catch (_) {}
  }, [playNextChunk])

  const stopSession = useCallback(() => {
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
    if (workletBlobUrlRef.current) { URL.revokeObjectURL(workletBlobUrlRef.current); workletBlobUrlRef.current = null }
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
      // 1. Fetch session config from our API
      const sessionRes = await fetch('/api/dashboard/voice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentSlug,
          client_id: clientId,
          voice: settings.voice,
          temperature: settings.temperature,
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

      // 3. Create AudioContext
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: TARGET_SAMPLE_RATE,
        latencyHint: 'interactive',
      })
      audioCtxRef.current = audioCtx
      if (audioCtx.state === 'suspended') await audioCtx.resume()

      // 4. Set up mic capture
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
            // Send audio in Gemini Live format
            wsRef.current.send(JSON.stringify({
              realtimeInput: {
                mediaChunks: [{
                  mimeType: 'audio/pcm;rate=16000',
                  data: toBase64(e.data.chunk),
                }],
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
          if (wsRef.current?.readyState !== WebSocket.OPEN) return
          const float32 = e.inputBuffer.getChannelData(0)
          const int16 = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]))
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'audio/pcm;rate=16000',
                data: toBase64(int16.buffer),
              }],
            },
          }))
        }
        sourceNode.connect(scriptNode)
        scriptNode.connect(audioCtx.destination)
      }

      // 5. Connect directly to Gemini Live WebSocket
      const ws = new WebSocket(sessionConfig.wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        // Send setup message (model config, system instruction, voice)
        ws.send(JSON.stringify(sessionConfig.setupMessage))

        // Keepalive ping
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ clientContent: { turnComplete: true } }))
          }
        }, 25000)

        // Session timer
        sessionTimerRef.current = setInterval(() => setSessionSecs(s => s + 1), 1000)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          // Setup complete
          if (msg.setupComplete) {
            updateStatus('listening')
            return
          }

          // Server content (audio, text, turn complete)
          if (msg.serverContent) {
            const sc = msg.serverContent

            // Model turn with audio/text parts
            if (sc.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                // Audio chunk
                if (part.inlineData?.data) {
                  const rawBuffer = fromBase64(part.inlineData.data)
                  enqueueAudio(rawBuffer)
                }
                // Text transcript from model
                if (part.text) {
                  setTranscript(prev => [...prev, { role: 'model', text: part.text, id: Date.now() + Math.random() }])
                  onTranscript?.(part.text, 'model')
                }
              }
            }

            // Turn complete
            if (sc.turnComplete) {
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

          // Tool calls (if any, for future use)
          if (msg.toolCall) {
            // For now, just log
            console.log('[VoiceChat] Tool call:', msg.toolCall)
            return
          }

        } catch (_) {}
      }

      ws.onerror = () => {
        setErrorMsg('Voice connection failed. Check network and try again.')
        updateStatus('error')
        stopSession()
      }

      ws.onclose = (event) => {
        if (status !== 'idle') {
          if (event.code !== 1000) {
            setErrorMsg(`Connection closed: ${event.reason || 'unknown'}`)
            updateStatus('error')
          } else {
            updateStatus('idle')
          }
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
  }, [status, agentSlug, clientId, settings, updateStatus, enqueueAudio, stopSession, onTranscript])

  const toggleSession = useCallback(() => {
    if (status === 'idle' || status === 'error') startSession()
    else stopSession()
  }, [status, startSession, stopSession])

  useEffect(() => { return () => { stopSession() } }, []) // eslint-disable-line
  useEffect(() => { if (status !== 'idle') stopSession() }, [agentSlug]) // eslint-disable-line

  const formatSecs = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const isActive = status !== 'idle' && status !== 'error'
  const statusColor = { idle: '#4B5563', connecting: '#F59E0B', listening: '#60A5FA', speaking: '#34D399', error: '#F87171' }[status] || agentColor
  const statusLabel = { idle: 'Tap to speak', connecting: 'Connecting', listening: 'Listening', speaking: 'Responding', error: 'Error' }[status] || status

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

          {/* Voice selector */}
          <div>
            <label style={{ color: 'rgba(148,168,200,0.7)', fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif", display: 'block', marginBottom: 4 }}>
              Voice
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(availableVoices.length > 0 ? availableVoices : ['aoede', 'charon', 'fenrir', 'kore', 'puck', 'orus', 'vale', 'zephyr']).map(v => (
                <button
                  key={v}
                  onClick={() => setSettings(s => ({ ...s, voice: v }))}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    fontFamily: "'Inter', sans-serif", cursor: 'pointer', transition: 'all 0.15s',
                    background: settings.voice === v ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.04)',
                    border: settings.voice === v ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    color: settings.voice === v ? '#60A5FA' : 'rgba(148,168,200,0.7)',
                    textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
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
        {/* Settings gear (top right) */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: showSettings ? '#60A5FA' : 'rgba(100,130,180,0.4)',
            padding: 4, transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>

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
          onClick={toggleSession}
          style={{
            width: 88, height: 88, borderRadius: '50%',
            border: `2px solid ${isActive ? statusColor + 'AA' : 'rgba(100,130,180,0.2)'}`,
            background: isActive
              ? `radial-gradient(circle at 40% 35%, ${statusColor}30 0%, ${statusColor}10 60%, transparent 100%)`
              : 'radial-gradient(circle at 40% 35%, rgba(100,140,220,0.12) 0%, rgba(60,90,160,0.06) 100%)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)', outline: 'none', position: 'relative',
            boxShadow: isActive
              ? `0 0 0 1px ${statusColor}33, 0 8px 32px ${statusColor}25, inset 0 1px 0 rgba(255,255,255,0.08)`
              : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
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
          {status === 'connecting' && (
            <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid transparent', borderTopColor: statusColor, animation: 'voiceSpin 0.8s linear infinite' }} />
          )}
          <MicIcon size={34} color={isActive ? statusColor : '#4B6080'} muted={status === 'idle' || status === 'error'} />
        </button>

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
        <div style={{ borderTop: '1px solid rgba(59,130,246,0.12)', padding: '10px 16px 14px', maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {transcript.slice(-8).map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: entry.role === 'model' ? agentColor : 'rgba(100,130,180,0.7)', fontSize: 9, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, paddingTop: 2, minWidth: 26 }}>
                {entry.role === 'model' ? 'AI' : 'You'}
              </span>
              <span style={{ color: entry.role === 'model' ? 'rgba(210,225,255,0.9)' : 'rgba(150,175,220,0.7)', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.45 }}>
                {entry.text}
              </span>
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
}

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
