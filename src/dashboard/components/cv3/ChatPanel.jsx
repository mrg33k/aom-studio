// ChatPanel -- shell + ctx builder. Wires a set of focused hooks
// (./chat/*) together into the same ctx object the sub-views
// (ProjectChatView, ThreadView, ConversationsView) already consume.
//
// R2b split: the pre-split ChatPanel.jsx was 1843 LOC. The ctx contract
// and behavior are preserved exactly — the only change is where each
// piece of state / logic lives. R3 will replace ctx with scoped hooks.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjects } from '../../hooks/useProjects'
import { formatRelativeTime } from '../../timeUtils'
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

export default function ChatPanel({ agents, inboxItems, worldId, projectRooms, initialAgent, onSelectAgent, onSelectProject, onBack, currentUser, allTasks = [], prefillMessage, setPrefillMessage }) {
  const { projectId } = useParams()
  const navigate = useNavigate()

  // ── Local shell state ─────────────────────────────────────────────────────
  const [selectedAgent, setSelectedAgent] = useState(initialAgent || null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatInputFocused, setChatInputFocused] = useState(false)
  const [inlineProject, setInlineProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [conversationFilter, setConversationFilter] = useState('all')
  const [customizeTarget, setCustomizeTarget] = useState(null) // { agent, type: 'photo'|'color' }
  const customizeFileRef = useRef(null)
  const inputRef = useRef(null)

  // NOTE (R2b): projectFiles / projectFilesLoading are declared but never
  // used in this file. Preserved verbatim from pre-split ChatPanel for
  // zero behavior change; flagged as dead state for follow-up cleanup.
  const [projectFiles, setProjectFiles] = useState([])
  const [projectFilesLoading, setProjectFilesLoading] = useState(false)

  // ── Voice chat state ──────────────────────────────────────────────────────
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('idle')
  const [voiceVolume, setVoiceVolume] = useState(0)
  const [voiceTranscriptText, setVoiceTranscriptText] = useState('')
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [voiceMinimized, setVoiceMinimized] = useState(false)
  const voiceMinimizedAgent = useRef(null)  // { type: 'agent'|'project', data: agent/project }
  const voiceChatRef = useRef(null)

  // ── Mobile breakpoint + rotating greeting ─────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [greetingIdx] = useState(() => Math.floor(Math.random() * GREETINGS.length))

  // Memoize on user ID so the displayed name stays stable during tab switches
  // and agent selection — it only re-derives when the user identity changes.
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

  // ── Projects (useProjects + projectRooms merge) ───────────────────────────
  // Merge projects from useProjects (projects table) with projectRooms from
  // agent_status. For non-AOM worlds, agent_status project rooms surface
  // projects that may not exist in the projects table for this world. When
  // a slug appears in both, the projects-table row wins so its isShared
  // flag (derived from project_access) isn't clobbered by the hardcoded
  // isShared:false that useDataPipe stamps on every agent_status room.
  const { isLoading: projectsLoading, isError: projectsError, projects: dbProjects } = useProjects(worldId)
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
    if (!projectId || !projects?.length) return null
    return projects.find(p => String(p.id) === String(projectId)) || null
  }, [projectId, projects, inlineProject])

  const projectsRef = useRef(projects)
  useEffect(() => { projectsRef.current = projects }, [projects])

  const currentChatKey = selectedAgent?.slug || (selectedProject ? `project:${selectedProject.slug}` : null)

  // ── Hooks: prefs, conversation list, messages, bridge stream ──────────────
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
    projectsRef,
  })

  const bridge = useBridgeStream({ setMessages: msgs.setMessages })

  // ── Send refs shared across hooks (attachments auto-ack, recording) ───────
  const sendAgentTextRef = useRef(null)
  const sendProjectTextRef = useRef(null)

  // ── Context menu (replyTo / ctxMenu / action handlers) ────────────────────
  const cmenu = useChatContextMenu({
    worldId,
    selectedProject,
    userIdentity,
    inputRef,
  })

  // ── Attachments (pendingAttachments + legacy upload-as-message) ───────────
  const attach = useChatAttachments({
    selectedAgent,
    selectedProject,
    worldId,
    userIdentity,
    setMessages: msgs.setMessages,
    sendProjectTextRef,
  })

  // ── Send paths ────────────────────────────────────────────────────────────
  const send = useChatSend({
    input, setInput,
    sending, setSending,
    selectedAgent, selectedProject, worldId, userIdentity,
    inputRef,
    messagesRef: msgs.messagesRef,
    setMessages: msgs.setMessages,
    pendingAttachmentsRef: attach.pendingAttachmentsRef,
    setPendingAttachments: attach.setPendingAttachments,
    replyTo: cmenu.replyTo,
    setReplyTo: cmenu.setReplyTo,
    setAgentPreviews: conv.setAgentPreviews,
    startBridgeStream: bridge.startBridgeStream,
    sendAgentTextRef,
    sendProjectTextRef,
  })
  // Populate the send refs so voice transcription and the attachments
  // auto-ack can reach the latest callback without circular deps.
  useEffect(() => { sendAgentTextRef.current = send.sendAgentText }, [send.sendAgentText])
  useEffect(() => { sendProjectTextRef.current = send.sendProjectText }, [send.sendProjectText])

  // ── Recording (mic → transcribe → route to active chat) ───────────────────
  const recording = useChatRecording({
    selectedAgent,
    selectedProject,
    sendAgentTextRef,
    sendProjectTextRef,
  })

  // ── Settings / env keys / per-chat voice ──────────────────────────────────
  const settings = useChatSettings({
    selectedAgent,
    selectedProject,
    worldId,
    currentUser,
    currentChatKey,
  })

  // ── In-chat history search ─────────────────────────────────────────────────
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchResults, setChatSearchResults] = useState(null)
  const [chatSearchLoading, setChatSearchLoading] = useState(false)
  const chatSearchRef = useRef(null)

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

  // ── Build shared ctx for sub-components ────────────────────────────────────
  const ctx = {
    // Props from parent
    agents, inboxItems, worldId, onSelectAgent, onSelectProject, onBack, currentUser, allTasks,
    // Router
    projectId, navigate,
    // Core state
    selectedAgent, setSelectedAgent,
    messages: msgs.messages, setMessages: msgs.setMessages,
    input, setInput, sending, setSending,
    loadingMsgs: msgs.loadingMsgs,
    uploading: attach.uploading,
    chatInputFocused, setChatInputFocused,
    inputRef,
    fileInputRef: attach.fileInputRef,
    messagesEndRef: msgs.messagesEndRef,
    messagesRef: msgs.messagesRef,
    // Voice
    isVoiceActive, setIsVoiceActive, voiceChatRef,
    voiceStatus, setVoiceStatus, voiceVolume, setVoiceVolume,
    voiceTranscriptText, setVoiceTranscriptText,
    voiceMuted, setVoiceMuted, voiceMinimized, setVoiceMinimized,
    voiceMinimizedAgent,
    // Recording
    isRecording: recording.isRecording,
    handleMicToggle: recording.handleMicToggle,
    micError: recording.micError,
    isTranscribing: recording.isTranscribing,
    // Search
    chatSearchOpen, setChatSearchOpen, chatSearchQuery, setChatSearchQuery,
    chatSearchResults, setChatSearchResults, chatSearchLoading, chatSearchRef,
    handleChatSearch,
    // Settings
    settingsOpen: settings.settingsOpen, setSettingsOpen: settings.setSettingsOpen,
    settingsTab: settings.settingsTab, setSettingsTab: settings.setSettingsTab,
    filesOpen: settings.filesOpen, setFilesOpen: settings.setFilesOpen,
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
    currentChatKey,
    // Project
    inlineProject, setInlineProject, selectedProject,
    prefillMessage, setPrefillMessage,
    // User
    userProfiles: msgs.userProfiles, displayName, userIdentity, lastLoginText,
    isMobile, greetingIdx, GREETINGS, VOICE_OPTIONS,
    // Conversations
    searchQuery, setSearchQuery, conversationFilter, setConversationFilter,
    pinnedItems: conv.pinnedItems,
    filteredPinnedItems: conv.filteredPinnedItems,
    conversationItems: conv.conversationItems,
    isFav: prefs.isFav, toggleFav: prefs.toggleFav,
    isMuted: prefs.isMuted, toggleMute: prefs.toggleMute,
    unreadMap: conv.unreadMap, unreadCounts: conv.unreadCounts,
    projectPreviews: conv.projectPreviews,
    filteredVisibleAgents: conv.filteredVisibleAgents,
    filteredVisibleProjects: conv.filteredVisibleProjects,
    sectionStates: prefs.sectionStates, toggleSection: prefs.toggleSection,
    toggleHidden: prefs.toggleHidden,
    projects, chattableAgents: conv.chattableAgents,
    // Customize
    customizeTarget, setCustomizeTarget, customizeFileRef,
    // Bridge streaming
    isAgentTyping: bridge.isAgentTyping,
    // Handlers
    handleProjectSend: send.handleProjectSend,
    handleProjectKeyDown: send.handleProjectKeyDown,
    handleSend: send.handleSend,
    handleKeyDown: send.handleKeyDown,
    handleFileSelection: attach.handleFileSelection,
    sendProjectText: send.sendProjectText,
    sendAgentText: send.sendAgentText,
    sendProjectTextRef, sendAgentTextRef,
    // Settings helpers
    currentVoice: settings.currentVoice, selectVoice: settings.selectVoice,
    saveRoomName: settings.saveRoomName,
    saveEnvKey: settings.saveEnvKey, deleteEnvKey: settings.deleteEnvKey,
    // Right-click context menus
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
  }

  // ── Project view ───────────────────────────────────────────────────────────
  if ((projectId || inlineProject) && !selectedAgent) {
    return <ProjectChatView {...ctx} />
  }

  // ── Agent list / Conversations ─────────────────────────────────────────────
  if (!selectedAgent) {
    return <ConversationsView {...ctx} />
  }

  // ── Thread view ────────────────────────────────────────────────────────────
  return <ThreadView {...ctx} />
}
