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
import { useNavigate, useParams, useLocation } from 'react-router-dom'
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
import RightMenu from './cv4/RightMenu.jsx'
// R10 — MailListPanel moved into the left rail (cv4/LeftMailPanel.jsx),
// imported via cv4/Drawer.jsx; no longer mounted here directly.
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
  const routeLocation = useLocation()
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
  // CV4 Tools → Mail (R10, 2026-05-25): Mail moved to the left rail
  // (LeftMailPanel in CV4Drawer). activeTool still tracks 'tasks' etc.;
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
  // R78-p9c: increment to force both Drawer instances to refetch missions-tree
  // immediately after a new project or mission is created via the self-serve door.
  const [drawerRefreshKey, setDrawerRefreshKey] = useState(0)
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
  // R12 (2026-05-25) — read the actual ?integrations=connected|error params
  // the callback sets (the earlier ?google_oauth=success|denied check never
  // matched the callback's redirect). reason=scope-insufficient gets its
  // own message so the user knows to pick "Select all" on Google's granular
  // permissions screen on the next attempt — the most common bug here was
  // skipping that checkbox and landing as "connected" with no actual access.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('integrations')
    if (!status) return
    const slug = params.get('slug') || ''
    const reason = params.get('reason') || ''
    if (status === 'connected') {
      const labelMap = { gmail: 'Gmail', 'google-calendar': 'Google Calendar', 'google-drive': 'Google Drive' }
      const label = labelMap[slug] || slug || 'Integration'
      setToast({ visible: true, message: `${label} connected.` })
    } else if (status === 'error') {
      if (reason.startsWith('scope-insufficient')) {
        setToast({
          visible: true,
          message: 'Gmail connected with limited access. Please reconnect and tick "Select all" on the permissions screen.',
        })
      } else if (reason.startsWith('provider:access_denied')) {
        setToast({ visible: true, message: 'Google authorization was cancelled.' })
      } else {
        setToast({ visible: true, message: `Couldn’t connect: ${reason || 'unknown error'}` })
      }
    }
    params.delete('integrations')
    params.delete('slug')
    params.delete('reason')
    params.delete('world_id')
    const newSearch = params.toString()
    window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname)
  }, [])

  // Tenant access guard (2026-05-25): if the URL points at a project the
  // current user can't access, redirect to the dashboard root before the
  // conversationTarget gets set. Without this, a tenant user (e.g. Karen)
  // who lands on /cv4/project/aheadofmarket via a stale URL, a bookmark,
  // or an accidental click ends up with selectedProject=aheadofmarket, and
  // every message she sends gets stamped client_id="shared:aheadofmarket"
  // — which Patrik's aheadofmarket chat then legitimately reads via the
  // [worldId, sharedCid] union. That produced the 2026-05-25 leak where
  // Karen's file uploads appeared in AOM's project chat. Gating here keeps
  // the URL trustworthy: only your own projects (owned + shared-to-you)
  // can drive selectedProject.
  // Skip the guard if projectRooms is still loading (avoids a redirect race
  // on cold load where the URL beats the data fetch).
  useEffect(() => {
    if (!routeProjectId) return
    if (!projectRooms || projectRooms.length === 0) return // data not loaded yet
    const accessible = projectRooms.some(p => p?.slug === routeProjectId)
    if (!accessible) {
      const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
      console.warn('[tenant-isolation] blocked URL-route to inaccessible project; redirecting', { routeProjectId, accessibleSlugs: projectRooms.map(p => p?.slug) })
      navigate(basePath, { replace: true })
    }
  }, [routeProjectId, projectRooms, navigate])

  // mission-rooms: read ?mission= from the URL on mount and persist mission
  // scope on the conversationTarget. Lets a direct link to
  // /cv4/project/:slug?mission=:missionSlug land the user inside the mission
  // room, not the project's general chat or the previously-selected 1:1
  // agent surface (clearing selectedAgent mirrors handleSelectMission so
  // the chat panel actually re-renders into the project room).
  useEffect(() => {
    if (!routeProjectId) return
    // Mirror the access guard above: don't set conversationTarget for a
    // project the user can't access. Skip while projectRooms is loading.
    if (projectRooms && projectRooms.length > 0 &&
        !projectRooms.some(p => p?.slug === routeProjectId)) {
      return
    }
    const params = new URLSearchParams(routeLocation.search || '')
    const missionSlug = params.get('mission')
    if (!missionSlug) {
      // mission-rooms: search param dropped OR direct-URL navigation to a
      // project room with no mission scope. Either way the conversationTarget
      // must reflect this project so ChatPanel renders the project chat
      // surface (not the empty Home fallback). Three cases:
      //   1) prev is null (direct URL load, e.g. /dashboard/project/space-rising)
      //      → set it to a plain project target so the room actually opens
      //      and its messages load (without this the chat tab falls through
      //      to "Home / Start a conversation" and history never appears).
      //   2) prev has missionSlug (room change clearing mission scope) → drop mission
      //   3) prev is already this project with no mission → no-op
      setSelectedAgent(null)
      setConversationTarget(prev => {
        if (prev && prev.slug === routeProjectId && !prev.missionSlug) return prev
        return { name: prev?.name || routeProjectId, slug: routeProjectId, type: 'project' }
      })
      return
    }
    setSelectedAgent(null)
    setConversationTarget(prev => {
      if (prev && prev.slug === routeProjectId && prev.missionSlug === missionSlug) return prev
      return {
        name: missionSlug,
        slug: routeProjectId,
        type: 'project',
        missionSlug,
        missionName: missionSlug,
        missionPath: `corner:${missionSlug}`,
      }
    })
  }, [routeProjectId, routeLocation.search])

  // User identity for multi-user message tracking (parent scope)
  const parentUserIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id])

  // corner:mission-rooms — tasks retired 2026-05-17. Keeping the useTasks
  // call so downstream consumers (MessageList task-room failure branch,
  // TasksPanelCv4, etc.) don't crash before they're cut in their own
  // rounds. queued/rightNow/waiting/done/allTasks will all be empty arrays
  // once the tasks table query returns nothing. The "task completed" toast
  // is gone — no chrome talks tasks anymore.
  const { queued, rightNow, waiting, done, allTasks, refresh: refreshTasks, addOptimisticTask } = useTasks(worldId)
  // R14e-4 (viewing-user model): the viewer's slug inside this tenant.
  // Resolved from `tenant_users.slug` keyed on auth.uid() + current worldId.
  // AOM tenant: Patrik → 'patrik', Ash → 'ash'. Future personal tenants:
  // each viewer gets their own slug in their own tenant_users row.
  const currentUserSlug = useCurrentUserSlug(currentUser, worldId)

  // useDataPipe provides agents, inboxItems, projectRooms (from agent_status),
  // and filters personal/non-personal tasks by the viewer's slug.
  const { agents, inboxItems, projectRooms, personalTodos, refetch: refetchData } = useDataPipe(null, worldId, currentUserSlug)

  // corner:shared-rooms M8 — world-transition reset.
  // The auto-select effect below pins selectedAgent on first paint. On a slow
  // auth resolve (or an admin world-override flip) the agents list changes
  // out from under us — e.g. Ben logs in: first render uses the default 'aom'
  // clientId because auth hasn't resolved, picks a default AOM EA, then
  // arsenal resolves and agents becomes [ea] but selectedAgent is still pinned
  // to the AOM one. Without this reset, the early-return below blocks
  // re-selection and Ben stays in a room for an agent that doesn't exist in
  // his world. Reset only fires when the current selection is genuinely
  // orphaned from the new world's agent list — mid-conversation users whose
  // agent IS in the new list don't get clobbered.
  useEffect(() => {
    if (!agents || agents.length === 0) return
    if (!selectedAgent) return
    const stillPresent = agents.some(a => a.slug === selectedAgent.slug)
    if (stillPresent) return
    setSelectedAgent(null)
    setConversationTarget(null)
  }, [agents, selectedAgent])

  // R5.1 / R7.20: no more "home" view. First paint = chat with the world's EA.
  // Reads is_ea + is_terminal from agent_status — works for every tenant without
  // hard-coding a slug. (Previously hard-coded 'elon', which broke non-AOM worlds
  // like arsenal where the EA slug is 'ea'.) Skips auto-select if the user
  // already has a conversation in flight (e.g. landed on /cv4/project/:id).
  useEffect(() => {
    if (!agents || agents.length === 0) return
    if (selectedAgent || conversationTarget) return
    // mission-rooms: if the URL is on a project (or mission) page, the
    // URL-restore effect below owns the conversationTarget. Don't race
    // against it — that wins the same-render setSelectedAgent battle and
    // the user lands on the wrong room.
    if (routeProjectId) return
    const target =
      agents.find(a => a.is_ea && a.is_terminal)
      || agents.find(a => a.is_ea)
      || agents[0]
    if (!target) return
    setSelectedAgent(target)
    setConversationTarget({ name: target.name, type: 'agent' })
  }, [agents, selectedAgent, conversationTarget, routeProjectId])

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

  // Notifications: filter inboxItems by per-ROOM read timestamps (session-only).
  // corner:notifications R1 — read state keys on roomKey so opening one room's
  // notification doesn't silence another room from the same agent. Fall back to
  // agent for any legacy item missing roomKey.
  const notifItems = useMemo(() => {
    return (inboxItems || []).filter(item => {
      const key = item.roomKey || item.agent
      return key && (!notifReadAt[key] || item.timestamp > notifReadAt[key])
    })
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

  // ── New-user onboarding auto-start ────────────────────────────────────────
  // When a brand new user loads their empty workspace the EA sends the first
  // message — a warm welcome + lead-in question. The user should never see a
  // blank chat and wonder if something is broken.
  // Primary guard: msgs.length > 0 (DB state). sessionStorage is a lightweight
  // dedup to avoid re-checking on every render within the same tab session.
  useEffect(() => {
    if (!authReady || !worldId || !currentUser) return
    if (worldId === 'aom') return  // Patrik's world — never auto-start
    // Find the EA agent specifically — not just agents[0] which may be a project room
    const eaAgent = agents?.find(a => a.is_ea && a.is_terminal)
      || agents?.find(a => a.is_ea)
      || agents?.[0]
    if (!eaAgent) return
    const flagKey = `onboard-started-${worldId}`
    // Delay to let the message list load before we check if it's empty
    const timer = setTimeout(async () => {
      try {
        // all=true: the GET requires either an agent slug or all=true. We want
        // "any message in this world" — sending all=true checks across agents
        // so the greeting fires once per world, not once per agent. Without
        // this, the endpoint returns 400 ('agent required') and the welcome
        // never posts for new tenants like Ben's Arsenal workspace.
        const r = await authFetch(
          `/api/dashboard/supabase-messages?client=${encodeURIComponent(worldId)}&all=true&limit=1`
        )
        if (!r.ok) return
        const data = await r.json()
        const msgs = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : []
        if (msgs.length > 0) {
          // Already has messages — set the dedup flag so we stop checking each render
          sessionStorage.setItem(flagKey, '1')
          return
        }
        // No messages — EA sends the welcome first as assistant
        if (sessionStorage.getItem(flagKey)) return  // already fired this session
        sessionStorage.setItem(flagKey, '1')
        await authFetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: eaAgent.slug,
            text: "Hey, welcome! I'm your EA — I help you stay organized and get things done. What kind of work do you do? Give me a quick rundown and I'll get your workspace set up.",
            role: 'assistant',
            source: 'corner-onboarding-auto',
            client_id: worldId,
          }),
        })
      } catch (e) { console.warn('[onboarding] welcome send failed:', e) }
    }, 1200)
    return () => clearTimeout(timer)
  }, [authReady, worldId, currentUser, agents])

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
      // corner:notifications R2 — opening the project room clears its
      // project-level notification dot (roomKey = project slug).
      setNotifReadAt(prev => ({ ...prev, [project.slug]: new Date().toISOString() }))
      const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
      navigate(`${basePath}/project/${project.slug}`)
    }
  }, [navigate])

  // R78-p9 corner:new-projects — self-serve creation. The "+ New project"
  // door in the drawer opens a name popup; on submit we create the room and
  // drop the user straight into it, where the agent's kickoff greeting
  // (posted server-side by create-project-from-chat) is already waiting.
  const [newRoomModal, setNewRoomModal] = useState(null) // null | { kind: 'project' | 'mission', parentSlug?, parentName? }
  const [creatingRoom, setCreatingRoom]  = useState(false)
  const [createRoomError, setCreateRoomError] = useState(null)

  const slugify = (s) =>
    (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)

  const handleCreateProject = useCallback(async (rawName) => {
    const name = (rawName || '').trim()
    if (!name || !worldId) return
    const slug = slugify(name) || `room-${Date.now().toString(36)}`
    setCreatingRoom(true)
    setCreateRoomError(null)
    try {
      const r = await authFetch('/api/dashboard/create-project-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, client_id: worldId }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j && j.ok) {
        setNewRoomModal(null)
        handleSelectProject({ slug: j.slug || slug, name: j.name || name })
        // R78-p9c: force immediate refetch of data pipe + missions-tree.
        refetchData && refetchData()
        setDrawerRefreshKey(k => k + 1)
      } else {
        setCreateRoomError((j && j.error) || 'Could not create the project. Try again.')
      }
    } catch (e) {
      setCreateRoomError('Could not create the project. Try again.')
    } finally {
      setCreatingRoom(false)
    }
  }, [worldId, handleSelectProject, refetchData])

  // R3 corner:mission-rooms — clicking a mission in the drawer OR in the
  // tasks-view file manager routes into a focused chat surface scoped to
  // that mission. Same chat template as a project/agent room; the room
  // is keyed by project+mission so the bridge loads mission CONTEXT/VISION/
  // BUILD as starting context (bridge.py R1) and `mission_slug` rides on
  // every outgoing message's metadata so the SDK reply is mission-aware.
  const handleSelectMission = useCallback((mission, project) => {
    if (!mission || !project) return
    setSelectedAgent(null)
    setConversationTarget({
      name: mission.name || mission.slug,
      slug: project.slug,
      type: 'project',
      missionSlug: mission.slug,
      missionName: mission.name || mission.slug,
      missionPath: mission.path || `corner:${mission.slug}`,
    })
    setAttachedMission(null)
    setTab('chat')
    setUnreadChat(0)
    // corner:notifications R2 — opening the mission room clears that mission's
    // notification dot (roomKey = full mission_slug "project:mission").
    setNotifReadAt(prev => ({ ...prev, [`${project.slug}:${mission.slug}`]: new Date().toISOString() }))
    const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
    navigate(`${basePath}/project/${project.slug}?mission=${encodeURIComponent(mission.slug)}`)
  }, [navigate])

  // R78-p9b corner:new-projects — self-serve mission creation. The "New mission"
  // row in an expanded project triggers a name popup; on submit we scaffold the
  // mission and drop the user into its room, where the kickoff greeting waits.
  const handleCreateMission = useCallback(async (rawName, parentSlug, parentName) => {
    const name = (rawName || '').trim()
    if (!name || !worldId || !parentSlug) return
    const slug = slugify(name) || `mission-${Date.now().toString(36)}`
    setCreatingRoom(true)
    setCreateRoomError(null)
    try {
      const r = await authFetch('/api/dashboard/create-mission-from-drawer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_slug: parentSlug, mission_slug: slug, name, client_id: worldId }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j && j.ok) {
        setNewRoomModal(null)
        handleSelectMission(
          { slug: j.mission_slug || slug, name: j.name || name },
          { slug: parentSlug, name: parentName || parentSlug }
        )
        // R78-p9c: refresh data pipe + missions-tree so the new mission appears immediately.
        refetchData && refetchData()
        setDrawerRefreshKey(k => k + 1)
      } else {
        setCreateRoomError((j && j.error) || 'Could not create the mission. Try again.')
      }
    } catch (e) {
      setCreateRoomError('Could not create the mission. Try again.')
    } finally {
      setCreatingRoom(false)
    }
  }, [worldId, handleSelectMission, refetchData])


  // corner:notifications R1 — a notification opens the ROOM its message lives
  // in, not the agent that sent it. Routes to the mission room when the item
  // carries a mission_slug, else the project room when it carries a project,
  // else the 1:1 agent thread. Then marks that room's notification read.
  const handleSelectNotification = useCallback((item) => {
    if (!item) return
    if (item.missionSlug) {
      // mission_slug is the full path "project:mission" (e.g. "corner:notifications").
      // handleSelectMission puts mission.slug in the URL as the bare slug and
      // rebuilds the path as `corner:<slug>`, so split off the project prefix.
      const colon = item.missionSlug.indexOf(':')
      const projectSlug = item.project || (colon > -1 ? item.missionSlug.slice(0, colon) : 'corner')
      const missionBare = colon > -1 ? item.missionSlug.slice(colon + 1) : item.missionSlug
      handleSelectMission(
        { slug: missionBare, name: missionBare, path: item.missionSlug },
        { slug: projectSlug, name: projectSlug }
      )
    } else if (item.project) {
      handleSelectProject({ slug: item.project, name: item.project })
    } else {
      const agent = (agents || []).find(a => a.slug === item.agent) || { slug: item.agent, name: item.agent }
      handleSelectAgent(agent)
    }
    const key = item.roomKey || item.agent
    if (key) setNotifReadAt(prev => ({ ...prev, [key]: new Date().toISOString() }))
  }, [agents, handleSelectMission, handleSelectProject, handleSelectAgent])

  // R6 corner:task-rooms — open the task room as a chat surface using the
  // existing ThreadView (same chat template as agent + project chats).
  // The task is encoded as a pseudo-agent with slug `task:<id>` — matches
  // the convention already used by api/dashboard/task-message.js and
  // scripts/sub-agent-reply.sh (both write messages with that agent value
  // and metadata.task_id). One template, zero data-path changes, the
  // chat surface "just works" for task rooms. Patrik's
  // feedback_chats_are_one_template.md doctrine holds.
  const handleSelectTask = useCallback((task) => {
    if (!task || !task.id) return
    const rawTitle = task.title || task.text || `Task ${String(task.id).slice(0, 8)}`
    setSelectedAgent({
      slug: `task:${task.id}`,
      name: rawTitle,
      isTaskRoom: true,
      taskId: task.id,
      taskStatus: task.status || null,
      taskClientId: task.client_id || task.clientId || null,
      taskProject: task.project || null,
    })
    setConversationTarget(null)
    setTab('chat')
    setUnreadChat(0)
    const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
    if (routeProjectId) navigate(basePath)
  }, [navigate, routeProjectId])

  // R10 (2026-05-25) — Mail moved to the left rail (LeftMailPanel).
  // handleSelectTool no longer auto-opens the right rail to Mail; the tool
  // routing stays for 'tasks' and any future tools. Mail-from-left-rail
  // simply pins emails via handleSelectMail.
  const handleSelectTool = useCallback((tool) => {
    setActiveTool(tool)
    if (tool !== 'mail') setSelectedMail(null)
  }, [])

  // Called by LeftMailPanel / MailListPanel when the user clicks an email.
  // R15 (2026-05-25): also flip activeTool='mail' so the existing wiring
  // fires — MailChip renders above the composer, and useChatSend reads
  // selectedMail via activeTool==='mail' to prepend the email body +
  // attachments as Mail Room context on the next send to the EA.
  const handleSelectMail = useCallback((email) => {
    console.log('[MailRoom] handleSelectMail fired', email?.id, email?.subject)
    setSelectedMail(email)
    setActiveTool('mail')
  }, [])

  const handleBackFromMailRoom = useCallback(() => {
    setSelectedMail(null)
    setActiveTool(null)
  }, [])

  // Called by ChatPanel back button — clear conversation. R6: when the
  // user is backing out of a task room, return to the tasks tab instead of
  // dropping to the home view. The task list IS the room directory.
  const handleBackFromConversation = useCallback(() => {
    const wasTaskRoom = !!selectedAgent?.isTaskRoom
    setSelectedAgent(null)
    setConversationTarget(null)
    if (routeProjectId) {
      const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
      navigate(basePath)
    }
    if (wasTaskRoom) {
      setTab('tasks')
    }
  }, [navigate, routeProjectId, selectedAgent?.isTaskRoom])

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
      const target = selectedAgent || agents?.find(a => a.is_ea && a.is_terminal) || agents?.find(a => a.is_ea) || agents?.[0]
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
    const target = selectedAgent || agents?.find(a => a.is_ea && a.is_terminal) || agents?.find(a => a.is_ea) || agents?.[0]
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
    handleSelectAgent, handleSelectProject, handleSelectMission, handleSelectTask, handleBackFromConversation,
    prefillMessage, setPrefillMessage,
    attachedMission, setAttachedMission,
    activeTool, selectedMail, setSelectedMail,
    stageFilesRef,
  }), [tab, handleTabChange, selectedAgent, conversationTarget, handleSelectAgent, handleSelectProject, handleSelectMission, handleSelectTask, handleBackFromConversation, prefillMessage, attachedMission, activeTool, selectedMail, stageFilesRef])

  // ── Render ────────────────────────────────────────────────────────────────

  // Wait for auth to resolve AND world to be set before rendering
  // This prevents hooks from fetching with the wrong client_id (e.g. 'aom' default)
  // ISOLATION FIX 2026-05-24: Also check worldId to prevent cross-tenant leak during load
  if (!authReady || !worldId || (!!supabase && !currentUser && typeof window !== 'undefined')) {
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
    <div data-testid="dashboard-home-root" data-cv4 data-shell="cv4" data-theme={theme} style={{
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
                onSelectNotification={handleSelectNotification}
                onSelectAgent={handleSelectAgent}
                onMarkAllRead={() => {
                  const now = new Date().toISOString()
                  setNotifReadAt(prev => {
                    const next = { ...prev }
                    for (const item of notifItems) next[item.roomKey || item.agent] = now
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
            notifItems={notifItems}
            worldId={worldId}
            currentUserId={currentUser?.id || null}
            selectedAgentSlug={selectedAgent?.slug}
            selectedProjectSlug={conversationTarget?.type === 'project' ? conversationTarget?.slug : null}
            activeTool={activeTool}
            selectedMailId={selectedMail?.id}
            onSelectMail={handleSelectMail}
            onSelectTool={handleSelectTool}
            onSelectAgent={handleSelectAgent}
            onSelectProject={handleSelectProject}
            onNewProject={() => setNewRoomModal({ kind: 'project' })}
            onNewMission={(p) => setNewRoomModal({ kind: 'mission', parentSlug: p.slug, parentName: p.name })}
            onSelectMission={(mission, project) => handleSelectMission(mission, project)}
            refreshKey={drawerRefreshKey}
            onSelectTask={(task, mission, project) => {
              // R5 corner:task-rooms — open the task room by routing to the
              // tasks tool with the task id in the URL hash. TasksPanelCv4
              // reads the hash and auto-expands the matching row.
              if (project) handleSelectProject(project)
              if (mission) {
                setAttachedMission({
                  slug: mission.slug,
                  name: mission.name,
                  projectSlug: project?.slug || null,
                  path: `corner:${mission.slug}`,
                })
              }
              if (handleSelectTool) handleSelectTool('tasks')
              try { window.location.hash = `task=${task.id}` } catch { /* ignore */ }
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
            {/* R10 — Mail list moved to the left rail. Right rail / mobile
                'tasks' tab no longer renders MailListPanel. Clicking an email
                in the left rail still opens MailRoom in the center column. */}
            {(!isDesktop && tab === 'tasks') ? (
              selectedMail
                ? <MailRoom email={selectedMail} onBack={handleBackFromMailRoom} />
                : <RightMenu />
            ) : (
              selectedMail
                ? <MailRoom email={selectedMail} onBack={handleBackFromMailRoom} />
                : <ChatPanel key={selectedAgent?.slug || 'chat'} />
            )}
          </div>
        </div>
        {isDesktop && tasksDrawerOpen && (
          <aside
            data-cv4-tasks-drawer
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
            {/* R10 — Right rail is Missions/Tasks/Files only. Mail moved
                to the left rail (LeftMailPanel inside CV4Drawer). */}
            <RightMenu />
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
          notifItems={notifItems}
          worldId={worldId}
          currentUserId={currentUser?.id || null}
          selectedAgentSlug={selectedAgent?.slug}
          selectedProjectSlug={conversationTarget?.type === 'project' ? conversationTarget?.slug : null}
          activeTool={activeTool}
          selectedMailId={selectedMail?.id}
          onSelectMail={handleSelectMail}
          onSelectTool={handleSelectTool}
          onSelectAgent={handleSelectAgent}
          onSelectProject={handleSelectProject}
          onNewProject={() => setNewRoomModal({ kind: 'project' })}
          onNewMission={(p) => setNewRoomModal({ kind: 'mission', parentSlug: p.slug, parentName: p.name })}
          onSelectMission={(mission, project) => handleSelectMission(mission, project)}
          refreshKey={drawerRefreshKey}
          onSelectTask={(task, mission, project) => {
            if (project) handleSelectProject(project)
            if (mission) {
              setAttachedMission({
                slug: mission.slug,
                name: mission.name,
                projectSlug: project?.slug || null,
                path: `corner:${mission.slug}`,
              })
            }
            if (handleSelectTool) handleSelectTool('tasks')
            try { window.location.hash = `task=${task.id}` } catch { /* ignore */ }
          }}
          onLogout={async () => {
            if (supabase) await supabase.auth.signOut().catch(() => {})
            window.location.href = '/'
          }}
        />
      )}

      {newRoomModal && (
        <NewRoomModal
          kind={newRoomModal.kind}
          busy={creatingRoom}
          error={createRoomError}
          onSubmit={(name) => {
            if (newRoomModal.kind === 'project') handleCreateProject(name)
            else if (newRoomModal.kind === 'mission') handleCreateMission(name, newRoomModal.parentSlug, newRoomModal.parentName)
          }}
          onClose={() => { if (!creatingRoom) { setNewRoomModal(null); setCreateRoomError(null) } }}
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

// R78-p9 corner:new-projects — the "name it" popup for self-serve creation.
// Stupid simple: one field, Enter to create. On submit the caller creates the
// room and drops the user into it, where the agent's kickoff greeting waits.
function NewRoomModal({ kind = 'project', busy = false, error = null, onSubmit, onClose }) {
  const [name, setName] = useState('')
  const label = kind === 'mission' ? 'mission' : 'project'
  const canSubmit = !!name.trim() && !busy
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'cv4DrawerFade 0.15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 92vw)',
          background: C.bg,
          border: '1px solid ' + C.border,
          borderRadius: 14,
          padding: '22px 22px 18px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 25, lineHeight: 1.1, color: C.text, marginBottom: 6,
        }}>
          New {label}
        </div>
        <div style={{
          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          fontSize: 13, color: C.muted, marginBottom: 16,
        }}>
          Name it. You'll land in the room and we'll set it up from there.
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) onSubmit(name)
            if (e.key === 'Escape' && !busy) onClose()
          }}
          placeholder={kind === 'mission' ? 'e.g. Hero section' : 'e.g. Phoenix Bakery'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid ' + C.border,
            borderRadius: 8, padding: '10px 12px',
            color: C.text, fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            fontSize: 15, outline: 'none', marginBottom: error ? 8 : 18,
          }}
        />
        {error && (
          <div style={{
            color: '#FCA5A5', fontSize: 12, marginBottom: 14,
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          }}>{error}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
              padding: '8px 12px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            }}
          >Cancel</button>
          <button
            onClick={() => canSubmit && onSubmit(name)}
            disabled={!canSubmit}
            style={{
              background: canSubmit ? C.accent : 'rgba(255,255,255,0.08)',
              color: canSubmit ? '#0b0b0c' : C.muted,
              border: 'none', borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'default',
              fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            }}
          >{busy ? 'Creating…' : `Create ${label}`}</button>
        </div>
      </div>
    </div>
  )
}
