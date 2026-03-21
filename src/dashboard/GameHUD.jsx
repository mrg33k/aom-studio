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

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, Check, Circle, AlertTriangle,
  Activity, Pause, Eye, Clock, Zap, Users, FolderKanban,
  LayoutGrid, X, Loader2, CheckCircle2, Timer, Flame,
  Search, AlertCircle, UserCheck, History,
} from 'lucide-react'
import { AGENTS, GRID_SPEC } from './gridSpec.js'
// HUDNotifications kept for potential future use; bell/toasts removed (Inbox pill is the notification system now)
import { useDataPipe, formatRelativeTime } from './hooks/useDataPipe.js'

// ---- PALETTE ----------------------------------------------------------------
const PALETTE = GRID_SPEC.colorPalette
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// BLUE HUD colors (cool blue glass panel contrasting the warm game world)
// Think: Sims blue panel. Fresh, tech, game UI. Clean glass over warm pixel art.
const HUD = {
  panelBg: 'rgba(8, 16, 32, 0.92)',
  panelBgSolid: '#081020',
  panelBorder: 'rgba(100, 180, 255, 0.22)',
  panelBorderHover: 'rgba(100, 180, 255, 0.38)',
  panelInnerGlow: 'rgba(100, 180, 255, 0.06)',
  panelShadow: '0 -8px 48px rgba(0,0,0,0.6), 0 -2px 0 rgba(100,180,255,0.12), inset 0 1px 0 rgba(100,180,255,0.08)',
  divider: 'rgba(100, 180, 255, 0.10)',
  textPrimary: '#EDF2FA',
  textSecondary: '#8BA4C4',
  textMuted: '#4A6080',
  accent: '#3B9EFF',
  accentGlow: 'rgba(59, 158, 255, 0.35)',
  blueOverlay: 'linear-gradient(180deg, rgba(100,180,255,0.06) 0%, rgba(100,180,255,0.02) 50%, transparent 100%)',
  accentBright: '#5BB8FF',
  accentDeep: '#1E6FCC',
}

// ---- STATUS CONFIG ----------------------------------------------------------
const STATUS_DOT = {
  WORKING:  { color: '#22C55E', glow: 'rgba(34,197,94,0.5)',  label: 'Active',   ring: '#22C55E' },
  IDLE:     { color: '#4A6080', glow: 'rgba(74,96,128,0.2)',   label: 'Idle',     ring: '#3A5070' },
  BLOCKED:  { color: '#EF4444', glow: 'rgba(239,68,68,0.5)',  label: 'Blocked',  ring: '#EF4444' },
  DONE:     { color: '#3B82F6', glow: 'rgba(59,130,246,0.4)', label: 'Done',     ring: '#3B82F6' },
  WAITING:  { color: '#F59E0B', glow: 'rgba(245,158,11,0.4)', label: 'Thinking', ring: '#F59E0B' },
  PAUSED:   { color: '#F97316', glow: 'rgba(249,115,22,0.4)', label: 'Paused',   ring: '#F97316' },
}

// ---- PUNCH LIST PARSER ------------------------------------------------------
function parsePunchList(markdown) {
  if (!markdown) return { projects: [], todayTasks: [] }

  const lines = markdown.split('\n')
  const projects = []
  const todayTasks = []
  let currentSection = ''
  let currentProject = null

  // Section name -> project config mapping
  const SECTION_MAP = {
    'RIGHT NOW':         { name: 'Right Now', section: 'rightnow',   color: '#FF6B3D', icon: 'zap' },  // Reverted to Right Now per Patrik (was briefly Inbox in Round 2).
    'YOUR TODOS':        { name: 'Your TODOs', section: 'your-todos', color: '#EF4444', icon: 'user-check' },  // Patrik's personal blocked items
    'FINISH THESE':      { name: 'Finish These', section: 'finish-these', color: '#6B8AB0', icon: 'history' },  // Stale tasks needing attention (was "Checking In")
    'CHECKING IN':       { name: 'Finish These', section: 'finish-these', color: '#6B8AB0', icon: 'history' },  // Legacy alias
    'SCHEDULE':          { name: 'Schedule',  section: 'schedule',   color: '#FF6B3D', icon: 'flame' },
    'TODAY':             { name: 'Schedule',  section: 'schedule',   color: '#FF6B3D', icon: 'flame' },  // Legacy alias
    'CORNER':            { name: 'Corner',    section: 'corner',     color: '#3B9EFF', icon: 'project' },
    'PRODUCT':           { name: 'Corner',    section: 'corner',     color: '#3B9EFF', icon: 'project' },
    'DASHBOARD':         { name: 'Corner',    section: 'corner',     color: '#3B9EFF', icon: 'project' },
    'AMBITION':          { name: 'Ambition',  section: 'ambition',   color: '#F59E0B', icon: 'project' },
    'AOM SITE PHASE 2':  { name: 'Phase 2',   section: 'aom-phase2', color: '#3B9EFF', icon: 'project' },
    'AOM SITE':          { name: 'AOM Site',  section: 'aom-site',   color: '#5BB8FF', icon: 'project' },
    'GO-TO-MARKET':      { name: 'Advisory',  section: 'gtm',        color: '#7C9A72', icon: 'project' },
    'OUTREACH':          { name: 'Outreach',  section: 'outreach',   color: '#EF4444', icon: 'project' },
    'CLIENT DEADLINE':   { name: 'Deadlines', section: 'deadlines',  color: '#F97316', icon: 'project' },
    'INFRASTRUCTURE':    { name: 'Infra',     section: 'infra',      color: '#4CAF50', icon: 'project' },
    'THIS WEEK':         { name: 'This Week', section: 'week',       color: '#9C27B0', icon: 'project' },
    'CLEO':              { name: 'Cleo',      section: 'cleo',       color: '#FF7043', icon: 'project' },
    'CONTENT':           { name: 'Content',   section: 'content',    color: '#FF7043', icon: 'project' },
    'ISA':               { name: 'ISA',       section: 'isa',        color: '#F97316', icon: 'project' },
    'SKYLAR':            { name: 'Skylar',    section: 'skylar',     color: '#EC4899', icon: 'project' },
    'KOHRS':             { name: 'KOHRS',     section: 'kohrs',      color: '#EF4444', icon: 'project' },
  }

  // CLIENT PROJECTS subsection -> pill config mapping
  // These are real paying clients. They MUST show in the HUD.
  const CLIENT_SUBSECTION_MAP = {
    'INCLUDED HEALTH':    { name: 'IH',        section: 'ih',         color: '#EF4444', icon: 'client', statusColor: '#EF4444' },
    'AMBITION':           { name: 'Ambition',  section: 'ambition-client', color: '#22C55E', icon: 'client', statusColor: '#22C55E' },
    'KOHRS':              { name: 'KOHRS',     section: 'kohrs-client',    color: '#EF4444', icon: 'client', statusColor: '#EF4444' },
    'ISA ENERGY':         { name: 'ISA',       section: 'isa-client',      color: '#F97316', icon: 'client', statusColor: '#EF4444' },
    'SKYLAR':             { name: 'Skylar',    section: 'skylar-client',   color: '#EC4899', icon: 'client', statusColor: '#F59E0B' },
    'BRANDON':            { name: 'Brandon',   section: 'brandon-client',  color: '#F59E0B', icon: 'client', statusColor: '#F59E0B' },
    'NABI':               { name: 'NABI',      section: 'nabi-client',     color: '#EF4444', icon: 'client', statusColor: '#EF4444' },
    'LBX':                { name: 'LBX',       section: 'lbx-client',      color: '#6B7280', icon: 'client', statusColor: '#6B7280' },
  }

  let inClientProjects = false // track when we're inside ## CLIENT PROJECTS

  for (const line of lines) {
    const trimmed = line.trim()

    // Handle ## section headers
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').trim()
      const sectionUpper = currentSection.toUpperCase()

      // Track CLIENT PROJECTS section
      if (sectionUpper.startsWith('CLIENT')) {
        inClientProjects = true
        currentProject = null
        continue
      } else {
        inClientProjects = false
      }

      if (sectionUpper.startsWith('AGENTS')) {
        currentProject = null
        continue
      }

      // Find matching section config
      let matched = null
      // Check "PHASE 2" variant before "AOM SITE"
      if (sectionUpper.includes('AOM SITE') && sectionUpper.includes('PHASE 2')) {
        matched = SECTION_MAP['AOM SITE PHASE 2']
      } else {
        for (const [key, config] of Object.entries(SECTION_MAP)) {
          if (key !== 'AOM SITE PHASE 2' && sectionUpper.startsWith(key)) {
            matched = config
            break
          }
        }
      }

      if (matched) {
        // Check if we already have a project with this section (merge)
        const existing = projects.find(p => p.section === matched.section)
        if (existing) {
          currentProject = existing
        } else {
          currentProject = { ...matched, tasks: [] }
          projects.push(currentProject)
        }
      } else {
        currentProject = null
      }
      continue
    }

    // Handle ### subsections inside CLIENT PROJECTS
    if (inClientProjects && trimmed.startsWith('### ')) {
      const subName = trimmed.replace('### ', '').trim()
      const subUpper = subName.toUpperCase()

      // Match against CLIENT_SUBSECTION_MAP
      let matched = null
      for (const [key, config] of Object.entries(CLIENT_SUBSECTION_MAP)) {
        if (subUpper.startsWith(key)) {
          matched = config
          break
        }
      }

      if (matched) {
        // Extract status from the ### line (e.g., "-- RED", "-- GREEN")
        const statusMatch = subName.match(/--(.*?)$/i)
        let statusTag = null
        if (statusMatch) {
          const tag = statusMatch[1].trim().toUpperCase()
          if (tag.includes('RED')) statusTag = 'RED'
          else if (tag.includes('GREEN')) statusTag = 'GREEN'
          else if (tag.includes('ORANGE')) statusTag = 'ORANGE'
          else if (tag.includes('YELLOW')) statusTag = 'YELLOW'
          else if (tag.includes('HOLD')) statusTag = 'HOLD'
        }

        // Extract revenue info from the ### line
        const revenueMatch = subName.match(/\$[\d,]+k?/i)
        const revenue = revenueMatch ? revenueMatch[0] : null

        const existing = projects.find(p => p.section === matched.section)
        if (existing) {
          currentProject = existing
          if (statusTag) currentProject.statusTag = statusTag
          if (revenue) currentProject.revenue = revenue
        } else {
          currentProject = { ...matched, tasks: [], isClient: true, statusTag, revenue }
          projects.push(currentProject)
        }
      } else {
        // Unknown subsection but still client. Create a generic entry.
        const cleanName = subName.replace(/\s*--.*$/, '').replace(/\*\*/g, '').trim()
        if (cleanName.length > 1 && cleanName.length < 40) {
          const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          currentProject = { name: cleanName, section: `client-${slug}`, color: '#6B7280', icon: 'client', tasks: [], isClient: true }
          projects.push(currentProject)
        } else {
          currentProject = null
        }
      }
      continue
    }

    // Parse task items (checkboxes) for regular sections
    if (currentProject && (trimmed.startsWith('- [') || trimmed.startsWith('| '))) {
      const isDone = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')
      const isCheckbox = trimmed.startsWith('- [')

      if (isCheckbox) {
        const lastBracket = trimmed.match(/\[([A-Za-z]+)\][\s]*$/)
        let agent = null
        if (lastBracket) {
          const name = lastBracket[1]
          const found = AGENTS.find(a => a.name.toLowerCase() === name.toLowerCase() || a.slug === name.toLowerCase())
          if (found) agent = found.slug
          if (!agent) {
            if (name.toLowerCase() === 'patrik') agent = 'patrik'
            else if (name.toLowerCase() === 'ash') agent = 'ash'
          }
        }

        let text = trimmed
          .replace(/^- \[[ xX]\]\s*/, '')
          .replace(/~~([^~]+)~~/, '$1')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\[([A-Za-z]+(?:\s*(?:--|[+])\s*[^\]]*)?)\]\s*$/, '')
          .replace(/\[([A-Za-z]+)\s*--\s*[^\]]*\]/, '')
          .trim()

        if (text.length > 80) text = text.slice(0, 77) + '...'

        const task = { text, done: isDone, agent, raw: trimmed, projectSource: currentProject.name, projectSection: currentProject.section, projectColor: currentProject.color }
        currentProject.tasks.push(task)

        if (currentProject.section === 'schedule' && !isDone) {
          todayTasks.push({ ...task, project: 'Schedule' })
        }
      }

      if (trimmed.startsWith('| ') && !trimmed.includes('---') && currentProject?.section === 'deadlines') {
        const cols = trimmed.split('|').map(s => s.trim()).filter(Boolean)
        if (cols.length >= 3 && cols[0] !== 'Client') {
          const text = `${cols[0]}: ${cols[1]} (${cols[2]})`
          const done = cols[3]?.toLowerCase().includes('done') || cols[3]?.toLowerCase().includes('wrapped')
          currentProject.tasks.push({ text: text.slice(0, 80), done, agent: null, raw: trimmed, projectSource: currentProject.name, projectSection: currentProject.section, projectColor: currentProject.color })
        }
      }
    }

    // Parse client project description lines as tasks (for CLIENT PROJECTS subsections)
    // These use `- **Label:**` format instead of checkboxes
    if (inClientProjects && currentProject?.isClient && trimmed.startsWith('- **')) {
      // Extract Action items as tasks, Status/What as info
      const labelMatch = trimmed.match(/^- \*\*(\w+):\*\*\s*(.*)$/)
      if (labelMatch) {
        const label = labelMatch[1].toLowerCase()
        const content = labelMatch[2].replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim()

        if (label === 'action' && content) {
          // Action items become tasks
          const isDone = content.toLowerCase().includes('done') || content.toLowerCase().includes('complete') || content.toLowerCase().includes('wrapped')
          let text = content
          if (text.length > 80) text = text.slice(0, 77) + '...'
          currentProject.tasks.push({ text, done: isDone, agent: null, raw: trimmed, isAction: true, projectSource: currentProject.name, projectSection: currentProject.section, projectColor: currentProject.color })
        } else if (label === 'status' && content) {
          // Status becomes a info task so the pill has content
          const isDone = content.toLowerCase().includes('done') || content.toLowerCase().includes('complete') || content.toLowerCase().includes('green')
          let text = content
          if (text.length > 80) text = text.slice(0, 77) + '...'
          currentProject.tasks.push({ text, done: isDone, agent: null, raw: trimmed, isStatus: true, projectSource: currentProject.name, projectSection: currentProject.section, projectColor: currentProject.color })
        }
      }
    }
  }

  return {
    projects: projects,  // Show all project pills even if empty (user adds tasks from the pill)
    todayTasks,
  }
}

