// Thin status bar shown while a voice message is recording or transcribing.
// NOTE (R2c): `recordingElapsed` is referenced here but pre-split ChatPanel
// never threaded it through ctx -- preserved verbatim, flagged for R3.
export default function RecordingStatusBar({
  isRecording,
  isTranscribing,
  recordingElapsed,
  handleMicToggle,
  micError,
}) {
  return (
    <div style={{
      flexShrink: 0, padding: '8px 16px',
      background: 'rgba(239,68,68,0.06)',
      borderTop: '1px solid rgba(239,68,68,0.15)',
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: isTranscribing ? '#F59E0B' : '#EF4444',
        animation: isTranscribing ? 'none' : 'recDot 1s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 500 }}>
        {isTranscribing ? 'Transcribing...' : `Recording ${Math.floor(recordingElapsed / 60)}:${String(recordingElapsed % 60).padStart(2, '0')}`}
      </span>
      {isRecording && (
        <button onClick={handleMicToggle} style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 600,
          color: '#EF4444', background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
          padding: '4px 10px', cursor: 'pointer',
        }}>Stop</button>
      )}
      {micError && <span style={{ fontSize: 12, color: '#F87171', marginLeft: 'auto' }}>{micError}</span>}
    </div>
  )
}
