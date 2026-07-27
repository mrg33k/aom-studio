import { useState, useCallback, useEffect } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'
import SlashCommandAutocomplete from '../SlashCommandAutocomplete.jsx'
import IntegrationsModal from '../IntegrationsModal.jsx'
import EmbedModal from '../EmbedModal.jsx'
import { ReplyToChip } from '../ContextMenu.jsx'
import { PasteChipBar, shouldChipPaste } from '../shared/PasteChip.jsx'
import ImageGenPicker from '../shared/ImageGenPicker.jsx'
import ComposerCommandsMenu from '../../../cv4/ComposerCommandsMenu.jsx'
import MissionChip from '../../../cv4/MissionChip.jsx'
import AttachedSkillChip from '../../../cv4/AttachedSkillChip.jsx'
import { useCornerNav } from '../../../CornerContext.jsx'
import {
  useChatCore,
  useChatSendCtx,
  useChatComposerCtx,
  useChatAttachmentsCtx,
  useChatVoiceCtx,
  useChatContextMenuCtx,
} from '../chat/ChatPanelContext.jsx'
import useProjectChatPrefill from './useProjectChatPrefill.js'

// The CV3-pill input bar for the project-chat room. Handles slash-command
// autocomplete (via caret tracking), file attach button, voice start/send
// toggle, and the reply-to chip. Enter fires sendProjectText(input).
export default function ProjectInputBar() {
  const {
    selectedProject,
    setInlineProject, onBack,
    chatInputFocused, setChatInputFocused,
    prefillMessage, setPrefillMessage,
    worldId,
  } = useChatCore()
  const { sending, sendProjectText } = useChatSendCtx()
  const {
    input, setInput, inputRef,
    pasteChips, addPasteChip, removePasteChip,
    selectedImageTool, setSelectedImageTool,
  } = useChatComposerCtx()
  const { uploading, fileInputRef, handleFileSelection } = useChatAttachmentsCtx()
  const { isVoiceActive, setIsVoiceActive } = useChatVoiceCtx()
  const { replyTo, setReplyTo } = useChatContextMenuCtx()

  useProjectChatPrefill({
    prefillMessage, selectedProject, setInput, setPrefillMessage, inputRef,
  })

  const handleCreateTask = useCallback(async () => {
    const text = input.trim()
    if (!text || !selectedProject) return
    try {
      // R21c uses /api/dashboard/create-project-task (service-role) so the
      // insert isn't blocked by RLS on dependent tables. Client-direct
      // createTaskWithRex failed on the events trigger in prod.
      // authFetch, not fetch: create-project-task queues a row a live worker
      // executes, so it now requires a session and runs verifyTenant on the
      // world (owner world OR a world holding a project_access grant — a
      // granted collaborator is still admitted).
      //
      // userId is no longer sent: the server derives created_by from the JWT
      // and ignores any body-supplied author. Sending it would only invite
      // someone to wire it back up.
      const resp = await authFetch('/api/dashboard/create-project-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          projectSlug: selectedProject.slug,
          clientId: worldId || 'aom',
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`)
      setInput('')
    } catch (err) {
      console.error('[R21c] create-task error:', err)
    }
  }, [input, selectedProject, worldId, setInput])

  const [caret, setCaret] = useState(null)
  const updateCaret = (e) => setCaret(e?.target?.selectionStart ?? null)

  // CV4 swaps the inert chevron for a vertical commands menu (image gen, etc.)
  // R7.21 cutover: /dashboard renders CV4 too; cv4 mode = NOT on /cv3.
  const isCv4 = typeof window !== 'undefined' && !window.location.pathname.startsWith('/cv3')
  const [commandsOpen, setCommandsOpen] = useState(false)

  // R6.2: mission chip attached by the file-browser drawer.
  const { attachedMission, setAttachedMission } = useCornerNav()

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
  const [embedModalOpen, setEmbedModalOpen] = useState(false)
  const handleModalCommand = useCallback((skillName) => {
    if (skillName === '/integrations') setIntegrationsOpen(true)
    if (skillName === '/embed') setEmbedModalOpen(true)
  }, [])

  // CV4 commands menu dispatches 'cv4:open-integrations' to open the modal.
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
      padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
      background: C.bg,
      borderTop: '1px solid ' + C.border,
    }}>
      {/* No `accept` attribute on purpose -- any file type is allowed. */}
      {/* The wildcard accept value gets tree-shaken as redundant; leaving the */}
      {/* attribute off source-side makes "no filter" the explicit default and */}
      {/* prevents future build-step drift. R79-f13 defensive pass 2026-05-21. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelection}
      />
      {replyTo && (
        <ReplyToChip target={replyTo} onDismiss={() => setReplyTo(null)} />
      )}
      <PasteChipBar chips={pasteChips || []} onRemove={removePasteChip} />
      {isCv4 && attachedMission && (
        <MissionChip mission={attachedMission} onClear={() => setAttachedMission(null)} />
      )}
      <AttachedSkillChip
        projectSlug={selectedProject?.slug || null}
        missionSlug={attachedMission?.slug || null}
      />
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
        <EmbedModal
          open={embedModalOpen}
          onClose={() => setEmbedModalOpen(false)}
          selectedProject={selectedProject}
          worldId={worldId}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: C.s1,
          border: '1.5px solid ' + (selectedImageTool ? 'rgba(245,158,11,0.35)' : chatInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 8px',
          boxShadow: chatInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>
          <ImageGenPicker
            selectedImageTool={selectedImageTool}
            setSelectedImageTool={setSelectedImageTool}
            hideTrigger={isCv4}
          />
          <input
            ref={inputRef}
            type="text"
            data-testid="project-chat-input"
            value={input}
            onChange={e => { setInput(e.target.value); updateCaret(e) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' && !input) {
                e.preventDefault()
                setInlineProject(null)
                onBack?.()
                return
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const textToSend = inputRef.current?.value ?? input
                if ((!textToSend.trim() && !pasteChips?.length) || sending) return
                const missionPrefix = attachedMission
                  ? `[Mission: ${attachedMission.path}] `
                  : ''
                sendProjectText(missionPrefix + textToSend)
                setInput('')
                if (attachedMission) setAttachedMission(null)
              }
            }}
            onKeyUp={updateCaret}
            onClick={updateCaret}
            onSelect={updateCaret}
            onFocus={(e) => { setChatInputFocused(true); updateCaret(e) }}
            onBlur={() => setChatInputFocused(false)}
            onPaste={handlePaste}
            placeholder={selectedImageTool ? 'Describe the image to generate...' : `Message ${selectedProject?.missionName || selectedProject?.name || 'project'}...`}
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
          <div data-role="composer-actions" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            {/* R21c: project-scoped task creation straight from the chat
                input. Takes the current input text + selectedProject.slug
                and hits the same path the Tasks panel uses. No prompt,
                no slug picker. */}
            <button
              data-testid="chat-create-task"
              title="Create task from this message"
              onClick={handleCreateTask}
              disabled={!input.trim() || !selectedProject || sending}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: !input.trim() || !selectedProject ? C.dim : C.muted,
                cursor: !input.trim() || !selectedProject ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </button>
          </div>
          {!hasContent && (
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
          {hasContent && (
            <button
              title="Send"
              onClick={() => {
                const textToSend = inputRef.current?.value ?? input
                if ((!textToSend.trim() && !pasteChips?.length) || sending) return
                const missionPrefix = attachedMission
                  ? `[Mission: ${attachedMission.path}] `
                  : ''
                sendProjectText(missionPrefix + textToSend)
                setInput('')
                if (attachedMission) setAttachedMission(null)
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
    </div>
  )
}
