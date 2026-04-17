// "Call in progress" banner shown at top of ConversationsView when a voice
// call is minimized. Tap to return to the call. Extracted verbatim from
// ConversationsView during R2e split.

export default function CallInProgressBanner({
  voiceMinimized,
  isVoiceActive,
  voiceMinimizedAgent,
  setInlineProject,
  onSelectProject,
  setSelectedAgent,
  onSelectAgent,
  setVoiceMinimized,
}) {
  if (!(voiceMinimized && isVoiceActive && voiceMinimizedAgent.current)) return null
  return (
    <button
      onClick={() => {
        const saved = voiceMinimizedAgent.current
        if (saved?.type === 'project') {
          setInlineProject(saved.data)
          onSelectProject?.(saved.data)
        } else if (saved?.type === 'agent') {
          setSelectedAgent(saved.data)
          onSelectAgent?.(saved.data)
        }
        setVoiceMinimized(false)
      }}
      style={{
        width: '100%', padding: '10px 14px', marginBottom: 12,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 10, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10,
        color: '#10B981',
      }}
    >
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: '#10B981',
        animation: 'pulse 1.5s ease-in-out infinite',
        boxShadow: '0 0 8px rgba(16,185,129,0.5)',
      }} />
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
        Call in progress with {voiceMinimizedAgent.current?.data?.name || 'agent'}
      </span>
      <span style={{ fontSize: 12, color: 'rgba(16,185,129,0.7)', marginLeft: 'auto' }}>
        Tap to return
      </span>
    </button>
  )
}
