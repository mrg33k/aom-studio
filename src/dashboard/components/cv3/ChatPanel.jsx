// ChatPanel -- main conversation view with agents, projects, settings
// Extracted from CornerV3.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Reorder } from 'framer-motion'
import { supabase } from '../../lib/supabase.js'
import { getClientId } from '../../lib/clientConfig.js'
import { useProjects } from '../../hooks/useProjects'
import { formatRelativeTime } from '../../timeUtils'
import { C, agentColors } from '../../lib/cv3Colors.js'
import AgentCard from './AgentCard.jsx'
import { Badge, formatChatTime, blobToBase64, LinkifyText, SwipeCard } from './shared.jsx'
import VoiceChat from '../VoiceChat.jsx'
import ChatMessageRenderer from '../ChatMessageRenderer.jsx'
import { TypingIndicatorV2 } from '../TypingIndicatorV2.jsx'
import ProjectChatView from './ProjectChatView.jsx'
import ConversationsView from './ConversationsView.jsx'
import ThreadView from './ThreadView.jsx'

// ── Rotating greeting messages ────────────────────────────────────────────────

const _timeOfDay = () => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const GREETINGS = [
  (name) => `Hey ${name}, what are we working on?`,
  (name) => `What's on the agenda, ${name}?`,
  (name) => `What are we shipping today, ${name}?`,
  (name) => `Let's build something great, ${name}.`,
  (name) => `Ready when you are, ${name}.`,
  (name) => `What's the move, ${name}?`,
  (name) => `Back at it, ${name}. What's first?`,
  (name) => `Good ${_timeOfDay()}, ${name}. Let's go.`,
]

const VOICE_OPTIONS = [
  { id: 'kore',          label: 'Kore',          desc: 'Firm' },
  { id: 'puck',          label: 'Puck',          desc: 'Upbeat' },
  { id: 'charon',        label: 'Charon',        desc: 'Informative' },
  { id: 'aoede',         label: 'Aoede',         desc: 'Breezy' },
  { id: 'fenrir',        label: 'Fenrir',        desc: 'Excitable' },
  { id: 'orus',          label: 'Orus',          desc: 'Firm' },
  { id: 'zephyr',        label: 'Zephyr',        desc: 'Bright' },
  { id: 'leda',          label: 'Leda',          desc: 'Youthful' },
  { id: 'callirrhoe',    label: 'Callirrhoe',    desc: 'Easy-going' },
  { id: 'autonoe',       label: 'Autonoe',       desc: 'Bright' },
  { id: 'enceladus',     label: 'Enceladus',     desc: 'Breathy' },
  { id: 'iapetus',       label: 'Iapetus',       desc: 'Clear' },
  { id: 'umbriel',       label: 'Umbriel',       desc: 'Easy-going' },
  { id: 'algieba',       label: 'Algieba',       desc: 'Smooth' },
  { id: 'despina',       label: 'Despina',       desc: 'Smooth' },
  { id: 'erinome',       label: 'Erinome',       desc: 'Clear' },
  { id: 'algenib',       label: 'Algenib',       desc: 'Gravelly' },
  { id: 'rasalgethi',    label: 'Rasalgethi',    desc: 'Informative' },
  { id: 'laomedeia',     label: 'Laomedeia',     desc: 'Upbeat' },
  { id: 'achernar',      label: 'Achernar',      desc: 'Soft' },
  { id: 'alnilam',       label: 'Alnilam',       desc: 'Firm' },
  { id: 'schedar',       label: 'Schedar',       desc: 'Even' },
  { id: 'gacrux',        label: 'Gacrux',        desc: 'Mature' },
  { id: 'pulcherrima',   label: 'Pulcherrima',   desc: 'Forward' },
  { id: 'achird',        label: 'Achird',        desc: 'Friendly' },
  { id: 'zubenelgenubi', label: 'Zubenelgenubi', desc: 'Casual' },
  { id: 'vindemiatrix',  label: 'Vindemiatrix',  desc: 'Gentle' },
  { id: 'sadachbia',     label: 'Sadachbia',     desc: 'Lively' },
  { id: 'sadaltager',    label: 'Sadaltager',    desc: 'Knowledgeable' },
  { id: 'sulafat',       label: 'Sulafat',       desc: 'Warm' },
]

