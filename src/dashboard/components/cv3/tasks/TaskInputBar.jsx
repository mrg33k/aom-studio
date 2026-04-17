// TaskInputBar -- bottom task creation input + voice recording UI
// R2a (Apr 16, 2026): extracted from TasksPanel.jsx
// R3a (Apr 17, 2026): reads from TasksPanelContext instead of props
import { C } from '../../../lib/cv3Colors.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export default function TaskInputBar() {
  const {
    taskInput,
    setTaskInput,
    taskInputFocused,
    setTaskInputFocused,
    taskSubmitting,
    taskInputRef,
    isRecording,
    toggleVoiceRecording,
    handleTaskSubmit,
    handleTaskInputKeyDown,
  } = useTasksPanelCtx()

  return (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
      background: C.bg,
      borderTop: '1px solid rgba(255,255,255,0.03)',
    }}>
      {/* Recording indicator */}
      {isRecording && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#EF4444',
            animation: 'rec-dot 1s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#EF4444',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>Recording</span>
        </div>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: isRecording ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
        border: '1.5px solid ' + (isRecording ? 'rgba(239,68,68,0.25)' : taskInputFocused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'),
        borderRadius: 28,
        padding: '6px 6px 6px 18px',
        maxWidth: 560,
        margin: '0 auto',
        boxShadow: isRecording ? '0 0 0 4px rgba(239,68,68,0.04)' : taskInputFocused ? '0 0 0 4px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.3)' : 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
      }}>
        <input
          ref={taskInputRef}
          type="text"
          placeholder={isRecording ? 'Listening...' : 'Add a task...'}
          value={taskInput}
          onChange={e => setTaskInput(e.target.value)}
          onFocus={() => setTaskInputFocused(true)}
          onBlur={() => setTaskInputFocused(false)}
          onKeyDown={handleTaskInputKeyDown}
          disabled={isRecording}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: isRecording ? 'rgba(239,68,68,0.5)' : C.text,
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {!isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button title="Attach" onClick={() => {}} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <button title="Commands" onClick={() => {}} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </button>
          </div>
        )}
        {(!taskInput.trim() || isRecording) && (
          <button
            title={isRecording ? 'Stop recording' : 'Voice'}
            onClick={toggleVoiceRecording}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: isRecording ? '#EF4444' : C.accent,
              border: 'none',
              color: '#000', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              animation: isRecording ? 'rec-pulse 1.2s ease-in-out infinite' : 'none',
              transition: 'background 0.2s',
            }}
          >
            {isRecording ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            )}
          </button>
        )}
        {taskInput.trim() && (
          <button
            title="Create task"
            onClick={handleTaskSubmit}
            disabled={taskSubmitting}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: C.accent, border: 'none',
              color: '#000', cursor: taskSubmitting ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              opacity: taskSubmitting ? 0.6 : 1,
              transition: 'transform 0.15s',
            }}
          >
            {taskSubmitting ? (
              <div style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.15)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
