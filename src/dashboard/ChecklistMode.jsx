// Corner C3.1: Checklist Mode (GROUPED BY PROJECT)
// Steve's coach fix: group by project, not agent. Reuses GameHUD's parsePunchList.
// Working checkboxes wired. Apple Reminders meets Linear. Clean, typography-driven.
// TODO(steffen-design): Checklist priority badges (TODAY, THIS WEEK) -- review color palette against brand. Current orange/red may clash with agent status colors. Ensure visual hierarchy: high-priority tasks pop, low-priority recede. [SURVIVES: Pure UI styling. No engine dependency.]
// TODO(steffen-design): Checklist project sidebar -- icons/avatars for each project category. Currently text-only pills. Consider small project logos or color-coded dots matching the agent room colors. [SURVIVES: UI panel. Room colors may reference engine palette but sidebar logic stays.]
// DONE(bobby2): Task right-click context menu -- right-click any task for: mark done/undone, set priority (high/med/low), reassign agent, delete. Linear/Notion style.
// TODO(patrik): Task drag-and-drop -- click and drag to reorder priority within a project. Drag to move between projects. Trello card energy. Use react-beautiful-dnd or @dnd-kit/sortable. [SURVIVES: Drag-and-drop is React UI logic. No engine dependency.]
// DONE(bobby2): RIGHT NOW PILL (CHECKLIST) -- Right Now section at TOP of checklist (before Today). Shows active agent tasks with avatars + progress bars + LIVE badges. Data from agent-notifications.md TASK entries + relay activity. Drag-to target for priority escalation (drag-and-drop TODO(patrik) still open). Ref: Patrik feedback Pass 21.
// DONE(bobby): LABEL SIDEBAR COUNTS (CHECKLIST) -- All count badges now show "N left" instead of bare numbers. Sidebar (mobile + desktop), project group headers all labeled. "Done" section already labeled. Ref: Patrik feedback Pass 22.
//
// FILE OWNER: Bobby2 (HUD team). Bobby (Canvas team) does NOT touch this file.
//
// ========== PATRIK DIRECTIVES (Pass 25, lines 258-263) ==========
// DONE(bobby2): LIVE TASK UPDATES IN CHECKLIST -- useAutoCheckFromNotifications() polls agent-notifications.md every 3s, extracts TASK FINISHED/SHIPPED/DELIVERED descriptions, fuzzy-matches against task text (2+ keyword overlap), auto-checks matching items. Priority sort: Right Now > Today > by-importance. Ref: Patrik feedback line 258-259, 263.
// DONE(bobby2): RIGHT NOW REDESIGNED -- Per Patrik correction: Right Now = ONLY running agents. Fake progress % removed. Live pulse bar (CSS animation) replaces static progress. Completed tasks separated into their own "Completed" feed section. Ref: Patrik correction overriding line 253.
// ==========
//
// ========== PATRIK DIRECTIVES (Pass 26, lines 273-275) ==========
// DONE(bobby2): RIGHT NOW CHECKLIST COLOR = ORANGE/FIRE -- Changed all Right Now colors from green (#3BFF6B / rgba(59,255,107)) to orange (#FF6B3D / rgba(255,107,61)). Matches HUD pill color. Green = done, orange = active sprint. Ref: Patrik feedback line 273.
// DONE(bobby2): DAYTIME WHITE CHECKLIST RIGHT NOW -- ChecklistMode detects 8pm threshold (same as GameHUD). Right Now section title, task cards, and avatars all flip to light palette in daytime. Ref: Patrik feedback line 274.
// ==========
//
// ========== TASK LIFECYCLE (Pass 27) ==========
// DONE(bobby2): THREE-TIER TASK LIFECYCLE in checklist view.
// (1) RIGHT NOW = Real-time active tasks (existing, enhanced). Orange/fire energy, LIVE badges, progress bars.
// (2) YOUR TODOS = Patrik's personal TODO list. Tasks tagged [Patrik] from punch-list. Red accent, "NEEDS YOU" badge, checkbox energy.
// (3) FINISH THESE = Stale tasks (was "Checking In"). Gray/amber, muted "STALE" badge, nudge to reassign or close.
// Sidebar order: Right Now > Your TODOs > Schedule > projects > Finish These (last).
// ==========
//
// ========== PATRIK DIRECTIVES (Pass 28, latest feedback) ==========
// TODO(patrik): SCHEDULE = GOOGLE CALENDAR CHECKLIST -- Schedule section pulls Google Calendar events as a task list sorted by time. When event time passes, auto-check it off. Day-by-day navigation (arrows, not month view). Add new event inline (day, time, invitees) writes directly to Google Calendar MCP. Data sources: patrikmatheson@gmail.com + hello@aom-inhouse.com calendars. Ref: bobby/last-conversation.md Schedule section.
// TODO(patrik): PILL DRAG-TO-REORDER + PERSIST -- Pills are drag-to-reorder and the custom order persists in localStorage. Current pill rendering has no drag support. Ref: bobby/last-conversation.md section order.
// TODO(patrik): ARCHIVE PILL (CHECKLIST) -- Completed tasks go to Archive pill with accordion by month/day/year. Small "Archive" link at bottom of each pill task list. Searchable. If task existed at any point, it's in the archive. Ref: bobby/last-conversation.md item 16.
// TODO(patrik): RIGHT-CLICK CONTEXT MENU (CHECKLIST) -- Extend existing TaskContextMenu with: Add to Right Now, Move to Project (submenu), Add Context (inline note). Unify with GameDashboard ContextMenu into shared component at src/dashboard/components/TaskContextMenu.jsx. Full spec: projects/steffen/right-click-menu-spec.md. Ref: bobby/last-conversation.md.
// ==========

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronDown, Check, Plus, GripVertical,
  LayoutGrid, FolderKanban, Flame, CheckCircle2,
  CheckSquare, Square, Trash2, ArrowUpCircle, ArrowRightCircle, ArrowDownCircle, UserCircle2,
  Zap, AlertCircle, History,
} from 'lucide-react'
import { AGENTS } from './gridSpec.js'

// Sprite avatar (duplicated here to avoid circular imports, small component)
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

function SpriteAvatar({ agentSlug, size = 32, borderColor, style: extraStyle }) {
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)
  const agent = AGENTS.find(a => a.slug === agentSlug)
  const color = borderColor || agent?.color || '#6B7280'

  if (hasSpriteFile) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
        overflow: 'hidden', flexShrink: 0, background: '#0A0F1E',
        ...extraStyle,
      }}>
        <img
          src={`/corner/sprites/${agentSlug}-idle.png`}
          alt=""
          style={{
            width: size * 2,
            height: size * 2,
            objectFit: 'cover',
            objectPosition: '15% 5%',
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
      </div>
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(12, size * 0.35), fontWeight: 700, color, background: `${color}33`,
      flexShrink: 0, ...extraStyle,
    }}>
      {agent?.name?.charAt(0) || '?'}
    </div>
  )
}

// ---- PUNCH LIST PARSER (same as GameHUD, reused for project grouping) --------
function parsePunchList(markdown) {
  if (!markdown) return { projects: [], todayTasks: [] }

  const lines = markdown.split('\n')
  const projects = []
  const todayTasks = []
  let currentSection = ''
  let currentProject = null

  const SECTION_MAP = {
    'RIGHT NOW':         { name: 'Right Now', section: 'rightnow',   color: '#FF6B3D', icon: 'zap' },  // DONE(bobby2): orange/fire to match Today's urgency energy
    'YOUR TODOS':        { name: 'Your TODOs', section: 'your-todos', color: '#EF4444', icon: 'user-check' },
    'FINISH THESE':      { name: 'Finish These', section: 'finish-these', color: '#94A3B8', icon: 'history' },  // Was "Checking In"
    'CHECKING IN':       { name: 'Finish These', section: 'finish-these', color: '#94A3B8', icon: 'history' },  // Legacy alias
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

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').trim()
      const sectionUpper = currentSection.toUpperCase()

      if (sectionUpper.startsWith('AGENTS')) {
        currentProject = null
        continue
      }

      let matched = null
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

        if (text.length > 100) text = text.slice(0, 97) + '...'

        currentProject.tasks.push({ text, done: isDone, agent, raw: trimmed })

        if (currentProject.section === 'schedule' && !isDone) {
          todayTasks.push({ text, done: isDone, agent, project: 'Schedule' })
        }
      }

      if (trimmed.startsWith('| ') && !trimmed.includes('---') && currentProject?.section === 'deadlines') {
        const cols = trimmed.split('|').map(s => s.trim()).filter(Boolean)
        if (cols.length >= 3 && cols[0] !== 'Client') {
          const text = `${cols[0]}: ${cols[1]} (${cols[2]})`
          const done = cols[3]?.toLowerCase().includes('done') || cols[3]?.toLowerCase().includes('wrapped')
          currentProject.tasks.push({ text: text.slice(0, 100), done, agent: null, raw: trimmed })
        }
      }
    }
  }

  return {
    projects: projects.filter(p => p.tasks.length > 0),
    todayTasks,
  }
}

// Default recency weights (fallback when conversation data unavailable)
const DEFAULT_RECENCY_WEIGHTS = {
  'rightnow':       110,
  'your-todos':     108,
  'schedule':       105,
  'today':          105,   // Legacy alias for schedule
  'completed-feed': 100,
  'finish-these':   50,   // Last -- stale tasks (was checking-in)
  'checking-in':    50,   // Legacy alias for finish-these
  'corner':     95,
  'aom-site':   85,
  'aom-phase2': 80,
  'ambition':   70,
  'outreach':   65,
  'gtm':        60,
  'cleo':       55,
  'content':    55,
  'kohrs':      50,
  'isa':        45,
  'skylar':     40,
  'deadlines':  35,
  'infra':      30,
  'week':       25,
}

// Hook to fetch live conversation-driven recency scores
function useConversationRecency() {
  const [scores, setScores] = useState(null)

  useEffect(() => {
    if (!IS_LOCAL) return
    const fetchScores = async () => {
      try {
        const res = await fetch('/api/local/project-recency')
        if (!res.ok) return
        const json = await res.json()
        if (json.scores) setScores(json.scores)
      } catch {}
    }
    fetchScores()
    const timer = setInterval(fetchScores, 30000)
    return () => clearInterval(timer)
  }, [])

  return scores
}

