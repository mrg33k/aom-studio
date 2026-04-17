// useChatRecording -- "telephone mode" long-form mic recording.
// Captures audio with MediaRecorder, transcribes via
// /api/dashboard/v2-transcribe-audio, then routes the text to whichever
// chat is active (agent or project) using the send refs supplied by
// ChatPanel. Extracted from ChatPanel.jsx (R2b split).
import { useCallback, useEffect, useRef, useState } from 'react'
import { blobToBase64 } from '../shared.jsx'

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

  useEffect(() => {
    if (!recordingStartTime) { setRecordingElapsed(0); return }
    const iv = setInterval(() => setRecordingElapsed(Math.floor((Date.now() - recordingStartTime) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [recordingStartTime])

  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      setRecordingStartTime(null)
    } else {
      setMicError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioChunksRef.current = []
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          stream.getTracks().forEach(t => t.stop())
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
            if (data.text?.trim()) {
              if (selectedAgent && sendAgentTextRef?.current) {
                await sendAgentTextRef.current(data.text.trim())
              } else if (selectedProject && sendProjectTextRef?.current) {
                await sendProjectTextRef.current(data.text.trim())
              }
            } else {
              setMicError('No speech detected. Try again.')
            }
          } catch (err) {
            console.error('[Telephone] transcription error:', err)
            setMicError('Failed to transcribe. Check your connection.')
          } finally {
            setIsTranscribing(false)
          }
        }
        recorder.start()
        mediaRecorderRef.current = recorder
        setIsRecording(true)
        setRecordingStartTime(Date.now())
      } catch (err) {
        console.error('Microphone access denied:', err)
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
    mediaRecorderRef,
    audioChunksRef,
    handleMicToggle,
  }
}
