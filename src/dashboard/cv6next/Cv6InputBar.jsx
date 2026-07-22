// Cv6InputBar — corner:corner-ui-cv6 (chat-surface WD40 R1)
//
// The chat composer with CV4 FUNCTIONALITY and the CV6 LOOK (Patrik's contract:
// "CV4 capabilities re-skinned CV6 — never CV4 pixels pasted in"). It reads the
// exact same ChatPanelContext providers Cv6FullComposer already builds (so the
// attach / recording / voice / image-gen plumbing is CV4's real plumbing), but
// every visible pixel is cv6 tokens: var(--surface-2) fields, var(--hair) rules,
// var(--accent) actions, 12px radii, var(--font-sans).
//
// The command menu is HONEST: every entry does its thing under CV6 or it is not
// in the menu. Wired today: Image generation (Gemini/Ideogram/OpenAI), Record
// conversation (dictation -> sends the transcript), Files in this room (opens
// the CV6 files surface via onOpenFiles — the right-drawer Files view on desktop,
// the files sheet on mobile), Integrations (the OAuth modal). The CV4 rows whose
// panels have no CV6 surface yet (Recipes, About, Settings, Embed, Collaborators)
// are deliberately absent instead of dead.

import { useCallback, useEffect, useRef, useState } from 'react';
import SlashCommandAutocomplete from '../components/cv3/SlashCommandAutocomplete.jsx';
import IntegrationsModal from '../components/cv3/IntegrationsModal.jsx';
import { PasteChipBar, shouldChipPaste } from '../components/cv3/shared/PasteChip.jsx';
import { IMAGE_TOOLS } from '../components/cv3/shared/ImageGenPicker.jsx';
import { CornerLoaderMark } from '../cv6kit/FullscreenLoading.jsx';
import {
  useChatCore,
  useChatComposerCtx,
  useChatAttachmentsCtx,
  useChatVoiceCtx,
  useChatRecordingCtx,
} from '../components/cv3/chat/ChatPanelContext.jsx';

const I = {
  sparkles: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" /></svg>,
  attach: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>,
  mic: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>,
  image: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="9" r="1.5" /><path d="M21 15l-5-5-9 9" /></svg>,
  record: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>,
  stop: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>,
  folder: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>,
  plug: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v6M15 2v6M6 8h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM12 16v6" /></svg>,
  back: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
  chev: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>,
  x: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
};

function MenuRow({ icon, label, detail, hasSubmenu, onClick, tint, testid }) {
  return (
    <button type="button" data-testid={testid} onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, height: detail ? 46 : 40, padding: '0 10px', borderRadius: 9, border: 'none', background: 'transparent', color: tint || 'var(--fg)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      onTouchStart={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onTouchEnd={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tint || 'var(--muted)', flex: 'none' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {detail ? <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</span> : null}
      </span>
      {hasSubmenu ? <span style={{ color: 'var(--faint)', display: 'inline-flex' }}>{I.chev}</span> : null}
    </button>
  );
}