// TODO(steve): DUPLICATED HOOKS -- useRightNowTasks and useCompletedFeed are nearly identical copies in ChecklistMode.jsx and GameHUD.jsx (useRightNowLiveTasks / useCompletedFeed). Both parse active-missions.md and agent-notifications.md the same way. Extract to a shared hooks file (e.g., src/dashboard/hooks/useAgentData.js). Current state: 2 copies of ~60 lines each, 4 copies total across 2 hooks.
// ---- RIGHT NOW: RUNNING agents from active-missions.md ----------------
// PATRIK CORRECTION: Right Now = ONLY agents that are RUNNING. Not finished tasks.
// One line per running agent: avatar + agent name + current task.
function useRightNowTasks() {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    if (!IS_LOCAL) return

    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/local/file?path=context/active-missions.md')
        if (!res.ok) return
        const json = await res.json()
        if (!json.content) return

        // Parse the "## Running" table
        const content = json.content
        const runningSection = content.split(/^## Running/m)[1]
        if (!runningSection) { setTasks([]); return }
        const runningContent = runningSection.split(/^## /m)[0]

        // Parse table rows (skip header + separator)
        const rows = runningContent.trim().split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Agent'))
        const parsed = rows.map(row => {
          const cells = row.split('|').map(c => c.trim()).filter(Boolean)
          if (cells.length < 3) return null
          const agentRaw = cells[0]
          const mission = cells[1]
          let agentSlug = agentRaw.toLowerCase().replace(/\s+\d+$/, '').trim()
          if (/^bobby/.test(agentSlug)) agentSlug = 'bobby'
          if (/^steffen/.test(agentSlug)) agentSlug = 'steffen'

          let text = mission
            .replace(/^Relaunched:\s*/i, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
          if (text.length > 55) text = text.slice(0, 52) + '...'

          return {
            text,
            agent: agentSlug,
            progress: 50, // Running = in progress
            done: false,
            isLive: true,
          }
        }).filter(t => t && t.text.length > 3 && t.agent)

        setTasks(parsed)
      } catch {}
    }

    fetchTasks()
    const timer = setInterval(fetchTasks, 3000)
    return () => clearInterval(timer)
  }, [])

  return tasks
}

// ---- COMPLETED FEED (polls agent-notifications.md for recent task completions) ----
// Simplified: "Bobby shipped chat cleanup" + timestamp. Last 8 max.
function useCompletedFeed() {
  const [completions, setCompletions] = useState([])

  useEffect(() => {
    if (!IS_LOCAL) return

    const fetchCompletions = async () => {
      try {
        const res = await fetch('/api/local/file?path=context/agent-notifications.md')
        if (!res.ok) return
        const json = await res.json()
        if (!json.content) return

        const lines = json.content.trim().split('\n').filter(l => l.startsWith('['))
        const completionLines = lines
          .filter(l => {
            if (/PATRIK\s*(DIRECTIVE|CLARIFICATION|FEEDBACK|BUG|REMINDER|DECISION)/i.test(l)) return false
            if (/COUNCIL\s*(DIRECTIVE|DECISION)/i.test(l)) return false
            if (/NEXT\s*WAVE/i.test(l)) return false
            return /TASK\s*FINISHED|SHIPPED|DELIVERED|MILESTONE/i.test(l)
          })
          .slice(-8)
          .reverse()

        const parsed = completionLines.map((line) => {
          const agentMatch = line.match(/(?:Bobby\s*\d?|Steffen\s*\d?|Cleo|Steve|Elon|Alex|Tony|Jacob|Colton|Elmo|Mom|Paige|Pixel)/i)
          let agentSlug = agentMatch ? agentMatch[0].toLowerCase().replace(/\s+/g, '') : null
          if (agentSlug && /^bobby\d?$/.test(agentSlug)) agentSlug = 'bobby'
          if (agentSlug && /^steffen\d?$/.test(agentSlug)) agentSlug = 'steffen'

          let text = ''
          const taskMatch = line.match(/TASK\s*FINISHED:\s*[\w\s\d]+[-\u2013]\s*(.+?)(?:\.\s|$)/i)
          const shippedMatch = line.match(/SHIPPED:\s*(?:\(1\)\s*)?(.+?)(?:,\s*\(2\)|\.\s|$)/i)
          const milestoneMatch = line.match(/MILESTONE:\s*[\w\s\d]+[-\u2013]\s*(.+?)(?:\.\s|$)/i)
          if (taskMatch) text = taskMatch[1].trim()
          else if (milestoneMatch) text = milestoneMatch[1].trim()
          else if (shippedMatch) text = shippedMatch[1].trim()
          else {
            const afterAgent = line.match(/\]\s*(?:TASK\s*FINISHED:\s*)?(?:Bobby|Steffen|Cleo|Steve|Elon|Alex|Tony|Jacob|Colton|Elmo|Mom|Paige|Pixel)[\d\s]*[-\u2013:]\s*(.+?)(?:\.\s|$)/i)
            text = afterAgent ? afterAgent[1].trim() : ''
          }

          text = text.replace(/@\w+:?/g, '')
            .replace(/\b[0-9a-f]{7,8}\b/g, '')
            .replace(/projects\/\S+/g, '')
            .replace(/\d+\s*commits?\s*pushed\s*\([^)]*\)/gi, '')
            .replace(/\(\s*\d+\s*commits?\s*to\s*[\w-]+[^)]*\)/gi, '')
            .replace(/\([^)]*commits?[^)]*\)/gi, '')
            .replace(/\([\s,]*\)/g, '')
            .replace(/REMAINING\s*TODOs?:.*$/i, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/^\s*[-\u2013:,.\s]+/, '')
            .replace(/[-\u2013:,.\s]+$/, '')
            .trim()
          if (text.length > 55) text = text.slice(0, 52) + '...'

          const dateMatch = line.match(/\[(\d{4}-\d{2}-\d{2})\]/)
          const timestamp = dateMatch ? dateMatch[1] : ''

          return {
            text,
            agent: agentSlug,
            progress: 100,
            done: true,
            isLive: false,
            timestamp,
          }
        }).filter(t => t.text.length > 3 && t.agent)

        setCompletions(parsed)
      } catch {}
    }

    fetchCompletions()
    const timer = setInterval(fetchCompletions, 8000)
    return () => clearInterval(timer)
  }, [])

  return completions
}

// Generate demo Right Now tasks for production
function generateDemoRightNow() {
  return [
    { text: 'Building permit tracker dashboard page', agent: 'bobby', progress: 50, done: false, isLive: true },
    { text: 'QA pass on Garcia homepage redesign', agent: 'elmo', progress: 50, done: false, isLive: true },
  ]
}

// Generate demo completed feed for production
function generateDemoCompleted() {
  return [
    { text: 'Bobby shipped permit tracker v1', agent: 'bobby', progress: 100, done: true, isLive: false, timestamp: '2026-03-17' },
    { text: 'Steve shipped coach report pass 9', agent: 'steve', progress: 100, done: true, isLive: false, timestamp: '2026-03-17' },
    { text: 'Steffen shipped 501 catalog assets', agent: 'steffen', progress: 100, done: true, isLive: false, timestamp: '2026-03-16' },
    { text: 'Jacob shipped 51 outreach emails', agent: 'jacob', progress: 100, done: true, isLive: false, timestamp: '2026-03-16' },
  ]
}

// ---- DEMO CHECKLIST DATA (production: Garcia Construction tasks) -------------
function generateDemoChecklist() {
  return {
    projects: [
      {
        name: 'Schedule', section: 'schedule', color: '#FF6B3D', icon: 'flame',
        tasks: [
          { text: 'Review Garcia Construction homepage final proof', done: false, agent: 'patrik' },
          { text: 'Confirm Ridgeline Homes proposal sent ($8.5k)', done: true, agent: 'patrik' },
          { text: 'Approve social media templates from Steffen', done: true, agent: 'patrik' },
          { text: 'Reply to Mesa Commercial Group inquiry', done: false, agent: 'patrik' },
          { text: 'Check permit tracker page after Bobby fix', done: false, agent: 'elmo' },
        ],
      },
      {
        name: 'Garcia Construction', section: 'corner', color: '#3B9EFF', icon: 'project',
        tasks: [
          { text: 'Homepage redesign deployed to production', done: true, agent: 'bobby' },
          { text: 'Brand guide v2 with updated color palette', done: true, agent: 'steffen' },
          { text: 'Permit tracker dashboard page', done: false, agent: 'bobby' },
          { text: 'Social media content calendar (March)', done: true, agent: 'tony' },
          { text: '3 project walkthrough reels for Instagram', done: true, agent: 'cleo' },
          { text: 'QA pass on all new pages', done: false, agent: 'elmo' },
          { text: 'Client health scan and satisfaction check-in', done: true, agent: 'paige' },
        ],
      },
      {
        name: 'Ridgeline Homes', section: 'ambition', color: '#F59E0B', icon: 'project',
        tasks: [
          { text: 'Proposal drafted and sent ($8.5k annual)', done: true, agent: 'alex' },
          { text: 'Discovery call scheduled (Thursday 2pm)', done: true, agent: 'jacob' },
          { text: 'Permit tracker page initial build', done: false, agent: 'bobby' },
          { text: 'Prepare case study from Garcia engagement', done: false, agent: 'steve' },
        ],
      },
      {
        name: 'Outreach', section: 'outreach', color: '#EF4444', icon: 'project',
        tasks: [
          { text: '15 personalized emails to Phoenix GCs', done: false, agent: 'jacob' },
          { text: '30-day outreach plan finalized', done: true, agent: 'alex' },
          { text: 'LinkedIn carousel posted: "5 Signs Your GC Needs AI"', done: true, agent: 'tony' },
          { text: 'Follow up with Mesa Commercial Group', done: false, agent: 'jacob' },
        ],
      },
      {
        name: 'Advisory', section: 'gtm', color: '#7C9A72', icon: 'project',
        tasks: [
          { text: 'ROI calculator for construction vertical', done: false, agent: 'steve' },
          { text: 'AI readiness framework v2 published', done: true, agent: 'steve' },
          { text: 'Audit onboarding flow design', done: false, agent: 'steffen' },
        ],
      },
      {
        name: 'Infra', section: 'infra', color: '#4CAF50', icon: 'project',
        tasks: [
          { text: 'Relay polling optimized (15s to 5s)', done: true, agent: 'elon' },
          { text: 'System health monitoring active', done: true, agent: 'elon' },
          { text: 'Shared nav + footer components shipped', done: true, agent: 'colton' },
        ],
      },
    ],
    todayTasks: [
      { text: 'Review Garcia Construction homepage final proof', done: false, agent: 'patrik', project: 'Schedule' },
      { text: 'Reply to Mesa Commercial Group inquiry', done: false, agent: 'patrik', project: 'Schedule' },
      { text: 'Check permit tracker page after Bobby fix', done: false, agent: 'elmo', project: 'Schedule' },
    ],
  }
}

