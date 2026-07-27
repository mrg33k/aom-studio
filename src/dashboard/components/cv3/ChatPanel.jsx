// ChatPanel -- shell + Provider composition root for the chat tree.
//
// R3b (Apr 17, 2026): replaced the single ~80-field ctx object that was
// prop-drilled through the three views with feature-sliced local contexts
// (see ./chat/ChatPanelContext.jsx). The shell is now the one composition
// scope: it runs every hook, owns the shared refs that two+ hooks needed
// to see (inputRef, pendingAttachmentsRef, sendAgentTextRef /
// sendProjectTextRef, voiceChatRef, messagesEndRef/Ref), and wraps the
// three child views in nested Providers. Child views read via useChatXxx()
// hooks — they receive no chat props.
//
// R3d (Apr 17, 2026): cross-cutting state (auth/world/data/nav) now flows
// in via the top-level CornerContext (see src/dashboard/CornerContext.jsx)
// instead of plain props. ChatPanel takes zero cross-cutting props — it
// reads useCornerAuth/Data/Nav at the top and feeds the values into the
// scoped hooks + memoized provider values exactly as before.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProjects } from '../../hooks/useProjects'
import { formatRelativeTime } from '../../timeUtils'
import { authFetch } from '../../lib/authFetch.js'
import { useCornerAuth, useCornerData, useCornerNav } from '../../CornerContext.jsx'
import ProjectChatView from './ProjectChatView.jsx'
import ConversationsView from './ConversationsView.jsx'
import ThreadView from './ThreadView.jsx'
import missionsRegistry from '../../data/missions-registry.json'
import { buildSlugLookup, missionSlugsMatch } from '../../data/canonicalize-mission-slug.js'

// Built once per module load. Tiny (84 entries today); fine to hold in memory.
const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

import { GREETINGS, VOICE_OPTIONS } from './chat/chatConstants.js'
import useBridgeStream from './chat/useBridgeStream.js'
import useChatPrefs from './chat/useChatPrefs.js'
import useChatConversations from './chat/useChatConversations.js'
import useChatMessages from './chat/useChatMessages.js'
import useChatSettings from './chat/useChatSettings.js'
import useChatAttachments from './chat/useChatAttachments.js'
import useChatRecording from './chat/useChatRecording.js'
import useChatSend from './chat/useChatSend.js'
import useChatContextMenu from './chat/useChatContextMenu.js'
import { getProjectEA } from '../../data/project-ea.js'
import {
  ChatCoreProvider,
  ChatMessagesProvider,
  ChatSendProvider,
  ChatComposerProvider,
  ChatAttachmentsProvider,
  ChatRecordingProvider,
  ChatVoiceProvider,
  ChatSettingsProvider,
  ChatSearchProvider,
  ChatContextMenuProvider,
  ChatConversationsProvider,
  ChatPrefsProvider,
} from './chat/ChatPanelContext.jsx'

