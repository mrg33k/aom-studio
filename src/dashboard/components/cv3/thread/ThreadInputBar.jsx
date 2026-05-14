import { useState, useCallback, useEffect } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import SlashCommandAutocomplete from '../SlashCommandAutocomplete.jsx'
import IntegrationsModal from '../IntegrationsModal.jsx'
import { ReplyToChip } from '../ContextMenu.jsx'
import { PasteChipBar, shouldChipPaste } from '../shared/PasteChip.jsx'
import ImageGenPicker from '../shared/ImageGenPicker.jsx'
import ComposerCommandsMenu from '../../../cv4/ComposerCommandsMenu.jsx'
import {
  useChatCore,
  useChatSendCtx,
  useChatAttachmentsCtx,
  useChatVoiceCtx,
  useChatContextMenuCtx,
} from '../chat/ChatPanelContext.jsx'
import { useCornerNav } from '../../../CornerContext.jsx'
import MailChip from '../../../cv4/MailChip.jsx'

// CV3 pill input bar: hidden file input, optional reply/chain indicators,
// slash-command autocomplete, attach button, commands stub, and the
// mic-or-send button that toggles between voice mode and send.
export default function ThreadInputBar() {
  const { selectedAgent, chatInputFocused, setChatInputFocused } = useChatCore()
  const {
    input, setInput, inputRef, sending,
    handleSend, handleKeyDown,
    pasteChips, addPasteChip, removePasteChip,
    selectedImageTool, setSelectedImageTool,
  } = useChatSendCtx()
  const { uploading, fileInputRef, handleFileSelection } = useChatAttachmentsCtx()
  const {
    isVoiceActive, setIsVoiceActive, voiceChatRef,
    setVoiceMuted, setVoiceTranscriptText,
  } = useChatVoiceCtx()
  const { replyTo, setReplyTo } = useChatContextMenuCtx()
  // CV4 Mail Room: when a mail is selected in the right rail it pins as a
  // chip above the composer so the EA's next reply receives the email body
  // as context. Cleared by the chip's × or by send completion.
  const { activeTool, selectedMail, setSelectedMail } = useCornerNav()
  // Caret position for slash-command autocomplete
  const [caret, setCaret] = useState(null)
  const updateCaret = (e) => setCaret(e?.target?.selectionStart ?? null)

  // CV4 swaps the inert chevron for a vertical commands menu (image gen, etc.)
  // R7.21 cutover: /dashboard renders CV4 too; cv4 mode = NOT on /cv3.
  const isCv4 = typeof window !== 'undefined' && !window.location.pathname.startsWith('/cv3')
  const [commandsOpen, setCommandsOpen] = useState(false)

  const [integrationsOpen, setIntegrationsOpen] = useState(false)
  // Auto-open the modal when the user lands back from the OAuth callback so
  // they immediately see the success state (or error reason).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    const flag = u.searchParams.get('integrations')
    if (flag === 'connected' || flag === 'error') {
      setIntegrationsOpen(true)
      u.searchParams.delete('integrations')
      u.searchParams.delete('slug')
      u.searchParams.delete('reason')
      window.history.replaceState({}, '', u.toString())
    }
  }, [])
  const handleModalCommand = useCallback((skillName) => {
    if (skillName === '/integrations') setIntegrationsOpen(true)
  }, [])

  // CV4 commands menu dispatches 'cv4:open-integrations' so we can open
  // the IntegrationsModal without wiring a context.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onOpen = () => setIntegrationsOpen(true)
    window.addEventListener('cv4:open-integrations', onOpen)
    return () => window.removeEventListener('cv4:open-integrations', onOpen)
  }, [])

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData?.getData('text') || ''
    if (shouldChipPaste(text)) {
      e.preventDefault()
      addPasteChip(text)
    }
  }, [addPasteChip])

  const hasContent = input.trim().length > 0 || (pasteChips?.length > 0)

  return (
    <div style={{
      flexShrink: 0,
      // R7.22 (2026-05-13): composer sits flush to the viewport bottom.
      // The previous `+ env(safe-area-inset-bottom)` was producing a
      // ~100px white band under the pill on iPhone fullscreen / PWA
      // (the home-indicator inset). Removed at the user's request so
      // the pill anchors to the edge; iOS still renders the indicator
      // overlay on top, and the 42px tap targets remain reachable.
      padding: '8px 12px 10px',
      background: C.bg,
      borderTop: '1px solid ' + C.border,
    }}>
      {/* Hidden file input */}
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
      {activeTool === 'mail' && selectedMail && (
        <MailChip email={selectedMail} onClear={() => setSelectedMail(null)} />
      )}
      <PasteChipBar chips={pasteChips || []} onRemove={removePasteChip} />
      {input.includes('>>') && (() => {
        const parts = input.split('>>').map(s => s.trim()).filter(Boolean)
        if (parts.length < 2) return null
        return (
          <div style={{
            maxWidth: 560,
            margin: '0 auto 6px',
            fontSize: 11,
            fontWeight: 600,
            color: '#A5B4FC',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.04em',
          }}>
            Chain · {parts.length} steps · runs in sequence
          </div>
        )
      })()}
      <div style={{
        position: 'relative',
        maxWidth: isCv4 ? 612 : 560,
        margin: '0 auto',
        display: isCv4 ? 'flex' : 'block',
        alignItems: 'center',
        gap: isCv4 ? 8 : 0,
      }}>
      {isCv4 && (
        <ComposerCommandsMenu
          open={commandsOpen}
          setOpen={setCommandsOpen}
          setSelectedImageTool={setSelectedImageTool}
        />
      )}
      <div style={{ flex: isCv4 ? 1 : undefined, minWidth: 0, position: 'relative' }}>
      <SlashCommandAutocomplete
        value={input}
        setValue={setInput}
        inputRef={inputRef}
        caret={caret}
        onModalCommand={handleModalCommand}
      />
      <IntegrationsModal open={integrationsOpen} onClose={() => setIntegrationsOpen(false)} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: C.s1,
        border: '1.5px solid ' + (input.includes('>>') && input.split('>>').filter(s => s.trim()).length >= 2 ? 'rgba(99,102,241,0.40)' : selectedImageTool ? 'rgba(245,158,11,0.35)' : chatInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
        borderRadius: 26,
        padding: '5px 5px 5px 8px',
        boxShadow: input.includes('>>') && input.split('>>').filter(s => s.trim()).length >= 2 ? '0 0 0 4px rgba(99,102,241,0.06), 0 4px 20px rgba(0,0,0,0.2)' : chatInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}>
        <ImageGenPicker
          selectedImageTool={selectedImageTool}
          setSelectedImageTool={setSelectedImageTool}
          hideTrigger={isCv4}
        />
        <input
          ref={inputRef}
          data-testid="thread-chat-input"
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); updateCaret(e) }}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCaret}
          onClick={updateCaret}
          onSelect={updateCaret}
          onFocus={(e) => { setChatInputFocused(true); updateCaret(e) }}
          onBlur={() => setChatInputFocused(false)}
          onPaste={handlePaste}
          placeholder={selectedImageTool ? 'Describe the image to generate...' : `Message ${selectedAgent.name}...`}
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
        {/* Action buttons inside pill. data-role="composer-actions" lets shells
            (e.g. /cv4) reorder this cluster relative to the input via CSS. */}
        <div data-role="composer-actions" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Attach */}
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
          {/* CV4 hoists the Commands button OUTSIDE the pill (purple
              sparkles icon, left of the pill). CV3 keeps the inert
              chevron until promotion. */}
          {!isCv4 && (
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
          )}
        </div>
        {/* Mic button (hidden when input or chips present) */}
        {!hasContent && (
          <button
            title={isVoiceActive ? 'End voice' : 'Start voice'}
            onClick={() => {
              if (isVoiceActive) {
                voiceChatRef.current?.stop()
                setIsVoiceActive(false)
                setVoiceMuted(false)
                setVoiceTranscriptText('')
              } else {
                setIsVoiceActive(true)
              }
            }}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: isVoiceActive ? 'rgba(16,185,129,0.15)' : C.accent,
              border: isVoiceActive ? '2px solid rgba(16,185,129,0.4)' : 'none',
              color: isVoiceActive ? C.accent : '#000', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'transform 0.15s, background 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10a7 7 0 0014 0"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </button>
        )}
        {/* Send button (shown when input or chips present) */}
        {hasContent && (
          <button
            title="Send"
            onClick={handleSend}
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
    </div>
  )
}