// ---- LIVE TASK AUTO-CHECK (polls notifications for TASK FINISHED, auto-checks matching checklist items) ----
// DONE(bobby2): LIVE TASK UPDATES IN CHECKLIST -- Same logic as GameHUD's useAutoCheckFromNotifications.
// Polls agent-notifications.md every 3s, fuzzy-matches completed descriptions against task text.
function useAutoCheckFromNotifications() {
  const [autoChecked, setAutoChecked] = useState(new Set())

  useEffect(() => {
    if (!IS_LOCAL) return

    const fetchCompletions = async () => {
      try {
        const res = await fetch('/api/local/file?path=context/agent-notifications.md')
        if (!res.ok) return
        const json = await res.json()
        if (!json.content) return

        const lines = json.content.trim().split('\n').filter(l => l.startsWith('['))
        const completionLines = lines.filter(l =>
          /TASK\s*FINISHED|COMPLETE|DELIVERED|SHIPPED/i.test(l)
        )

        const completedDescriptions = []
        for (const line of completionLines) {
          const taskMatch = line.match(/TASK\s*FINISHED:\s*[\w\s\d]+[-\u2013]\s*(.+?)(?:\.\s|$)/i)
          const shippedMatch = line.match(/SHIPPED:\s*(?:\(\d+\)\s*)?(.+?)(?:,\s*\(\d+\)|\.\s|$)/i)
          if (taskMatch) completedDescriptions.push(taskMatch[1].trim().toLowerCase())
          if (shippedMatch) completedDescriptions.push(shippedMatch[1].trim().toLowerCase())
          const numberedItems = line.matchAll(/\((\d+)\)\s*([^,(]+)/g)
          for (const match of numberedItems) {
            completedDescriptions.push(match[2].trim().toLowerCase())
          }
        }

        const completedKeywords = new Set()
        for (const desc of completedDescriptions) {
          const tokens = desc
            .replace(/[*_`#\[\]()]/g, '')
            .replace(/\b(the|a|an|for|to|in|on|at|by|is|was|with|and|or|all|from|of)\b/gi, '')
            .split(/\s+/)
            .filter(t => t.length > 3)
          for (let i = 0; i < tokens.length; i++) {
            completedKeywords.add(tokens[i])
            if (i + 1 < tokens.length) completedKeywords.add(`${tokens[i]} ${tokens[i+1]}`)
            if (i + 2 < tokens.length) completedKeywords.add(`${tokens[i]} ${tokens[i+1]} ${tokens[i+2]}`)
          }
        }

        setAutoChecked(completedKeywords)
      } catch {}
    }

    fetchCompletions()
    const timer = setInterval(fetchCompletions, 3000)
    return () => clearInterval(timer)
  }, [])

  const isAutoChecked = useCallback((taskText) => {
    if (autoChecked.size === 0) return false
    const normalized = taskText.toLowerCase()
      .replace(/[*_`#\[\]()]/g, '')
      .replace(/\b(the|a|an|for|to|in|on|at|by|is|was|with|and|or|all|from|of)\b/gi, '')
    const tokens = normalized.split(/\s+/).filter(t => t.length > 3)
    let matchCount = 0
    for (const token of tokens) {
      if (autoChecked.has(token)) matchCount++
    }
    for (let i = 0; i + 1 < tokens.length; i++) {
      if (autoChecked.has(`${tokens[i]} ${tokens[i+1]}`)) matchCount += 2
    }
    return matchCount >= 2
  }, [autoChecked])

  return isAutoChecked
}

// ---- YOUR TODOS: Patrik's personal blocked items from punch-list.md ---------
function usePatrikTodos(punchData) {
  return useMemo(() => {
    if (!punchData?.projects) return []
    const todos = []
    for (const project of punchData.projects) {
      for (const task of project.tasks) {
        if (task.done) continue
        const isPatrik = task.agent === 'patrik' ||
          /\[Patrik\b/i.test(task.raw || '') ||
          /\bPatrik\s*[-\u2013]/i.test(task.raw || '')
        if (isPatrik) {
          todos.push({
            text: task.text,
            agent: 'patrik',
            project: project.name,
            projectColor: project.color,
            raw: task.raw,
            done: false,
          })
        }
      }
    }
    return todos
  }, [punchData])
}

// ---- FINISH THESE: Stale tasks needing attention ----------------------------
function useCheckingInTasks(punchData) {
  return useMemo(() => {
    if (!punchData?.projects) return []
    const stale = []
    const activeSections = new Set(['rightnow', 'schedule', 'today', 'your-todos', 'finish-these', 'checking-in'])
    for (const project of punchData.projects) {
      if (activeSections.has(project.section)) continue
      for (const task of project.tasks) {
        if (task.done) continue
        const hasBlockedKeyword = /blocked|overdue|behind|zero|waiting|red|urgent/i.test(task.raw || '')
        const hasRecentKeyword = /shipped|done|live|active|relaunched/i.test(task.raw || '')
        if (hasRecentKeyword) continue
        if (hasBlockedKeyword) {
          stale.push({
            text: task.text,
            agent: task.agent,
            project: project.name,
            projectColor: project.color,
            raw: task.raw,
            done: false,
            isStale: true,
          })
        }
      }
    }
    return stale.slice(0, 6)
  }, [punchData])
}

// ---- DATA HOOK for punch-list.md --------------------------------------------
function usePunchListData() {
  // Production: demo checklist data. Local: fetch from punch-list.md.
  const demoData = IS_LOCAL ? null : generateDemoChecklist()
  const [data, setData] = useState(demoData)
  const [loading, setLoading] = useState(IS_LOCAL)

  const fetchData = useCallback(async () => {
    if (!IS_LOCAL) return // Production uses demo data
    try {
      const res = await fetch('/api/local/file?path=punch-list.md')
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      if (json.content) {
        setData(parsePunchList(json.content))
      } else {
        setData(null)
      }
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!IS_LOCAL) return
    fetchData()
    const timer = setInterval(fetchData, 5000)
    return () => clearInterval(timer)
  }, [fetchData])

  return { data, loading, refetch: fetchData }
}

// ---- PROJECT SIDEBAR (replaces agent sidebar) --------------------------------
function ProjectSidebar({ projects, selectedProject, onSelectProject, isMobile, rightNowCount = 0, completedCount = 0, todosCount = 0, checkingInCount = 0 }) {
  if (isMobile) {
    // Horizontal scroll chips on mobile
    return (
      <div style={{
        height: 56, width: '100%', overflowX: 'auto', overflowY: 'hidden',
        background: 'rgba(10, 15, 30, 0.5)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '8px 12px',
        display: 'flex', gap: 8,
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x mandatory',
      }}>
        {/* All Projects chip */}
        <button
          onClick={() => onSelectProject(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 40, padding: '0 14px',
            background: !selectedProject ? 'rgba(59,158,255,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${!selectedProject ? 'rgba(59,158,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
            cursor: 'pointer', scrollSnapAlign: 'start',
            color: !selectedProject ? '#3B9EFF' : '#F0ECE6',
            fontFamily: "'Inter Tight', system-ui, sans-serif", fontSize: 15, fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          <LayoutGrid size={16} />
          All
        </button>

        {/* Right Now chip (mobile) */}
        {rightNowCount > 0 && (
          <button
            onClick={() => onSelectProject('rightnow')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 40, padding: '0 14px',
              background: selectedProject === 'rightnow' ? 'rgba(255,107,61,0.15)' : 'rgba(255,107,61,0.04)',
              border: `1.5px solid ${selectedProject === 'rightnow' ? 'rgba(255,107,61,0.4)' : 'rgba(255,107,61,0.12)'}`,
              borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
              cursor: 'pointer', scrollSnapAlign: 'start',
              color: '#FF6B3D',
              fontFamily: "'Inter Tight', system-ui, sans-serif", fontSize: 15, fontWeight: 700,
              textTransform: 'uppercase',
              animation: 'rightNowPulse 3s ease-in-out infinite',
            }}
          >
            <Zap size={14} color="#FF6B3D" style={{ filter: 'drop-shadow(0 0 4px rgba(255,107,61,0.7))' }} />
            Right Now
            <span style={{
              fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
              fontSize: 13, color: '#FFF', background: '#FF6B3D',
              padding: '2px 7px', borderRadius: 8, lineHeight: 1,
            }}>
              {rightNowCount}
            </span>
          </button>
        )}

        {/* Your TODOs chip (mobile) */}
        {todosCount > 0 && (
          <button
            onClick={() => onSelectProject('your-todos')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 40, padding: '0 14px',
              background: selectedProject === 'your-todos' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.04)',
              border: `1.5px solid ${selectedProject === 'your-todos' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.12)'}`,
              borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
              cursor: 'pointer', scrollSnapAlign: 'start',
              color: '#EF4444',
              fontFamily: "'Inter Tight', system-ui, sans-serif", fontSize: 15, fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            <AlertCircle size={14} color="#EF4444" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }} />
            TODOs
            <span style={{
              fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
              fontSize: 13, color: '#FFF', background: '#EF4444',
              padding: '2px 7px', borderRadius: 8, lineHeight: 1,
            }}>
              {todosCount}
            </span>
          </button>
        )}

        {projects.map(p => {
          const selected = selectedProject === p.section
          const remaining = p.tasks.filter(t => !t.done).length
          return (
            <button
              key={p.section}
              onClick={() => onSelectProject(p.section)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 40, padding: '0 14px',
                background: selected ? `${p.color}1F` : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${selected ? `${p.color}4D` : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
                cursor: 'pointer', scrollSnapAlign: 'start',
                color: selected ? p.color : '#F0ECE6',
                fontFamily: "'Inter Tight', system-ui, sans-serif", fontSize: 15, fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {p.section === 'rightnow' ? <Zap size={14} color={p.color} style={{ filter: `drop-shadow(0 0 4px ${p.color}AA)` }} /> : (p.section === 'schedule' || p.section === 'today') ? <Flame size={14} color={p.color} /> : (
                <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
              )}
              {p.name}
              {remaining > 0 && (
                <span style={{
                  fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
                  fontSize: 14, color: '#FFF', background: p.color,
                  padding: '2px 7px', borderRadius: 8, lineHeight: 1,
                }}>
                  {remaining} left
                </span>
              )}
            </button>
          )
        })}

        {/* Finish These chip (mobile) -- last */}
        {checkingInCount > 0 && (
          <button
            onClick={() => onSelectProject('finish-these')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 40, padding: '0 14px',
              background: selectedProject === 'finish-these' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.04)',
              border: `1.5px solid ${selectedProject === 'finish-these' ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.1)'}`,
              borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
              cursor: 'pointer', scrollSnapAlign: 'start',
              color: '#94A3B8',
              fontFamily: "'Inter Tight', system-ui, sans-serif", fontSize: 15, fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            <History size={14} color="#94A3B8" />
            Finish These
            <span style={{
              fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
              fontSize: 13, color: '#FFF', background: '#94A3B8',
              padding: '2px 7px', borderRadius: 8, lineHeight: 1,
            }}>
              {checkingInCount}
            </span>
          </button>
        )}
      </div>
    )
  }

  // Desktop sidebar -- PROJECT list
  return (
    <div style={{
      width: 240, flexShrink: 0, height: '100%',
      background: 'rgba(10, 15, 30, 0.5)',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      padding: '16px 0', overflowY: 'auto',
    }}>
      {/* Section label */}
      <div style={{
        padding: '0 16px', marginBottom: 12,
        fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
        color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.15em',
      }}>
        PROJECTS
      </div>

      {/* All Projects option */}
      <button
        onClick={() => onSelectProject(null)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          height: 44, padding: !selectedProject ? '0 13px' : '0 16px',
          background: !selectedProject ? 'rgba(59,158,255,0.08)' : 'transparent',
          border: 'none', borderBottom: 'none', borderTop: 'none', borderRight: 'none',
          borderLeftWidth: 3, borderLeftStyle: 'solid',
          borderLeftColor: !selectedProject ? '#3B9EFF' : 'transparent',
          cursor: 'pointer', transition: 'background 100ms ease',
          color: '#F0ECE6', fontFamily: "'Inter Tight', system-ui, sans-serif",
          fontSize: 15, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase',
        }}
      >
        <LayoutGrid size={18} style={{ color: '#6B7280' }} />
        All Projects
      </button>

      {/* Right Now entry (desktop sidebar) */}
      {rightNowCount > 0 && (
        <button
          onClick={() => onSelectProject('rightnow')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            height: 48, padding: selectedProject === 'rightnow' ? '0 13px' : '0 16px',
            background: selectedProject === 'rightnow' ? 'rgba(255,107,61,0.08)' : 'transparent',
            border: 'none', borderBottom: 'none', borderTop: 'none', borderRight: 'none',
            borderLeftWidth: 3, borderLeftStyle: 'solid',
            borderLeftColor: selectedProject === 'rightnow' ? '#FF6B3D' : 'transparent',
            cursor: 'pointer', transition: 'background 100ms ease',
            color: '#F0ECE6', fontFamily: "'Inter Tight', system-ui, sans-serif",
            fontSize: 15, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase',
            position: 'relative',
          }}
        >
          <Zap size={16} color="#FF6B3D" style={{
            flexShrink: 0,
            filter: 'drop-shadow(0 0 6px rgba(255,107,61,0.7))',
            animation: 'rightNowPulse 2s ease-in-out infinite',
          }} />
          <span style={{ flex: 1, letterSpacing: '-0.01em', color: '#FF6B3D' }}>Right Now</span>
          <span style={{
            fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
            fontSize: 13, color: '#FFF', background: '#FF6B3D',
            padding: '3px 9px', borderRadius: 8, lineHeight: 1,
            boxShadow: '0 2px 6px rgba(255,107,61,0.3)',
            minWidth: 26, textAlign: 'center',
          }}>
            {rightNowCount}
          </span>
          {/* Subtle glow bar at bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 16, right: 16, height: 2,
            background: 'rgba(255,107,61,0.15)', borderRadius: 1,
          }}>
            <div style={{
              width: '100%', height: '100%',
              background: 'rgba(255,107,61,0.4)', borderRadius: 1,
              animation: 'rightNowPulse 2s ease-in-out infinite',
            }} />
          </div>
        </button>
      )}

      {/* Your TODOs entry (desktop sidebar) */}
      {todosCount > 0 && (
        <button
          onClick={() => onSelectProject('your-todos')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            height: 48, padding: selectedProject === 'your-todos' ? '0 13px' : '0 16px',
            background: selectedProject === 'your-todos' ? 'rgba(239,68,68,0.08)' : 'transparent',
            border: 'none', borderBottom: 'none', borderTop: 'none', borderRight: 'none',
            borderLeftWidth: 3, borderLeftStyle: 'solid',
            borderLeftColor: selectedProject === 'your-todos' ? '#EF4444' : 'transparent',
            cursor: 'pointer', transition: 'background 100ms ease',
            color: '#F0ECE6', fontFamily: "'Inter Tight', system-ui, sans-serif",
            fontSize: 15, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase',
            position: 'relative',
          }}
        >
          <AlertCircle size={16} color="#EF4444" style={{
            flexShrink: 0,
            filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))',
            animation: 'todosPulse 2.5s ease-in-out infinite',
          }} />
          <span style={{ flex: 1, letterSpacing: '-0.01em', color: '#EF4444' }}>Your TODOs</span>
          <span style={{
            fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
            fontSize: 13, color: '#FFF', background: '#EF4444',
            padding: '3px 9px', borderRadius: 8, lineHeight: 1,
            boxShadow: '0 2px 6px rgba(239,68,68,0.3)',
            minWidth: 26, textAlign: 'center',
          }}>
            {todosCount}
          </span>
        </button>
      )}

      {/* Individual projects */}
      {projects.map(p => {
        const selected = selectedProject === p.section
        const remaining = p.tasks.filter(t => !t.done).length
        const totalTasks = p.tasks.length
        const doneTasks = totalTasks - remaining
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
        const isSchedule = p.section === 'schedule' || p.section === 'today'

        return (
          <button
            key={p.section}
            onClick={() => onSelectProject(p.section)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              height: 48, padding: selected ? '0 13px' : '0 16px',
              background: selected ? `${p.color}0C` : 'transparent',
              border: 'none', borderBottom: 'none', borderTop: 'none', borderRight: 'none',
              borderLeftWidth: 3, borderLeftStyle: 'solid',
              borderLeftColor: selected ? p.color : 'transparent',
              cursor: 'pointer', transition: 'background 100ms ease',
              color: '#F0ECE6', fontFamily: "'Inter Tight', system-ui, sans-serif",
              fontSize: 15, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase',
              position: 'relative',
            }}
          >
            {p.section === 'rightnow' ? (
              <Zap size={16} color={p.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${p.color}AA)`, animation: 'rightNowPulse 2s ease-in-out infinite' }} />
            ) : isSchedule ? (
              <Flame size={16} color={p.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 4px ${p.color}66)` }} />
            ) : (
              <div style={{ width: 12, height: 12, borderRadius: 4, background: p.color, flexShrink: 0, boxShadow: `0 0 8px ${p.color}33` }} />
            )}
            <span style={{ flex: 1, letterSpacing: '-0.01em' }}>{p.name}</span>
            {/* Remaining count with label */}
            {remaining > 0 ? (
              <span style={{
                fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
                fontSize: 13, color: '#FFF', background: p.color,
                padding: '3px 9px', borderRadius: 8, lineHeight: 1,
                boxShadow: `0 2px 6px ${p.color}44`,
                minWidth: 26, textAlign: 'center',
              }}>
                {remaining} left
              </span>
            ) : totalTasks > 0 ? (
              <CheckCircle2 size={16} color={p.color} strokeWidth={2} style={{ opacity: 0.5 }} />
            ) : null}

            {/* Progress bar at bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 16, right: 16, height: 5,
              background: 'rgba(255,255,255,0.06)', borderRadius: 3,
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: p.color, borderRadius: 1,
                transition: 'width 400ms ease',
              }} />
            </div>
          </button>
        )
      })}

      {/* Finish These entry (desktop sidebar) -- last */}
      {checkingInCount > 0 && (
        <button
          onClick={() => onSelectProject('finish-these')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            height: 44, padding: selectedProject === 'finish-these' ? '0 13px' : '0 16px',
            background: selectedProject === 'finish-these' ? 'rgba(148,163,184,0.06)' : 'transparent',
            border: 'none', borderBottom: 'none', borderTop: 'none', borderRight: 'none',
            borderLeftWidth: 3, borderLeftStyle: 'solid',
            borderLeftColor: selectedProject === 'finish-these' ? '#94A3B8' : 'transparent',
            cursor: 'pointer', transition: 'background 100ms ease',
            color: '#8BA4C4', fontFamily: "'Inter Tight', system-ui, sans-serif",
            fontSize: 14, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase',
            opacity: 0.75,
          }}
        >
          <History size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, letterSpacing: '-0.01em' }}>Finish These</span>
          <span style={{
            fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 800,
            fontSize: 12, color: '#94A3B8',
            background: 'rgba(148,163,184,0.10)',
            padding: '3px 9px', borderRadius: 8, lineHeight: 1,
            border: '1px solid rgba(148,163,184,0.15)',
            minWidth: 26, textAlign: 'center',
          }}>
            {checkingInCount}
          </span>
        </button>
      )}
    </div>
  )
}

// ---- TASK CONTEXT MENU (Linear/Notion style) --------------------------------
// Right-click any task for quick actions: toggle done, set priority, reassign, delete.
const PRIORITY_OPTIONS = [
  { key: 'high', label: 'High priority', icon: ArrowUpCircle, color: '#EF4444' },
  { key: 'med', label: 'Medium priority', icon: ArrowRightCircle, color: '#F59E0B' },
  { key: 'low', label: 'Low priority', icon: ArrowDownCircle, color: '#6B7280' },
]

const ASSIGNABLE_AGENTS = AGENTS.filter(a =>
  !['paige', 'pixel'].includes(a.slug)
)

function TaskContextMenu({ position, task, onClose, onAction }) {
  const menuRef = useRef(null)

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKey)
    }, 30)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Keep menu in viewport
  const [adjustedPos, setAdjustedPos] = useState(position)
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    let x = position.x
    let y = position.y
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8
    if (x < 8) x = 8
    if (y < 8) y = 8
    setAdjustedPos({ x, y })
  }, [position])

  const [showAgents, setShowAgents] = useState(false)

  const menuItemStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '8px 14px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 500,
    color: '#E0E0E0', textAlign: 'left',
    borderRadius: 6, transition: 'background 80ms ease',
  }

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 300,
        minWidth: 210,
        background: 'rgba(12, 16, 28, 0.97)',
        backdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(100, 180, 255, 0.18)',
        borderRadius: 10,
        boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(100,180,255,0.06)',
        padding: '6px 4px',
        overflow: 'hidden',
      }}
    >
      {/* Toggle done/undone */}
      <button
        style={menuItemStyle}
        onClick={() => { onAction('toggle', task); onClose() }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,180,255,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        {task.done
          ? <><Square size={15} color="#8BA4C4" /> <span>Mark undone</span></>
          : <><CheckSquare size={15} color="#22C55E" /> <span>Mark done</span></>
        }
      </button>

      {/* Separator */}
      <div style={{ height: 1, background: 'rgba(100,180,255,0.08)', margin: '4px 10px' }} />

      {/* Priority options */}
      {PRIORITY_OPTIONS.map(opt => (
        <button
          key={opt.key}
          style={menuItemStyle}
          onClick={() => { onAction('priority', task, opt.key); onClose() }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,180,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <opt.icon size={15} color={opt.color} />
          <span>{opt.label}</span>
        </button>
      ))}

      {/* Separator */}
      <div style={{ height: 1, background: 'rgba(100,180,255,0.08)', margin: '4px 10px' }} />

      {/* Reassign agent (submenu) */}
      <div style={{ position: 'relative' }}>
        <button
          style={menuItemStyle}
          onClick={() => setShowAgents(!showAgents)}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,180,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <UserCircle2 size={15} color="#8BA4C4" />
          <span style={{ flex: 1 }}>Reassign agent</span>
          <ChevronRight size={13} color="#4A6080" />
        </button>

        {/* Agent submenu */}
        <AnimatePresence>
          {showAgents && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              style={{
                position: 'absolute',
                left: '100%', top: 0,
                minWidth: 180,
                background: 'rgba(12, 16, 28, 0.97)',
                backdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(100, 180, 255, 0.18)',
                borderRadius: 10,
                boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
                padding: '6px 4px',
                marginLeft: 4,
                maxHeight: 300, overflowY: 'auto',
              }}
              className="hud-scroll"
            >
              {ASSIGNABLE_AGENTS.map(a => (
                <button
                  key={a.slug}
                  style={{
                    ...menuItemStyle,
                    color: task.agent === a.slug ? a.color : '#E0E0E0',
                    fontWeight: task.agent === a.slug ? 700 : 500,
                  }}
                  onClick={() => { onAction('reassign', task, a.slug); onClose() }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,180,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: `${a.color}25`,
                    border: `1.5px solid ${a.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: a.color,
                    flexShrink: 0,
                  }}>
                    {a.name.charAt(0)}
                  </div>
                  <span>{a.name}</span>
                  {task.agent === a.slug && <Check size={13} color={a.color} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: 'rgba(100,180,255,0.08)', margin: '4px 10px' }} />

      {/* Delete */}
      <button
        style={{ ...menuItemStyle, color: '#EF4444' }}
        onClick={() => { onAction('delete', task); onClose() }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <Trash2 size={15} color="#EF4444" />
        <span>Delete task</span>
      </button>
    </motion.div>
  )
}

// ---- TASK ITEM CARD (with WORKING checkbox + right-click context menu) ------
function TaskCard({ task, projectColor, onCheck, index, onContextMenu, isLive }) {
  const [isHovered, setIsHovered] = useState(false)
  const isDone = task.done

  // Find agent info for badge
  const agentInfo = task.agent ? AGENTS.find(a => a.slug === task.agent) : null
  const hasSpr = task.agent && SPRITE_AGENTS.includes(task.agent)

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    onContextMenu?.(e, task)
  }, [task, onContextMenu])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      style={{
        minHeight: 48,
        background: isDone
          ? 'rgba(255,255,255,0.01)'
          : isHovered
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 6,
        display: 'flex', alignItems: 'flex-start', gap: 12,
        cursor: 'default',
        transition: 'background 100ms ease, border-color 100ms ease',
        opacity: isDone ? 0.5 : 1,
      }}
    >
      {/* Drag handle (visible on hover) */}
      <div style={{
        opacity: isHovered ? 0.5 : 0,
        transition: 'opacity 100ms ease',
        cursor: 'grab',
        display: 'flex', flexDirection: 'column', gap: 2,
        paddingTop: 3,
      }}>
        <GripVertical size={14} color="#4A5568" />
      </div>

      {/* Checkbox -- WIRED to onCheck */}
      <button
        onClick={() => onCheck?.(task)}
        style={{
          width: 22, height: 22, flexShrink: 0,
          border: `2px solid ${isDone ? projectColor : 'rgba(255,255,255,0.18)'}`,
          borderRadius: 6,
          background: isDone ? projectColor : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 200ms ease',
          marginTop: 1,
        }}
      >
        {isDone && <Check size={14} color="#FDF6EC" strokeWidth={3} />}
      </button>

      {/* Task text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 16,
          color: isDone ? '#6B7280' : '#F0ECE6',
          lineHeight: 1.45,
          textDecoration: isDone ? 'line-through' : 'none',
        }}>
          {task.text}
        </div>

        {/* Agent badge + LIVE badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: agentInfo || isLive ? 6 : 0 }}>
          {agentInfo && hasSpr && (
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `1.5px solid ${agentInfo.color}`,
              overflow: 'hidden', flexShrink: 0, background: '#0A0F1E',
            }}>
              <img
                src={`/corner/sprites/${task.agent}-idle.png`}
                alt=""
                style={{
                  width: 34, height: 34,
                  objectFit: 'cover', objectPosition: '20% 8%',
                  imageRendering: 'pixelated', display: 'block',
                  marginLeft: -5, marginTop: -3,
                }}
              />
            </div>
          )}
          {agentInfo && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: agentInfo.color,
            }}>
              {agentInfo.name}
            </span>
          )}
          {isLive && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              color: '#FF6B3D',
              background: 'rgba(255,107,61,0.12)',
              border: '1px solid rgba(255,107,61,0.3)',
              borderRadius: 4, padding: '2px 8px',
              display: 'flex', alignItems: 'center', gap: 5,
              animation: 'rightNowPulse 2s ease-in-out infinite',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#FF6B3D',
                boxShadow: '0 0 6px #FF6B3D',
                animation: 'rightNowDotPulse 1.5s ease-in-out infinite',
              }} />
              LIVE
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ---- RIGHT NOW TASK CARD (agent avatar + task + progress bar) ---------------
function RightNowTaskCard({ task, index, isDaytime }) {
  const [isHovered, setIsHovered] = useState(false)
  const agentInfo = task.agent ? AGENTS.find(a => a.slug === task.agent) : null
  const hasSpr = task.agent && SPRITE_AGENTS.includes(task.agent)
  const color = '#FF6B3D'
  const agentColor = agentInfo?.color || color

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered
          ? (isDaytime ? 'rgba(255,107,61,0.08)' : 'rgba(255,107,61,0.06)')
          : (isDaytime ? 'rgba(255,107,61,0.04)' : 'rgba(255,107,61,0.02)'),
        border: `1px solid ${isHovered
          ? (isDaytime ? 'rgba(255,107,61,0.2)' : 'rgba(255,107,61,0.15)')
          : (isDaytime ? 'rgba(255,107,61,0.1)' : 'rgba(255,107,61,0.06)')}`,
        borderRadius: 12,
        padding: '12px 16px 10px',
        marginBottom: 6,
        cursor: 'default',
        transition: 'background 120ms ease, border-color 120ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Row: avatar + text + live badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Agent avatar */}
        {agentInfo && hasSpr ? (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `2px solid ${agentColor}`,
            overflow: 'hidden', flexShrink: 0, background: isDaytime ? '#F1F5F9' : '#0A0F1E',
            boxShadow: `0 0 8px ${agentColor}44`,
          }}>
            <img
              src={`/corner/sprites/${task.agent}-idle.png`}
              alt=""
              style={{
                width: 54, height: 54,
                objectFit: 'cover', objectPosition: '20% 8%',
                imageRendering: 'pixelated', display: 'block',
                marginLeft: -8, marginTop: -5,
              }}
            />
          </div>
        ) : agentInfo ? (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `2px solid ${agentColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: agentColor,
            background: `${agentColor}22`, flexShrink: 0,
          }}>
            {agentInfo.name.charAt(0)}
          </div>
        ) : null}

        {/* Task text + agent name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500, fontSize: 15,
            color: task.done ? '#6B7280' : (isDaytime ? '#1E293B' : '#F0ECE6'),
            lineHeight: 1.35,
            textDecoration: task.done ? 'line-through' : 'none',
            opacity: task.done ? 0.6 : 1,
          }}>
            {task.text}
          </div>
          {agentInfo && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: agentColor, marginTop: 2, display: 'inline-block',
            }}>
              {agentInfo.name}
            </span>
          )}
        </div>

        {/* LIVE badge */}
        {task.isLive && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 10,
            textTransform: 'uppercase', letterSpacing: '0.15em',
            color: color,
            background: 'rgba(255,107,61,0.10)',
            border: '1px solid rgba(255,107,61,0.25)',
            borderRadius: 4, padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: 5,
            flexShrink: 0,
            animation: 'rightNowPulse 2s ease-in-out infinite',
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: color,
              boxShadow: `0 0 6px ${color}`,
              animation: 'rightNowDotPulse 1.5s ease-in-out infinite',
            }} />
            LIVE
          </span>
        )}

        {/* Progress % removed -- running agents don't have real progress, LIVE badge is sufficient */}
      </div>

      {/* Live pulse bar (replaces fake progress %) */}
      {task.isLive && (
        <div style={{
          marginTop: 8,
          height: 2,
          background: 'rgba(255,107,61,0.08)',
          borderRadius: 1,
          overflow: 'hidden',
        }}>
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
            borderRadius: 1,
            animation: 'rightNowPulse 2s ease-in-out infinite',
          }} />
        </div>
      )}
    </motion.div>
  )
}

