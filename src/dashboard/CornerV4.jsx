// CornerV4.jsx -- WD-40 redesign at /cv4
// Route: /cv4
//
// R-CV4-2 (2026-05-12): Convention-first shell. Sidebar (projects + agents +
// account) on the left, chat in the center, collapsible Tasks rail on the
// right. Top-tab Chat/Tasks switcher killed. Shared cv3/ component tree is
// preserved verbatim so chain animations + voice + cutscene primitives stay
// in lockstep with V3.
//
// CornerV3.jsx stays sacred at /dashboard (feedback_cornerv3_only).
//
// Design principle (corner/VISION.md change log 2026-05-12): convention-first —
// the shell mirrors the AI-app organizational flow (chatgpt.com + claude.ai);
// content slots into it (projects + missions in the sidebar). Differentiate on
// what is INSIDE the shell, not on shell shape.
//
// Mission: corner/users/aom/missions/aom-website/
// Plan: corner/users/aom/missions/aom-website/research/2026-05-12-cv4-wd40-redesign-plan.md

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
import { C } from './lib/cv3Colors.js'
import ChatPanel from './components/cv3/ChatPanel.jsx'
import {
  CornerAuthProvider,
  CornerDataProvider,
  CornerNavProvider,
} from './CornerContext.jsx'
import { LiveCallProvider } from './providers/LiveCallProvider.jsx'
import FloatingCallBar from './components/cv3/voice/FloatingCallBar.jsx'
import PhoneRecordingOverlay from './components/cv3/phone-recording/PhoneRecordingOverlay.jsx'
import CutsceneOverlay from './components/cv3/cutscene/CutsceneOverlay.jsx'

