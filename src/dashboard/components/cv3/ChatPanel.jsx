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

export default function ChatPanel({ agents, inboxItems, worldId, initialAgent, onSelectAgent, onSelectProject, onBack, currentUser, allTasks = [] }) {
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

  const { isLoading: projectsLoading, isError: projectsError, projects } = useProjects()

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
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedAgent, worldId])

  // Load project messages when a project is selected
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    setLoadingMsgs(true)
    setMessages([])
    supabase
      .from('messages')
      .select('*')
      .eq('client_id', selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId)
      .eq('agent', `project:${selectedProject.slug}`)
      .order('timestamp', { ascending: true })
      .limit(200)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data)
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
          if (msg.agent === `project:${selectedProject.slug}`) {
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
    const text = input.trim()
    if (!text || sending || !selectedAgent) return
    setInput('')
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
      source: 'corner-dashboard',
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

    try {
      // Run in parallel: persist user message + get AI response
      const [saveResult, geminiResult] = await Promise.allSettled([
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: selectedAgent.slug,
            text,
            role: 'user',
            source: 'corner-dashboard',
            client_id: worldId,
            ...userIdentity,
          }),
        }).then(r => r.json()),
        fetch('/api/dashboard/v2-gemini-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            agent: selectedAgent.slug,
            client_id: worldId,
            history,
            ...userIdentity,
            project_id: selectedProject?.id || null,
          }),
        }).then(r => r.json()),
      ])

      // Replace temp user msg with real DB id -- prevents realtime duplicate
      if (saveResult.status === 'fulfilled' && saveResult.value?.message?.id) {
        const realMsg = saveResult.value.message
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...realMsg } : m))
      }

      // Append AI response
      if (geminiResult.status === 'fulfilled' && geminiResult.value?.reply) {
        const reply = geminiResult.value.reply
        const replyTime = new Date().toISOString()
        const tempAgentId = `temp-agent-${Date.now()}`
        setMessages(prev => [...prev, {
          id: tempAgentId,
          role: 'agent',
          agent: selectedAgent.slug,
          text: reply,
          timestamp: replyTime,
          source: 'gemini',
        }])
        // Update preview with AI reply so agent list is current
        const replyPreview = (reply.length > 80 ? reply.slice(0, 80) + '...' : reply)
        setAgentPreviews(prev => ({
          ...prev,
          [selectedAgent.slug]: {
            agent: selectedAgent.slug,
            text: replyPreview,
            timestamp: replyTime,
            id: tempAgentId,
            isUnread: false,
          },
        }))
        // Persist AI response; swap temp id for real one when saved
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: selectedAgent.slug,
            text: reply,
            role: 'agent',
            source: 'gemini',
            client_id: worldId,
          }),
        })
          .then(r => r.json())
          .then(data => {
            if (data?.message?.id) {
              setMessages(prev => prev.map(m => m.id === tempAgentId ? { ...data.message } : m))
            }
          })
          .catch(() => {})
      }
    } catch (err) {
      console.error('[ChatPanel] send error:', err)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, selectedAgent, worldId])

  // Core send logic for agent chat -- accepts text directly so voice transcription can call it
  const sendAgentText = useCallback(async (text) => {
    if (!text?.trim() || !selectedAgent || !worldId) return
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
      source: 'corner-dashboard',
    }])
    const previewText = 'You: ' + (text.length > 70 ? text.slice(0, 70) + '...' : text)
    setAgentPreviews(prev => ({
      ...prev,
      [selectedAgent.slug]: { agent: selectedAgent.slug, text: previewText, timestamp: now, id: tempUserId, isUnread: false },
    }))
    const history = messagesRef.current.slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || '' }],
    }))
    try {
      const [saveResult, geminiResult] = await Promise.allSettled([
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: selectedAgent.slug, text, role: 'user', source: 'corner-dashboard', client_id: worldId, ...userIdentity }),
        }).then(r => r.json()),
        fetch('/api/dashboard/v2-gemini-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, agent: selectedAgent.slug, client_id: worldId, history, project_id: selectedProject?.id || null, ...userIdentity }),
        }).then(r => r.json()),
      ])
      if (saveResult.status === 'fulfilled' && saveResult.value?.message?.id) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...saveResult.value.message } : m))
      }
      if (geminiResult.status === 'fulfilled' && geminiResult.value?.reply) {
        const reply = geminiResult.value.reply
        const replyTime = new Date().toISOString()
        const tempAgentId = `temp-agent-${Date.now()}`
        setMessages(prev => [...prev, { id: tempAgentId, role: 'agent', agent: selectedAgent.slug, text: reply, timestamp: replyTime, source: 'gemini' }])
        setAgentPreviews(prev => ({
          ...prev,
          [selectedAgent.slug]: { agent: selectedAgent.slug, text: reply.length > 80 ? reply.slice(0, 80) + '...' : reply, timestamp: replyTime, id: tempAgentId, isUnread: false },
        }))
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: selectedAgent.slug, text: reply, role: 'agent', source: 'gemini', client_id: worldId }),
        }).then(r => r.json()).then(data => {
          if (data?.message?.id) setMessages(prev => prev.map(m => m.id === tempAgentId ? { ...data.message } : m))
        }).catch(() => {})
      }
    } catch (err) {
      console.error('[ChatPanel] agent send error:', err)
    } finally {
      setSending(false)
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
  const sendProjectText = useCallback(async (text) => {
    if (!text?.trim() || !selectedProject || !worldId) return
    setSending(true)
    const agentKey = `project:${selectedProject.slug}`
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

    try {
      // Run in parallel: persist user message + get AI response
      const [saveResult, geminiResult] = await Promise.allSettled([
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: agentKey, text, role: 'user', source: 'corner-dashboard', client_id: projectClientId, ...userIdentity }),
        }).then(r => r.json()),
        fetch('/api/dashboard/v2-gemini-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            project_slug: selectedProject.slug,
            project_id: selectedProject.id || null,
            client_id: projectClientId,
            history,
            ...userIdentity,
          }),
        }).then(r => r.json()),
      ])

      // Replace temp user msg with real DB id
      if (saveResult.status === 'fulfilled' && saveResult.value?.message?.id) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...saveResult.value.message } : m))
      }

      // Append AI response
      if (geminiResult.status === 'fulfilled' && geminiResult.value?.reply) {
        const reply = geminiResult.value.reply
        const replyTime = new Date().toISOString()
        const tempAgentId = `temp-proj-reply-${Date.now()}`
        setMessages(prev => [...prev, {
          id: tempAgentId,
          role: 'agent',
          agent: agentKey,
          text: reply,
          timestamp: replyTime,
          source: 'gemini',
        }])
        // Persist AI response
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agentKey,
            text: reply,
            role: 'agent',
            source: 'gemini',
            client_id: projectClientId,
          }),
        })
          .then(r => r.json())
          .then(data => {
            if (data?.message?.id) {
              setMessages(prev => prev.map(m => m.id === tempAgentId ? { ...data.message } : m))
            }
          })
          .catch(() => {})
      }
    } catch (err) {
      console.error('[ChatPanel] project send error:', err)
    } finally {
      setSending(false)
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

  // ── Project view ─────────────────────────────────────────────────────────────

  if ((projectId || inlineProject) && !selectedAgent) {
    const projColor = selectedProject?.color || '#6B8AB0'
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Project chat header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(8,14,28,0.95)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => {
              if (isVoiceActive) {
                // Minimize call instead of killing it
                setVoiceMinimized(true)
                voiceMinimizedAgent.current = { type: 'project', data: selectedProject }
                onBack?.()
                if (projectId) navigate('/dashboard')
              } else {
                setMessages([]); setInlineProject(null); onBack?.(); if (projectId) navigate('/dashboard')
              }
            }}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#A0A0A0', fontSize: 18, lineHeight: 1,
            }}
          >
            &#x2190;
          </button>
          {/* Project color dot */}
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
            border: `1px solid ${projColor}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: 3,
              background: projColor,
              boxShadow: `0 0 6px ${projColor}66`,
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: C.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'block',
            }}>
              {selectedProject?.name || 'Project'}
            </span>
          </div>
          {/* Telephone button in project header */}
          <button
            onClick={handleMicToggle}
            title={isRecording ? 'Stop recording' : 'Record voice message'}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
              border: isRecording ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isRecording ? '#EF4444' : C.muted,
              transition: 'all 0.15s',
            }}
          >
            {isRecording ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
            )}
          </button>
          {/* Search button */}
          <button
            onClick={() => { setChatSearchOpen(o => !o); setChatSearchQuery(''); setChatSearchResults(null) }}
            title="Search chat history"
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: chatSearchOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: chatSearchOpen ? C.text : C.muted,
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          {/* Settings button */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              title="Settings"
              style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: settingsOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Chat search bar */}
        {chatSearchOpen && (
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(8,14,28,0.95)',
          }}>
            <input
              ref={chatSearchRef}
              type="text"
              placeholder="Search all messages..."
              value={chatSearchQuery}
              onChange={e => setChatSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setChatSearchOpen(false); setChatSearchQuery(''); setChatSearchResults(null) } }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: C.text, fontSize: 13,
                outline: 'none',
              }}
            />
            {chatSearchLoading && <span style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'block' }}>Searching...</span>}
            {chatSearchResults && !chatSearchLoading && (
              <span style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'block' }}>
                {chatSearchResults.length} result{chatSearchResults.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Search results overlay */}
        {chatSearchOpen && chatSearchResults && chatSearchResults.length > 0 && (
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {chatSearchResults.map((msg, i) => (
              <div key={msg.id || i} style={{
                padding: '8px 10px', borderRadius: 8,
                background: msg.role === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  {msg.role === 'user' ? 'You' : (msg.source || 'Agent')} {' '}
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                  {(msg.text || '').substring(0, 300)}{(msg.text || '').length > 300 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages scroll area (hidden when search results showing) */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '12px 14px',
          display: (chatSearchOpen && chatSearchResults && chatSearchResults.length > 0) ? 'none' : 'flex',
          flexDirection: 'column', gap: 6,
        }}>
          {loadingMsgs && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>
            </div>
          )}
          {!loadingMsgs && messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingTop: 60,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
                border: `1px solid ${projColor}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: projColor,
                  boxShadow: `0 0 10px ${projColor}77`,
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
                {selectedProject?.name || 'Project'}
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
            </div>
          )}
          {messages.map(msg => {
            const isUser = msg.role === 'user'
            const senderName = msg.user_name || (isUser ? displayName : null)
            const senderInitial = senderName ? senderName[0].toUpperCase() : 'U'
            const isOtherUser = isUser && msg.user_name && msg.user_name !== displayName
            const senderColor = isUser ? (isOtherUser ? '#7C3AED' : '#2563EB') : projColor
            const senderProfile = msg.user_id ? (msg.user_id === currentUser?.id ? { avatar_url: currentUser?.user_metadata?.avatar_url } : userProfiles[msg.user_id]) : null
            const senderAvatar = senderProfile?.avatar_url || null
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: 10,
                  marginBottom: isUser ? 4 : 12,
                }}
              >
                {!isUser && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `linear-gradient(135deg, ${projColor}33, ${projColor}18)`,
                    border: `1px solid ${projColor}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    alignSelf: 'flex-start', marginTop: 2,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: projColor }} />
                  </div>
                )}
                <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
                  {isUser && isOtherUser && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', textAlign: 'right', marginBottom: 3, fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' }}>
                      {msg.user_name}
                    </div>
                  )}
                  <div style={{
                    padding: isUser ? '10px 16px' : '2px 0',
                    borderRadius: isUser ? '18px 18px 4px 18px' : 0,
                    fontSize: 14, lineHeight: 1.6,
                    color: isUser ? '#fff' : '#E2E8F0',
                    background: isUser ? senderColor : 'transparent',
                    border: 'none',
                    wordBreak: 'break-word',
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '-0.01em',
                    ...(isUser ? { whiteSpace: 'pre-wrap' } : {}),
                  }}>
                    {isUser
                      ? <LinkifyText text={msg.text} />
                      : <ChatMessageRenderer content={msg.text} style={{ fontSize: 14, lineHeight: 1.6, color: '#E2E8F0' }} />
                    }
                  </div>
                  <div style={{
                    fontSize: 11, color: 'rgba(120,140,165,0.4)',
                    marginTop: 4,
                    textAlign: isUser ? 'right' : 'left',
                    paddingRight: isUser ? 2 : 0,
                    paddingLeft: isUser ? 0 : 2,
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
                {isUser && (
                  <div title={senderName || 'User'} style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: senderAvatar ? 'transparent' : senderColor,
                    border: senderAvatar ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {senderAvatar
                      ? <img src={senderAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{senderInitial}</span>
                    }
                  </div>
                )}
              </div>
            )
          })}
          {sending && (
            <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
              <TypingIndicatorV2 streaming={true} agentColor={projColor} compact={false} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Hidden VoiceChat for project -- mounts when voice is active */}
        {isVoiceActive && (
          <div style={{ display: 'none' }}>
            <VoiceChat
              ref={voiceChatRef}
              agentSlug={`project:${selectedProject?.slug || 'rex'}`}
              agentColor={projColor}
              clientId={worldId}
              autoStart={true}
              initialVoice={currentVoice}
              onVoiceChange={selectVoice}
              onTranscript={(text, role) => {
                setVoiceTranscriptText(text)
                const msgRole = role === 'model' ? 'agent' : 'user'
                const agentKey = `project:${selectedProject?.slug}`
                const projCid = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
                const tempId = `voice-${role}-${Date.now()}`
                setMessages(prev => [...prev, {
                  id: tempId,
                  role: msgRole,
                  agent: agentKey,
                  text,
                  timestamp: new Date().toISOString(),
                  source: 'voice',
                }])
                // Persist voice transcript to DB
                fetch('/api/dashboard/supabase-messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    agent: agentKey,
                    text,
                    role: msgRole,
                    source: 'voice',
                    client_id: projCid,
                    ...(msgRole === 'user' ? userIdentity : {}),
                  }),
                }).then(r => r.json()).then(data => {
                  if (data?.message?.id) {
                    setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message } : m))
                  }
                }).catch(() => {})
              }}
              onStatusChange={(s) => {
                setVoiceStatus(s)
                if (s === 'idle') {
                  setIsVoiceActive(false)
                  setVoiceMuted(false)
                  setVoiceTranscriptText('')
                  // Voice session ended -- ask operator to summarize and create follow-ups
                  const voiceMsgs = messagesRef.current?.filter(m => m.source === 'voice') || []
                  if (voiceMsgs.length >= 4) {
                    setTimeout(() => {
                      sendProjectText('[Voice conversation just ended] Review our voice conversation above. Post a brief summary of what we discussed and any decisions made. If there are action items or tasks that should be created, create them now. Do not ask for permission -- just summarize and queue any tasks that came up.')
                    }, 1500)
                  }
                }
              }}
              onVolumeChange={setVoiceVolume}
            />
          </div>
        )}

        {/* Voice mode UI -- replaces input bar when voice is active */}
        {isVoiceActive && (
          <div style={{
            padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
            background: C.bg2,
            borderTop: '1px solid ' + C.border,
            flexShrink: 0,
          }}>
            <style>{`
              @keyframes vw { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
            `}</style>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 3, height: 40, marginBottom: 8,
            }}>
              {[
                { h: 14, d: '0s' }, { h: 26, d: '.08s' }, { h: 38, d: '.16s' },
                { h: 30, d: '.24s' }, { h: 18, d: '.32s' }, { h: 34, d: '.12s' },
                { h: 22, d: '.20s' }, { h: 40, d: '.28s' }, { h: 16, d: '.36s' },
              ].map((bar, i) => (
                <div key={i} style={{
                  width: 3, height: bar.h, borderRadius: 2,
                  background: C.accent,
                  animation: `vw 1s ease-in-out ${bar.d} infinite`,
                }} />
              ))}
            </div>
            <div style={{
              textAlign: 'center', fontSize: 12, fontWeight: 600,
              color: C.accent, fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 4,
            }}>
              {voiceStatus === 'connecting' ? 'Connecting...'
                : voiceStatus === 'speaking' ? 'Speaking...'
                : voiceStatus === 'error' ? 'Error'
                : 'Listening...'}
            </div>
            <div style={{
              fontSize: 13, color: C.text2, textAlign: 'center',
              minHeight: 18, padding: '0 20px',
            }}>
              {voiceTranscriptText ? `"${voiceTranscriptText}"` : ''}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10,
            }}>
              <button
                onClick={() => {
                  voiceChatRef.current?.toggleMute()
                  setVoiceMuted(v => !v)
                }}
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: '1px solid ' + C.border,
                  background: voiceMuted ? 'rgba(239,68,68,0.15)' : C.s2,
                  color: voiceMuted ? '#F87171' : C.muted,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
                }}
              >
                M
              </button>
              <button
                onClick={() => {
                  voiceChatRef.current?.stop()
                  setIsVoiceActive(false)
                  setVoiceMuted(false)
                  setVoiceTranscriptText('')
                }}
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: 'none',
                  background: C.red, color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
                }}
              >
                &#x00D7;
              </button>
            </div>
          </div>
        )}

        {/* Project chat input -- CV3 pill design, hidden when voice active */}
        {/* Recording status bar */}
        {(isRecording || isTranscribing) && (
          <div style={{
            flexShrink: 0, padding: '8px 16px',
            background: 'rgba(239,68,68,0.06)',
            borderTop: '1px solid rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: isTranscribing ? '#F59E0B' : '#EF4444',
              animation: isTranscribing ? 'none' : 'recDot 1s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 500 }}>
              {isTranscribing ? 'Transcribing...' : `Recording ${Math.floor(recordingElapsed / 60)}:${String(recordingElapsed % 60).padStart(2, '0')}`}
            </span>
            {isRecording && (
              <button onClick={handleMicToggle} style={{
                marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                color: '#EF4444', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer',
              }}>Stop</button>
            )}
            {micError && <span style={{ fontSize: 12, color: '#F87171', marginLeft: 'auto' }}>{micError}</span>}
          </div>
        )}
        {!isVoiceActive && <div style={{
          flexShrink: 0,
          padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
          background: C.bg,
          borderTop: '1px solid ' + C.border,
        }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={handleFileSelection}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: C.s1,
            border: '1.5px solid ' + (chatInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
            borderRadius: 26,
            padding: '5px 5px 5px 16px',
            maxWidth: 560,
            margin: '0 auto',
            boxShadow: chatInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
            transition: 'border-color 0.25s, box-shadow 0.25s',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleProjectKeyDown}
              onFocus={() => setChatInputFocused(true)}
              onBlur={() => setChatInputFocused(false)}
              placeholder={`Message ${selectedProject?.name || 'project'}...`}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            </div>
            {!input.trim() && (
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
            {input.trim() && (
              <button
                title="Send"
                onClick={handleProjectSend}
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
        </div>}
        {/* Chat settings full-screen overlay */}
        {settingsOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: isMobile ? C.s1 : 'rgba(0,0,0,0.85)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            {/* Left pane -- horizontal scroll on mobile, vertical sidebar on desktop */}
            <div style={{
              ...(isMobile
                ? { flexShrink: 0, background: C.bg2, borderBottom: '1px solid ' + C.border2 }
                : { width: 220, flexShrink: 0, background: C.bg2, borderRight: '1px solid ' + C.border2, display: 'flex', flexDirection: 'column' }
              ),
            }}>
              <div style={{
                padding: isMobile ? '12px 16px 0' : '28px 20px 20px',
                ...(!isMobile && { borderBottom: '1px solid ' + C.border }),
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>Settings</span>
                {isMobile && (
                  <button
                    onClick={() => setSettingsOpen(false)}
                    style={{
                      width: 44, height: 44,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid ' + C.border,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.text2, flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
              <div style={{
                padding: isMobile ? '8px 12px 12px' : '12px 8px',
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                gap: isMobile ? 6 : 2,
                ...(isMobile && { overflowX: 'auto', WebkitOverflowScrolling: 'touch' }),
              }}>
                {['General', 'Voice', ...(selectedProject ? ['Collaborators'] : []), 'Google', 'Keys'].map(item => (
                  <button
                    key={item}
                    onClick={() => setSettingsTab(item)}
                    style={{
                      padding: isMobile ? '8px 16px' : '7px 12px',
                      fontSize: 13,
                      color: settingsTab === item ? C.text : C.text2,
                      fontFamily: "'Inter', sans-serif", borderRadius: 6,
                      background: settingsTab === item ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                      whiteSpace: isMobile ? 'nowrap' : 'normal',
                      width: isMobile ? 'auto' : '100%',
                      flexShrink: 0,
                    }}
                  >{item}</button>
                ))}
              </div>
            </div>
            {/* Right pane */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.s1, overflow: 'hidden', minHeight: 0 }}>
              {!isMobile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid ' + C.border,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                  {settingsTab}
                </span>
                <button
                  onClick={() => setSettingsOpen(false)}
                  style={{
                    width: 44, height: 44,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid ' + C.border,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.text2,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              )}
              <div style={{
                padding: isMobile ? '16px 16px' : '24px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 16 : 20,
                overflowY: 'auto',
                flex: 1,
                WebkitOverflowScrolling: 'touch',
              }}>
                {/* Room rename */}
                {settingsTab === 'General' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Room Name
                  </div>
                  <input
                    value={chatNameInput}
                    onChange={e => setChatNameInput(e.target.value)}
                    onBlur={e => saveRoomName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { saveRoomName(e.target.value); e.target.blur() } }}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '8px 12px',
                      color: C.text, fontSize: 13,
                      fontFamily: "'Inter', sans-serif", outline: 'none',
                    }}
                  />
                </div>
                )}
                {/* Voice selection */}
                {settingsTab === 'Voice' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Voice
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', borderRadius: 8 }}>
                    {VOICE_OPTIONS.map(({ id, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => selectVoice(id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                          background: currentVoice === id ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${currentVoice === id ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: currentVoice === id ? '#60A5FA' : C.text, fontFamily: "'Inter', sans-serif" }}>{label}</div>
                          <div style={{ fontSize: 11, color: C.text2, marginTop: 1, fontFamily: "'Inter', sans-serif" }}>{desc}</div>
                        </div>
                        {currentVoice === id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                )}
                {/* Collaborators -- only show for projects */}
                {selectedProject && settingsTab === 'Collaborators' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Collaborators
                    </div>
                    {/* Current collaborators */}
                    {collaborators.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {collaborators.map(c => (
                          <div key={c.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 8,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                              background: c.avatar_url ? 'transparent' : `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
                              border: c.avatar_url ? '1px solid rgba(255,255,255,0.1)' : 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden',
                            }}>
                              {c.avatar_url
                                ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{(c.display_name || c.email || c.client_id)[0].toUpperCase()}</span>
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.display_name || c.client_id}
                              </div>
                              {c.email && <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter', sans-serif" }}>{c.email}</div>}
                            </div>
                            <span style={{ fontSize: 10, color: C.muted, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {c.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {collaborators.length === 0 && (
                      <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
                        No collaborators yet
                      </div>
                    )}
                    {/* Invite input */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => { setInviteEmail(e.target.value); setInviteMsg(null) }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && inviteEmail.trim() && !inviteLoading) {
                            setInviteLoading(true)
                            setInviteMsg(null)
                            fetch('/api/dashboard/project-invite', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ project_id: selectedProject.id, email: inviteEmail.trim() }),
                            })
                              .then(r => r.json())
                              .then(data => {
                                if (data.ok) {
                                  setInviteMsg({ type: 'ok', text: `Invited ${data.invited.display_name || data.invited.email}` })
                                  setInviteEmail('')
                                  // Refresh collaborators
                                  fetch(`/api/dashboard/project-invite?project_id=${selectedProject.id}`)
                                    .then(r => r.json()).then(d => { if (d.collaborators) setCollaborators(d.collaborators) })
                                } else {
                                  setInviteMsg({ type: 'err', text: data.error })
                                }
                              })
                              .catch(() => setInviteMsg({ type: 'err', text: 'Failed to invite' }))
                              .finally(() => setInviteLoading(false))
                          }
                        }}
                        placeholder="Invite by email..."
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          fontSize: 13,
                          fontFamily: "'Inter', sans-serif",
                          color: C.text,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        disabled={inviteLoading || !inviteEmail.trim()}
                        onClick={() => {
                          if (!inviteEmail.trim() || inviteLoading) return
                          setInviteLoading(true)
                          setInviteMsg(null)
                          fetch('/api/dashboard/project-invite', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ project_id: selectedProject.id, email: inviteEmail.trim() }),
                          })
                            .then(r => r.json())
                            .then(data => {
                              if (data.ok) {
                                setInviteMsg({ type: 'ok', text: `Invited ${data.invited.display_name || data.invited.email}` })
                                setInviteEmail('')
                                fetch(`/api/dashboard/project-invite?project_id=${selectedProject.id}`)
                                  .then(r => r.json()).then(d => { if (d.collaborators) setCollaborators(d.collaborators) })
                              } else {
                                setInviteMsg({ type: 'err', text: data.error })
                              }
                            })
                            .catch(() => setInviteMsg({ type: 'err', text: 'Failed to invite' }))
                            .finally(() => setInviteLoading(false))
                        }}
                        style={{
                          padding: '8px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: "'Inter', sans-serif",
                          color: '#fff',
                          background: inviteLoading || !inviteEmail.trim() ? C.muted : C.accent,
                          border: 'none',
                          borderRadius: 8,
                          cursor: inviteLoading || !inviteEmail.trim() ? 'default' : 'pointer',
                          transition: 'background 0.15s',
                          flexShrink: 0,
                        }}
                      >
                        {inviteLoading ? '...' : 'Invite'}
                      </button>
                    </div>
                    {inviteMsg && (
                      <div style={{
                        marginTop: 6, fontSize: 12, fontFamily: "'Inter', sans-serif",
                        color: inviteMsg.type === 'ok' ? C.accent : '#F87171',
                      }}>
                        {inviteMsg.text}
                      </div>
                    )}
                  </div>
                )}
                {/* Google Integration */}
                {settingsTab === 'Google' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Google Integration
                  </div>
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    marginBottom: 10,
                  }}>
                    <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                      Connect Google Calendar and Gmail so agents can schedule events and send emails on behalf of this world.
                    </div>
                  </div>
                  <a
                    href={`/api/google-oauth/authorize?world_id=${encodeURIComponent(worldId)}&scope=both`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '9px 0',
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      color: '#fff',
                      background: 'rgba(66,133,244,0.85)',
                      border: '1px solid rgba(66,133,244,0.5)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      boxSizing: 'border-box',
                      transition: 'background 0.15s',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Connect Google Calendar + Gmail
                  </a>
                </div>
                )}
                {/* Keys (env_vars keychain) */}
                {settingsTab === 'Keys' && (
                <div style={{ padding: '4px 0 8px' }}>
                  {/* Main "KEYS" heading */}
                  <div style={{
                    fontSize: TYPE.xl, fontWeight: 700, color: C.text,
                    fontFamily: "'Inter', sans-serif",
                    textTransform: 'uppercase', letterSpacing: LS.caps,
                    lineHeight: LH.tight,
                    marginBottom: 20,
                  }}>
                    {selectedProject ? 'Keys' : 'My Keys'}
                  </div>
                  {envKeysLoading ? (
                    <div style={{ fontSize: TYPE.base, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: LH.body }}>Loading...</div>
                  ) : (
                    <>
                      {/* User keys */}
                      {envKeys.user.length > 0 && (
                        <div style={{ marginBottom: selectedProject ? 20 : 0 }}>
                          {selectedProject && (
                            <div style={{
                              fontSize: TYPE.sm, fontWeight: 600, color: C.muted,
                              fontFamily: "'Inter', sans-serif",
                              textTransform: 'uppercase', letterSpacing: LS.wide,
                              lineHeight: LH.tight,
                              marginBottom: 8,
                            }}>Personal</div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {envKeys.user.map(k => (
                              <div key={k.key} style={{
                                display: 'flex', flexDirection: 'column', gap: 8,
                                padding: '10px 12px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 8,
                              }}>
                                <label style={{
                                  fontSize: TYPE.xs, fontWeight: 600, color: C.muted,
                                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                                  textTransform: 'uppercase', letterSpacing: LS.wide,
                                  lineHeight: LH.tight,
                                }}>{k.key}</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <input
                                    type="password"
                                    placeholder="Enter new value to update"
                                    style={{
                                      flex: 1, padding: '6px 10px', fontSize: TYPE.sm,
                                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                                      color: C.text, lineHeight: LH.body,
                                      background: 'rgba(255,255,255,0.06)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: 6, outline: 'none',
                                    }}
                                  />
                                  <button
                                    onClick={() => deleteEnvKey('user', k.key)}
                                    style={{
                                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                      borderRadius: 6, cursor: 'pointer', color: '#F87171', fontSize: TYPE.sm,
                                      fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: '5px 10px', flexShrink: 0,
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Project keys */}
                      {selectedProject && envKeys.project.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{
                            fontSize: TYPE.sm, fontWeight: 600, color: C.muted,
                            fontFamily: "'Inter', sans-serif",
                            textTransform: 'uppercase', letterSpacing: LS.wide,
                            lineHeight: LH.tight,
                            marginBottom: 8,
                          }}>Project</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {envKeys.project.map(k => (
                              <div key={k.key} style={{
                                display: 'flex', flexDirection: 'column', gap: 8,
                                padding: '10px 12px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 8,
                              }}>
                                <label style={{
                                  fontSize: TYPE.xs, fontWeight: 600, color: C.muted,
                                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                                  textTransform: 'uppercase', letterSpacing: LS.wide,
                                  lineHeight: LH.tight,
                                }}>{k.key}</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <input
                                    type="password"
                                    placeholder="Enter new value to update"
                                    style={{
                                      flex: 1, padding: '6px 10px', fontSize: TYPE.sm,
                                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                                      color: C.text, lineHeight: LH.body,
                                      background: 'rgba(255,255,255,0.06)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: 6, outline: 'none',
                                    }}
                                  />
                                  <button
                                    onClick={() => deleteEnvKey('project', k.key)}
                                    style={{
                                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                      borderRadius: 6, cursor: 'pointer', color: '#F87171', fontSize: TYPE.sm,
                                      fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: '5px 10px', flexShrink: 0,
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {envKeys.user.length === 0 && envKeys.project.length === 0 && (
                        <div style={{ fontSize: TYPE.base, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: LH.body, marginBottom: 16 }}>
                          No keys configured yet
                        </div>
                      )}
                      {/* Add key form */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                        {selectedProject && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['user', 'project'].map(s => (
                              <button
                                key={s}
                                onClick={() => setNewKeyScope(s)}
                                style={{
                                  flex: 1,
                                  padding: '7px 0',
                                  fontSize: TYPE.sm, fontWeight: newKeyScope === s ? 700 : 500,
                                  fontFamily: "'Inter', sans-serif",
                                  color: newKeyScope === s ? '#fff' : C.muted,
                                  background: newKeyScope === s ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${newKeyScope === s ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          value={newKeyName}
                          onChange={e => { setNewKeyName(e.target.value); setKeySaveMsg(null) }}
                          placeholder="Key name (e.g. GMAIL_API_KEY)"
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '8px 12px', fontSize: TYPE.sm,
                            fontFamily: "'SF Mono', 'Fira Code', monospace",
                            color: C.text, lineHeight: LH.body,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, outline: 'none',
                          }}
                        />
                        <input
                          type="password"
                          value={newKeyValue}
                          onChange={e => { setNewKeyValue(e.target.value); setKeySaveMsg(null) }}
                          placeholder="Value"
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '8px 12px', fontSize: TYPE.sm,
                            fontFamily: "'SF Mono', 'Fira Code', monospace",
                            color: C.text, lineHeight: LH.body,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, outline: 'none',
                          }}
                        />
                        <button
                          disabled={!newKeyName.trim() || !newKeyValue.trim()}
                          onClick={saveEnvKey}
                          style={{
                            padding: '8px 0', fontSize: TYPE.sm, fontWeight: 600,
                            fontFamily: "'Inter', sans-serif",
                            color: '#fff', lineHeight: LH.tight,
                            background: (!newKeyName.trim() || !newKeyValue.trim()) ? C.muted : C.accent,
                            border: 'none', borderRadius: 8,
                            cursor: (!newKeyName.trim() || !newKeyValue.trim()) ? 'default' : 'pointer',
                          }}
                        >
                          Save Key
                        </button>
                        {keySaveMsg && (
                          <div style={{ fontSize: TYPE.xs, fontFamily: "'Inter', sans-serif", lineHeight: LH.body, color: keySaveMsg.type === 'ok' ? C.accent : '#F87171' }}>
                            {keySaveMsg.text}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Agent list ───────────────────────────────────────────────────────────────

  if (!selectedAgent) {
    return (
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* ── Call in progress banner ──────────────────────────────────── */}
        {voiceMinimized && isVoiceActive && voiceMinimizedAgent.current && (
          <button
            onClick={() => {
              const saved = voiceMinimizedAgent.current
              if (saved?.type === 'project') {
                setInlineProject(saved.data)
                onSelectProject?.(saved.data)
              } else if (saved?.type === 'agent') {
                setSelectedAgent(saved.data)
                onSelectAgent?.(saved.data)
              }
              setVoiceMinimized(false)
            }}
            style={{
              width: '100%', padding: '10px 14px', marginBottom: 12,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              color: '#10B981',
            }}
          >
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#10B981',
              animation: 'pulse 1.5s ease-in-out infinite',
              boxShadow: '0 0 8px rgba(16,185,129,0.5)',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              Call in progress with {voiceMinimizedAgent.current?.data?.name || 'agent'}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(16,185,129,0.7)', marginLeft: 'auto' }}>
              Tap to return
            </span>
          </button>
        )}

        {/* ── Greeting hero ──────────────────────────────────────────────── */}
        <div style={{ paddingBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: C.accent,
              boxShadow: `0 0 6px ${C.accent}`,
            }} />
            {lastLoginText ? `Last login: ${lastLoginText}` : 'Online now'}
          </div>
          <h1 style={{
            fontSize: 'clamp(26px, 5.5vw, 40px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            color: C.text,
            margin: 0,
            fontFamily: "'Inter', sans-serif",
          }}>
            {GREETINGS[greetingIdx](displayName)}
          </h1>
        </div>

        {/* ── Search bar ───────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '8px 12px',
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search agents and projects..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: 'rgba(255,255,255,0.8)',
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, flexShrink: 0,
                }}
              >
                &#x2715;
              </button>
            )}
          </div>
        </div>

        {/* ── Pins section ─────────────────────────────────────── */}
        {filteredPinnedItems.length > 0 && (
          <>
            <div
              onClick={() => toggleSection('favorites')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 11, fontWeight: 700, color: C.muted,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: sectionStates.favorites ? 12 : 4,
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <span>Pins <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: C.muted, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '1px 6px', letterSpacing: '0.02em' }}>{filteredPinnedItems.length}</span></span>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: sectionStates.favorites ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{ maxHeight: sectionStates.favorites ? 9999 : 0, overflow: 'hidden', transition: 'max-height 300ms ease', marginBottom: sectionStates.favorites ? 16 : 0 }}>
              {filteredPinnedItems.map(item => {
                if (item.type === 'agent') {
                  const agent = item.data
                  const lastMsg    = unreadMap[agent.slug]
                  const unreadCount = unreadCounts[agent.slug] || 0
                  const isActive   = agent.status?.toUpperCase() !== 'IDLE'
                  const muted      = isMuted(agent.slug)
                  const statusInfo = getStatusColor(agent.status)
                  const statusLabel = agent.status === 'building' ? 'Building' : agent.status === 'qa' ? 'QA' : agent.status === 'queued' ? 'Queued' : isActive ? 'Online' : 'Idle'
                  return (
                    <SwipeCard key={`pin-${agent.slug}`} actions={[
                      { label: 'Unpin', bg: C.s2, color: C.accent,
                        icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                        onAction: () => toggleFav('agent', agent.slug) },
                      { label: muted ? 'Unmute' : 'Mute', bg: 'rgba(255,255,255,0.06)', color: C.muted,
                        icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round"><path d={muted ? "M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" : "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}/></svg>,
                        onAction: () => toggleMute(agent.slug) },
                    ]}>
                      <button
                        onClick={() => { setSelectedAgent(agent); onSelectAgent?.(agent) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          width: '100%', padding: '12px 14px',
                          borderRadius: 14,
                          background: C.s1,
                          border: `1px solid ${isActive ? 'rgba(16,185,129,0.15)' : C.border}`,
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'all 200ms ease',
                          position: 'relative', overflow: 'hidden',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = isActive ? 'rgba(16,185,129,0.15)' : C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                      >
                        {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />}
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          background: agent.color || C.accent,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 15, color: '#000',
                        }}>
                          {(agent.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{agent.name}</span>
                              <svg width={10} height={10} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2} style={{ opacity: 0.4 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            </div>
                            <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                              {lastMsg?.timestamp ? formatChatTime(lastMsg.timestamp) : ''}
                            </span>
                          </div>
                          <div style={{
                            fontSize: 12, color: C.muted, marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            {lastMsg?.text || 'No messages yet'}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            fontSize: 9, fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: isActive ? C.accent : agent.status === 'building' ? C.yellow : C.dim,
                          }}>
                            <div style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: statusInfo.dot,
                              boxShadow: statusInfo.glow,
                            }} />
                            {statusLabel}
                          </div>
                          {unreadCount > 0 && (
                            <span style={{
                              minWidth: 18, height: 18, borderRadius: 9,
                              background: C.accent, color: '#000',
                              fontSize: 9, fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: "'JetBrains Mono', monospace",
                              padding: '0 4px',
                            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                          )}
                        </div>
                      </button>
                    </SwipeCard>
                  )
                }
                // project item
                const project = item.data
                const pColor = project.color || '#6B8AB0'
                return (
                  <SwipeCard key={`pin-${project.id || project.slug}`} actions={[
                    { label: 'Unpin', bg: C.s2, color: C.accent,
                      icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                      onAction: () => toggleFav('project', project.slug) },
                  ]}>
                    <button
                      onClick={() => { setInlineProject(project); setMessages([]); setSelectedAgent(null); onSelectProject?.(project) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '12px 14px',
                        borderRadius: 14,
                        background: C.s1,
                        border: `1px solid ${C.border}`,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 200ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                        border: `1px solid ${pColor}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: pColor, boxShadow: `0 0 8px ${pColor}55` }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                          <svg width={10} height={10} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2} style={{ opacity: 0.4, flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </div>
                      </div>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(80,100,128,0.4)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </SwipeCard>
                )
              })}
            </div>
          </>
        )}

        {/* ── Conversations section (unified agents + projects) ──────────── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
            userSelect: 'none',
          }}
        >
          <span>Conversations{conversationItems.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: C.muted, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '1px 6px', letterSpacing: '0.02em' }}>{conversationItems.length}</span>}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'agents', 'projects'].map(f => (
              <button
                key={f}
                onClick={() => setConversationFilter(f)}
                style={{
                  padding: '2px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.04em',
                  textTransform: 'capitalize',
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  background: conversationFilter === f ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                  color: conversationFilter === f ? C.accent : C.muted,
                }}
              >
                {f === 'all' ? 'All' : f === 'agents' ? 'Agents' : 'Projects'}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const filtered = conversationFilter === 'all' ? conversationItems
            : conversationItems.filter(i => conversationFilter === 'agents' ? i.type === 'agent' : i.type === 'project')
          return filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', paddingTop: 60, gap: 8, color: C.muted,
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: 13 }}>No conversations yet</span>
          </div>
        ) : (
          filtered.map(item => {
            if (item.type === 'agent') {
              const agent = item.data
              const lastMsg    = unreadMap[agent.slug]
              const unreadCount = unreadCounts[agent.slug] || 0
              const isActive   = agent.status?.toUpperCase() !== 'IDLE'
              const pinned     = isFav('agent', agent.slug)
              const muted      = isMuted(agent.slug)
              const statusInfo = getStatusColor(agent.status)
              const statusLabel = agent.status === 'building' ? 'Building' : agent.status === 'qa' ? 'QA' : agent.status === 'queued' ? 'Queued' : isActive ? 'Online' : 'Idle'
              return (
                <SwipeCard key={`conv-${agent.slug}`} actions={[
                  { label: pinned ? 'Unpin' : 'Pin', bg: pinned ? C.s2 : 'rgba(16,185,129,0.2)', color: C.accent,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={pinned ? C.accent : 'none'} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                    onAction: () => toggleFav('agent', agent.slug) },
                  { label: muted ? 'Unmute' : 'Mute', bg: 'rgba(255,255,255,0.06)', color: C.muted,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round"><path d={muted ? "M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" : "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}/></svg>,
                    onAction: () => toggleMute(agent.slug) },
                ]}>
                  <div
                    onClick={() => { setSelectedAgent(agent); onSelectAgent?.(agent) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '12px 14px',
                      borderRadius: 14,
                      background: C.s1,
                      border: `1px solid ${isActive ? 'rgba(16,185,129,0.15)' : C.border}`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 200ms ease',
                      position: 'relative', overflow: 'visible',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = isActive ? 'rgba(16,185,129,0.15)' : C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setCustomizeTarget({ agent, type: 'menu', x: e.clientX, y: e.clientY })
                    }}
                  >
                    {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: agent.color || C.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, color: '#000',
                    }}>
                      {(agent.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{agent.name}</span>
                        <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                          {lastMsg?.timestamp ? formatChatTime(lastMsg.timestamp) : ''}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 12, color: C.muted, marginTop: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {lastMsg?.text || 'No messages yet'}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: 9, fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: isActive ? C.accent : agent.status === 'building' ? C.yellow : C.dim,
                      }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: statusInfo.dot,
                          boxShadow: statusInfo.glow,
                        }} />
                        {statusLabel}
                      </div>
                      {unreadCount > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 9,
                          background: C.accent, color: '#000',
                          fontSize: 9, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: '0 4px',
                        }}>{unreadCount}</span>
                      )}
                    </div>
                    {/* Kebab menu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setCustomizeTarget({ agent, type: 'menu', x: rect.left - 100, y: rect.bottom + 4 })
                      }}
                      style={{
                        width: 24, height: 28, flexShrink: 0,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0.4, transition: 'opacity 0.15s',
                        padding: 0, WebkitTapHighlightColor: 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.4' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={C.muted}>
                        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                      </svg>
                    </button>
                  </div>
                </SwipeCard>
              )
            }
            // Project item
            const project = item.data
            const pColor = project.color || '#6B8AB0'
            const pinned = isFav('project', project.slug)
            const pPreview = projectPreviews[`project:${project.slug}`]
            return (
              <SwipeCard key={`conv-${project.id || project.slug}`} actions={[
                { label: pinned ? 'Unpin' : 'Pin', bg: pinned ? C.s2 : 'rgba(16,185,129,0.2)', color: C.accent,
                  icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={pinned ? C.accent : 'none'} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                  onAction: () => toggleFav('project', project.slug) },
                { label: 'Archive', bg: 'rgba(239,68,68,0.15)', color: C.red,
                  icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={2} strokeLinecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
                  onAction: () => {} },
              ]}>
                <div
                  onClick={(e) => {
                    if (e.target.closest('[data-kebab]')) return
                    setInlineProject(project); setMessages([]); setSelectedAgent(null); onSelectProject?.(project)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '12px 14px',
                    borderRadius: 14,
                    background: C.s1,
                    border: `1px solid ${C.border}`,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 200ms ease',
                    position: 'relative', overflow: 'visible',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setCustomizeTarget({ agent: { ...project, slug: project.slug, name: project.name, color: pColor }, type: 'project-menu', x: e.clientX, y: e.clientY })
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                    border: `1px solid ${pColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: pColor, boxShadow: `0 0 8px ${pColor}55` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                      <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {pPreview?.timestamp ? formatChatTime(pPreview.timestamp) : ''}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 12, color: C.muted, marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {pPreview?.text || 'No messages yet'}
                    </div>
                  </div>
                  {/* Kebab menu for project */}
                  <button
                    data-kebab
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = e.currentTarget.getBoundingClientRect()
                      setCustomizeTarget({ agent: { ...project, slug: project.slug, name: project.name, color: pColor }, type: 'project-menu', x: rect.left - 100, y: rect.bottom + 4 })
                    }}
                    style={{
                      width: 24, height: 28, flexShrink: 0,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0.5, transition: 'opacity 0.15s',
                      padding: 0, WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.5' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={C.muted}>
                      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                </div>
              </SwipeCard>
            )
          })
        )
        })()}

        {/* Agent context menu (conversation list) */}
        {customizeTarget?.type === 'menu' && (
          <div
            onClick={() => setCustomizeTarget(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: customizeTarget.y,
                left: Math.max(8, Math.min(customizeTarget.x, window.innerWidth - 180)),
                background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 10,
                padding: 4, zIndex: 99999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160,
              }}
            >
              {[
                { label: 'Open chat', action: () => { setCustomizeTarget(null); setSelectedAgent(customizeTarget.agent); onSelectAgent?.(customizeTarget.agent) } },
                { label: isFav('agent', customizeTarget.agent?.slug) ? 'Unpin' : 'Pin to top', action: () => { setCustomizeTarget(null); toggleFav('agent', customizeTarget.agent.slug) } },
                { label: isMuted(customizeTarget.agent?.slug) ? 'Unmute' : 'Mute', action: () => { setCustomizeTarget(null); toggleMute(customizeTarget.agent.slug) } },
                null,
                { label: 'Change color', action: () => { setCustomizeTarget({ ...customizeTarget, type: 'color' }) } },
                null,
                { label: 'Archive', action: () => { setCustomizeTarget(null); toggleHidden(customizeTarget.agent.slug) } },
              ].map((item, idx) => !item ? (
                <div key={`d${idx}`} style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />
              ) : (
                <button key={item.label} onClick={item.action} style={{
                  display: 'flex', alignItems: 'center', width: '100%', padding: '7px 10px',
                  background: 'transparent', border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: C.text2, fontFamily: "'Inter', sans-serif", textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >{item.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Project context menu (conversation list) */}
        {customizeTarget?.type === 'project-menu' && (
          <div
            onClick={() => setCustomizeTarget(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: customizeTarget.y,
                left: Math.max(8, Math.min(customizeTarget.x, window.innerWidth - 180)),
                background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 10,
                padding: 4, zIndex: 99999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160,
              }}
            >
              {[
                { label: isFav('project', customizeTarget.agent?.slug) ? 'Unpin' : 'Pin to top', action: () => { setCustomizeTarget(null); toggleFav('project', customizeTarget.agent.slug) } },
                { label: 'Settings', action: () => { const p = customizeTarget.agent; setCustomizeTarget(null); setInlineProject(p); setMessages([]); setSelectedAgent(null); onSelectProject?.(p); setTimeout(() => setSettingsOpen(true), 200) } },
                null,
                { label: 'Change color', action: () => { setCustomizeTarget({ ...customizeTarget, type: 'color' }) } },
                null,
                { label: 'Archive', action: () => setCustomizeTarget(null) },
              ].map((item, idx) => !item ? (
                <div key={`pd${idx}`} style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />
              ) : (
                <button key={item.label} onClick={item.action} style={{
                  display: 'flex', alignItems: 'center', width: '100%', padding: '7px 10px',
                  background: 'transparent', border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: C.text2, fontFamily: "'Inter', sans-serif", textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >{item.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Color picker (conversation list) */}
        {customizeTarget?.type === 'color' && (
          <div
            onClick={() => setCustomizeTarget(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 99999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{
              background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 14,
              padding: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', width: 260,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14, fontFamily: "'Inter', sans-serif" }}>
                Pick color for {customizeTarget.agent?.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['#10B981', '#EAB308', '#A78BFA', '#F472B6', '#60A5FA', '#FB923C', '#22C55E', '#EF4444', '#E91E90', '#3B82F6', '#2DD4BF', '#F59E0B'].map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      fetch('/api/dashboard/agent-customize', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slug: customizeTarget.agent.slug, client_id: worldId, color: c }),
                      }).then(() => window.location.reload()).catch(() => {})
                      setCustomizeTarget(null)
                    }}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: c, border: '2px solid transparent',
                      cursor: 'pointer', transition: 'transform 0.1s, border-color 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Thread view ──────────────────────────────────────────────────────────────

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Thread header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,14,28,0.95)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => {
            if (isVoiceActive) {
              setVoiceMinimized(true)
              voiceMinimizedAgent.current = { type: 'agent', data: selectedAgent }
              setSelectedAgent(null); setMessages([]); onBack?.()
            } else {
              setSelectedAgent(null); setMessages([]); setIsVoiceActive(false); onBack?.()
            }
          }}
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#A0A0A0', fontSize: 18, lineHeight: 1,
          }}
        >
          &#x2190;
        </button>
        {/* Circle avatar with agent initial */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          backgroundColor: selectedAgent.color || '#3B9EFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1 }}>
            {(selectedAgent.name || '?')[0].toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 14, fontWeight: 'bold', color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'block',
          }}>{selectedAgent.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span style={{
              backgroundColor: 'green', borderRadius: '50%',
              width: 8, height: 8, display: 'inline-block', flexShrink: 0, verticalAlign: 'middle',
            }} />
            <span style={{ fontSize: 11, color: C.muted, lineHeight: 1 }}>Online</span>
          </div>
        </div>
        {/* Telephone button in header -- long-form recording mode */}
        <button
          onClick={handleMicToggle}
          title={isRecording ? 'Stop recording' : 'Record voice message'}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
            border: isRecording ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isRecording ? '#EF4444' : C.muted,
            transition: 'all 0.15s',
          }}
        >
          {isRecording ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          )}
        </button>
        {/* Settings button */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            title="Settings"
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: settingsOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden VoiceChat for audio logic -- mounts when voice is active */}
      {isVoiceActive && (
        <div style={{ display: 'none' }}>
          <VoiceChat
            ref={voiceChatRef}
            agentSlug={selectedAgent.slug}
            agentColor={selectedAgent.color}
            clientId={worldId}
            autoStart={true}
            initialVoice={currentVoice}
            onVoiceChange={selectVoice}
            onTranscript={(text, role) => {
              setVoiceTranscriptText(text)
              const msgRole = role === 'model' ? 'agent' : 'user'
              const tempId = `voice-${role}-${Date.now()}`
              setMessages(prev => [...prev, {
                id: tempId,
                role: msgRole,
                agent: selectedAgent.slug,
                text,
                timestamp: new Date().toISOString(),
                source: 'voice',
              }])
              // Persist voice transcript to DB
              fetch('/api/dashboard/supabase-messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  agent: selectedAgent.slug,
                  text,
                  role: msgRole,
                  source: 'voice',
                  client_id: worldId,
                  ...(msgRole === 'user' ? userIdentity : {}),
                }),
              }).then(r => r.json()).then(data => {
                if (data?.message?.id) {
                  setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message } : m))
                }
              }).catch(() => {})
            }}
            onStatusChange={(s) => {
              setVoiceStatus(s)
              if (s === 'idle') {
                setIsVoiceActive(false)
                setVoiceMuted(false)
                setVoiceTranscriptText('')
                // Voice session ended -- ask agent to summarize and create follow-ups
                const voiceMsgs = messagesRef.current?.filter(m => m.source === 'voice') || []
                if (voiceMsgs.length >= 4) {
                  setTimeout(() => {
                    sendAgentText('[Voice conversation just ended] Review our voice conversation above. Post a brief summary of what we discussed and any decisions made. If there are action items or tasks that should be created, create them now. Do not ask for permission -- just summarize and queue any tasks that came up.')
                  }, 1500)
                }
              }
            }}
            onVolumeChange={setVoiceVolume}
          />
        </div>
      )}

      {/* Messages scroll area -- always visible */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>

        {loadingMsgs && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>
          </div>
        )}

        {!loadingMsgs && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingTop: 60,
          }}>
            <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={44} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
              {selectedAgent.name}
            </span>
            <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
          </div>
        )}

        {messages.map(msg => {
          const isUser = msg.role === 'user'
          const agSenderName = msg.user_name || (isUser ? displayName : null)
          const agSenderInitial = agSenderName ? agSenderName[0].toUpperCase() : 'U'
          const agIsOtherUser = isUser && msg.user_name && msg.user_name !== displayName
          const agSenderColor = isUser ? (agIsOtherUser ? '#7C3AED' : '#2563EB') : selectedAgent?.color || '#3B82F6'
          const agProfile = msg.user_id ? (msg.user_id === currentUser?.id ? { avatar_url: currentUser?.user_metadata?.avatar_url } : userProfiles[msg.user_id]) : null
          const agAvatar = agProfile?.avatar_url || null

          // Checkpoint: agent needs human input (amber card)
          if (msg.source === 'checkpoint') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '85%', minWidth: 200,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Needs Input
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // Inline task card for task-runner lifecycle notifications
          if (msg.source === 'task-runner') {
            const qaMatch = msg.text?.match(/QA:\s*(\d+(?:\.\d+)?)/i)
            const qaScore = qaMatch ? parseFloat(qaMatch[1]) : null
            const isFailed = /fail/i.test(msg.text || '')
            const isStarted = /^task started/i.test(msg.text || '')
            // Extract clean title: first non-empty line
            const taskLines = (msg.text || '').split('\n').filter(l => l.trim())
            const rawTitle = taskLines[0] || ''
            const taskTitle = rawTitle.replace(/^(task\s+(started|complete[d]?|failed|done)[:\s]*)/i, '').trim() || rawTitle
            const taskDesc = taskLines.slice(1).join(' ').trim()
            const headColor = isFailed ? C.red : isStarted ? C.blue : C.accent
            const headBg = isStarted ? 'rgba(96,165,250,0.08)' : C.accentBg
            const headIcon = isFailed ? '!' : isStarted ? '▶' : '✓'
            const headLabel = isFailed ? 'Task Failed' : isStarted ? 'Task Started' : 'Task Complete'
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: C.s1,
                  border: '1px solid ' + C.border,
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '88%',
                }}>
                  {/* mt-head */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 6,
                      background: headBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: headColor, fontWeight: 800,
                    }}>{headIcon}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: headColor,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{headLabel}</span>
                  </div>
                  {/* mt-title */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{taskTitle}</div>
                  {/* mt-desc */}
                  {taskDesc && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{taskDesc}</div>
                  )}
                  {/* mt-foot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {qaScore !== null ? (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: qaScore >= 8 ? 'rgba(34,197,94,0.12)' : qaScore >= 5 ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)',
                        color: qaScore >= 8 ? C.green : qaScore >= 5 ? C.yellow : C.red,
                      }}>QA {qaScore}/10</span>
                    ) : (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: isFailed ? 'rgba(239,68,68,0.12)' : isStarted ? 'rgba(96,165,250,0.12)' : 'rgba(34,197,94,0.12)',
                        color: isFailed ? C.red : isStarted ? C.blue : C.green,
                      }}>{isFailed ? 'Failed' : isStarted ? 'Building' : 'Done'}</span>
                    )}
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>
                      {msg.agent || selectedAgent?.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(80,100,128,0.55)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // Inline task card for task-created notifications (rex announcing a new task)
          if (
            msg.source === 'gemini-chat' &&
            msg.agent === 'rex' &&
            msg.text?.toLowerCase().includes('task created')
          ) {
            const textLines = (msg.text || '').split('\n').filter(l => l.trim())
            const firstLine = textLines[0] || ''
            const titleMatch = firstLine.match(/task created[:\s]+(.+)/i)
            const taskTitle = (titleMatch ? titleMatch[1].trim() : firstLine.replace(/task created/i, '').trim()) || 'New Task'
            const taskDesc = textLines.slice(1).join(' ').trim()
            const agentMatch = msg.text?.match(/(?:assigned to|for agent|agent[:\s]+)\s*([A-Za-z]+)/i)
            const taskAgent = agentMatch ? agentMatch[1] : (selectedAgent?.name || '')
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: C.s1,
                  border: '1px solid ' + C.border,
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '88%',
                }}>
                  {/* mt-head */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 6,
                      background: C.accentBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: C.accent, fontWeight: 800,
                    }}>+</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: C.accent,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>Task Created</span>
                  </div>
                  {/* mt-title */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{taskTitle}</div>
                  {/* mt-desc */}
                  {taskDesc && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{taskDesc}</div>
                  )}
                  {/* mt-foot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(234,179,8,0.12)',
                      color: C.yellow,
                    }}>Queued</span>
                    {taskAgent && (
                      <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{taskAgent}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(80,100,128,0.55)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 10,
                marginBottom: isUser ? 4 : 12,
              }}
            >
              {!isUser && (
                <div style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                  <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={28} />
                </div>
              )}
              <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
                {/* Text bubble -- hidden when text is only the attachment label */}
                {msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: ')) && (
                  <div style={{
                    padding: isUser ? '10px 16px' : '2px 0',
                    borderRadius: isUser ? '18px 18px 4px 18px' : 0,
                    fontSize: 14, lineHeight: 1.6,
                    color: isUser ? '#fff' : '#E2E8F0',
                    background: isUser ? agSenderColor : 'transparent',
                    border: 'none',
                    wordBreak: 'break-word',
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '-0.01em',
                    ...(isUser ? { whiteSpace: 'pre-wrap' } : {}),
                  }}>
                    {isUser
                      ? <LinkifyText text={msg.text} />
                      : <ChatMessageRenderer content={msg.text} style={{ fontSize: 14, lineHeight: 1.6, color: '#E2E8F0' }} />
                    }
                  </div>
                )}
                {isUser && msg.user_name && msg.user_name !== displayName && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', textAlign: 'right', marginBottom: 3, marginTop: -2, fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' }}>
                    {msg.user_name}
                  </div>
                )}
                {/* Attachments -- rendered outside bubble using Steffen's styles */}
                {(() => {
                  const atts = (msg.attachments && msg.attachments.length)
                    ? msg.attachments
                    : msg.attachment_url
                      ? [{
                          url: msg.attachment_url,
                          mime: msg.file_mime_type,
                          size: msg.file_size,
                          name: msg.text && msg.text.startsWith('Attached file: ')
                            ? msg.text.replace('Attached file: ', '')
                            : msg.file_name || null,
                        }]
                      : []
                  if (!atts.length) return null
                  const hasText = msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: '))
                  const isMulti = atts.length > 1
                  const items = atts.map((att, idx) => {
                    const isImage = att.mime && att.mime.startsWith('image/')
                    if (isImage) {
                      return (
                        <div
                          key={idx}
                          style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            borderRadius: 16,
                            overflow: 'hidden',
                            maxWidth: '70%',
                            cursor: 'pointer',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          <img src={att.url} alt="" style={{ width: '100%', display: 'block', borderRadius: 16 }} />
                        </div>
                      )
                    }
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          background: C.s2,
                          border: '1px solid ' + C.border,
                          borderRadius: 14,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          maxWidth: '75%',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: C.accentBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          color: C.accent,
                          fontSize: 11, fontWeight: 800,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {att.name ? att.name.split('.').pop().toUpperCase().slice(0, 4) : 'FILE'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {att.name || 'Attached file'}
                          </div>
                          {att.size != null && (
                            <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {att.size < 1024 * 1024
                                ? `${Math.round(att.size / 1024)} KB`
                                : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                  if (isMulti) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, padding: '6px 16px', marginTop: hasText ? 6 : 0 }}>
                        {items}
                      </div>
                    )
                  }
                  return <div style={{ marginTop: hasText ? 6 : 0 }}>{items}</div>
                })()}
                <div style={{
                  fontSize: 11, color: 'rgba(120,140,165,0.5)',
                  marginTop: 4,
                  textAlign: isUser ? 'right' : 'left',
                  paddingRight: isUser ? 2 : 0,
                  paddingLeft: isUser ? 0 : 2,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {formatChatTime(msg.timestamp)}
                </div>
              </div>
              {isUser && (
                <div title={agSenderName || 'User'} style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: agAvatar ? 'transparent' : agSenderColor,
                  border: agAvatar ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {agAvatar
                    ? <img src={agAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{agSenderInitial}</span>
                  }
                </div>
              )}
            </div>
          )
        })}
        {sending && (
          <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
            <TypingIndicatorV2
              streaming={true}
              agentColor={selectedAgent?.color || '#3B82F6'}
              agentName={selectedAgent?.name}
              agentSlug={selectedAgent?.slug}
              compact={false}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice mode UI -- replaces input bar when voice is active */}
      {isVoiceActive && (
        <div style={{
          padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          background: C.bg2,
          borderTop: '1px solid ' + C.border,
          flexShrink: 0,
        }}>
          <style>{`
            @keyframes vw { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
            @keyframes recblink { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
          `}</style>
          {/* Waveform bars */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 3, height: 40, marginBottom: 8,
          }}>
            {[
              { h: 14, d: '0s' }, { h: 26, d: '.08s' }, { h: 38, d: '.16s' },
              { h: 30, d: '.24s' }, { h: 18, d: '.32s' }, { h: 34, d: '.12s' },
              { h: 22, d: '.20s' }, { h: 40, d: '.28s' }, { h: 16, d: '.36s' },
            ].map((bar, i) => (
              <div key={i} style={{
                width: 3, height: bar.h, borderRadius: 2,
                background: C.accent,
                animation: `vw 1s ease-in-out ${bar.d} infinite`,
              }} />
            ))}
          </div>
          {/* Status */}
          <div style={{
            textAlign: 'center', fontSize: 12, fontWeight: 600,
            color: C.accent, fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 4,
          }}>
            {voiceStatus === 'connecting' ? 'Connecting...'
              : voiceStatus === 'speaking' ? 'Speaking...'
              : voiceStatus === 'error' ? 'Error'
              : 'Listening...'}
          </div>
          {/* Transcript */}
          <div style={{
            fontSize: 13, color: C.text2, textAlign: 'center',
            minHeight: 18, padding: '0 20px',
          }}>
            {voiceTranscriptText ? `"${voiceTranscriptText}"` : ''}
          </div>
          {/* Buttons */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10,
          }}>
            {/* Mute */}
            <button
              onClick={() => {
                voiceChatRef.current?.toggleMute()
                setVoiceMuted(v => !v)
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: '1px solid ' + C.border,
                background: voiceMuted ? 'rgba(239,68,68,0.15)' : C.s2,
                color: voiceMuted ? '#F87171' : C.muted,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
              }}
            >
              M
            </button>
            {/* End */}
            <button
              onClick={() => {
                voiceChatRef.current?.stop()
                setIsVoiceActive(false)
                setVoiceMuted(false)
                setVoiceTranscriptText('')
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: C.red, color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
              }}
            >
              &#x00D7;
            </button>
          </div>
        </div>
      )}

      {/* Recording status bar (agent chat) */}
      {(isRecording || isTranscribing) && (
        <div style={{
          flexShrink: 0, padding: '8px 16px',
          background: 'rgba(239,68,68,0.06)',
          borderTop: '1px solid rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: isTranscribing ? '#F59E0B' : '#EF4444',
            animation: isTranscribing ? 'none' : 'recDot 1s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 500 }}>
            {isTranscribing ? 'Transcribing...' : `Recording ${Math.floor(recordingElapsed / 60)}:${String(recordingElapsed % 60).padStart(2, '0')}`}
          </span>
          {isRecording && (
            <button onClick={handleMicToggle} style={{
              marginLeft: 'auto', fontSize: 12, fontWeight: 600,
              color: '#EF4444', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
              padding: '4px 10px', cursor: 'pointer',
            }}>Stop</button>
          )}
          {micError && <span style={{ fontSize: 12, color: '#F87171', marginLeft: 'auto' }}>{micError}</span>}
        </div>
      )}
      {/* Input area -- CV3 pill design, hidden when voice is active */}
      {!isVoiceActive && <div style={{
        flexShrink: 0,
        padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: '1px solid ' + C.border,
      }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          onChange={handleFileSelection}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: C.s1,
          border: '1.5px solid ' + (chatInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 16px',
          maxWidth: 560,
          margin: '0 auto',
          boxShadow: chatInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setChatInputFocused(true)}
            onBlur={() => setChatInputFocused(false)}
            placeholder={`Message ${selectedAgent.name}...`}
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
          {/* Action buttons inside pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Attach */}
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
            {/* Commands */}
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
          </div>
          {/* Mic button (hidden when text present) -- triggers Gemini Live voice chat */}
          {!input.trim() && (
            <button
              title={isVoiceActive ? 'End voice' : 'Start voice'}
              onClick={() => {
                if (isVoiceActive) {
                  voiceChatRef.current?.stop()
                  setIsVoiceActive(false)
                  setVoiceMuted(false)
                  setVoiceTranscriptText('')
                } else {
                  setIsVoiceActive(true)
                }
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: isVoiceActive ? 'rgba(16,185,129,0.15)' : C.accent,
                border: isVoiceActive ? '2px solid rgba(16,185,129,0.4)' : 'none',
                color: isVoiceActive ? C.accent : '#000', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.15s, background 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
          )}
          {/* Send button (shown when text present) */}
          {input.trim() && (
            <button
              title="Send"
              onClick={handleSend}
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
      </div>}

      {/* Chat settings full-screen overlay */}
      {settingsOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
          }}
        >
          {/* Left pane */}
          <div style={{
            width: 220,
            flexShrink: 0,
            background: C.bg2,
            borderRight: '1px solid ' + C.border2,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid ' + C.border }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>Settings</span>
            </div>
            <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {['General', 'Voice', 'Google', 'Keys'].map(item => (
                <button
                  key={item}
                  onClick={() => setSettingsTab(item)}
                  style={{
                    padding: '7px 12px', fontSize: 13,
                    color: settingsTab === item ? C.text : C.text2,
                    fontFamily: "'Inter', sans-serif", borderRadius: 6,
                    background: settingsTab === item ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >{item}</button>
              ))}
            </div>
          </div>
          {/* Right pane */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.s1, overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid ' + C.border,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                {settingsTab}
              </span>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  width: 28, height: 28,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid ' + C.border,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.text2,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {/* Modal body */}
            <div style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              overflowY: 'auto',
              flex: 1,
            }}>
              {/* Room rename */}
              {settingsTab === 'General' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Room Name
                </div>
                <input
                  value={chatNameInput}
                  onChange={e => setChatNameInput(e.target.value)}
                  onBlur={e => saveRoomName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { saveRoomName(e.target.value); e.target.blur() } }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '8px 12px',
                    color: C.text, fontSize: 13,
                    fontFamily: "'Inter', sans-serif", outline: 'none',
                  }}
                />
              </div>
              )}
              {/* Voice selection */}
              {settingsTab === 'Voice' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Voice
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {VOICE_OPTIONS.map(({ id, label, desc }) => (
                    <button
                      key={id}
                      onClick={() => selectVoice(id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                        background: currentVoice === id ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${currentVoice === id ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: currentVoice === id ? '#60A5FA' : C.text, fontFamily: "'Inter', sans-serif" }}>{label}</div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 1, fontFamily: "'Inter', sans-serif" }}>{desc}</div>
                      </div>
                      {currentVoice === id && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              )}
              {/* Google Integration */}
              {settingsTab === 'Google' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Google Integration
                </div>
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  marginBottom: 10,
                }}>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                    Connect Google Calendar and Gmail so agents can schedule events and send emails on behalf of this world.
                  </div>
                </div>
                <a
                  href={`/api/google-oauth/authorize?world_id=${encodeURIComponent(worldId)}&scope=both`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '9px 0',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    color: '#fff',
                    background: 'rgba(66,133,244,0.85)',
                    border: '1px solid rgba(66,133,244,0.5)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                    transition: 'background 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Connect Google Calendar + Gmail
                </a>
              </div>
              )}
              {/* Keys (env_vars keychain) */}
              {settingsTab === 'Keys' && (
              <div style={{ padding: '4px 0 8px' }}>
                {/* Main "KEYS" heading */}
                <div style={{
                  fontSize: TYPE.xl, fontWeight: 700, color: C.text,
                  fontFamily: "'Inter', sans-serif",
                  textTransform: 'uppercase', letterSpacing: LS.caps,
                  lineHeight: LH.tight,
                  marginBottom: 20,
                }}>
                  {selectedProject ? 'Keys' : 'My Keys'}
                </div>
                {envKeysLoading ? (
                  <div style={{ fontSize: TYPE.base, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: LH.body }}>Loading...</div>
                ) : (
                  <>
                    {envKeys.user.length > 0 && (
                      <div style={{ marginBottom: selectedProject ? 20 : 0 }}>
                        {selectedProject && (
                          <div style={{
                            fontSize: TYPE.sm, fontWeight: 600, color: C.muted,
                            fontFamily: "'Inter', sans-serif",
                            textTransform: 'uppercase', letterSpacing: LS.wide,
                            lineHeight: LH.tight,
                            marginBottom: 8,
                          }}>Personal</div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {envKeys.user.map(k => (
                            <div key={k.key} style={{
                              display: 'flex', flexDirection: 'column', gap: 8,
                              padding: '10px 12px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                            }}>
                              <label style={{
                                fontSize: TYPE.xs, fontWeight: 600, color: C.muted,
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                textTransform: 'uppercase', letterSpacing: LS.wide,
                                lineHeight: LH.tight,
                              }}>{k.key}</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="password"
                                  placeholder="Enter new value to update"
                                  style={{
                                    flex: 1, padding: '6px 10px', fontSize: TYPE.sm,
                                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                                    color: C.text, lineHeight: LH.body,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 6, outline: 'none',
                                  }}
                                />
                                <button onClick={() => deleteEnvKey('user', k.key)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#F87171', fontSize: TYPE.sm, fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: '5px 10px', flexShrink: 0 }}>Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedProject && envKeys.project.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{
                          fontSize: TYPE.sm, fontWeight: 600, color: C.muted,
                          fontFamily: "'Inter', sans-serif",
                          textTransform: 'uppercase', letterSpacing: LS.wide,
                          lineHeight: LH.tight,
                          marginBottom: 8,
                        }}>Project</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {envKeys.project.map(k => (
                            <div key={k.key} style={{
                              display: 'flex', flexDirection: 'column', gap: 8,
                              padding: '10px 12px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                            }}>
                              <label style={{
                                fontSize: TYPE.xs, fontWeight: 600, color: C.muted,
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                textTransform: 'uppercase', letterSpacing: LS.wide,
                                lineHeight: LH.tight,
                              }}>{k.key}</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="password"
                                  placeholder="Enter new value to update"
                                  style={{
                                    flex: 1, padding: '6px 10px', fontSize: TYPE.sm,
                                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                                    color: C.text, lineHeight: LH.body,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 6, outline: 'none',
                                  }}
                                />
                                <button onClick={() => deleteEnvKey('project', k.key)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#F87171', fontSize: TYPE.sm, fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: '5px 10px', flexShrink: 0 }}>Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {envKeys.user.length === 0 && envKeys.project.length === 0 && (
                      <div style={{ fontSize: TYPE.base, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: LH.body, marginBottom: 16 }}>No keys configured yet</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                      {selectedProject && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['user', 'project'].map(s => (
                            <button key={s} onClick={() => setNewKeyScope(s)} style={{
                              flex: 1, padding: '7px 0', fontSize: TYPE.sm, fontWeight: newKeyScope === s ? 700 : 500,
                              fontFamily: "'Inter', sans-serif",
                              color: newKeyScope === s ? '#fff' : C.muted,
                              background: newKeyScope === s ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${newKeyScope === s ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 6, cursor: 'pointer', textTransform: 'capitalize',
                            }}>{s}</button>
                          ))}
                        </div>
                      )}
                      <input value={newKeyName} onChange={e => { setNewKeyName(e.target.value); setKeySaveMsg(null) }} placeholder="Key name (e.g. GMAIL_API_KEY)" style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: TYPE.sm,
                        fontFamily: "'SF Mono', 'Fira Code', monospace", color: C.text, lineHeight: LH.body,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, outline: 'none',
                      }} />
                      <input type="password" value={newKeyValue} onChange={e => { setNewKeyValue(e.target.value); setKeySaveMsg(null) }} placeholder="Value" style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: TYPE.sm,
                        fontFamily: "'SF Mono', 'Fira Code', monospace", color: C.text, lineHeight: LH.body,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, outline: 'none',
                      }} />
                      <button disabled={!newKeyName.trim() || !newKeyValue.trim()} onClick={saveEnvKey} style={{
                        padding: '8px 0', fontSize: TYPE.sm, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                        color: '#fff', lineHeight: LH.tight,
                        background: (!newKeyName.trim() || !newKeyValue.trim()) ? C.muted : C.accent,
                        border: 'none', borderRadius: 8, cursor: (!newKeyName.trim() || !newKeyValue.trim()) ? 'default' : 'pointer',
                      }}>Save Key</button>
                      {keySaveMsg && (
                        <div style={{ fontSize: TYPE.xs, fontFamily: "'Inter', sans-serif", lineHeight: LH.body, color: keySaveMsg.type === 'ok' ? C.accent : '#F87171' }}>{keySaveMsg.text}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
