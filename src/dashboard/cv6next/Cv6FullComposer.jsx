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

import { Component, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCornerAuth, useCornerData } from '../CornerContext.jsx';
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
import ThreadInputBar from '../components/cv3/thread/ThreadInputBar.jsx';
import VoiceModeBar from '../components/cv3/thread/VoiceModeBar.jsx';
import VoiceChat from '../components/VoiceChat.jsx';

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
    selectedAgent: match || { id: room.id, slug: room.id, name: room.name || room.id, color: '#3B82F6' },
    selectedProject: null,
  };
}

function Cv6FullComposerInner({ target, room, worldId: worldIdProp, quickSend, onClose }) {
  const { currentUser, worldId: worldIdAuth } = useCornerAuth();
  const { agents } = useCornerData();
  const worldId = worldIdProp || worldIdAuth;

  const { selectedAgent, selectedProject } = useMemo(() => mapRoom(room, agents), [room, agents]);
  const currentChatKey = selectedAgent?.slug || (selectedProject ? `project:${selectedProject.slug}` : 'home');
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
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    if (selectedImageTool) {
      setInput('');
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
    if (typeof quickSend === 'function') quickSend(text);
  }, [input, selectedImageTool, selectedAgent, selectedProject, worldId, quickSend, postToRoom]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

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
  }), [input, handleSend, handleKeyDown, pasteChips, addPasteChip, removePasteChip, selectedImageTool]);

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

  if (!target || !room) return null;

  return createPortal(
    <ChatCoreProvider value={coreValue}>
      <ChatMessagesProvider value={messagesValue}>
        <ChatVoiceProvider value={voiceValue}>
          <ChatRecordingProvider value={recordingValue}>
            <ChatAttachmentsProvider value={attachValue}>
              <ChatComposerProvider value={composerValue}>
                <ChatSettingsProvider value={settingsValue}>
                  <ChatContextMenuProvider value={ctxMenuValue}>
                    {isVoiceActive ? <VoiceModeBar /> : <ThreadInputBar />}
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
    </ChatCoreProvider>,
    target,
  );
}

// The provider bridge renders CV4's real composer against hand-built context
// values; a missing field would otherwise throw and take down the whole Home
// tree when a room opens. The boundary degrades that to "no composer" instead.
class Cv6FullComposer extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { try { console.error('[Cv6FullComposer] render failed:', err); } catch (_) { /* noop */ } }
  componentDidUpdate(prev) { if (this.state.failed && prev.room?.id !== this.props.room?.id) this.setState({ failed: false }); }
  render() { return this.state.failed ? null : <Cv6FullComposerInner {...this.props} />; }
}

export default Cv6FullComposer;
