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
import { Zap, X, Loader2, CheckCircle2, Search, ChevronDown } from 'lucide-react'
import { useDataPipe } from './hooks/useDataPipe.js'
import { getClientId } from './lib/clientConfig.js'
import {
  HUD,
  parsePunchList,
  useSectionMappings,
  useRecencyWeights,
} from './components/HUDConstants.jsx'
import { TaskPanel } from './components/TaskPanel.jsx'
import { ProjectCard } from './components/ProjectCard.jsx'
import { hudCtxBtn } from './components/CompactStats.jsx'
import { handleTaskContextAction } from './components/TaskContextMenu.jsx'

// ---- INBOX PANEL ------------------------------------------------------------
// Shown when the Inbox pill is expanded. Two sections:
//   (1) Done tasks awaiting approval -- amber cards with Approve / Deny / Clarify
//   (2) Unread messages -- compact agent message previews
function InboxPanel({ doneTasks, unreadMsgs, onClose, isNightMode, onNavigateToAgent, onClarify, refetch }) {
  const isDaytime = isNightMode === false
  // Blue glass theme -- matches HUD panel style (SimCity/Vegas energy)
  const bg = 'rgba(8,16,32,0.95)'
  const border = 'rgba(100,180,255,0.22)'
  const textPrimary = '#EDF2FA'
  const textMuted = '#8BA4C4'

  // Track approve animation state per card key
  const [approvingId, setApprovingId] = useState(null)
  // Track deny/reject animation state per card key
  const [denyingId, setDenyingId] = useState(null)
  // Optimistic removal: keys hidden immediately on approve/deny
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState(new Set())
  // Failed task keys: shown with red border error badge for retry
  const [failedTaskIds, setFailedTaskIds] = useState(new Set())

  const callAction = (taskId, taskText, agent, action) => {
    const key = taskId || taskText
    // 1. Optimistically remove from UI immediately
    setOptimisticallyRemovedIds(prev => new Set([...prev, key]))
    // Clear any prior failure badge
    setFailedTaskIds(prev => { const n = new Set(prev); n.delete(key); return n })
    // 2. Fire animation in background (non-blocking)
    const runAnim = async () => {
      if (action === 'approve') {
        setApprovingId(key)
        await new Promise(r => setTimeout(r, 300))
        setApprovingId(key + '__fadeout')
        await new Promise(r => setTimeout(r, 250))
        setApprovingId(null)
      } else if (action === 'reject') {
        setDenyingId(key)
        await new Promise(r => setTimeout(r, 300))
        setDenyingId(key + '__fadeout')
        await new Promise(r => setTimeout(r, 250))
        setDenyingId(null)
      }
    }
    runAnim()
    // 3. Fire API in background -- re-add with error badge on failure
    fetch('/api/dashboard/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, taskId, taskText, agent, clientId: getClientId() }),
    })
      .then(res => {
        if (!res.ok) throw new Error('non-ok')
        refetch?.()
      })
      .catch(() => {
        setOptimisticallyRemovedIds(prev => { const n = new Set(prev); n.delete(key); return n })
        setFailedTaskIds(prev => new Set([...prev, key]))
      })
  }

  return (
    <motion.div
      key="inbox-panel"
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      style={{
        position: 'absolute', bottom: '100%', left: 0, right: 0,
        marginBottom: 8,
        background: bg,
        borderRadius: '14px 14px 0 0',
        border: `1.5px solid ${border}`,
        borderBottom: 'none',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.55), 0 -2px 0 rgba(100,180,255,0.12), inset 0 1px 0 rgba(100,180,255,0.08)',
        maxHeight: 360,
        overflowY: 'auto',
        zIndex: 50,
        scrollbarWidth: 'thin',
        position: 'absolute',
      }}
    >
      {/* Inner top glow */}
      <div style={{
        position: 'sticky', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(100,180,255,0.30) 40%, rgba(100,180,255,0.30) 60%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px 8px',
        borderBottom: 'none',
        position: 'sticky', top: 1, background: bg, zIndex: 1,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#3B82F6',
          boxShadow: '0 0 8px rgba(59,130,246,0.8), 0 0 14px rgba(59,130,246,0.4)',
          animation: 'vegasTypingBounce 2s ease-in-out infinite',
        }} />
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: '#60A5FA',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.10em', textTransform: 'uppercase', flex: 1,
        }}>Inbox</span>
        {(doneTasks.length + unreadMsgs.length) > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#4A6080',
            fontFamily: "'JetBrains Mono', monospace",
          }}>{doneTasks.length + unreadMsgs.length}</span>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: textMuted, padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        ><X size={14} /></button>
      </div>

      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* SECTION 1: Done tasks awaiting approval */}
        {doneTasks.filter(t => !optimisticallyRemovedIds.has(t.taskId || t.text)).length > 0 && (
          <>
            {doneTasks.filter(t => !optimisticallyRemovedIds.has(t.taskId || t.text)).map((t, idx) => {
              const cardKey = t.taskId || `done-${idx}`
              const isGlowing = approvingId === cardKey || approvingId === (t.taskId || t.text)
              const isFadingOut = approvingId === cardKey + '__fadeout' || approvingId === (t.taskId || t.text) + '__fadeout'
              const isDenyGlowing = denyingId === cardKey || denyingId === (t.taskId || t.text)
              const isDenyFadingOut = denyingId === cardKey + '__fadeout' || denyingId === (t.taskId || t.text) + '__fadeout'
              const hasFailed = failedTaskIds.has(cardKey) || failedTaskIds.has(t.taskId || t.text)
              const inboxCardClass = isGlowing ? 'task-approving' : isFadingOut ? 'task-approved' : isDenyGlowing ? 'task-denying' : isDenyFadingOut ? 'task-denied' : ''
              return (
              <motion.div
                key={cardKey}
                className={inboxCardClass}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                style={{
                  background: hasFailed
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.32) 0%, rgba(185,28,28,0.20) 100%)'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.38) 0%, rgba(99,102,241,0.24) 100%)',
                  backdropFilter: 'blur(12px)',
                  border: hasFailed ? '1.5px solid rgba(239,68,68,0.90)' : '1.5px solid #3B82F6',
                  borderLeft: hasFailed ? '3px solid #EF4444' : '3px solid #3B82F6',
                  borderRadius: 10,
                  padding: '10px 12px',
                  boxShadow: hasFailed
                    ? '0 4px 24px rgba(239,68,68,0.35), inset 0 1px 0 rgba(239,68,68,0.20)'
                    : '0 4px 28px rgba(59,130,246,0.45), inset 0 1px 0 rgba(100,180,255,0.40)',
                  position: 'relative', overflow: 'hidden',
                }}>
                {/* Inner top glow */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                  background: hasFailed
                    ? 'linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.35) 40%, rgba(239,68,68,0.35) 60%, transparent 100%)'
                    : 'linear-gradient(90deg, transparent 0%, rgba(100,180,255,0.65) 40%, rgba(100,180,255,0.65) 60%, transparent 100%)',
                  pointerEvents: 'none',
                }} />
                {/* Agent + label row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: hasFailed ? '#EF4444' : '#3B82F6',
                    boxShadow: hasFailed ? '0 0 6px rgba(239,68,68,0.7)' : '0 0 8px rgba(59,130,246,0.8)',
                    animation: 'vegasTypingBounce 2s ease-in-out infinite',
                  }} />
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: hasFailed ? '#F87171' : '#60A5FA',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.10em', textTransform: 'uppercase',
                    flex: 1,
                  }}>
                    {hasFailed ? 'FAILED -- TAP TO RETRY' : 'TASK COMPLETE'}
                  </span>
                  {!hasFailed && (
                  <span style={{ fontSize: 9, color: '#93C5FD', fontFamily: "'JetBrains Mono', monospace" }}>
                    {t.agent ? `${t.agent.charAt(0).toUpperCase()}${t.agent.slice(1)}` : ''}
                  </span>
                  )}
                </div>
                {/* Task text -- data readout */}
                <div style={{
                  fontSize: 13, fontWeight: 500, color: '#EDF2FA',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  lineHeight: 1.4, marginBottom: 8,
                  padding: '6px 10px',
                  background: 'rgba(100,180,255,0.16)',
                  borderRadius: 7,
                  border: '1px solid rgba(100,180,255,0.55)',
                  boxShadow: 'inset 0 1px 0 rgba(100,180,255,0.30)',
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', top: -8, left: 8,
                    fontSize: 8, fontWeight: 700, color: '#3B9EFF',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: 'rgba(6,16,42,0.92)', padding: '0 4px',
                  }}>task</span>
                  {t.text}
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 5 }}>
                  <motion.button
                    onClick={() => callAction(t.taskId, t.text, t.agent, 'approve')}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    style={{
                      flex: 1, padding: '6px 8px',
                      background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                      border: '1.5px solid #22C55E',
                      borderRadius: 7, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      color: '#FFFFFF', fontSize: 11, fontWeight: 800,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      boxShadow: '0 3px 12px rgba(22,163,74,0.55), inset 0 1px 0 rgba(255,255,255,0.20)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Approve
                  </motion.button>
                  <motion.button
                    onClick={() => callAction(t.taskId, t.text, t.agent, 'reject')}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    style={{
                      flex: 1, padding: '6px 8px',
                      background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                      border: '1.5px solid #EF4444',
                      borderRadius: 7, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      color: '#FFFFFF', fontSize: 11, fontWeight: 800,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      boxShadow: '0 3px 12px rgba(220,38,38,0.55), inset 0 1px 0 rgba(255,255,255,0.20)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Deny
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      if (onClarify) {
                        onClarify(t.agent, t.text)
                      } else {
                        onNavigateToAgent?.(t.agent)
                      }
                      onClose?.()
                    }}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    style={{
                      flex: 1, padding: '6px 8px',
                      background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
                      border: '1.5px solid #3B82F6',
                      borderRadius: 7, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      color: '#FFFFFF', fontSize: 11, fontWeight: 800,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      boxShadow: '0 3px 12px rgba(29,78,216,0.55), inset 0 1px 0 rgba(255,255,255,0.20)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Clarify
                  </motion.button>
                </div>
              </motion.div>
              )
            })}
            {unreadMsgs.length > 0 && (
              <div style={{ height: 1, background: 'rgba(100,180,255,0.12)', margin: '2px 0' }} />
            )}
          </>
        )}

        {/* SECTION 2: Unread messages */}
        {unreadMsgs.map((m, idx) => (
          <motion.button
            key={m.id || `msg-${idx}`}
            onClick={() => onNavigateToAgent?.(m.agent)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28, delay: idx * 0.04 }}
            style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1.5px solid rgba(100,180,255,0.20)',
              borderLeft: '3px solid rgba(59,158,255,0.50)',
              borderRadius: 8, padding: '8px 12px',
              display: 'flex', flexDirection: 'column', gap: 3,
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.14)'; e.currentTarget.style.borderColor = 'rgba(100,180,255,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor = 'rgba(100,180,255,0.20)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#5BB8FF',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{m.agent ? `${m.agent.charAt(0).toUpperCase()}${m.agent.slice(1)}` : 'Agent'}</span>
              <span style={{ fontSize: 9, color: '#4A6080', marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                new msg
              </span>
            </div>
            <span style={{
              fontSize: 12, color: '#EDF2FA',
              fontFamily: "'Inter', system-ui, sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}>{m.text || m.preview || ''}</span>
          </motion.button>
        ))}

        {doneTasks.length === 0 && unreadMsgs.length === 0 && (
          <div style={{
            padding: '16px 8px', textAlign: 'center',
            color: '#4A6080', fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.06em',
          }}>-- inbox clear --</div>
        )}
      </div>
    </motion.div>
  )
}

// Meta-sections that always stay flat (never nest under AOM parent pill)
const META_SECTIONS = new Set(['rightnow', 'inbox', 'to-do', 'completed-feed', 'your-todos', 'finish-these', 'checking-in', 'schedule', 'today'])

// ---- MAIN HUD ---------------------------------------------------------------
// DONE(bobby2): Chat input REMOVED from bottom bar per Patrik directive. Chat lives ONLY in sidebar.
// Bottom bar = agent roster | scrollable project pills | compact stats | notification bell
export default function GameHUD({
  agentStatus, throughput, onAgentClick, isMobile, isTablet,
  // Chat integration props (onExpandChat still used for bell/notification click -> open sidebar)
  chatAgent, onChatSubmit, onExpandChat,
  // Context menu props
  onAgentContextMenu, onProjectContextMenu,
  // Navigation -- used by InboxPanel to open agent chat from Inbox
  onNavigateToAgent,
  // Clarify -- navigates to agent chat AND pre-fills the input with task context
  onClarify,
  // Daytime/nighttime theme -- when false, bottom HUD goes white/vibrant blue to match top bar
  isNightMode: isNightModeProp,
  // Height reporting: called with HUD pixel height so canvas can adjust camera offset
  onHeightChange,
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

  // Done-task approval context menu: Approve / Deny / Clarify
  const [doneTaskCtx, setDoneTaskCtx] = useState(null) // { task, x, y }
  // Track approved task IDs for green glow animation (clears after 4s, then poll moves to Completed feed)
  const [approvedTaskIds, setApprovedTaskIds] = useState(new Set())
  // Pending completion: tasks marked done but waiting 30s before committing to Supabase (undo window)
  const [pendingCompletion, setPendingCompletion] = useState({}) // pcKey -> { task, timerId }
  const handleUndoMarkDone = useCallback((pcKey) => {
    setPendingCompletion(prev => {
      if (prev[pcKey]) clearTimeout(prev[pcKey].timerId)
      const next = { ...prev }
      delete next[pcKey]
      return next
    })
  }, [])
  useEffect(() => {
    if (!doneTaskCtx) return
    const timer = setTimeout(() => {
      const handler = (e) => {
        const menu = document.querySelector('[data-done-ctx-menu]')
        if (menu && menu.contains(e.target)) return
        setDoneTaskCtx(null)
      }
      document.addEventListener('mousedown', handler)
      doneTaskCtx._cleanup = () => document.removeEventListener('mousedown', handler)
    }, 50)
    return () => {
      clearTimeout(timer)
      doneTaskCtx._cleanup?.()
    }
  }, [doneTaskCtx])


  // Fire-and-forget: update task status via Supabase task-action API
  const taskLifecycleAction = useCallback((action, task) => {
    try {
      fetch('/api/dashboard/task-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          taskText: task.text,
          taskId: task.taskId || null,
          agent: task.agent || null,
          clientId: typeof window !== 'undefined' && window.__cornerClientId ? window.__cornerClientId : 'aom',
        }),
      }).catch(err => console.warn('[Corner] task lifecycle action failed:', err))
    } catch {}
  }, [])

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
  const [pillOverflowOpen, setPillOverflowOpen] = useState(false)
  const overflowBtnRef = useRef(null)
  const overflowPanelRef = useRef(null)
  const [highlightedTask, setHighlightedTask] = useState(null) // { text: string } - flash-highlight after navigating from another pill
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  // Track Right Now pill count for wiggle animation on new tasks
  const prevRightNowCountRef = useRef(0)
  const [rightNowWiggle, setRightNowWiggle] = useState(false)
  // navigateToProject uses a ref so it doesn't depend on projects useMemo (avoids ordering issue)
  const projectsRef = useRef([]);
  // Live section_mappings from Supabase -- pub/sub, one fetch per page load
  const { sectionMap, clientSubsectionMap } = useSectionMappings()
  // Memoized so useDataPipe's parseFnRef only updates when maps actually change
  const parseFn = useCallback(
    (md) => parsePunchList(md, sectionMap, clientSubsectionMap),
    [sectionMap, clientSubsectionMap]
  )

  // useDataPipe: ONE hook, ONE poll (3s), ALL data. Replaces 6 separate polling hooks.
  const {
    rightNow: liveRightNowTasks,
    completedFeed,
    inboxItems,
    yourTodos: patrikTodos,
    personalTodos,
    todoItems,
    finishThese: checkingInTasks,
    isAutoChecked,
    punchData,
    punchLoading: loading,
  } = useDataPipe(parseFn)

  // Inbox: done tasks awaiting approval + unread messages
  const donePendingTasks = useMemo(() =>
    (liveRightNowTasks || []).filter(t => t.isDoneAwaitingApproval),
    [liveRightNowTasks]
  )
  const inboxCount = donePendingTasks.length + (inboxItems || []).length
  const hudRef = useRef(null)
  const weights = useRecencyWeights()

  // Report HUD height to GameDashboard so CanvasOffice can adjust camera offset
  useEffect(() => {
    if (!onHeightChange || !hudRef.current) return
    const ro = new ResizeObserver(() => {
      if (hudRef.current) onHeightChange(hudRef.current.getBoundingClientRect().height)
    })
    ro.observe(hudRef.current)
    onHeightChange(hudRef.current.getBoundingClientRect().height)
    return () => ro.disconnect()
  }, [onHeightChange])

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
        isLive: !t.isDoneAwaitingApproval,
        isQueued: !!t.isQueued,
        isDoneAwaitingApproval: !!t.isDoneAwaitingApproval,
        taskId: t.taskId,
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

    // INBOX pill = done tasks awaiting approval + unread messages
    // Only render when there's something to show
    const donePending = (liveRightNowTasks || []).filter(t => t.isDoneAwaitingApproval)
    const unreadMsgs = inboxItems || []
    if (donePending.length > 0 || unreadMsgs.length > 0) {
      merged.push({
        name: 'Inbox',
        section: 'inbox',
        color: '#EAB308',
        icon: 'inbox',
        tasks: [
          ...donePending.map(t => ({
            text: t.text,
            agent: t.agent,
            taskId: t.taskId,
            done: false,
            raw: '',
            isLive: false,
            isDoneAwaitingApproval: true,
          })),
          ...unreadMsgs.map(m => ({
            text: m.text || m.preview || '',
            agent: m.agent,
            done: false,
            raw: '',
            isLive: false,
            isUnreadMsg: true,
            msgId: m.id,
            msgTimestamp: m.timestamp,
          })),
        ],
        isInbox: true,
      })
    }

    // TO DO pill = Patrik's personal tasks ONLY (business tasks, client follow-ups)
    // Agent todo tasks (status='todo') are NOT personal todos -- visible in their project pills
    if (personalTodos.length > 0) {
      merged.push({
        name: 'To Do',
        section: 'to-do',
        color: '#8B5CF6',
        icon: 'list-todo',
        tasks: personalTodos.map(t => ({
          text: t.text,
          done: false,
          agent: 'patrik',
          raw: '',
          taskId: t.taskId,
          projectSource: t.project,
        })),
        isPersonalTodo: true,
      })
    }

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

    // Sort order (Patrik directive): Right Now > Inbox > To Do (personal) > Your TODOs > Schedule > Finish These > rest
    return [...merged].sort((a, b) => {
      // Right Now is always first (running agents)
      if (a.section === 'rightnow') return -1
      if (b.section === 'rightnow') return 1
      // Inbox second -- done tasks + unread messages need immediate attention
      if (a.section === 'inbox') return -1
      if (b.section === 'inbox') return 1
      // To Do third -- Patrik's personal tasks (next to Inbox)
      if (a.section === 'to-do') return -1
      if (b.section === 'to-do') return 1
      // Your TODOs fourth
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
  }, [punchData, weights, liveRightNowTasks, completedFeed, isAutoChecked, patrikTodos, personalTodos, checkingInTasks, manualTasks, inboxItems])

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

  // All pills flat: meta first, project pills after. Cap visible to 8 (6 on mobile).
  const MAX_VISIBLE_PILLS = isMobile ? 6 : isTablet ? 7 : 8
  const { visiblePills, overflowPills } = useMemo(() => {
    const meta = []
    const children = []
    for (const p of filteredProjects) {
      if (META_SECTIONS.has(p.section)) {
        meta.push(p)
      } else {
        children.push(p)
      }
    }
    const all = [...meta, ...children]
    return {
      visiblePills: all.slice(0, MAX_VISIBLE_PILLS),
      overflowPills: all.slice(MAX_VISIBLE_PILLS),
    }
  }, [filteredProjects, MAX_VISIBLE_PILLS])

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
      if (e.key === 'Escape') { setExpandedProject(null); setPillOverflowOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close pill overflow panel on click outside
  useEffect(() => {
    if (!pillOverflowOpen) return
    const handler = (e) => {
      if (
        overflowBtnRef.current && !overflowBtnRef.current.contains(e.target) &&
        overflowPanelRef.current && !overflowPanelRef.current.contains(e.target)
      ) {
        setPillOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [pillOverflowOpen])

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
      {/* Expanded task panel -- Inbox gets a custom approval panel; all others use TaskPanel */}
      <AnimatePresence>
        {expandedProject && expandedProject.section === 'inbox' ? (
          <InboxPanel
            key="inbox"
            doneTasks={donePendingTasks}
            unreadMsgs={inboxItems || []}
            onClose={() => setExpandedProject(null)}
            isNightMode={isNightMode}
            onNavigateToAgent={onNavigateToAgent}
            onClarify={onClarify}
            refetch={() => {}}
          />
        ) : expandedProject ? (
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
            onDoneTaskAction={(e, task, proj, type) => {
              if (type === 'menu') {
                setDoneTaskCtx({ task, x: e.clientX, y: e.clientY })
              }
            }}
            onNavigateToProject={navigateToProject}
            highlightedTask={highlightedTask}
            approvedTaskIds={approvedTaskIds}
            pendingCompletion={pendingCompletion}
            onUndoMarkDone={handleUndoMarkDone}
          />
        ) : null}
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

        {/* Main row: Pills ONLY. Compact. */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 5 : 7,
          minHeight: isMobile ? 44 : 48,
          position: 'relative',
          zIndex: 1,
          padding: isMobile ? '2px 0' : '3px 0 4px',
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

          {/* Pill bar: fixed count (6-8 visible), overflow behind +N button. No scroll arrows. */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: isMobile ? 6 : 8,
            padding: '2px 4px',
            overflow: 'hidden',
          }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
                <Loader2 size={16} style={{ color: hudTextMuted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, color: hudTextMuted }}>
                  Loading...
                </span>
              </div>
            ) : visiblePills.length === 0 ? (
              <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, color: hudTextMuted, padding: '0 8px' }}>
                {searchQuery ? 'No matches' : 'No task data'}
              </span>
            ) : (
              <>
                {visiblePills.map(project => (
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
                ))}

                {/* +N overflow button */}
                {overflowPills.length > 0 && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <motion.button
                      ref={overflowBtnRef}
                      onClick={() => setPillOverflowOpen(v => !v)}
                      whileHover={{ scale: 1.06, y: -2, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
                      whileTap={{ scale: 0.92, transition: { type: 'spring', stiffness: 600, damping: 18 } }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        height: 30,
                        padding: '0 9px',
                        background: pillOverflowOpen
                          ? 'linear-gradient(135deg, rgba(100,180,255,0.18), rgba(100,180,255,0.08))'
                          : 'linear-gradient(135deg, rgba(100,180,255,0.09), rgba(100,180,255,0.03))',
                        border: `1.5px solid ${pillOverflowOpen ? 'rgba(100,180,255,0.5)' : 'rgba(100,180,255,0.2)'}`,
                        borderRadius: 12, cursor: 'pointer', flexShrink: 0,
                        transition: 'all 180ms ease',
                      }}
                    >
                      <span style={{
                        fontFamily: "'Inter Tight', monospace",
                        fontSize: 12, fontWeight: 800,
                        color: pillOverflowOpen ? '#93C5FD' : '#6B8AB4',
                        letterSpacing: '-0.01em',
                      }}>+{overflowPills.length}</span>
                      <ChevronDown
                        size={11}
                        color={pillOverflowOpen ? '#93C5FD' : '#6B8AB4'}
                        style={{ transform: pillOverflowOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }}
                      />
                    </motion.button>

                    {/* Overflow popover -- fixed above HUD bar */}
                    <AnimatePresence>
                      {pillOverflowOpen && (
                        <motion.div
                          ref={overflowPanelRef}
                          initial={{ opacity: 0, y: 10, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.96 }}
                          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                          style={{
                            position: 'fixed',
                            bottom: isMobile ? 68 : 80,
                            left: (() => {
                              if (!overflowBtnRef.current) return 'auto'
                              const rect = overflowBtnRef.current.getBoundingClientRect()
                              const panelW = Math.min(overflowPills.length * 110, 360)
                              const right = window.innerWidth - rect.right
                              return right + rect.width > panelW ? `${rect.left}px` : `${Math.max(8, rect.right - panelW)}px`
                            })(),
                            maxWidth: 'calc(100vw - 16px)',
                            background: 'rgba(8,14,28,0.97)',
                            backdropFilter: 'blur(20px)',
                            border: '1.5px solid rgba(100,180,255,0.2)',
                            borderRadius: 14,
                            boxShadow: '0 -8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(100,180,255,0.06)',
                            padding: '10px 10px 8px',
                            zIndex: 200,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                          }}
                        >
                          {overflowPills.map(project => (
                            <ProjectCard
                              key={project.section}
                              project={project}
                              isExpanded={expandedProject?.section === project.section}
                              onClick={() => {
                                setExpandedProject(
                                  expandedProject?.section === project.section ? null : project
                                )
                                setPillOverflowOpen(false)
                              }}
                              onContextMenu={onProjectContextMenu}
                              isNightMode={isNightMode}
                              wiggle={false}
                              isMobile={isMobile}
                              isTablet={isTablet}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
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
      `}</style>

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
            if (hudTaskCtx.task.isManual) {
              toggleManualTask?.(hudTaskCtx.task.manualId)
            } else if (hudTaskCtx.task.done) {
              handleTaskContextAction('toggle', hudTaskCtx.task, null, null)
            } else {
              // 30s undo window: defer actual Supabase commit
              const pcKey = hudTaskCtx.task.taskId ? String(hudTaskCtx.task.taskId) : hudTaskCtx.task.text
              if (pendingCompletion[pcKey]) clearTimeout(pendingCompletion[pcKey].timerId)
              const capturedTask = hudTaskCtx.task
              const timerId = setTimeout(() => {
                handleTaskContextAction('markDone', capturedTask, null, null)
                setPendingCompletion(prev => { const next = { ...prev }; delete next[pcKey]; return next })
              }, 30000)
              setPendingCompletion(prev => ({ ...prev, [pcKey]: { task: capturedTask, timerId } }))
            }
            setHudTaskCtx(null)
          }} style={hudCtxBtn(isNightMode)}>
            {hudTaskCtx.task.done ? 'Mark Undone' : 'Mark Done'}
          </button>

          <button onClick={() => {
            handleTaskContextAction('addToRightNow', hudTaskCtx.task, null, null)
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

      {/* Done-task approval context menu: Approve / Deny / Clarify */}
      {doneTaskCtx && (() => {
        // Clamp position to viewport
        const menuW = 240
        const menuH = 160
        let x = doneTaskCtx.x
        let y = doneTaskCtx.y
        if (typeof window !== 'undefined') {
          if (x + menuW > window.innerWidth - 8) x = window.innerWidth - menuW - 8
          if (x < 8) x = 8
          if (y + menuH > window.innerHeight - 8) y = window.innerHeight - menuH - 8
          if (y < 8) y = 8
        }
        const { task } = doneTaskCtx
        return (
          <div data-done-ctx-menu style={{
            position: 'fixed',
            left: x, top: y,
            zIndex: 9999,
            background: 'linear-gradient(180deg, rgba(15,30,60,0.98) 0%, rgba(10,20,45,0.98) 100%)',
            border: '2px solid rgba(59,130,246,0.45)',
            borderRadius: 10, padding: '6px 0', minWidth: menuW,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.15)',
            backdropFilter: 'blur(20px)',
          }}>
            {/* Header */}
            <div style={{
              padding: '8px 14px 6px',
              fontSize: 12, fontWeight: 700,
              color: '#60A5FA',
              fontFamily: "'JetBrains Mono', monospace",
              borderBottom: '1px solid rgba(59,130,246,0.20)',
              marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {(task.text || '').slice(0, 36)}{(task.text || '').length > 36 ? '...' : ''}
            </div>

            {/* Approve */}
            <button
              onClick={() => {
                // Start green glow animation on the task row (clears after 4s, poll moves to Completed feed)
                if (task.taskId) {
                  const tid = String(task.taskId)
                  setApprovedTaskIds(prev => { const n = new Set(prev); n.add(tid); return n })
                  setTimeout(() => {
                    setApprovedTaskIds(prev => { const n = new Set(prev); n.delete(tid); return n })
                  }, 4000)
                }
                taskLifecycleAction('toggle', { ...task, done: false }) // sets status to 'completed' via toggle(true) logic
                // Use 'markDone' which sets status='done' -> but we want 'completed'
                // Use direct fetch to set status=completed
                try {
                  fetch('/api/dashboard/task-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'toggle',
                      taskText: task.text,
                      taskId: task.taskId || null,
                      agent: task.agent || null,
                      payload: true, // marks done=true => status:'done' in current API
                      clientId: typeof window !== 'undefined' && window.__cornerClientId ? window.__cornerClientId : 'aom',
                    }),
                  }).catch(() => {})
                  // Also set to completed
                  if (task.taskId) {
                    fetch('/api/dashboard/task-action', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'markDone',
                        taskText: task.text,
                        taskId: task.taskId || null,
                        agent: task.agent || null,
                        clientId: typeof window !== 'undefined' && window.__cornerClientId ? window.__cornerClientId : 'aom',
                      }),
                    }).catch(() => {})
                  }
                } catch {}
                setDoneTaskCtx(null)
              }}
              style={{
                display: 'block', width: 'calc(100% - 16px)', margin: '2px 8px',
                padding: '7px 12px', cursor: 'pointer', borderRadius: 7,
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                border: '1.5px solid rgba(34,197,94,0.5)',
                boxShadow: '0 2px 8px rgba(22,163,74,0.30), inset 0 1px 0 rgba(255,255,255,0.15)',
                color: '#FFFFFF', fontWeight: 700, fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'opacity 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Approve
            </button>

            {/* Deny */}
            <button
              onClick={() => {
                try {
                  fetch('/api/dashboard/task-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'markUndone',
                      taskText: task.text,
                      taskId: task.taskId || null,
                      agent: task.agent || null,
                      clientId: typeof window !== 'undefined' && window.__cornerClientId ? window.__cornerClientId : 'aom',
                    }),
                  }).catch(() => {})
                } catch {}
                setDoneTaskCtx(null)
              }}
              style={{
                display: 'flex', width: 'calc(100% - 16px)', margin: '2px 8px',
                padding: '7px 12px', cursor: 'pointer', borderRadius: 7,
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                border: '1.5px solid rgba(239,68,68,0.5)',
                boxShadow: '0 2px 8px rgba(220,38,38,0.30), inset 0 1px 0 rgba(255,255,255,0.15)',
                color: '#FFFFFF', fontWeight: 700, fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                alignItems: 'center', gap: 8,
                transition: 'opacity 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Deny
            </button>

            <div style={{ height: 1, background: 'rgba(59,130,246,0.15)', margin: '4px 0' }} />

            {/* Clarify */}
            <button
              onClick={() => {
                if (onClarify && task.agent) {
                  onClarify(task.agent, task.text)
                } else if (task.agent) {
                  onAgentClick?.(task.agent)
                }
                setDoneTaskCtx(null)
              }}
              style={{
                display: 'flex', width: 'calc(100% - 16px)', margin: '2px 8px',
                padding: '7px 12px', cursor: 'pointer', borderRadius: 7,
                background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
                border: '1.5px solid rgba(59,130,246,0.5)',
                boxShadow: '0 2px 8px rgba(29,78,216,0.30), inset 0 1px 0 rgba(255,255,255,0.15)',
                color: '#FFFFFF', fontWeight: 600, fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                alignItems: 'center', gap: 8,
                transition: 'opacity 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Clarify
            </button>
          </div>
        )
      })()}


    </div>
  )
}
