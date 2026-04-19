// Worktree isolation verified.
// CornerV3.jsx -- Dashboard v2: Two-row nav + world switcher
// Route: /dashboard/v2
//
// Layout:
//   Row 1: AOM logo | WorldSelector | bell icon + user avatar
//   Row 2: Chat (badge) / Tasks (badge) tabs
//
// All styling is inline -- no CSS modules.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import skillsData from '../data/skills.json'
import { supabase } from './lib/supabase.js'
import {
  getClientId,
  setClientIdFromUser,
  setWorldOverride,
  getUserWorld,
} from './lib/clientConfig.js'
import { useTasks } from './hooks/useTasks'
import { useDataPipe } from './hooks/useDataPipe'
import { C } from './lib/cv3Colors.js'
import { AomLogo } from './components/cv3/icons.jsx'
import { Badge, Tab, BellIcon } from './components/cv3/shared.jsx'
import { HomeIcon, TasksIcon, ChatIcon } from './components/cv3/icons.jsx'
import UserAvatar from './components/cv3/UserAvatar.jsx'
import TasksPanel from './components/cv3/TasksPanel.jsx'
import ChatPanel from './components/cv3/ChatPanel.jsx'
import WorldSelector from './components/WorldSelector.jsx'
import VoiceChat from './components/VoiceChat.jsx'
import {
  CornerAuthProvider,
  CornerDataProvider,
  CornerNavProvider,
} from './CornerContext.jsx'

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

