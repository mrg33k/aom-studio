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
// in the menu. Wired today: Work/Plan, the effective room model, Image generation
// (Gemini/Ideogram/OpenAI), Record conversation (dictation -> sends the transcript),
// Files in this room (opens
// the CV6 files surface via onOpenFiles — the right-drawer Files view on desktop,
// the files sheet on mobile), Integrations (the OAuth modal). The CV4 rows whose
// panels have no CV6 surface yet (Recipes, About, Settings, Embed, Collaborators)
// are deliberately absent instead of dead.

import { useCallback, useEffect, useRef, useState } from 'react';
import SlashCommandAutocomplete from '../components/cv3/SlashCommandAutocomplete.jsx';
import IntegrationsModal from '../components/cv3/IntegrationsModal.jsx';
import { PasteChipBar, shouldChipPaste } from '../components/cv3/shared/PasteChip.jsx';
import { IMAGE_TOOLS } from '../components/cv3/shared/ImageGenPicker.jsx';
import { MODEL_OPTIONS } from '../components/cv3/chat/chatConstants.js';
import { authFetch } from '../lib/authFetch.js';
import { CornerLoaderMark } from '../cv6kit/FullscreenLoading.jsx';
import RoomChecklistPanel from './RoomChecklistPanel.jsx';
import CornerRunnerDialog, { useCornerRunnerStatus } from './CornerRunnerDialog.jsx';
import { resolveEffectiveRoomModel, roomModelPreferenceKey } from './data/modelPreferences.js';
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
  checklist: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.2 1.2L6.5 5M3 12l1.2 1.2L6.5 11M3 18l1.2 1.2L6.5 17"/></svg>,
  brain: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v1a3 3 0 0 0-1 5.83V16a3 3 0 0 0 3 3h1.5M14.5 4.5A3.5 3.5 0 0 1 18 8v1a3 3 0 0 1 1 5.83V16a3 3 0 0 1-3 3h-1.5M12 3v18M8 9h4M12 15h4" /></svg>,
  computer: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  person: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>,
};

