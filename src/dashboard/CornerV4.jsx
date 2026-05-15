// CornerV4.jsx -- WD-40 redesign playground at /cv4
// Route: /cv4
//
// R5 reset (2026-05-13): /cv4 went back to a 1:1 mirror of CornerV3.jsx
// (the a9209e9 baseline), then R5.1 Phases A-H layered targeted CV4-only
// simplifications on top: slim top bar, second-row ContextNav, killed
// the third-row ThreadHeader, hoisted Commands out of the pill as a
// purple sparkles menu, left drawer for projects/agents/account.
//
// CV3 stays sacred at /dashboard. All CV4 cuts are gated by either the
// [data-shell="cv4"] CSS scope on this root or a path check
// (window.location.pathname.startsWith('/cv4')) inside shared cv3/
// components. Shared cv3/ trees are imported verbatim so voice + chain
// animations stay in lockstep with V3.
//
// Mission: corner/users/aom/missions/aom-website/
// Plan: corner/users/aom/missions/aom-website/research/2026-05-12-cv4-wd40-redesign-plan.md

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import skillsData from '../data/skills.json'
import { supabase } from './lib/supabase.js'
import {
  getClientId,
  setClientIdFromUser,
  setWorldOverride,
  getUserWorld,
} from './lib/clientConfig.js'
import { authFetch } from './lib/authFetch.js'
import { useTasks } from './hooks/useTasks'
import { useDataPipe } from './hooks/useDataPipe'
import { useCurrentUserSlug } from './hooks/useCurrentUserSlug'
import useTelephone from './hooks/useTelephone'
import { useThemeMode } from './hooks/useThemeMode.js'
import { C } from './lib/cv3Colors.js'
import { AomLogo } from './components/cv3/icons.jsx'
import { Badge, Tab, BellIcon } from './components/cv3/shared.jsx'
import { HomeIcon, TasksIcon, ChatIcon } from './components/cv3/icons.jsx'
import UserAvatar from './components/cv3/UserAvatar.jsx'
import TasksPanel from './components/cv3/TasksPanel.jsx'
import ChatPanel from './components/cv3/ChatPanel.jsx'
import WorldSelector from './components/WorldSelector.jsx'
import {
  CornerAuthProvider,
  CornerDataProvider,
  CornerNavProvider,
} from './CornerContext.jsx'
import { LiveCallProvider } from './providers/LiveCallProvider.jsx'
import GlobalCallButton from './components/cv3/voice/GlobalCallButton.jsx'
import FloatingCallBar from './components/cv3/voice/FloatingCallBar.jsx'
import NotificationsPanel from './components/cv3/NotificationsPanel.jsx'
import PhoneRecordingOverlay from './components/cv3/phone-recording/PhoneRecordingOverlay.jsx'
import CV4Drawer from './cv4/Drawer.jsx'
import CV4ContextNav from './cv4/ContextNav.jsx'
import TasksPanelCv4 from './cv4/TasksPanelCv4.jsx'
import MailListPanel from './cv4/MailListPanel.jsx'
import MailRoom from './cv4/MailRoom.jsx'

// ── Main component ────────────────────────────────────────────────────────────

// ── Toast notification ────────────────────────────────────────────────────────