export default function CornerV3() {
  const [currentUser, setCurrentUser]   = useState(null)
  const [authReady, setAuthReady]       = useState(false)
  const [worldId, setWorldId]           = useState(null)
  const [tab, setTab]                   = useState('chat')
  const [unreadChat, setUnreadChat]     = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [conversationTarget, setConversationTarget] = useState(null) // { name, type: 'agent'|'project' }
  const [prefillMessage, setPrefillMessage] = useState(null)
  const [inputBarText, setInputBarText] = useState('')
  const [inputBarSending, setInputBarSending] = useState(false)
  const [inputBarFocused, setInputBarFocused] = useState(false)
  const [rootVoiceActive, setRootVoiceActive] = useState(false)
  const [rootVoiceStatus, setRootVoiceStatus] = useState('idle')
  const [rootVoiceMuted, setRootVoiceMuted]   = useState(false)
  const [rootVoiceTranscript, setRootVoiceTranscript] = useState('')
  const rootVoiceChatRef = useRef(null)
  // Wired by ChatPanel to sendAgentText so voice-end summary reaches the agent thread.
  const rootVoiceSummaryRef = useRef(null)
  // Attach: stageFilesRef is set by ChatPanel to its useChatAttachments.stageFiles;
  // homeFileInputRef triggers the OS file picker from the home-tab toolbar.
  const stageFilesRef = useRef(null)
  const homeFileInputRef = useRef(null)
  const [showCommandsModal, setShowCommandsModal] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  const [toast, setToast] = useState({ visible: false, message: '' })
  const showToast = useCallback((message) => setToast({ visible: true, message }), [])
  const prevDoneIdsRef = useRef(null)

  useEffect(() => {
    console.log('CornerV3 mounted')
    const handleResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
  // useDataPipe provides agents (with realtime status), inboxItems, projectRooms (from agent_status)
  const { agents, inboxItems, projectRooms } = useDataPipe(null, worldId)
  // tabRef keeps the realtime callback fresh without resubscribing on every tab change
  const tabRef = useRef(tab)

  // Active task count: queued + building/qa
  const activeTaskCount = (queued?.length || 0) + (rightNow?.length || 0)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) return

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

  // Clear unread when switching to chat; Home tab always clears conversation
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab)
    if (newTab === 'chat') {
      setUnreadChat(0)
      setSelectedAgent(null)
      setConversationTarget(null)
    }
  }, [])

  // Select an agent and switch to chat tab
  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(agent)
    setConversationTarget({ name: agent.name, type: 'agent' })
    setTab('chat')
    setUnreadChat(0)
  }, [])

  // Called by ChatPanel when a project is selected
  const handleSelectProject = useCallback((project) => {
    setSelectedAgent(null)
    setConversationTarget({ name: project.name, type: 'project' })
    setTab('chat')
    setUnreadChat(0)
  }, [])

  // Called by ChatPanel back button — clear conversation
  const handleBackFromConversation = useCallback(() => {
    setSelectedAgent(null)
    setConversationTarget(null)
  }, [])

  // ── World switching ───────────────────────────────────────────────────────

  const handleEnterWorld = useCallback((world) => {
    setWorldOverride(world.world)
    setWorldId(world.world)
    setSelectedAgent(null)
    setConversationTarget(null)
    prevDoneIdsRef.current = null
  }, [])

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
      const target = selectedAgent || agents?.find(a => a.slug === 'rex') || agents?.[0]
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
    const target = selectedAgent || agents?.find(a => a.slug === 'rex') || agents?.[0]
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
      await fetch('/api/dashboard/supabase-messages', {
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
  const authValue = useMemo(() => ({
    currentUser, setCurrentUser,
    worldId,
    showToast,
  }), [currentUser, worldId, showToast])

  const dataValue = useMemo(() => ({
    agents, inboxItems, projectRooms,
    queued, rightNow, waiting, done, allTasks,
    refreshTasks, addOptimisticTask,
  }), [agents, inboxItems, projectRooms, queued, rightNow, waiting, done, allTasks, refreshTasks, addOptimisticTask])

  const navValue = useMemo(() => ({
    tab, setTab, handleTabChange,
    selectedAgent, conversationTarget,
    handleSelectAgent, handleSelectProject, handleBackFromConversation,
    prefillMessage, setPrefillMessage,
    rootVoiceSummaryRef,
    stageFilesRef,
  }), [tab, handleTabChange, selectedAgent, conversationTarget, handleSelectAgent, handleSelectProject, handleBackFromConversation, prefillMessage, rootVoiceSummaryRef, stageFilesRef])

  // ── Render ────────────────────────────────────────────────────────────────

  // Wait for auth to resolve AND world to be set before rendering
  // This prevents hooks from fetching with the wrong client_id (e.g. 'aom' default)
  if (!authReady || (!currentUser && typeof window !== 'undefined')) {
    return (
      <div style={{ width: '100%', height: '100dvh', background: '#060A14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <style>{`@keyframes cvLoaderBar { 0% { width: 0%; } 100% { width: 100%; } } @keyframes cvSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: 32 }}>
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
    <div style={{
      width: '100%',
      height: '100dvh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── NAV BAR ────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        style={{
          width: '100%',
          flexShrink: 0,
          background: C.bg,
          borderBottom: '1px solid ' + C.border,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >

        {/* Row 1: Logo + World (left) | Bell + Avatar (right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px 0',
        }}>
          {/* Left: Logo + World switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AomLogo />
            <WorldSelector
              currentWorldId={worldId}
              currentUser={currentUser}
              onEnterWorld={handleEnterWorld}
              onReturnToMyWorld={handleReturnToMyWorld}
              isNightMode={true}
              isMobile={false}
            />
          </div>

          {/* Right: Bell + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellIcon hasNew={unreadChat > 0} />
            <UserAvatar user={currentUser} onUserUpdate={setCurrentUser} />
          </div>
        </div>

        {/* Row 2: Tabs (left) | Stats (right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            <Tab
              label={conversationTarget ? 'Chat' : 'Home'}
              icon={conversationTarget
                ? <ChatIcon color={tab === 'chat' ? C.text : C.muted} />
                : <HomeIcon color={tab === 'chat' ? C.text : C.muted} />
              }
              active={tab === 'chat'}
              onClick={() => handleTabChange('chat')}
              badge={<Badge count={unreadChat} />}
            />
            <Tab
              label="Tasks"
              icon={<TasksIcon color={tab === 'tasks' ? C.text : C.muted} />}
              active={tab === 'tasks'}
              onClick={() => handleTabChange('tasks')}
              badge={<Badge count={activeTaskCount} color={C.yellow} />}
            />
          </div>

          {/* Nav stats: hidden on mobile (< 480px) */}
          <div style={{
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, flexShrink: 0 }} />
              <b style={{ color: C.text2 }}>{rightNow?.length || 0}</b> building
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
              <b style={{ color: C.text2 }}>{done?.length || 0}</b> done
            </span>
          </div>
        </div>

      </nav>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'tasks' && <TasksPanel />}
        {tab === 'chat'  && <ChatPanel key={selectedAgent?.slug || 'chat'} />}
      </div>

      {/* ── ROOT VOICE MODE (replaces input bar when active on home/tasks tabs) */}
      {rootVoiceActive && tab !== 'chat' && (
        <>
          <style>{`@keyframes vw-root { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }`}</style>
          {/* Hidden VoiceChat for audio logic */}
          <div style={{ display: 'none' }}>
            <VoiceChat
              ref={rootVoiceChatRef}
              agentSlug={(selectedAgent || agents?.find(a => a.slug === 'rex') || agents?.[0])?.slug || 'rex'}
              agentColor={C.accent}
              clientId={worldId}
              autoStart={true}
              onTranscript={(text) => setRootVoiceTranscript(text)}
              onStatusChange={(s) => {
                setRootVoiceStatus(s)
                if (s === 'idle') {
                  setRootVoiceActive(false)
                  setRootVoiceMuted(false)
                  setRootVoiceTranscript('')
                  // Voice ended from root -- navigate to Rex and send summary request
                  const rex = agents?.find(a => a.slug === 'rex') || agents?.[0]
                  if (rex) {
                    setSelectedAgent(rex)
                    setConversationTarget({ name: rex.name, type: 'agent' })
                    setTab('chat')
                    setTimeout(() => {
                      if (rootVoiceSummaryRef.current) {
                        rootVoiceSummaryRef.current('[Voice conversation just ended] Review our voice conversation above. Post a brief summary of what we discussed and any decisions made. If there are action items or tasks that should be created, create them now. Do not ask for permission -- just summarize and queue any tasks that came up.')
                      }
                    }, 2000)
                  }
                }
              }}
            />
          </div>
          {/* Voice mode UI */}
          <div style={{
            flexShrink: 0,
            padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
            background: C.bg2,
            borderTop: '1px solid ' + C.border,
          }}>
            {/* Waveform bars */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40, marginBottom: 8 }}>
              {[
                { h: 14, d: '0s' }, { h: 26, d: '.08s' }, { h: 38, d: '.16s' },
                { h: 30, d: '.24s' }, { h: 18, d: '.32s' }, { h: 34, d: '.12s' },
                { h: 22, d: '.20s' }, { h: 40, d: '.28s' }, { h: 16, d: '.36s' },
              ].map((bar, i) => (
                <div key={i} style={{
                  width: 3, height: bar.h, borderRadius: 2,
                  background: C.accent,
                  animation: `vw-root 1s ease-in-out ${bar.d} infinite`,
                }} />
              ))}
            </div>
            {/* Status */}
            <div style={{
              textAlign: 'center', fontSize: 12, fontWeight: 600,
              color: C.accent, fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 4,
            }}>
              {rootVoiceStatus === 'connecting' ? 'Connecting...'
                : rootVoiceStatus === 'speaking' ? 'Speaking...'
                : rootVoiceStatus === 'error' ? 'Error'
                : 'Listening...'}
            </div>
            {/* Transcript */}
            <div style={{
              fontSize: 13, color: C.text2, textAlign: 'center',
              minHeight: 18, padding: '0 20px',
            }}>
              {rootVoiceTranscript ? `"${rootVoiceTranscript}"` : ''}
            </div>
            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10 }}>
              {/* Mute */}
              <button
                onClick={() => { rootVoiceChatRef.current?.toggleMute(); setRootVoiceMuted(v => !v) }}
                style={{
                  width: 42, height: 42, borderRadius: '50%',
                  border: '1px solid ' + C.border,
                  background: rootVoiceMuted ? 'rgba(239,68,68,0.15)' : C.s2,
                  color: rootVoiceMuted ? '#F87171' : C.muted,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
                }}
              >M</button>
              {/* End */}
              <button
                onClick={() => {
                  rootVoiceChatRef.current?.stop()
                  setRootVoiceActive(false)
                  setRootVoiceMuted(false)
                  setRootVoiceTranscript('')
                }}
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: 'none',
                  background: C.red, color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
                }}
              >&#x00D7;</button>
            </div>
          </div>
        </>
      )}

      {/* ── INPUT BAR (persistent -- hidden on chat tab or when root voice is active) */}
      <div style={{
        flexShrink: 0,
        padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: '1px solid ' + C.border,
        display: (tab === 'chat' || tab === 'tasks' || rootVoiceActive) ? 'none' : undefined,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: C.s1,
          border: '1.5px solid ' + (inputBarFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 16px',
          maxWidth: 560,
          margin: '0 auto',
          boxShadow: inputBarFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>
          <input
            type="text"
            placeholder="Start typing or speaking..."
            value={inputBarText}
            onChange={e => setInputBarText(e.target.value)}
            onFocus={() => { setInputBarFocused(true); handleInputBarFocus() }}
            onBlur={() => setInputBarFocused(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInputBarSend() } }}
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
          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Hidden file input for home-tab attach flow */}
            <input
              type="file"
              multiple
              ref={homeFileInputRef}
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files?.length) {
                  stageFilesRef.current?.(e.target.files)
                  setTab('chat')
                  setUnreadChat(0)
                }
                e.target.value = ''
              }}
            />
            {/* Attach */}
            <button
              title="Attach"
              onClick={() => homeFileInputRef.current?.click()}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            {/* Commands */}
            <button
              title="Commands"
              onClick={() => setShowCommandsModal(true)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </button>
          </div>
          {/* Mic (hidden when text present) */}
          {!inputBarText.trim() && (
            <button title="Voice" onClick={() => setRootVoiceActive(true)} style={{
              width: 42, height: 42, borderRadius: '50%',
              background: C.accent, border: 'none',
              color: '#000', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'transform 0.15s, box-shadow 0.2s',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
          )}
          {/* Send (shown when text present) */}
          {inputBarText.trim() && (
            <button
              title="Send"
              onClick={handleInputBarSend}
              disabled={inputBarSending}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent, border: 'none',
                color: '#000', cursor: inputBarSending ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                opacity: inputBarSending ? 0.6 : 1,
                transition: 'transform 0.15s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

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

      {/* ── TOAST NOTIFICATION ────────────────────────────────────────────── */}
      <TaskCompletionToast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />

    </div>
        </CornerNavProvider>
      </CornerDataProvider>
    </CornerAuthProvider>
  )
}