// ---- RECENCY WEIGHTS (CONVERSATION-DRIVEN) ----------------------------------
// Projects ranked by what you TALK ABOUT, not static order.
// Fallback weights used when conversation data isn't available.
const DEFAULT_RECENCY_WEIGHTS = {
  'schedule':       100,  // Third (Patrik directive: Right Now > Your TODOs > Schedule > Finish These)
  'today':          100,  // Legacy alias for schedule
  'completed-feed': 99,   // Right after Right Now
  'your-todos':     98,   // Second (Patrik directive)
  'finish-these':   50,   // Last (Patrik directive) -- stale tasks
  'checking-in':    50,   // Legacy alias for finish-these
  'ih':             92,   // $9k payment pending -- RED
  'isa-client':     90,   // Apr 10 deadline -- RED
  'kohrs-client':   88,   // Behind on 10 videos -- RED
  'corner':         85,   // #1 product build
  'ambition-client':82,   // Active retainer -- GREEN
  'skylar-client':  78,   // Music video needs editing
  'aom-site':       75,   // Active site work
  'aom-phase2':     72,   // Phase 2 builds
  'ambition':       70,   // Ambition site build tasks
  'brandon-client': 68,   // Documentary
  'outreach':       65,   // Active outreach
  'gtm':            60,   // Advisory
  'nabi-client':    58,   // Kill date Mar 17
  'cleo':           55,   // Content
  'content':        55,
  'kohrs':          50,   // Old section (merged)
  'isa':            45,   // Old section (merged)
  'skylar':         40,   // Old section (merged)
  'lbx-client':     38,   // On hold
  'deadlines':      35,
  'infra':          30,
  'week':           25,
}

// Hook to fetch live conversation-driven recency scores
function useConversationRecency() {
  const [scores, setScores] = useState(null)

  useEffect(() => {
    if (!IS_LOCAL) return // Only works on localhost
    const fetchScores = async () => {
      try {
        const res = await fetch('/api/local/project-recency')
        if (!res.ok) return
        const json = await res.json()
        if (json.scores) setScores(json.scores)
      } catch {}
    }
    fetchScores()
    const timer = setInterval(fetchScores, 30000) // Refresh every 30s
    return () => clearInterval(timer)
  }, [])

  return scores
}

// ---- DATA HOOKS REPLACED BY useDataPipe (hooks/useDataPipe.js) ---------------
// Bobby2: All polling consolidated into ONE hook. See useDataPipe.js.
// Removed: usePunchListData, useRightNowLiveTasks, useCompletedFeed,
//          useAutoCheckFromNotifications, usePatrikTodos, useCheckingInTasks.
// ONE poll every 3s. THREE parallel fetches. ALL data computed in the same tick.


// ---- SIMS PLUMBOB SVG CLIP PATH (the iconic diamond shape) ------------------
function PlumbobClipDef({ id, size }) {
  const w = size
  const h = size
  const cx = w / 2
  const topPoint = h * 0.02
  const shoulderY = h * 0.22
  const maxWidth = w * 0.48
  const bottomY = h * 0.72

  return (
    <defs>
      <clipPath id={id}>
        <path d={`
          M ${cx} ${topPoint}
          L ${cx + maxWidth} ${shoulderY}
          L ${cx + maxWidth} ${bottomY}
          Q ${cx + maxWidth} ${h * 0.98}, ${cx} ${h * 0.98}
          Q ${cx - maxWidth} ${h * 0.98}, ${cx - maxWidth} ${bottomY}
          L ${cx - maxWidth} ${shoulderY}
          Z
        `} />
      </clipPath>
    </defs>
  )
}

// ---- AGENT PORTRAIT (LARGER: 52px desktop, plumbob shape, blue idle ring) ---
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