function TaskCompletionToast({ message, visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <>
      <style>{`@keyframes su{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <div style={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        background: C.s2,
        border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: 14,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'su 0.3s ease-out',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: C.green,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.text2,
          fontFamily: "'Inter', sans-serif",
        }}>{message}</span>
      </div>
    </>
  )
}

export default function CornerV4() {
  const navigate = useNavigate()
  const { projectId: routeProjectId } = useParams()
  const [currentUser, setCurrentUser]   = useState(null)
  const [authReady, setAuthReady]       = useState(false)
  const [worldId, setWorldId]           = useState(null)
  const [tab, setTab]                   = useState('chat')
  const [unreadChat, setUnreadChat]     = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [conversationTarget, setConversationTarget] = useState(null) // { name, type: 'agent'|'project' }
  const [prefillMessage, setPrefillMessage] = useState(null)
  // R6.2: mission clicked from the drawer is "attached" to the composer
  // and rendered as a context chip. Cleared on send by useChatSend.
  const [attachedMission, setAttachedMission] = useState(null)
  // CV4 Tools → Mail (corner:cv4-tools-mail R1): activeTool routes the
  // right rail to MailListPanel and recolors ContextNav as the "Mail Room".
  // selectedMail is the email the user just clicked — pinned as a chat chip
  // until the EA sends a reply or the user clears it.
  const [activeTool, setActiveTool] = useState(null)
  const [selectedMail, setSelectedMail] = useState(null)
  const [inputBarText, setInputBarText] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifReadAt, setNotifReadAt] = useState({})

  // R49 (2026-04-23): when setPrefillMessage is fired from TasksPanel
  // (new-project recipe), drop it into the home input bar and clear
  // the pending prefill so it doesn't fire twice.
  useEffect(() => {
    if (prefillMessage && tab === 'chat' && !selectedAgent && !conversationTarget) {
      setInputBarText(prefillMessage)
      setPrefillMessage(null)
    }
  }, [prefillMessage, tab, selectedAgent, conversationTarget])
  const [inputBarSending, setInputBarSending] = useState(false)
  const [inputBarFocused, setInputBarFocused] = useState(false)
  // Attach: stageFilesRef is set by ChatPanel to its useChatAttachments.stageFiles;
  // homeFileInputRef triggers the OS file picker from the home-tab toolbar.
  const stageFilesRef = useRef(null)
  const homeFileInputRef = useRef(null)
  const [showCommandsModal, setShowCommandsModal] = useState(false)
  // R6.6: docked sidebar on desktop. Drawer opens by default at >=1024px and
  // sits inline so chat messages feel anchored, not adrift in a centered void.
  // Below 1024px it falls back to the overlay slide-in.
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const [drawerOpen, setDrawerOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  // R7.1: Tasks panel lives in a right-side docked drawer on desktop. Open
  // by default; toggle button sits in the second-row nav's right slot.
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  // R8.0: theme is owned by `useThemeMode` (Arizona auto-seed + manual
  // override). `setTheme(...)` here is wired to the hook so the legacy
  // moon-toggle button keeps working and the CSS-vars repaint
  // (cv3Colors.js) responds.
  const { mode: theme, setTheme: setThemeHook } = useThemeMode()
  const setTheme = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(theme) : next
    setThemeHook(resolved)
  }, [theme, setThemeHook])
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-shell', 'cv4')
    return () => {
      try { document.documentElement.removeAttribute('data-shell') } catch (_) {}
    }
  }, [])
  const [toast, setToast] = useState({ visible: false, message: '' })
  const showToast = useCallback((message) => setToast({ visible: true, message }), [])
  const prevDoneIdsRef = useRef(null)

  useEffect(() => {
    console.log('CornerV4 mounted')
  }, [])

  // ── R7.16 Mobile world reset escape hatch ─────────────────────────────────
  // Visit /cv4?reset_world=1 on mobile to wipe both override stores and reload
  // into a fresh shell that resolves worldId from auth (Patrik → aom). Runs
  // synchronously before anything else mounts, so the next read of
  // getClientId() returns the auth-derived world.
  if (typeof window !== 'undefined') {
    try {
      const p = new URLSearchParams(window.location.search)
      if (p.has('reset_world')) {
        sessionStorage.removeItem('corner-world-override')
        localStorage.removeItem('corner-world-override-persist')
        p.delete('reset_world')
        const rest = p.toString()
        // Replace (not push) so back button doesn't loop the reset.
        window.location.replace(window.location.pathname + (rest ? `?${rest}` : ''))
      }
    } catch { /* ignore */ }
  }

  // ── Google OAuth callback toast ────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthStatus = params.get('google_oauth')
    if (oauthStatus === 'success') {
      setToast({ visible: true, message: 'Google Calendar + Gmail connected.' })
      params.delete('google_oauth')
      params.delete('world_id')
      const newSearch = params.toString()
      window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname)
    } else if (oauthStatus === 'denied') {
      setToast({ visible: true, message: 'Google authorization was cancelled.' })
      params.delete('google_oauth')
      params.delete('error')
      const newSearch = params.toString()
      window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname)
    }
  }, [])

  // User identity for multi-user message tracking (parent scope)
  const parentUserIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id])

  const { queued, rightNow, waiting, done, allTasks, refresh: refreshTasks, addOptimisticTask } = useTasks(worldId)

  // ── Toast: detect newly completed tasks ──────────────────────────────────────
  useEffect(() => {
    if (!done) return
    if (prevDoneIdsRef.current === null) {
      // Seed on first load -- no toast for already-done tasks
      prevDoneIdsRef.current = new Set(done.map(t => t.id))
      return
    }
    const newDone = done.filter(t => !prevDoneIdsRef.current.has(t.id))
    if (newDone.length > 0) {
      const task = newDone[0]
      const title = task.title || task.text || 'Task'
      const label = title.length > 45 ? title.slice(0, 45) + '...' : title
      const wasBuilt = task.qa_score != null && task.qa_score > 0
      setToast({ visible: true, message: `${label} ${wasBuilt ? 'shipped.' : 'done.'}` })
    }
    prevDoneIdsRef.current = new Set(done.map(t => t.id))
  }, [done])
  // R14e-4 (viewing-user model): the viewer's slug inside this tenant.
  // Resolved from `tenant_users.slug` keyed on auth.uid() + current worldId.
  // AOM tenant: Patrik → 'patrik', Ash → 'ash'. Future personal tenants:
  // each viewer gets their own slug in their own tenant_users row.
  const currentUserSlug = useCurrentUserSlug(currentUser, worldId)

  // useDataPipe provides agents, inboxItems, projectRooms (from agent_status),
  // and filters personal/non-personal tasks by the viewer's slug.
  const { agents, inboxItems, projectRooms, personalTodos } = useDataPipe(null, worldId, currentUserSlug)

  // R5.1 / R7.20: no more "home" view. First paint = chat with the system
  // EA (Elon for Patrik). Falls back to the world's EA flag, then to the
  // first agent. Skips auto-select if the user already has a conversation
  // in flight (e.g. landed on /cv4/project/:id).
  useEffect(() => {
    if (!agents || agents.length === 0) return
    if (selectedAgent || conversationTarget) return
    const target =
      agents.find(a => a.slug === 'elon')
      || agents.find(a => a.is_ea && a.is_terminal)
      || agents.find(a => a.is_ea)
      || agents[0]
    if (!target) return
    setSelectedAgent(target)
    setConversationTarget({ name: target.name, type: 'agent' })
  }, [agents, selectedAgent, conversationTarget])

  // Telephone mode (long-form record → transcribe → post to active super-agent).
  // Lives at this level so recording survives Home/Tasks/Chat navigation.
  const telephone = useTelephone({
    worldId,
    agents,
    selectedAgent,
    userIdentity: parentUserIdentity,
  })
  const [phoneOverlayOpen, setPhoneOverlayOpen] = useState(false)

  // Auto-close overlay 2 s after transcript dispatches, then toast.
  useEffect(() => {
    if (!telephone.lastTranscript || telephone.isRecording || telephone.isTranscribing) return
    showToast('Transcript sent.')
    const t = setTimeout(() => setPhoneOverlayOpen(false), 2000)
    return () => clearTimeout(t)
  }, [telephone.lastTranscript, telephone.isRecording, telephone.isTranscribing])

  // Notifications: filter inboxItems by per-agent read timestamps (session-only)
  const notifItems = useMemo(() => {
    return (inboxItems || []).filter(item =>
      item.agent && (!notifReadAt[item.agent] || item.timestamp > notifReadAt[item.agent])
    )
  }, [inboxItems, notifReadAt])

  const totalUnread = notifItems.length

  // tabRef keeps the realtime callback fresh without resubscribing on every tab change
  const tabRef = useRef(tab)

  // Active task count: queued + building/qa
  const activeTaskCount = (queued?.length || 0) + (rightNow?.length || 0)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured (local dev without env vars) -- allow through.
      setAuthReady(true)
      return
    }

    // getSession() reads from localStorage (near-instant) rather than making a network
    // request like getUser() does. This seeds currentUser before the first paint cycle.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null
      if (user) {
        setCurrentUser(user)
        setClientIdFromUser(user)
        setWorldId(getClientId())
      }
      setAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      // Only update state when the user identity actually changes.
      // Passing a function to setCurrentUser avoids re-renders on transient
      // events (TOKEN_REFRESHED, USER_UPDATED) where the user ID is the same.
      setCurrentUser(prev => {
        if (user?.id && user.id === prev?.id) return prev
        return user
      })
      if (user) {
        setClientIdFromUser(user)
        setWorldId(getClientId())
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Keep tabRef in sync so realtime callback always sees current tab without resubscribing
  useEffect(() => { tabRef.current = tab }, [tab])

  // ── Chat unread count (realtime) ──────────────────────────────────────────

  useEffect(() => {
    if (!supabase) return

    // Reset unread when switching worlds
    setUnreadChat(0)

    const channel = supabase
      .channel(`cornerv3-messages-${worldId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        () => {
          // Only increment unread if not currently on chat tab (reads tabRef to avoid resubscribe)
          setUnreadChat(prev => tabRef.current === 'chat' ? 0 : prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [worldId])

  // Clear unread when switching to chat; clear conversation only when tapping
  // Chat tab while already on chat (the "back to home" gesture). When returning
  // from Tasks, preserve the agent/project the user was in.
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab)
    if (newTab === 'chat') {
      setUnreadChat(0)
      if (tab === 'chat') {
        setSelectedAgent(null)
        setConversationTarget(null)
      }
    }
  }, [tab])

  // Select an agent and switch to chat tab
  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(agent)
    setConversationTarget({ name: agent.name, type: 'agent' })
    setTab('chat')
    setUnreadChat(0)
    if (agent?.slug) {
      setNotifReadAt(prev => ({ ...prev, [agent.slug]: new Date().toISOString() }))
    }
    // R7.21: Preserve the entry-point base path (/dashboard or /cv4) so the
    // URL bar doesn't snap from /dashboard → /cv4 when the user navigates.
    const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
    // Clear any project route so ChatPanel renders the agent thread (not project chat).
    if (routeProjectId) navigate(basePath)
  }, [navigate, routeProjectId])

  // Called by ChatPanel (and the CV4 drawer) when a project is selected.
  // Carries `slug` so the drawer's active highlight + Tasks-tab scoping can key on it.
  // Navigates to <basePath>/project/:slug so ChatPanel's useParams picks up
  // projectId → routes to ProjectChatView instead of the conversations list.
  const handleSelectProject = useCallback((project) => {
    setSelectedAgent(null)
    setConversationTarget({ name: project.name, slug: project.slug, type: 'project' })
    setTab('chat')
    setUnreadChat(0)
    if (project?.slug) {
      const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
      navigate(`${basePath}/project/${project.slug}`)
    }
  }, [navigate])

  // Mail tool: jump into the EA chat (the "Mail Room") and force the right
  // rail open with the inbox list. If we can't find an EA agent yet, the
  // toggle still flips — ChatPanel will land on whatever's selected and the
  // mail rail still works on its own.
  const handleSelectTool = useCallback((tool) => {
    setActiveTool(tool)
    setSelectedMail(null)
    if (tool === 'mail') {
      // Desktop: center column is always ChatPanel; right drawer shows mail list.
      // Mobile: center column is tab-controlled; 'tasks' tab shows mail list.
      setTab(isDesktop ? 'chat' : 'tasks')
      setTasksDrawerOpen(true)
      const ea = (agents || []).find(a => a.slug === 'elon')
        || (agents || []).find(a => a.is_ea && a.is_terminal)
        || (agents || []).find(a => a.is_ea)
      if (ea && ea.slug !== selectedAgent?.slug) {
        setSelectedAgent(ea)
        setConversationTarget({ name: ea.name, type: 'agent' })
        const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
        if (routeProjectId) navigate(basePath)
      }
    }
  }, [agents, selectedAgent?.slug, navigate, routeProjectId, isDesktop])

  // Called by MailListPanel when the user clicks an email — pins it as a
  // chat chip so the EA's next reply receives the email as context.
  const handleSelectMail = useCallback((email) => {
    console.log('[MailRoom] handleSelectMail fired', email?.id, email?.subject)
    setSelectedMail(email)
  }, [])

  const handleBackFromMailRoom = useCallback(() => {
    setSelectedMail(null)
  }, [])

  // Called by ChatPanel back button — clear conversation
  const handleBackFromConversation = useCallback(() => {
    setSelectedAgent(null)
    setConversationTarget(null)
    if (routeProjectId) {
      const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
      navigate(basePath)
    }
  }, [navigate, routeProjectId])

  // ── World switching ───────────────────────────────────────────────────────

  const handleEnterWorld = useCallback((world) => {
    setWorldOverride(world.world)
    setWorldId(world.world)
    fetch(`/api/worlds/${world.world}/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser?.id }),
    }).catch(() => {})
    setSelectedAgent(null)
    setConversationTarget(null)
    prevDoneIdsRef.current = null
  }, [currentUser?.id])

  const handleReturnToMyWorld = useCallback(() => {
    setWorldOverride(null)
    const myWorld = getUserWorld()
    setWorldId(myWorld)
    setSelectedAgent(null)
    setConversationTarget(null)
    prevDoneIdsRef.current = null
  }, [])

  // ── Input bar handlers ────────────────────────────────────────────────────

  const handleInputBarFocus = useCallback(() => {
    // If not already on chat view, open chat with last selected agent or rex
    if (tab !== 'chat') {
      const target = selectedAgent || agents?.find(a => a.slug === 'elon') || agents?.find(a => a.is_ea && a.is_terminal) || agents?.find(a => a.is_ea) || agents?.[0]
      if (target) {
        setSelectedAgent(target)
        setConversationTarget({ name: target.name, type: 'agent' })
      }
      setTab('chat')
      setUnreadChat(0)
    }
  }, [tab, selectedAgent, agents])

  const handleInputBarSend = useCallback(async () => {
    const text = inputBarText.trim()
    if (!text || inputBarSending) return

    // Ensure we have an agent to send to
    const target = selectedAgent || agents?.find(a => a.slug === 'elon') || agents?.find(a => a.is_ea && a.is_terminal) || agents?.find(a => a.is_ea) || agents?.[0]
    if (!target) return

    // Switch to chat tab if not already there
    if (tab !== 'chat') {
      setSelectedAgent(target)
      setConversationTarget({ name: target.name, type: 'agent' })
      setTab('chat')
      setUnreadChat(0)
    }

    setInputBarText('')
    setInputBarSending(true)

    // R5: dropped the parallel haiku-chat fetch. User message persists via
    // supabase-messages, listener routes to Elon's tmux, his reply arrives
    // via the cv3-thread realtime subscription in ChatPanel.
    try {
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: target.slug,
          text,
          role: 'user',
          source: 'corner-dashboard',
          client_id: worldId,
          ...parentUserIdentity,
        }),
      }).catch(() => null)
    } catch (e) {
      // silent fail -- message already persisted optimistically by ChatPanel
    } finally {
      setInputBarSending(false)
    }
  }, [inputBarText, inputBarSending, selectedAgent, agents, tab, worldId])

  // ── Nav heights ───────────────────────────────────────────────────────────

  const ROW1_H = 44
  const ROW2_H = 36
  const NAV_H  = ROW1_H + ROW2_H

  // ── Memoized provider values for CornerContext ───────────────────────────
  // Sliced by update cadence so consumers don't re-render on unrelated changes.
  // Auth: stable across the session (login + world switch). Data: realtime
  // pipes. Nav: per-click selection + composer prefill.
  //
  // R4d audit (2026-04-19): verified slices are truly independent. All
  // non-state deps are stable: showToast is useCallback([]), handle*/refresh*/
  // addOptimisticTask are useCallback, *Ref values are useRef. So auth value
  // identity only bumps on login/world switch, data only on pipe updates, nav
  // only on nav clicks / prefill. No cascades observed.
  const authValue = useMemo(() => ({
    currentUser, setCurrentUser,
    worldId,
    showToast,
  }), [currentUser, worldId, showToast])

  const dataValue = useMemo(() => ({
    agents, inboxItems, projectRooms,
    queued, rightNow, waiting, done, allTasks,
    refreshTasks, addOptimisticTask,
    currentUserSlug, personalTodos,
  }), [agents, inboxItems, projectRooms, queued, rightNow, waiting, done, allTasks, refreshTasks, addOptimisticTask, currentUserSlug, personalTodos])

  const navValue = useMemo(() => ({
    tab, setTab, handleTabChange,
    selectedAgent, conversationTarget,
    handleSelectAgent, handleSelectProject, handleBackFromConversation,
    prefillMessage, setPrefillMessage,
    attachedMission, setAttachedMission,
    activeTool, selectedMail, setSelectedMail,
    stageFilesRef,
  }), [tab, handleTabChange, selectedAgent, conversationTarget, handleSelectAgent, handleSelectProject, handleBackFromConversation, prefillMessage, attachedMission, activeTool, selectedMail, stageFilesRef])

  // ── Render ────────────────────────────────────────────────────────────────

  // Wait for auth to resolve AND world to be set before rendering
  // This prevents hooks from fetching with the wrong client_id (e.g. 'aom' default)
  if (!authReady || (!!supabase && !currentUser && typeof window !== 'undefined')) {
    return (
      <div style={{ width: '100%', height: '100dvh', background: '#060A14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <style>{`@keyframes cvLoaderBar { 0% { width: 0%; } 100% { width: 100%; } } @keyframes cvSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 32, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.03em', marginBottom: 32 }}>
          Corner<span style={{ color: '#10B981' }}>.</span>
        </div>
        <div style={{ width: 200, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: 2, animation: 'cvLoaderBar 2s ease-in-out infinite' }} />
        </div>
        <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Loading your workspace...</div>
      </div>
    )
  }

  return (
    <CornerAuthProvider value={authValue}>
      <CornerDataProvider value={dataValue}>
        <CornerNavProvider value={navValue}>
          <LiveCallProvider>
    <div data-testid="dashboard-home-root" data-shell="cv4" data-theme={theme} style={{
      width: '100%',
      // 100vh fallback; the @supports rule below upgrades to 100svh which
      // tracks the SMALL viewport (URL bar visible). 100dvh was overshooting
      // on iOS Safari and creating ~200px of empty space below the composer.
      height: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* R5.1 CV4 scoped styles. Everything keyed to [data-shell="cv4"] so the
          shared cv3/ components stay unchanged on /dashboard. */}
      <style>{`
        /* R6.5: viewport sizing — upgrade fallback 100vh to 100svh on browsers
           that support it. svh matches the smallest visible viewport (URL bar
           up) so the composer never gets pushed below the visible area on
           iOS Safari. dvh was overshooting and producing a ~200px bottom gap
           on tablet/mobile. */
        @supports (height: 100svh) {
          [data-shell="cv4"] { height: 100svh !important; }
        }
        [data-shell="cv4"] [data-role="composer-actions"] { order: -1; margin-right: 4px; }
        [data-shell="cv4"] [data-role="thread-header"] { display: none !important; }
        /* R7.18: Project chats were leaking the cv3 ProjectChatHeader on top of
           ContextNav. Hide it — ContextNav already shows the room name and
           switcher, and the action icons (mic, files, settings, search) move
           into the composer menus. */
        [data-shell="cv4"] [data-testid="project-chat-header"] { display: none !important; }
        /* R6.6: message typography — proper prose. Beats the inline 14px /
           lh 1.6 / #E2E8F0 styling that MessageList passes into
           ChatMessageRenderer's .cmr-content (inline → has to be !important).
           Targets every nested element so paragraph rhythm, list spacing,
           and color all read like long-form copy instead of SMS. */
        [data-shell="cv4"] [data-bubble],
        [data-shell="cv4"] [data-bubble] .chat-message-container,
        [data-shell="cv4"] [data-bubble] .cmr-content,
        [data-shell="cv4"] [data-bubble] .message-content {
          font-size: 15.5px !important;
          line-height: 1.72 !important;
          letter-spacing: 0.005em !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-weight: 400 !important;
        }
        [data-shell="cv4"] [data-bubble] { max-width: 64ch; }
        [data-shell="cv4"] [data-bubble="assistant"],
        [data-shell="cv4"] [data-bubble="assistant"] .cmr-content,
        [data-shell="cv4"] [data-bubble="assistant"] .message-content {
          color: #B6C2D1 !important;
        }
        [data-shell="cv4"] [data-bubble="user"],
        [data-shell="cv4"] [data-bubble="user"] .cmr-content,
        [data-shell="cv4"] [data-bubble="user"] .message-content {
          color: #DCE3ED !important;
        }
        /* Paragraph rhythm — generous bottom margin for prose, zero on tail. */
        [data-shell="cv4"] [data-bubble] .cmr-content p,
        [data-shell="cv4"] [data-bubble] .message-content p {
          margin: 0 0 0.95em 0 !important;
          line-height: 1.72 !important;
        }
        [data-shell="cv4"] [data-bubble] .cmr-content p:last-child,
        [data-shell="cv4"] [data-bubble] .message-content p:last-child { margin-bottom: 0 !important; }
        /* Lists — denser internally than prose so they don't feel airy,
           but with proper margin around the block. */
        [data-shell="cv4"] [data-bubble] .cmr-content ul,
        [data-shell="cv4"] [data-bubble] .cmr-content ol,
        [data-shell="cv4"] [data-bubble] .message-content ul,
        [data-shell="cv4"] [data-bubble] .message-content ol {
          margin: 0.3em 0 1em 0 !important;
          padding-left: 1.4em !important;
        }
        [data-shell="cv4"] [data-bubble] .cmr-content li,
        [data-shell="cv4"] [data-bubble] .message-content li {
          margin: 0 0 0.45em 0 !important;
          line-height: 1.6 !important;
        }
        /* Headings — quiet, not loud. Same weight, just larger + breathing. */
        [data-shell="cv4"] [data-bubble] .cmr-content h1,
        [data-shell="cv4"] [data-bubble] .cmr-content h2,
        [data-shell="cv4"] [data-bubble] .cmr-content h3,
        [data-shell="cv4"] [data-bubble] .message-content h1,
        [data-shell="cv4"] [data-bubble] .message-content h2,
        [data-shell="cv4"] [data-bubble] .message-content h3 {
          font-size: 1.06em !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          margin: 1.2em 0 0.4em 0 !important;
          letter-spacing: -0.005em !important;
          color: #D6DEEA !important;
        }
        /* Bold without being shouty. */
        [data-shell="cv4"] [data-bubble] .cmr-content strong,
        [data-shell="cv4"] [data-bubble] .message-content strong {
          font-weight: 600 !important;
          color: #D6DEEA !important;
        }
        /* Inline code: subtle chip, monospace. */
        [data-shell="cv4"] [data-bubble] .cmr-content code,
        [data-shell="cv4"] [data-bubble] .message-content code {
          font-size: 0.88em !important;
          padding: 1px 6px !important;
          background: rgba(255,255,255,0.045) !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
          border-radius: 4px !important;
          color: #CBD5E1 !important;
        }
        /* Links — calm blue, not Twitter-blue. */
        [data-shell="cv4"] [data-bubble] .cmr-content a,
        [data-shell="cv4"] [data-bubble] .message-content a {
          color: #7DD3FC !important;
          text-decoration-color: rgba(125,211,252,0.35) !important;
          text-underline-offset: 3px !important;
        }
        /* Hide bubble chrome a bit — the prose IS the thing. */
        [data-shell="cv4"] [data-bubble="assistant"] {
          background: transparent !important;
          padding-left: 0 !important;
        }

        /* ── R7.1: blend the drawers + chat into one continuous surface ────
           Soften the dividers between left drawer, chat, right tasks drawer
           so the eye reads them as one plane, not three separate boxes. */
        [data-shell="cv4"] [data-cv4-drawer-docked="true"] {
          border-right-color: rgba(255,255,255,0.04) !important;
        }
        [data-shell="cv4"] [data-cv4-tasks-drawer] {
          border-left-color: rgba(255,255,255,0.04) !important;
        }
        /* Chat column max-width handled inline via [data-cv4-content-inner]. */

        /* ── R7.2: scrollbar styling — thin, dim, only when scrolling. The
           chat scroll on the right edge was reading as distracting chrome. */
        [data-shell="cv4"] *::-webkit-scrollbar { width: 6px; height: 6px; }
        [data-shell="cv4"] *::-webkit-scrollbar-track { background: transparent; }
        [data-shell="cv4"] *::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 0;
        }
        [data-shell="cv4"] *::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
        [data-shell="cv4"] * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent; }

        /* ── R7.4: composer + chat area pick up the drawer aesthetic.
           Sharp 2px corners on the pill, hairline borders, square action
           buttons. The composer reads as a flat extension of the drawer
           palette instead of a rounded floating SMS pill. */
        [data-shell="cv4"] [data-testid="thread-chat-input"],
        [data-shell="cv4"] [data-testid="project-chat-input"] {
          font-family: 'Inter', sans-serif !important;
        }
        /* The pill = parent of the input + composer-actions row.
           Match by structure: any element that directly contains
           [data-role="composer-actions"] and has a borderRadius set. */
        [data-shell="cv4"] *:has(> [data-role="composer-actions"]) {
          border-radius: 2px !important;
          border-width: 1px !important;
          background: rgba(255,255,255,0.02) !important;
          border-color: rgba(255,255,255,0.08) !important;
        }
        [data-shell="cv4"] *:has(> [data-role="composer-actions"]):focus-within {
          border-color: rgba(255,255,255,0.18) !important;
          background: rgba(255,255,255,0.03) !important;
        }
        /* All round composer-action buttons → square. Mic + send become 2px. */
        [data-shell="cv4"] [data-role="composer-actions"] > button,
        [data-shell="cv4"] [data-role="composer-actions"] ~ button,
        [data-shell="cv4"] [data-role="composer-actions"] + button {
          border-radius: 4px !important;
        }
        /* User bubble (right side) — calm, drawer-toned chip instead of
           heavy accent. The text is already #DCE3ED from R6.6; the bg now
           reads as part of the panel surface. */
        [data-shell="cv4"] [data-bubble="user"] {
          background: rgba(255,255,255,0.035) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 2px !important;
          padding: 10px 14px !important;
          filter: none !important;
        }
        /* Assistant — already transparent (R6.4); add a faint left-rule so
           the column reads as structured prose. */
        [data-shell="cv4"] [data-bubble="assistant"] {
          padding-left: 12px !important;
          border-left: 1px solid rgba(255,255,255,0.06) !important;
        }
        /* Soften the centered chat content's outer border (the seam between
           chat and the right tasks drawer). */
        [data-shell="cv4"] [data-cv4-content-col] { background: transparent; }
        /* The composer's outer container (sticky bottom strip). Match the
           drawer bg so it reads as one continuous surface, not a banner. */
        [data-shell="cv4"] [data-testid="thread-chat-input"],
        [data-shell="cv4"] [data-testid="project-chat-input"] {
          background: transparent !important;
        }

        /* ── R7: TASK VIEW BRUTALIST OVERHAUL ─────────────────────────────────
           Sharp rectangles, monospace screaming caps for section headers,
           hard borders, tighter rows. Targets TasksPanel via its existing
           data-testid markers so we don't have to rewrite the component tree. */
        [data-shell="cv4"] h2[data-testid="task-column-header"] {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 26px !important;
          font-weight: 800 !important;
          letter-spacing: 0.02em !important;
          text-transform: uppercase !important;
          color: #F1F5F9 !important;
          line-height: 1 !important;
          padding-bottom: 10px !important;
          border-bottom: 2px solid rgba(255,255,255,0.08) !important;
          width: 100% !important;
        }
        [data-shell="cv4"] h2[data-testid="task-column-header"] + span {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          padding: 2px 8px !important;
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
        }
        /* Section spacing — tighter. */
        [data-shell="cv4"] [data-testid="task-column-header"] {
          margin-bottom: 14px !important;
        }
        /* Task cards — square, hard borders, denser. */
        [data-shell="cv4"] [data-testid="task-card"] {
          border-radius: 2px !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          padding: 12px 14px !important;
          margin-bottom: 6px !important;
          background: rgba(255,255,255,0.015) !important;
          transition: border-color 0.12s, background 0.12s !important;
        }
        [data-shell="cv4"] [data-testid="task-card"]:hover {
          border-color: rgba(255,255,255,0.18) !important;
          background: rgba(255,255,255,0.03) !important;
        }
        /* Project filter pills — square chips, monospace, tighter. */
        [data-shell="cv4"] button[data-testid^="project-pill-"] {
          border-radius: 2px !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.04em !important;
          text-transform: uppercase !important;
          padding: 5px 10px !important;
          border-width: 1px !important;
        }
        /* Search input — square, hairline border. */
        [data-shell="cv4"] [data-testid="tasks-search"],
        [data-shell="cv4"] input[placeholder="Search tasks..."] {
          border-radius: 0 !important;
        }
        /* The search shell wrapping the input. */
        [data-shell="cv4"] input[placeholder="Search tasks..."]:focus {
          outline: 1px solid rgba(255,255,255,0.2) !important;
        }
        /* Generic: kill the soft rounded look on common task chrome. */
        [data-shell="cv4"] [data-testid="task-card"] > div {
          border-radius: 0 !important;
        }

        /* CV4 shows a single compaction/context meter — hide the second
           floppy-disk-ish storage meter that lived alongside it. */
        [data-shell="cv4"] [data-testid="storage-quota-meter"] {
          display: none !important;
        }

        /* R7.13 — Commands menu + Notifications panel match the CV4 drawer
           aesthetic: sharp corners, hairline borders, drawer-toned surface.
           R7.16 — dark theme background flipped from the navy-tinted C.s1
           to the same near-black surface the drawers use (no blue cast). */
        [data-shell="cv4"] [data-testid="cv4-commands-menu-popover"],
        [data-shell="cv4"] [data-cv4-notifications],
        [data-shell="cv4"] [data-cv4-switcher-popover],
        [data-shell="cv4"] [data-cv4-profile-popover] {
          background: #0B1018 !important;
          border-radius: 2px !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          box-shadow: 0 12px 32px rgba(0,0,0,0.55) !important;
        }
        [data-shell="cv4"] [data-testid="cv4-commands-menu-popover"] button,
        [data-shell="cv4"] [data-cv4-notifications] button,
        [data-shell="cv4"] [data-cv4-switcher-popover] button,
        [data-shell="cv4"] [data-cv4-profile-popover] button {
          border-radius: 2px !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="cv4-commands-menu-popover"],
        [data-shell="cv4"][data-theme="light"] [data-cv4-notifications],
        [data-shell="cv4"][data-theme="light"] [data-cv4-switcher-popover],
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] {
          background: #F4EFE3 !important;
          border: 1px solid rgba(0,0,0,0.10) !important;
          box-shadow: 0 12px 32px rgba(0,0,0,0.12) !important;
        }

        /* R7.18 — Mobile long-press action sheet (MobileActionSheet) themed
           to match CV4. Portal renders to document.body so we mirror the
           shell/theme attributes onto <html> and target via :root. Sharp
           corners, hairline borders, drawer-toned surface. */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] {
          background: #0B1018 !important;
          border-top: 1px solid rgba(255,255,255,0.10) !important;
          border-left: 1px solid rgba(255,255,255,0.10) !important;
          border-right: 1px solid rgba(255,255,255,0.10) !important;
          border-radius: 2px 2px 0 0 !important;
          box-shadow: 0 -12px 32px rgba(0,0,0,0.55) !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] {
          background: #F4EFE3 !important;
          border-top: 1px solid rgba(0,0,0,0.10) !important;
          border-left: 1px solid rgba(0,0,0,0.10) !important;
          border-right: 1px solid rgba(0,0,0,0.10) !important;
          box-shadow: 0 -12px 32px rgba(0,0,0,0.18) !important;
          color: #2A2620 !important;
        }
        /* Drag handle — neutralize */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] > div:first-child {
          background: rgba(255,255,255,0.16) !important;
          border-radius: 1px !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] > div:first-child {
          background: rgba(0,0,0,0.16) !important;
        }
        /* Message preview chip — square + hairline */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] > div:nth-child(2) {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 2px !important;
          color: rgba(226,232,240,0.65) !important;
          font-family: 'Inter', sans-serif !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] > div:nth-child(2) {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
          color: rgba(42,38,32,0.65) !important;
        }
        /* Action rows — flat, sharp, mono-caps */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] button[data-test-id^="sheet-"] {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
          color: #E2E8F0 !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] button[data-test-id^="sheet-"] {
          color: #2A2620 !important;
        }
        /* Action icon — theme accent (green), not blue */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] button[data-test-id^="sheet-"] > span:first-child {
          color: #10B981 !important;
        }
        /* Cancel button — sharp + hairline + neutral */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] > button:last-child {
          background: transparent !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 2px !important;
          color: rgba(226,232,240,0.75) !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] > button:last-child {
          border: 1px solid rgba(0,0,0,0.16) !important;
          color: rgba(42,38,32,0.80) !important;
        }

        /* R7.19 — Profile menu becomes a CENTER-SCREEN HOME BASE MODAL in CV4.
           Activates the backdrop (default invisible in CV3) and re-positions
           the popover from the top-right dropdown into a centered command
           panel. Wider (380px), more padding, sharper chrome. */
        [data-shell="cv4"] [data-cv4-profile-backdrop] {
          pointer-events: auto !important;
          opacity: 1 !important;
          background: rgba(0,0,0,0.65) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-backdrop] {
          background: rgba(20,18,14,0.45) !important;
        }
        [data-shell="cv4"] [data-cv4-profile-popover] {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          right: auto !important;
          transform: translate(-50%, -50%) !important;
          width: min(400px, 92vw) !important;
          padding: 28px 24px !important;
          max-height: 92vh !important;
          overflow-y: auto !important;
        }
        /* Avatar tile + display-name input + sign-out button — all sharp */
        [data-shell="cv4"] [data-cv4-profile-popover] input,
        [data-shell="cv4"] [data-cv4-profile-popover] > div > div:first-child,
        [data-shell="cv4"] [data-cv4-profile-popover] > div > div:first-child > div {
          border-radius: 2px !important;
        }
        /* Display-name input — flatter chrome */
        [data-shell="cv4"] [data-cv4-profile-popover] input {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          font-family: 'Inter', sans-serif !important;
          color: ${C.text} !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] input {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.10) !important;
          color: #2A2620 !important;
        }
        /* DISPLAY NAME label — mono caps to match Settings/Commands footer */
        [data-shell="cv4"] [data-cv4-profile-popover] > div:nth-child(2) {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
        }
        /* Save button — sharp, theme-aware, no rounded blue blob */
        [data-shell="cv4"] [data-cv4-profile-popover] > button {
          border-radius: 2px !important;
          font-family: 'Inter', sans-serif !important;
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: ${C.text} !important;
        }
        [data-shell="cv4"] [data-cv4-profile-popover] > button:not(:disabled):hover {
          background: rgba(255,255,255,0.14) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] > button {
          background: rgba(0,0,0,0.05) !important;
          border: 1px solid rgba(0,0,0,0.12) !important;
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] > button:not(:disabled):hover {
          background: rgba(0,0,0,0.10) !important;
        }
        /* Sign-out section divider + button */
        [data-shell="cv4"] [data-cv4-profile-popover] > div:last-child {
          border-top: 1px solid rgba(255,255,255,0.08) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] > div:last-child {
          border-top: 1px solid rgba(0,0,0,0.08) !important;
        }
        [data-shell="cv4"] [data-cv4-profile-popover] > div:last-child > button {
          border-radius: 2px !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
          background: transparent !important;
          border: 1px solid rgba(239,68,68,0.35) !important;
          color: #F87171 !important;
        }
        [data-shell="cv4"] [data-cv4-profile-popover] > div:last-child > button:hover {
          background: rgba(239,68,68,0.08) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] > div:last-child > button {
          border: 1px solid rgba(190,40,40,0.45) !important;
          color: #B91C1C !important;
        }
        /* Email row inside sign-out section */
        [data-shell="cv4"] [data-cv4-profile-popover] > div:last-child > div:first-child {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          letter-spacing: 0.02em !important;
        }
        /* Avatar tile — square it off (was 12px rounded) */
        [data-shell="cv4"] [data-cv4-profile-popover] > div:first-child > div:first-child {
          border-radius: 2px !important;
        }

        /* Brief viewer in CV4 — sharp corners on internal chrome. */
        [data-shell="cv4"] [data-cv4-brief-viewer] .briefing-summary-body h1,
        [data-shell="cv4"] [data-cv4-brief-viewer] .briefing-summary-body h2,
        [data-shell="cv4"] [data-cv4-brief-viewer] .briefing-summary-body h3 {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
        }

        /* R7.20 — Settings overlay always renders as a sleek CENTERED MODAL
           in CV4, on any screen size. Drops the data-mobile=true full-screen
           takeover and the data-mobile=false desktop-only flow. Sidebar on
           top (horizontal tabs) + content below, all bounded inside a 92vw
           card. Black backdrop in dark theme, warm paper backdrop in light. */
        [data-shell="cv4"] [data-testid="project-settings-overlay"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] {
          font-family: 'Inter', sans-serif !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 4vh 12px !important;
          gap: 0 !important;
        }
        /* Top strip / sidebar — now uniformly a horizontal tab strip header */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:first-child,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:first-child {
          border-radius: 2px 2px 0 0 !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-bottom: 1px solid rgba(255,255,255,0.10) !important;
          width: min(560px, calc(100vw - 24px)) !important;
          height: auto !important;
          align-self: center !important;
          background: #0B1018 !important;
        }
        /* Content pane — capped width/height, scrolls internally */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:nth-child(2),
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:nth-child(2) {
          border-radius: 0 0 2px 2px !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-top: none !important;
          width: min(560px, calc(100vw - 24px)) !important;
          max-width: calc(100vw - 24px) !important;
          max-height: 70vh !important;
          height: auto !important;
          overflow: auto !important;
          align-self: center !important;
          padding: 16px 18px !important;
          background: #0B1018 !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] > div:first-child,
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] > div:first-child,
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] > div:nth-child(2),
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] > div:nth-child(2) {
          background: #F4EFE3 !important;
          border-color: rgba(0,0,0,0.10) !important;
        }
        /* Inner content: kill any wider inline padding/widths */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:nth-child(2) > *,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:nth-child(2) > * {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        /* Inputs span the pane width (so Remove button has room beside) */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] input,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] input,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] textarea,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] textarea {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        /* Backdrop on mobile variant was a solid surface — make it a dim
           overlay so the modal floats. */
        [data-shell="cv4"] [data-testid="project-settings-overlay"][data-mobile="true"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"][data-mobile="true"] {
          background: rgba(0,0,0,0.65) !important;
          backdrop-filter: blur(4px) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"][data-mobile="true"],
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"][data-mobile="true"] {
          background: rgba(20,18,14,0.45) !important;
        }
        /* Tabs strip — horizontal on every viewport now */
        [data-shell="cv4"] [data-testid="thread-settings-tabs"],
        [data-shell="cv4"] [data-testid="project-settings-tabs"] {
          flex-direction: row !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        /* R7.20 — About-agent overlay (AgentProfileOverlay) themed to match
           the settings modal: centered card in dimmed backdrop, sharp 2px
           corners, hairline borders, brutalist surface. The cv3 component
           uses position:absolute;inset:0 so the panel covers ChatPanel only.
           We re-cast it as a centered modal over the whole viewport. */
        [data-shell="cv4"] [data-testid="agent-profile-overlay"] {
          position: fixed !important;
          inset: 0 !important;
          background: rgba(0,0,0,0.65) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
          z-index: 9990 !important;
          padding: 5vh 12px !important;
          align-items: center !important;
          justify-content: center !important;
          flex-direction: column !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="agent-profile-overlay"] {
          background: rgba(20,18,14,0.45) !important;
        }
        /* Header strip becomes the modal card top */
        [data-shell="cv4"] [data-testid="agent-profile-overlay"] > div:first-child {
          border-radius: 2px 2px 0 0 !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-bottom: none !important;
          background: #0B1018 !important;
          width: min(560px, calc(100vw - 24px)) !important;
          align-self: center !important;
        }
        /* Body becomes the modal card content */
        [data-shell="cv4"] [data-testid="agent-profile-overlay"] > div:nth-child(2) {
          border-radius: 0 0 2px 2px !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          background: #0B1018 !important;
          width: min(560px, calc(100vw - 24px)) !important;
          max-height: 70vh !important;
          overflow: auto !important;
          align-self: center !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="agent-profile-overlay"] > div:first-child,
        [data-shell="cv4"][data-theme="light"] [data-testid="agent-profile-overlay"] > div:nth-child(2) {
          background: #F4EFE3 !important;
          border-color: rgba(0,0,0,0.10) !important;
        }
        /* Close button — sharp + neutral, not blue circle */
        [data-shell="cv4"] [data-testid="agent-profile-close"] {
          border-radius: 2px !important;
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="agent-profile-close"] {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.12) !important;
        }
        /* Tame the giant in-pane headings (e.g. "MY KEYS") — they're
           competing with the small "Keys" tab title above. The cv3 source
           uses styled <div>s, not <h*>, so we ALSO target divs that
           inline-styled themselves into a heading via uppercase+bold+large.
           Match by inline style substring (React serializes inline style
           verbatim, including the kebab-cased declaration string). */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] h1,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] h2,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] h3,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] h1,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] h2,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] h3,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] div[style*="font-size: 26"],
        [data-shell="cv4"] [data-testid="project-settings-overlay"] div[style*="font-size: 24"],
        [data-shell="cv4"] [data-testid="project-settings-overlay"] div[style*="font-size: 22"],
        [data-shell="cv4"] [data-testid="project-settings-overlay"] div[style*="font-size: 20"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] div[style*="font-size: 26"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] div[style*="font-size: 24"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] div[style*="font-size: 22"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] div[style*="font-size: 20"] {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
          margin: 4px 0 10px !important;
          color: rgba(255,255,255,0.55) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] h1,
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] h2,
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] h3,
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] h1,
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] h2,
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] h3 {
          color: rgba(42,38,32,0.65) !important;
        }
        /* (legacy responsive overrides — superseded by R7.20 unified rules) */
        /* (kept for reference, no longer active) */
        [data-shell="cv4"] [data-testid="project-settings-overlay"][data-mobile="true"] > div:first-child,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"][data-mobile="true"] > div:first-child {
          border-radius: 0 !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        /* "Settings" header → mono caps */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] span,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] span {
          /* avoid restyling every inline span — narrow to the first big
             header span via the surrounding header padding pattern */
        }
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:first-child > div:first-child > span,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:first-child > div:first-child > span {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
        }
        /* Tighten the sidebar header padding */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:first-child > div:first-child,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:first-child > div:first-child {
          padding: 14px 14px !important;
        }
        /* Tab buttons in sidebar — sharp + thin + mono */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] button,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] button {
          border-radius: 2px !important;
        }
        [data-shell="cv4"] [data-testid="project-settings-overlay"] [data-testid^="project-settings-tab-"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] [data-testid^="thread-settings-tab-"] {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          padding: 8px 12px !important;
          border-radius: 2px !important;
        }
        /* Modal backdrop dim (desktop only) — heavier so the panel reads as
           a true modal floating over a hidden background. */
        [data-shell="cv4"] [data-testid="project-settings-overlay"][data-mobile="false"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"][data-mobile="false"] {
          background: rgba(0,0,0,0.65) !important;
          backdrop-filter: blur(4px) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"][data-mobile="false"],
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"][data-mobile="false"] {
          background: rgba(20,18,14,0.45) !important;
        }
        /* All inputs inside settings — flat + sharp */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] input,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] textarea,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] input,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] textarea {
          border-radius: 2px !important;
          font-family: 'Inter', sans-serif !important;
        }

        /* R7.14b — remove the blue project-room dot in the context nav.
           Anywhere a project name shows in the title row, kill the dot's
           default blue and just lean on the title text. */
        /* Targeted via the explicit C.blue color which renders as
           rgb(96, 165, 250) — substring match either form. */
        [data-shell="cv4"] [style*="rgb(96, 165, 250)"],
        [data-shell="cv4"] [style*="#60A5FA"],
        [data-shell="cv4"] [style*="#60a5fa"] {
          background: ${C.muted} !important;
        }

        /* R7.14c — make the purple sparkles "Commands" button follow the
           theme instead of being a permanent purple/blue cast. */
        [data-shell="cv4"] [data-testid="cv4-commands-menu-button"] {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          color: ${C.text} !important;
          box-shadow: none !important;
        }
        [data-shell="cv4"] [data-testid="cv4-commands-menu-button"]:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="cv4-commands-menu-button"] {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.10) !important;
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="cv4-commands-menu-button"]:hover {
          background: rgba(0,0,0,0.07) !important;
        }

        /* ── R7.6 LIGHT THEME ────────────────────────────────────────────
           Soft paper palette, intentionally NOT pure white. Many CV4 inline
           styles use exact hex values from cv3Colors.js; we override them via
           [style*=""] substring selectors. The browser keeps React's style
           string as-written, so hex literals match reliably. */
        [data-shell="cv4"][data-theme="light"] {
          background: #EFEAE0 !important;
          color: #2A2620;
        }
        /* Surfaces (page bg, drawer bg, cards) → warm paper tones */
        [data-shell="cv4"][data-theme="light"] [style*="#06090F"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(6, 9, 15)"] {
          background-color: #EFEAE0 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#0B1018"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(11, 16, 24)"] {
          background-color: #F4EFE3 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#111827"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(17, 24, 39)"] {
          background-color: #EBE5D7 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#1A2035"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(26, 32, 53)"] {
          background-color: #E5DECD !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#222942"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(34, 41, 66)"] {
          background-color: #DDD5C0 !important;
        }
        /* Body text → warm near-black */
        [data-shell="cv4"][data-theme="light"] [style*="#F1F5F9"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(241, 245, 249)"] {
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#94A3B8"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(148, 163, 184)"] {
          color: #5C5448 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#475569"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(71, 85, 105)"] {
          color: #736B5C !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#334155"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(51, 65, 85)"] {
          color: #8A8170 !important;
        }
        /* Hairline borders → softened dark hairlines */
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.04)"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.04)"] {
          border-color: rgba(0,0,0,0.06) !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.08)"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.08)"] {
          border-color: rgba(0,0,0,0.10) !important;
        }
        /* Composer pill + bubbles already scoped to CV4 — flip surface */
        [data-shell="cv4"][data-theme="light"] *:has(> [data-role="composer-actions"]) {
          background: #F7F2E6 !important;
          border-color: rgba(0,0,0,0.10) !important;
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-bubble="user"],
        [data-shell="cv4"][data-theme="light"] [data-bubble="user"] .cmr-content,
        [data-shell="cv4"][data-theme="light"] [data-bubble="user"] .message-content {
          background: #E8E1CF !important;
          color: #2A2620 !important;
          border-color: rgba(0,0,0,0.10) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-bubble="assistant"],
        [data-shell="cv4"][data-theme="light"] [data-bubble="assistant"] .cmr-content,
        [data-shell="cv4"][data-theme="light"] [data-bubble="assistant"] .message-content {
          color: #2A2620 !important;
        }
        /* Inputs (search etc.) — keep contrast */
        [data-shell="cv4"][data-theme="light"] input,
        [data-shell="cv4"][data-theme="light"] textarea {
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] input::placeholder,
        [data-shell="cv4"][data-theme="light"] textarea::placeholder {
          color: #8A8170 !important;
        }
        /* The narrative paragraph card */
        [data-shell="cv4"][data-theme="light"] [data-cv4-tasks-narrative] [data-testid="living-paragraph-text"] {
          color: #5C5448 !important;
        }

        /* R7.9 LIGHT MODE — catch invisible-on-cream text. Many shared CV3
           pieces use color: white / #FFFFFF / inherit; on mobile especially
           these were unreadable. Force any element whose declared color is
           pure white over to our warm near-black. Substring match the
           lowercased + uppercased spellings React emits. */
        [data-shell="cv4"][data-theme="light"] [style*="color: #FFFFFF"],
        [data-shell="cv4"][data-theme="light"] [style*="color:#FFFFFF"],
        [data-shell="cv4"][data-theme="light"] [style*="color: #ffffff"],
        [data-shell="cv4"][data-theme="light"] [style*="color:#ffffff"],
        [data-shell="cv4"][data-theme="light"] [style*="color: #FFF"],
        [data-shell="cv4"][data-theme="light"] [style*="color:#FFF"],
        [data-shell="cv4"][data-theme="light"] [style*="color: #fff"],
        [data-shell="cv4"][data-theme="light"] [style*="color:#fff"],
        [data-shell="cv4"][data-theme="light"] [style*="color: white"],
        [data-shell="cv4"][data-theme="light"] [style*="color:white"],
        [data-shell="cv4"][data-theme="light"] [style*="color: rgb(255, 255, 255)"],
        [data-shell="cv4"][data-theme="light"] [style*="color: rgb(255,255,255)"] {
          color: #2A2620 !important;
        }
        /* Backgrounds that were pure white in dark surfaces (unlikely but
           guard against the inverse). Cards using rgba(255,255,255,N) for
           subtle layers — flip to a subtle dark wash so they remain visible. */
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.02"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.02"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.03"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.03"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.05"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.05"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.06"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.06"] {
          background-color: rgba(0,0,0,0.035) !important;
        }
        /* Body fallback: if a descendant inherits color, root forces warm dark. */
        [data-shell="cv4"][data-theme="light"] { color: #2A2620; }
        /* Default headings + paragraphs inside CV4 in light mode */
        [data-shell="cv4"][data-theme="light"] h1,
        [data-shell="cv4"][data-theme="light"] h2,
        [data-shell="cv4"][data-theme="light"] h3,
        [data-shell="cv4"][data-theme="light"] h4 { color: #2A2620; }
        [data-shell="cv4"][data-theme="light"] p { color: #3D362C; }

        /* Theme toggle — sits inline in the top nav next to the bell. */
        [data-shell="cv4"] [data-cv4-theme-toggle] {
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.10);
          color: #94A3B8;
          cursor: pointer;
          border-radius: 2px;
          padding: 0;
          transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
        }
        [data-shell="cv4"] [data-cv4-theme-toggle]:hover {
          background: rgba(255,255,255,0.05);
          color: #F1F5F9;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-theme-toggle] {
          background: transparent;
          border: 1px solid rgba(0,0,0,0.12);
          color: #5C5448;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-theme-toggle]:hover {
          background: rgba(0,0,0,0.04);
          color: #2A2620;
        }
      `}</style>

      {/* ── NAV BAR (R5.1 Phase F: slim top row — logo + bell + avatar) ───
          Chat/Tasks toggle, drawer toggle, and the title all live in the
          second-row ContextNav below. Mic + phone removed (not useful here).
          World switching lives inside the avatar dropdown. */}
      <nav
        aria-label="Main navigation"
        style={{
          width: '100%',
          flexShrink: 0,
          background: C.bg,
          borderBottom: '1px solid ' + C.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <AomLogo />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            data-cv4-theme-toggle
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            )}
          </button>
          <div style={{ position: 'relative' }}>
            <BellIcon
              count={totalUnread}
              onClick={() => setNotifOpen(o => !o)}
            />
            {notifOpen && (
              <NotificationsPanel
                items={notifItems}
                agents={agents}
                onSelectAgent={handleSelectAgent}
                onMarkAllRead={() => {
                  const now = new Date().toISOString()
                  setNotifReadAt(prev => {
                    const next = { ...prev }
                    for (const item of notifItems) next[item.agent] = now
                    return next
                  })
                  setNotifOpen(false)
                }}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>
          <UserAvatar
            user={currentUser}
            onUserUpdate={setCurrentUser}
            extraMenuItems={(
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: C.dim,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 6,
                }}>World</div>
                <WorldSelector
                  currentWorldId={worldId}
                  currentUser={currentUser}
                  onEnterWorld={handleEnterWorld}
                  onReturnToMyWorld={handleReturnToMyWorld}
                  isNightMode={true}
                  isMobile={false}
                />
              </div>
            )}
          />
        </div>
      </nav>

      {/* ── CV4 CONTEXT NAV (second row: hamburger + title · Chat|Tasks · slot) */}
      <CV4ContextNav
        tab={tab}
        onSwitchTab={handleTabChange}
        unreadChat={unreadChat}
        activeTaskCount={activeTaskCount}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen(o => !o)}
        tasksDrawerOpen={tasksDrawerOpen}
        onToggleTasksDrawer={() => setTasksDrawerOpen(o => !o)}
        isDesktop={isDesktop}
        selectedAgent={selectedAgent}
        conversationTarget={conversationTarget}
        agents={agents}
        projects={projectRooms}
        onSelectAgent={handleSelectAgent}
        onSelectProject={handleSelectProject}
        worldId={worldId}
        activeTool={activeTool}
        onExitTool={() => setActiveTool(null)}
      />

      {/* ── MAIN ROW (desktop): [Files drawer] [Chat (centered)] [Tasks drawer].
          Both side drawers are closeable; chat caps its width on wide screens
          so the eye doesn't have to dart left/right when both drawers are
          collapsed. Mobile/tablet still uses the tab toggle in ContextNav. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
        {isDesktop && drawerOpen && (
          <CV4Drawer
            docked
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            agents={agents}
            projectRooms={projectRooms}
            worldId={worldId}
            selectedAgentSlug={selectedAgent?.slug}
            selectedProjectSlug={conversationTarget?.type === 'project' ? conversationTarget?.slug : null}
            activeTool={activeTool}
            onSelectTool={handleSelectTool}
            onSelectAgent={handleSelectAgent}
            onSelectProject={handleSelectProject}
            onSelectMission={(mission, project) => {
              handleSelectProject(project)
              setAttachedMission({
                slug: mission.slug,
                name: mission.name,
                projectSlug: project.slug,
                path: `corner:${mission.slug}`,
              })
            }}
            onLogout={async () => {
              if (supabase) await supabase.auth.signOut().catch(() => {})
              window.location.href = '/'
            }}
          />
        )}
        <div data-cv4-content-col style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Center the chat column on wide screens so messages don't hug the
              left edge — especially when both side drawers are closed. */}
          <div
            data-cv4-content-inner
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              width: '100%',
              maxWidth: isDesktop ? 840 : '100%',
              margin: '0 auto',
            }}
          >
            {(!isDesktop && tab === 'tasks') ? (
              activeTool === 'mail' && selectedMail
                ? <MailRoom email={selectedMail} onBack={handleBackFromMailRoom} />
                : activeTool === 'mail'
                  ? <MailListPanel selectedMailId={selectedMail?.id} onSelectMail={handleSelectMail} />
                  : <TasksPanelCv4 />
            ) : (
              activeTool === 'mail' && selectedMail
                ? <MailRoom email={selectedMail} onBack={handleBackFromMailRoom} />
                : <ChatPanel key={selectedAgent?.slug || 'chat'} />
            )}
          </div>
        </div>
        {isDesktop && tasksDrawerOpen && (
          <aside
            data-cv4-tasks-drawer
            data-cv4-mail-mode={activeTool === 'mail' ? 'true' : 'false'}
            style={{
              // R7.2: ~20% of viewport, clamped sensibly so it stays readable.
              width: 'clamp(300px, 20vw, 460px)',
              flexShrink: 0,
              background: C.bg,
              borderLeft: '1px solid ' + C.border,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {activeTool === 'mail'
              ? <MailListPanel selectedMailId={selectedMail?.id} onSelectMail={handleSelectMail} />
              : <TasksPanelCv4 />}
          </aside>
        )}
      </div>

      {/* R5.1: persistent home input bar removed. Chat is the always-on default,
          and its composer (ThreadInputBar) lives inside ChatPanel. */}

      {/* ── COMMANDS PALETTE MODAL ───────────────────────────────────────── */}
      {showCommandsModal && (
        <div
          onClick={() => setShowCommandsModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 80,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560,
              background: C.s1,
              border: '1px solid ' + C.border2,
              borderRadius: 18,
              boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              maxHeight: '60vh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: '1px solid ' + C.border,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                Slash Commands
              </span>
              <button
                onClick={() => setShowCommandsModal(false)}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
              >×</button>
            </div>
            {/* List */}
            <div style={{ overflowY: 'auto', padding: 6 }}>
              {skillsData.skills.map(skill => (
                <button
                  key={skill.name}
                  onClick={() => {
                    setInputBarText(skill.name + ' ')
                    setShowCommandsModal(false)
                    handleInputBarFocus()
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', textAlign: 'left',
                    padding: '8px 10px', borderRadius: 10,
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.10)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: C.accent2,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0, minWidth: 0,
                  }}>{skill.name}</span>
                  <span style={{
                    fontSize: 11, color: C.text2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1,
                  }}>{skill.description}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: C.muted, flexShrink: 0,
                  }}>{skill.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PHONE RECORDING OVERLAY ───────────────────────────────────────── */}
      {phoneOverlayOpen && (
        <PhoneRecordingOverlay
          isRecording={telephone.isRecording}
          isTranscribing={telephone.isTranscribing}
          micError={telephone.micError}
          elapsed={telephone.elapsed}
          lastTranscript={telephone.lastTranscript}
          onToggle={telephone.toggle}
          onClose={() => {
            setPhoneOverlayOpen(false)
            if (telephone.isRecording) telephone.stop()
          }}
        />
      )}

      {/* ── TOAST NOTIFICATION ────────────────────────────────────────────── */}
      <TaskCompletionToast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />

      {/* ── CV4 DRAWER (mobile/tablet overlay; desktop renders docked above) ─ */}
      {!isDesktop && (
        <CV4Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          agents={agents}
          projectRooms={projectRooms}
          worldId={worldId}
          selectedAgentSlug={selectedAgent?.slug}
          selectedProjectSlug={conversationTarget?.type === 'project' ? conversationTarget?.slug : null}
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onSelectAgent={handleSelectAgent}
          onSelectProject={handleSelectProject}
          onSelectMission={(mission, project) => {
            handleSelectProject(project)
            setAttachedMission({
              slug: mission.slug,
              name: mission.name,
              projectSlug: project.slug,
              path: `corner:${mission.slug}`,
            })
          }}
          onLogout={async () => {
            if (supabase) await supabase.auth.signOut().catch(() => {})
            window.location.href = '/'
          }}
        />
      )}

      <FloatingCallBar />
    </div>
          </LiveCallProvider>
        </CornerNavProvider>
      </CornerDataProvider>
    </CornerAuthProvider>
  )
}