// ---- RIGHT NOW SECTION (ONLY running agents, dead simple) -------------------
// PATRIK CORRECTION: "it should just link to what agents are running and what the task is"
function RightNowSection({ tasks, isCollapsed, onToggle, isDaytime }) {
  const color = '#FF6B3D'

  // If no running agents, show "All clear"
  if (!tasks || tasks.length === 0) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 0 10px',
        }}>
          <Zap size={20} color={color} style={{
            filter: `drop-shadow(0 0 8px ${color}AA)`,
            opacity: 0.5,
          }} />
          <span style={{
            fontFamily: "'Inter Tight', system-ui, sans-serif",
            fontSize: 22, fontWeight: 900,
            color: isDaytime ? '#0F172A' : '#EDF2FA',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}>
            Right Now
          </span>
          <span style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14, fontWeight: 500,
            color: isDaytime ? '#94A3B8' : '#6B7280',
          }}>
            All clear
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 0 10px', marginBottom: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {isCollapsed ? <ChevronRight size={16} color={isDaytime ? '#94A3B8' : '#6B7280'} /> : <ChevronDown size={16} color={isDaytime ? '#94A3B8' : '#6B7280'} />}

        <Zap size={20} color={color} style={{
          filter: `drop-shadow(0 0 8px ${color}AA)`,
          animation: 'rightNowPulse 2s ease-in-out infinite',
        }} />

        <span style={{
          fontFamily: "'Inter Tight', system-ui, sans-serif",
          fontSize: 22, fontWeight: 900,
          color: isDaytime ? '#0F172A' : '#EDF2FA',
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          flex: 1,
          textShadow: isDaytime ? 'none' : `0 0 20px ${color}33`,
        }}>
          Right Now
        </span>

        {/* Running count */}
        <span style={{
          fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
          fontSize: 14, color: '#FFF',
          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          padding: '4px 12px', borderRadius: 10, lineHeight: 1,
          boxShadow: `0 2px 8px ${color}55, 0 0 20px ${color}22`,
          minWidth: 28, textAlign: 'center',
          animation: 'rightNowPulse 3s ease-in-out infinite',
        }}>
          {tasks.length} running
        </span>
      </button>

      {/* Running agent cards */}
      {!isCollapsed && (
        <AnimatePresence>
          {tasks.map((task, i) => (
            <RightNowTaskCard
              key={`rightnow-${i}-${task.text?.slice(0,15)}`}
              task={task}
              index={i}
              isDaytime={isDaytime}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}

// ---- YOUR TODOS TASK CARD (red accent, checkbox energy) ---------------------
function YourTodoTaskCard({ task, index, isDaytime, onCheck }) {
  const [isHovered, setIsHovered] = useState(false)
  const agentInfo = AGENTS.find(a => a.slug === 'patrik') || { name: 'Patrik', color: '#EF4444' }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered
          ? (isDaytime ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)')
          : (isDaytime ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.02)'),
        border: `1px solid ${isHovered
          ? (isDaytime ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)')
          : (isDaytime ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)')}`,
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 6,
        cursor: 'default',
        transition: 'background 120ms ease, border-color 120ms ease',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Checkbox */}
        <button
          onClick={() => onCheck?.(task)}
          style={{
            width: 22, height: 22, flexShrink: 0,
            border: '2px solid rgba(239,68,68,0.3)',
            borderRadius: 6,
            background: task.done ? '#EF4444' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 200ms ease',
            marginTop: 1,
          }}
        >
          {task.done && <Check size={14} color="#FFF" strokeWidth={3} />}
        </button>

        {/* Task text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500, fontSize: 15,
            color: task.done ? '#6B7280' : (isDaytime ? '#1E293B' : '#F0ECE6'),
            lineHeight: 1.35,
            textDecoration: task.done ? 'line-through' : 'none',
            opacity: task.done ? 0.6 : 1,
          }}>
            {task.text}
          </div>
          {/* Source project label */}
          {task.projectSource && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: task.projectColor || '#6B7280',
              marginTop: 3, display: 'inline-block',
            }}>
              from {task.projectSource}
            </span>
          )}
        </div>

        {/* Needs You badge */}
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          color: '#EF4444',
          background: 'rgba(239,68,68,0.10)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 4, padding: '3px 8px',
          display: 'flex', alignItems: 'center', gap: 4,
          flexShrink: 0,
          animation: 'todosPulse 2.5s ease-in-out infinite',
        }}>
          <AlertCircle size={10} />
          YOU
        </span>
      </div>
    </motion.div>
  )
}

