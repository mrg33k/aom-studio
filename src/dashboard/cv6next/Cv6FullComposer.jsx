// Cv6FullComposer — corner:corner-ui-cv6
//
// The Home col3 quick-reply composer, now with the FULL CV4 feature set Patrik
// asked for: attachment clip, command menu (image gen + mic + integrations), and
// voice chat. Rather than re-implement CV4's pill (and drift from it), this is a
// provider bridge: it instantiates CV4's own composer hooks scoped to the opened
// room and renders CV4's real ThreadInputBar + voice components inside it. So the
// pill IS the CV4 pill. CV6 theme polish is a separate later pass (Patrik's
// sequence: match CV4 functionally first, then re-skin to CV6 tokens).
//
// Mounted (kept alive) in CornerCV6 and portaled into the template's .composer
// host so a template re-bind never wipes typed text. Text sends through the same
// useRoomThread.send the col3 thread already uses (quickSend); attachments, voice
// transcripts, and generated images post straight into the room (scoped by
// project / mission / agent) and surface via the thread's poll.

import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerNavProvider } from '../CornerContext.jsx';
import { supabase } from '../lib/supabase.js';
import { demoFixtureActive } from '../lib/fixtureClient.js';

// Real local no-Supabase mode is read-only; explicit ?demo= fixtures keep the live
// composer so the send path stays browser-testable (Playwright owns the POSTs).
const composerLive = () => !!supabase || demoFixtureActive();
import { authFetch } from '../lib/authFetch.js';
import {
  ChatCoreProvider,
  ChatMessagesProvider,
  ChatVoiceProvider,
  ChatRecordingProvider,
  ChatAttachmentsProvider,
  ChatComposerProvider,
  ChatSettingsProvider,
  ChatContextMenuProvider,
} from '../components/cv3/chat/ChatPanelContext.jsx';
import useChatAttachments from '../components/cv3/chat/useChatAttachments.js';
import useChatRecording from '../components/cv3/chat/useChatRecording.js';
import useChatSettings from '../components/cv3/chat/useChatSettings.js';
import VoiceModeBar from '../components/cv3/thread/VoiceModeBar.jsx';
import Cv6InputBar from './Cv6InputBar.jsx';
import { roomChecklistKey } from './data/roomKeys.js';
import VoiceChat from '../components/VoiceChat.jsx';

const READ_ONLY_COPY = 'Chat needs a connected workspace. Local mode is read-only.';

// Map a CV6 quick-room object -> the { selectedAgent, selectedProject } shape the
// CV4 hooks expect. Project + mission rooms talk to the EA agent ('corner') but
// carry project/mission scope; agent rooms map straight to the agent slug.
function mapRoom(room, agents) {
  if (!room) return { selectedAgent: null, selectedProject: null };
  if (room.isMission) {
    return {
      selectedAgent: { id: 'corner', slug: 'corner', name: room.name || 'Assistant', color: '#3B82F6' },
      selectedProject: { id: room.projectSlug || room.id, slug: room.projectSlug || room.id, name: room.name || room.projectSlug, missionSlug: room.missionSlug || room.id },
    };
  }
  if (room.isProject) {
    return {
      selectedAgent: { id: 'corner', slug: 'corner', name: room.name || 'Assistant', color: '#3B82F6' },
      selectedProject: { id: room.id, slug: room.id, name: room.name || room.id },
    };
  }
  const match = Array.isArray(agents) ? agents.find((a) => a.slug === room.id || a.id === room.id) : null;
  return {
    // Ensure a slug even when the CV6 room row doesn't carry one (agent-scoped
    // features key off selectedAgent.slug).
    selectedAgent: match ? { ...match, slug: match.slug || room.id } : { id: room.id, slug: room.id, name: room.name || room.id, color: '#3B82F6' },
    selectedProject: null,
  };
}

