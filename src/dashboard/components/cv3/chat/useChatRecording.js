// useChatRecording -- "telephone mode" long-form mic recording.
// Captures audio with MediaRecorder, transcribes via
// /api/dashboard/v2-transcribe-audio, then routes the text to whichever
// chat is active (agent or project) using the send refs supplied by
// ChatPanel. Extracted from ChatPanel.jsx (R2b split).
//
// 2026-05-12 hardening (chat-panel-voice-feedback): every silent failure
// in the original pipeline now surfaces to the status bar. Long audio gets
// a 60s fetch timeout so we don't hang forever on a stalled Gemini call.
// Successful dispatch sets lastTranscript so the bar can show "Sent" for
// ~2.5s after isTranscribing flips false.
import { useCallback, useEffect, useRef, useState } from 'react'
import { blobToBase64 } from '../shared.jsx'

const TRANSCRIBE_TIMEOUT_MS = 60_000
const LAST_TRANSCRIPT_TTL_MS = 2500

export default function useChatRecording({
  selectedAgent,
  selectedProject,
  sendAgentTextRef,
  sendProjectTextRef,
}) {
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [micError, setMicError] = useState(null)
  const [recordingStartTime, setRecordingStartTime] = useState(null)
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [lastTranscript, setLastTranscript] = useState(null)

  useEffect(() => {
    if (!recordingStartTime) { setRecordingElapsed(0); return }
    const iv = setInterval(() => setRecordingElapsed(Math.floor((Date.now() - recordingStartTime) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [recordingStartTime])

  // Auto-clear the "sent" toast after a short window so the status bar can
  // unmount cleanly once nothing is in flight.
  useEffect(() => {
    if (!lastTranscript) return
    const t = setTimeout(() => setLastTranscript(null), LAST_TRANSCRIPT_TTL_MS)
    return () => clearTimeout(t)
  }, [lastTranscript])

  // Auto-clear errors after a slightly longer window so users have time to read.
  useEffect(() => {
    if (!micError) return
    const t = setTimeout(() => setMicError(null), 5000)
    return () => clearTimeout(t)
  }, [micError])

  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      setRecordingStartTime(null)
    } else {
      setMicError(null)
      setLastTranscript(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioChunksRef.current = []
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          stream.getTracks().forEach(t => t.stop())
          if (!blob.size) {
 console.warn('[Telephone] empty recording, no audio captured')
            setMicError('Empty recording. Try again.')
            return
          }
          setIsTranscribing(true)
          const t0 = Date.now()
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS)
          try {
            const base64 = await blobToBase64(blob)
            const bytesB64 = base64.length
            console.log(`[Telephone] recording stopped: ${blob.size}B raw, ${bytesB64}B base64, ${(blob.size / 1024).toFixed(1)}KB blob`)
            const res = await fetch('/api/dashboard/v2-transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_base64: base64, mime_type: 'audio/webm' }),
              signal: controller.signal,
            })
            if (!res.ok) {
              const detail = await res.text().catch(() => '')
              console.error(`[Telephone] transcribe HTTP ${res.status}:`, detail)
              throw new Error(`HTTP ${res.status}`)
            }
            const data = await res.json()
            console.log(`[Telephone] transcribe ok in ${Date.now() - t0}ms, text length=${(data.text || '').length}`)
            const text = data.text?.trim()
            if (!text) {
              setMicError('No speech detected. Try again.')
              return
            }
            // Route to whichever chat surface is active. Both refs being
            // unpopulated (e.g. ChatPanel still mounting) used to drop the
            // transcript silently — now we surface it.
            const agentRef = sendAgentTextRef?.current
            const projectRef = sendProjectTextRef?.current
            if (selectedAgent && agentRef) {
              try {
                await agentRef(text)
                console.log(`[Telephone] dispatched to agent ${selectedAgent.slug}`)
                setLastTranscript(text)
              } catch (sendErr) {
                console.error('[Telephone] agent send threw:', sendErr)
                setMicError('Transcribed, but failed to send to agent.')
              }
            } else if (selectedProject && projectRef) {
              try {
                await projectRef(text)
                console.log(`[Telephone] dispatched to project ${selectedProject.slug}`)
                setLastTranscript(text)
              } catch (sendErr) {
                console.error('[Telephone] project send threw:', sendErr)
                setMicError('Transcribed, but failed to send to project.')
              }
            } else {
 console.warn('[Telephone] no send target, selectedAgent:', !!selectedAgent, 'agentRef:', !!agentRef, 'selectedProject:', !!selectedProject, 'projectRef:', !!projectRef)
              setMicError('Transcribed, but no chat is open to receive it.')
            }
          } catch (err) {
            if (err?.name === 'AbortError') {
              console.error(`[Telephone] transcribe timed out after ${TRANSCRIBE_TIMEOUT_MS}ms`)
              setMicError('Transcription timed out. Try a shorter recording.')
            } else {
              console.error('[Telephone] transcription error:', err)
              setMicError('Failed to transcribe. Check your connection.')
            }
          } finally {
            clearTimeout(timeoutId)
            setIsTranscribing(false)
          }
        }
        recorder.start()
        mediaRecorderRef.current = recorder
        setIsRecording(true)
        setRecordingStartTime(Date.now())
      } catch (err) {
        console.error('[Telephone] mic access denied:', err)
        setMicError('Microphone access denied. Allow mic in browser settings.')
      }
    }
  }, [isRecording, selectedAgent, selectedProject, sendAgentTextRef, sendProjectTextRef])

  return {
    isRecording,
    isTranscribing,
    micError,
    recordingStartTime,
    recordingElapsed,
    lastTranscript,
    mediaRecorderRef,
    audioChunksRef,
    handleMicToggle,
  }
}