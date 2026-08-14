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
import { readRoutedHere, acceptRoutedHere } from './data/routedHere.js';
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
import { dispatchAgentSlug, resolveEffectiveRoomAgent, roomAgentPreferenceKey, resolveRoomHost, resolveEffectiveAgentForRoom } from './data/agentPreferences.js';
import { pickerAgents, titleForAgent } from './data/agentTitles.js';
import { pickSpecialistForMessage, isVisualAsk } from './data/agentRouting.js';
import { detectOverride, getThreadOverride, setThreadOverride } from './data/agentOverride.js';
import { handoffLine } from './data/agentHandoff.js';
import { useRoomThread } from './data/useRoomThread.js';
import VoiceChat from '../components/VoiceChat.jsx';

const READ_ONLY_COPY = 'Chat needs a connected workspace. Local mode is read-only.';

// Turn a whole checklist into one work-order message. Plain numbered lines with
// blank-line sections so it reads the same through the desktop markdown renderer
// and the mobile pre-wrap bubble. Returns '' when there is nothing open to send.
function formatChecklistWorkOrder(list) {
  const items = Array.isArray(list?.items) ? list.items : [];
  const open = items.filter((item) => !item.done && String(item.text || '').trim());
  if (!open.length) return '';
  const done = items.filter((item) => item.done && String(item.text || '').trim());
  const title = String(list?.title || 'Checklist').trim() || 'Checklist';
  const lines = [
    `Work order: "${title}" (${open.length} open, ${done.length} done)`,
    '',
    'Open items, in order:',
    ...open.map((item, index) => `${index + 1}. ${String(item.text).trim()}`),
  ];
  if (done.length) {
    lines.push('', `Already done, no action needed: ${done.map((item) => String(item.text).trim()).join(', ')}`);
  }
  lines.push('', 'Work through the open items in order. Report back on each item separately as you finish it so I can check it off. If an item is blocked, say why and move to the next one.');
  return lines.join('\n');
}

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

// Why the message did not go out, in the user's words. The thread keeps the bubble
// with its own retry; this line names the cause once, next to the box they typed in.
const SEND_ERROR_COPY = {
 offline: "You're offline, the message is still in the conversation, tap it to try again.",
  signed_out: 'Your session expired. Refresh the page to sign back in, then tap the message to send it.',
  timeout: 'That took too long to send. The message is still in the conversation, tap it to try again.',
  server: 'Corner could not accept that message. It is still in the conversation, tap it to try again.',
};