function Cv6FullComposerInner({ target, room, worldId, quickSend, onClose, agents = [], roomOptions = [], onOpenFiles }) {
  // CornerCV6 is NOT mounted under the CV4 Corner context providers (it uses
  // useHome/useDataPipe standalone), so we can't read useCornerAuth/Data here —
  // worldId + agents come in as props and the user comes straight from supabase.
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    let alive = true;
    if (supabase?.auth?.getUser) {
      supabase.auth.getUser().then(({ data }) => { if (alive) setCurrentUser(data?.user || null); }).catch(() => {});
    }
    return () => { alive = false; };
  }, []);

  const { selectedAgent, selectedProject } = useMemo(() => mapRoom(room, agents), [room, agents]);
  const currentChatKey = roomChecklistKey(room) || 'home';
  const userIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id]);

  // ── Composer state ──
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const [selectedImageTool, setSelectedImageTool] = useState(null);
  const [pasteChips, setPasteChips] = useState([]);
  const addPasteChip = useCallback((text) => setPasteChips((p) => [...p, { id: `paste-${p.length}-${text.length}`, text, lineCount: text.split('\n').length }]), []);
  const removePasteChip = useCallback((id) => setPasteChips((p) => p.filter((c) => c.id !== id)), []);
  const [chatInputFocused, setChatInputFocused] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [interactionMode, setInteractionMode] = useState(() => {
    try { return localStorage.getItem(`cv6.chatMode.${currentChatKey}`) === 'plan' ? 'plan' : 'work'; } catch { return 'work'; }
  });
  useEffect(() => {
    let next = 'work';
    try { next = localStorage.getItem(`cv6.chatMode.${currentChatKey}`) === 'plan' ? 'plan' : 'work'; } catch { /* use work */ }
    setInteractionMode(next);
  }, [currentChatKey]);
  const changeInteractionMode = useCallback((next) => {
    const value = next === 'plan' ? 'plan' : 'work';
    setInteractionMode(value);
    try { localStorage.setItem(`cv6.chatMode.${currentChatKey}`, value); } catch { /* private mode */ }
  }, [currentChatKey]);

  // ── Throwaway messages slice. The col3 thread renders from useRoomThread; the
  // CV4 hooks only need setMessages for optimistic rows, which we let the thread
  // poll surface instead. ──
  const [, setBridgeMessages] = useState([]);
  const setMessages = useCallback((updater) => { setBridgeMessages(updater); }, []);

  // ── Post helper: drop a real row into the opened room, scoped like quickSend. ──
  const postToRoom = useCallback((text, role, metadata) => {
    if (!worldId || !room) return Promise.resolve();
    const payload = room.isMission
      ? { client_id: worldId, agent: 'corner', project: room.projectSlug, text, role, source: 'corner-dashboard', metadata: { mission_slug: room.missionSlug || room.id, ...(metadata || {}) } }
      : room.isProject
        ? { client_id: worldId, agent: 'corner', project: room.id, text, role, source: 'corner-dashboard', metadata }
        : { client_id: worldId, agent: room.id, text, role, source: 'corner-dashboard', metadata };
    return authFetch('/api/dashboard/supabase-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
  }, [worldId, room]);

  // ── Send: image-gen branch when a tool is pinned, else plain text via the
  // thread's own send (keeps the col3 optimistic bubble). ──
  // R3 send-feel contract: the input clears the instant you send (restored only on
  // an explicit failure), and repeat Enter during the in-flight window is a no-op
  // so a fast double-tap can never post twice.
  const sendingRef = useRef(false);
  const handleSend = useCallback(async () => {
    const base = input.trim();
    const chipsSuffix = pasteChips.length ? '\n\n' + pasteChips.map(c => c.text).join('\n\n') : '';
    const text = base + chipsSuffix;
    if (!text) return;
    if (!composerLive()) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      if (selectedImageTool) {
        setInput('');
        setPasteChips([]);
        const tool = selectedImageTool;
        setSelectedImageTool(null);
        try {
          const resp = await authFetch('/api/dashboard/image-gen', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, prompt: text, agent: selectedAgent?.slug || 'corner', project: selectedProject?.slug, client_id: worldId }),
          });
          const url = resp?.url || (resp?.b64 ? `data:image/png;base64,${resp.b64}` : null);
          if (url) {
            const att = { url, mime: 'image/png', name: `${tool}-image.png` };
            await postToRoom(`Generated image (${tool}): ${text}\n${url}`, 'user', { attachment: att, image_tool: tool });
          }
        } catch (_) { /* surfaced by the thread poll / toast */ }
        return;
      }
      setInput('');
      setPasteChips([]);
      // Keep the caret in the box: sending is a conversation beat, not an exit.
      try { inputRef.current?.focus?.(); } catch { /* portal not mounted yet */ }
      const ok = typeof quickSend === 'function' ? await quickSend(text, { interactionMode }) : false;
      if (ok === false) {
        // Honest failure: put the words back so nothing typed is ever lost — but
        // never clobber something newly typed during the in-flight window
        // (Steffen R3 queue item 1: restore only into an empty box).
        setInput((current) => (current ? current : base));
        if (chipsSuffix) setPasteChips((current) => (current.length ? current : pasteChips));
      }
    } finally {
      sendingRef.current = false;
    }
  }, [input, pasteChips, selectedImageTool, selectedAgent, selectedProject, worldId, quickSend, postToRoom, interactionMode]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  // A checklist item only becomes agent work through this explicit Play path.
  // Reuse the room thread sender so it receives the same optimistic rendering,
  // mission scoping, and Work/Plan metadata as a typed message.
  const checklistSendingRef = useRef(false);
  const playChecklistItem = useCallback(async (text) => {
    const value = String(text || '').trim();
    if (!value || typeof quickSend !== 'function' || checklistSendingRef.current) return false;
    checklistSendingRef.current = true;
    try { return await quickSend(value, { interactionMode }); }
    finally { checklistSendingRef.current = false; }
  }, [quickSend, interactionMode]);

  // ── Voice slice ──
  const voiceChatRef = useRef(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [voiceTranscriptText, setVoiceTranscriptText] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceMinimized, setVoiceMinimized] = useState(false);

  // ── Recording (dictation) routes transcribed text through the room send. ──
  const sendTextRef = useRef(null);
  sendTextRef.current = (text) => { if (text && typeof quickSend === 'function') quickSend(String(text).trim()); };

  // ── Real CV4 hooks, scoped to the room ──
  const attach = useChatAttachments({ selectedAgent, selectedProject, worldId, userIdentity, setMessages, sendProjectTextRef: sendTextRef });
  const recording = useChatRecording({ selectedAgent, selectedProject, sendAgentTextRef: sendTextRef, sendProjectTextRef: sendTextRef });
  const settings = useChatSettings({ selectedAgent, selectedProject, worldId, currentUser, currentChatKey });

  // ── Provider values ──
  const coreValue = useMemo(() => ({
    selectedAgent, setSelectedAgent: () => {}, selectedProject, agents: agents || [], worldId,
    currentUser, userIdentity, resetExchangeCount: () => {},
    onBack: onClose, chatInputFocused, setChatInputFocused,
  }), [selectedAgent, selectedProject, agents, worldId, currentUser, userIdentity, onClose, chatInputFocused]);

  const composerValue = useMemo(() => ({
    input, setInput, inputRef, handleSend, handleKeyDown,
    pasteChips, addPasteChip, removePasteChip, selectedImageTool, setSelectedImageTool,
    interactionMode, setInteractionMode: changeInteractionMode,
  }), [input, handleSend, handleKeyDown, pasteChips, addPasteChip, removePasteChip, selectedImageTool, interactionMode, changeInteractionMode]);

  const messagesValue = useMemo(() => ({ setMessages }), [setMessages]);

  const voiceValue = useMemo(() => ({
    isVoiceActive, setIsVoiceActive, voiceChatRef,
    voiceStatus, setVoiceStatus, voiceVolume, setVoiceVolume,
    voiceTranscriptText, setVoiceTranscriptText, voiceMuted, setVoiceMuted,
    voiceMinimized, setVoiceMinimized,
  }), [isVoiceActive, voiceStatus, voiceVolume, voiceTranscriptText, voiceMuted, voiceMinimized]);

  const attachValue = useMemo(() => ({ ...attach }), [attach]);
  const recordingValue = useMemo(() => ({ ...recording }), [recording]);
  // embedModalMission is added by ChatPanel (not the hook); ComposerCommandsMenu
  // reads it, so provide an inert pair to keep that menu item from throwing.
  const [embedModalMission, setEmbedModalMission] = useState(null);
  const settingsValue = useMemo(() => ({ ...settings, embedModalMission, setEmbedModalMission }), [settings, embedModalMission]);
  const ctxMenuValue = useMemo(() => ({ replyTo, setReplyTo }), [replyTo]);
  // ThreadInputBar reads useCornerNav (activeTool / selectedMail), which is absent
  // under CornerCV6 — supply a minimal nav so the Mail-chip branch stays inert.
  const navValue = useMemo(() => ({ activeTool: 'chat', selectedMail: null, setSelectedMail: () => {} }), []);

  if (!target || !room) return null;
  if (!composerLive()) return <ReadOnlyComposer target={target} room={room} />;

  return createPortal(
    <CornerNavProvider value={navValue}>
    <ChatCoreProvider value={coreValue}>
      <ChatMessagesProvider value={messagesValue}>
        <ChatVoiceProvider value={voiceValue}>
          <ChatRecordingProvider value={recordingValue}>
            <ChatAttachmentsProvider value={attachValue}>
              <ChatComposerProvider value={composerValue}>
                <ChatSettingsProvider value={settingsValue}>
                  <ChatContextMenuProvider value={ctxMenuValue}>
                    {isVoiceActive ? <VoiceModeBar /> : <Cv6InputBar onOpenFiles={onOpenFiles} room={room} worldId={worldId} roomOptions={roomOptions} onPlayChecklistItem={playChecklistItem} />}
                    {isVoiceActive && (
                      <div style={{ display: 'none' }}>
                        <VoiceChat
                          ref={voiceChatRef}
                          agentSlug={selectedAgent?.slug || 'corner'}
                          agentColor={selectedAgent?.color || '#3B82F6'}
                          clientId={worldId}
                          projectSlug={selectedProject?.slug}
                          missionSlug={selectedProject?.missionSlug}
                          autoStart
                          initialVoice={settings.currentVoice}
                          onVoiceChange={settings.selectVoice}
                          onStatusChange={setVoiceStatus}
                          onVolumeChange={setVoiceVolume}
                          onTranscript={(role, text) => {
                            setVoiceTranscriptText(text);
                            postToRoom(text, role === 'model' ? 'agent' : 'user', { source: 'voice' });
                          }}
                        />
                      </div>
                    )}
                  </ChatContextMenuProvider>
                </ChatSettingsProvider>
              </ChatComposerProvider>
            </ChatAttachmentsProvider>
          </ChatRecordingProvider>
        </ChatVoiceProvider>
      </ChatMessagesProvider>
    </ChatCoreProvider>
    </CornerNavProvider>,
    target,
  );
}

