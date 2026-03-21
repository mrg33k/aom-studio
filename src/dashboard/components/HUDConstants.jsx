// HUDConstants.jsx -- extracted from GameHUD.jsx (god file split 1/6)
// Contains: PALETTE, IS_LOCAL, HUD, STATUS_DOT, parsePunchList, DEFAULT_RECENCY_WEIGHTS,
//           useConversationRecency, DEFAULT_MAIN_AGENT
// Pure extraction -- zero functionality changes.

import React, { useState, useEffect } from 'react'
import { AGENTS, GRID_SPEC } from '../gridSpec.js'

// ---- PALETTE ----------------------------------------------------------------
export const PALETTE = GRID_SPEC.colorPalette
export const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// BLUE HUD colors (cool blue glass panel contrasting the warm game world)
// Think: Sims blue panel. Fresh, tech, game UI. Clean glass over warm pixel art.
export const HUD = {
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
export const STATUS_DOT = {
  WORKING:  { color: '#22C55E', glow: 'rgba(34,197,94,0.5)',  label: 'Active',   ring: '#22C55E' },
  IDLE:     { color: '#4A6080', glow: 'rgba(74,96,128,0.2)',   label: 'Idle',     ring: '#3A5070' },
  BLOCKED:  { color: '#EF4444', glow: 'rgba(239,68,68,0.5)',  label: 'Blocked',  ring: '#EF4444' },
  DONE:     { color: '#3B82F6', glow: 'rgba(59,130,246,0.4)', label: 'Done',     ring: '#3B82F6' },
  WAITING:  { color: '#F59E0B', glow: 'rgba(245,158,11,0.4)', label: 'Thinking', ring: '#F59E0B' },
  PAUSED:   { color: '#F97316', glow: 'rgba(249,115,22,0.4)', label: 'Paused',   ring: '#F97316' },
}

// ---- PUNCH LIST PARSER ------------------------------------------------------
export function parsePunchList(markdown) {
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
    projects: projects.filter(p => p.tasks.length > 0),
    todayTasks,
  }
}

// ---- RECENCY WEIGHTS (CONVERSATION-DRIVEN) ----------------------------------
// Projects ranked by what you TALK ABOUT, not static order.
// Fallback weights used when conversation data isn't available.
export const DEFAULT_RECENCY_WEIGHTS = {
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
export function useConversationRecency() {
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

// ---- AGENT ROSTER (Main agent prominent + expand + right-click revolver) ----
// Patrik directive: Show the MAIN agent (Elon) prominently. Expand button to see all.
// Right-click on an agent = paint board / revolver pop-out (fan out in arc).
export const DEFAULT_MAIN_AGENT = 'elon'
