// Corner: Game HUD v4 (BLUE + LARGER + GAME FEEL)
// Patrik directive: BLUE HUD. Cool blue glass panel. The warm office glows orange behind it.
// The contrast makes both pop. LARGER on desktop. Game scale, not web app scale.
// Chat + HUD = ONE unified element.
//
// DONE(bobby2): Checkbox persistence -- clicking a task checkbox writes back to punch-list.md via /api/local/punch-toggle
// TODO(patrik): Drag-to-reorder project pills in the HUD strip (Trello card energy) [SURVIVES: HUD overlay is React UI. Pills sit on top of engine canvas.]
// TODO(bobby): DRAG-TO-RIGHT-NOW -- Drag any task from Today/project pills and drop it onto the "Right Now" pill to push it to the top of priority queue. Visual: Right Now pill glows as drop target when dragging. On drop, task moves to Right Now list and gets a time estimate badge. This is how Patrik says "do this NOW." Ref: Patrik feedback Pass 21. [SURVIVES: HUD interaction layer. Engine-independent.]
// TODO(patrik): Project pill context menu -- right-click to jump to checklist filtered by project [SURVIVES: UI overlay.]
// TODO(patrik): Mobile HUD swipe-up gesture to expand task panel (game feel) [SURVIVES: Touch gesture on HUD overlay. Engine handles canvas, HUD handles UI.]
// TODO(patrik): KILL BOTTOM BAR ENTIRELY -- Dream HUD target says NO bottom bar. Layout = top bar + sidebar ONLY. Project pills move to top bar (scrollable). Minimap, agent portrait, notification icons all in top bar. Bottom bar is gone. Ref: Patrik directive lines 170-182. [SURVIVES: HUD layout decision. Engine swap doesn't affect bar structure.]
// DONE(bobby): "RIGHT NOW" PILL -- Right Now pill LIVE. Pulls running agents from active-missions.md (3s poll). Pinned first. Orange/fire color. Pulsing glow. REMAINING: drag-to-right-now (see TODO(bobby) DRAG-TO-RIGHT-NOW below), time estimates per task.
// DONE(bobby2): Bottom bar cleanup -- chat input + chat button REMOVED from bottom bar. Project pills now horizontally scrollable (no wrapping). Bottom bar = agent roster | scrollable project pills | compact stats | notification bell. No chat elements.
// DONE(bobby2): Project pill category labels -- pills now show category text (CLIENT / PROJECT / OUTREACH) not color-status text. Color communicates status visually, text label tells you WHAT it is.
// DONE(bobby2): LABEL ALL COUNTERS -- Every bare number labeled. ProjectCard: "{remaining} tasks". CompactStats: "{working} active" / "{blocked} blocked". Progress ring: "{overallProgress}%". Ref: Patrik feedback Pass 22.
// DONE(bobby2): DAYTIME BOTTOM HUD THEME -- Bottom HUD now accepts isNightMode prop. Daytime = white glass with vibrant blue accents (matches top bar). Night = dark blue glass. Both bars feel like the same system. Ref: Patrik feedback Pass 22.
// DONE(bobby2): AGENT SELECTOR ICONS BIGGER -- Expanded agent dots bumped 24px -> 40px. Expand button 28px -> 36px. Sprite images proportionally scaled. Main plumbob stays 52px. Vegas energy = big, bold, readable. Ref: Patrik feedback Pass 22.
// DONE(bobby2): SQUINT TEST (VEGAS RULE) -- CompactStats dots 7px -> 10px. Main agent status dot 10px -> 14px. Expand button 28px -> 36px. All secondary agents 24px -> 40px. Standing rule for all future elements. Ref: Patrik feedback Pass 22.
// DONE(bobby2): DAYTIME STAT PILL TEXT COLOR -- ProjectCard now receives isNightMode. Pill name text swaps to dark (#0F172A) in daytime. Pill backgrounds + borders + shadows all adjusted for light theme. Tag colors and revenue badge already use project.color so they remain readable. [SURVIVES: CSS/theme bug. Engine-independent.]
//
// FILE OWNER: Bobby2 (HUD team). Bobby (Canvas team) does NOT touch this file.
//
// ========== PATRIK DIRECTIVES (Pass 25, lines 258-263) ==========
// DONE(bobby2): LIVE TASK UPDATES IN HUD (KEY KEY KEY) -- useAutoCheckFromNotifications() polls agent-notifications.md every 3s, extracts TASK FINISHED/SHIPPED/DELIVERED descriptions, fuzzy-matches against punch-list task text (2+ keyword overlap), and auto-checks matching items in the UI (optimistic). Priority sort: Right Now > Today > by-importance. Auto-checked items get autoChecked flag for distinct styling. Ref: Patrik feedback line 258-259, 263.
// DONE(bobby2): SELECTED PILL CONTRAST BUG (REGRESSION) -- Fixed. Expanded pill in daytime now uses #1E293B (dark slate) instead of project.color which could be light. Always readable on white/light backgrounds. Ref: Patrik feedback line 258, 260.
// DONE(bobby2): RIGHT NOW PILL REDESIGNED -- Per Patrik correction: Right Now = ONLY running agents, not progress bars. Fake percentages removed. Live pulse bar replaces progress bar. Agent avatar + task name + LIVE badge. Completed tasks moved to separate "Completed" feed section below. Ref: Patrik correction overriding line 253.
// DONE(bobby2): KILL MINIMAP -- No minimap rendered in GameHUD. MiniMap component lives in GameDashboard (separate file owner). GameHUD is clean. Ref: Patrik directive line 267.
// DONE(bobby2): RIGHT NOW PILL COLOR = ORANGE/FIRE -- Changed from green (#3BFF6B) to orange (#FF6B3D) matching Today's fire energy. Updated SECTION_MAP, LIVE badge, synthetic pill, all Right Now rendering. Ref: Patrik feedback line 273.
// DONE(bobby2): RIGHT NOW DATA FRESHNESS -- useRightNowLiveTasks polls every 3s (was 8s). Right Now is now the freshest data on screen, beating notifications (8s) and punch-list (5s). Ref: Patrik feedback line 273.
// DONE(bobby2): DAYTIME WHITE EXTENDS TO RIGHT NOW -- TaskPanel now accepts isNightMode. Daytime = white glass (rgba(248,250,255,0.96)), blue accents, dark text. Same theme system as bottom HUD bar. One switch, everything flips. Ref: Patrik feedback line 274.
// DONE(bobby2): DARK MODE SWITCH AT 8PM -- GameHUD overrides isNightMode prop with own 8pm check (was 9pm in GameDashboard). Ref: Patrik directive.
// DONE(bobby2): SELECTED PILL CONTRAST FIX -- Expanded pill in daytime now uses dark text (#1E293B) instead of project.color which could be too light. Ref: Patrik feedback line 258, 260.
// ==========
//
// ========== TASK LIFECYCLE (Pass 27) ==========
// DONE(bobby2): THREE-TIER TASK LIFECYCLE -- Right Now (live), Your TODOs (blocked/Patrik), Finish These (stale).
// (1) RIGHT NOW = Real-time active tasks. Agents doing work THIS SECOND. Orange/fire energy, LIVE badges, progress bars. Polls 3s.
// (2) YOUR TODOS = Patrik's personal TODO list. Tasks tagged [Patrik] from punch-list. Red accent, checkbox energy, NEEDS YOU badge.
// (3) FINISH THESE = Stale tasks (was "Checking In"). Gray/amber, muted, STALE badge. Nudge to reassign or close.
// usePatrikTodos() scans punch-list for [Patrik] tagged items. useCheckingInTasks() finds stale blocked items.
// Sort order: Right Now > Your TODOs > Schedule > rest by recency > Finish These last.
// ==========
//
// ========== PATRIK DIRECTIVES (Pass 28, latest feedback) ==========
// TODO(patrik): PILL ARCHITECTURE (HUD) -- Below the 4 top squares, project pills auto-populate from context. Overflow with LEFT/RIGHT ARROWS to scroll. SEARCH BAR = instant pill add. Tasks can live in MULTIPLE pills simultaneously (e.g., "Bobby: chat cleanup" in both "Corner" and "Right Now"). Ref: bobby/last-conversation.md items 15 + 15b.
// TODO(patrik): DATA SYNC RULE (HUD) -- All data syncs to proper place. Pills are LIVE VIEWS. Task completed = Right Now removes + completed feed gets + project pill updates. 3s poll keeps fresh. No data in only one place. Ref: bobby/last-conversation.md Data Sync Rule.
// ==========
//
// ---- GOD FILE SPLIT (6/6) ---------------------------------------------------
// This file is now a shell. All extracted components live in src/dashboard/components/.
// HUDConstants.jsx   -- PALETTE, IS_LOCAL, HUD, STATUS_DOT, parsePunchList,
//                       DEFAULT_RECENCY_WEIGHTS, useConversationRecency, DEFAULT_MAIN_AGENT
// AgentRevolver.jsx  -- PlumbobClipDef, AgentPortrait, AgentRoster, SPRITE_AGENTS
// ProjectCard.jsx    -- ProjectCard
// TaskPanel.jsx      -- TaskPanel
// CompactStats.jsx   -- CompactStats, hudCtxBtn

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, Loader2, CheckCircle2, Search } from 'lucide-react'
import { HUDBellButton, HUDToasts, HUD_NOTIFICATION_STYLES } from './HUDNotifications.jsx'
import { useDataPipe } from './hooks/useDataPipe.js'
import {
  HUD,
  parsePunchList,
  useConversationRecency,
  DEFAULT_RECENCY_WEIGHTS,
} from './components/HUDConstants.jsx'
import { TaskPanel } from './components/TaskPanel.jsx'
import { ProjectCard } from './components/ProjectCard.jsx'
import { hudCtxBtn } from './components/CompactStats.jsx'