export default function ChatPanel({ agents, inboxItems, worldId, projectRooms, initialAgent, onSelectAgent, onSelectProject, onBack, currentUser, allTasks = [], prefillMessage, setPrefillMessage }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [selectedAgent, setSelectedAgent] = useState(initialAgent || null)
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [chatInputFocused, setChatInputFocused] = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceStatus, setVoiceStatus]     = useState('idle')
  const [voiceVolume, setVoiceVolume]     = useState(0)
  const [voiceTranscriptText, setVoiceTranscriptText] = useState('')
  const [voiceMuted, setVoiceMuted]       = useState(false)

  // User profile cache for shared chat avatars: { [user_id]: { avatar_url, display_name } }
  const [userProfiles, setUserProfiles]   = useState({})
  const fetchedProfileIds = useRef(new Set())
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const fileInputRef   = useRef(null)
  const voiceChatRef   = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const sendProjectTextRef = useRef(null)
  const sendAgentTextRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [micError, setMicError] = useState(null)
  const [inlineProject, setInlineProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [conversationFilter, setConversationFilter] = useState('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('Keys')
  const [filesOpen, setFilesOpen] = useState(false)
  const [projectFiles, setProjectFiles] = useState([])
  const [projectFilesLoading, setProjectFilesLoading] = useState(false)
  const [agentVoices, setAgentVoices] = useState({})
  const [chatNameInput, setChatNameInput] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null)
  const [collaborators, setCollaborators] = useState([])
  const [envKeys, setEnvKeys] = useState({ user: [], project: [] })
  const [envKeysLoading, setEnvKeysLoading] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyScope, setNewKeyScope] = useState('user')
  const [keySaveMsg, setKeySaveMsg] = useState(null)
  const [customizeTarget, setCustomizeTarget] = useState(null) // { agent, type: 'photo'|'color' }
  const customizeFileRef = useRef(null)

  // ── R3: Composer pending attachments + send idempotency ─────────────────────
  // pendingAttachments: files uploaded but not yet attached to a sent message.
  // Each entry: { id, name, url, mimeType, size }. Consumed on next send.
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [stagingFiles, setStagingFiles] = useState(false)
  // Ref mirror so the send functions can read the latest value without
  // adding pendingAttachments to every useCallback deps list.
  const pendingAttachmentsRef = useRef([])
  useEffect(() => { pendingAttachmentsRef.current = pendingAttachments }, [pendingAttachments])
  // Idempotency: prevent overlapping sends and block same-text double-submits.
  const inFlightSendRef = useRef(false)
  const lastSendSigRef  = useRef({ sig: '', ts: 0 })

  // Voice call persistence: when voice is active and user navigates away,
  // keep the call alive and show a "return to call" banner
  const [voiceMinimized, setVoiceMinimized] = useState(false)
  const voiceMinimizedAgent = useRef(null)  // { type: 'agent'|'project', data: agent/project }

  // In-chat history search (state only -- logic after selectedProject is declared)
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchResults, setChatSearchResults] = useState(null)
  const [chatSearchLoading, setChatSearchLoading] = useState(false)
  const chatSearchRef = useRef(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Greeting + last login ─────────────────────────────────────────────────
  const [greetingIdx, setGreetingIdx] = useState(() => Math.floor(Math.random() * GREETINGS.length))
  // Memoize on user ID so the displayed name stays stable during tab switches
  // and agent selection — it only re-derives when the user identity changes.
  const displayName = useMemo(() =>
    currentUser?.user_metadata?.full_name?.split(' ')[0] ||
    currentUser?.email?.split('@')[0] ||
    'there'
  , [currentUser?.id])
  const lastLoginText = formatRelativeTime(currentUser?.last_sign_in_at)

  // ── User identity for multi-user message tracking ──────────────────────────
  const userIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id])

  // ── Collapsible section states (Favorites=open, Agents=closed, Projects=closed) ──
  const [sectionStates, setSectionStates] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aom_section_states'))
      // Force agents/projects open (v2 default change). Old localStorage may have false.
      if (saved && typeof saved === 'object') return { ...saved, favorites: true, agents: true, projects: true }
    } catch {}
    return { favorites: true, agents: true, projects: true }
  })
  const toggleSection = useCallback((key) => {
    setSectionStates(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('aom_section_states', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // ── Unread counts per agent ──────────────────────────────────────────────
  const unreadCounts = useMemo(() => {
    const counts = {}
    for (const item of (inboxItems || [])) {
      if (item.agent && item.isUnread) counts[item.agent] = (counts[item.agent] || 0) + 1
    }
    return counts
  }, [inboxItems])

  // ── Favorites + muted + hidden state (Supabase only) ────────────────────
  const [favorites, setFavorites] = useState([])
  const [mutedSlugs, setMutedSlugs] = useState([])
  const [hiddenSlugs, setHiddenSlugs] = useState([])
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const savePref = useCallback((key, value) => {
    const cid = worldId || getClientId() || 'aom'
    fetch('/api/dashboard/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, client_id: cid, value }),
    }).catch(() => {})
  }, [worldId])

  // Load all prefs from Supabase on mount
  useEffect(() => {
    const cid = worldId || getClientId()
    if (!cid) return
    const loadPrefs = async () => {
      try {
        const [favRes, mutedRes, hiddenRes] = await Promise.all([
          fetch(`/api/dashboard/preferences?key=aom_favorites&client=${cid}`).then(r => r.json()),
          fetch(`/api/dashboard/preferences?key=aom_muted&client=${cid}`).then(r => r.json()),
          fetch(`/api/dashboard/preferences?key=corner-hidden-slugs&client=${cid}`).then(r => r.json()),
        ])
        if (favRes.value) setFavorites(favRes.value)
        if (mutedRes.value) setMutedSlugs(mutedRes.value)
        if (hiddenRes.value) setHiddenSlugs(hiddenRes.value)
      } catch {}
      setPrefsLoaded(true)
    }
    loadPrefs()
  }, [worldId])

  const isFav = useCallback((type, slug) => favorites.some(f => f.type === type && f.slug === slug), [favorites])
  const isMuted = useCallback((slug) => mutedSlugs.includes(slug), [mutedSlugs])
  const isHidden = useCallback((slug) => hiddenSlugs.includes(slug), [hiddenSlugs])
  const toggleFav = useCallback((type, slug) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.type === type && f.slug === slug)
      const next = exists ? prev.filter(f => !(f.type === type && f.slug === slug)) : [...prev, { type, slug }]
      savePref('aom_favorites', next)
      return next
    })
  }, [savePref])
  const toggleMute = useCallback((slug) => {
    setMutedSlugs(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
      savePref('aom_muted', next)
      return next
    })
  }, [savePref])
  const toggleHidden = useCallback((slug) => {
    setHiddenSlugs(prev => {
      const next = prev.includes(slug) ? prev : [...prev, slug]
      savePref('corner-hidden-slugs', next)
      return next
    })
  }, [savePref])

  const { isLoading: projectsLoading, isError: projectsError, projects: dbProjects } = useProjects(worldId)

  // Merge projects from useProjects (projects table) with projectRooms from agent_status.
  // For non-AOM worlds, agent_status project rooms are the source of truth. When present,
  // they override DB projects to avoid stale AOM data leaking through during auth race.
  const projects = useMemo(() => {
    if (projectRooms && projectRooms.length > 0) {
      // Agent_status projectRooms present — use them, supplement with any DB projects
      // that have different slugs (e.g. shared projects from other worlds)
      const roomSlugs = new Set(projectRooms.map(p => p.slug))
      const extras = (dbProjects || []).filter(p => !roomSlugs.has(p.slug))
      return [...projectRooms, ...extras]
    }
    return dbProjects || []
  }, [dbProjects, projectRooms])

  const selectedProject = useMemo(() => {
    if (inlineProject) return inlineProject
    if (!projectId || !projects?.length) return null
    return projects.find(p => String(p.id) === String(projectId)) || null
  }, [projectId, projects, inlineProject])

  // ── Chat history search logic (must be after selectedProject declaration) ──
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

  // ── Per-chat voice selection ──────────────────────────────────────────────
  const currentChatKey = selectedAgent?.slug || (selectedProject ? `project:${selectedProject.slug}` : null)
  const currentVoice = currentChatKey ? (agentVoices[currentChatKey] || 'kore') : 'kore'

  // Load agent voices from DB on worldId change
  useEffect(() => {
    if (!worldId) return
    fetch(`/api/dashboard/agent-voice?client=${encodeURIComponent(worldId)}`)
      .then(r => r.ok ? r.json() : { voices: {} })
      .then(({ voices }) => { if (voices) setAgentVoices(voices) })
      .catch(() => {})
  }, [worldId])

  const selectVoice = useCallback((voice) => {
    if (!currentChatKey) return
    setAgentVoices(prev => ({ ...prev, [currentChatKey]: voice }))
    fetch('/api/dashboard/agent-voice', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: currentChatKey, voice, client_id: worldId }),
    }).catch(() => {})
  }, [currentChatKey, worldId])

  // Initialise rename input when modal opens
  useEffect(() => {
    if (settingsOpen) {
      setSettingsTab('Keys')
      const name = selectedAgent ? selectedAgent.name : (selectedProject?.name || '')
      setChatNameInput(name)
      // Fetch collaborators when project settings opens
      if (selectedProject?.id) {
        setInviteEmail('')
        setInviteMsg(null)
        fetch(`/api/dashboard/project-invite?project_id=${selectedProject.id}`)
          .then(r => r.json())
          .then(data => { if (data.collaborators) setCollaborators(data.collaborators) })
          .catch(() => {})
      }
      // Fetch env_vars keys
      setEnvKeysLoading(true)
      setNewKeyName('')
      setNewKeyValue('')
      setKeySaveMsg(null)
      const cid = worldId || 'aom'
      const fetches = []
      // User keys
      if (currentUser?.id) {
        fetches.push(
          fetch(`/api/dashboard/env-vars?scope=user&scope_id=${encodeURIComponent(currentUser.id)}&client=${encodeURIComponent(cid)}`)
            .then(r => r.json()).then(d => d.keys || []).catch(() => [])
        )
      } else {
        fetches.push(Promise.resolve([]))
      }
      // Project keys (only when in a project chat)
      const projSlug = selectedProject?.slug
      if (projSlug) {
        fetches.push(
          fetch(`/api/dashboard/env-vars?scope=project&scope_id=${encodeURIComponent(projSlug)}&client=${encodeURIComponent(cid)}`)
            .then(r => r.json()).then(d => d.keys || []).catch(() => [])
        )
      } else {
        fetches.push(Promise.resolve([]))
      }
      Promise.all(fetches).then(([userKeys, projectKeys]) => {
        setEnvKeys({ user: userKeys, project: projectKeys })
        setEnvKeysLoading(false)
      })
    }
  }, [settingsOpen, selectedAgent, selectedProject])

  const saveRoomName = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed || !currentChatKey) return
    const slug = currentChatKey.startsWith('project:')
      ? currentChatKey.replace('project:', '')
      : currentChatKey
    fetch(`/api/dashboard/agent-status?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(trimmed)}&client_id=${encodeURIComponent(worldId)}`, {
      method: 'PATCH',
    }).catch(() => {})
  }, [currentChatKey, worldId])

  const saveEnvKey = useCallback(async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return
    const cid = worldId || 'aom'
    const scopeId = newKeyScope === 'project'
      ? (selectedProject?.slug || '')
      : (currentUser?.id || '')
    if (!scopeId) { setKeySaveMsg({ type: 'err', text: 'No scope target' }); return }
    try {
      const r = await fetch('/api/dashboard/env-vars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: newKeyScope, scope_id: scopeId, key: newKeyName.trim().toUpperCase(), value: newKeyValue.trim(), client_id: cid }),
      })
      const data = await r.json()
      if (data.ok) {
        setKeySaveMsg({ type: 'ok', text: 'Saved' })
        setNewKeyName('')
        setNewKeyValue('')
        // Refresh keys list
        const listR = await fetch(`/api/dashboard/env-vars?scope=${newKeyScope}&scope_id=${encodeURIComponent(scopeId)}&client=${encodeURIComponent(cid)}`)
        const listD = await listR.json()
        setEnvKeys(prev => ({ ...prev, [newKeyScope]: listD.keys || [] }))
      } else {
        setKeySaveMsg({ type: 'err', text: data.error || 'Save failed' })
      }
    } catch { setKeySaveMsg({ type: 'err', text: 'Network error' }) }
  }, [newKeyName, newKeyValue, newKeyScope, worldId, selectedProject, currentUser])

  const deleteEnvKey = useCallback(async (scope, key) => {
    const cid = worldId || 'aom'
    const scopeId = scope === 'project'
      ? (selectedProject?.slug || '')
      : (currentUser?.id || '')
    if (!scopeId) return
    try {
      await fetch('/api/dashboard/env-vars', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, scope_id: scopeId, key, client_id: cid }),
      })
      // Refresh
      const listR = await fetch(`/api/dashboard/env-vars?scope=${scope}&scope_id=${encodeURIComponent(scopeId)}&client=${encodeURIComponent(cid)}`)
      const listD = await listR.json()
      setEnvKeys(prev => ({ ...prev, [scope]: listD.keys || [] }))
    } catch {}
  }, [worldId, selectedProject, currentUser])

  // Fetch latest message per agent (comprehensive -- covers all agents, not just missing from inboxItems)
  const [agentPreviews, setAgentPreviews] = useState({})
  useEffect(() => {
    if (!supabase || !worldId || !agents?.length) return
    const slugs = agents.filter(a => a.slug).map(a => a.slug)
    if (slugs.length === 0) return

    // Fetch latest message for every agent to ensure fresh baseline
    Promise.all(slugs.map(slug =>
      supabase
        .from('messages')
        .select('agent, text, timestamp, id, role')
        .eq('client_id', worldId)
        .eq('agent', slug)
        .order('timestamp', { ascending: false })
        .limit(1)
        .then(({ data }) => data?.[0] || null)
    )).then(results => {
      const previews = {}
      for (const msg of results) {
        if (msg?.agent) {
          previews[msg.agent] = {
            agent: msg.agent,
            text: (msg.text || '').slice(0, 80) + ((msg.text || '').length > 80 ? '...' : ''),
            timestamp: msg.timestamp,
            id: msg.id,
            isUnread: msg.role !== 'user',
          }
        }
      }
      setAgentPreviews(previews)
    })
  }, [agents, worldId])

  // Realtime: update agent previews when any new message arrives
  useEffect(() => {
    if (!supabase || !worldId) return
    const channel = supabase
      .channel(`cv3-previews-${worldId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        (payload) => {
          const msg = payload.new
          if (!msg?.agent) return
          const preview = {
            agent: msg.agent,
            text: (msg.text || '').slice(0, 80) + ((msg.text || '').length > 80 ? '...' : ''),
            timestamp: msg.timestamp,
            id: msg.id,
            isUnread: msg.role !== 'user',
          }
          setAgentPreviews(prev => {
            const existing = prev[msg.agent]
            // Only update if this message is newer
            if (existing && existing.timestamp > msg.timestamp) return prev
            return { ...prev, [msg.agent]: preview }
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [worldId])

  // Fetch latest message per project (stored under agent key "project:{slug}") for search filtering
  const [projectPreviews, setProjectPreviews] = useState({})
  useEffect(() => {
    if (!supabase || !worldId || !projects?.length) return
    const projList = projects.filter(p => p.slug)
    if (!projList.length) return
    Promise.all(projList.map(p => {
      const cid = p.isShared ? `shared:${p.slug}` : worldId
      return supabase.from('messages').select('agent, text, timestamp')
        .eq('client_id', cid).eq('agent', `project:${p.slug}`)
        .order('timestamp', { ascending: false }).limit(1)
        .then(({ data }) => data?.[0] || null)
    })).then(results => {
      const previews = {}
      for (const msg of results) {
        if (msg?.agent) previews[msg.agent] = { text: (msg.text || '').slice(0, 80), timestamp: msg.timestamp }
      }
      setProjectPreviews(previews)
    })
  }, [projects, worldId])

  // Build unread map: agent slug -> inbox item (last message preview)
  // Merges inboxItems (from useDataPipe) with agentPreviews, preferring newest timestamp
  const unreadMap = useMemo(() => {
    const m = {}
    // Start with agentPreviews (fresh fetch + realtime updates)
    for (const [slug, preview] of Object.entries(agentPreviews)) {
      m[slug] = preview
    }
    // Merge inboxItems, but only if they have a newer timestamp
    for (const item of (inboxItems || [])) {
      if (!item.agent) continue
      const existing = m[item.agent]
      if (!existing || (item.timestamp && item.timestamp > existing.timestamp)) {
        m[item.agent] = item
      }
    }
    return m
  }, [inboxItems, agentPreviews])

  // Agents sorted: most recent message first (like iMessage), then active, then idle
  const chattableAgents = useMemo(() => {
    return (agents || [])
      .filter(a => a.slug && a.name && !isHidden(a.slug))
      .sort((a, b) => {
        const aMsg = unreadMap[a.slug]
        const bMsg = unreadMap[b.slug]
        const aTime = aMsg?.timestamp || ''
        const bTime = bMsg?.timestamp || ''
        // Sort by most recent message timestamp (descending)
        if (aTime && bTime) return bTime > aTime ? 1 : bTime < aTime ? -1 : 0
        if (aTime && !bTime) return -1
        if (!aTime && bTime) return 1
        // No messages: active first
        const aAct = a.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        const bAct = b.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        return aAct - bAct
      })
  }, [agents, unreadMap, isHidden])

  // Pins section: only explicitly pinned agents + projects, sorted by most recent message, max 5
  const pinnedItems = useMemo(() => {
    const items = []
    // Add pinned agents
    for (const agent of (agents || [])) {
      if (!agent.slug || !agent.name || !isFav('agent', agent.slug)) continue
      const lastMsg = unreadMap[agent.slug]
      items.push({ type: 'agent', data: agent, timestamp: lastMsg?.timestamp || '' })
    }
    // Add pinned projects
    for (const project of (projects || [])) {
      if (!project.slug || !isFav('project', project.slug)) continue
      const lastMsg = unreadMap[`project:${project.slug}`]
      items.push({ type: 'project', data: project, timestamp: lastMsg?.timestamp || '' })
    }
    // Sort by most recent message timestamp descending
    items.sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
      if (a.timestamp && !b.timestamp) return -1
      if (!a.timestamp && b.timestamp) return 1
      return 0
    })
    return items.slice(0, 5)
  }, [agents, projects, isFav, unreadMap])

  const topAgentSlugs = useMemo(() => new Set(
    pinnedItems.filter(i => i.type === 'agent').map(i => i.data.slug)
  ), [pinnedItems])

  const topProjectSlugs = useMemo(() => new Set(
    pinnedItems.filter(i => i.type === 'project').map(i => i.data.slug)
  ), [pinnedItems])

  // Agent-project association map from tasks (agent slug → Set of project IDs they've worked on)
  const agentProjectIds = useMemo(() => {
    const map = {}
    for (const task of (allTasks || [])) {
      const slug = task.agent_identity || task.agentIdentity
      if (!slug) continue
      if (!map[slug]) map[slug] = new Set()
      if (task.project_id) map[slug].add(String(task.project_id))
    }
    return map
  }, [allTasks])

  // Search-filtered agent list (excludes pinned)
  const filteredVisibleAgents = useMemo(() => {
    const base = chattableAgents.filter(a => !topAgentSlugs.has(a.slug))
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    const matchingProjectIds = new Set(
      (projects || []).filter(p => (p.name || '').toLowerCase().includes(q)).map(p => String(p.id))
    )
    return base.filter(a => {
      if ((a.name || '').toLowerCase().includes(q)) return true
      if ((a.role || '').toLowerCase().includes(q)) return true
      const preview = unreadMap[a.slug]
      if (preview?.text?.toLowerCase().includes(q)) return true
      if (matchingProjectIds.size > 0) {
        const agentProjs = agentProjectIds[a.slug]
        if (agentProjs) {
          for (const pid of matchingProjectIds) { if (agentProjs.has(pid)) return true }
        }
      }
      return false
    })
  }, [chattableAgents, topAgentSlugs, searchQuery, unreadMap, projects, agentProjectIds])

  // Search-filtered project list (excludes pinned)
  const filteredVisibleProjects = useMemo(() => {
    const base = (projects || []).filter(p => !topProjectSlugs.has(p.slug))
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    return base.filter(p => {
      if ((p.name || '').toLowerCase().includes(q)) return true
      if ((p.slug || '').toLowerCase().includes(q)) return true
      const preview = projectPreviews[`project:${p.slug}`]
      if (preview?.text?.toLowerCase().includes(q)) return true
      return false
    })
  }, [projects, topProjectSlugs, searchQuery, projectPreviews])

  // Search-filtered pinned items
  const filteredPinnedItems = useMemo(() => {
    if (!searchQuery) return pinnedItems
    const q = searchQuery.toLowerCase()
    return pinnedItems.filter(item => {
      if (item.type === 'agent') {
        const a = item.data
        if ((a.name || '').toLowerCase().includes(q)) return true
        if ((a.role || '').toLowerCase().includes(q)) return true
        const preview = unreadMap[a.slug]
        if (preview?.text?.toLowerCase().includes(q)) return true
        return false
      }
      if (item.type === 'project') {
        const p = item.data
        if ((p.name || '').toLowerCase().includes(q)) return true
        if ((p.slug || '').toLowerCase().includes(q)) return true
        const preview = projectPreviews[`project:${p.slug}`]
        if (preview?.text?.toLowerCase().includes(q)) return true
        return false
      }
      return false
    })
  }, [pinnedItems, searchQuery, unreadMap, projectPreviews])

  // ── Unified Conversations list: agents + projects sorted by most recent message ──
  const conversationItems = useMemo(() => {
    const items = []
    // Add non-pinned agents
    for (const agent of filteredVisibleAgents) {
      const lastMsg = unreadMap[agent.slug]
      items.push({ type: 'agent', data: agent, timestamp: lastMsg?.timestamp || '' })
    }
    // Add non-pinned projects
    for (const project of filteredVisibleProjects) {
      const preview = projectPreviews[`project:${project.slug}`]
      items.push({ type: 'project', data: project, timestamp: preview?.timestamp || '' })
    }
    // Sort by most recent message timestamp descending, then alphabetically
    items.sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
      if (a.timestamp && !b.timestamp) return -1
      if (!a.timestamp && b.timestamp) return 1
      // No messages: sort alphabetically by name
      const aName = (a.data.name || '').toLowerCase()
      const bName = (b.data.name || '').toLowerCase()
      return aName < bName ? -1 : aName > bName ? 1 : 0
    })
    return items
  }, [filteredVisibleAgents, filteredVisibleProjects, unreadMap, projectPreviews])

  // Load message history when agent selected
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    setLoadingMsgs(true)
    setMessages([])
    supabase
      .from('messages')
      .select('*')
      .eq('client_id', worldId)
      .eq('agent', selectedAgent.slug)
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data.reverse())
      })
  }, [selectedAgent, worldId])

  // Realtime: watch for new messages in this thread
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    const channel = supabase
      .channel(`cv3-thread-${worldId}-${selectedAgent.slug}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        (payload) => {
          const msg = payload.new
          if (msg.agent === selectedAgent.slug) {
            setMessages(prev => {
              // Deduplicate: skip if we already have this id (from optimistic insert)
              if (prev.some(m => m.id === msg.id)) return prev
              // Replace temp optimistic message with real DB row (temp ids start with "temp-")
              const tempIdx = prev.findIndex(m =>
                typeof m.id === 'string' && m.id.startsWith('temp-') &&
                m.role === msg.role &&
                m.text === msg.text
              )
              if (tempIdx !== -1) {
                const next = [...prev]
                next[tempIdx] = msg
                return next
              }
              // Voice messages: replace temp voice entry
              if (msg.source === 'voice') {
                const tempRole = msg.role === 'user' ? 'user' : 'agent'
                const voiceIdx = prev.findIndex(m =>
                  m.source === 'voice' &&
                  m.text === msg.text &&
                  m.role === tempRole &&
                  typeof m.id === 'string' && m.id.startsWith('voice-')
                )
                if (voiceIdx !== -1) {
                  const next = [...prev]
                  next[voiceIdx] = msg
                  return next
                }
              }
              return [...prev, msg]
            })
            // Cross-post messages that mention a project to the shared project
            // thread. Messages that already went through supabase-messages POST
            // with a project field were cross-posted server-side, so only trigger
            // here for messages that arrived WITHOUT a project tag (e.g. Elon's
            // direct Supabase writes from AOM-EA). source='crosspost' is always skipped.
            if (msg.source !== 'crosspost' && !msg.project) {
              let taggedProject = null
              const tagMatch = (msg.text || '').match(/\[project:([a-z0-9_-]+)\]/i)
              if (tagMatch) taggedProject = tagMatch[1].toLowerCase()
              if (!taggedProject && projectsRef.current?.length) {
                const lt = (msg.text || '').toLowerCase()
                for (const p of projectsRef.current) {
                  if (p.slug && lt.includes(p.slug.toLowerCase())) { taggedProject = p.slug; break }
                  if (p.name && p.name.length > 2 && lt.includes(p.name.toLowerCase())) { taggedProject = p.slug; break }
                }
              }
              if (taggedProject) {
                fetch('/api/dashboard/supabase-messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    agent: msg.agent,
                    text: msg.text,
                    role: msg.role,
                    source: 'crosspost',
                    project: taggedProject,
                    client_id: `shared:${taggedProject}`,
                  }),
                }).catch(() => {})
              }
            }
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedAgent, worldId])

  // Load project messages when a project is selected
  // R6: filter on the project column instead of the legacy
  // agent='project:<slug>' pseudo-agent convention. Historical rows with
  // the old shape are still picked up via a second OR filter so pre-R6
  // conversations don't disappear.
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    setLoadingMsgs(true)
    setMessages([])
    const projCid = selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId
    supabase
      .from('messages')
      .select('*')
      .eq('client_id', projCid)
      .or(`project.eq.${selectedProject.slug},agent.eq.project:${selectedProject.slug}`)
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data.reverse())
      })
  }, [worldId, selectedProject, selectedAgent])

  // Realtime subscription for project messages
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    const projCid = selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId
    const channel = supabase
      .channel(`cv3-project-${projCid}-${selectedProject.slug}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${projCid}` },
        (payload) => {
          const msg = payload.new
          // R6: match either new shape (project column set) or legacy shape
          // (agent='project:<slug>') so mid-migration history keeps flowing.
          const isForThisProject =
            msg.project === selectedProject.slug ||
            msg.agent === `project:${selectedProject.slug}`
          if (isForThisProject) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              // Replace temp optimistic message with real DB row
              const tempIdx = prev.findIndex(m =>
                typeof m.id === 'string' && m.id.startsWith('temp-') &&
                m.role === msg.role &&
                m.text === msg.text
              )
              if (tempIdx !== -1) {
                const next = [...prev]
                next[tempIdx] = msg
                return next
              }
              // Voice messages: replace temp voice entry
              if (msg.source === 'voice') {
                const tempRole = msg.role === 'user' ? 'user' : 'agent'
                const voiceIdx = prev.findIndex(m =>
                  m.source === 'voice' &&
                  m.text === msg.text &&
                  m.role === tempRole &&
                  typeof m.id === 'string' && m.id.startsWith('voice-')
                )
                if (voiceIdx !== -1) {
                  const next = [...prev]
                  next[voiceIdx] = msg
                  return next
                }
              }
              return [...prev, msg]
            })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [worldId, selectedProject, selectedAgent])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when thread opens; close settings menu on navigation
  useEffect(() => {
    if (selectedAgent) setTimeout(() => inputRef.current?.focus(), 100)
    setSettingsOpen(false)
  }, [selectedAgent])

  // Keep a ref so handleSend can read current messages without stale closure
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])
  const projectsRef = useRef(projects)
  useEffect(() => { projectsRef.current = projects }, [projects])

  // Fetch user profiles for avatars in shared chats
  useEffect(() => {
    const newIds = messages
      .filter(m => m.user_id && !fetchedProfileIds.current.has(m.user_id) && m.user_id !== currentUser?.id)
      .map(m => m.user_id)
    const unique = [...new Set(newIds)]
    if (!unique.length) return
    unique.forEach(id => fetchedProfileIds.current.add(id))
    fetch(`/api/dashboard/avatar?user_ids=${unique.join(',')}`)
      .then(r => r.json())
      .then(data => {
        if (data.avatars) setUserProfiles(prev => ({ ...prev, ...data.avatars }))
      })
      .catch(() => {})
  }, [messages, currentUser?.id])

  const handleSend = useCallback(async () => {
    const rawText = input.trim()
    if (!rawText || sending || !selectedAgent) return
    // Detect queued follow-up prefix >>
    const isQueuedFollowup = rawText.startsWith('>>')
    const cleanText = isQueuedFollowup ? rawText.slice(2).trim() : rawText
    if (!cleanText) return
    // R3: idempotency — block overlapping sends and same-text double-submit
    const attSnapshot = pendingAttachmentsRef.current
    const sig = `${selectedAgent.slug}:${cleanText}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (inFlightSendRef.current) return
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) return
    inFlightSendRef.current = true
    lastSendSigRef.current = { sig, ts: nowMs }
    // Fold pending attachments into the outgoing text so the AI sees them,
    // matching the existing "include URL in text" convention used for manual
    // uploads in handleFileSelection.
    const attSuffix = attSnapshot.length
      ? '\n' + attSnapshot.map(a => `[Attached file: ${a.name}\n${a.url}]`).join('\n')
      : ''
    const text = cleanText + attSuffix
    setInput('')
    if (attSnapshot.length) setPendingAttachments([])
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)

    // Optimistic user message
    const now = new Date().toISOString()
    const tempUserId = `temp-user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: now,
      source: isQueuedFollowup ? 'queued-followup' : 'corner-dashboard',
    }])

    // Optimistic preview update so agent list shows "You: ..." immediately
    const previewText = 'You: ' + (text.length > 70 ? text.slice(0, 70) + '...' : text)
    setAgentPreviews(prev => ({
      ...prev,
      [selectedAgent.slug]: {
        agent: selectedAgent.slug,
        text: previewText,
        timestamp: now,
        id: tempUserId,
        isUnread: false,
      },
    }))

    // Build Gemini-format history from the last 20 messages for context
    // Include attachment URLs so the AI knows about uploaded files
    const history = messagesRef.current.slice(-20).map(m => {
      let text = m.text || ''
      if (m.attachment_url) text += `\n[Uploaded file: ${m.attachment_url}]`
      return { role: m.role === 'user' ? 'user' : 'model', parts: [{ text }] }
    })

    // R5: retire inline Haiku reply path. Persist the user message via
    // supabase-messages; the listener routes to Elon's tmux inbox and his
    // response arrives via the cv3-thread realtime subscription above.
    try {
      const saveResult = await fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: selectedAgent.slug,
          text,
          role: 'user',
          source: isQueuedFollowup ? 'queued-followup' : 'corner-dashboard',
          client_id: worldId,
          ...userIdentity,
        }),
      }).then(r => r.json()).catch(() => null)
      if (saveResult?.message?.id) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...saveResult.message } : m))
      }
    } catch (err) {
      console.error('[ChatPanel] send error:', err)
    } finally {
      setSending(false)
      inFlightSendRef.current = false
      inputRef.current?.focus()
    }
  }, [input, sending, selectedAgent, worldId])

  // Core send logic for agent chat -- accepts text directly so voice transcription can call it
  const sendAgentText = useCallback(async (rawText) => {
    if (!rawText?.trim() || !selectedAgent || !worldId) return
    // Detect queued follow-up prefix >>
    const isQueuedFollowup = rawText.trim().startsWith('>>')
    // R3: idempotency — block overlapping sends and same-text double-submit
    const attSnapshot = pendingAttachmentsRef.current
    const trimmed = isQueuedFollowup ? rawText.trim().slice(2).trim() : rawText.trim()
    if (!trimmed) return
    const sig = `${selectedAgent.slug}:${trimmed}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (inFlightSendRef.current) return
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) return
    inFlightSendRef.current = true
    lastSendSigRef.current = { sig, ts: nowMs }
    // Consume any pending attachments by appending their URLs to the text
    const attSuffix = attSnapshot.length
      ? '\n' + attSnapshot.map(a => `[Attached file: ${a.name}\n${a.url}]`).join('\n')
      : ''
    const text = trimmed + attSuffix
    if (attSnapshot.length) setPendingAttachments([])
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)
    const now = new Date().toISOString()
    const tempUserId = `temp-user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: now,
      source: isQueuedFollowup ? 'queued-followup' : 'corner-dashboard',
    }])
    const previewText = 'You: ' + (text.length > 70 ? text.slice(0, 70) + '...' : text)
    setAgentPreviews(prev => ({
      ...prev,
      [selectedAgent.slug]: { agent: selectedAgent.slug, text: previewText, timestamp: now, id: tempUserId, isUnread: false },
    }))
    // R5: no more parallel haiku-chat fetch. The user message is persisted
    // via supabase-messages, which the listener picks up and routes into
    // Elon's tmux inbox. Elon responds naturally; his Stop hook writes the
    // reply to Supabase and the Realtime subscription (cv3-thread-*) pulls
    // it into the thread. Haiku is no longer the chat operator.
    try {
      const saveResult = await fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: selectedAgent.slug, text, role: 'user', source: isQueuedFollowup ? 'queued-followup' : 'corner-dashboard', client_id: worldId, ...userIdentity }),
      }).then(r => r.json()).catch(() => null)
      if (saveResult?.message?.id) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...saveResult.message } : m))
      }
    } catch (err) {
      console.error('[ChatPanel] agent send error:', err)
    } finally {
      setSending(false)
      inFlightSendRef.current = false
      inputRef.current?.focus()
    }
  }, [selectedAgent, worldId, selectedProject])

  useEffect(() => { sendAgentTextRef.current = sendAgentText }, [sendAgentText])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // ── R3: Pending attachment helpers ────────────────────────────────────────
  // addPendingAttachment/removePendingAttachment are exposed via ctx so
  // ThreadView/ProjectChatView can render chips in the composer.
  const addPendingAttachment = useCallback((att) => {
    if (!att || !att.url) return
    setPendingAttachments(prev => {
      if (prev.some(p => p.id === att.id)) return prev
      return [...prev, att]
    })
  }, [])
  const removePendingAttachment = useCallback((id) => {
    setPendingAttachments(prev => prev.filter(p => p.id !== id))
  }, [])

  // Upload files and stage them in pendingAttachments without sending a message.
  // Sub-views can wire this to the composer paperclip/drop zone to let the user
  // attach a file, THEN type a message, THEN send them together.
  const stageFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length || !worldId) return
    const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
    setStagingFiles(true)
    try {
      for (const file of files) {
        try {
          let dataBase64, mimeType = file.type
          if (file.type.startsWith('image/')) {
            dataBase64 = await new Promise(resolve => {
              const img = new Image()
              const reader = new FileReader()
              reader.onload = () => {
                img.onload = () => {
                  const maxDim = 1200
                  let w = img.width, h = img.height
                  if (w > maxDim || h > maxDim) {
                    const scale = maxDim / Math.max(w, h)
                    w = Math.round(w * scale)
                    h = Math.round(h * scale)
                  }
                  const canvas = document.createElement('canvas')
                  canvas.width = w
                  canvas.height = h
                  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
                  resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
                }
                img.src = reader.result
              }
              reader.readAsDataURL(file)
            })
            mimeType = 'image/jpeg'
          } else {
            dataBase64 = await new Promise(resolve => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result.split(',')[1])
              reader.readAsDataURL(file)
            })
          }
          const uploadRes = await fetch('/api/dashboard/file-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              world: clientId,
              filename: file.name,
              data_base64: dataBase64,
              mime_type: mimeType,
            }),
          })
          const uploadData = await uploadRes.json()
          if (!uploadRes.ok) {
            console.error('[ChatPanel] stageFiles upload error:', uploadData.error)
            continue
          }
          addPendingAttachment({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            url: uploadData.full_url,
            mimeType,
            size: file.size,
          })
        } catch (err) {
          console.error('[ChatPanel] stageFiles error:', err)
        }
      }
    } finally {
      setStagingFiles(false)
    }
  }, [worldId, selectedProject, addPendingAttachment])

  const handleFileSelection = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !worldId) return
    const agentKey = selectedAgent ? selectedAgent.slug : (selectedProject ? `project:${selectedProject.slug}` : null)
    if (!agentKey) return
    const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
    e.target.value = ''
    setUploading(true)
    for (const file of files) {
      try {
        // Compress images client-side (max 1200px, 0.7 quality)
        let dataBase64, mimeType = file.type
        if (file.type.startsWith('image/')) {
          dataBase64 = await new Promise(resolve => {
            const img = new Image()
            const reader = new FileReader()
            reader.onload = () => {
              img.onload = () => {
                const maxDim = 1200
                let w = img.width, h = img.height
                if (w > maxDim || h > maxDim) {
                  const scale = maxDim / Math.max(w, h)
                  w = Math.round(w * scale)
                  h = Math.round(h * scale)
                }
                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                canvas.getContext('2d').drawImage(img, 0, 0, w, h)
                resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
              }
              img.src = reader.result
            }
            reader.readAsDataURL(file)
          })
          mimeType = 'image/jpeg'
        } else {
          // Non-image: read as base64
          dataBase64 = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(',')[1])
            reader.readAsDataURL(file)
          })
        }

        // Upload to local Mac via RAG server
        const uploadRes = await fetch('/api/dashboard/file-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            world: clientId,
            filename: file.name,
            data_base64: dataBase64,
            mime_type: mimeType,
          }),
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          console.error('[ChatPanel] upload error:', uploadData.error)
          continue
        }
        const publicUrl = uploadData.full_url

        // Optimistic message
        const tempId = `temp-attach-${Date.now()}`
        setMessages(prev => [...prev, {
          id: tempId,
          role: 'user',
          agent: agentKey,
          text: `Attached file: ${file.name}\n${publicUrl}`,
          timestamp: new Date().toISOString(),
          source: 'corner-dashboard',
          attachment_url: publicUrl,
          file_mime_type: mimeType,
          file_size: file.size,
        }])

        // Persist to DB -- include the URL in text since the messages table
        // doesn't have an attachment_url column. This ensures Gemini sees the
        // file reference in conversation history.
        const attachText = `Attached file: ${file.name}\n${publicUrl}`
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agentKey,
            text: attachText,
            role: 'user',
            source: 'corner-dashboard',
            client_id: clientId,
            ...userIdentity,
          }),
        })
          .then(r => r.json())
          .then(data => {
            if (data?.message?.id) {
              setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message } : m))
            }
          })
          .catch(() => {})
      } catch (err) {
        console.error('[ChatPanel] file attach error:', err)
      }
    }
    setUploading(false)

    // Auto-trigger the operator to acknowledge uploaded files
    // Uses sendProjectTextRef to avoid circular dependency (sendProjectText defined later)
    if (files.length > 0 && selectedProject && sendProjectTextRef.current) {
      const names = files.map(f => f.name).join(', ')
      const autoMsg = files.length === 1
        ? `I just uploaded ${names}. Can you confirm you got it?`
        : `I just uploaded ${files.length} files: ${names}. Can you confirm you got them?`
      setTimeout(() => sendProjectTextRef.current?.(autoMsg), 500)
    }
  }, [selectedAgent, selectedProject, worldId])

  // Core send logic shared by typed input and voice transcription
  const sendProjectText = useCallback(async (rawText) => {
    if (!rawText?.trim() || !selectedProject || !worldId) return
    const trimmed = rawText.trim()
    // R6: the project chat pseudo-agent ('project:<slug>') is dead. Project
    // messages now go out as agent='elon' with project=<slug> so Elon's
    // tmux listener routes them and his queue-task.py can auto-pick the
    // right repo. agentKey is still used for the temp optimistic message so
    // the fetch/subscribe filters below can find it during the swap.
    const agentKey = 'elon'
    const projectSlug = selectedProject.slug
    // R3: idempotency — block overlapping sends and same-text double-submit
    const attSnapshot = pendingAttachmentsRef.current
    const sig = `${agentKey}:${trimmed}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (inFlightSendRef.current) return
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) return
    inFlightSendRef.current = true
    lastSendSigRef.current = { sig, ts: nowMs }
    // Consume pending attachments into the outgoing text
    const attSuffix = attSnapshot.length
      ? '\n' + attSnapshot.map(a => `[Attached file: ${a.name}\n${a.url}]`).join('\n')
      : ''
    const text = trimmed + attSuffix
    if (attSnapshot.length) setPendingAttachments([])
    setSending(true)
    const projectClientId = selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId
    const now = new Date().toISOString()
    const tempUserId = `temp-proj-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: agentKey,
      text,
      timestamp: now,
      source: 'corner-dashboard',
    }])

    // Build Gemini-format history from the last 20 messages for context
    // Include attachment URLs so the AI knows about uploaded files
    const history = messagesRef.current.slice(-20).map(m => {
      let text = m.text || ''
      if (m.attachment_url) text += `\n[Uploaded file: ${m.attachment_url}]`
      return { role: m.role === 'user' ? 'user' : 'model', parts: [{ text }] }
    })

    // R6: no more haiku-chat. The user message persists with the project
    // tag and agent='elon'; the listener routes it into Elon's tmux inbox
    // with a [project:<slug>] prefix so he knows the scope. Elon's reply
    // arrives via the cv3-project realtime subscription below.
    try {
      const saveResult = await fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentKey,
          text,
          role: 'user',
          source: 'corner-dashboard',
          project: projectSlug,
          project_path: selectedProject.repo_path || '',
          client_id: projectClientId,
          ...userIdentity,
        }),
      }).then(r => r.json()).catch(() => null)
      if (saveResult?.message?.id) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...saveResult.message } : m))
      }
    } catch (err) {
      console.error('[ChatPanel] project send error:', err)
    } finally {
      setSending(false)
      inFlightSendRef.current = false
      inputRef.current?.focus()
    }
  }, [sending, selectedProject, worldId])

  // Keep a stable ref so the recorder onstop callback (set at record-start) always reaches the latest sendProjectText
  useEffect(() => { sendProjectTextRef.current = sendProjectText }, [sendProjectText])

  const handleProjectSend = useCallback(async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendProjectText(text)
  }, [input, sending, sendProjectText])

  const handleProjectKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleProjectSend() }
  }, [handleProjectSend])

  // Telephone mode: long-form record -> transcribe -> send as message.
  // Works for both agent and project chat -- routes to whichever is active.
  const [recordingStartTime, setRecordingStartTime] = useState(null)
  const [recordingElapsed, setRecordingElapsed] = useState(0)

  // Tick the recording timer every second
  useEffect(() => {
    if (!recordingStartTime) { setRecordingElapsed(0); return }
    const iv = setInterval(() => setRecordingElapsed(Math.floor((Date.now() - recordingStartTime) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [recordingStartTime])

  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      setRecordingStartTime(null)
    } else {
      setMicError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioChunksRef.current = []
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          stream.getTracks().forEach(t => t.stop())
          setIsTranscribing(true)
          try {
            const base64 = await blobToBase64(blob)
            const res = await fetch('/api/dashboard/v2-transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_base64: base64, mime_type: 'audio/webm' }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (data.text?.trim()) {
              // Route to whichever chat is active
              if (selectedAgent && sendAgentTextRef.current) {
                await sendAgentTextRef.current(data.text.trim())
              } else if (selectedProject && sendProjectTextRef.current) {
                await sendProjectTextRef.current(data.text.trim())
              }
            } else {
              setMicError('No speech detected. Try again.')
            }
          } catch (err) {
            console.error('[Telephone] transcription error:', err)
            setMicError('Failed to transcribe. Check your connection.')
          } finally {
            setIsTranscribing(false)
          }
        }
        recorder.start()
        mediaRecorderRef.current = recorder
        setIsRecording(true)
        setRecordingStartTime(Date.now())
      } catch (err) {
        console.error('Microphone access denied:', err)
        setMicError('Microphone access denied. Allow mic in browser settings.')
      }
    }
  }, [isRecording, selectedAgent, selectedProject])

  // ── Build shared ctx for sub-components ────────────────────────────────────
  const ctx = {
    // Props from parent
    agents, inboxItems, worldId, onSelectAgent, onSelectProject, onBack, currentUser, allTasks,
    // Router
    projectId, navigate,
    // Core state
    selectedAgent, setSelectedAgent, messages, setMessages,
    input, setInput, sending, setSending, loadingMsgs, uploading,
    chatInputFocused, setChatInputFocused,
    inputRef, fileInputRef, messagesEndRef, messagesRef,
    // Voice
    isVoiceActive, setIsVoiceActive, voiceChatRef,
    voiceStatus, setVoiceStatus, voiceVolume, setVoiceVolume,
    voiceTranscriptText, setVoiceTranscriptText,
    voiceMuted, setVoiceMuted, voiceMinimized, setVoiceMinimized,
    voiceMinimizedAgent,
    // Recording
    isRecording, handleMicToggle, micError, isTranscribing,
    // Search
    chatSearchOpen, setChatSearchOpen, chatSearchQuery, setChatSearchQuery,
    chatSearchResults, setChatSearchResults, chatSearchLoading, chatSearchRef,
    handleChatSearch,
    // Settings
    settingsOpen, setSettingsOpen, settingsTab, setSettingsTab,
    filesOpen, setFilesOpen,
    chatNameInput, setChatNameInput,
    inviteEmail, setInviteEmail, inviteLoading, setInviteLoading,
    inviteMsg, setInviteMsg, collaborators, setCollaborators,
    envKeys, envKeysLoading, newKeyName, setNewKeyName,
    newKeyValue, setNewKeyValue, newKeyScope, setNewKeyScope,
    keySaveMsg, setKeySaveMsg,
    agentVoices, setAgentVoices, currentChatKey,
    // Project
    inlineProject, setInlineProject, selectedProject,
    prefillMessage, setPrefillMessage,
    // User
    userProfiles, displayName, userIdentity, lastLoginText,
    isMobile, greetingIdx, GREETINGS, VOICE_OPTIONS,
    // Conversations
    searchQuery, setSearchQuery, conversationFilter, setConversationFilter,
    pinnedItems, filteredPinnedItems, conversationItems,
    isFav, toggleFav, isMuted, toggleMute,
    unreadMap, unreadCounts, projectPreviews,
    filteredVisibleAgents, filteredVisibleProjects,
    sectionStates, toggleSection, toggleHidden,
    projects, chattableAgents,
    // Customize
    customizeTarget, setCustomizeTarget, customizeFileRef,
    // Handlers
    handleProjectSend, handleProjectKeyDown,
    handleSend, handleKeyDown,
    handleFileSelection,
    sendProjectText, sendAgentText,
    sendProjectTextRef, sendAgentTextRef,
    // Settings helpers
    currentVoice, selectVoice, saveRoomName,
    saveEnvKey, deleteEnvKey,
  }

  // ── Project view ─────────────────────────────────────────────────────────────

  if ((projectId || inlineProject) && !selectedAgent) {
    return <ProjectChatView {...ctx} />
  }

  // ── Agent list / Conversations ──────────────────────────────────────────────

  if (!selectedAgent) {
    return <ConversationsView {...ctx} />
  }

  // ── Thread view ──────────────────────────────────────────────────────────────

  return <ThreadView {...ctx} />
}