function ReadOnlyComposer({ target, room }) {
  if (!target || !room) return null;
  return createPortal(
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderTop: '1px solid var(--divider)' }}>
      <input
        data-testid="cv6-chat-input"
        value=""
        disabled
        readOnly
        aria-label={READ_ONLY_COPY}
        placeholder="Chat needs a connected workspace."
        style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 13px', color: 'var(--muted)', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', opacity: 1 }}
      />
      <span style={{ fontSize: 11.5, lineHeight: 1.3, color: 'var(--faint)', maxWidth: 148 }}>{READ_ONLY_COPY}</span>
    </div>,
    target,
  );
}

// Minimal always-works composer: the boundary's fallback so the quick-reply box
// NEVER vanishes, even if the full CV4 bridge throws. Plain text input + send,
// posting through the same useRoomThread send the col3 thread uses.
function MiniComposer({ target, room, quickSend }) {
  const [val, setVal] = useState('');
  if (!target || !room) return null;
  if (!composerLive()) return <ReadOnlyComposer target={target} room={room} />;
  const sendingRef = useRef(false);
  const send = async () => {
    const t = val.trim();
    if (t && typeof quickSend === 'function' && !sendingRef.current) {
      // Same R3 send-feel contract as the full composer: clear instantly, in-flight
      // guard, restore on explicit failure only into a still-empty box.
      sendingRef.current = true;
      setVal('');
      try {
        const ok = await quickSend(t);
        if (ok === false) setVal((current) => (current ? current : t));
      } finally { sendingRef.current = false; }
    }
  };
  const placeholderText = `Nudge ${room.name || 'them'}, or jump in…`;
  return createPortal(
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderTop: '1px solid var(--divider)' }}>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder={placeholderText}
        style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 13px', color: 'var(--fg)', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none' }}
      />
      <button onClick={send} title="Send" style={{ width: 40, height: 40, borderRadius: 11, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
      </button>
    </div>,
    target,
  );
}

// The provider bridge renders CV4's real composer against hand-built context
// values; a missing field would otherwise throw and take down the whole Home
// tree when a room opens. The boundary degrades that to the MiniComposer so the
// box is always present and usable, never absent.
class Cv6FullComposer extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { try { console.error('[Cv6FullComposer] render failed, falling back to MiniComposer:', err); } catch (_) { /* noop */ } }
  componentDidUpdate(prev) { if (this.state.failed && prev.room?.id !== this.props.room?.id) this.setState({ failed: false }); }
  render() {
    if (this.state.failed) {
      const { target, room, quickSend } = this.props;
      return <MiniComposer target={target} room={room} quickSend={quickSend} />;
    }
    return <Cv6FullComposerInner {...this.props} />;
  }
}

export default Cv6FullComposer;
