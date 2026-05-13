import { useChatRecordingCtx } from '../chat/ChatPanelContext.jsx'

// Status strip above the composer in project chat. Mirrors thread/
// RecordingStatusBar -- four-phase render (recording / transcribing / sent /
// error) so success and failure are both visible after isTranscribing flips
// false. Hook owns auto-clear.
export default function ProjectRecordingStatusBar() {
  const {
    isRecording, isTranscribing, recordingElapsed, handleMicToggle, micError, lastTranscript,
  } = useChatRecordingCtx()

  const phase = isRecording
    ? 'recording'
    : isTranscribing
      ? 'transcribing'
      : micError
        ? 'error'
        : lastTranscript
          ? 'sent'
          : null
  if (!phase) return null

  const palette = {
    recording: { dot: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' },
    transcribing: { dot: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)' },
    sent: { dot: '#10B981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
    error: { dot: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' },
  }[phase]

  return (
    <div style={{
      flexShrink: 0, padding: '8px 16px',
      background: palette.bg,
      borderTop: `1px solid ${palette.border}`,
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: palette.dot,
        animation: phase === 'recording' ? 'recDot 1s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 500 }}>
        {phase === 'recording' && `Recording ${Math.floor(recordingElapsed / 60)}:${String(recordingElapsed % 60).padStart(2, '0')}`}
        {phase === 'transcribing' && 'Transcribing...'}
        {phase === 'sent' && 'Sent'}
        {phase === 'error' && micError}
      </span>
      {phase === 'recording' && (
        <button onClick={handleMicToggle} style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 600,
          color: '#EF4444', background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
          padding: '4px 10px', cursor: 'pointer',
        }}>Stop</button>
      )}
    </div>
  )
}