// Composer action buttons split into two compact families. Commands/model and
// checklists are low rectangular utilities; voice and Send are slightly stronger
// square actions. All keep invisible touch slop in CSS without returning to the
// oversized circular treatment that crowded the mobile composer.
const UTILITY_BTN = {
  width: 34, height: 30, borderRadius: 7, flex: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function modelOption(id) {
  return MODEL_OPTIONS.find((option) => option.id === id)
    || { id, label: id || 'Model unavailable', desc: 'Saved room model' };
}

function shortModelLabel(id) {
  // Do not claim Claude is the active provider when this route can legitimately
  // be answering through a limit fallback. The menu spells out the whole route.
  if (id === 'default') return 'Auto';
  return modelOption(id).label.replace(/^Claude\s+/, '');
}

function modelRouteDetail(id, sourceLabel) {
  if (id === 'muse-spark') return `${sourceLabel} · hosted Muse`;
  if (id === 'openai-gpt-5.6') return `${sourceLabel} · hosted OpenAI`;
  if (id === 'codex-local') return `${sourceLabel} · your computer`;
  return `${sourceLabel} · fallback on limits`;
}

function MenuRow({ icon, label, detail, hasSubmenu, onClick, tint, testid }) {
  return (
    <button type="button" className="cv6-command-row" data-testid={testid} onClick={onClick}
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
function CommandsMenu({
  open,
  setOpen,
  onOpenFiles,
  onOpenIntegrations,
  interactionMode,
  setInteractionMode,
  model,
  agent,
  runner,
  onOpenRunner,
}) {
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
      <button type="button" className="cv6-composer-util" title="Commands" data-testid="cv6-commands-menu-button" onClick={() => setOpen((o) => !o)}
        aria-label="Commands"
        style={{ ...UTILITY_BTN, width: 'auto', minWidth: 38, padding: '0 10px', gap: 7, cursor: 'pointer', background: open || selectedImageTool ? 'var(--accent-weak)' : 'var(--surface-2)', border: `1px solid ${open ? 'var(--accent)' : 'var(--hair)'}`, color: open || selectedImageTool || isRecording ? 'var(--accent)' : 'var(--muted)', transition: 'background .15s, color .15s, border-color .15s' }}>
        {isRecording ? I.stop : I.sparkles}
        {agent?.enabled ? (
          <span data-testid="cv6-current-agent" style={{ color: open ? 'var(--accent)' : 'var(--fg)', font: '700 11.5px var(--font-sans)', whiteSpace: 'nowrap' }}>{agent.title}</span>
        ) : (
          <span data-testid="cv6-current-model" style={{ color: open ? 'var(--accent)' : 'var(--fg)', font: '700 11.5px var(--font-sans)', whiteSpace: 'nowrap' }}>
            {model.loading ? 'Model…' : model.unavailable ? 'Model unavailable' : model.shortLabel}
          </span>
        )}
      </button>
      {open ? (
        <>
        {/* Full-viewport backdrop: dims the thread behind the open menu and is an
            always-there tap-to-dismiss target (Steffen gate R1, defects 1+2 —
            the document-listener alone missed synthetic taps and left the thread
            visually competing with the panel). */}
        <div data-testid="cv6-commands-menu-scrim" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 44, background: 'rgba(0,0,0,.38)' }} />
        <div data-testid="cv6-commands-menu-popover" style={{ position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, minWidth: 300, maxWidth: 'calc(100vw - 32px)', background: 'var(--composer-solid, var(--surface))', color: 'var(--fg)', border: '1px solid var(--hair)', borderRadius: 14, boxShadow: '0 18px 44px -12px rgba(0,0,0,.38)', padding: 6, zIndex: 45, fontFamily: 'var(--font-sans)' }}>
          {view === 'root' ? (
            <>
              <div className="eyebrow" style={{ padding: '7px 10px 6px' }}>Commands</div>
              <div data-testid="cv6-commands-mode-toggle" role="group" aria-label="Response mode"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, margin: '0 4px 6px', padding: 3, borderRadius: 11, background: 'var(--composer-card-solid, var(--surface-2))', border: '1px solid var(--hair)' }}>
                {['work', 'plan'].map((mode) => {
                  const active = interactionMode === mode;
                  return (
                    <button key={mode} type="button" className="cv6-command-mode" aria-pressed={active} onClick={() => setInteractionMode?.(mode)}
                      style={{ height: 32, borderRadius: 8, border: active ? '1px solid var(--hair)' : '1px solid transparent', background: active ? 'var(--composer-solid, var(--surface))' : 'transparent', color: active ? 'var(--fg)' : 'var(--muted)', boxShadow: active ? '0 2px 7px rgba(0,0,0,.12)' : 'none', font: '700 11.5px var(--font-sans)', cursor: 'pointer', textTransform: 'capitalize' }}>
                      {mode}
                    </button>
                  );
                })}
              </div>
              {agent?.enabled ? (
                <MenuRow icon={I.person} label={`Talking to: ${agent.title}`}
                  detail={agent.blurb || 'Choose who handles this room'} hasSubmenu
                  onClick={() => setView('agent')} testid="cv6-commands-agent" />
              ) : null}
              <MenuRow icon={I.brain} label={model.unavailable ? 'Model unavailable' : `Model: ${model.label}`}
                detail={model.unavailable ? 'Could not load this room’s saved model' : model.routeDetail} hasSubmenu
                onClick={() => setView('model')} testid="cv6-commands-model" />
              <MenuRow icon={I.computer} label="Corner Runner"
                detail={runner.loading ? 'Checking this computer…' : runner.paired ? `${runner.online ? runner.device?.status === 'working' ? 'Working' : 'Online' : 'Offline'} · ${runner.device?.name}` : 'Connect your computer and ChatGPT subscription'}
                tint={runner.online ? 'var(--accent)' : null}
                onClick={() => { onOpenRunner(); setOpen(false); }} testid="cv6-commands-runner" />
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
          ) : view === 'image-gen' ? (
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
          ) : view === 'agent' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px 6px' }}>
                <button type="button" onClick={() => setView('root')} aria-label="Back to commands" style={{ width: 20, height: 20, borderRadius: 6, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{I.back}</button>
                <span className="eyebrow">Who answers this room</span>
              </div>
              {(agent?.roster || []).map((option) => {
                const selected = agent.roomSelection === option.slug;
                return (
                  <MenuRow key={option.slug} icon={selected ? I.check : I.person} label={option.title} detail={option.blurb}
                    tint={selected ? 'var(--accent)' : null}
                    onClick={async () => { const saved = await agent.select(option.slug); if (saved) setOpen(false); }}
                    testid={`cv6-commands-agent-${option.slug}`} />
                );
              })}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px 6px' }}>
                <button type="button" onClick={() => setView('root')} aria-label="Back to commands" style={{ width: 20, height: 20, borderRadius: 6, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{I.back}</button>
                <span className="eyebrow">Model for this room</span>
              </div>
              {MODEL_OPTIONS.map((option) => {
                const selected = model.roomSelection === option.id;
                const label = option.id === 'default' ? 'Auto (workspace)' : option.label;
                const detail = option.id === 'default'
                  ? `Currently resolves to ${model.inheritedLabel}`
                  : option.id === 'codex-local'
                    ? runner.paired
                      ? `${runner.online ? 'Online' : 'Offline — turns will wait'} · ${runner.device?.name}`
                      : 'Connect Corner Runner first'
                    : option.desc;
                return (
                  <MenuRow key={option.id} icon={selected ? I.check : I.brain} label={label} detail={detail}
                    tint={selected ? 'var(--accent)' : null}
                    onClick={async () => {
                      const saved = await model.select(option.id);
                      if (saved) setOpen(false);
                    }}
                    testid={`cv6-commands-model-${option.id}`} />
                );
              })}
              {model.saveError ? <div role="status" style={{ padding: '7px 10px', color: 'var(--error, #e5484d)', fontSize: 11.5 }}>Could not save that model. Try again.</div> : null}
            </>
          )}
        </div>
        </>
      ) : null}
    </div>
  );
}

export default function Cv6InputBar({ onOpenFiles, room, worldId, roomOptions = [], onPlayChecklistItem, onPlayChecklistList, onClearRoom }) {
  const { selectedAgent, selectedProject, chatInputFocused, setChatInputFocused } = useChatCore();
  const {
    input, setInput, inputRef,
    handleSend, handleKeyDown,
    pasteChips, addPasteChip, removePasteChip,
    selectedImageTool, setSelectedImageTool,
    interactionMode = 'work', setInteractionMode,
    agentPicker,
  } = useChatComposerCtx();
  const { uploading, fileInputRef, handleFileSelection } = useChatAttachmentsCtx();
  const { isVoiceActive, setIsVoiceActive } = useChatVoiceCtx();
  const { isRecording, handleMicToggle } = useChatRecordingCtx();

  const [commandsOpen, setCommandsOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [caret, setCaret] = useState(null);
  const preferenceKey = roomModelPreferenceKey(room);
  const [modelPrefs, setModelPrefs] = useState({});
  const [modelLoading, setModelLoading] = useState(true);
  const [modelSaving, setModelSaving] = useState(false);
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const [modelSaveFailed, setModelSaveFailed] = useState(false);
  const runner = useCornerRunnerStatus(worldId);

  const loadModelPrefs = useCallback(() => {
    if (!worldId || !preferenceKey) {
      setModelPrefs({});
      setModelLoading(false);
      return Promise.resolve({});
    }
    setModelLoading(true);
    setModelLoadFailed(false);
    return authFetch(`/api/dashboard/agent-model?client=${encodeURIComponent(worldId)}`)
      .then((response) => {
        if (!response.ok) throw new Error('Preference load failed');
        return response.json();
      })
      .then(({ models }) => {
        const next = models && typeof models === 'object' ? models : {};
        setModelPrefs(next);
        return next;
      })
      .catch(() => {
        setModelPrefs({});
        setModelLoadFailed(true);
        return {};
      })
      .finally(() => setModelLoading(false));
  }, [preferenceKey, worldId]);

  useEffect(() => {
    loadModelPrefs();
    window.addEventListener('aom-model-pref-changed', loadModelPrefs);
    return () => window.removeEventListener('aom-model-pref-changed', loadModelPrefs);
  }, [loadModelPrefs]);

  const selectRoomModel = useCallback(async (nextModel, { pairedNow = false } = {}) => {
    if (!worldId || !preferenceKey || modelSaving) return false;
    if (nextModel === 'codex-local' && !runner.paired && !pairedNow) {
      setCommandsOpen(false);
      setRunnerOpen(true);
      return false;
    }
    const previous = modelPrefs;
    setModelSaving(true);
    setModelSaveFailed(false);
    setModelPrefs((current) => ({ ...current, [preferenceKey]: nextModel }));
    try {
      const response = await authFetch('/api/dashboard/agent-model', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: preferenceKey, model: nextModel, client_id: worldId }),
      });
      if (!response.ok) throw new Error('Preference save failed');
      window.dispatchEvent(new Event('aom-model-pref-changed'));
      return true;
    } catch {
      setModelPrefs(previous);
      setModelSaveFailed(true);
      return false;
    } finally {
      setModelSaving(false);
    }
  }, [modelPrefs, modelSaving, preferenceKey, worldId, runner.paired]);
  // /clear asks before it acts. Room settings' "Clear chat" arms the same way, and
  // this is reachable by typing two characters and pressing Enter — far easier to
  // hit by accident. Nothing is deleted either way: room-reset archives the visible
  // session and the messages stay readable under History.
  const [clearArmed, setClearArmed] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [clearFailed, setClearFailed] = useState(false);
  useEffect(() => { setChecklistOpen(false); }, [room?.id, room?.missionSlug]);
  // Never leave a confirm armed across a room switch — the next room would inherit
  // a primed destructive-looking control the user never opened.
  useEffect(() => { setClearArmed(false); setClearBusy(false); setClearFailed(false); }, [room?.id, room?.missionSlug]);
  const runClear = useCallback(async () => {
    if (typeof onClearRoom !== 'function') return;
    setClearBusy(true);
    setClearFailed(false);
    const ok = await onClearRoom();
    setClearBusy(false);
    setClearArmed(false);
    // Say so when it did not work rather than closing the bar as if it had.
    if (ok === false) setClearFailed(true);
  }, [onClearRoom]);
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
  const effectiveModel = resolveEffectiveRoomModel(modelPrefs, preferenceKey);
  const effectiveModelOption = modelOption(effectiveModel.id);
  const workspaceModel = String(modelPrefs?._all || '').trim();
  const inheritedModel = workspaceModel && workspaceModel !== 'default' ? workspaceModel : 'default';
  const modelSourceLabel = effectiveModel.source === 'room'
    ? 'Set for this room'
    : effectiveModel.source === 'workspace' ? 'Workspace setting' : 'Automatic route';
  const model = {
    label: effectiveModelOption.label,
    shortLabel: shortModelLabel(effectiveModel.id),
    sourceLabel: modelSourceLabel,
    routeDetail: modelRouteDetail(effectiveModel.id, modelSourceLabel),
    inheritedLabel: modelOption(inheritedModel).label,
    roomSelection: String(modelPrefs?.[preferenceKey] || 'default'),
    loading: modelLoading,
    saving: modelSaving,
    unavailable: modelLoadFailed,
    saveError: modelSaveFailed,
    select: selectRoomModel,
  };

  // The composer rests as a single line but grows with Shift+Enter or pasted
  // writing. Cap it at roughly five lines so the transcript never disappears
  // behind a draft; after that, the field scrolls internally.
  useEffect(() => {
    const field = inputRef.current;
    if (!field || field.tagName !== 'TEXTAREA') return;
    field.style.height = '0px';
    field.style.height = `${Math.min(118, Math.max(24, field.scrollHeight))}px`;
    field.style.overflowY = field.scrollHeight > 118 ? 'auto' : 'hidden';
  }, [input, inputRef]);

  return (
    <div className={`cv6-floating-composer${checklistOpen ? ' is-checklist-open' : ''}`} data-swipe-guard="" style={{ width: '100%', maxWidth: 700, margin: '0 auto', fontFamily: 'var(--font-sans)', padding: checklistOpen ? 12 : 9, borderRadius: 14, background: 'var(--composer-solid, #131317)', border: '1px solid var(--hair)', boxShadow: '0 18px 42px -24px rgba(0,0,0,.92)', transition: 'padding .18s ease, background .18s ease' }}>
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
      {/* /clear confirm. Sits above the input so it reads as a question about this
          chat, not a toast that might belong to something else. */}
      {clearArmed ? (
        <div data-testid="cv6-clear-confirm" role="group" aria-label="Confirm clearing this chat"
          style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 9, padding: '9px 12px', borderRadius: 14, border: '1px solid var(--hair)', background: 'var(--composer-card-solid, var(--surface-2))' }}>
          <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, color: 'var(--fg)' }}>
            Start {roomName} fresh? Nothing is deleted — the messages stay under History.
          </span>
          <button type="button" disabled={clearBusy} onClick={() => setClearArmed(false)}
            style={{ height: 32, padding: '0 13px', borderRadius: 16, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', font: '600 12px var(--font-sans)', cursor: clearBusy ? 'default' : 'pointer' }}>Cancel</button>
          <button type="button" disabled={clearBusy} onClick={runClear}
            style={{ height: 32, padding: '0 15px', borderRadius: 16, border: 'none', background: 'var(--accent)', color: '#fff', font: '700 12px var(--font-sans)', cursor: clearBusy ? 'default' : 'pointer' }}>{clearBusy ? 'Clearing…' : 'Clear chat'}</button>
        </div>
      ) : null}
      {clearFailed ? (
        <div aria-live="polite" style={{ marginBottom: 9, padding: '8px 12px', borderRadius: 12, background: 'rgba(229,72,77,.12)', color: '#e5484d', font: '600 12px var(--font-sans)' }}>
          Couldn't clear this chat just now. Nothing changed — try again in a moment.
        </div>
      ) : null}
      <div style={{ position: 'relative' }}>
        {checklistOpen ? (
          <RoomChecklistPanel room={room} worldId={worldId} roomOptions={roomOptions} onPlay={onPlayChecklistItem} onPlayList={onPlayChecklistList} onClose={() => setChecklistOpen(false)} />
        ) : <div style={{ minWidth: 0, position: 'relative' }}>
          <SlashCommandAutocomplete value={input} setValue={setInput} inputRef={inputRef} caret={caret}
            onModalCommand={(name) => {
              if (name === '/integrations') setIntegrationsOpen(true);
              // /clear arms the confirm bar below; it never clears on the pick itself.
              if (name === '/clear') { setClearFailed(false); setClearArmed(typeof onClearRoom === 'function'); }
            }}
            surface={(room?.isProject || room?.isMission) ? 'project' : '1on1'}
            panelStyle={{ background: 'rgba(13,17,23,.92)', backdropFilter: 'blur(16px) saturate(1.2)', WebkitBackdropFilter: 'blur(16px) saturate(1.2)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, boxShadow: '0 18px 44px -12px rgba(0,0,0,.65)' }} />
          <div className="cv6-composer-input-shell" style={{ display: 'flex', alignItems: 'flex-end', minHeight: 42, borderRadius: 9, background: 'var(--composer-card-solid, var(--surface-2))', border: `1px solid ${selectedImageTool ? 'var(--accent)' : chatInputFocused ? 'var(--accent)' : 'var(--hair)'}`, boxShadow: chatInputFocused ? '0 0 0 2px var(--accent-weak)' : 'none', transition: 'border-color .2s, box-shadow .2s', padding: '3px 8px 3px 4px' }}>
            <button type="button" className="cv6-composer-attach" title="Files" aria-label="Attach and upload files" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ width: 32, height: 32, borderRadius: 7, border: 'none', background: 'transparent', color: uploading ? 'var(--accent)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: uploading ? 'wait' : 'pointer', padding: 0, marginBottom: 1 }}>
              {uploading ? <CornerLoaderMark compact className="cv6-upload-loader" /> : I.attach}
            </button>
            <textarea
              ref={inputRef}
              data-testid="cv6-chat-input"
              rows={1}
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
              style={{ flex: 1, minWidth: 0, height: 24, maxHeight: 118, resize: 'none', overflowY: 'hidden', background: 'none', border: 'none', outline: 'none', color: 'var(--fg)', padding: '3px 0', fontSize: 16, lineHeight: 1.35, fontFamily: 'var(--font-sans)' }}
            />
          </div>
        </div>}
        <div data-role="composer-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: checklistOpen ? 12 : 10 }}>
          <CommandsMenu open={commandsOpen} setOpen={setCommandsOpen} onOpenFiles={onOpenFiles} onOpenIntegrations={() => setIntegrationsOpen(true)} interactionMode={interactionMode} setInteractionMode={setInteractionMode} model={model} agent={agentPicker} runner={runner} onOpenRunner={() => setRunnerOpen(true)} />
          <button type="button" className="cv6-composer-util" data-testid="room-checklist-toggle" title={checklistOpen ? 'Back to message' : 'Room checklists'} aria-label={checklistOpen ? 'Close room checklists' : 'Open room checklists'} aria-pressed={checklistOpen}
            onClick={() => { setCommandsOpen(false); setChecklistOpen((open) => !open); }}
            style={{ ...UTILITY_BTN, background: checklistOpen ? 'var(--accent-weak)' : 'var(--surface-2)', border: `1px solid ${checklistOpen ? 'var(--accent)' : 'var(--hair)'}`, color: checklistOpen ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer' }}>
            {I.checklist}
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="cv6-composer-primary" title={isVoiceActive ? 'End voice chat' : 'Start voice chat'} aria-label="Talk aloud" onClick={() => setIsVoiceActive(true)}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
            {I.mic}
          </button>
          <button type="button" className="cv6-composer-primary" title="Send" aria-label="Send message" onClick={handleSend} disabled={!hasContent}
            style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: hasContent ? 'var(--accent)' : 'var(--surface-2)', color: hasContent ? '#fff' : 'var(--faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: hasContent ? 'pointer' : 'default', opacity: hasContent ? 1 : .72 }}>
            {I.send}
          </button>
        </div>
      </div>
      <IntegrationsModal open={integrationsOpen} onClose={() => setIntegrationsOpen(false)} />
      <CornerRunnerDialog open={runnerOpen} worldId={worldId} runner={runner} onClose={() => setRunnerOpen(false)}
        onPaired={async () => {
          const saved = await selectRoomModel('codex-local', { pairedNow: true });
          if (saved) setRunnerOpen(false);
        }} />
    </div>
  );
}