function AgentPortrait({ slug, size = 58, status = 'IDLE', onClick, onContextMenu, showName = false, index = 0 }) {
  const agent = AGENTS.find(a => a.slug === slug)
  const cfg = STATUS_DOT[status] || STATUS_DOT.IDLE
  const color = agent?.color || '#4A6080'
  const isActive = status === 'WORKING'
  const isBlocked = status === 'BLOCKED'
  const isDone = status === 'DONE'
  const isWaiting = status === 'WAITING'
  const isPaused = status === 'PAUSED'
  const hasSpriteFile = slug && SPRITE_AGENTS.includes(slug)
  const clipId = `plumbob-clip-${slug}`

  const w = size
  const h = size
  const cx = w / 2
  const topPoint = h * 0.02
  const shoulderY = h * 0.22
  const maxWidth = w * 0.48
  const bottomY = h * 0.72

  const outlinePath = `
    M ${cx} ${topPoint}
    L ${cx + maxWidth} ${shoulderY}
    L ${cx + maxWidth} ${bottomY}
    Q ${cx + maxWidth} ${h * 0.98}, ${cx} ${h * 0.98}
    Q ${cx - maxWidth} ${h * 0.98}, ${cx - maxWidth} ${bottomY}
    L ${cx - maxWidth} ${shoulderY}
    Z
  `

  return (
    <motion.div
      onClick={() => onClick?.(slug)}
      onContextMenu={(e) => onContextMenu?.(e, slug)}
      whileHover={{ scale: 1.18, y: -7, rotate: 2, transition: { type: 'spring', stiffness: 500, damping: 10, mass: 0.5 } }}
      whileTap={{ scale: 0.85, y: 3, scaleY: 0.9, scaleX: 1.05, transition: { type: 'spring', stiffness: 700, damping: 15 } }}
      title={`${agent?.name || slug}: ${cfg.label}`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Active agent glow - blue pulse per spec */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: -8,
          background: `radial-gradient(ellipse at center, ${cfg.glow} 0%, transparent 70%)`,
          animation: 'hudActiveGlow 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Blocked agent red pulse glow */}
      {isBlocked && (
        <div style={{
          position: 'absolute', inset: -6,
          background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.3) 0%, transparent 70%)',
          animation: 'hudBlockedPulse 1.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Waiting/thinking amber shimmer */}
      {isWaiting && (
        <div style={{
          position: 'absolute', inset: -5,
          background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.2) 0%, transparent 70%)',
          animation: 'hudWaitingPulse 2.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
        <PlumbobClipDef id={clipId} size={size} />

        {/* Background fill inside plumbob */}
        <path d={outlinePath} fill={`${color}20`} />

        {/* Agent sprite image clipped to plumbob shape */}
        {hasSpriteFile ? (
          <image
            href={`/corner/sprites/${slug}-idle.png`}
            x={-size * 0.15}
            y={-size * 0.05}
            width={size * 1.35}
            height={size * 1.35}
            clipPath={`url(#${clipId})`}
            style={{ imageRendering: 'pixelated' }}
            preserveAspectRatio="xMidYMin slice"
          />
        ) : (
          <g clipPath={`url(#${clipId})`}>
            <rect x={0} y={0} width={size} height={size} fill={`${color}25`} />
            <text
              x={cx} y={h * 0.58}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="700"
              fontSize={Math.max(12, size * 0.36)}
            >
              {agent?.name?.charAt(0) || '?'}
            </text>
          </g>
        )}

        {/* Plumbob outline stroke - status colored, thicker for active states */}
        <path
          d={outlinePath}
          fill="none"
          stroke={cfg.ring}
          strokeWidth={isActive ? 2.8 : isBlocked ? 2.5 : isDone ? 2.2 : 1.8}
          strokeLinejoin="round"
          style={{
            filter: (isActive || isBlocked) ? `drop-shadow(0 0 6px ${cfg.glow})` : isDone ? `drop-shadow(0 0 4px ${cfg.glow})` : 'none',
            transition: 'all 300ms ease',
          }}
        />

        {/* Inner highlight stroke for depth */}
        <path
          d={outlinePath}
          fill="none"
          stroke="rgba(100,180,255,0.1)"
          strokeWidth={0.5}
          strokeLinejoin="round"
          transform={`translate(0.5, 0.5) scale(${(size - 1) / size})`}
          style={{ transformOrigin: 'center' }}
        />
      </svg>

      {/* Status indicator at bottom center - varies by status */}
      {isDone ? (
        /* DONE: green checkmark badge */
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#22C55E',
          border: `2px solid ${HUD.panelBgSolid}`,
          boxShadow: '0 0 8px rgba(34,197,94,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={8} color="#FFF" strokeWidth={3} />
        </div>
      ) : isPaused ? (
        /* PAUSED: orange pause bars */
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#F97316',
          border: `2px solid ${HUD.panelBgSolid}`,
          boxShadow: '0 0 8px rgba(249,115,22,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Pause size={7} color="#FFF" strokeWidth={3} />
        </div>
      ) : isWaiting ? (
        /* WAITING: amber spinning indicator */
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#F59E0B',
          border: `2px solid ${HUD.panelBgSolid}`,
          boxShadow: '0 0 8px rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'hudWaitingSpin 3s linear infinite',
        }}>
          <Clock size={7} color="#FFF" strokeWidth={3} />
        </div>
      ) : (
        /* DEFAULT: status dot */
        <div style={{
          position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: cfg.color,
          border: `2px solid ${HUD.panelBgSolid}`,
          boxShadow: `0 0 8px ${cfg.glow}`,
          animation: isActive ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
        }} />
      )}

      {/* Blocked X badge - top right, LARGER and more visible */}
      {isBlocked && (
        <div style={{
          position: 'absolute', top: -3, right: -3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#EF4444', border: `2px solid ${HUD.panelBgSolid}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 10px rgba(239,68,68,0.6)',
          animation: 'hudBlockedBadge 2s ease-in-out infinite',
        }}>
          <X size={10} color="#FFF" strokeWidth={3} />
        </div>
      )}

      {/* Agent name below portrait (optional) */}
      {showName && agent?.name && (
        <div style={{
          position: 'absolute', top: size + 2, left: '50%', transform: 'translateX(-50%)',
          fontSize: 12, fontWeight: 600, color: cfg.color,
          fontFamily: "'Inter Tight', sans-serif",
          whiteSpace: 'nowrap', textAlign: 'center',
          letterSpacing: '0.01em',
          textShadow: `0 0 8px ${cfg.glow}`,
        }}>
          {agent.name}
        </div>
      )}
    </motion.div>
  )
}

// ---- AGENT ROSTER (Main agent prominent + expand + right-click revolver) ----
// Patrik directive: Show the MAIN agent (Elon) prominently. Expand button to see all.
// Right-click on an agent = paint board / revolver pop-out (fan out in arc).
const DEFAULT_MAIN_AGENT = 'elon'

function AgentRoster({ agentStatus, onAgentClick, onAgentContextMenu }) {
  const [expanded, setExpanded] = useState(false)
  const [revolverAgent, setRevolverAgent] = useState(null) // which agent triggered revolver
  const [revolverPos, setRevolverPos] = useState({ x: 0, y: 0 })
  const [searchFilter, setSearchFilter] = useState('')
  const revolverRef = useRef(null)

  const sortedAgents = useMemo(() => {
    const statusPriority = { WORKING: 0, BLOCKED: 1, WAITING: 2, PAUSED: 3, DONE: 4, IDLE: 5 }
    return [...AGENTS]
      .filter(a => a.slug !== 'paige' && a.slug !== 'pixel')
      .sort((a, b) => {
        const sa = agentStatus?.[a.slug]?.status || 'IDLE'
        const sb = agentStatus?.[b.slug]?.status || 'IDLE'
        return (statusPriority[sa] || 5) - (statusPriority[sb] || 5)
      })
  }, [agentStatus])

  const mainAgent = AGENTS.find(a => a.slug === DEFAULT_MAIN_AGENT) || AGENTS[0]
  const mainStatus = agentStatus?.[mainAgent?.slug]?.status || 'IDLE'
  const mainCfg = STATUS_DOT[mainStatus] || STATUS_DOT.IDLE
  const mainHasSpr = mainAgent && SPRITE_AGENTS.includes(mainAgent.slug)

  // Close revolver on click outside
  useEffect(() => {
    if (!revolverAgent) return
    const handler = (e) => {
      if (revolverRef.current && !revolverRef.current.contains(e.target)) {
        setRevolverAgent(null)
        setSearchFilter('')
      }
    }
    const keyHandler = (e) => {
      if (e.key === 'Escape') { setRevolverAgent(null); setSearchFilter('') }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [revolverAgent])

  // Right-click handler for revolver pop-out
  const handleRightClick = useCallback((e, slug) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setRevolverPos({ x: rect.left + rect.width / 2, y: rect.top })
    setRevolverAgent(slug)
    setSearchFilter('')
  }, [])

  const filteredAgents = useMemo(() => {
    if (!searchFilter.trim()) return sortedAgents
    const q = searchFilter.toLowerCase()
    return sortedAgents.filter(a => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q))
  }, [sortedAgents, searchFilter])

  return (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'center',
      padding: '0 2px', position: 'relative',
    }}>
      {/* MAIN agent: prominent, 52px plumbob */}
      <motion.div
        onClick={() => onAgentClick?.(mainAgent.slug)}
        onContextMenu={(e) => handleRightClick(e, mainAgent.slug)}
        whileHover={{ scale: 1.12, y: -4, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
        whileTap={{ scale: 0.9, y: 2 }}
        title={`${mainAgent.name}: ${mainCfg.label}`}
        style={{ cursor: 'pointer', position: 'relative', width: 52, height: 52, flexShrink: 0 }}
      >
        {mainStatus === 'WORKING' && (
          <div style={{
            position: 'absolute', inset: -6,
            background: `radial-gradient(ellipse at center, ${mainCfg.glow} 0%, transparent 70%)`,
            animation: 'hudActiveGlow 2s ease-in-out infinite', pointerEvents: 'none',
          }} />
        )}
        <svg width={52} height={52} viewBox="0 0 52 52" style={{ position: 'absolute', inset: 0 }}>
          <PlumbobClipDef id="main-agent-clip" size={52} />
          <path d={`M 26 ${52*0.02} L ${26+52*0.48} ${52*0.22} L ${26+52*0.48} ${52*0.72} Q ${26+52*0.48} ${52*0.98}, 26 ${52*0.98} Q ${26-52*0.48} ${52*0.98}, ${26-52*0.48} ${52*0.72} L ${26-52*0.48} ${52*0.22} Z`} fill={`${mainAgent.color}20`} />
          {mainHasSpr ? (
            <image href={`/corner/sprites/${mainAgent.slug}-idle.png`} x={-52*0.15} y={-52*0.05} width={52*1.35} height={52*1.35} clipPath="url(#main-agent-clip)" style={{ imageRendering: 'pixelated' }} preserveAspectRatio="xMidYMin slice" />
          ) : (
            <text x={26} y={52*0.58} textAnchor="middle" dominantBaseline="middle" fill={mainAgent.color} fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize={20}>{mainAgent.name?.charAt(0)}</text>
          )}
          <path d={`M 26 ${52*0.02} L ${26+52*0.48} ${52*0.22} L ${26+52*0.48} ${52*0.72} Q ${26+52*0.48} ${52*0.98}, 26 ${52*0.98} Q ${26-52*0.48} ${52*0.98}, ${26-52*0.48} ${52*0.72} L ${26-52*0.48} ${52*0.22} Z`} fill="none" stroke={mainCfg.ring} strokeWidth={2.5} strokeLinejoin="round" style={{ filter: mainStatus === 'WORKING' ? `drop-shadow(0 0 6px ${mainCfg.glow})` : 'none' }} />
        </svg>
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: mainCfg.color,
          border: `2px solid ${HUD.panelBgSolid}`, boxShadow: `0 0 10px ${mainCfg.glow}`,
          animation: mainStatus === 'WORKING' ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
        }} />
      </motion.div>

      {/* Expand button to see all agents -- VEGAS SIZE 36px */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: expanded ? 'rgba(59,158,255,0.15)' : 'rgba(100,180,255,0.06)',
          border: `2px solid ${expanded ? HUD.accent + '44' : HUD.divider}`,
          color: expanded ? HUD.accent : HUD.textMuted,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 150ms ease',
          fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
        }}
        title="Show all agents"
      >
        <Users size={18} />
      </motion.button>

      {/* Expanded: BIGGER 40px portraits for other agents -- VEGAS RULE */}
      <AnimatePresence>
        {expanded && sortedAgents.filter(a => a.slug !== mainAgent.slug).map((agent, idx) => {
          const status = agentStatus?.[agent.slug]?.status || 'IDLE'
          const cfg = STATUS_DOT[status] || STATUS_DOT.IDLE
          const hasSpr = SPRITE_AGENTS.includes(agent.slug)
          return (
            <motion.div
              key={agent.slug}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: idx * 0.02 }}
              onClick={() => onAgentClick?.(agent.slug)}
              onContextMenu={(e) => handleRightClick(e, agent.slug)}
              whileHover={{ scale: 1.2, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
              title={`${agent.name}: ${cfg.label}`}
              style={{
                width: 40, height: 40, minWidth: 40, minHeight: 40,
                borderRadius: '50%',
                border: `2.5px solid ${cfg.ring}`,
                overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                background: '#0A0F1E',
                boxShadow: status === 'WORKING' ? `0 0 12px ${cfg.glow}` : status === 'BLOCKED' ? `0 0 10px rgba(239,68,68,0.4)` : 'none',
                animation: status === 'WORKING' ? 'hudMiniDotPulse 2s ease-in-out infinite' : status === 'BLOCKED' ? 'hudMiniDotBlocked 1.5s ease-in-out infinite' : 'none',
                opacity: status === 'IDLE' ? 0.6 : 1,
              }}
            >
              {hasSpr ? (
                <img src={`/corner/sprites/${agent.slug}-idle.png`} alt=""
                  width={60} height={60}
                  style={{ width: 60, height: 60, objectFit: 'cover', objectPosition: '15% 5%', imageRendering: 'pixelated', display: 'block', marginLeft: -8, marginTop: -5 }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: agent.color || '#4A6080', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {agent.name?.charAt(0) || '?'}
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* REVOLVER POP-OUT (right-click on any agent bubble) */}
      <AnimatePresence>
        {revolverAgent && (
          <motion.div
            ref={revolverRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              position: 'fixed',
              left: Math.min(revolverPos.x - 120, window.innerWidth - 260),
              top: revolverPos.y - 260,
              width: 240,
              background: 'rgba(12, 18, 35, 0.97)',
              backdropFilter: 'blur(24px)',
              border: '2px solid rgba(100, 180, 255, 0.2)',
              borderRadius: 14,
              boxShadow: '0 16px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,180,255,0.08)',
              zIndex: 200, overflow: 'hidden',
              padding: '8px 0',
            }}
          >
            {/* Search input */}
            <div style={{ padding: '4px 12px 8px' }}>
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search agents..."
                autoFocus
                style={{
                  width: '100%', height: 36, background: 'rgba(100,180,255,0.06)',
                  border: '1.5px solid rgba(100,180,255,0.15)', borderRadius: 8,
                  padding: '0 12px', color: '#EDF2FA', fontSize: 16,
                  fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
                }}
              />
            </div>
            {/* Agent list */}
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: '0 4px' }}>
              {filteredAgents.map((agent, i) => {
                const status = agentStatus?.[agent.slug]?.status || 'IDLE'
                const cfg = STATUS_DOT[status] || STATUS_DOT.IDLE
                const hasSpr = SPRITE_AGENTS.includes(agent.slug)
                const isSelected = revolverAgent === agent.slug
                return (
                  <motion.button
                    key={agent.slug}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => {
                      onAgentClick?.(agent.slug)
                      setRevolverAgent(null)
                      setSearchFilter('')
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', background: isSelected ? 'rgba(59,158,255,0.12)' : 'none',
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      transition: 'background 80ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,180,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(59,158,255,0.12)' : 'none'}
                  >
                    {/* Mini avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', border: `2px solid ${cfg.ring}`,
                      overflow: 'hidden', flexShrink: 0, background: '#0A0F1E',
                    }}>
                      {hasSpr ? (
                        <img src={`/corner/sprites/${agent.slug}-idle.png`} alt=""
                          style={{ width: 46, height: 46, objectFit: 'cover', objectPosition: '15% 5%', imageRendering: 'pixelated', display: 'block', marginLeft: -7, marginTop: -5 }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: agent.color }}>
                          {agent.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Name + role */}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ color: '#EDF2FA', fontSize: 14, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{agent.name}</div>
                      <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{agent.role}</div>
                    </div>
                    {/* Status dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: cfg.color,
                      boxShadow: status === 'WORKING' ? `0 0 6px ${cfg.glow}` : 'none',
                      animation: status === 'WORKING' ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
                    }} />
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- PROJECT CARD (VEGAS ENERGY: Trello thickness, physical objects) ---------
// If you think it's big enough, DOUBLE IT. Slot machine buttons. Casino cards.
// Drop shadows, bold rounded corners, chunky, grabbable, satisfying.
function ProjectCard({ project, isExpanded, onClick, onContextMenu, isNightMode, wiggle }) {
  const isDaytime = isNightMode === false
  const realTasks = project.tasks.filter(t => !t.isAddPrompt)
  const totalTasks = realTasks.length
  const doneTasks = realTasks.filter(t => t.done).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const remaining = totalTasks - doneTasks
  const isSchedule = project.section === 'schedule' || project.section === 'today'
  const isRightNow = project.section === 'rightnow'
  const isTodoList = project.section === 'your-todos'
  const isFinishThese = project.section === 'finish-these' || project.section === 'checking-in'
  const hasLiveTasks = isRightNow && project.tasks.some(t => t.isLive)
  const isClient = project.isClient
  const allDone = remaining === 0 && totalTasks > 0

  // Client status tag colors
  const STATUS_TAG_COLORS = {
    RED: { bg: 'rgba(239,68,68,0.25)', border: 'rgba(239,68,68,0.5)', text: '#FF6B6B', glow: 'rgba(239,68,68,0.3)' },
    GREEN: { bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.4)', text: '#4ADE80', glow: 'rgba(34,197,94,0.2)' },
    ORANGE: { bg: 'rgba(249,115,22,0.2)', border: 'rgba(249,115,22,0.4)', text: '#FB923C', glow: 'rgba(249,115,22,0.2)' },
    YELLOW: { bg: 'rgba(234,179,8,0.2)', border: 'rgba(234,179,8,0.4)', text: '#FACC15', glow: 'rgba(234,179,8,0.2)' },
    HOLD: { bg: 'rgba(107,114,128,0.2)', border: 'rgba(107,114,128,0.3)', text: '#9CA3AF', glow: 'none' },
  }
  const tagStyle = isClient && project.statusTag ? STATUS_TAG_COLORS[project.statusTag] : null

  // Long-press for mobile context menu
  const longPressRef = useRef(null)
  const handlePillTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    longPressRef.current = setTimeout(() => {
      onContextMenu?.({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {}, stopPropagation: () => {} }, project)
    }, 500)
  }, [onContextMenu, project])
  const handlePillTouchEnd = useCallback(() => {
    clearTimeout(longPressRef.current)
  }, [])
  const handlePillTouchMove = useCallback(() => {
    clearTimeout(longPressRef.current)
  }, [])

  return (
    <motion.button
      className={wiggle ? 'pill-wiggle-glow' : undefined}
      onClick={onClick}
      onContextMenu={(e) => onContextMenu?.(e, project)}
      onTouchStart={handlePillTouchStart}
      onTouchEnd={handlePillTouchEnd}
      onTouchMove={handlePillTouchMove}
      animate={wiggle ? {
        scale: [1, 1.05, 0.98, 1.03, 1],
        y: [0, -2, 0, -1, 0],
        transition: { duration: 0.6, ease: 'easeInOut' },
      } : { scale: 1, y: 0 }}
      whileHover={{ scale: 1.08, y: -6, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
      whileTap={{ scale: 0.88, y: 4, transition: { type: 'spring', stiffness: 600, damping: 18 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        height: 28, padding: '2px 6px', minWidth: isRightNow ? 70 : 50,
        background: isDaytime
          ? (isExpanded
              ? `linear-gradient(135deg, ${project.color}18, ${project.color}08)`
              : isClient
                ? `linear-gradient(135deg, ${project.color}0C, ${project.color}06)`
                : isSchedule
                  ? 'linear-gradient(135deg, rgba(255,107,61,0.08), rgba(255,107,61,0.03))'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02))')
          : (isExpanded
              ? `linear-gradient(135deg, ${project.color}22, ${project.color}0C)`
              : isClient
                ? `linear-gradient(135deg, ${project.color}14, ${project.color}06)`
                : isSchedule
                  ? 'linear-gradient(135deg, rgba(255, 107, 61, 0.14), rgba(255, 107, 61, 0.06))'
                  : 'linear-gradient(135deg, rgba(100,180,255,0.07), rgba(100,180,255,0.02))'),
        border: isDaytime
          ? `2px solid ${isExpanded ? `${project.color}40` : isClient ? `${project.color}25` : isSchedule ? 'rgba(255,107,61,0.2)' : 'rgba(59,130,246,0.15)'}`
          : `2px solid ${isExpanded ? `${project.color}55` : isClient ? `${project.color}30` : isSchedule ? 'rgba(255, 107, 61, 0.28)' : 'rgba(100,180,255,0.14)'}`,
        borderRadius: 8,
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 200ms ease',
        // Suppress iOS white flash on long-press
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // VEGAS + CROSSY ROAD: Physical drop shadow. Chunky grabbable pills.
        boxShadow: isDaytime
          ? (isExpanded
              ? `0 4px 16px ${project.color}20, 0 1px 4px rgba(0,0,0,0.08)`
              : isClient && project.statusTag === 'RED'
                ? '0 2px 12px rgba(239,68,68,0.2), 0 1px 3px rgba(0,0,0,0.2)'
                : '0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)')
          : (isExpanded
              ? `0 6px 24px ${project.color}30, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`
              : isClient && project.statusTag === 'RED'
                ? `0 4px 20px rgba(239,68,68,0.2), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`
                : isSchedule
                  ? '0 4px 20px rgba(255,107,61,0.2), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : '0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)'),
      }}
    >
      {/* Bottom progress fill */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: `${progress}%`, height: 2,
        background: `linear-gradient(90deg, ${project.color}70, ${project.color})`,
        transition: 'width 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        borderRadius: '0 0 7px 7px',
      }} />

      {/* Side accent for Right Now, Schedule, Your TODOs, or RED clients */}
      {(isRightNow || isSchedule || isTodoList || (isClient && project.statusTag === 'RED')) && (
        <div style={{
          position: 'absolute', left: 0, top: 4, bottom: 4,
          width: 2, borderRadius: 1,
          background: isTodoList ? '#EF4444' : isRightNow ? project.color : isSchedule ? project.color : '#EF4444',
          animation: (isRightNow && hasLiveTasks) ? 'statusPulse 1.5s ease-in-out infinite' : (isTodoList || (isClient && project.statusTag === 'RED')) ? 'statusPulse 2s ease-in-out infinite' : 'none',
        }} />
      )}

      {/* Project indicator - BIGGER. Icons per section type. */}
      {isRightNow ? (
        <Zap size={10} color={project.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 4px ${project.color}AA)`, animation: hasLiveTasks ? 'statusPulse 2s ease-in-out infinite' : 'none' }} />
      ) : isTodoList ? (
        <AlertCircle size={10} color="#EF4444" style={{ flexShrink: 0 }} />
      ) : isFinishThese ? (
        <History size={10} color="#94A3B8" style={{ flexShrink: 0 }} />
      ) : isSchedule ? (
        <Flame size={10} color={project.color} style={{ flexShrink: 0 }} />
      ) : isClient ? (
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: project.color,
          boxShadow: `0 0 6px ${project.color}55`,
          flexShrink: 0,
        }} />
      ) : (
        <div style={{
          width: 7, height: 7, borderRadius: 2,
          background: allDone ? `${project.color}60` : project.color,
          boxShadow: allDone ? 'none' : `0 0 6px ${project.color}55`,
          flexShrink: 0,
        }} />
      )}

      {/* Name - compact pill label */}
      <span style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11, fontWeight: 700,
        color: isExpanded
          ? '#FFFFFF'
          : isDaytime ? '#F1F5F9' : (isSchedule ? '#EDF2FA' : HUD.textPrimary),
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 90,
        letterSpacing: '-0.01em',
        textTransform: 'uppercase',
        textShadow: 'none',
      }}>
        {project.name}
      </span>

      {/* LIVE dot for Right Now pill */}
      {isRightNow && hasLiveTasks && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#FF6B3D',
          boxShadow: '0 0 4px rgba(255,107,61,0.7)',
          animation: 'statusPulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }} />
      )}

      {/* NEEDS YOU dot for Your TODOs pill */}
      {isTodoList && remaining > 0 && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#EF4444',
          flexShrink: 0,
          animation: 'statusPulse 2.5s ease-in-out infinite',
        }} />
      )}

      {/* STALE dot for Finish These pill */}
      {isFinishThese && remaining > 0 && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#6B8AB0',
          flexShrink: 0,
        }} />
      )}

      {/* Revenue badge for clients -- compact */}
      {isClient && project.revenue && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, fontWeight: 700,
          color: project.color,
          background: `${project.color}15`,
          padding: '1px 4px', borderRadius: 3,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          border: `1px solid ${project.color}30`,
        }}>
          {project.revenue}
        </span>
      )}

      {/* Status dot for tagged pills (client status) */}
      {tagStyle && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: tagStyle.text,
          flexShrink: 0,
          boxShadow: tagStyle.glow !== 'none' ? `0 0 5px ${tagStyle.glow}` : 'none',
          animation: project.statusTag === 'RED' ? 'statusPulse 2.5s ease-in-out infinite' : 'none',
        }} />
      )}

      {/* Task count badge - compact */}
      {remaining > 0 && !isClient && (
        <span style={{
          fontFamily: "'Inter Tight', JetBrains Mono, monospace",
          fontSize: 9, fontWeight: 800,
          color: '#FFF',
          background: project.color,
          padding: '1px 4px', borderRadius: 4,
          lineHeight: 1,
          minWidth: 14, textAlign: 'center',
          whiteSpace: 'nowrap',
        }}>
          {remaining}
        </span>
      )}

      {allDone && (
        <CheckCircle2 size={10} color={project.color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      )}
    </motion.button>
  )
}

// ---- EXPANDED TASK PANEL (blue glass, game-styled, interactive checkboxes) ---
// DONE(bobby2): DAYTIME WHITE EXTENDS TO RIGHT NOW -- TaskPanel now accepts isNightMode and flips to white/light glass in daytime.
// DONE(bobby2): RIGHT NOW INLINE ADD TASK -- isAddPrompt tasks render as an inline text input. Enter adds to localStorage manual tasks. Manual tasks are right-clickable + checkable.
function TaskPanel({ project, onClose, isNightMode, onAddManualTask, onAddProjectTask, onToggleManualTask, onDeleteManualTask, allProjects, onTaskContextMenu, onAddToRightNow, hudTaskCtxId, onNavigateToProject, onNavigateToAgent, onMarkInboxRead, highlightedTask, rightNowTasks }) {
  const isDaytime = isNightMode === false
  // Daytime palette for the expanded task panel (brighter blue glass, vibrant accents)
  const tpBg = isDaytime ? 'rgba(18, 42, 75, 0.97)' : HUD.panelBg
  const tpBorder = isDaytime ? 'rgba(59, 130, 246, 0.3)' : HUD.panelBorder
  const tpShadow = isDaytime
    ? '0 -12px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(100,180,255,0.12)'
    : '0 -12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(100,180,255,0.08)'
  const tpDivider = isDaytime ? 'rgba(59, 130, 246, 0.18)' : HUD.divider
  const tpTextPrimary = isDaytime ? '#F1F5F9' : HUD.textPrimary
  const tpTextMuted = isDaytime ? '#94B8D8' : HUD.textMuted
  const tpGlow = isDaytime
    ? 'linear-gradient(180deg, rgba(59,130,246,0.12) 0%, transparent 100%)'
    : 'linear-gradient(180deg, rgba(100,180,255,0.05) 0%, transparent 100%)'
  const tpCheckboxBorder = isDaytime ? 'rgba(59,130,246,0.3)' : 'rgba(100,180,255,0.18)'
  const tpCheckboxBg = isDaytime ? 'rgba(59,130,246,0.12)' : 'rgba(100,180,255,0.03)'
  const tpCloseBg = isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(100,180,255,0.06)'
  const tpCloseHoverBg = isDaytime ? 'rgba(59,130,246,0.25)' : 'rgba(100,180,255,0.12)'
  const tpProgressBg = isDaytime ? 'rgba(59,130,246,0.12)' : 'rgba(100,180,255,0.06)'
  // Local state for optimistic checkbox toggling
  const [localToggles, setLocalToggles] = useState({}) // task index -> toggled done state
  const [saving, setSaving] = useState(null) // which task index is saving
  // Inline add-task input state
  const [addingTask, setAddingTask] = useState(false)
  const [addTaskText, setAddTaskText] = useState('')
  const addTaskInputRef = useRef(null)
  // Task drag-and-drop reorder within this pill
  const [taskDragOrder, setTaskDragOrder] = useState(() => {
    try {
      const key = `hud-task-order-${project.section}`
      const saved = JSON.parse(localStorage.getItem(key) || 'null')
      return Array.isArray(saved) ? saved : null
    } catch { return null }
  })
  const [draggingTaskIdx, setDraggingTaskIdx] = useState(null)
  const [taskDropIdx, setTaskDropIdx] = useState(null)
  // Long-press visual feedback: track which task is being pressed
  const [pressingTaskId, setPressingTaskId] = useState(null)
  // Swipe-to-dismiss (mobile): track touch start Y, swipe down > 60px = close
  const swipeStartY = useRef(0)
  const handleSwipeTouchStart = useCallback((e) => {
    swipeStartY.current = e.touches[0].clientY
  }, [])
  const handleSwipeTouchEnd = useCallback((e) => {
    const deltaY = e.changedTouches[0].clientY - swipeStartY.current
    if (deltaY > 60) onClose() // swipe down = dismiss
  }, [onClose])

  const tasks = project.tasks
  const getTaskDone = (task, idx) => localToggles[idx] !== undefined ? localToggles[idx] : task.done
  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t, i) => getTaskDone(t, i)).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const sortedTasks = useMemo(() => {
    let base = tasks.map((t, i) => ({ ...t, origIdx: i }))
    // Apply custom drag order if set
    if (taskDragOrder && taskDragOrder.length > 0) {
      const indexMap = new Map(taskDragOrder.map((txt, i) => [txt, i]))
      base = [...base].sort((a, b) => {
        const ia = indexMap.has(a.text) ? indexMap.get(a.text) : 9999
        const ib = indexMap.has(b.text) ? indexMap.get(b.text) : 9999
        return ia - ib
      })
    } else {
      // Default: done tasks to bottom
      base = base.sort((a, b) => {
        const aDone = getTaskDone(a, a.origIdx)
        const bDone = getTaskDone(b, b.origIdx)
        if (aDone === bDone) return 0
        return aDone ? 1 : -1
      })
    }
    return base
  }, [tasks, localToggles, taskDragOrder])

  // Toggle checkbox: write to punch-list.md via API
  const toggleTask = useCallback(async (task, origIdx) => {
    if (!IS_LOCAL || !task.raw) return
    const currentDone = getTaskDone(task, origIdx)
    const newDone = !currentDone

    // Optimistic update
    setLocalToggles(prev => ({ ...prev, [origIdx]: newDone }))
    setSaving(origIdx)

    try {
      const res = await fetch('/api/local/punch-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineText: task.raw, markDone: newDone }),
      })
      if (!res.ok) {
        // Revert on failure
        setLocalToggles(prev => {
          const next = { ...prev }
          delete next[origIdx]
          return next
        })
      }
    } catch {
      // Revert on error
      setLocalToggles(prev => {
        const next = { ...prev }
        delete next[origIdx]
        return next
      })
    } finally {
      setSaving(null)
    }
  }, [localToggles])

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onTouchStart={handleSwipeTouchStart}
      onTouchEnd={handleSwipeTouchEnd}
      style={{
        position: 'absolute', bottom: '100%', left: 8, right: 8,
        background: tpBg,
        backdropFilter: 'blur(24px)',
        border: `2px solid ${tpBorder}`,
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
        maxHeight: 'min(380px, calc(100vh - 200px))',
        boxShadow: tpShadow,
      }}
    >
      {/* Drag handle (mobile swipe indicator) */}
      <div style={{
        display: 'flex', justifyContent: 'center', padding: '8px 0 4px',
        cursor: 'grab',
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: isDaytime ? 'rgba(59,130,246,0.25)' : 'rgba(100,180,255,0.2)',
        }} />
      </div>

      {/* Inner glow at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 50,
        background: tpGlow,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px 12px',
        borderBottom: `1px solid ${tpDivider}`,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 12, height: 12, borderRadius: 4,
            background: project.color,
            boxShadow: `0 0 12px ${project.color}44`,
          }} />
          <span style={{
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 26, fontWeight: 900,
            color: tpTextPrimary,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}>
            {project.name}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600,
            color: tpTextMuted,
          }}>
            {doneTasks}/{totalTasks}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Progress bar - THICKER per Steffen spec (12px) */}
          <div style={{
            width: 100, height: 12, borderRadius: 6,
            background: tpProgressBg,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: `linear-gradient(90deg, ${project.color}AA, ${project.color})`,
              borderRadius: 6,
              transition: 'width 300ms ease',
            }} />
          </div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700,
            color: project.color,
            minWidth: 32,
          }}>
            {progress}%
          </span>

          <button
            onClick={onClose}
            style={{
              background: tpCloseBg, border: `1px solid ${tpDivider}`,
              borderRadius: 8, cursor: 'pointer',
              color: tpTextMuted,
              width: 44, height: 44, minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = tpCloseHoverBg; e.currentTarget.style.color = isDaytime ? '#8BA4C4' : HUD.textSecondary }}
            onMouseLeave={e => { e.currentTarget.style.background = tpCloseBg; e.currentTarget.style.color = tpTextMuted }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Inline add-task input -- TOP of every expanded pill (except inbox + completed) */}
      {!project.isInbox && !project.isCompletedFeed && (
        <div style={{
          padding: '8px 16px 4px',
          borderBottom: `1px solid ${tpDivider}`,
        }}>
          {addingTask ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${project.color}66`,
                background: `${project.color}12`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: project.color, fontSize: 13, fontWeight: 800, lineHeight: 1 }}>+</span>
              </div>
              <input
                ref={addTaskInputRef}
                autoFocus
                value={addTaskText}
                onChange={e => setAddTaskText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && addTaskText.trim()) {
                    if (project.section === 'rightnow') {
                      onAddManualTask?.(addTaskText.trim())
                    } else {
                      onAddProjectTask?.(addTaskText.trim(), project.section, project.name)
                    }
                    setAddTaskText('')
                    setAddingTask(false)
                  }
                  if (e.key === 'Escape') {
                    setAddTaskText('')
                    setAddingTask(false)
                  }
                }}
                onBlur={() => {
                  if (addTaskText.trim()) {
                    if (project.section === 'rightnow') {
                      onAddManualTask?.(addTaskText.trim())
                    } else {
                      onAddProjectTask?.(addTaskText.trim(), project.section, project.name)
                    }
                  }
                  setAddTaskText('')
                  setAddingTask(false)
                }}
                placeholder="Add a task, hit Enter..."
                style={{
                  flex: 1,
                  background: `${project.color}08`,
                  border: `1.5px solid ${project.color}44`,
                  borderRadius: 7,
                  padding: '6px 10px',
                  fontSize: 14, fontWeight: 500,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: tpTextPrimary,
                  outline: 'none',
                  caretColor: project.color,
                }}
              />
            </div>
          ) : (
            <motion.div
              onClick={() => setAddingTask(true)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', padding: '4px 0',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `1.5px dashed ${project.color}44`,
                background: `${project.color}08`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: project.color, fontSize: 13, fontWeight: 800, lineHeight: 1 }}>+</span>
              </div>
              <span style={{
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 500,
                color: `${project.color}88`,
                fontStyle: 'italic',
              }}>
                Add task...
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* Task list */}
      <div style={{
        padding: '8px 16px 16px',
        overflowY: 'auto', maxHeight: 300,
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
      }} className="hud-scroll">
        {sortedTasks.map((task, i) => {
          const isDone = getTaskDone(task, task.origIdx)
          const isSaving = saving === task.origIdx

          // INBOX CARD: agent message preview with colored left edge + click to navigate
          // Read cards: opacity 0.5, strikethrough on agent name, greyed text, still clickable
          if (task.isInboxCard) {
            const INBOX_AGENT_COLORS = {
              elon: '#4CAF50', bobby: '#3B82F6', steffen: '#F59E0B', steve: '#EC4899',
              cleo: '#9C27B0', alex: '#EF4444', mom: '#06B6D4', tony: '#F97316',
              jacob: '#10B981', colton: '#E85D26', elmo: '#C9A84C', paige: '#66BB6A', pixel: '#8B5CF6',
            }
            const agentColor = INBOX_AGENT_COLORS[task.agent] || '#3B9EFF'
            const agentName = task.agent ? task.agent.charAt(0).toUpperCase() + task.agent.slice(1) : 'Agent'
            const relTime = task.timestamp ? formatRelativeTime(task.timestamp) : ''
            const isRead = !!task.isRead
            return (
              <motion.div
                key={task.id || `inbox-${task.agent}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isRead ? 0.5 : 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.15 }}
                onClick={() => {
                  onMarkInboxRead?.(task.id)
                  onNavigateToAgent?.(task.agent)
                }}
                whileHover={{ x: 3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  padding: '10px 12px',
                  borderBottom: i < sortedTasks.length - 1 ? `1px solid ${tpDivider}` : 'none',
                  borderLeft: `3px solid ${isRead ? `${agentColor}60` : agentColor}`,
                  cursor: 'pointer',
                  borderRadius: 4,
                  transition: 'background 150ms ease',
                  opacity: isRead ? 0.5 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = isDaytime ? 'rgba(59,158,255,0.1)' : 'rgba(59,158,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 700,
                    color: isRead ? tpTextMuted : tpTextPrimary,
                    textDecoration: isRead ? 'line-through' : 'none',
                  }}>
                    {agentName}
                  </span>
                  {relTime && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: tpTextMuted }}>
                      {relTime}
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12,
                  color: tpTextMuted, lineHeight: 1.4,
                  textDecoration: isRead ? 'line-through' : 'none',
                }}>
                  {task.text || '(no preview)'}
                </span>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={task.isManual ? `manual-${task.manualId}` : task.origIdx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: draggingTaskIdx === i ? 0.4 : 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.15 }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', String(i))
                setDraggingTaskIdx(i)
              }}
              onDragEnd={() => { setDraggingTaskIdx(null); setTaskDropIdx(null) }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (i !== draggingTaskIdx) setTaskDropIdx(i)
              }}
              onDragLeave={() => setTaskDropIdx(null)}
              onDrop={(e) => {
                e.preventDefault()
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
                if (isNaN(fromIdx) || fromIdx === i) { setDraggingTaskIdx(null); setTaskDropIdx(null); return }
                const current = sortedTasks.map(t => t.text)
                const reordered = [...current]
                const [moved] = reordered.splice(fromIdx, 1)
                reordered.splice(i, 0, moved)
                setTaskDragOrder(reordered)
                try { localStorage.setItem(`hud-task-order-${project.section}`, JSON.stringify(reordered)) } catch {}
                setDraggingTaskIdx(null); setTaskDropIdx(null)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onTaskContextMenu?.(e, task, project)
              }}
              onTouchStart={(e) => {
                // Long-press for mobile context menu (500ms)
                const touch = e.touches[0]
                const taskId = task.isManual ? `manual-${task.manualId}` : task.origIdx
                setPressingTaskId(taskId)
                const timer = setTimeout(() => {
                  e.preventDefault?.()
                  setPressingTaskId(null)
                  onTaskContextMenu?.({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {}, stopPropagation: () => {} }, task, project)
                }, 500)
                e.currentTarget._longPressTimer = timer
              }}
              onTouchEnd={(e) => {
                clearTimeout(e.currentTarget._longPressTimer)
                setPressingTaskId(null)
              }}
              onTouchMove={(e) => {
                clearTimeout(e.currentTarget._longPressTimer)
                setPressingTaskId(null)
              }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 16px',
                minHeight: 44,
                borderBottom: i < sortedTasks.length - 1 ? `1px solid ${tpDivider}` : 'none',
                borderTop: taskDropIdx === i ? `2px solid ${project.color || '#3B9EFF'}` : '2px solid transparent',
                opacity: isDone ? 0.35 : 1,
                transition: 'opacity 200ms ease, background 300ms ease, border-left 300ms ease, border-top 100ms ease, transform 150ms ease, box-shadow 150ms ease',
                cursor: 'grab',
                // Suppress iOS white flash on tap/long-press
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                // Long-press visual feedback: subtle lift + shadow (no color change)
                transform: pressingTaskId === (task.isManual ? `manual-${task.manualId}` : task.origIdx) ? 'scale(1.01)' : 'scale(1)',
                boxShadow: pressingTaskId === (task.isManual ? `manual-${task.manualId}` : task.origIdx) ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
                // Highlight when navigated-to OR context menu open
                background: highlightedTask && task.text === highlightedTask.text
                  ? (isDaytime ? 'rgba(59,158,255,0.25)' : 'rgba(59,158,255,0.2)')
                  : hudTaskCtxId === (task.isManual ? `manual-${task.manualId}` : task.origIdx)
                    ? (isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.15)')
                    : 'transparent',
                borderLeft: highlightedTask && task.text === highlightedTask.text
                  ? `3px solid ${project.color || '#3B9EFF'}`
                  : hudTaskCtxId === (task.isManual ? `manual-${task.manualId}` : task.origIdx)
                    ? `3px solid ${project.color || '#3B82F6'}`
                    : '3px solid transparent',
              }}
            >
              {/* RTN badge - orange dot when task is promoted to Right Now */}
              {(() => {
                const isInRightNow = !task.isAddPrompt && !task.done && rightNowTasks?.some(rt => rt.text === task.text)
                if (!isInRightNow) return null
                return (
                  <div title="In Right Now" style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#FF6B3D',
                    flexShrink: 0, alignSelf: 'center',
                    boxShadow: '0 0 6px rgba(255,107,61,0.7)',
                    animation: 'statusPulse 1.5s ease-in-out infinite',
                  }} />
                )
              })()}

              {/* Checkbox - CLICKABLE (44px touch target via padding) */}
              <motion.div
                onClick={() => {
                  if (task.isManual) {
                    onToggleManualTask?.(task.manualId)
                  } else {
                    toggleTask(task, task.origIdx)
                  }
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                  border: isDone ? 'none' : `1.5px solid ${tpCheckboxBorder}`,
                  background: isDone ? (task.autoChecked ? '#22C55E' : project.color) : tpCheckboxBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease',
                  cursor: 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                  boxShadow: task.autoChecked ? '0 0 8px rgba(34,197,94,0.4)' : 'none',
                  // 44px touch target via invisible padding (checkbox visual stays 18px, tap area 38px)
                  padding: 10, margin: -10, boxSizing: 'content-box',
                }}>
                {isDone && <Check size={14} color="#FFF" strokeWidth={3} />}
              </motion.div>

              {/* Task text - LARGER. Clickable if task has a project link. */}
              <span
                onClick={() => {
                  if (task.projectSource || task.projectSection) {
                    onNavigateToProject?.(task)
                  }
                }}
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, fontWeight: 400,
                  color: isDone ? tpTextMuted : tpTextPrimary,
                  lineHeight: 1.45,
                  textDecoration: isDone ? 'line-through' : 'none',
                  flex: 1,
                  cursor: (task.projectSource || task.projectSection) ? 'pointer' : 'default',
                }}
              >
                {task.text}
                {/* Project source badge - shows which project this task lives in */}
                {(task.projectSource || task.projectSection) && !isDone && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginLeft: 8, verticalAlign: 'middle',
                    fontSize: 10, fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: task.projectColor || '#60A5FA',
                    background: `${task.projectColor || '#60A5FA'}15`,
                    border: `1px solid ${task.projectColor || '#60A5FA'}30`,
                    borderRadius: 4, padding: '1px 6px',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    opacity: 0.8,
                  }}>
                    {task.projectSource || task.projectSection}
                  </span>
                )}
              </span>

              {/* RTN button -- visible tap target for mobile/iPad. Right-click context menu handles desktop. */}
              {!isDone && onAddToRightNow && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddToRightNow(task)
                  }}
                  onTouchEnd={(e) => {
                    // Prevent long-press timer from also triggering
                    e.stopPropagation()
                  }}
                  title="Send to Right Now"
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: '1px solid rgba(255,107,61,0.3)',
                    borderRadius: 5,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    color: '#FF6B3D',
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.04em',
                    opacity: 0.55,
                    transition: 'opacity 150ms, border-color 150ms',
                    // 44px tap target via padding on touch
                    minHeight: 28,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'rgba(255,107,61,0.7)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.borderColor = 'rgba(255,107,61,0.3)' }}
                >
                  →
                </button>
              )}

              {/* LIVE / QUEUED badge for agent tasks */}
              {task.isLive && (
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, fontWeight: 800,
                  color: task.isQueued ? '#D946EF' : '#FF6B3D',
                  background: task.isQueued ? 'rgba(217,70,239,0.12)' : 'rgba(255,107,61,0.12)',
                  padding: '2px 6px', borderRadius: 4,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: task.isQueued ? '1px solid rgba(217,70,239,0.25)' : '1px solid rgba(255,107,61,0.25)',
                  flexShrink: 0,
                  animation: task.isQueued ? 'none' : 'statusPulse 2s ease-in-out infinite',
                }}>
                  {task.isQueued ? 'QUEUED' : 'LIVE'}
                </span>
              )}

              {/* Agent badge */}
              {task.agent && (() => {
                const a = AGENTS.find(x => x.slug === task.agent)
                const hasSpr = task.agent && SPRITE_AGENTS.includes(task.agent)
                return (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: `1.5px solid ${a?.color || '#4A6080'}`,
                    overflow: 'hidden', flexShrink: 0,
                    background: `${a?.color || '#4A6080'}15`,
                  }} title={a?.name || task.agent}>
                    {hasSpr ? (
                      <img
                        src={`/corner/sprites/${task.agent}-idle.png`}
                        alt=""
                        style={{
                          width: 42, height: 42,
                          objectFit: 'cover', objectPosition: '20% 8%',
                          imageRendering: 'pixelated', display: 'block',
                          marginLeft: -6, marginTop: -3,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: a?.color || '#4A6080',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}>
                        {a?.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                )
              })()}
            </motion.div>
          )
        })}
      </div>

    </motion.div>
  )
}

// Shared style for HUD context menu buttons
const hudCtxBtn = (isNight) => ({
  display: 'block', width: '100%', textAlign: 'left',
  padding: '8px 14px', background: 'none', border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  color: isNight ? '#E2E8F0' : '#E2E8F0',
  fontFamily: "'Inter', sans-serif",
  transition: 'background 100ms',
})

// ---- COMPACT STATS (blue-themed, LARGER) ------------------------------------
function CompactStats({ agentStatus, throughput, overallProgress, isNightMode }) {
  const working = throughput?.working || Object.values(agentStatus || {}).filter(a => a?.status === 'WORKING').length
  const blocked = throughput?.blocked || Object.values(agentStatus || {}).filter(a => a?.status === 'BLOCKED').length

  const labelColor = isNightMode === false ? '#8BA4C4' : HUD.textMuted

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }} />
        <span style={{ color: '#22C55E' }}>{working}</span>
        <span style={{ color: labelColor, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>active</span>
      </div>
      {blocked > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }} />
          <span style={{ color: '#EF4444' }}>{blocked}</span>
          <span style={{ color: labelColor, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>blocked</span>
        </div>
      )}
      {/* Mini progress ring - LARGER */}
      <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
        <svg width={40} height={40} viewBox="0 0 40 40">
          <circle cx={20} cy={20} r={15} fill="none" stroke={isNightMode === false ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.08)'} strokeWidth={3} />
          <circle
            cx={20} cy={20} r={15}
            fill="none" stroke={isNightMode === false ? '#60A5FA' : HUD.accent} strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${overallProgress * 0.942} 94.2`}
            transform="rotate(-90 20 20)"
            style={{ transition: 'stroke-dasharray 600ms ease', filter: `drop-shadow(0 0 4px ${isNightMode === false ? 'rgba(96,165,250,0.35)' : HUD.accentGlow})` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: isNightMode === false ? '#60A5FA' : HUD.accent,
        }}>
          {overallProgress}%
        </div>
      </div>
    </div>
  )
}

// ---- MAIN HUD ---------------------------------------------------------------
// DONE(bobby2): Chat input REMOVED from bottom bar per Patrik directive. Chat lives ONLY in sidebar.
// Bottom bar = agent roster | scrollable project pills | compact stats | notification bell
export default function GameHUD({
  agentStatus, throughput, onAgentClick, isMobile,
  // Chat integration props (onExpandChat still used for bell/notification click -> open sidebar)
  chatAgent, onChatSubmit, onExpandChat,
  // Context menu props
  onAgentContextMenu, onProjectContextMenu,
  // Inbox: navigate to an agent's chat when clicking an inbox card
  onNavigateToAgent,
  // Daytime/nighttime theme -- when false, bottom HUD goes white/vibrant blue to match top bar
  isNightMode: isNightModeProp,
  // External pill expansion: GameDashboard can ask HUD to expand a specific pill
  expandPillSection,
  onExpandPillHandled,
  // Archived pills: hidden until explicitly re-enabled
  hiddenPills,
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
    // Delay listener so the originating right-click/long-press event doesn't immediately close the menu.
    // Use a longer delay (150ms) for touch so the touchend from the long-press clears before we listen.
    const delay = 150
    const timer = setTimeout(() => {
      const handler = (e) => {
        // Don't close if clicking inside the menu itself
        const menu = document.querySelector('[data-hud-ctx-menu]')
        if (menu && menu.contains(e.target)) return
        setHudTaskCtx(null)
      }
      document.addEventListener('mousedown', handler)
      // Also dismiss on touchstart outside (iPad/mobile -- mousedown doesn't fire reliably)
      document.addEventListener('touchstart', handler, { passive: true })
      // Store cleanup ref
      hudTaskCtx._cleanup = () => {
        document.removeEventListener('mousedown', handler)
        document.removeEventListener('touchstart', handler)
      }
    }, delay)
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
  // External pill expansion (from GameDashboard context menu "Add Task")
  // Store the pending section to expand; consumed after filteredProjects is available
  const pendingExpandRef = useRef(null)
  useEffect(() => {
    if (expandPillSection) {
      pendingExpandRef.current = expandPillSection
      onExpandPillHandled?.()
    }
  }, [expandPillSection]) // eslint-disable-line react-hooks/exhaustive-deps
  const [highlightedTask, setHighlightedTask] = useState(null) // { text: string } - flash-highlight after navigating from another pill
  const [overflowOpen, setOverflowOpen] = useState(false) // +N overflow popover
  const overflowRef = useRef(null)
  const overflowButtonRef = useRef(null) // anchor for fixed-position popover
  const [overflowPos, setOverflowPos] = useState({ bottom: 0, right: 0 }) // popover anchor coords
  // Track viewport width so desktop (>=1280px) skips the MAX_VISIBLE pill cap
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  // Track Right Now pill count for wiggle animation on new tasks
  const prevRightNowCountRef = useRef(0)
  const [rightNowWiggle, setRightNowWiggle] = useState(false)
  // Pill drag-and-drop: custom ordering saved in localStorage
  const [pillCustomOrder, setPillCustomOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hud-pill-order') || 'null') || null } catch { return null }
  })
  const [draggingPill, setDraggingPill] = useState(null) // section key being dragged
  const [pillDropTarget, setPillDropTarget] = useState(null) // section key of drop target
  // navigateToProject uses a ref so it doesn't depend on projects useMemo (avoids ordering issue)
  const projectsRef = useRef([]);
  // useDataPipe: ONE hook, ONE poll (3s), ALL data. Replaces 6 separate polling hooks.
  const {
    rightNow: liveRightNowTasks,
    completedFeed,
    inboxItems,
    yourTodos: patrikTodos,
    finishThese: checkingInTasks,
    isAutoChecked,
    punchData,
    punchLoading: loading,
    refetch: refetchPipeData,
  } = useDataPipe(parsePunchList)
  const hudRef = useRef(null)
  const conversationScores = useConversationRecency()

  // DONE(bobby2): MANUAL TASKS for Right Now -- persisted in localStorage under 'corner-rightnow-manual-tasks'
  const [manualTasks, setManualTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('corner-rightnow-manual-tasks')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  // Sync manual tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('corner-rightnow-manual-tasks', JSON.stringify(manualTasks))
    } catch {}
  }, [manualTasks])

  const addManualTask = useCallback((text) => {
    setManualTasks(prev => [...prev, { id: Date.now(), text, done: false, createdAt: new Date().toISOString() }])
  }, [])

  // Add a task to a project pill (not Right Now) -- writes to Supabase tasks table with project context
  const addProjectTask = useCallback(async (text, sectionSlug, sectionName) => {
    // Optimistically add to a local pending set so the pill refreshes immediately
    // The real refresh comes from the POST + refetch below
    try {
      await fetch('/api/dashboard/agent-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          project: sectionSlug || sectionName || null,
          agent: 'elon',
          status: 'todo',
        }),
      })
      // Immediately refetch so the new task appears in the pill list without waiting for the next 3s poll
      refetchPipeData?.()
    } catch {}
  }, [refetchPipeData])

  const toggleManualTask = useCallback((id) => {
    setManualTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }, [])

  const deleteManualTask = useCallback((id) => {
    setManualTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  // Add any task to Right Now (mobile-friendly alternative to right-click context menu)
  // Production: writes to Supabase tasks table (status='active') so the task appears in the Right Now ticker.
  // Localhost fallback: writes to localStorage only (no Supabase in local dev).
  const addToRightNow = useCallback(async (task) => {
    // localhost fallback -- keep localStorage write so dev mode still works
    try {
      const saved = JSON.parse(localStorage.getItem('corner-right-now-tasks') || '[]')
      if (!saved.some(t => t.text === task.text)) {
        saved.push({
          id: Date.now(),
          text: task.text,
          agent: task.agent || 'patrik',
          addedAt: new Date().toISOString(),
        })
        localStorage.setItem('corner-right-now-tasks', JSON.stringify(saved))
      }
    } catch {}

    // Production: write to Supabase so useDataPipe picks it up via the tasks filter
    // useDataPipe production path: data.tasks.filter(t => t.status === 'active' || 'working' || 'in_progress')
    if (!IS_LOCAL) {
      try {
        await fetch('/api/dashboard/agent-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: task.agent || 'user',
            text: task.text,
            status: 'active',
            source: 'user',
          }),
        })
        // Immediately refetch so the task appears in Right Now ticker without waiting for next 3s poll
        refetchPipeData?.()
      } catch {}
    }
  }, [refetchPipeData])

  // INBOX READ STATE: track read message IDs in localStorage
  // read IDs are stored as { id, readAt } -- readAt used for ordering (oldest read = first to archive)
  const [readInboxIds, setReadInboxIds] = useState(() => {
    try {
      const saved = localStorage.getItem('corner-inbox-read')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  // Sync to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('corner-inbox-read', JSON.stringify(readInboxIds))
    } catch {}
  }, [readInboxIds])
  // Mark an inbox message as read -- adds id to set, auto-prunes oldest beyond max
  const MAX_READ_VISIBLE = 5
  const markInboxRead = useCallback((id) => {
    if (!id) return
    setReadInboxIds(prev => {
      if (prev.some(r => r.id === id)) return prev // already read
      const next = [...prev, { id, readAt: Date.now() }]
      // Keep only the most recent MAX_READ_VISIBLE + some buffer for archiving
      // Oldest beyond MAX_READ_VISIBLE auto-archive (disappear from inbox entirely)
      if (next.length > MAX_READ_VISIBLE) {
        // Sort oldest first, drop oldest beyond cap
        next.sort((a, b) => a.readAt - b.readAt)
        return next.slice(next.length - MAX_READ_VISIBLE)
      }
      return next
    })
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
    // Live agent tasks get LIVE badge. Manual tasks (from localStorage) don't. Add prompt always at end.
    const rightNowTasks = []
    // Live agent tasks first
    liveRightNowTasks.forEach(t => {
      rightNowTasks.push({
        text: `${(t.agent || '').charAt(0).toUpperCase() + (t.agent || '').slice(1)}: ${t.text}`,
        done: false,
        agent: t.agent,
        raw: '',
        isLive: true,
        isQueued: t.isQueued || false,
      })
    })
    // Manual tasks (from localStorage)
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
    // Note: add-task input now lives at the TOP of every expanded TaskPanel (not as a list item)
    merged.push({
      name: 'Right Now',
      section: 'rightnow',
      color: '#FF6B3D',
      icon: 'zap',
      tasks: rightNowTasks,
    })

    // INBOX: Unread assistant messages from Supabase (one card per agent)
    // Split into unread (top) and read (bottom, max 5). Read items beyond 5 auto-archive (dropped).
    const readIdSet = new Set((readInboxIds || []).map(r => r.id))
    const allInboxCards = (inboxItems || []).map(item => ({
      text: item.text,
      agent: item.agent,
      timestamp: item.timestamp,
      id: item.id,
      done: readIdSet.has(item.id), // read = "done" for pill count purposes
      isRead: readIdSet.has(item.id),
      isInboxCard: true,
    }))
    const unreadCards = allInboxCards.filter(c => !c.isRead)
    const readCards = allInboxCards.filter(c => c.isRead).slice(0, MAX_READ_VISIBLE)
    merged.push({
      name: 'Inbox',
      section: 'inbox',
      color: '#3B9EFF',
      icon: 'mail',
      tasks: [...unreadCards, ...readCards],
      isInbox: true,
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
    // REMOVED from pill bar per Patrik directive (Mar 20, 2026) -- kept for future use
    // if (patrikTodos.length > 0) {
    //   const existingTodos = merged.find(p => p.section === 'your-todos')
    //   if (!existingTodos) {
    //     merged.push({
    //       name: 'Your TODOs',
    //       section: 'your-todos',
    //       color: '#EF4444',
    //       icon: 'user-check',
    //       tasks: patrikTodos.map(t => ({
    //         text: t.text,
    //         done: false,
    //         agent: 'patrik',
    //         raw: t.raw,
    //         projectSource: t.project,
    //         projectSection: t.projectSection,
    //         projectColor: t.projectColor,
    //       })),
    //       isTodoList: true,
    //     })
    //   }
    // }

    // FINISH THESE: Stale tasks that haven't had movement
    // REMOVED from pill bar per Patrik directive (Mar 20, 2026) -- kept for future use
    // if (checkingInTasks.length > 0) {
    //   const existingStale = merged.find(p => p.section === 'finish-these')
    //   if (!existingStale) {
    //     merged.push({
    //       name: 'Finish These',
    //       section: 'finish-these',
    //       color: '#6B8AB0',
    //       icon: 'history',
    //       tasks: checkingInTasks.map(t => ({
    //         text: t.text,
    //         done: false,
    //         agent: t.agent,
    //         raw: t.raw,
    //         projectSource: t.project,
    //         projectSection: t.projectSection,
    //         projectColor: t.projectColor,
    //         isStale: true,
    //       })),
    //       isFinishThese: true,
    //     })
    //   }
    // }

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
    // Sort order (Patrik directive Mar 20, 2026): Right Now > Inbox > Completed > project pills
    const PILL_ORDER = { 'rightnow': 0, 'inbox': 1, 'completed-feed': 2 }
    return [...merged].sort((a, b) => {
      const aOrder = PILL_ORDER[a.section]
      const bOrder = PILL_ORDER[b.section]
      // Both are pinned pills -- sort by fixed order
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder
      // Pinned pills always come before project pills
      if (aOrder !== undefined) return -1
      if (bOrder !== undefined) return 1
      // Both are project pills -- sort by conversation weight, then task count
      const aWeight = weights[a.section] || 10
      const bWeight = weights[b.section] || 10
      if (aWeight !== bWeight) return bWeight - aWeight
      // Secondary: incomplete tasks (more = first)
      const aRemaining = a.tasks.filter(t => !t.done).length
      const bRemaining = b.tasks.filter(t => !t.done).length
      if (bRemaining !== aRemaining) return bRemaining - aRemaining
      return b.tasks.length - a.tasks.length
    })
  }, [punchData, conversationScores, liveRightNowTasks, completedFeed, inboxItems, isAutoChecked, patrikTodos, checkingInTasks, manualTasks, readInboxIds])

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

  // Filter projects by search query, then apply custom pill order, then exclude hidden pills
  const filteredProjects = useMemo(() => {
    let list = projects
    // Exclude hidden/archived pills (unless searching, so user can find them)
    if (!searchQuery.trim() && hiddenPills && hiddenPills.length > 0) {
      list = list.filter(p => !hiddenPills.includes(p.section))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = projects.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.section.toLowerCase().includes(q) ||
        p.tasks.some(t => t.text.toLowerCase().includes(q))
      )
    }
    // Apply custom drag order (only when no search active, so search shows natural order)
    if (!searchQuery.trim() && pillCustomOrder && pillCustomOrder.length > 0) {
      const indexMap = new Map(pillCustomOrder.map((s, i) => [s, i]))
      return [...list].sort((a, b) => {
        const ia = indexMap.has(a.section) ? indexMap.get(a.section) : 9999
        const ib = indexMap.has(b.section) ? indexMap.get(b.section) : 9999
        return ia - ib
      })
    }
    return list
  }, [projects, searchQuery, pillCustomOrder, hiddenPills])

  // Consume pending expand (from GameDashboard context menu "Add Task")
  useEffect(() => {
    if (!pendingExpandRef.current || filteredProjects.length === 0) return
    const section = pendingExpandRef.current
    pendingExpandRef.current = null
    const target = filteredProjects.find(p => p.section === section || p.name === section)
    if (target) setExpandedProject(target)
  }, [filteredProjects])

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
      // Close overflow popover if clicking outside it
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setExpandedProject(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Track viewport width for desktop pill cap bypass
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
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
            onAddProjectTask={addProjectTask}
            onToggleManualTask={toggleManualTask}
            onDeleteManualTask={deleteManualTask}
            onAddToRightNow={addToRightNow}
            allProjects={projects}
            hudTaskCtxId={hudTaskCtx?.taskId}
            onTaskContextMenu={(e, task, proj) => {
              setHudTaskCtx({ task, project: proj, taskId: task.isManual ? `manual-${task.manualId}` : task.origIdx, x: e.clientX, y: e.clientY })
            }}
            onNavigateToProject={navigateToProject}
            onNavigateToAgent={(slug) => {
              setExpandedProject(null)
              onNavigateToAgent?.(slug)
            }}
            onMarkInboxRead={markInboxRead}
            highlightedTask={highlightedTask}
            rightNowTasks={liveRightNowTasks}
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
                  className={task.done ? '' : (task.isLive ? 'ticker-task-live' : 'ticker-task-new')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: isMobile ? '10px 14px' : '4px 12px',
                    minHeight: isMobile ? 44 : 'auto',
                    background: task.done
                      ? 'rgba(34,197,94,0.12)'
                      : task.isQueued
                        ? 'rgba(217,70,239,0.12)'
                        : task.isLive
                          ? 'rgba(255,107,61,0.12)'
                          : 'rgba(100,180,255,0.08)',
                    border: `1.5px solid ${task.done ? 'rgba(34,197,94,0.3)' : task.isQueued ? 'rgba(217,70,239,0.3)' : task.isLive ? 'rgba(255,107,61,0.25)' : 'rgba(100,180,255,0.15)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 150ms ease, border-color 150ms ease',
                  }}
                >
                  {task.done ? (
                    <CheckCircle2 size={13} color="#22C55E" style={{ flexShrink: 0 }} />
                  ) : task.isLive ? (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: task.isQueued ? '#D946EF' : '#FF6B3D',
                      boxShadow: task.isQueued ? '0 0 6px rgba(217,70,239,0.6)' : '0 0 6px rgba(255,107,61,0.6)',
                      animation: task.isQueued ? 'none' : 'statusPulse 1.5s ease-in-out infinite',
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
          gap: isMobile ? 4 : 6,
          minHeight: isMobile ? 40 : 44,
          position: 'relative',
          zIndex: 1,
          padding: isMobile ? '2px 0' : '4px 0',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}>
                <Loader2 size={12} style={{ color: hudTextMuted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: hudTextMuted }}>
                  Loading...
                </span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: hudTextMuted, padding: '0 8px' }}>
                {searchQuery ? 'No matches' : 'No task data'}
              </span>
            ) : (() => {
              // Desktop (>=1280px) shows ALL pills -- no cap. Mobile/tablet caps at 8 with overflow.
              const isDesktop = windowWidth >= 1280
              const MAX_VISIBLE = 8
              const visiblePills = isDesktop ? filteredProjects : filteredProjects.slice(0, MAX_VISIBLE)
              const overflowPills = isDesktop ? [] : filteredProjects.slice(MAX_VISIBLE)
              return (
                <>
                  {visiblePills.map(project => (
                    <div
                      key={project.section}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', project.section)
                        setDraggingPill(project.section)
                      }}
                      onDragEnd={() => {
                        setDraggingPill(null)
                        setPillDropTarget(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (project.section !== draggingPill) setPillDropTarget(project.section)
                      }}
                      onDragLeave={() => setPillDropTarget(null)}
                      onDrop={(e) => {
                        e.preventDefault()
                        const fromSection = e.dataTransfer.getData('text/plain')
                        if (!fromSection || fromSection === project.section) {
                          setDraggingPill(null); setPillDropTarget(null); return
                        }
                        // Reorder: move fromSection to before project.section
                        const currentOrder = filteredProjects.map(p => p.section)
                        const fromIdx = currentOrder.indexOf(fromSection)
                        const toIdx = currentOrder.indexOf(project.section)
                        if (fromIdx === -1 || toIdx === -1) { setDraggingPill(null); setPillDropTarget(null); return }
                        const reordered = [...currentOrder]
                        reordered.splice(fromIdx, 1)
                        reordered.splice(toIdx, 0, fromSection)
                        setPillCustomOrder(reordered)
                        try { localStorage.setItem('hud-pill-order', JSON.stringify(reordered)) } catch {}
                        setDraggingPill(null); setPillDropTarget(null)
                      }}
                      style={{
                        opacity: draggingPill === project.section ? 0.45 : 1,
                        outline: pillDropTarget === project.section ? '2px solid rgba(59,130,246,0.6)' : 'none',
                        borderRadius: 8,
                        transition: 'opacity 120ms ease, outline 120ms ease',
                        flexShrink: 0,
                      }}
                    >
                      <ProjectCard
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
                      />
                    </div>
                  ))}
                  {/* +N overflow button -- fixed position popover so it's never clipped by overflow:hidden parents */}
                  {overflowPills.length > 0 && (
                    <div ref={overflowRef} style={{ position: 'relative', flexShrink: 0 }}>
                      <motion.button
                        ref={overflowButtonRef}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!overflowOpen) {
                            // Capture button position for fixed popover anchor
                            const rect = e.currentTarget.getBoundingClientRect()
                            setOverflowPos({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right })
                          }
                          setOverflowOpen(o => !o)
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        style={{
                          height: 28, padding: '2px 8px',
                          background: overflowOpen
                            ? (isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.14)')
                            : (isDaytime ? 'rgba(59,130,246,0.07)' : 'rgba(100,180,255,0.06)'),
                          border: `1.5px solid ${overflowOpen ? (isDaytime ? 'rgba(59,130,246,0.45)' : 'rgba(100,180,255,0.35)') : hudDivider}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          color: overflowOpen ? hudAccent : hudTextMuted,
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms ease',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        +{overflowPills.length}
                      </motion.button>
                      {/* Overflow popover -- fixed position so it escapes overflow:hidden parents */}
                      <AnimatePresence>
                        {overflowOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                            style={{
                              position: 'fixed',
                              bottom: overflowPos.bottom,
                              right: overflowPos.right,
                              background: isDaytime ? 'rgba(12, 28, 55, 0.97)' : 'rgba(8, 16, 32, 0.97)',
                              backdropFilter: 'blur(20px)',
                              border: `1.5px solid ${isDaytime ? 'rgba(59,130,246,0.3)' : 'rgba(100,180,255,0.2)'}`,
                              borderRadius: 10,
                              boxShadow: '0 -8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(100,180,255,0.05)',
                              padding: '8px',
                              display: 'grid',
                              gridTemplateColumns: overflowPills.length > 3 ? 'repeat(3, auto)' : `repeat(${overflowPills.length}, auto)`,
                              gap: 4,
                              zIndex: 9999,
                              minWidth: 140,
                              maxWidth: 320,
                            }}
                          >
                            {overflowPills.map(project => (
                              <ProjectCard
                                key={project.section}
                                project={project}
                                isExpanded={expandedProject?.section === project.section}
                                onClick={() => {
                                  setOverflowOpen(false)
                                  setExpandedProject(
                                    expandedProject?.section === project.section ? null : project
                                  )
                                }}
                                onContextMenu={onProjectContextMenu}
                                isNightMode={isNightMode}
                                wiggle={false}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )
            })()}
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

          {/* Notification bell removed -- Inbox pill IS the notification system now */}
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
      `}</style>

      {/* Task right-click context menu (rendered outside all overflow containers) */}
      {hudTaskCtx && (() => {
        // Position near the right-click/long-press point, clamped to viewport
        const menuW = 260
        const menuH = 240
        const rawX = hudTaskCtx.x || window.innerWidth / 2
        const rawY = hudTaskCtx.y || window.innerHeight - 120
        const posX = Math.min(rawX, window.innerWidth - menuW - 8)
        const posY = rawY + menuH > window.innerHeight - 8 ? rawY - menuH - 4 : rawY + 4
        return (
        <div data-hud-ctx-menu style={{
          position: 'fixed',
          left: posX,
          top: posY,
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
            addToRightNow(hudTaskCtx.task)
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
            <button key={p.name} onClick={() => {
              const task = hudTaskCtx.task
              // For manual tasks: delete from current section + add to target
              if (task.isManual) {
                deleteManualTask?.(task.manualId)
              }
              // Add to target pill as a manual task with the target section
              try {
                const all = JSON.parse(localStorage.getItem('corner-manual-tasks') || '[]')
                all.push({
                  id: Date.now(),
                  text: task.text,
                  done: false,
                  agent: p.section,
                  projectSection: p.section,
                  movedFrom: hudTaskCtx.project?.section,
                })
                localStorage.setItem('corner-manual-tasks', JSON.stringify(all))
              } catch {}
              setHudTaskCtx(null)
            }}
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
        )
      })()}
    </div>
  )
}