import Sidebar from './cv4/Sidebar.jsx'
import TopBar from './cv4/TopBar.jsx'
import RightRail from './cv4/RightRail.jsx'
import WorldSwitcherModal from './cv4/WorldSwitcherModal.jsx'
import './cv4/cv4.css'

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
      <style>{`@keyframes cv4SlideUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <div
        data-testid="cv4-task-toast"
        className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-emerald-500/20 bg-[#0d111a] px-4 py-2.5 shadow-2xl"
        style={{ animation: 'cv4SlideUp 0.3s ease-out' }}
      >
        <span className="size-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
        <span className="text-[12px] font-semibold text-aom-text-light">{message}</span>
      </div>
    </>
  )
}

// ── Mission chip (pinned context above composer) ──────────────────────────────

function MissionChip({ mission, onClear }) {
  const project = mission?.project
  const m = mission?.mission
  if (!project || !m) return null
  return (
    <div className="cv4-composer-pin" data-testid="cv4-mission-chip">
      <span className="cv4-mission-chip">
        <span className="cv4-mission-chip__dot" />
        <span className="cv4-mission-chip__label">{project.name}</span>
        <span className="cv4-mission-chip__name">{m.name}</span>
        <button
          type="button"
          className="cv4-mission-chip__x"
          onClick={onClear}
          aria-label="Clear mission"
          title="Clear mission"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </span>
    </div>
  )
}

// ── Loading splash ────────────────────────────────────────────────────────────

function LoadingSplash() {
  return (
    <div
      data-testid="cv4-loading"
      className="flex h-[100dvh] w-full flex-col items-center justify-center bg-[#06090F]"
    >
      <style>{`@keyframes cv4LoaderBar{0%{width:0%}100%{width:100%}}`}</style>
      <div className="mb-8 text-[32px] font-extrabold tracking-tight text-aom-text-light" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
        Corner<span className="text-emerald-500">.</span>
      </div>
      <div className="mb-4 h-0.5 w-[200px] overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ animation: 'cv4LoaderBar 2s ease-in-out infinite' }} />
      </div>
      <div className="text-[13px] font-medium text-slate-500">Loading your workspace…</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CornerV4() {
  const [currentUser, setCurrentUser]   = useState(null)
  const [authReady, setAuthReady]       = useState(false)
  const [worldId, setWorldId]           = useState(null)
  const [unreadChat, setUnreadChat]     = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [conversationTarget, setConversationTarget] = useState(null)
  const [prefillMessage, setPrefillMessage] = useState(null)
  const [rightRailOpen, setRightRailOpen] = useState(false)
  const [worldSwitcherOpen, setWorldSwitcherOpen] = useState(false)
  // R-CV4-3: mission attachment. Shape: { project: {slug, name}, mission: {slug, name, status} } or null.
  const [selectedMission, setSelectedMission] = useState(null)

  const stageFilesRef = useRef(null)
  const [toast, setToast] = useState({ visible: false, message: '' })
  const showToast = useCallback((message) => setToast({ visible: true, message }), [])
  const prevDoneIdsRef = useRef(null)

  useEffect(() => {
    console.log('CornerV4 mounted')
  }, [])

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

  // User identity for multi-user message tracking
  const parentUserIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id])

  const { queued, rightNow, waiting, done, allTasks, refresh: refreshTasks, addOptimisticTask } = useTasks(worldId)

  // Detect newly completed tasks → toast
  useEffect(() => {
    if (!done) return
    if (prevDoneIdsRef.current === null) {
      prevDoneIdsRef.current = new Set(done.map(t => t.id))
      return
    }
    const newDone = done.filter(t => !prevDoneIdsRef.current.has(t.id))
    if (newDone.length > 0) {
      const task = newDone[0]
      const title = task.title || task.text || 'Task'
      const label = title.length > 45 ? title.slice(0, 45) + '…' : title
      const wasBuilt = task.qa_score != null && task.qa_score > 0
      setToast({ visible: true, message: `${label} ${wasBuilt ? 'shipped.' : 'done.'}` })
    }
    prevDoneIdsRef.current = new Set(done.map(t => t.id))
  }, [done])

  const currentUserSlug = useCurrentUserSlug(currentUser, worldId)
  const { agents, inboxItems, projectRooms, personalTodos } = useDataPipe(null, worldId, currentUserSlug)

  // Telephone mode
  const telephone = useTelephone({
    worldId,
    agents,
    selectedAgent,
    userIdentity: parentUserIdentity,
  })
  const [phoneOverlayOpen, setPhoneOverlayOpen] = useState(false)
  const [cutsceneItems, setCutsceneItems] = useState([])
  const cutsceneShownRef = useRef(false)

  useEffect(() => {
    if (!telephone.lastTranscript || telephone.isRecording || telephone.isTranscribing) return
    showToast('Transcript sent.')
    const t = setTimeout(() => setPhoneOverlayOpen(false), 2000)
    return () => clearTimeout(t)
  }, [telephone.lastTranscript, telephone.isRecording, telephone.isTranscribing])

  // Stale-nudge cutscene fetch
  useEffect(() => {
    if (!worldId || cutsceneShownRef.current) return
    cutsceneShownRef.current = true

    const fetchCutsceneItems = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, timestamp, text, metadata')
          .eq('client_id', worldId)
          .eq('source', 'stale-project-nudge')
          .order('timestamp', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching cutscene items:', error)
          return
        }

        const unresolved = (data || []).filter(item => !item.metadata?.action_resolved_at)
        setCutsceneItems(unresolved)
      } catch (err) {
        console.error('Cutscene fetch error:', err)
      }
    }

    fetchCutsceneItems()
  }, [worldId])

  const activeTaskCount = (queued?.length || 0) + (rightNow?.length || 0)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }

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

  // Unread chat count via realtime
  useEffect(() => {
    if (!supabase) return
    setUnreadChat(0)
    const channel = supabase
      .channel(`cornerv4-messages-${worldId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        () => setUnreadChat(prev => prev + 1)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [worldId])

  // ── Selection handlers ────────────────────────────────────────────────────

  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(agent)
    setConversationTarget(agent ? { name: agent.name, type: 'agent', slug: agent.slug } : null)
    setUnreadChat(0)
  }, [])

  const handleSelectProject = useCallback((project) => {
    setSelectedAgent(null)
    setConversationTarget({ name: project.name, type: 'project', slug: project.slug })
    setUnreadChat(0)
    // Clear mission when switching project unless caller will set one immediately.
    setSelectedMission((prev) => (prev?.project?.slug === project.slug ? prev : null))
  }, [])

  // R-CV4-3: mission selection from sidebar. Opens the project conversation and
  // pins the mission as the next-message context (visual chip above composer,
  // background metadata via CornerNav so the send path can attach mission_slug).
  const handleSelectMission = useCallback(({ project, mission }) => {
    if (!project || !mission) return
    setSelectedAgent(null)
    setConversationTarget({ name: project.name, type: 'project', slug: project.slug })
    setSelectedMission({ project, mission })
    setUnreadChat(0)
  }, [])

  const handleClearMission = useCallback(() => {
    setSelectedMission(null)
  }, [])

  const selectedMissionKey = selectedMission
    ? `${selectedMission.project.slug}:${selectedMission.mission.slug}`
    : null

  const handleBackFromConversation = useCallback(() => {
    setSelectedAgent(null)
    setConversationTarget(null)
    setSelectedMission(null)
  }, [])

  const handleGoHome = useCallback(() => {
    setSelectedAgent(null)
    setConversationTarget(null)
    setSelectedMission(null)
    setUnreadChat(0)
  }, [])

  const handleNewThread = useCallback(() => {
    // Mimic ChatGPT "new chat" — clear conversation, focus the composer.
    setSelectedAgent(null)
    setConversationTarget(null)
    setSelectedMission(null)
  }, [])

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

  // ── Phone recording toggle ────────────────────────────────────────────────

  const handleTogglePhoneRecording = useCallback(() => {
    if (!telephone.isRecording && !telephone.isTranscribing) {
      setPhoneOverlayOpen(true)
    }
    telephone.toggle()
  }, [telephone])

  // ── Cutscene action handler ───────────────────────────────────────────────

  const handleCutsceneAction = useCallback(async (itemId, actionType) => {
    try {
      const response = await authFetch('/api/dashboard/cutscene-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          item_type: 'stale_nudge',
          action: actionType,
          user_id: currentUser.id,
        }),
      })
      if (!response.ok) {
        console.error('Cutscene action failed:', response.statusText)
      }
    } catch (err) {
      console.error('Cutscene action error:', err)
    }
  }, [currentUser?.id])

  // ── Memoized provider values ──────────────────────────────────────────────

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
    // tab is vestigial under CV4 — chat is always rendered; keep stable so
    // descendants reading useCornerNav().tab don't blow up.
    tab: 'chat',
    setTab: () => {},
    handleTabChange: () => {},
    selectedAgent, conversationTarget,
    handleSelectAgent, handleSelectProject, handleBackFromConversation,
    prefillMessage, setPrefillMessage,
    stageFilesRef,
    // R-CV4-3: mission attachment for next-message metadata. Send paths that
    // read this (CV4-aware send wrapper, future) attach mission_slug +
    // mission_project_slug into outgoing message metadata.
    selectedMission, clearMission: handleClearMission,
  }), [selectedAgent, conversationTarget, handleSelectAgent, handleSelectProject, handleBackFromConversation, prefillMessage, stageFilesRef, selectedMission, handleClearMission])

  // ── Render ────────────────────────────────────────────────────────────────

  if (!authReady || (!!supabase && !currentUser && typeof window !== 'undefined')) {
    return <LoadingSplash />
  }

  return (
    <CornerAuthProvider value={authValue}>
      <CornerDataProvider value={dataValue}>
        <CornerNavProvider value={navValue}>
          <LiveCallProvider>
            <div
              data-cv4=""
              data-testid="cv4-root"
              className="flex h-[100dvh] w-full overflow-hidden"
            >
              {/* LEFT — Sidebar */}
              <Sidebar
                onOpenWorldSwitcher={() => setWorldSwitcherOpen(true)}
                onNewThread={handleNewThread}
                onGoHome={handleGoHome}
                onSelectMission={handleSelectMission}
                selectedMissionKey={selectedMissionKey}
              />

              {/* CENTER — TopBar + Chat */}
              <main className="flex min-w-0 flex-1 flex-col">
                <TopBar
                  onTogglePhoneRecording={handleTogglePhoneRecording}
                  isPhoneRecording={telephone.isRecording}
                  isPhoneTranscribing={telephone.isTranscribing}
                  onToggleRightRail={() => setRightRailOpen((o) => !o)}
                  rightRailOpen={rightRailOpen}
                  activeTaskCount={activeTaskCount}
                />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ position: 'relative' }}>
                  <ChatPanel key={selectedAgent?.slug || conversationTarget?.slug || 'home'} />
                  {selectedMission && (
                    <MissionChip
                      mission={selectedMission}
                      onClear={handleClearMission}
                    />
                  )}
                </div>
              </main>

              {/* RIGHT — collapsible Tasks rail */}
              <RightRail open={rightRailOpen} onClose={() => setRightRailOpen(false)} />

              {/* Overlays */}
              <WorldSwitcherModal
                open={worldSwitcherOpen}
                onClose={() => setWorldSwitcherOpen(false)}
                onEnterWorld={handleEnterWorld}
                onReturnToMyWorld={handleReturnToMyWorld}
              />

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

              {cutsceneItems.length > 0 && (
                <CutsceneOverlay
                  items={cutsceneItems}
                  onAction={handleCutsceneAction}
                  onClose={() => setCutsceneItems([])}
                />
              )}

              <TaskCompletionToast
                message={toast.message}
                visible={toast.visible}
                onDismiss={() => setToast(t => ({ ...t, visible: false }))}
              />

              <FloatingCallBar />
            </div>
          </LiveCallProvider>
        </CornerNavProvider>
      </CornerDataProvider>
    </CornerAuthProvider>
  )
}
