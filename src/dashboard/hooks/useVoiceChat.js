// useVoiceChat.js -- Voice session lifecycle hook
// Manages WebSocket to voice-live edge function + mic capture + audio playback

import { useState, useRef, useCallback, useEffect } from 'react'
import { createMicStream, createPlaybackQueue, pcmDecode } from '../lib/audioUtils.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const KEEPALIVE_INTERVAL_MS = 30_000

function buildWsUrl(agentSlug, clientId) {
  // Convert https://xxx.supabase.co -> wss://xxx.supabase.co
  const base = SUPABASE_URL.replace(/^https?/, 'wss').replace(/\/$/, '')
  return `${base}/functions/v1/voice-live?agent=${encodeURIComponent(agentSlug)}&client_id=${encodeURIComponent(clientId)}&apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}`
}

export function useVoiceChat({ agentSlug, clientId, onTranscript }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const micRef = useRef(null)
  const playbackRef = useRef(null)
  const keepaliveRef = useRef(null)
  const closedRef = useRef(false)

  const cleanup = useCallback((err) => {
    closedRef.current = true
    clearInterval(keepaliveRef.current)

    if (micRef.current) {
      micRef.current.stop()
      micRef.current = null
    }
    if (playbackRef.current) {
      playbackRef.current.stop()
      playbackRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (wsRef.current) {
      const ws = wsRef.current
      wsRef.current = null
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try { ws.send(JSON.stringify({ type: 'disconnect' })) } catch (_) {}
        try { ws.close() } catch (_) {}
      }
    }

    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    if (err) setError(err)
  }, [])

  const connect = useCallback(async () => {
    if (isConnected) return
    setError(null)
    closedRef.current = false

    // Request mic permission first -- gives clear UX before WS overhead
    let audioCtx
    let mic
    try {
      audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
    } catch (e) {
      setError('Web Audio API not supported in this browser.')
      return
    }

    try {
      mic = await createMicStream(audioCtx, (base64Chunk) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'audio', data: base64Chunk }))
        }
      })
      micRef.current = mic
      setIsListening(true)
    } catch (e) {
      audioCtx.close().catch(() => {})
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow mic permission and try again.')
      } else {
        setError('Could not access microphone: ' + (e.message || e.name))
      }
      return
    }

    // Open WebSocket
    const wsUrl = buildWsUrl(agentSlug, clientId)
    let ws
    try {
      ws = new WebSocket(wsUrl)
      wsRef.current = ws
    } catch (e) {
      cleanup('Failed to open voice connection.')
      return
    }

    const playback = createPlaybackQueue(audioCtx)
    playbackRef.current = playback

    ws.onopen = () => {
      if (closedRef.current) { ws.close(); return }
      setIsConnected(true)
      // Start keepalive
      keepaliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, KEEPALIVE_INTERVAL_MS)
    }

    ws.onclose = () => {
      if (!closedRef.current) cleanup(null)
    }

    ws.onerror = () => {
      cleanup('Voice connection error. Check your network and try again.')
    }

    ws.onmessage = (event) => {
      if (closedRef.current) return
      try {
        const msg = JSON.parse(event.data)

        if (msg.type === 'setup_complete') {
          // Ready to talk
          return
        }

        if (msg.type === 'audio' && msg.data) {
          const float32 = pcmDecode(msg.data)
          playback.enqueue(float32)
          setIsSpeaking(true)
          return
        }

        if (msg.type === 'transcript' && msg.text) {
          const entry = { role: msg.role, text: msg.text, time: new Date().toISOString() }
          setTranscript(prev => [...prev, entry])
          return
        }

        if (msg.type === 'turn_complete') {
          setIsSpeaking(false)
          // Flush accumulated transcript to chat
          setTranscript(prev => {
            if (prev.length === 0) return prev
            prev.forEach(entry => {
              onTranscript?.({
                id: crypto.randomUUID(),
                role: entry.role === 'user' ? 'user' : 'assistant',
                content: entry.text,
                time: entry.time,
                source: 'voice',
              })
            })
            return []
          })
          return
        }

        if (msg.type === 'interrupted') {
          setIsSpeaking(false)
          return
        }

        if (msg.type === 'error') {
          cleanup(msg.message || 'Voice session error.')
          return
        }
      } catch (_) {}
    }
  }, [agentSlug, clientId, isConnected, cleanup, onTranscript])

  const disconnect = useCallback(() => {
    cleanup(null)
  }, [cleanup])

  // Disconnect on unmount or agent/client change
  useEffect(() => {
    return () => { cleanup(null) }
  }, [cleanup])

  // Disconnect when agent changes mid-session
  const prevAgent = useRef(agentSlug)
  useEffect(() => {
    if (prevAgent.current !== agentSlug && isConnected) {
      cleanup(null)
    }
    prevAgent.current = agentSlug
  }, [agentSlug, isConnected, cleanup])

  return { isConnected, isListening, isSpeaking, transcript, error, connect, disconnect }
}
