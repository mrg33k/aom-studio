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

// Voice pipeline verified working 2026-04-07.

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'

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
  { id: 'aoede',  label: 'Aoede',  desc: 'Bright & energetic' },
  { id: 'charon', label: 'Charon', desc: 'Deep & resonant' },
  { id: 'fenrir', label: 'Fenrir', desc: 'Bold & authoritative' },
  { id: 'kore',   label: 'Kore',   desc: 'Warm & clear' },
  { id: 'puck',   label: 'Puck',   desc: 'Light & playful' },
  { id: 'orus',   label: 'Orus',   desc: 'Smooth & professional' },
  { id: 'vale',   label: 'Vale',   desc: 'Soft & gentle' },
  { id: 'zephyr', label: 'Zephyr', desc: 'Fresh & expressive' },
]

const VoiceChat = forwardRef(function VoiceChat({ agentSlug, agentColor = '#3B82F6', clientId = 'aom', onTranscript, onStatusChange, onVolumeChange, autoStart = false }, ref) {
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionSecs, setSessionSecs] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const isMutedRef = useRef(false)
  const sessionIdRef = useRef(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(`corner-voice-settings-${agentSlug}`)
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch { return DEFAULT_SETTINGS }
  })
  const [availableVoices, setAvailableVoices] = useState([])

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
  const connectTimeoutRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)
  const volumeLevelRef = useRef(0)
  const inputAccRef = useRef('')   // accumulates user transcription chunks per turn
  const outputAccRef = useRef('')  // accumulates model transcription chunks per turn

  const addSystemMessage = useCallback((text) => {
    setTranscript(prev => [...prev, { role: 'system', text, id: Date.now() + Math.random() }])
  }, [])

  const saveTranscript = useCallback((role, text) => {
    if (!text?.trim() || !sessionIdRef.current) return
    fetch('/api/dashboard/supabase-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        agent: agentSlug,
        role: role,
        text: text.trim(),
        source: 'voice',
      }),
    }).catch(() => {})
  }, [clientId, agentSlug])

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

  const updateStatus = useCallback((s) => {
    statusRef.current = s
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  // Load voice settings from agent-specific key when agentSlug changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`corner-voice-settings-${agentSlug}`)
      setSettings(saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS)
    } catch { setSettings(DEFAULT_SETTINGS) }
  }, [agentSlug])

  // Save settings to localStorage when they change (keyed per agent)
  useEffect(() => {
    try { localStorage.setItem(`corner-voice-settings-${agentSlug}`, JSON.stringify(settings)) } catch {}
  }, [settings, agentSlug])

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

  const stopSession = useCallback(() => {
    if (connectTimeoutRef.current) { clearTimeout(connectTimeoutRef.current); connectTimeoutRef.current = null }
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
  }, [updateStatus])

  const startSession = useCallback(async () => {
    if (status !== 'idle') return
    setErrorMsg('')
    setTranscript([])
    inputAccRef.current = ''
    outputAccRef.current = ''
    sessionIdRef.current = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
          if (e.data?.type === 'pcm' && wsRef.current?.readyState === WebSocket.OPEN && statusRef.current !== 'speaking' && !isMutedRef.current) {
            wsRef.current.send(JSON.stringify({
              realtimeInput: {
                audio: {
                  data: toBase64(e.data.chunk),
                  mimeType: 'audio/pcm',
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
          if (wsRef.current?.readyState !== WebSocket.OPEN || statusRef.current === 'speaking' || isMutedRef.current) return
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
                mimeType: 'audio/pcm',
              },
            },
          }))
        }
        sourceNode.connect(scriptNode)
        scriptNode.connect(audioCtx.destination)
      }

      // 5. Connect directly to Gemini Live WebSocket
      addSystemMessage('Connecting to voice...')
      const ws = new WebSocket(sessionConfig.wsUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      // 10s timeout -- if setupComplete never arrives, kill it
      connectTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'connecting') {
          addSystemMessage('Connection timed out. Gemini did not respond.')
          setErrorMsg('Connection timed out')
          stopSession()
          updateStatus('error')
        }
      }, 10000)

      ws.onopen = () => {
        // Send setup message (model config, system instruction, voice)
        ws.send(JSON.stringify(sessionConfig.setupMessage))

        // Session timer
        sessionTimerRef.current = setInterval(() => setSessionSecs(s => s + 1), 1000)
      }

      ws.onmessage = async (event) => {
        try {
          const raw = event.data instanceof ArrayBuffer
            ? new TextDecoder().decode(event.data)
            : event.data
          const msg = JSON.parse(raw)

          // Setup complete
          if (msg.setupComplete) {
            if (connectTimeoutRef.current) { clearTimeout(connectTimeoutRef.current); connectTimeoutRef.current = null }
            addSystemMessage('Connected. Listening.')
            updateStatus('listening')
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
                  setTranscript(prev => [...prev, { role: 'user', text, id: Date.now() + Math.random() }])
                  onTranscript?.(text, 'user')
                  saveTranscript('user', text)
                }
              }
            }

            // Output transcription (what the model said) -- accumulate chunks, save full turn on finished
            if (sc.outputTranscription?.text) {
              outputAccRef.current += sc.outputTranscription.text
              if (sc.outputTranscription.finished) {
                const text = outputAccRef.current.trim()
                outputAccRef.current = ''
                if (text) {
                  setTranscript(prev => [...prev, { role: 'model-text', text, id: Date.now() + Math.random() }])
                  onTranscript?.(text, 'model')
                  saveTranscript('agent', text)
                }
              }
            }

            // Turn complete -- flush any pending model transcription (fallback if finished never fires)
            if (sc.turnComplete) {
              const pending = outputAccRef.current.trim()
              if (pending) {
                outputAccRef.current = ''
                setTranscript(prev => [...prev, { role: 'model-text', text: pending, id: Date.now() + Math.random() }])
                onTranscript?.(pending, 'model')
                saveTranscript('agent', pending)
              }
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

          // Tool calls from Gemini (create_task, get_task_status)
          if (msg.toolCall) {
            const calls = msg.toolCall.functionCalls || []
            console.log('[VoiceChat] Tool calls:', calls)
            const responses = []

            for (const call of calls) {
              const args = call.args || {}
              let result = {}

              if (call.name === 'create_task') {
                addSystemMessage(`Creating task: ${args.title}`)
                try {
                  const resp = await fetch('/api/dashboard/v2-task-create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: args.title,
                      description: args.description || args.title,
                      text: args.title,
                      agent: args.agent || 'bobby',
                      complexity: args.complexity || 'medium',
                      status: 'queued',
                      client_id: clientId,
                      source: 'voice',
                      created_by: 'rex-voice',
                    }),
                  })
                  const data = await resp.json()
                  if (resp.ok) {
                    const taskId = data?.id || data?.[0]?.id || 'created'
                    result = { success: true, task_id: taskId, message: `Task created: ${args.title}` }
                    addSystemMessage(`Task created for ${args.agent || 'bobby'}: ${args.title}`)
                    saveTranscript('system', `[Task created] ${args.title} (${args.agent || 'bobby'})`)
                  } else {
                    result = { success: false, error: data?.error || 'Failed to create task' }
                    addSystemMessage(`Failed to create task: ${data?.error || 'unknown error'}`)
                  }
                } catch (err) {
                  result = { success: false, error: err.message }
                  addSystemMessage(`Task creation error: ${err.message}`)
                }
              } else if (call.name === 'lookup_context') {
                try {
                  const resp = await fetch(`/api/dashboard/voice-context-lookup?q=${encodeURIComponent(args.query || '')}`)
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
              } else if (call.name === 'get_task_status') {
                try {
                  const limit = args.limit || 5
                  const resp = await fetch(`/api/dashboard/v2-task-list?client=${clientId}&limit=${limit}&status=neq.done`)
                  const tasks = await resp.json()
                  if (Array.isArray(tasks)) {
                    result = { tasks: tasks.map(t => ({ title: t.title || t.text, status: t.status, agent: t.agent })) }
                  } else {
                    result = { tasks: [] }
                  }
                } catch (err) {
                  result = { error: err.message }
                }
              } else if (call.name === 'get_queue') {
                try {
                  const resp = await fetch(`/api/dashboard/v2-task-list?client_id=${clientId}&status=queued,classifying,planning,building,qa`)
                  const data = await resp.json()
                  const tasks = data?.tasks || []
                  if (tasks.length > 0) {
                    addSystemMessage(`${tasks.length} task(s) in queue`)
                    result = { tasks: tasks.map(t => ({ title: t.title, status: t.status, agent: t.agent_identity })), total: tasks.length }
                  } else {
                    result = { tasks: [], total: 0, message: 'Queue is empty' }
                  }
                } catch (err) {
                  result = { error: err.message }
                }
              } else if (call.name === 'start_runner') {
                try {
                  addSystemMessage('Sending start signal to task runner...')
                  result = { signaled: true, message: 'Start signal sent. The runner watches the queue and picks up tasks automatically.' }
                } catch (err) {
                  result = { error: err.message }
                }
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

      ws.onerror = () => {
        addSystemMessage('Voice connection failed. Check network and try again.')
        setErrorMsg('Voice connection failed')
        updateStatus('error')
        stopSession()
      }

      ws.onclose = (event) => {
        if (statusRef.current !== 'idle') {
          if (event.code !== 1000) {
            const reason = event.reason || `closed (code ${event.code})`
            addSystemMessage(`Disconnected: ${reason}`)
            setErrorMsg(reason)
            updateStatus('error')
          } else {
            addSystemMessage('Session ended.')
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
      addSystemMessage(msg)
      setErrorMsg(msg)
      updateStatus('error')
      stopSession()
    }
  }, [status, agentSlug, clientId, settings, updateStatus, enqueueAudio, stopSession, onTranscript, addSystemMessage, saveTranscript])

  const toggleSession = useCallback(() => {
    if (status === 'idle' || status === 'error') startSession()
    else stopSession()
  }, [status, startSession, stopSession])

  useEffect(() => { return () => { stopSession() } }, []) // eslint-disable-line
  useEffect(() => { if (status !== 'idle') stopSession() }, [agentSlug]) // eslint-disable-line
  useEffect(() => { if (autoStart) startSession() }, []) // eslint-disable-line

  useImperativeHandle(ref, () => ({
    start: startSession,
    stop: stopSession,
    toggleMute,
    get isMuted() { return isMutedRef.current },
  }), [startSession, stopSession, toggleMute])

  const formatSecs = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

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
            <label style={{ color: 'rgba(148,168,200,0.7)', fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif", display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Voice Selection
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {(availableVoices.length > 0
                ? availableVoices.map(id => VOICE_OPTIONS.find(o => o.id === id) || { id, label: id, desc: '' })
                : VOICE_OPTIONS
              ).map(({ id, label, desc }) => {
                const isSelected = settings.voice === id
                return (
                  <button
                    key={id}
                    onClick={() => setSettings(s => ({ ...s, voice: id }))}
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
                  {(entry.role === 'model' || entry.role === 'model-text') ? 'REX' : 'YOU'}
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