// The commands popover — CV6 surface card floating above the sparkles button.
function CommandsMenu({ open, setOpen, onOpenFiles, onOpenIntegrations }) {
  const wrapRef = useRef(null);
  const [view, setView] = useState('root');
  const { selectedImageTool, setSelectedImageTool } = useChatComposerCtx();
  const { isRecording, handleMicToggle } = useChatRecordingCtx();

  useEffect(() => {
    if (!open) { setView('root'); return undefined; }
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [open, setOpen]);

  return (
    <div ref={wrapRef} data-testid="cv6-commands-menu" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 'none' }}>
      <button type="button" title="Commands" data-testid="cv6-commands-menu-button" onClick={() => setOpen((o) => !o)}
        style={{ width: 42, height: 42, borderRadius: '50%', flex: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: open || selectedImageTool ? 'var(--accent-weak)' : 'var(--surface-2)', border: `1px solid ${open ? 'var(--accent)' : 'var(--hair)'}`, color: open || selectedImageTool || isRecording ? 'var(--accent)' : 'var(--muted)', transition: 'background .15s, color .15s, border-color .15s' }}>
        {isRecording ? I.stop : I.sparkles}
      </button>
      {open ? (
        <>
        {/* Full-viewport backdrop: dims the thread behind the open menu and is an
            always-there tap-to-dismiss target (Steffen gate R1, defects 1+2 —
            the document-listener alone missed synthetic taps and left the thread
            visually competing with the panel). */}
        <div data-testid="cv6-commands-menu-scrim" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 44, background: 'rgba(0,0,0,.38)' }} />
        <div data-testid="cv6-commands-menu-popover" style={{ position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, minWidth: 252, background: 'rgba(13,17,23,.96)', backdropFilter: 'blur(16px) saturate(1.2)', WebkitBackdropFilter: 'blur(16px) saturate(1.2)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, boxShadow: '0 18px 44px -12px rgba(0,0,0,.65)', padding: 6, zIndex: 45, fontFamily: 'var(--font-sans)' }}>
          {view === 'root' ? (
            <>
              <div className="eyebrow" style={{ padding: '7px 10px 6px' }}>Commands</div>
              <MenuRow icon={I.image} label="Image generation" detail="Gemini · Ideogram · OpenAI" hasSubmenu
                onClick={() => setView('image-gen')} testid="cv6-commands-image-gen" />
              <MenuRow icon={isRecording ? I.stop : I.record} label={isRecording ? 'Stop recording' : 'Record conversation'}
                tint={isRecording ? 'var(--danger, #e5484d)' : null}
                onClick={() => { handleMicToggle?.(); setOpen(false); }} testid="cv6-commands-record" />
              {typeof onOpenFiles === 'function' ? (
                <MenuRow icon={I.folder} label="Files in this room" detail="Everything shared or produced here"
                  onClick={() => { onOpenFiles(); setOpen(false); }} testid="cv6-commands-files" />
              ) : null}
              <MenuRow icon={I.plug} label="Integrations" detail="Connect tools and accounts"
                onClick={() => { onOpenIntegrations(); setOpen(false); }} testid="cv6-commands-integrations" />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px 6px' }}>
                <button type="button" onClick={() => setView('root')} style={{ width: 20, height: 20, borderRadius: 6, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{I.back}</button>
                <span className="eyebrow">Image generation</span>
              </div>
              {IMAGE_TOOLS.map((tool) => (
                <MenuRow key={tool.id} icon={I.image} label={tool.name} detail={tool.detail}
                  onClick={() => { setSelectedImageTool(tool.id); setOpen(false); }}
                  testid={`cv6-commands-image-gen-${tool.id}`} />
              ))}
            </>
          )}
        </div>
        </>
      ) : null}
    </div>
  );
}

export default function Cv6InputBar({ onOpenFiles }) {
  const { selectedAgent, selectedProject, chatInputFocused, setChatInputFocused } = useChatCore();
  const {
    input, setInput, inputRef,
    handleSend, handleKeyDown,
    pasteChips, addPasteChip, removePasteChip,
    selectedImageTool, setSelectedImageTool,
    interactionMode = 'work', setInteractionMode,
  } = useChatComposerCtx();
  const { uploading, fileInputRef, handleFileSelection } = useChatAttachmentsCtx();
  const { isVoiceActive, setIsVoiceActive } = useChatVoiceCtx();
  const { isRecording, handleMicToggle } = useChatRecordingCtx();

  const [commandsOpen, setCommandsOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [caret, setCaret] = useState(null);
  const updateCaret = (e) => setCaret(e?.target?.selectionStart ?? null);

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (!text) return;
    e.preventDefault();
    if (shouldChipPaste(text)) { addPasteChip(text); return; }
    const el = e.target;
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? start;
    const next = input.slice(0, start) + text + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      const inp = inputRef.current;
      if (inp) inp.setSelectionRange(start + text.length, start + text.length);
    });
  }, [addPasteChip, input, setInput, inputRef]);

  const hasContent = input.trim().length > 0 || (pasteChips?.length > 0);
  const roomName = selectedAgent?.name || selectedProject?.name || 'the room';
  const toolName = selectedImageTool ? (IMAGE_TOOLS.find((t) => t.id === selectedImageTool)?.name || selectedImageTool) : null;

  return (
    <div className="cv6-floating-composer" style={{ width: '100%', maxWidth: 680, margin: '0 auto', fontFamily: 'var(--font-sans)', padding: 10, borderRadius: 24, background: 'var(--surface)', border: '1px solid var(--hair)', boxShadow: '0 18px 42px -24px rgba(0,0,0,.75)' }}>
      {/* Hidden file input — no accept filter on purpose: any file type is allowed. */}
      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelection} />
      {/* Pinned image tool + recording state, as quiet chips above the bar. */}
      {(toolName || isRecording) ? (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {toolName ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 26, padding: '0 10px', borderRadius: 13, background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 600 }}>
              {I.image} {toolName}
              <button type="button" title="Stop generating images" onClick={() => setSelectedImageTool(null)} style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>{I.x}</button>
            </span>
          ) : null}
          {isRecording ? (
            <button type="button" onClick={() => handleMicToggle?.()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 26, padding: '0 10px', borderRadius: 13, background: 'rgba(229,72,77,.14)', color: '#e5484d', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e5484d', animation: 'statPulse 1.4s infinite' }} /> Recording… tap to stop
            </button>
          ) : null}
        </div>
      ) : null}
      <PasteChipBar chips={pasteChips || []} onRemove={removePasteChip} />
      <div style={{ position: 'relative' }}>
        <div style={{ minWidth: 0, position: 'relative' }}>
          <SlashCommandAutocomplete value={input} setValue={setInput} inputRef={inputRef} caret={caret}
            onModalCommand={(name) => { if (name === '/integrations') setIntegrationsOpen(true); }} surface="1on1"
            panelStyle={{ background: 'rgba(13,17,23,.92)', backdropFilter: 'blur(16px) saturate(1.2)', WebkitBackdropFilter: 'blur(16px) saturate(1.2)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, boxShadow: '0 18px 44px -12px rgba(0,0,0,.65)' }} />
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 46, borderRadius: 16, background: 'var(--surface-2)', border: `1px solid ${selectedImageTool ? 'var(--accent)' : chatInputFocused ? 'var(--accent)' : 'var(--hair)'}`, boxShadow: chatInputFocused ? '0 0 0 3px var(--accent-weak)' : 'none', transition: 'border-color .2s, box-shadow .2s', padding: '0 14px' }}>
            <input
              ref={inputRef}
              data-testid="cv6-chat-input"
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); updateCaret(e); }}
              onKeyDown={handleKeyDown}
              onKeyUp={updateCaret}
              onClick={updateCaret}
              onSelect={updateCaret}
              onFocus={(e) => { setChatInputFocused?.(true); updateCaret(e); }}
              onBlur={() => setChatInputFocused?.(false)}
              onPaste={handlePaste}
              placeholder={selectedImageTool ? 'Describe the image to generate…' : `Message ${roomName}…`}
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--fg)', fontSize: 16, fontFamily: 'var(--font-sans)' }}
            />
          </div>
        </div>
        <div data-role="composer-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <CommandsMenu open={commandsOpen} setOpen={setCommandsOpen} onOpenFiles={onOpenFiles} onOpenIntegrations={() => setIntegrationsOpen(true)} />
          <button type="button" title="Files" aria-label="Attach and upload files" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--hair)', color: uploading ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            {uploading ? <CornerLoaderMark compact className="cv6-upload-loader" /> : I.attach}
          </button>
          <button type="button" className="cv6-mode-toggle" aria-label={`Currently in ${interactionMode} mode. Switch to ${interactionMode === 'plan' ? 'work' : 'plan'} mode`} title={interactionMode === 'plan' ? 'Plan mode: think until we decide' : 'Work mode: go go go'} onClick={() => setInteractionMode?.(interactionMode === 'plan' ? 'work' : 'plan')}
            style={{ height: 42, padding: '0 13px', borderRadius: 21, border: `1px solid ${interactionMode === 'plan' ? 'var(--accent)' : 'var(--hair)'}`, background: interactionMode === 'plan' ? 'var(--accent-weak)' : 'var(--surface-2)', color: interactionMode === 'plan' ? 'var(--accent)' : 'var(--muted)', font: '700 11.5px var(--font-sans)', cursor: 'pointer' }}>
            {interactionMode === 'plan' ? 'Plan' : 'Work'}
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" title={isVoiceActive ? 'End voice chat' : 'Start voice chat'} aria-label="Talk aloud" onClick={() => setIsVoiceActive(true)}
            style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
            {I.mic}
          </button>
          <button type="button" title="Send" aria-label="Send message" onClick={handleSend} disabled={!hasContent}
            style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: hasContent ? 'var(--accent)' : 'var(--surface-2)', color: hasContent ? '#fff' : 'var(--faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: hasContent ? 'pointer' : 'default', opacity: hasContent ? 1 : .72 }}>
            {I.send}
          </button>
        </div>
      </div>
      <IntegrationsModal open={integrationsOpen} onClose={() => setIntegrationsOpen(false)} />
    </div>
  );
}
