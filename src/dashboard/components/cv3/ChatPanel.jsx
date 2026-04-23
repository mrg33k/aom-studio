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
import { useParams, useNavigate } from 'react-router-dom'
import { useProjects } from '../../hooks/useProjects'
import { formatRelativeTime } from '../../timeUtils'
import { useCornerAuth, useCornerData, useCornerNav } from '../../CornerContext.jsx'
import ProjectChatView from './ProjectChatView.jsx'
import ConversationsView from './ConversationsView.jsx'
import ThreadView from './ThreadView.jsx'

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
import {
  ChatCoreProvider,
  ChatMessagesProvider,
  ChatSendProvider,
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
    prefillMessage,
    setPrefillMessage,
    stageFilesRef,
  } = useCornerNav()
  const { projectId } = useParams()
  const navigate = useNavigate()

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

  // ── Voice slice (shell-local state) ───────────────────────────────────────
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('idle')
  const [voiceVolume, setVoiceVolume] = useState(0)
  const [voiceTranscriptText, setVoiceTranscriptText] = useState('')
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [voiceMinimized, setVoiceMinimized] = useState(false)

  // ── Session hygiene: exchange counter + handoff nudge ─────────────────────
  const [exchangeCount, setExchangeCount] = useState(0)
  const [showHandoffNudge, setShowHandoffNudge] = useState(false)

  const resetExchangeCount = useCallback(() => {
    setExchangeCount(0)
    setShowHandoffNudge(false)
  }, [])

  const dismissHandoffNudge = useCallback(() => setShowHandoffNudge(false), [])

  const onMessageSent = useCallback(() => {
    setExchangeCount(prev => {
      const next = prev + 1
      if (next > 0 && next % 10 === 0) setShowHandoffNudge(true)
      return next
    })
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
  const { projects: dbProjects } = useProjects(worldId)
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
    if (inlineProject) return inlineProject
    if (!projectId) return null
    if (projects?.length) {
      const found =
        projects.find(p => String(p.id) === String(projectId)) ||
        projects.find(p => String(p.slug).toLowerCase() === String(projectId).toLowerCase())
      if (found) return found
    }
    // Match by id first (legacy /dashboard/project/:projectId), then by
    // slug (R21a /dashboard/projects/:slug/chat). Both routes hand us the
    // same useParams key so one lookup covers both shapes.
    // Synthetic fallback: if projects haven't loaded yet (e.g. Supabase loading),
    // still resolve the project from the URL slug so the input bar is usable.
    return { id: projectId, slug: projectId, name: projectId }
  }, [projectId, projects, inlineProject])

  // Reset session-hygiene counters when conversation changes (agent OR project).
  // Must come AFTER selectedProject is defined above — referencing it in a dep
  // array before its useMemo declaration throws TDZ in the prod build.
  useEffect(() => {
    setExchangeCount(0)
    setShowHandoffNudge(false)
  }, [selectedAgent?.slug, selectedProject?.slug])

  const currentChatKey = selectedAgent?.slug || (selectedProject ? `project:${selectedProject.slug}` : null)

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

  const bridge = useBridgeStream({ setMessages: msgs.setMessages })

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
      const res = await fetch(`/api/dashboard/supabase-messages?agent=${encodeURIComponent(agent)}&client=${encodeURIComponent(clientId)}&search=${encodeURIComponent(query)}&limit=500`)
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
    showHandoffNudge, dismissHandoffNudge, resetExchangeCount,
  }), [
    agents, inboxItems, allTasks, projects, conv.chattableAgents,
    selectedAgent, selectedProject, inlineProject, currentChatKey,
    worldId, currentUser, userIdentity, displayName, lastLoginText,
    isMobile, greetingIdx, projectId, navigate,
    onBack, onSelectAgent, onSelectProject, prefillMessage, setPrefillMessage,
    chatInputFocused,
    showHandoffNudge, dismissHandoffNudge, resetExchangeCount,
  ])

  const messagesValue = useMemo(() => ({
    messages: msgs.messages, setMessages: msgs.setMessages,
    loadingMsgs: msgs.loadingMsgs,
    messagesEndRef: msgs.messagesEndRef,
    messagesRef: msgs.messagesRef,
    userProfiles: msgs.userProfiles,
  }), [msgs.messages, msgs.setMessages, msgs.loadingMsgs, msgs.messagesEndRef, msgs.messagesRef, msgs.userProfiles])

  const sendValue = useMemo(() => ({
    input, setInput, inputRef,
    sending, setSending,
    handleSend: send.handleSend,
    handleKeyDown: send.handleKeyDown,
    sendAgentText: send.sendAgentText,
    sendProjectText: send.sendProjectText,
    handleProjectSend: send.handleProjectSend,
    handleProjectKeyDown: send.handleProjectKeyDown,
    sendAgentTextRef, sendProjectTextRef,
    isAgentTyping: bridge.isAgentTyping,
  }), [
    input, sending, send.handleSend, send.handleKeyDown, send.sendAgentText,
    send.sendProjectText, send.handleProjectSend, send.handleProjectKeyDown,
    bridge.isAgentTyping,
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
  }), [recording.isRecording, recording.recordingElapsed, recording.handleMicToggle, recording.micError, recording.isTranscribing])

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
    saveRoomName: settings.saveRoomName,
    saveEnvKey: settings.saveEnvKey, deleteEnvKey: settings.deleteEnvKey,
  }), [
    settings.settingsOpen, settings.settingsTab, settings.filesOpen,
    settings.profileOpen, settings.recipesOpen,
    settings.chatNameInput, settings.inviteEmail, settings.inviteLoading,
    settings.inviteMsg, settings.collaborators, settings.envKeys,
    settings.envKeysLoading, settings.newKeyName, settings.newKeyValue,
    settings.newKeyScope, settings.keySaveMsg, settings.agentVoices,
    settings.currentVoice, settings.selectVoice, settings.saveRoomName,
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
  else if (!selectedAgent) view = <ConversationsView />
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
                    <ChatSettingsProvider value={settingsValue}>
                      <ChatSearchProvider value={searchValue}>
                        <ChatContextMenuProvider value={ctxMenuValue}>
                          {view}
                        </ChatContextMenuProvider>
                      </ChatSearchProvider>
                    </ChatSettingsProvider>
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