export default function ChatPanel() {
  const { currentUser, worldId } = useCornerAuth()
  const { agents, inboxItems, projectRooms, allTasks = [] } = useCornerData()
  const {
    selectedAgent: initialAgent,
    handleSelectAgent: onSelectAgent,
    handleSelectProject: onSelectProject,
    handleBackFromConversation: onBack,
    conversationTarget,
    prefillMessage,
    setPrefillMessage,
    stageFilesRef,
    // R-CV4-4: optional CV4 home override. When CV4 injects a node here
    // (e.g. <HomeViewCv4 />), ChatPanel renders it instead of the cv3
    // ConversationsView fallback. Undefined under V3 → defaults preserved.
    cv4HomeView,
  } = useCornerNav()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  // 2026-05-29: when the user lands on /dashboard/project/X?mission=Y directly
  // (URL bar, bookmark, share-link, hard refresh), conversationTarget is empty
  // so selectedProject.missionSlug stayed undefined → upload metadata never
  // carried mission_slug → Files panel filter showed zero files in the room.
  // Pull mission from the URL search params so direct navigation works the
  // same as drawer-click navigation.
  const urlMissionSlug = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search || '')
      return (sp.get('mission') || '').trim() || null
    } catch (_) { return null }
  }, [location.search])

  // ── Shared refs (shell owns these so hooks can see the same mutable slot) ─
  // pendingAttachmentsRef + sendAgentTextRef/sendProjectTextRef are the
  // former "circular ref" between useChatAttachments and useChatSend;
  // allocating them here and populating from the hook returns keeps both
  // sides decoupled without feature change.
  const inputRef = useRef(null)
  const voiceChatRef = useRef(null)
  const voiceMinimizedAgent = useRef(null) // { type: 'agent'|'project', data }
  const sendAgentTextRef = useRef(null)
  const sendProjectTextRef = useRef(null)
  const chatSearchRef = useRef(null)

  // ── Shell selection + composer state ──────────────────────────────────────
  const [selectedAgent, setSelectedAgent] = useState(initialAgent || null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatInputFocused, setChatInputFocused] = useState(false)
  const [inlineProject, setInlineProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  // Image-gen tool selection (left-side composer icon → popover → chip).
  // null when not generating; 'gemini' | 'ideogram' | 'openai' when pinned.
  // useChatSend reads this to branch from chat-bridge to /api/dashboard/image-gen.
  const [selectedImageTool, setSelectedImageTool] = useState(null)

  // ── Paste chips (large paste → chip instead of inline text) ───────────────
  const [pasteChips, setPasteChips] = useState([])
  const pasteChipsRef = useRef([])
  useEffect(() => { pasteChipsRef.current = pasteChips }, [pasteChips])
  const addPasteChip = useCallback((text) => {
    const lineCount = text.split('\n').length
    setPasteChips(prev => [...prev, { id: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, lineCount }])
  }, [])
  const removePasteChip = useCallback((id) => {
    setPasteChips(prev => prev.filter(c => c.id !== id))
  }, [])
  const clearPasteChips = useCallback(() => setPasteChips([]), [])

  // ── Voice slice (shell-local state) ───────────────────────────────────────
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('idle')
  const [voiceVolume, setVoiceVolume] = useState(0)
  const [voiceTranscriptText, setVoiceTranscriptText] = useState('')
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [voiceMinimized, setVoiceMinimized] = useState(false)

  // ── Session hygiene: exchange counter + handoff nudge (R75-b3) ────────────
  // Target turn randomised in [10, 15] so the nudge doesn't always land on 10.
  // Snooze bumps the target by +5 to +10. Dismiss persists per (world, chat)
  // so the user isn't nagged again after an explicit ×.
  const pickNudgeTarget = () => 10 + Math.floor(Math.random() * 6) // 10-15 inclusive
  const pickSnoozeDelta = () => 5 + Math.floor(Math.random() * 6)  // 5-10 inclusive
  const [exchangeCount, setExchangeCount] = useState(0)
  const [nudgeTargetTurn, setNudgeTargetTurn] = useState(pickNudgeTarget)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  const resetExchangeCount = useCallback(() => {
    setExchangeCount(0)
    setNudgeTargetTurn(pickNudgeTarget())
    setNudgeDismissed(false)
  }, [])

  const onMessageSent = useCallback(() => {
    setExchangeCount(prev => prev + 1)
  }, [])

  // (Session-hygiene reset effect moved below selectedProject useMemo; it
  //  referenced selectedProject before declaration and threw a TDZ in prod.)

  // ── Mobile + rotating greeting ────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [greetingIdx] = useState(() => Math.floor(Math.random() * GREETINGS.length))

  const displayName = useMemo(() =>
    currentUser?.user_metadata?.full_name?.split(' ')[0] ||
    currentUser?.email?.split('@')[0] ||
    'there'
  , [currentUser?.id])
  const lastLoginText = formatRelativeTime(currentUser?.last_sign_in_at)

  const userIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id])

  // ── Projects merge (dbProjects + agent_status projectRooms) ───────────────
  const { projects: dbProjects, refetch: refetchProjects } = useProjects(worldId)
  const projects = useMemo(() => {
    if (projectRooms && projectRooms.length > 0) {
      const roomsBySlug = Object.fromEntries(projectRooms.map(r => [r.slug, r]))
      const dbSlugs = new Set((dbProjects || []).map(p => p.slug))
      const unmatchedRooms = projectRooms.filter(p => !dbSlugs.has(p.slug))
      const mergedDb = (dbProjects || []).map(p =>
        roomsBySlug[p.slug] ? { ...p, status: roomsBySlug[p.slug].status } : p
      )
      return [...mergedDb, ...unmatchedRooms]
    }
    return dbProjects || []
  }, [dbProjects, projectRooms])

  const selectedProject = useMemo(() => {
    // R3 corner:mission-rooms — when the room scope was entered via a
    // mission click (drawer or file-manager), conversationTarget carries
    // missionSlug + missionName. Surface them on selectedProject so the
    // chat-send path can pass them through to the bridge.
    // 2026-05-29: ALSO accept missionSlug from the URL search param (?mission=Y)
    // so direct navigation/bookmarks/share-links land in the mission scope.
    const ctMission = conversationTarget?.missionSlug && conversationTarget?.slug === projectId
      ? {
          missionSlug: conversationTarget.missionSlug,
          missionName: conversationTarget.missionName,
          missionPath: conversationTarget.missionPath,
        }
      : null
    const missionScope = ctMission || (urlMissionSlug
      ? { missionSlug: urlMissionSlug, missionName: urlMissionSlug, missionPath: null }
      : null)
    if (inlineProject) return missionScope ? { ...inlineProject, ...missionScope } : inlineProject
    if (!projectId) return null
    if (projects?.length) {
      const found =
        projects.find(p => String(p.id) === String(projectId)) ||
        projects.find(p => String(p.slug).toLowerCase() === String(projectId).toLowerCase())
      if (found) return missionScope ? { ...found, ...missionScope } : found
    }
    // Match by id first (legacy /dashboard/project/:projectId), then by
    // slug (R21a /dashboard/projects/:slug/chat). Both routes hand us the
    // same useParams key so one lookup covers both shapes.
    // Synthetic fallback: if projects haven't loaded yet (e.g. Supabase loading),
    // still resolve the project from the URL slug so the input bar is usable.
    return missionScope
      ? { id: projectId, slug: projectId, name: projectId, ...missionScope }
      : { id: projectId, slug: projectId, name: projectId }
  }, [projectId, projects, inlineProject, conversationTarget?.missionSlug, conversationTarget?.missionName, conversationTarget?.missionPath, conversationTarget?.slug, urlMissionSlug])

  // Reset session-hygiene counters and paste chips when conversation changes.
  // Must come AFTER selectedProject is defined above — referencing it in a dep
  // array before its useMemo declaration throws TDZ in the prod build.
  useEffect(() => {
    setExchangeCount(0)
    setNudgeTargetTurn(pickNudgeTarget())
    setNudgeDismissed(false)
    setPasteChips([])
  }, [selectedAgent?.slug, selectedProject?.slug])

  const currentChatKey = selectedAgent?.slug || (selectedProject ? `project:${selectedProject.slug}` : 'home')

  // Dismiss persistence -- restore on chat switch, write on dismiss.
  // Keyed by (worldId, chatKey) so multiple worlds and chats each get their own
  // sticky dismiss. Wrapped in try/catch for SSR / disabled-storage environments.
  useEffect(() => {
    try {
      const key = `aom_handoff_nudge_dismissed_${worldId || 'x'}:${currentChatKey}`
      if (localStorage.getItem(key) === '1') setNudgeDismissed(true)
    } catch {}
  }, [worldId, currentChatKey])

  const dismissHandoffNudge = useCallback(() => {
    setNudgeDismissed(true)
    try {
      const key = `aom_handoff_nudge_dismissed_${worldId || 'x'}:${currentChatKey}`
      localStorage.setItem(key, '1')
    } catch {}
  }, [worldId, currentChatKey])

  const snoozeHandoffNudge = useCallback(() => {
    setNudgeTargetTurn(t => Math.max(t, exchangeCount) + pickSnoozeDelta())
  }, [exchangeCount])

  const acceptHandoffNudge = useCallback(() => {
    // R75-b4 (2026-05-27): now fires the real trigger. Resolves the agent
    // slug using getProjectEA (same logic as useChatSend) so the endpoint
    // can write a properly-routed user message into the room's chat thread.
    // supabase-listener picks up the message and delivers it to the agent,
    // which then writes CONTEXT.md + last-conversation.md per follow-the-room-canon.
    try {
      const resolvedAgent = selectedAgent?.slug
        || getProjectEA(selectedProject, agents)
        || 'elon'
      const resolvedProject = selectedProject?.slug || null
      // authFetch, not fetch: session-handoff writes a user message the agent
      // acts on, so it now runs verifyTenant on world_id and names the author
      // from the JWT. Gate is world membership — Ash and Courtney pass on the
      // aom world exactly as Patrik does.
      authFetch('/api/dashboard/session-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: worldId,
          chat_key: currentChatKey,
          agent: resolvedAgent,
          ...(resolvedProject ? { project: resolvedProject } : {}),
        }),
      }).catch(() => {})
    } catch {}
    setExchangeCount(0)
    setNudgeTargetTurn(pickNudgeTarget())
    setNudgeDismissed(false)
  }, [worldId, currentChatKey, selectedAgent, selectedProject, agents])

  const showHandoffNudge = exchangeCount >= nudgeTargetTurn && !nudgeDismissed

  // ── Hooks: prefs → conversations → messages → bridge → ctx-menu →
  //          attachments → send → recording → settings. Order matters because
  //          later hooks consume refs/state from earlier ones (or the shell).
  const prefs = useChatPrefs({ worldId })

  const conv = useChatConversations({
    agents,
    projects,
    inboxItems,
    worldId,
    searchQuery,
    allTasks,
    isFav: prefs.isFav,
    isHidden: prefs.isHidden,
  })

  const msgs = useChatMessages({
    selectedAgent,
    selectedProject,
    worldId,
    currentUser,
  })

  const bridge = useBridgeStream({ setMessages: msgs.setMessages, refetchHistoryRef: msgs.refetchHistoryRef })

  // Poll /api/dashboard/message-steps while waiting for a reply.
  // RLS blocks realtime step delivery to the browser, so relay-emit-step.py
  // events only arrive via explicit refetch. Without polling they all appear
  // in one batch 300ms after the reply lands (the existing post-reply trigger).
  // With 1s polling, steps emitted by relay-respond.py or relay-emit-step.py
  // are picked up progressively while the user watches — fulfilling the R65
  // "each state lands as it happens" design.
  const _awaitingStepPollRef = useRef(false)
  useEffect(() => {
    const arr = msgs.messages
    for (let i = arr.length - 1; i >= 0; i--) {
      const id = String(arr[i].id)
      if (id.startsWith('temp-') || id.startsWith('bridge-stream-') || id.startsWith('voice-')) continue
      _awaitingStepPollRef.current = arr[i].role === 'user'
      return
    }
    _awaitingStepPollRef.current = false
  }, [msgs.messages])

  useEffect(() => {
    const timer = setInterval(() => {
      if (_awaitingStepPollRef.current || bridge.isAgentTyping) {
        msgs.refetchStepsRef?.current?.()
      }
    }, 1000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally stable — reads state through refs

  const cmenu = useChatContextMenu({
    worldId,
    selectedProject,
    userIdentity,
    inputRef,
  })

  const attach = useChatAttachments({
    selectedAgent,
    selectedProject,
    worldId,
    userIdentity,
    setMessages: msgs.setMessages,
    sendProjectTextRef,
  })

  const send = useChatSend({
    input, setInput,
    sending, setSending,
    selectedAgent, selectedProject, worldId, userIdentity,
    inputRef,
    setMessages: msgs.setMessages,
    pendingAttachmentsRef: attach.pendingAttachmentsRef,
    setPendingAttachments: attach.setPendingAttachments,
    replyTo: cmenu.replyTo,
    setReplyTo: cmenu.setReplyTo,
    setAgentPreviews: conv.setAgentPreviews,
    startBridgeStream: bridge.startBridgeStream,
    onMessageSent,
    pasteChipsRef,
    clearPasteChips,
    selectedImageTool,
    setSelectedImageTool,
  })
  // Populate the shared send refs from the returned callbacks — consumed
  // by useChatAttachments (auto-ack after upload) and useChatRecording
  // (voice transcript routing).
  useEffect(() => { sendAgentTextRef.current = send.sendAgentText }, [send.sendAgentText])
  useEffect(() => { sendProjectTextRef.current = send.sendProjectText }, [send.sendProjectText])
  // Expose stageFiles to the home-tab Attach button via CornerContext nav ref.
  useEffect(() => { if (stageFilesRef) stageFilesRef.current = attach.stageFiles }, [attach.stageFiles, stageFilesRef])

  const recording = useChatRecording({
    selectedAgent,
    selectedProject,
    sendAgentTextRef,
    sendProjectTextRef,
  })

  const settings = useChatSettings({
    selectedAgent,
    selectedProject,
    worldId,
    currentUser,
    currentChatKey,
  })

  // ── In-chat history search (shell-local — small slice, no scoped hook) ────
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchResults, setChatSearchResults] = useState(null)
  const [chatSearchLoading, setChatSearchLoading] = useState(false)

  const handleChatSearch = useCallback(async (query) => {
    if (!query || query.length < 2) { setChatSearchResults(null); return }
    const agent = selectedAgent?.slug || (selectedProject ? `project:${selectedProject.slug}` : null)
    if (!agent) return
    setChatSearchLoading(true)
    try {
      const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : (worldId || 'aom')
      const res = await authFetch(`/api/dashboard/supabase-messages?agent=${encodeURIComponent(agent)}&client=${encodeURIComponent(clientId)}&search=${encodeURIComponent(query)}&limit=500`)
      if (res.ok) {
        const data = await res.json()
        setChatSearchResults(data.messages || [])
      }
    } catch { setChatSearchResults([]) }
    setChatSearchLoading(false)
  }, [selectedAgent, selectedProject, worldId])

  useEffect(() => {
    if (!chatSearchOpen) return
    const timer = setTimeout(() => handleChatSearch(chatSearchQuery), 400)
    return () => clearTimeout(timer)
  }, [chatSearchQuery, chatSearchOpen, handleChatSearch])

  useEffect(() => {
    if (chatSearchOpen && chatSearchRef.current) chatSearchRef.current.focus()
  }, [chatSearchOpen])

  useEffect(() => {
    setChatSearchOpen(false)
    setChatSearchQuery('')
    setChatSearchResults(null)
  }, [selectedAgent, selectedProject])

  // ── Focus input when thread opens; close settings menu on navigation ──────
  useEffect(() => {
    if (selectedAgent) setTimeout(() => inputRef.current?.focus(), 100)
    settings.setSettingsOpen(false)
  }, [selectedAgent])

  // ── Memoized Provider values (one per slice) ──────────────────────────────
  const coreValue = useMemo(() => ({
    agents, inboxItems, allTasks, projects, chattableAgents: conv.chattableAgents,
    selectedAgent, setSelectedAgent,
    selectedProject, inlineProject, setInlineProject,
    currentChatKey,
    worldId, currentUser, userIdentity, displayName, lastLoginText,
    isMobile, greetingIdx, GREETINGS, VOICE_OPTIONS,
    projectId, navigate,
    onBack, onSelectAgent, onSelectProject,
    prefillMessage, setPrefillMessage,
    chatInputFocused, setChatInputFocused,
    showHandoffNudge, acceptHandoffNudge, snoozeHandoffNudge, dismissHandoffNudge, resetExchangeCount,
    refetchProjects,
  }), [
    agents, inboxItems, allTasks, projects, conv.chattableAgents,
    selectedAgent, selectedProject, inlineProject, currentChatKey,
    worldId, currentUser, userIdentity, displayName, lastLoginText,
    isMobile, greetingIdx, projectId, navigate,
    onBack, onSelectAgent, onSelectProject, prefillMessage, setPrefillMessage,
    chatInputFocused,
    showHandoffNudge, acceptHandoffNudge, snoozeHandoffNudge, dismissHandoffNudge, resetExchangeCount,
    refetchProjects,
  ])

  // mission-rooms: when the room is scoped to a specific mission, only
  // show messages tagged with that mission_slug. Outside a mission scope
  // (the project-wide room), collapse consecutive runs of mission-tagged
  // messages into a single condensed marker — keeps the project room from
  // doubling as a transcript of every mission while still acknowledging
  // "work was being done over there". Click → /cv4/project/<p>?mission=<m>.
  const visibleMessages = useMemo(() => {
    // Quiet the loop AT Patrik (2026-06-15 direction): the master-loop cycle briefs
    // are instructions written TO the assistant (role=user, metadata.master_loop),
    // not messages from Patrik — hide them from his chat. The assistant's real
    // replies and digests are NOT flagged, so they still show. UI-only: the room
    // bridge reads Supabase directly, so the loop still gets its briefs.
    const arr = (msgs.messages || []).filter(m => !(m?.metadata?.master_loop))
    const targetMission = selectedProject?.missionSlug || null
    if (targetMission) {
      return arr.filter(m => {
        const stored = m?.metadata?.mission_slug || null
        if (!stored) return false
        return missionSlugsMatch(stored, targetMission, MISSION_SLUG_LOOKUP)
      })
    }
    if (selectedProject) {
      const out = []
      let buf = null
      const flush = () => {
        if (!buf) return
        out.push({
          id: `mission-marker:${buf.firstId}`,
          source: 'mission-marker',
          role: 'system',
          text: '',
          timestamp: buf.lastTs,
          metadata: {
            mission_slug: buf.missionSlug,
            mission_name: buf.missionName,
            message_count: buf.count,
            last_activity_ts: buf.lastTs,
            project_slug: selectedProject.slug,
          },
        })
        buf = null
      }
      for (const m of arr) {
        const mission = m?.metadata?.mission_slug || null
        if (mission) {
          if (buf && buf.missionSlug === mission) {
            buf.count += 1
            buf.lastTs = m.timestamp || buf.lastTs
          } else {
            flush()
            buf = {
              missionSlug: mission,
              missionName: m?.metadata?.mission_name || mission,
              firstTs: m.timestamp,
              lastTs: m.timestamp,
              count: 1,
              firstId: m.id,
            }
          }
        } else {
          flush()
          out.push(m)
        }
      }
      flush()
      return out
    }
    return arr
  }, [msgs.messages, selectedProject?.missionSlug, selectedProject?.slug])

  const messagesValue = useMemo(() => ({
    messages: visibleMessages, setMessages: msgs.setMessages,
    loadingMsgs: msgs.loadingMsgs,
    messagesEndRef: msgs.messagesEndRef,
    messagesRef: msgs.messagesRef,
    userProfiles: msgs.userProfiles,
    stepsByMessageId: msgs.stepsByMessageId || {},  // R65-impl
  }), [visibleMessages, msgs.setMessages, msgs.loadingMsgs, msgs.messagesEndRef, msgs.messagesRef, msgs.userProfiles, msgs.stepsByMessageId])

  // Keystroke-stable. Consumed by MessageList + ThreadView + ProjectChatView +
  // the voice hosts. Deliberately excludes `input` and the input-bound handlers
  // (those moved to composerValue) so this reference does NOT change while the
  // user types — that's what stops the whole message thread from re-rendering
  // on every keystroke and makes a sent message paint instantly. (2026-05-22)
  const sendValue = useMemo(() => ({
    sending, setSending,
    sendAgentText: send.sendAgentText,
    sendProjectText: send.sendProjectText,
    sendAgentTextRef, sendProjectTextRef,
    isAgentTyping: bridge.isAgentTyping,
    // R73: expose setters so TypingIndicatorV2's stall-clear CTA can unmount
    // itself after firing /api/dashboard/clear-context.
    setIsAgentTyping: bridge.setIsAgentTyping,
  }), [
    sending, send.sendAgentText, send.sendProjectText,
    bridge.isAgentTyping, bridge.setIsAgentTyping,
  ])

  // Keystroke-volatile. Only the input bars (ThreadInputBar / ProjectInputBar)
  // read this slice, so its per-keystroke churn is contained to the composer
  // and never reaches the message thread.
  const composerValue = useMemo(() => ({
    input, setInput, inputRef,
    handleSend: send.handleSend,
    handleKeyDown: send.handleKeyDown,
    handleProjectSend: send.handleProjectSend,
    handleProjectKeyDown: send.handleProjectKeyDown,
    // Paste chips: large paste collapses to chip in composer
    pasteChips, addPasteChip, removePasteChip,
    // Image-gen tool selection — drives the left-side composer button.
    selectedImageTool, setSelectedImageTool,
  }), [
    input, send.handleSend, send.handleKeyDown,
    send.handleProjectSend, send.handleProjectKeyDown,
    pasteChips, addPasteChip, removePasteChip,
    selectedImageTool,
  ])

  const attachValue = useMemo(() => ({
    pendingAttachments: attach.pendingAttachments,
    setPendingAttachments: attach.setPendingAttachments,
    pendingAttachmentsRef: attach.pendingAttachmentsRef,
    stagingFiles: attach.stagingFiles,
    uploading: attach.uploading,
    fileInputRef: attach.fileInputRef,
    handleFileSelection: attach.handleFileSelection,
    stageFiles: attach.stageFiles,
    addPendingAttachment: attach.addPendingAttachment,
    removePendingAttachment: attach.removePendingAttachment,
  }), [attach.pendingAttachments, attach.stagingFiles, attach.uploading, attach.handleFileSelection, attach.stageFiles, attach.addPendingAttachment, attach.removePendingAttachment, attach.setPendingAttachments, attach.fileInputRef, attach.pendingAttachmentsRef])

  const recordingValue = useMemo(() => ({
    isRecording: recording.isRecording,
    recordingElapsed: recording.recordingElapsed,
    handleMicToggle: recording.handleMicToggle,
    micError: recording.micError,
    isTranscribing: recording.isTranscribing,
    lastTranscript: recording.lastTranscript,
  }), [recording.isRecording, recording.recordingElapsed, recording.handleMicToggle, recording.micError, recording.isTranscribing, recording.lastTranscript])

  const voiceValue = useMemo(() => ({
    isVoiceActive, setIsVoiceActive, voiceChatRef,
    voiceStatus, setVoiceStatus,
    voiceVolume, setVoiceVolume,
    voiceTranscriptText, setVoiceTranscriptText,
    voiceMuted, setVoiceMuted,
    voiceMinimized, setVoiceMinimized,
    voiceMinimizedAgent,
  }), [isVoiceActive, voiceStatus, voiceVolume, voiceTranscriptText, voiceMuted, voiceMinimized])

  const settingsValue = useMemo(() => ({
    settingsOpen: settings.settingsOpen, setSettingsOpen: settings.setSettingsOpen,
    settingsTab: settings.settingsTab, setSettingsTab: settings.setSettingsTab,
    filesOpen: settings.filesOpen, setFilesOpen: settings.setFilesOpen,
    canonFilesOpen: settings.canonFilesOpen, setCanonFilesOpen: settings.setCanonFilesOpen,
    profileOpen: settings.profileOpen, setProfileOpen: settings.setProfileOpen,
    recipesOpen: settings.recipesOpen, setRecipesOpen: settings.setRecipesOpen,
    chatNameInput: settings.chatNameInput, setChatNameInput: settings.setChatNameInput,
    inviteEmail: settings.inviteEmail, setInviteEmail: settings.setInviteEmail,
    inviteLoading: settings.inviteLoading, setInviteLoading: settings.setInviteLoading,
    inviteMsg: settings.inviteMsg, setInviteMsg: settings.setInviteMsg,
    collaborators: settings.collaborators, setCollaborators: settings.setCollaborators,
    envKeys: settings.envKeys, envKeysLoading: settings.envKeysLoading,
    newKeyName: settings.newKeyName, setNewKeyName: settings.setNewKeyName,
    newKeyValue: settings.newKeyValue, setNewKeyValue: settings.setNewKeyValue,
    newKeyScope: settings.newKeyScope, setNewKeyScope: settings.setNewKeyScope,
    keySaveMsg: settings.keySaveMsg, setKeySaveMsg: settings.setKeySaveMsg,
    agentVoices: settings.agentVoices, setAgentVoices: settings.setAgentVoices,
    currentVoice: settings.currentVoice, selectVoice: settings.selectVoice,
    agentModels: settings.agentModels, setAgentModels: settings.setAgentModels,
    currentModel: settings.currentModel, selectModel: settings.selectModel,
    globalModel: settings.globalModel, selectGlobalModel: settings.selectGlobalModel,
    saveRoomName: settings.saveRoomName,
    saveEnvKey: settings.saveEnvKey, deleteEnvKey: settings.deleteEnvKey,
  }), [
    settings.settingsOpen, settings.settingsTab, settings.filesOpen,
    settings.canonFilesOpen,
    settings.profileOpen, settings.recipesOpen,
    settings.chatNameInput, settings.inviteEmail, settings.inviteLoading,
    settings.inviteMsg, settings.collaborators, settings.envKeys,
    settings.envKeysLoading, settings.newKeyName, settings.newKeyValue,
    settings.newKeyScope, settings.keySaveMsg, settings.agentVoices,
    settings.currentVoice, settings.selectVoice, settings.agentModels,
    settings.currentModel, settings.selectModel, settings.globalModel,
    settings.selectGlobalModel, settings.saveRoomName,
    settings.saveEnvKey, settings.deleteEnvKey,
  ])

  const searchValue = useMemo(() => ({
    chatSearchOpen, setChatSearchOpen,
    chatSearchQuery, setChatSearchQuery,
    chatSearchResults, setChatSearchResults,
    chatSearchLoading,
    chatSearchRef,
    handleChatSearch,
  }), [chatSearchOpen, chatSearchQuery, chatSearchResults, chatSearchLoading, handleChatSearch])

  const ctxMenuValue = useMemo(() => ({
    replyTo: cmenu.replyTo, setReplyTo: cmenu.setReplyTo,
    ctxMenu: cmenu.ctxMenu, setCtxMenu: cmenu.setCtxMenu,
    needsVerificationIds: cmenu.needsVerificationIds,
    lastActionToast: cmenu.lastActionToast,
    handleMessageFollowUp: cmenu.handleMessageFollowUp,
    handleMessageNeedsVerification: cmenu.handleMessageNeedsVerification,
    handleMessageResearch: cmenu.handleMessageResearch,
    handleMessageSendTo: cmenu.handleMessageSendTo,
    handleTaskFollowUp: cmenu.handleTaskFollowUp,
    handleTaskNeedsVerification: cmenu.handleTaskNeedsVerification,
    handleTaskResearch: cmenu.handleTaskResearch,
    handleTaskMoveTo: cmenu.handleTaskMoveTo,
  }), [
    cmenu.replyTo, cmenu.ctxMenu, cmenu.needsVerificationIds, cmenu.lastActionToast,
    cmenu.handleMessageFollowUp, cmenu.handleMessageNeedsVerification,
    cmenu.handleMessageResearch, cmenu.handleMessageSendTo,
    cmenu.handleTaskFollowUp, cmenu.handleTaskNeedsVerification,
    cmenu.handleTaskResearch, cmenu.handleTaskMoveTo,
  ])

  const conversationsValue = useMemo(() => ({
    searchQuery, setSearchQuery,
    pinnedItems: conv.pinnedItems,
    filteredPinnedItems: conv.filteredPinnedItems,
    conversationItems: conv.conversationItems,
    unreadMap: conv.unreadMap, unreadCounts: conv.unreadCounts,
    projectPreviews: conv.projectPreviews,
    filteredVisibleAgents: conv.filteredVisibleAgents,
    filteredVisibleProjects: conv.filteredVisibleProjects,
  }), [
    searchQuery,
    conv.pinnedItems, conv.filteredPinnedItems, conv.conversationItems,
    conv.unreadMap, conv.unreadCounts, conv.projectPreviews,
    conv.filteredVisibleAgents, conv.filteredVisibleProjects,
  ])

  const prefsValue = useMemo(() => ({
    isFav: prefs.isFav, toggleFav: prefs.toggleFav,
    isMuted: prefs.isMuted, toggleMute: prefs.toggleMute,
    toggleHidden: prefs.toggleHidden,
    sectionStates: prefs.sectionStates, toggleSection: prefs.toggleSection,
  }), [prefs.isFav, prefs.toggleFav, prefs.isMuted, prefs.toggleMute, prefs.toggleHidden, prefs.sectionStates, prefs.toggleSection])

  // ── Child view ────────────────────────────────────────────────────────────
  let view
  if ((projectId || inlineProject) && !selectedAgent) view = <ProjectChatView />
  else if (!selectedAgent) view = cv4HomeView ?? <ConversationsView />
  else view = <ThreadView />

  // Provider nesting: Core is outermost (everything reads it); Prefs is next
  // because Conversations derives from isFav/isHidden; then everything else
  // in a readable order. Nesting order doesn't affect React semantics, only
  // reading order for future maintainers.
  return (
    <ChatCoreProvider value={coreValue}>
      <ChatPrefsProvider value={prefsValue}>
        <ChatConversationsProvider value={conversationsValue}>
          <ChatMessagesProvider value={messagesValue}>
            <ChatVoiceProvider value={voiceValue}>
              <ChatRecordingProvider value={recordingValue}>
                <ChatAttachmentsProvider value={attachValue}>
                  <ChatSendProvider value={sendValue}>
                    <ChatComposerProvider value={composerValue}>
                      <ChatSettingsProvider value={settingsValue}>
                        <ChatSearchProvider value={searchValue}>
                          <ChatContextMenuProvider value={ctxMenuValue}>
                            {view}
                          </ChatContextMenuProvider>
                        </ChatSearchProvider>
                      </ChatSettingsProvider>
                    </ChatComposerProvider>
                  </ChatSendProvider>
                </ChatAttachmentsProvider>
              </ChatRecordingProvider>
            </ChatVoiceProvider>
          </ChatMessagesProvider>
        </ChatConversationsProvider>
      </ChatPrefsProvider>
    </ChatCoreProvider>
  )
}