function Cv6FullComposerInner({ target, room, worldId, quickSend, onClose, agents = [], roomOptions = [], onOpenFiles, onClearRoom }) {
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
  // One line above the box naming WHY the last send did not go out. Offline, an expired
  // session and a 500 all used to look identical: the message simply disappeared
  // (corner:bridge frontend-visibility D3/D10).
  const [sendError, setSendError] = useState('');
  // SMOOTHNESS: brief "launch" pop on the send button after successful send
  const [sent, setSent] = useState(false);
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

  const agentPreferenceKey = roomAgentPreferenceKey(room);
  const [agentAssignments, setAgentAssignments] = useState({});
  const [roomAgentRoster, setRoomAgentRoster] = useState([]);
  const [agentSaving, setAgentSaving] = useState(false);
  const loadRoomAgents = useCallback(() => {
    if (!worldId || !agentPreferenceKey) {
      setAgentAssignments({});
      setRoomAgentRoster([]);
      return Promise.resolve({});
    }
    return authFetch(`/api/dashboard/room-agent?client=${encodeURIComponent(worldId)}`)
      .then((response) => {
        if (!response?.ok) throw new Error('room specialist load failed');
        return response.json();
      })
      .then(({ agents: liveAgents, assignments }) => {
        const next = assignments && typeof assignments === 'object' ? assignments : {};
        setAgentAssignments(next);
        setRoomAgentRoster(Array.isArray(liveAgents) ? liveAgents : []);
        return next;
      })
      .catch(() => {
        setAgentAssignments({});
        setRoomAgentRoster([]);
        return {};
      });
  }, [worldId, agentPreferenceKey]);
  useEffect(() => {
    loadRoomAgents();
    window.addEventListener('aom-agent-pref-changed', loadRoomAgents);
    return () => window.removeEventListener('aom-agent-pref-changed', loadRoomAgents);
  }, [loadRoomAgents]);
  // R-B1: host resolves from room subject, not generic corner/elon
  const hostSlug = resolveRoomHost(room)
  const hostTitle = titleForAgent(hostSlug)
  const selectedAgentSlug = resolveEffectiveRoomAgent(agentAssignments, agentPreferenceKey).slug;
  // R-B1: effective dispatch uses host when unpinned, not corner
  const effectiveAgent = resolveEffectiveAgentForRoom(room, agentAssignments, agentPreferenceKey)
  const dispatchAgent = effectiveAgent.slug === 'default' ? hostSlug : dispatchAgentSlug(selectedAgentSlug);
  // Expose host for header (R-B1: visible in room header by title)
  const roomHost = { slug: hostSlug, title: hostTitle, source: effectiveAgent.source }
  // #10 memory — thread history for routing context (TOP-20 #10)
  const { messages: threadMessages } = useRoomThread(worldId, room)

  // ── Throwaway messages slice. The col3 thread renders from useRoomThread; the
  // CV4 hooks only need setMessages for optimistic rows, which we let the thread
  // poll surface instead. ──
  const [, setBridgeMessages] = useState([]);
  const setMessages = useCallback((updater) => { setBridgeMessages(updater); }, []);

  // ── Post helper: drop a real row into the opened room, scoped like quickSend. ──
  //
  // corner:voice-chat 2026-07-27 — two attribution defects closed here:
  //
  //   * THE AUTHOR RIDES ALONG. userIdentity is derived from the live Supabase
  //     session a few lines up, and this path dropped it — so every row it wrote
  //     (voice turns, generated images) landed with a null author and downstream
  //     defaults filled in "Patrik". A human turn now carries the real person.
  //     An AGENT turn deliberately carries none: stamping the caller onto the
  //     agent's own words would say the person said what the agent said.
  //
  //   * THE CALLER'S SOURCE WINS. `source` was pinned to 'corner-dashboard' and
  //     the caller's { source: 'voice' } was buried inside metadata, so spoken
  //     messages were indistinguishable from typed ones in the permanent record
  //     — and, because 'corner-dashboard' is on supabase-listener's executable
  //     allowlist and 'voice' is not, every mid-call fragment was also being
  //     re-fired at the agent as fresh user input. The other two voice hosts
  //     (cv3 thread + project chat) have always written source:'voice'; this
  //     brings CV6 in line with them.
  const postToRoom = useCallback((text, role, options) => {
    if (!worldId || !room) return Promise.resolve();
    const { source: sourceOverride, agent: agentOverride, ...rest } = options || {};
    const source = sourceOverride || 'corner-dashboard';
    const extraMeta = Object.keys(rest).length ? rest : null;
    const author = role === 'user' && userIdentity.user_id
      ? { user_id: userIdentity.user_id, ...(userIdentity.user_name ? { user_name: userIdentity.user_name } : {}) }
      : {};
    const base = { client_id: worldId, text, role, source, ...author };
    const roomAgent = agentOverride || dispatchAgent;
    const payload = room.isMission
      ? { ...base, agent: roomAgent, project: room.projectSlug, metadata: { mission_slug: room.missionSlug || room.id, ...(extraMeta || {}) } }
      : room.isProject
        ? { ...base, agent: roomAgent, project: room.id, ...(extraMeta ? { metadata: extraMeta } : {}) }
        : { ...base, agent: room.id, ...(extraMeta ? { metadata: extraMeta } : {}) };
    return authFetch('/api/dashboard/supabase-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
  }, [worldId, room, userIdentity, dispatchAgent]);

  const selectRoomAgent = useCallback(async (slug) => {
    if (!worldId || !agentPreferenceKey || agentSaving) return false;
    const nextSlug = String(slug || 'default').trim().toLowerCase();
    if (nextSlug === selectedAgentSlug) return true;
    const previous = agentAssignments;
    setAgentSaving(true);
    setAgentAssignments((current) => {
      const next = { ...current };
      if (nextSlug === 'default') delete next[agentPreferenceKey];
      else next[agentPreferenceKey] = nextSlug;
      return next;
    });
    try {
      const response = await authFetch('/api/dashboard/room-agent', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: agentPreferenceKey, agent: nextSlug, client_id: worldId }),
      });
      if (!response?.ok) throw new Error('room specialist save failed');
      window.dispatchEvent(new Event('aom-agent-pref-changed'));
      return true;
    } catch {
      setAgentAssignments(previous);
      return false;
    } finally {
      setAgentSaving(false);
    }
  }, [worldId, agentPreferenceKey, agentSaving, selectedAgentSlug, agentAssignments]);

  // ── Send: image-gen branch when a tool is pinned, else plain text via the
  // thread's own send (keeps the col3 optimistic bubble). ──
  // R3 send-feel contract: the input clears the instant you send (restored only on
  // an explicit failure), and repeat Enter during the in-flight window is a no-op
  // so a fast double-tap can never post twice.
  // ── Implicit accept of a front-door route (corner:front-door R11) ──
  //
  // If Corner picked this room for you and you then keep talking IN it, that is a
  // confirmation it picked right — a stronger one than the "Got it" tap, because almost
  // nobody taps "Got it". Without this, an auto-routed message stays pending forever and
  // is quarantined out of the room's description permanently, which would starve rooms
  // the user only ever reaches through the front door of any self-description at all.
  //
  // Deliberately NOT a timeout. Fifteen minutes passing means the user walked away, not
  // that they agreed, and accepting on a timer would just re-arm the magnet more slowly.
  // This fires on a real action or not at all.
  const acceptIfRouted = useCallback(() => {
    if (!worldId || !room) return;
    const rec = readRoutedHere(room, worldId);   // already scoped to this room + world + TTL
    if (rec?.messageId) acceptRoutedHere({ worldId, messageId: rec.messageId });
  }, [worldId, room]);

  const sendingRef = useRef(false);
  const lastSubmitRef = useRef({ text: '', ts: 0 });
  const handleSend = useCallback(async () => {
    const base = input.trim();
    const chipsSuffix = pasteChips.length ? '\n\n' + pasteChips.map(c => c.text).join('\n\n') : '';
    const text = base + chipsSuffix;
    if (!text) return;
    if (!composerLive()) return;
    // DEDUP-11: 50ms debounce before second POST — two identical sends 20ms apart = 1 row
    const _now = Date.now();
    if (text === lastSubmitRef.current.text && (_now - lastSubmitRef.current.ts) < 50) return;
    lastSubmitRef.current = { text, ts: _now };
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      if (selectedImageTool) {
        setInput('');
        setPasteChips([]);
        const tool = selectedImageTool;
        setSelectedImageTool(null);
        setSendError('');
        try {
          const resp = await authFetch('/api/dashboard/image-gen', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, prompt: text, agent: selectedAgent?.slug || 'corner', project: selectedProject?.slug, client_id: worldId }),
          });
          // authFetch hands back a fetch Response, NOT the parsed body. Reading `.url`
          // off it read the REQUEST url — always truthy, even on a 500 — so every
          // image generation, including every failure, posted a "Generated image" card
          // whose attachment pointed at the API endpoint itself (corner:bridge
          // frontend-visibility D10). Parse the body, then judge it.
          let payload = null;
          try { payload = await resp.json(); } catch { payload = null; }
          const url = (resp && resp.ok && payload)
            ? (payload.url || (payload.b64 ? `data:image/png;base64,${payload.b64}` : ''))
            : '';
          if (url) {
            const att = { url, mime: 'image/png', name: `${tool}-image.png` };
            await postToRoom(`Generated image (${tool}): ${text}\n${url}`, 'user', { attachment: att, image_tool: tool });
            acceptIfRouted();
          } else {
            // A failed generation says so and gives the prompt back, instead of posting
            // a card that opens nothing.
            setSendError(payload?.error ? `Image failed: ${payload.error}` : 'The image could not be generated. Your prompt is back in the box.');
            setInput((current) => (current ? current : base));
            if (chipsSuffix) setPasteChips((current) => (current.length ? current : pasteChips));
            setSelectedImageTool(tool);
          }
        } catch (_) {
          setSendError('The image could not be generated. Your prompt is back in the box.');
          setInput((current) => (current ? current : base));
          if (chipsSuffix) setPasteChips((current) => (current.length ? current : pasteChips));
          setSelectedImageTool(tool);
        }
        return;
      }
      setInput('');
      setPasteChips([]);
      setSendError('');
      // Keep the caret in the box: sending is a conversation beat, not an exit.
      try { inputRef.current?.focus?.(); } catch { /* portal not mounted yet */ }
      // R-B2/B3/B4/B5: routing, handoff, Creative-first, correction — all inside the room.
      // The host (R-B1) stays visible; when work belongs elsewhere the host pulls the
      // specialist into the same thread, in speech, running their own method. Routing
      // is tunable (keywords), the process is not — Creative-first is the floor.
      let effectiveAgent = dispatchAgent
      let handoffMeta = null
      const override = detectOverride(text)
      if (override) {
        // R-B5: one plain sentence moves the stick this turn and holds for thread
        setThreadOverride(room, override.slug)
        effectiveAgent = override.slug
        if (override.slug !== hostSlug) {
          handoffMeta = { handoffTo: override.slug, handoffFrom: hostSlug }
        }
      } else {
        const threadOverride = getThreadOverride(room)
        if (threadOverride && threadOverride.slug) {
          effectiveAgent = threadOverride.slug
          if (threadOverride.slug !== hostSlug) {
            handoffMeta = { handoffTo: threadOverride.slug, handoffFrom: hostSlug }
          }
        } else {
          // R-B4: visual asks route to Creative first, always — hard floor
          if (isVisualAsk(text)) {
            effectiveAgent = 'director'
            if (hostSlug !== 'director') handoffMeta = { handoffTo: 'director', handoffFrom: hostSlug }
          } else {
            const picked = pickSpecialistForMessage(text, { priorMessages: (threadMessages || []).slice(-10) })
            if (picked && picked.slug !== hostSlug) {
              effectiveAgent = picked.slug
              handoffMeta = { handoffTo: picked.slug, handoffFrom: hostSlug }
            }
          }
        }
      }
      // R-A1: send-to-signal contract — awaiting:true committed before network (useRoomThread does this)
      // `onKeptInThread` fires when the room thread has kept the failed message as a
      // bubble you can retry. In that case restoring the text here too would show your
      // words in two places at once, so the thread's copy wins.
      let keptInThread = false;
      const sendAgent = effectiveAgent || dispatchAgent
      const sendOpts = { interactionMode, agent: sendAgent, onKeptInThread: (reason) => { keptInThread = true; setSendError(SEND_ERROR_COPY[reason] || SEND_ERROR_COPY.server); } }
      if (handoffMeta) {
        sendOpts.handoffTo = handoffMeta.handoffTo
        sendOpts.handoffFrom = handoffMeta.handoffFrom
      }
      const ok = typeof quickSend === 'function'
        ? await quickSend(text, sendOpts)
        : false;
      if (ok !== false) { acceptIfRouted(); setSent(true); setTimeout(() => setSent(false), 250); }
      if (ok === false && !keptInThread) {
        // Honest failure: put the words back so nothing typed is ever lost — but
        // never clobber something newly typed during the in-flight window
        // (Steffen R3 queue item 1: restore only into an empty box).
        setInput((current) => (current ? current : base));
        if (chipsSuffix) setPasteChips((current) => (current.length ? current : pasteChips));
      }
    } finally {
      sendingRef.current = false;
    }
  }, [input, pasteChips, selectedImageTool, selectedAgent, selectedProject, worldId, quickSend, postToRoom, interactionMode, dispatchAgent, acceptIfRouted, hostSlug, room]);

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
    // Keep the checklist visible: Play is one step inside list triage, not an
    // instruction to dismiss the whole composer before the next item is handled.
    try { return await quickSend(value, { interactionMode, agent: dispatchAgent, keepComposerOpen: true }); }
    finally { checklistSendingRef.current = false; }
  }, [quickSend, interactionMode, dispatchAgent]);

  // Whole-list Play: one message carrying the list verbatim as a work order.
  // Numbered plain lines read correctly on both renderers (desktop markdown,
  // mobile pre-wrap). The list stays in the panel as the scoreboard; the agent
  // is told to report per item so the user can check items off with confidence.
  const playChecklistList = useCallback(async (list) => {
    const message = formatChecklistWorkOrder(list);
    if (!message || typeof quickSend !== 'function' || checklistSendingRef.current) return false;
    checklistSendingRef.current = true;
    try { return await quickSend(message, { interactionMode, agent: dispatchAgent, keepComposerOpen: true }); }
    finally { checklistSendingRef.current = false; }
  }, [quickSend, interactionMode, dispatchAgent]);

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
  sendTextRef.current = (text) => { if (text && typeof quickSend === 'function') quickSend(String(text).trim(), { agent: dispatchAgent }); };

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

  const agentRoster = useMemo(() => pickerAgents(roomAgentRoster), [roomAgentRoster]);
  const agentPicker = useMemo(() => {
    const current = agentRoster.find((entry) => entry.slug === selectedAgentSlug) || agentRoster[0];
    return {
      enabled: !!agentPreferenceKey,
      title: current?.slug === 'default' ? `${hostTitle} (default)` : (current?.title || 'Room default'),
      blurb: current?.blurb || '',
      roster: agentRoster,
      roomSelection: selectedAgentSlug,
      saving: agentSaving,
      select: selectRoomAgent,
    };
  }, [agentRoster, selectedAgentSlug, agentPreferenceKey, agentSaving, selectRoomAgent, hostTitle]);

  const composerValue = useMemo(() => ({
    input, setInput, inputRef, handleSend, handleKeyDown,
    pasteChips, addPasteChip, removePasteChip, selectedImageTool, setSelectedImageTool,
    interactionMode, setInteractionMode: changeInteractionMode, agentPicker, sent,
  }), [input, handleSend, handleKeyDown, pasteChips, addPasteChip, removePasteChip, selectedImageTool, interactionMode, changeInteractionMode, agentPicker, sent]);

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
                    {sendError && !isVoiceActive ? (
                      <div className="cv6-send-error" role="alert">
                        <span>{sendError}</span>
                        <button type="button" aria-label="Dismiss" onClick={() => setSendError('')}>×</button>
                      </div>
                    ) : null}
                    {isVoiceActive ? <VoiceModeBar /> : <Cv6InputBar onOpenFiles={onOpenFiles} room={room} worldId={worldId} roomOptions={roomOptions} onPlayChecklistItem={playChecklistItem} onPlayChecklistList={playChecklistList} onClearRoom={onClearRoom} />}
                    {isVoiceActive && (
                      <div style={{ display: 'none' }}>
                        <VoiceChat
                          ref={voiceChatRef}
                          agentSlug={selectedAgent?.slug || 'corner'}
                          // Only an agent room has a real agent NAME. In a project
                          // or mission room selectedAgent.name is the ROOM's name
                          // (mapRoom above), which would mislabel the speaker — so
                          // those fall back to the slug.
                          agentName={(room?.isProject || room?.isMission) ? null : (selectedAgent?.name || null)}
                          agentColor={selectedAgent?.color || '#3B82F6'}
                          clientId={worldId}
                          projectSlug={selectedProject?.slug}
                          missionSlug={selectedProject?.missionSlug}
                          autoStart
                          initialVoice={settings.currentVoice}
                          onVoiceChange={settings.selectVoice}
                          onStatusChange={setVoiceStatus}
                          onVolumeChange={setVoiceVolume}
                          // (text, role) — NOT (role, text). VoiceChat.jsx calls
                          // onTranscript?.(text, role) at all nine of its call
                          // sites. This handler had the two reversed, so it posted
                          // the literal word "user"/"model" as the message body,
                          // never wrote a spoken word, and compared a whole
                          // sentence against 'model' — which is never true, so
                          // EVERY turn including the agent's own replies was filed
                          // as the human. That is why CV6 voice rooms read as one
                          // person talking to themselves. (2026-07-27)
                          onTranscript={(text, role) => {
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
  const sendingRef = useRef(false);
  const lastMiniSubmitRef = useRef({ text: '', ts: 0 });
  if (!target || !room) return null;
  if (!composerLive()) return <ReadOnlyComposer target={target} room={room} />;
  const send = async () => {
    const t = val.trim();
    // DEDUP-11: 50ms debounce for fallback composer too
    const _mnNow = Date.now();
    if (t === lastMiniSubmitRef.current.text && (_mnNow - lastMiniSubmitRef.current.ts) < 50) return;
    lastMiniSubmitRef.current = { text: t, ts: _mnNow };
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