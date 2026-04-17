import { useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import SlashCommandAutocomplete from '../SlashCommandAutocomplete.jsx'
import { ReplyToChip } from '../ContextMenu.jsx'

// The CV3-pill input bar for the project-chat room. Handles slash-command
// autocomplete (via caret tracking), file attach button, voice start/send
// toggle, and the reply-to chip. Enter fires sendProjectText(input).
export default function ProjectInputBar({
  input,
  setInput,
  inputRef,
  fileInputRef,
  chatInputFocused,
  setChatInputFocused,
  sending,
  uploading,
  selectedProject,
  sendProjectText,
  handleFileSelection,
  setIsVoiceActive,
  isVoiceActive,
  replyTo,
  setReplyTo,
}) {
  const [caret, setCaret] = useState(null)
  const updateCaret = (e) => setCaret(e?.target?.selectionStart ?? null)

  return (
    <div style={{
      flexShrink: 0,
      padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
      background: C.bg,
      borderTop: '1px solid ' + C.border,
    }}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleFileSelection}
      />
      {replyTo && (
        <ReplyToChip target={replyTo} onDismiss={() => setReplyTo(null)} />
      )}
      <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
        <SlashCommandAutocomplete
          value={input}
          setValue={setInput}
          inputRef={inputRef}
          caret={caret}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: C.s1,
          border: '1.5px solid ' + (chatInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 16px',
          boxShadow: chatInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); updateCaret(e) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!input.trim() || sending) return
                sendProjectText(input)
                setInput('')
              }
            }}
            onKeyUp={updateCaret}
            onClick={updateCaret}
            onSelect={updateCaret}
            onFocus={(e) => { setChatInputFocused(true); updateCaret(e) }}
            onBlur={() => setChatInputFocused(false)}
            placeholder={`Message ${selectedProject?.name || 'project'}...`}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: C.text,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              title="Attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: uploading ? C.accent : C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {uploading ? (
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
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
          {!input.trim() && (
            <button
              title={isVoiceActive ? 'End voice' : 'Start voice'}
              onClick={() => setIsVoiceActive(true)}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent,
                border: 'none',
                color: '#000', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.15s, background 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#000"
                strokeWidth="2.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
          )}
          {input.trim() && (
            <button
              title="Send"
              onClick={() => {
                if (!input.trim() || sending) return
                sendProjectText(input)
                setInput('')
              }}
              disabled={sending}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent, border: 'none',
                color: '#000', cursor: sending ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, opacity: sending ? 0.6 : 1,
                transition: 'transform 0.15s',
              }}
            >
              {sending ? (
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
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
    </div>
  )
}