// ---- YOUR TODOS SECTION (Patrik's personal blocked items) -------------------
function YourTodosSection({ tasks, isCollapsed, onToggle, isDaytime, onCheck }) {
  if (!tasks || tasks.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 0 10px', marginBottom: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {isCollapsed ? <ChevronRight size={16} color={isDaytime ? '#94A3B8' : '#6B7280'} /> : <ChevronDown size={16} color={isDaytime ? '#94A3B8' : '#6B7280'} />}

        <AlertCircle size={20} color="#EF4444" style={{
          filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.5))',
          animation: 'todosPulse 2.5s ease-in-out infinite',
        }} />

        <span style={{
          fontFamily: "'Inter Tight', system-ui, sans-serif",
          fontSize: 22, fontWeight: 900,
          color: isDaytime ? '#0F172A' : '#EDF2FA',
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          flex: 1,
          textShadow: isDaytime ? 'none' : '0 0 20px rgba(239,68,68,0.2)',
        }}>
          Your TODOs
        </span>

        {/* Count badge */}
        {tasks.length > 0 && (
          <span style={{
            fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
            fontSize: 14, color: '#FFF',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            padding: '4px 12px', borderRadius: 10, lineHeight: 1,
            boxShadow: '0 2px 8px rgba(239,68,68,0.4), 0 0 20px rgba(239,68,68,0.15)',
            minWidth: 28, textAlign: 'center',
            animation: 'todosPulse 3s ease-in-out infinite',
          }}>
            {tasks.length} needs you
          </span>
        )}
      </button>

      {/* Task cards */}
      {!isCollapsed && (
        <AnimatePresence>
          {tasks.map((task, i) => (
            <YourTodoTaskCard
              key={`todo-${i}-${task.text?.slice(0,15)}`}
              task={task}
              index={i}
              isDaytime={isDaytime}
              onCheck={onCheck}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}

// ---- FINISH THESE TASK CARD (muted gray/amber, timestamp, stale nudge) ------
function CheckingInTaskCard({ task, index, isDaytime }) {
  const [isHovered, setIsHovered] = useState(false)
  const agentInfo = task.agent ? AGENTS.find(a => a.slug === task.agent) : null
  const hasSpr = task.agent && SPRITE_AGENTS.includes(task.agent)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered
          ? (isDaytime ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.05)')
          : (isDaytime ? 'rgba(148,163,184,0.03)' : 'rgba(148,163,184,0.02)'),
        border: `1px solid ${isHovered
          ? (isDaytime ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.12)')
          : (isDaytime ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.05)')}`,
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 6,
        cursor: 'default',
        transition: 'background 120ms ease, border-color 120ms ease',
        opacity: 0.75,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Agent avatar */}
        {agentInfo && hasSpr ? (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${agentInfo.color}55`,
            overflow: 'hidden', flexShrink: 0,
            background: isDaytime ? '#F1F5F9' : '#0A0F1E',
            opacity: 0.7,
          }}>
            <img
              src={`/corner/sprites/${task.agent}-idle.png`}
              alt=""
              style={{
                width: 46, height: 46,
                objectFit: 'cover', objectPosition: '20% 8%',
                imageRendering: 'pixelated', display: 'block',
                marginLeft: -6, marginTop: -4,
              }}
            />
          </div>
        ) : agentInfo ? (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${agentInfo.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: `${agentInfo.color}88`,
            background: `${agentInfo.color}11`, flexShrink: 0,
          }}>
            {agentInfo.name.charAt(0)}
          </div>
        ) : null}

        {/* Task text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 15,
            color: isDaytime ? '#64748B' : '#8BA4C4',
            lineHeight: 1.35,
          }}>
            {task.text}
          </div>
          {/* Source project */}
          {task.projectSource && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: task.projectColor ? `${task.projectColor}88` : '#6B728088',
              marginTop: 2, display: 'inline-block',
            }}>
              {task.projectSource}
            </span>
          )}
        </div>

        {/* Stale badge */}
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          color: '#94A3B8',
          background: 'rgba(148,163,184,0.08)',
          border: '1px solid rgba(148,163,184,0.15)',
          borderRadius: 4, padding: '3px 8px',
          display: 'flex', alignItems: 'center', gap: 4,
          flexShrink: 0,
        }}>
          <History size={10} />
          STALE
        </span>
      </div>
    </motion.div>
  )
}

// ---- COMPLETED FEED SECTION (simplified activity feed of task completions) ---
// PATRIK CORRECTION: "completed task beneath is as live as the activity feed.
// but a simplified task based version." Clean one-liners, last 8 max.
function CompletedFeedSection({ tasks, isCollapsed, onToggle, isDaytime }) {
  if (!tasks || tasks.length === 0) return null

  return (
    <div style={{ marginBottom: 12, opacity: 0.9 }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 0 8px', marginBottom: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {isCollapsed ? <ChevronRight size={14} color={isDaytime ? '#94A3B8' : '#6B7280'} /> : <ChevronDown size={14} color={isDaytime ? '#94A3B8' : '#6B7280'} />}

        <CheckCircle2 size={16} color="#22C55E" style={{
          filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.3))',
        }} />

        <span style={{
          fontFamily: "'Inter Tight', system-ui, sans-serif",
          fontSize: 16, fontWeight: 700,
          color: isDaytime ? '#64748B' : '#8BA4C4',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          flex: 1,
        }}>
          Completed
        </span>

        <span style={{
          fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 700,
          fontSize: 12, color: '#22C55E',
          background: 'rgba(34,197,94,0.08)',
          padding: '3px 10px', borderRadius: 8, lineHeight: 1,
          border: '1px solid rgba(34,197,94,0.15)',
          minWidth: 24, textAlign: 'center',
        }}>
          {tasks.length}
        </span>
      </button>

      {/* Compact completion entries */}
      {!isCollapsed && (
        <div style={{ paddingLeft: 8 }}>
          {tasks.map((task, i) => {
            const agentInfo = task.agent ? AGENTS.find(a => a.slug === task.agent) : null
            const hasSpr = task.agent && SPRITE_AGENTS.includes(task.agent)
            const agentColor = agentInfo?.color || '#22C55E'

            return (
              <motion.div
                key={`completed-${i}-${task.text?.slice(0,15)}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 12px',
                  marginBottom: 2,
                  borderRadius: 8,
                  background: isDaytime ? 'rgba(34,197,94,0.02)' : 'rgba(34,197,94,0.01)',
                }}
              >
                {/* Small agent avatar */}
                {agentInfo && hasSpr ? (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `1.5px solid ${agentColor}44`,
                    overflow: 'hidden', flexShrink: 0, background: isDaytime ? '#F1F5F9' : '#0A0F1E',
                  }}>
                    <img
                      src={`/corner/sprites/${task.agent}-idle.png`}
                      alt=""
                      style={{
                        width: 38, height: 38,
                        objectFit: 'cover', objectPosition: '20% 8%',
                        imageRendering: 'pixelated', display: 'block',
                        marginLeft: -6, marginTop: -4,
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `1.5px solid ${agentColor}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: `${agentColor}88`,
                    background: `${agentColor}11`, flexShrink: 0,
                  }}>
                    {agentInfo ? agentInfo.name.charAt(0) : '?'}
                  </div>
                )}

                {/* One-liner: "Bobby shipped chat cleanup" */}
                <span style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 13,
                  color: isDaytime ? '#64748B' : '#8BA4C4',
                  lineHeight: 1.3, flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {task.text}
                </span>

                {/* Timestamp */}
                {task.timestamp && (
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 10,
                    color: isDaytime ? '#94A3B8' : '#4A6080',
                    flexShrink: 0,
                  }}>
                    {task.timestamp}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- FINISH THESE SECTION (stale tasks, muted nudge -- was "Checking In") ----
function CheckingInSection({ tasks, isCollapsed, onToggle, isDaytime }) {
  if (!tasks || tasks.length === 0) return null

  return (
    <div style={{ marginBottom: 12, opacity: 0.85 }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 0 10px', marginBottom: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {isCollapsed ? <ChevronRight size={16} color={isDaytime ? '#94A3B8' : '#6B7280'} /> : <ChevronDown size={16} color={isDaytime ? '#94A3B8' : '#6B7280'} />}

        <History size={20} color="#94A3B8" style={{
          filter: 'drop-shadow(0 0 4px rgba(148,163,184,0.3))',
        }} />

        <span style={{
          fontFamily: "'Inter Tight', system-ui, sans-serif",
          fontSize: 20, fontWeight: 800,
          color: isDaytime ? '#64748B' : '#8BA4C4',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          flex: 1,
        }}>
          Finish These
        </span>

        {/* Count badge - muted */}
        {tasks.length > 0 && (
          <span style={{
            fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 800,
            fontSize: 13, color: '#94A3B8',
            background: 'rgba(148,163,184,0.10)',
            padding: '4px 12px', borderRadius: 10, lineHeight: 1,
            border: '1px solid rgba(148,163,184,0.15)',
            minWidth: 28, textAlign: 'center',
          }}>
            {tasks.length} stale
          </span>
        )}
      </button>

      {/* Task cards */}
      {!isCollapsed && (
        <AnimatePresence>
          {tasks.map((task, i) => (
            <CheckingInTaskCard
              key={`stale-${i}-${task.text?.slice(0,15)}`}
              task={task}
              index={i}
              isDaytime={isDaytime}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}

// ---- PROJECT GROUP HEADER ---------------------------------------------------
function ProjectGroupHeader({ project, isCollapsed, onToggle }) {
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t => t.done).length
  const remaining = totalTasks - doneTasks
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const isSchedule = project.section === 'schedule' || project.section === 'today'
  const isRightNow = project.section === 'rightnow'
  const allDone = remaining === 0 && totalTasks > 0

  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 0 10px', marginBottom: 4,
        background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Collapse chevron */}
      {isCollapsed ? <ChevronRight size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}

      {/* Project icon */}
      {isRightNow ? (
        <Zap size={18} color={project.color} style={{ filter: `drop-shadow(0 0 6px ${project.color}AA)`, animation: 'rightNowPulse 2s ease-in-out infinite' }} />
      ) : isSchedule ? (
        <Flame size={18} color={project.color} style={{ filter: `drop-shadow(0 0 4px ${project.color}66)` }} />
      ) : (
        <div style={{
          width: 14, height: 14, borderRadius: 4,
          background: project.color,
          boxShadow: `0 0 10px ${project.color}44`,
        }} />
      )}

      {/* Project name */}
      <span style={{
        fontFamily: "'Inter Tight', system-ui, sans-serif",
        fontSize: 20, fontWeight: 900,
        color: '#EDF2FA',
        textTransform: 'uppercase',
        letterSpacing: '-0.02em',
        flex: 1,
      }}>
        {project.name}
      </span>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Progress bar */}
        <div style={{
          width: 80, height: 8, borderRadius: 4,
          background: 'rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: `linear-gradient(90deg, ${project.color}AA, ${project.color})`,
            borderRadius: 3,
            transition: 'width 400ms ease',
          }} />
        </div>

        {/* Count with label */}
        {remaining > 0 ? (
          <span style={{
            fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
            fontSize: 14, color: '#FFF', background: project.color,
            padding: '3px 10px', borderRadius: 8, lineHeight: 1,
            boxShadow: `0 2px 6px ${project.color}44`,
            minWidth: 28, textAlign: 'center',
          }}>
            {remaining} left
          </span>
        ) : allDone ? (
          <CheckCircle2 size={18} color={project.color} strokeWidth={2} style={{ opacity: 0.6 }} />
        ) : null}
      </div>
    </button>
  )
}

// ---- EMPTY STATE -----------------------------------------------------------
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <FolderKanban size={48} color="#4A6080" style={{ margin: '0 auto' }} />
      <div style={{
        fontFamily: "'Inter Tight', system-ui, sans-serif", fontWeight: 800, fontSize: 20,
        color: '#F0ECE6', marginTop: 16, textTransform: 'uppercase',
      }}>
        No Tasks
      </div>
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 14,
        color: '#6B7280', marginTop: 8,
      }}>
        Tasks sync from punch-list.md
      </div>
    </div>
  )
}

// ---- MAIN CHECKLIST MODE COMPONENT -----------------------------------------
export default function ChecklistMode({ agentStatus, isMobile, data }) {
  // Night mode detection: same 8pm threshold as GameHUD
  const [isNightMode, setIsNightMode] = useState(() => new Date().getHours() >= 20)
  useEffect(() => {
    const check = () => setIsNightMode(new Date().getHours() >= 20)
    const timer = setInterval(check, 60000)
    return () => clearInterval(timer)
  }, [])
  const isDaytime = !isNightMode

  const [selectedProject, setSelectedProject] = useState(null)
  const [collapsedProjects, setCollapsedProjects] = useState({})
  // Persist checkbox state in localStorage until Supabase (C4)
  const [checkedTasks, setCheckedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('corner-checks')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })
  const [newTaskText, setNewTaskText] = useState('')
  const inputRef = useRef(null)

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState(null) // { position: {x,y}, task }

  const handleTaskContextMenu = useCallback((e, task) => {
    e.preventDefault()
    setContextMenu({ position: { x: e.clientX, y: e.clientY }, task })
  }, [])

  const handleContextAction = useCallback((action, task, payload) => {
    if (action === 'toggle') {
      // Toggle done/undone (same as checkbox click)
      const key = task.text
      setCheckedTasks(prev => {
        const next = { ...prev }
        if (next[key] !== undefined) {
          delete next[key]
        } else {
          next[key] = !task.done
        }
        return next
      })
    } else if (action === 'priority') {
      // Priority: stored in localStorage for now (C4: Supabase)
      try {
        const saved = JSON.parse(localStorage.getItem('corner-task-priorities') || '{}')
        saved[task.text] = payload
        localStorage.setItem('corner-task-priorities', JSON.stringify(saved))
      } catch {}
    } else if (action === 'reassign') {
      // Reassign: stored in localStorage for now (C4: Supabase)
      try {
        const saved = JSON.parse(localStorage.getItem('corner-task-agents') || '{}')
        saved[task.text] = payload
        localStorage.setItem('corner-task-agents', JSON.stringify(saved))
      } catch {}
    } else if (action === 'delete') {
      // Soft delete: mark as deleted in localStorage (C4: Supabase)
      try {
        const saved = JSON.parse(localStorage.getItem('corner-task-deleted') || '[]')
        if (!saved.includes(task.text)) saved.push(task.text)
        localStorage.setItem('corner-task-deleted', JSON.stringify(saved))
      } catch {}
    }
  }, [])

  // Sync checkbox state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('corner-checks', JSON.stringify(checkedTasks))
    } catch { /* quota exceeded or private browsing - ignore */ }
  }, [checkedTasks])

  // Fetch punch-list data (grouped by project)
  const { data: punchData, loading } = usePunchListData()
  const conversationScores = useConversationRecency()
  const isAutoChecked = useAutoCheckFromNotifications()

  // Right Now: ONLY running agents (local: from active-missions.md, prod: demo data)
  const liveRightNowTasks = useRightNowTasks()
  const rightNowTasks = IS_LOCAL ? liveRightNowTasks : generateDemoRightNow()
  const showRightNow = rightNowTasks.length > 0 && (!selectedProject || selectedProject === 'rightnow')

  // Completed feed: recent task completions (simplified activity feed)
  const liveCompletedFeed = useCompletedFeed()
  const completedFeedTasks = IS_LOCAL ? liveCompletedFeed : generateDemoCompleted()
  const showCompleted = completedFeedTasks.length > 0 && (!selectedProject || selectedProject === 'completed-feed')

  // Your TODOs: Patrik's personal blocked items
  const patrikTodos = usePatrikTodos(punchData)
  const showTodos = patrikTodos.length > 0 && (!selectedProject || selectedProject === 'your-todos')

  // Checking In: stale tasks needing attention
  const checkingInTasks = useCheckingInTasks(punchData)
  const showCheckingIn = checkingInTasks.length > 0 && (!selectedProject || selectedProject === 'finish-these' || selectedProject === 'checking-in')

  // Sort projects by conversation-driven recency weight
  // Section order (Patrik directive): Right Now > Your TODOs > Schedule > Finish These
  const projects = useMemo(() => {
    const raw = punchData?.projects || []

    // LIVE TASK AUTO-CHECK: mark tasks as done if they match TASK FINISHED notifications
    for (const project of raw) {
      for (const task of project.tasks) {
        if (!task.done && isAutoChecked(task.text)) {
          task.done = true
          task.autoChecked = true
        }
      }
    }

    const weights = conversationScores || DEFAULT_RECENCY_WEIGHTS
    return [...raw].sort((a, b) => {
      // Right Now always first (running agents)
      if (a.section === 'rightnow') return -1
      if (b.section === 'rightnow') return 1
      // Your TODOs second
      if (a.section === 'your-todos') return -1
      if (b.section === 'your-todos') return 1
      // Schedule third (was Today)
      if (a.section === 'schedule' || a.section === 'today') return -1
      if (b.section === 'schedule' || b.section === 'today') return 1
      // Finish These fourth (was Checking In) -- least urgent, stale
      if (a.section === 'finish-these' || a.section === 'checking-in') return -1
      if (b.section === 'finish-these' || b.section === 'checking-in') return 1
      const aWeight = weights[a.section] || 10
      const bWeight = weights[b.section] || 10
      if (aWeight !== bWeight) return bWeight - aWeight
      const aRemaining = a.tasks.filter(t => !t.done).length
      const bRemaining = b.tasks.filter(t => !t.done).length
      if (bRemaining !== aRemaining) return bRemaining - aRemaining
      return b.tasks.length - a.tasks.length
    })
  }, [punchData, conversationScores, isAutoChecked])

  // Filter projects based on sidebar selection
  const visibleProjects = selectedProject
    ? projects.filter(p => p.section === selectedProject)
    : projects

  // Toggle collapse
  const toggleCollapse = (section) => {
    setCollapsedProjects(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Handle checkbox toggle -- local state for now, Supabase in C4
  const handleCheck = useCallback((task) => {
    const key = task.text // Use text as key since we don't have IDs yet
    setCheckedTasks(prev => {
      const next = { ...prev }
      if (next[key] !== undefined) {
        // Toggle back to original
        delete next[key]
      } else {
        // Toggle to opposite of original
        next[key] = !task.done
      }
      return next
    })
  }, [])

  // Get effective done state for a task
  const isTaskDone = (task) => {
    const key = task.text
    if (checkedTasks[key] !== undefined) return checkedTasks[key]
    return task.done
  }

  const handleAddTask = (e) => {
    e.preventDefault()
    if (!newTaskText.trim()) return
    // C4: Write to Supabase tasks table
    setNewTaskText('')
  }

  const selectedProjectData = selectedProject ? projects.find(p => p.section === selectedProject) : null

  return (
    <div style={{
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Project Sidebar */}
      <ProjectSidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        isMobile={isMobile}
        rightNowCount={rightNowTasks.length}
        completedCount={completedFeedTasks.length}
        todosCount={patrikTodos.length}
        checkingInCount={checkingInTasks.length}
      />

      {/* Task List */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Loading state */}
        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#6B7280',
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14,
          }}>
            Loading tasks...
          </div>
        )}

        {/* Scrollable task area */}
        {!loading && (
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: isMobile ? '16px' : '24px 40px',
            maxWidth: isMobile ? '100%' : 800,
            margin: '0 auto', width: '100%',
          }}>
            {/* Empty state */}
            {visibleProjects.length === 0 && !showRightNow && !showCompleted && !showTodos && !showCheckingIn && <EmptyState />}

            {/* Section order (Patrik directive): Right Now > Your TODOs > Schedule > Finish These */}

            {/* 1. RIGHT NOW section: ONLY running agents */}
            {showRightNow && (
              <RightNowSection
                tasks={rightNowTasks}
                isCollapsed={collapsedProjects['rightnow-live']}
                onToggle={() => toggleCollapse('rightnow-live')}
                isDaytime={isDaytime}
              />
            )}

            {/* 2. YOUR TODOS section: Patrik's personal blocked items */}
            {showTodos && (
              <YourTodosSection
                tasks={patrikTodos}
                isCollapsed={collapsedProjects['your-todos-live']}
                onToggle={() => toggleCollapse('your-todos-live')}
                isDaytime={isDaytime}
                onCheck={handleCheck}
              />
            )}

            {/* 3. Project groups (Schedule + rest) */}
            {visibleProjects.map(project => {
              const isCollapsed = collapsedProjects[project.section]
              // Filter out soft-deleted tasks + apply local check overrides
              let deletedTasks = []
              try { deletedTasks = JSON.parse(localStorage.getItem('corner-task-deleted') || '[]') } catch {}
              const tasks = project.tasks
                .filter(t => !deletedTasks.includes(t.text))
                .map(t => ({
                  ...t,
                  done: isTaskDone(t),
                }))
              const activeTasks = tasks.filter(t => !t.done)
              const doneTasks = tasks.filter(t => t.done)

              return (
                <div key={project.section} style={{ marginBottom: 8 }}>
                  {/* Only show header when viewing ALL projects */}
                  {!selectedProject && (
                    <ProjectGroupHeader
                      project={{ ...project, tasks }}
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleCollapse(project.section)}
                    />
                  )}

                  {/* Single project header when filtered */}
                  {selectedProject && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      {project.section === 'rightnow' ? (
                        <Zap size={24} color={project.color} style={{ filter: `drop-shadow(0 0 8px ${project.color}AA)`, animation: 'rightNowPulse 2s ease-in-out infinite' }} />
                      ) : (project.section === 'schedule' || project.section === 'today') ? (
                        <Flame size={24} color={project.color} style={{ filter: `drop-shadow(0 0 6px ${project.color}66)` }} />
                      ) : (
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: project.color, boxShadow: `0 0 12px ${project.color}44` }} />
                      )}
                      <span style={{
                        fontFamily: "'Inter Tight', system-ui, sans-serif",
                        fontSize: 26, fontWeight: 900, color: '#EDF2FA',
                        textTransform: 'uppercase', letterSpacing: '-0.02em',
                      }}>
                        {project.name}
                      </span>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600,
                        color: '#6B7280', marginLeft: 4,
                      }}>
                        {activeTasks.length} remaining
                      </span>
                    </div>
                  )}

                  {/* Tasks */}
                  {!isCollapsed && (
                    <AnimatePresence>
                      {activeTasks.map((task, i) => (
                        <TaskCard
                          key={`${project.section}-${i}-${task.text.slice(0,20)}`}
                          task={task}
                          projectColor={project.color}
                          onCheck={handleCheck}
                          onContextMenu={handleTaskContextMenu}
                          index={i}
                          isLive={project.section === 'rightnow'}
                        />
                      ))}

                      {/* Done tasks (collapsed by default within each project) */}
                      {doneTasks.length > 0 && (
                        <div style={{ marginTop: 8, marginBottom: 16 }}>
                          <button
                            onClick={() => toggleCollapse(`${project.section}-done`)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '6px 0', width: '100%',
                            }}
                          >
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                            <span style={{
                              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12,
                              color: '#4A6080', textTransform: 'uppercase',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              {collapsedProjects[`${project.section}-done`] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              Done ({doneTasks.length})
                            </span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                          </button>

                          {collapsedProjects[`${project.section}-done`] && doneTasks.map((task, i) => (
                            <TaskCard
                              key={`${project.section}-done-${i}`}
                              task={task}
                              projectColor={project.color}
                              onCheck={handleCheck}
                              onContextMenu={handleTaskContextMenu}
                              index={i}
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              )
            })}

            {/* 4. COMPLETED FEED: simplified activity feed */}
            {showCompleted && (
              <CompletedFeedSection
                tasks={completedFeedTasks}
                isCollapsed={collapsedProjects['completed-feed']}
                onToggle={() => toggleCollapse('completed-feed')}
                isDaytime={isDaytime}
              />
            )}

            {/* 5. FINISH THESE section: stale tasks (was Checking In) */}
            {showCheckingIn && (
              <CheckingInSection
                tasks={checkingInTasks}
                isCollapsed={collapsedProjects['finish-these-live']}
                onToggle={() => toggleCollapse('finish-these-live')}
                isDaytime={isDaytime}
              />
            )}
          </div>
        )}

        {/* Add task input */}
        <form onSubmit={handleAddTask} style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10, 15, 30, 0.8)',
          backdropFilter: 'blur(8px)',
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            type="text"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            placeholder={`Add a task${selectedProjectData ? ` to ${selectedProjectData.name}` : ''}...`}
            style={{
              width: '100%', height: isMobile ? 44 : 42,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '0 16px',
              fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 15,
              color: '#FDF6EC', outline: 'none',
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => e.target.style.borderColor = `${selectedProjectData?.color || '#3B9EFF'}66`}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </form>
      </div>

      {/* Right-click context menu */}
      <AnimatePresence>
        {contextMenu && (
          <TaskContextMenu
            position={contextMenu.position}
            task={contextMenu.task}
            onClose={() => setContextMenu(null)}
            onAction={handleContextAction}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes checklistDotPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        @keyframes rightNowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes rightNowDotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
        @keyframes todosPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </div>
  )
}