// ---- MAIN HUD ---------------------------------------------------------------
// DONE(bobby2): Chat input REMOVED from bottom bar per Patrik directive. Chat lives ONLY in sidebar.
// Bottom bar = agent roster | scrollable project pills | compact stats | notification bell
export default function GameHUD({
  agentStatus, throughput, onAgentClick, isMobile, isTablet,
  // Chat integration props (onExpandChat still used for bell/notification click -> open sidebar)
  chatAgent, onChatSubmit, onExpandChat,
  // Context menu props
  onAgentContextMenu, onProjectContextMenu,
  // Daytime/nighttime theme -- when false, bottom HUD goes white/vibrant blue to match top bar
  isNightMode: isNightModeProp,
}) {
  // Override: HUD switches to night at 8pm AZ time (GameDashboard uses 9pm, but HUD owns its own threshold)
  const [nightOverride, setNightOverride] = useState(() => new Date().getHours() >= 20)
  useEffect(() => {
    const check = () => setNightOverride(new Date().getHours() >= 20)
    const timer = setInterval(check, 60000)
    return () => clearInterval(timer)
  }, [])
  const isNightMode = nightOverride || isNightModeProp

  // Task right-click context menu (lifted from TaskPanel so it renders outside overflow containers)
  const [hudTaskCtx, setHudTaskCtx] = useState(null)
  useEffect(() => {
    if (!hudTaskCtx) return
    // Delay listener so the originating right-click event doesn't immediately close the menu
    const timer = setTimeout(() => {
      const handler = (e) => {
        // Don't close if clicking inside the menu itself
        const menu = document.querySelector('[data-hud-ctx-menu]')
        if (menu && menu.contains(e.target)) return
        setHudTaskCtx(null)
      }
      document.addEventListener('mousedown', handler)
      // Store cleanup ref
      hudTaskCtx._cleanup = () => document.removeEventListener('mousedown', handler)
    }, 50)
    return () => {
      clearTimeout(timer)
      hudTaskCtx._cleanup?.()
    }
  }, [hudTaskCtx])

  // Daytime palette: brighter blue glass with vibrant accents (distinct from night)
  const isDaytime = isNightMode === false
  const hudPanelBg = isDaytime ? 'rgba(18, 42, 75, 0.95)' : HUD.panelBg
  const hudPanelBorder = isDaytime ? 'rgba(59, 130, 246, 0.3)' : HUD.panelBorder
  const hudPanelShadow = isDaytime
    ? '0 -8px 48px rgba(0,0,0,0.3), 0 -2px 0 rgba(59,130,246,0.2), inset 0 1px 0 rgba(100,180,255,0.12)'
    : HUD.panelShadow
  const hudBlueOverlay = isDaytime
    ? 'linear-gradient(180deg, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.04) 50%, transparent 100%)'
    : HUD.blueOverlay
  const hudDivider = isDaytime ? 'rgba(100, 180, 255, 0.18)' : HUD.divider
  const hudTextPrimary = isDaytime ? '#F1F5F9' : HUD.textPrimary
  const hudTextMuted = isDaytime ? '#94B8D8' : HUD.textMuted
  const hudAccent = isDaytime ? '#60A5FA' : HUD.accent
  const [expandedProject, setExpandedProject] = useState(null)
  const [highlightedTask, setHighlightedTask] = useState(null) // { text: string } - flash-highlight after navigating from another pill
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  // Track Right Now pill count for wiggle animation on new tasks
  const prevRightNowCountRef = useRef(0)
  const [rightNowWiggle, setRightNowWiggle] = useState(false)
  // navigateToProject uses a ref so it doesn't depend on projects useMemo (avoids ordering issue)
  const projectsRef = useRef([]);
  // useDataPipe: ONE hook, ONE poll (3s), ALL data. Replaces 6 separate polling hooks.
  const {
    rightNow: liveRightNowTasks,
    completedFeed,
    yourTodos: patrikTodos,
    finishThese: checkingInTasks,
    isAutoChecked,
    punchData,
    punchLoading: loading,
  } = useDataPipe(parsePunchList)
  const hudRef = useRef(null)
  const conversationScores = useConversationRecency()

  // MANUAL TASKS for Right Now -- in-memory only (no localStorage until offline features built)
  const [manualTasks, setManualTasks] = useState([])

  const addManualTask = useCallback((text) => {
    setManualTasks(prev => [...prev, { id: Date.now(), text, done: false, createdAt: new Date().toISOString() }])
  }, [])

  const toggleManualTask = useCallback((id) => {
    setManualTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }, [])

  const deleteManualTask = useCallback((id) => {
    setManualTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  // Detect new Right Now tasks and trigger wiggle animation
  useEffect(() => {
    const currentCount = liveRightNowTasks.length + manualTasks.length
    if (prevRightNowCountRef.current > 0 && currentCount > prevRightNowCountRef.current) {
      setRightNowWiggle(true)
      const timer = setTimeout(() => setRightNowWiggle(false), 700)
      return () => clearTimeout(timer)
    }
    prevRightNowCountRef.current = currentCount
  }, [liveRightNowTasks.length, manualTasks.length])

  // Sort projects by CONVERSATION RECENCY first, then incomplete task count.
  // The system KNOWS what matters based on what you TALK ABOUT.
  // Uses live conversation parsing on localhost, falls back to defaults on production.
  // PATRIK CORRECTION: Right Now = ONLY running agents. Completed feed = separate activity log beneath.
  // Your TODOs pill: Patrik's personal blocked items (things only he can unblock).
  // Finish These pill: stale tasks that haven't had movement in 24+ hours.
  // Section order (Patrik directive): Right Now > Your TODOs > Schedule > Finish These
  const projects = useMemo(() => {
    const raw = punchData?.projects || []

    // Remove any punch-list "RIGHT NOW" section (we replace it with live running agents)
    let merged = raw.filter(p => p.section !== 'rightnow')

    // RIGHT NOW = ALWAYS visible. Shows live agent tasks + manual tasks + add prompt.
    // Live agent tasks get LIVE badge. Manual tasks don't. Add prompt always at end.
    const rightNowTasks = []
    // Live agent tasks first
    liveRightNowTasks.forEach(t => {
      rightNowTasks.push({
        text: `${(t.agent || '').charAt(0).toUpperCase() + (t.agent || '').slice(1)}: ${t.text}`,
        done: false,
        agent: t.agent,
        raw: '',
        isLive: true,
        isQueued: !!t.isQueued,
      })
    })
    // Manual tasks (in-memory)
    manualTasks.forEach(t => {
      rightNowTasks.push({
        text: t.text,
        done: t.done,
        agent: null,
        raw: '',
        isLive: false,
        isManual: true,
        manualId: t.id,
      })
    })
    // Always show add prompt at the end
    rightNowTasks.push({ text: '+ Add task...', done: false, agent: null, raw: '', isLive: false, isAddPrompt: true })
    merged.push({
      name: 'Right Now',
      section: 'rightnow',
      color: '#FF6B3D',
      icon: 'zap',
      tasks: rightNowTasks,
    })

    // COMPLETED FEED = simplified activity feed of recent task completions
    if (completedFeed.length > 0) {
      merged.push({
        name: 'Completed',
        section: 'completed-feed',
        color: '#22C55E',
        icon: 'check-circle',
        tasks: completedFeed.map(t => ({
          text: `${(t.agent || '').charAt(0).toUpperCase() + (t.agent || '').slice(1)} shipped ${t.text}`,
          done: true,
          agent: t.agent,
          raw: '',
          isLive: false,
          timestamp: t.timestamp,
        })),
        isCompletedFeed: true,
      })
    }

    // YOUR TODOS: Patrik's personal blocked items (things only he can unblock)
    if (patrikTodos.length > 0) {
      const existingTodos = merged.find(p => p.section === 'your-todos')
      if (!existingTodos) {
        merged.push({
          name: 'Your TODOs',
          section: 'your-todos',
          color: '#EF4444',
          icon: 'user-check',
          tasks: patrikTodos.map(t => ({
            text: t.text,
            done: false,
            agent: 'patrik',
            raw: t.raw,
            projectSource: t.project,
            projectSection: t.projectSection,
            projectColor: t.projectColor,
          })),
          isTodoList: true,
        })
      }
    }

    // FINISH THESE: Stale tasks that haven't had movement
    if (checkingInTasks.length > 0) {
      const existingStale = merged.find(p => p.section === 'finish-these')
      if (!existingStale) {
        merged.push({
          name: 'Finish These',
          section: 'finish-these',
          color: '#6B8AB0',
          icon: 'history',
          tasks: checkingInTasks.map(t => ({
            text: t.text,
            done: false,
            agent: t.agent,
            raw: t.raw,
            projectSource: t.project,
            projectSection: t.projectSection,
            projectColor: t.projectColor,
            isStale: true,
          })),
          isFinishThese: true,
        })
      }
    }

    // LIVE TASK AUTO-CHECK: mark tasks as done if they match TASK FINISHED notifications
    for (const project of merged) {
      for (const task of project.tasks) {
        if (!task.done && isAutoChecked(task.text)) {
          task.done = true
          task.autoChecked = true
        }
      }
    }

    const weights = conversationScores || DEFAULT_RECENCY_WEIGHTS
    // Sort order (Patrik directive): Right Now > Your TODOs > Schedule > Finish These > rest
    return [...merged].sort((a, b) => {
      // Right Now is always first (running agents)
      if (a.section === 'rightnow') return -1
      if (b.section === 'rightnow') return 1
      // Your TODOs second
      if (a.section === 'your-todos') return -1
      if (b.section === 'your-todos') return 1
      // Schedule third (was Today)
      if (a.section === 'schedule' || a.section === 'today') return -1
      if (b.section === 'schedule' || b.section === 'today') return 1
      // Finish These fourth (was Checking In) -- least urgent, stale stuff
      if (a.section === 'finish-these' || a.section === 'checking-in') return -1
      if (b.section === 'finish-these' || b.section === 'checking-in') return 1
      // Completed feed after the org bins
      if (a.section === 'completed-feed') return -1
      if (b.section === 'completed-feed') return 1
      // Primary: conversation-driven weight (higher = first)
      const aWeight = weights[a.section] || 10
      const bWeight = weights[b.section] || 10
      if (aWeight !== bWeight) return bWeight - aWeight
      // Secondary: incomplete tasks (more = first)
      const aRemaining = a.tasks.filter(t => !t.done).length
      const bRemaining = b.tasks.filter(t => !t.done).length
      if (bRemaining !== aRemaining) return bRemaining - aRemaining
      return b.tasks.length - a.tasks.length
    })
  }, [punchData, conversationScores, liveRightNowTasks, completedFeed, isAutoChecked, patrikTodos, checkingInTasks, manualTasks])

  // Keep ref in sync for navigateToProject callback
  projectsRef.current = projects

  // Navigate from a meta-pill (Right Now, Your TODOs, Finish These) to the source project pill
  const navigateToProject = useCallback((task) => {
    if (!task.projectSection && !task.projectSource) return
    const currentProjects = projectsRef.current
    const target = currentProjects.find(p =>
      (task.projectSection && p.section === task.projectSection) ||
      (task.projectSource && p.name === task.projectSource)
    )
    if (!target) return
    setExpandedProject(target)
    setHighlightedTask({ text: task.text })
    setTimeout(() => setHighlightedTask(null), 2500)
  }, [])

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.section.toLowerCase().includes(q) ||
      p.tasks.some(t => t.text.toLowerCase().includes(q))
    )
  }, [projects, searchQuery])

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus()
  }, [searchOpen])

  // Close panel on click outside
  useEffect(() => {
    const handler = (e) => {
      if (hudRef.current && !hudRef.current.contains(e.target)) {
        setExpandedProject(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setExpandedProject(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const totalTasks = filteredProjects.reduce((sum, p) => sum + p.tasks.length, 0)
  const totalDone = filteredProjects.reduce((sum, p) => sum + p.tasks.filter(t => t.done).length, 0)
  const overallProgress = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  // Swipe-up on HUD bar = open first pill's task panel. Swipe-down = close it.
  const hudSwipeStartY = useRef(0)
  const handleHudSwipeStart = useCallback((e) => {
    hudSwipeStartY.current = e.touches[0].clientY
  }, [])
  const handleHudSwipeEnd = useCallback((e) => {
    const deltaY = e.changedTouches[0].clientY - hudSwipeStartY.current
    if (deltaY < -50 && !expandedProject) {
      // Swipe up: open the first project pill (Right Now preferred)
      const firstPill = filteredProjects[0]
      if (firstPill) setExpandedProject(firstPill)
    } else if (deltaY > 50 && expandedProject) {
      // Swipe down: close the expanded panel
      setExpandedProject(null)
    }
  }, [expandedProject, filteredProjects])

  return (
    <div
      ref={hudRef}
      onTouchStart={handleHudSwipeStart}
      onTouchEnd={handleHudSwipeEnd}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0, right: 0,
        zIndex: 40,
        pointerEvents: 'auto',
      }}
    >
      {/* Expanded task panel */}
      <AnimatePresence>
        {expandedProject && (
          <TaskPanel
            key={expandedProject.section}
            project={expandedProject}
            onClose={() => setExpandedProject(null)}
            isNightMode={isNightMode}
            onAddManualTask={addManualTask}
            onToggleManualTask={toggleManualTask}
            onDeleteManualTask={deleteManualTask}
            allProjects={projects}
            hudTaskCtxId={hudTaskCtx?.taskId}
            onTaskContextMenu={(e, task, proj) => {
              setHudTaskCtx({ task, project: proj, taskId: task.isManual ? `manual-${task.manualId}` : task.origIdx })
            }}
            onNavigateToProject={navigateToProject}
            highlightedTask={highlightedTask}
          />
        )}
      </AnimatePresence>

      {/* The HUD panel - BLUE GLASS game panel (daytime = brighter blue glass) */}
      <div
        className="hud-panel-shimmer"
        style={{
          background: hudPanelBg,
          backdropFilter: 'blur(24px)',
          borderTop: `2px solid ${hudPanelBorder}`,
          borderLeft: `2px solid ${isDaytime ? 'rgba(59,130,246,0.3)' : 'rgba(100,180,255,0.08)'}`,
          borderRight: `2px solid ${isDaytime ? 'rgba(59,130,246,0.3)' : 'rgba(100,180,255,0.08)'}`,
          // Chunky game panel shape
          borderRadius: isMobile ? 0 : '18px 18px 0 0',
          boxShadow: hudPanelShadow,
          padding: isMobile ? '4px 8px' : '0 20px',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 4px)' : undefined,
          margin: isMobile ? 0 : '0 12px',
          // Mobile: flush bottom with no gap
          ...(isMobile ? { borderRadius: 0 } : {}),
          // Override parent's touchAction:none so HUD scrollables work
          touchAction: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
          transition: 'background 400ms ease, border-color 400ms ease, box-shadow 400ms ease',
        }}
      >
        {/* Blue glow overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          background: hudBlueOverlay,
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }} />

        {/* Blue shimmer on top border */}
        <div className="hud-border-shimmer" style={{
          position: 'absolute', top: -1, left: 24, right: 24, height: 2,
          background: isDaytime
            ? 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.25) 25%, rgba(59,130,246,0.45) 50%, rgba(59,130,246,0.25) 75%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(100,180,255,0.35) 25%, rgba(140,210,255,0.55) 50%, rgba(100,180,255,0.35) 75%, transparent 100%)',
          backgroundSize: '200% 100%',
          borderRadius: 1,
          pointerEvents: 'none',
        }} />

        {/* Subtle noise texture */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', overflow: 'hidden' }}>
          <filter id="hudNoise4">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hudNoise4)" opacity="0.015" style={{ mixBlendMode: 'overlay' }} />
        </svg>

        {/* DINER DASH TICKER -- Right Now tasks scroll left like orders coming in */}
        {(() => {
          const rightNowProject = filteredProjects.find(p => p.section === 'rightnow')
          const tickerTasks = rightNowProject?.tasks?.filter(t => !t.isAddPrompt) || []
          const hasTickerTasks = tickerTasks.length > 0
          return hasTickerTasks ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 6,
              padding: isMobile ? '4px 0 2px' : '6px 0 2px',
              minHeight: isMobile ? 36 : 42,
              position: 'relative',
              zIndex: 2,
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              touchAction: 'pan-x',
            }} className="hud-ticker-scroll">
              <Zap size={14} color="#FF6B3D" style={{ flexShrink: 0, marginLeft: 4, filter: 'drop-shadow(0 0 6px rgba(255,107,61,0.6))' }} />
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800,
                color: '#FF6B3D', letterSpacing: '0.1em', textTransform: 'uppercase',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>RIGHT NOW</span>
              <div style={{ width: 1, height: 20, background: hudDivider, flexShrink: 0 }} />
              {tickerTasks.map((task, idx) => (
                <motion.button
                  key={task.manualId || task.text || idx}
                  initial={{ opacity: 0, x: 60, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -80, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: idx * 0.04 }}
                  onClick={() => {
                    // Expand the Right Now pill to show task detail
                    setExpandedProject(rightNowProject)
                  }}
                  whileHover={{ scale: 1.06, y: -2, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
                  whileTap={{ scale: 0.94 }}
                  className={task.done ? '' : (task.isLive && !task.isQueued ? 'ticker-task-live' : task.isQueued ? 'ticker-task-queued' : 'ticker-task-new')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: isMobile ? '10px 14px' : '4px 12px',
                    minHeight: isMobile ? 44 : 'auto',
                    background: task.done
                      ? 'rgba(34,197,94,0.12)'
                      : task.isQueued
                        ? 'rgba(233,30,144,0.12)'
                        : task.isLive
                          ? 'rgba(255,107,61,0.12)'
                          : 'rgba(100,180,255,0.08)',
                    border: `1.5px solid ${task.done ? 'rgba(34,197,94,0.3)' : task.isQueued ? 'rgba(233,30,144,0.25)' : task.isLive ? 'rgba(255,107,61,0.25)' : 'rgba(100,180,255,0.15)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 150ms ease, border-color 150ms ease',
                  }}
                >
                  {task.done ? (
                    <CheckCircle2 size={13} color="#22C55E" style={{ flexShrink: 0 }} />
                  ) : task.isQueued ? (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#E91E90',
                      boxShadow: '0 0 6px rgba(233,30,144,0.6)',
                      animation: 'statusPulse 2s ease-in-out infinite',
                      flexShrink: 0,
                    }} />
                  ) : task.isLive ? (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#FF6B3D',
                      boxShadow: '0 0 6px rgba(255,107,61,0.6)',
                      animation: 'statusPulse 1.5s ease-in-out infinite',
                      flexShrink: 0,
                    }} />
                  ) : null}
                  <span style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 13, fontWeight: 600,
                    color: task.done ? '#4ADE80' : (isDaytime ? '#F1F5F9' : HUD.textPrimary),
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textDecoration: task.done ? 'line-through' : 'none',
                    opacity: task.done ? 0.7 : 1,
                  }}>
                    {task.text}
                  </span>
                </motion.button>
              ))}
            </div>
          ) : null
        })()}

        {/* Search bar ABOVE pills (Patrik: search above pills so you see pills filter as you type) */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{ overflow: 'hidden', position: 'relative', zIndex: 2 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: isMobile ? '4px 8px 2px' : '4px 12px 2px',
              }}>
                <Search size={14} color={hudTextMuted} style={{ flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false) }
                  }}
                  placeholder="Filter pills and tasks..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${searchQuery ? hudAccent + '44' : hudDivider}`,
                    height: 32,
                    padding: '0 4px',
                    color: hudTextPrimary,
                    fontSize: isMobile ? 15 : 14,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 500,
                    outline: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                />
                {searchQuery && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => setSearchQuery('')}
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      background: isDaytime ? 'rgba(59,130,246,0.15)' : 'rgba(100,180,255,0.1)',
                      border: 'none', cursor: 'pointer',
                      color: hudTextMuted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <X size={12} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main row: Pills ONLY. No agent roster. No counters. No percentage. */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 10,
          minHeight: isMobile ? 52 : 68,
          position: 'relative',
          zIndex: 1,
          padding: isMobile ? 0 : '4px 0 6px',
        }}>
          {/* Search toggle button -- LEFT of arrow nav */}
          <motion.button
            onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery('') }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, borderRadius: 8,
              background: searchOpen ? `${hudAccent}22` : (isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(100,180,255,0.04)'),
              border: `1px solid ${searchOpen ? hudAccent + '44' : hudDivider}`,
              color: searchOpen ? hudAccent : hudTextMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 150ms ease',
            }}
          >
            <Search size={isMobile ? 18 : 15} />
          </motion.button>

          {/* Left scroll arrow (44px touch target) */}
          <button
            onClick={() => {
              const el = document.querySelector('.hud-pills-scroll')
              if (el) el.scrollBy({ left: -200, behavior: 'smooth' })
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: isDaytime ? '#6B8AB0' : '#8BA4C4',
              padding: isMobile ? '12px 6px' : '4px 2px',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 44, minHeight: 44,
              transition: 'color 100ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = isDaytime ? '#60A5FA' : '#60A5FA'}
            onMouseLeave={e => e.currentTarget.style.color = isDaytime ? '#6B8AB0' : '#8BA4C4'}
          >
            <svg width={isMobile ? 20 : 16} height={isMobile ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Scrollable project pills -- THE WHOLE BAR. Left-aligned so Right Now pill is always visible first. */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 8,
            padding: '2px 4px',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            touchAction: 'pan-x',
          }} className="hud-pills-scroll">

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
                <Loader2 size={16} style={{ color: hudTextMuted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, color: hudTextMuted }}>
                  Loading...
                </span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, color: hudTextMuted, padding: '0 8px' }}>
                {searchQuery ? 'No matches' : 'No task data'}
              </span>
            ) : (
              filteredProjects.map(project => (
                <ProjectCard
                  key={project.section}
                  project={project}
                  isExpanded={expandedProject?.section === project.section}
                  onClick={() => {
                    setExpandedProject(
                      expandedProject?.section === project.section ? null : project
                    )
                  }}
                  onContextMenu={onProjectContextMenu}
                  isNightMode={isNightMode}
                  wiggle={project.section === 'rightnow' && rightNowWiggle}
                  isMobile={isMobile}
                  isTablet={isTablet}
                />
              ))
            )}
          </div>

          {/* Right scroll arrow (44px touch target) */}
          <button
            onClick={() => {
              const el = document.querySelector('.hud-pills-scroll')
              if (el) el.scrollBy({ left: 200, behavior: 'smooth' })
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: isDaytime ? '#6B8AB0' : '#8BA4C4',
              padding: isMobile ? '12px 6px' : '4px 2px',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 44, minHeight: 44,
              transition: 'color 100ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = isDaytime ? '#60A5FA' : '#60A5FA'}
            onMouseLeave={e => e.currentTarget.style.color = isDaytime ? '#6B8AB0' : '#8BA4C4'}
          >
            <svg width={isMobile ? 20 : 16} height={isMobile ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Lightning bolt notification button (was bell) */}
          <HUDBellButton onClick={onExpandChat} />
        </div>
      </div>

      {/* HUD animations - BLUE themed */}
      <style>{`
        @keyframes hudActiveGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        @keyframes hudStatusPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
          50% { transform: translateX(-50%) scale(1.3); opacity: 0.7; }
        }
        @keyframes hudBorderShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .hud-border-shimmer {
          animation: hudBorderShimmer 4s ease-in-out infinite;
        }
        .hud-panel-shimmer {
          transition: border-color 400ms ease;
        }
        .hud-panel-shimmer:hover {
          border-top-color: rgba(100, 180, 255, 0.35);
        }
        .hud-scroll::-webkit-scrollbar { width: 5px; }
        .hud-scroll::-webkit-scrollbar-track { background: transparent; }
        .hud-scroll::-webkit-scrollbar-thumb { background: rgba(100,180,255,0.12); border-radius: 3px; }
        .hud-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100,180,255,0.22); }
        .hud-pills-scroll::-webkit-scrollbar { display: none; }
        .hud-pills-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .hud-ticker-scroll::-webkit-scrollbar { display: none; }
        .hud-ticker-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pillWiggleGlow {
          0% { box-shadow: 0 4px 16px rgba(255,107,61,0.1); }
          30% { box-shadow: 0 4px 24px rgba(255,107,61,0.5), 0 0 12px rgba(255,107,61,0.3); }
          60% { box-shadow: 0 4px 20px rgba(255,107,61,0.3); }
          100% { box-shadow: 0 4px 16px rgba(255,107,61,0.1); }
        }
        .pill-wiggle-glow {
          animation: pillWiggleGlow 0.6s ease-in-out 1;
        }
        @keyframes tickerFlash {
          0%, 100% { box-shadow: 0 0 0 rgba(255,107,61,0); }
          30% { box-shadow: 0 0 12px rgba(255,107,61,0.4); }
        }
        @keyframes tickerWiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-1.5deg); }
          40% { transform: rotate(1.5deg); }
          60% { transform: rotate(-1deg); }
          80% { transform: rotate(1deg); }
        }
        .ticker-task-new {
          animation: tickerFlash 1.2s ease-out 1, tickerWiggle 0.5s ease-in-out 1 0.15s;
        }
        .ticker-task-live {
          animation: tickerFlash 2s ease-in-out infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes hudBlockedPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.08); }
        }
        @keyframes hudBlockedBadge {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.15); }
          50% { transform: scale(1); }
          75% { transform: scale(1.1); }
        }
        @keyframes hudWaitingPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.15; }
        }
        @keyframes hudWaitingSpin {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
        @keyframes hudMiniDotPulse {
          0%, 100% { box-shadow: 0 0 6px var(--agent-glow, rgba(34,197,94,0.4)); }
          50% { box-shadow: 0 0 14px var(--agent-glow, rgba(34,197,94,0.6)); }
        }
        @keyframes hudMiniDotBlocked {
          0%, 100% { opacity: 1; border-color: #EF4444; }
          50% { opacity: 0.7; border-color: #FF6B6B; }
        }
        ${HUD_NOTIFICATION_STYLES}
      `}</style>

      {/* HUD toast notifications (slide in from right, above HUD strip) */}
      <HUDToasts />

      {/* Task right-click context menu (rendered outside all overflow containers) */}
      {hudTaskCtx && (
        <div data-hud-ctx-menu style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: isNightMode
            ? 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(10,18,35,0.98) 100%)'
            : 'rgba(26,35,50,0.98)',
          border: isNightMode ? '2px solid rgba(59,130,246,0.25)' : '1px solid rgba(59,130,246,0.2)',
          borderRadius: 10, padding: '6px 0', minWidth: 240, maxWidth: 320,
          boxShadow: isNightMode
            ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)'
            : '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Task name header */}
          <div style={{
            padding: '8px 14px 6px',
            fontSize: 12, fontWeight: 700,
            color: isNightMode ? '#94A3B8' : '#8BA4C4',
            fontFamily: "'Inter', sans-serif",
            borderBottom: isNightMode ? '1px solid rgba(59,130,246,0.1)' : '1px solid rgba(59,130,246,0.1)',
            marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {hudTaskCtx.task.text?.slice(0, 40)}{hudTaskCtx.task.text?.length > 40 ? '...' : ''}
          </div>
          <button onClick={() => {
            if (hudTaskCtx.task.isManual) toggleManualTask?.(hudTaskCtx.task.manualId)
            setHudTaskCtx(null)
          }} style={hudCtxBtn(isNightMode)}>
            {hudTaskCtx.task.done ? 'Mark Undone' : 'Mark Done'}
          </button>

          <button onClick={() => {
            addManualTask(hudTaskCtx.task.text)
            setHudTaskCtx(null)
          }} style={{ ...hudCtxBtn(isNightMode), color: '#FF6B3D', fontWeight: 700 }}>
            Send to Right Now
          </button>

          <div style={{ height: 1, background: isNightMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.1)', margin: '4px 0' }} />

          <div style={{
            padding: '5px 14px', fontSize: 10, fontWeight: 700,
            color: isNightMode ? '#475569' : '#6B8AB0',
            fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Move to pill</div>
          {(projects || []).filter(p => p.name !== hudTaskCtx.project?.name).slice(0, 5).map(p => (
            <button key={p.name} onClick={() => setHudTaskCtx(null)}
              style={hudCtxBtn(isNightMode)}
              onMouseEnter={e => e.currentTarget.style.background = isNightMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >{p.name}</button>
          ))}

          <div style={{ height: 1, background: isNightMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.1)', margin: '4px 0' }} />

          {hudTaskCtx.task.isManual && (
            <button onClick={() => {
              deleteManualTask?.(hudTaskCtx.task.manualId)
              setHudTaskCtx(null)
            }} style={{ ...hudCtxBtn(isNightMode), color: '#EF4444' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
