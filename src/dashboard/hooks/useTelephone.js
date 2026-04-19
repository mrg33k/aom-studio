// useTelephone -- long-form "telephone mode" recording at the CornerV3 level.
//
// Vision: phone icon on /dashboard input bar. Click starts recording, click
// again stops. Recording must persist across tab navigation (Home/Tasks/Chat).
// On stop the audio is transcribed via /api/dashboard/v2-transcribe-audio
// (server-side Gemini Flash — the cheapest path we have) and the resulting
// text is posted to the active super-agent with a '[telephone transcript] '
// marker so the agent can distinguish it from a typed message.
//
// Intentionally independent of ChatPanel's in-thread useChatRecording: home
// bar lives above ChatPanel, survives Chat→Tasks nav, and always dispatches
// via the direct supabase-messages POST rather than going through the mount-
// gated send refs.
import { useCallback, useEffect, useRef, useState } from 'react'
import { blobToBase64 } from '../components/cv3/shared.jsx'

const TRANSCRIPT_PREFIX = '[telephone transcript] '

export default function useTelephone({ worldId, agents, selectedAgent, userIdentity }) {
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [micError, setMicError] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  // Resolve the target super-agent at stop-time via a ref so the user can
  // switch agents mid-recording without losing the dispatch target: selected
  // > rex (EA default) > first agent.
  const targetAgentRef = useRef(null)
  useEffect(() => {
    targetAgentRef.current =
      selectedAgent || agents?.find(a => a.slug === 'rex') || agents?.[0] || null
  }, [selectedAgent, agents])

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return }
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [startedAt])

  const postTranscript = useCallback(async (text) => {
    const target = targetAgentRef.current
    if (!target?.slug) { setMicError('No agent available to send transcript.'); return }
    try {
      await fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: target.slug,
          text: TRANSCRIPT_PREFIX + text,
          role: 'user',
          source: 'corner-dashboard',
          client_id: worldId,
          ...(userIdentity || {}),
        }),
      })
    } catch (err) {
      console.error('[telephone] dispatch failed:', err)
      setMicError('Failed to send transcript.')
    }
  }, [worldId, userIdentity])

  const stop = useCallback(() => {
    if (!isRecording) return
    try { mediaRecorderRef.current?.stop() } catch {}
    setIsRecording(false)
    setStartedAt(null)
  }, [isRecording])

  const start = useCallback(async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (!blob.size) return
        setIsTranscribing(true)
        try {
          const base64 = await blobToBase64(blob)
          const res = await fetch('/api/dashboard/v2-transcribe-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_base64: base64, mime_type: 'audio/webm' }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          const text = (data.text || '').trim()
          if (text) {
            await postTranscript(text)
          } else {
            setMicError('No speech detected. Try again.')
          }
        } catch (err) {
          console.error('[telephone] transcription error:', err)
          setMicError('Failed to transcribe. Check your connection.')
        } finally {
          setIsTranscribing(false)
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setStartedAt(Date.now())
    } catch (err) {
      console.error('[telephone] mic access denied:', err)
      setMicError('Microphone access denied. Allow mic in browser settings.')
    }
  }, [postTranscript])

  const toggle = useCallback(() => {
    if (isRecording) stop()
    else start()
  }, [isRecording, start, stop])

  // Safety net: if CornerV3 ever unmounts mid-recording (logout), release
  // the mic instead of leaving a dangling MediaStream.
  useEffect(() => () => {
    try { mediaRecorderRef.current?.stop() } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  return { isRecording, isTranscribing, micError, elapsed, toggle, stop }
}
