// Corner: Game HUD v4 (BLUE + LARGER + GAME FEEL)
// Patrik directive: BLUE HUD. Cool blue glass panel. The warm office glows orange behind it.
// The contrast makes both pop. LARGER on desktop. Game scale, not web app scale.
// Chat + HUD = ONE unified element.
//
// DONE(bobby2): Checkbox persistence -- clicking a task checkbox writes back to punch-list.md via /api/local/punch-toggle
// TODO(patrik): Drag-to-reorder project pills in the HUD strip (Trello card energy)
// TODO(patrik): Project pill context menu -- right-click to jump to checklist filtered by project
// TODO(patrik): Mobile HUD swipe-up gesture to expand task panel (game feel)
// TODO(patrik): Bottom bar cleanup -- remove chat input from bottom bar (chat only in sidebar). Replace Active/Blocked stat pills with scrollable/searchable PROJECT PILLS. Bottom bar = minimap + agent portrait + project pills + notification icons. Clean, no chat input.
// DONE(bobby2): Project pill category labels -- pills now show category text (CLIENT / PROJECT / OUTREACH) not color-status text. Color communicates status visually, text label tells you WHAT it is.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp, ChevronDown, Check, Circle, AlertTriangle,
  Activity, Pause, Eye, Clock, Zap, Users, FolderKanban,
  LayoutGrid, X, Loader2, CheckCircle2, Timer, Flame,
  Send, MessageSquare, Search,
} from 'lucide-react'
import { AGENTS, GRID_SPEC } from './gridSpec.js'
import { HUDBellButton, HUDToasts, HUD_NOTIFICATION_STYLES } from './HUDNotifications.jsx'

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
    'TODAY':             { name: 'Today',     section: 'today',      color: '#FF6B3D', icon: 'flame' },
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

        const task = { text, done: isDone, agent, raw: trimmed }
        currentProject.tasks.push(task)

        if (currentProject.section === 'today' && !isDone) {
          todayTasks.push({ ...task, project: 'Today' })
        }
      }

      if (trimmed.startsWith('| ') && !trimmed.includes('---') && currentProject?.section === 'deadlines') {
        const cols = trimmed.split('|').map(s => s.trim()).filter(Boolean)
        if (cols.length >= 3 && cols[0] !== 'Client') {
          const text = `${cols[0]}: ${cols[1]} (${cols[2]})`
          const done = cols[3]?.toLowerCase().includes('done') || cols[3]?.toLowerCase().includes('wrapped')
          currentProject.tasks.push({ text: text.slice(0, 80), done, agent: null, raw: trimmed })
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
          currentProject.tasks.push({ text, done: isDone, agent: null, raw: trimmed, isAction: true })
        } else if (label === 'status' && content) {
          // Status becomes a info task so the pill has content
          const isDone = content.toLowerCase().includes('done') || content.toLowerCase().includes('complete') || content.toLowerCase().includes('green')
          let text = content
          if (text.length > 80) text = text.slice(0, 77) + '...'
          currentProject.tasks.push({ text, done: isDone, agent: null, raw: trimmed, isStatus: true })
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
const DEFAULT_RECENCY_WEIGHTS = {
  'today':          100,  // Always first
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

// ---- DATA HOOK --------------------------------------------------------------
function usePunchListData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const endpoint = IS_LOCAL
        ? '/api/local/file?path=punch-list.md'
        : '/api/dashboard/status'
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()

      if (IS_LOCAL && json.content) {
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
    fetchData()
    const timer = setInterval(fetchData, IS_LOCAL ? 5000 : 60000)
    return () => clearInterval(timer)
  }, [fetchData])

  return { data, loading }
}

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
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
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
          position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%', background: mainCfg.color,
          border: `2px solid ${HUD.panelBgSolid}`, boxShadow: `0 0 8px ${mainCfg.glow}`,
          animation: mainStatus === 'WORKING' ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
        }} />
      </motion.div>

      {/* Expand button to see all agents */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: expanded ? 'rgba(59,158,255,0.15)' : 'rgba(100,180,255,0.06)',
          border: `1.5px solid ${expanded ? HUD.accent + '44' : HUD.divider}`,
          color: expanded ? HUD.accent : HUD.textMuted,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 150ms ease',
          fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
        }}
        title="Show all agents"
      >
        <Users size={14} />
      </motion.button>

      {/* Expanded: small 24px dots for other agents */}
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
              whileHover={{ scale: 1.3, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
              title={`${agent.name}: ${cfg.label}`}
              style={{
                width: 24, height: 24, minWidth: 24, minHeight: 24,
                borderRadius: '50%',
                border: `2px solid ${cfg.ring}`,
                overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                background: '#0A0F1E',
                boxShadow: status === 'WORKING' ? `0 0 10px ${cfg.glow}` : status === 'BLOCKED' ? `0 0 8px rgba(239,68,68,0.4)` : 'none',
                animation: status === 'WORKING' ? 'hudMiniDotPulse 2s ease-in-out infinite' : status === 'BLOCKED' ? 'hudMiniDotBlocked 1.5s ease-in-out infinite' : 'none',
                opacity: status === 'IDLE' ? 0.6 : 1,
              }}
            >
              {hasSpr ? (
                <img src={`/corner/sprites/${agent.slug}-idle.png`} alt=""
                  width={40} height={40}
                  style={{ width: 40, height: 40, objectFit: 'cover', objectPosition: '15% 5%', imageRendering: 'pixelated', display: 'block', marginLeft: -6, marginTop: -4 }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: agent.color || '#4A6080', fontFamily: "'Inter', system-ui, sans-serif" }}>
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
function ProjectCard({ project, isExpanded, onClick, onContextMenu }) {
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t => t.done).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const remaining = totalTasks - doneTasks
  const isToday = project.section === 'today'
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

  return (
    <motion.button
      onClick={onClick}
      onContextMenu={(e) => onContextMenu?.(e, project)}
      whileHover={{ scale: 1.08, y: -6, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
      whileTap={{ scale: 0.88, y: 4, transition: { type: 'spring', stiffness: 600, damping: 18 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        height: 56, padding: '0 24px',
        background: isExpanded
          ? `linear-gradient(135deg, ${project.color}22, ${project.color}0C)`
          : isClient
            ? `linear-gradient(135deg, ${project.color}14, ${project.color}06)`
            : isToday
              ? 'linear-gradient(135deg, rgba(255, 107, 61, 0.14), rgba(255, 107, 61, 0.06))'
              : 'linear-gradient(135deg, rgba(100,180,255,0.07), rgba(100,180,255,0.02))',
        border: `2px solid ${isExpanded ? `${project.color}55` : isClient ? `${project.color}30` : isToday ? 'rgba(255, 107, 61, 0.28)' : 'rgba(100,180,255,0.14)'}`,
        borderRadius: 16,
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 200ms ease',
        // VEGAS + CROSSY ROAD: Physical drop shadow. Chunky grabbable pills.
        boxShadow: isExpanded
          ? `0 6px 24px ${project.color}30, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`
          : isClient && project.statusTag === 'RED'
            ? `0 4px 20px rgba(239,68,68,0.2), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`
            : isToday
              ? '0 4px 20px rgba(255,107,61,0.2), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Bottom progress fill - THICKER */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: `${progress}%`, height: 6,
        background: `linear-gradient(90deg, ${project.color}70, ${project.color})`,
        transition: 'width 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        borderRadius: '0 0 14px 14px',
        boxShadow: `0 0 8px ${project.color}44`,
      }} />

      {/* Side accent for Today or RED clients - THICKER */}
      {(isToday || (isClient && project.statusTag === 'RED')) && (
        <div style={{
          position: 'absolute', left: 0, top: 6, bottom: 6,
          width: 4, borderRadius: 2,
          background: isToday ? project.color : '#EF4444',
          boxShadow: `0 0 12px ${isToday ? project.color : 'rgba(239,68,68,0.6)'}88`,
          animation: isClient && project.statusTag === 'RED' ? 'statusPulse 2s ease-in-out infinite' : 'none',
        }} />
      )}

      {/* Project indicator - BIGGER. $ icon for clients */}
      {isToday ? (
        <Flame size={18} color={project.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${project.color}88)` }} />
      ) : isClient ? (
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: project.color,
          boxShadow: `0 0 10px ${project.color}55`,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900, color: '#FFF',
          fontFamily: "'Inter Tight', sans-serif",
        }}>$</div>
      ) : (
        <div style={{
          width: 12, height: 12, borderRadius: 4,
          background: allDone ? `${project.color}60` : project.color,
          boxShadow: allDone ? 'none' : `0 0 12px ${project.color}55`,
          flexShrink: 0,
        }} />
      )}

      {/* Name - VEGAS SIZE. Font weight 900. Patrik directive. */}
      <span style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 20, fontWeight: 900,
        color: isExpanded ? '#FFFFFF' : isToday ? '#EDF2FA' : HUD.textPrimary,
        whiteSpace: 'nowrap',
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        textShadow: isToday ? '0 1px 4px rgba(255,107,61,0.3)' : '0 1px 2px rgba(0,0,0,0.3)',
      }}>
        {project.name}
      </span>

      {/* Revenue badge for clients */}
      {isClient && project.revenue && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14, fontWeight: 700,
          color: project.color,
          background: `${project.color}15`,
          padding: '3px 10px', borderRadius: 6,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          border: `1.5px solid ${project.color}30`,
        }}>
          {project.revenue}
        </span>
      )}

      {/* Category tag for pills -- shows WHAT it is (client/project/outreach), not the color.
          Color already communicates status visually. Text label tells you the category. */}
      {tagStyle && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12, fontWeight: 800,
          color: tagStyle.text,
          background: tagStyle.bg,
          padding: '3px 8px', borderRadius: 5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: `1.5px solid ${tagStyle.border}`,
          whiteSpace: 'nowrap',
          boxShadow: tagStyle.glow !== 'none' ? `0 0 10px ${tagStyle.glow}` : 'none',
          animation: project.statusTag === 'RED' ? 'statusPulse 2.5s ease-in-out infinite' : 'none',
        }}>
          {project.section === 'outreach' ? 'OUTREACH'
            : project.icon === 'client' || project.isClient ? 'CLIENT'
            : 'PROJECT'}
        </span>
      )}

      {/* Task count badge - VEGAS. Oversized. Casino chip energy. */}
      {remaining > 0 && !isClient && (
        <span style={{
          fontFamily: "'Inter Tight', JetBrains Mono, monospace",
          fontSize: 18, fontWeight: 900,
          color: '#FFF',
          background: `linear-gradient(135deg, ${project.color}, ${project.color}DD)`,
          padding: '5px 14px', borderRadius: 12,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          boxShadow: `0 3px 12px ${project.color}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
          minWidth: 32, textAlign: 'center',
        }}>
          {remaining}
        </span>
      )}

      {allDone && (
        <CheckCircle2 size={18} color={project.color} strokeWidth={2.5} style={{ flexShrink: 0, filter: `drop-shadow(0 0 4px ${project.color}44)` }} />
      )}
    </motion.button>
  )
}

// ---- EXPANDED TASK PANEL (blue glass, game-styled, interactive checkboxes) ---
function TaskPanel({ project, onClose }) {
  // Local state for optimistic checkbox toggling
  const [localToggles, setLocalToggles] = useState({}) // task index -> toggled done state
  const [saving, setSaving] = useState(null) // which task index is saving

  const tasks = project.tasks
  const getTaskDone = (task, idx) => localToggles[idx] !== undefined ? localToggles[idx] : task.done
  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t, i) => getTaskDone(t, i)).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const sortedTasks = useMemo(() => {
    return tasks.map((t, i) => ({ ...t, origIdx: i })).sort((a, b) => {
      const aDone = getTaskDone(a, a.origIdx)
      const bDone = getTaskDone(b, b.origIdx)
      if (aDone === bDone) return 0
      return aDone ? 1 : -1
    })
  }, [tasks, localToggles])

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
      style={{
        position: 'absolute', bottom: '100%', left: 16, right: 16,
        background: HUD.panelBg,
        backdropFilter: 'blur(24px)',
        border: `2px solid ${HUD.panelBorder}`,
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
        maxHeight: 380,
        boxShadow: '0 -12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(100,180,255,0.08)',
      }}
    >
      {/* Blue inner glow at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 50,
        background: 'linear-gradient(180deg, rgba(100,180,255,0.05) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px 12px',
        borderBottom: `1px solid ${HUD.divider}`,
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
            color: HUD.textPrimary,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}>
            {project.name}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600,
            color: HUD.textMuted,
          }}>
            {doneTasks}/{totalTasks}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Progress bar - THICKER per Steffen spec (12px) */}
          <div style={{
            width: 100, height: 12, borderRadius: 6,
            background: 'rgba(100,180,255,0.06)',
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
              background: 'rgba(100,180,255,0.06)', border: `1px solid ${HUD.divider}`,
              borderRadius: 6, cursor: 'pointer',
              color: HUD.textMuted, padding: '4px 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.12)'; e.currentTarget.style.color = HUD.textSecondary }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.06)'; e.currentTarget.style.color = HUD.textMuted }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div style={{
        padding: '8px 16px 16px',
        overflowY: 'auto', maxHeight: 300,
      }} className="hud-scroll">
        {sortedTasks.map((task, i) => {
          const isDone = getTaskDone(task, task.origIdx)
          const isSaving = saving === task.origIdx
          return (
            <motion.div
              key={task.origIdx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.15 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 8px',
                borderBottom: i < sortedTasks.length - 1 ? `1px solid ${HUD.divider}` : 'none',
                opacity: isDone ? 0.35 : 1,
                transition: 'opacity 200ms ease',
              }}
            >
              {/* Checkbox - CLICKABLE */}
              <motion.div
                onClick={() => toggleTask(task, task.origIdx)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                  border: isDone ? 'none' : `1.5px solid rgba(100,180,255,0.18)`,
                  background: isDone ? project.color : 'rgba(100,180,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease',
                  cursor: IS_LOCAL ? 'pointer' : 'default',
                  opacity: isSaving ? 0.5 : 1,
                }}>
                {isDone && <Check size={12} color="#FFF" strokeWidth={3} />}
              </motion.div>

              {/* Task text - LARGER */}
              <span style={{
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, fontWeight: 400,
                color: isDone ? HUD.textMuted : HUD.textPrimary,
                lineHeight: 1.45,
                textDecoration: isDone ? 'line-through' : 'none',
                flex: 1,
              }}>
                {task.text}
              </span>

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

// ---- COMPACT STATS (blue-themed, LARGER) ------------------------------------
function CompactStats({ agentStatus, throughput, overallProgress }) {
  const working = throughput?.working || Object.values(agentStatus || {}).filter(a => a?.status === 'WORKING').length
  const blocked = throughput?.blocked || Object.values(agentStatus || {}).filter(a => a?.status === 'BLOCKED').length

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />
        <span style={{ color: '#22C55E' }}>{working}</span>
      </div>
      {blocked > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }} />
          <span style={{ color: '#EF4444' }}>{blocked}</span>
        </div>
      )}
      {/* Mini progress ring - LARGER */}
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <svg width={36} height={36} viewBox="0 0 36 36">
          <circle cx={18} cy={18} r={13} fill="none" stroke="rgba(100,180,255,0.08)" strokeWidth={3} />
          <circle
            cx={18} cy={18} r={13}
            fill="none" stroke={HUD.accent} strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${overallProgress * 0.817} 81.7`}
            transform="rotate(-90 18 18)"
            style={{ transition: 'stroke-dasharray 600ms ease', filter: `drop-shadow(0 0 4px ${HUD.accentGlow})` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: HUD.accent,
        }}>
          {overallProgress}
        </div>
      </div>
    </div>
  )
}

// ---- INLINE CHAT INPUT (LARGER, blue-themed, integrated into HUD strip) -----
function HUDChatInput({ chatAgent, agentStatus, onChatSubmit, onExpandChat, isMobile }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const currentAgent = chatAgent
    ? AGENTS.find(a => a.slug === chatAgent)
    : AGENTS.find(a => a.slug === 'elon')
  const agentSlug = currentAgent?.slug || 'elon'
  const agentColor = currentAgent?.color || HUD.accent
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)

  const handleSubmit = (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    onChatSubmit?.(agentSlug, text)
  }

  const chatSize = isMobile ? 32 : 44

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      flexShrink: 0,
      minWidth: isMobile ? 0 : 280,
      maxWidth: isMobile ? '100%' : 420,
    }}>
      {/* Agent plumbob mini portrait - LARGER */}
      <div
        onClick={() => onExpandChat?.()}
        style={{
          width: chatSize, height: chatSize, flexShrink: 0,
          cursor: 'pointer', position: 'relative',
        }}
        title={`Chat with ${currentAgent?.name}`}
      >
        <svg width={chatSize} height={chatSize} viewBox={`0 0 ${chatSize} ${chatSize}`}>
          <PlumbobClipDef id="chat-plumbob-clip" size={chatSize} />
          <path
            d={`M ${chatSize/2} ${chatSize*0.02} L ${chatSize/2+chatSize*0.48} ${chatSize*0.22} L ${chatSize/2+chatSize*0.48} ${chatSize*0.72} Q ${chatSize/2+chatSize*0.48} ${chatSize*0.98}, ${chatSize/2} ${chatSize*0.98} Q ${chatSize/2-chatSize*0.48} ${chatSize*0.98}, ${chatSize/2-chatSize*0.48} ${chatSize*0.72} L ${chatSize/2-chatSize*0.48} ${chatSize*0.22} Z`}
            fill={`${agentColor}25`}
          />
          {hasSpriteFile ? (
            <image
              href={`/corner/sprites/${agentSlug}-idle.png`}
              x={-chatSize * 0.12}
              y={-chatSize * 0.04}
              width={chatSize * 1.3}
              height={chatSize * 1.3}
              clipPath="url(#chat-plumbob-clip)"
              style={{ imageRendering: 'pixelated' }}
              preserveAspectRatio="xMidYMin slice"
            />
          ) : (
            <text x={chatSize/2} y={chatSize*0.58} textAnchor="middle" dominantBaseline="middle"
              fill={agentColor} fontFamily="Inter, system-ui, sans-serif"
              fontWeight="700" fontSize={chatSize * 0.38}>
              {currentAgent?.name?.charAt(0) || '?'}
            </text>
          )}
          <path
            d={`M ${chatSize/2} ${chatSize*0.02} L ${chatSize/2+chatSize*0.48} ${chatSize*0.22} L ${chatSize/2+chatSize*0.48} ${chatSize*0.72} Q ${chatSize/2+chatSize*0.48} ${chatSize*0.98}, ${chatSize/2} ${chatSize*0.98} Q ${chatSize/2-chatSize*0.48} ${chatSize*0.98}, ${chatSize/2-chatSize*0.48} ${chatSize*0.72} L ${chatSize/2-chatSize*0.48} ${chatSize*0.22} Z`}
            fill="none" stroke={agentColor} strokeWidth={1.5} strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Text input - LARGER */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={isMobile ? 'Message...' : `Message ${currentAgent?.name}...`}
        style={{
          flex: 1,
          background: 'rgba(100,180,255,0.04)',
          border: '1px solid rgba(100,180,255,0.10)',
          borderRadius: 10,
          height: isMobile ? 36 : 44,
          padding: '0 16px',
          color: HUD.textPrimary,
          fontSize: isMobile ? 15 : 18,
          fontFamily: "'Inter', system-ui, sans-serif",
          outline: 'none',
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          minWidth: 0,
        }}
        onFocus={e => {
          e.target.style.borderColor = `${agentColor}77`
          e.target.style.boxShadow = `0 0 0 3px ${agentColor}30, 0 0 16px ${agentColor}18`
        }}
        onBlur={e => {
          e.target.style.borderColor = 'rgba(100,180,255,0.10)'
          e.target.style.boxShadow = 'none'
        }}
      />

      {/* Send button - LARGER */}
      <button
        type="submit"
        disabled={!input.trim()}
        style={{
          width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: '50%',
          background: input.trim() ? agentColor : 'rgba(100,180,255,0.06)',
          color: input.trim() ? '#EDF2FA' : HUD.textMuted,
          border: input.trim() ? 'none' : `1px solid ${HUD.divider}`,
          cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms ease',
          flexShrink: 0,
          opacity: input.trim() ? 1 : 0.5,
        }}
      >
        <Send size={isMobile ? 14 : 16} style={{ marginLeft: 1 }} />
      </button>

      {/* Expand chat button */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => onExpandChat?.()}
          style={{
            width: 32, height: 32,
            background: 'rgba(100,180,255,0.04)',
            border: `1px solid ${HUD.divider}`,
            borderRadius: 6,
            cursor: 'pointer',
            color: HUD.textMuted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = HUD.textSecondary; e.currentTarget.style.background = 'rgba(100,180,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = HUD.textMuted; e.currentTarget.style.background = 'rgba(100,180,255,0.04)' }}
          title="Expand chat"
        >
          <ChevronUp size={15} />
        </button>
      )}
    </form>
  )
}

// ---- MAIN HUD ---------------------------------------------------------------
export default function GameHUD({
  agentStatus, throughput, onAgentClick, isMobile,
  // Chat integration props
  chatAgent, onChatSubmit, onExpandChat,
  // Context menu props
  onAgentContextMenu, onProjectContextMenu,
}) {
  const [expandedProject, setExpandedProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  const { data: punchData, loading } = usePunchListData()
  const hudRef = useRef(null)
  const conversationScores = useConversationRecency()

  // Sort projects by CONVERSATION RECENCY first, then incomplete task count.
  // The system KNOWS what matters based on what you TALK ABOUT.
  // Uses live conversation parsing on localhost, falls back to defaults on production.
  const projects = useMemo(() => {
    const raw = punchData?.projects || []
    const weights = conversationScores || DEFAULT_RECENCY_WEIGHTS
    // Today always stays pinned at top
    return [...raw].sort((a, b) => {
      // Today is always first
      if (a.section === 'today') return -1
      if (b.section === 'today') return 1
      // Primary: conversation-driven weight (higher = first)
      const aWeight = weights[a.section] || 10
      const bWeight = weights[b.section] || 10
      if (aWeight !== bWeight) return bWeight - aWeight
      // Secondary: incomplete tasks (more = first)
      const aRemaining = a.tasks.filter(t => !t.done).length
      const bRemaining = b.tasks.filter(t => !t.done).length
      if (bRemaining !== aRemaining) return bRemaining - aRemaining
      // Tertiary: total tasks
      return b.tasks.length - a.tasks.length
    })
  }, [punchData, conversationScores])

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

  return (
    <div
      ref={hudRef}
      style={{
        position: 'fixed',
        bottom: isMobile ? 60 : 0,
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
          />
        )}
      </AnimatePresence>

      {/* The HUD panel - BLUE GLASS game panel */}
      <div
        className="hud-panel-shimmer"
        style={{
          background: HUD.panelBg,
          backdropFilter: 'blur(24px)',
          borderTop: `2px solid ${HUD.panelBorder}`,
          borderLeft: '2px solid rgba(100,180,255,0.08)',
          borderRight: '2px solid rgba(100,180,255,0.08)',
          // Chunky game panel shape
          borderRadius: isMobile ? 0 : '18px 18px 0 0',
          boxShadow: HUD.panelShadow,
          padding: isMobile ? '4px 10px' : '0 20px',
          margin: isMobile ? 0 : '0 12px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Blue glow overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          background: HUD.blueOverlay,
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }} />

        {/* Blue shimmer on top border */}
        <div className="hud-border-shimmer" style={{
          position: 'absolute', top: -1, left: 24, right: 24, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(100,180,255,0.35) 25%, rgba(140,210,255,0.55) 50%, rgba(100,180,255,0.35) 75%, transparent 100%)',
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

        {/* Main row: Agents | Projects + Stats | Chat -- LARGER min height */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 14,
          minHeight: isMobile ? 58 : 108,
          position: 'relative',
          zIndex: 1,
          padding: isMobile ? 0 : '8px 0',
        }}>
          {/* Left: Agent plumbob portraits */}
          {!isMobile && (
            <AgentRoster agentStatus={agentStatus} onAgentClick={onAgentClick} onAgentContextMenu={onAgentContextMenu} />
          )}

          {/* Divider */}
          {!isMobile && (
            <div style={{ width: 1, height: 36, background: HUD.divider, flexShrink: 0 }} />
          )}

          {/* Center: Search + Project cards (MOSTLY projects, agents are tiny) */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            padding: '4px 6px',
            maxHeight: 108,
            overflow: 'hidden',
            alignContent: 'center',
          }}>
            {/* Search toggle + input: filters projects in real-time */}
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <AnimatePresence>
                  {searchOpen && (
                    <motion.input
                      ref={searchRef}
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 140, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false) }
                      }}
                      placeholder="Filter projects..."
                      style={{
                        background: 'rgba(100,180,255,0.06)',
                        border: `1px solid ${HUD.panelBorder}`,
                        borderRadius: 10,
                        height: 36,
                        padding: '0 12px',
                        color: HUD.textPrimary,
                        fontSize: 14,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        outline: 'none',
                        marginRight: 6,
                      }}
                    />
                  )}
                </AnimatePresence>
                <motion.button
                  onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery('') }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: searchOpen ? 'rgba(59,158,255,0.15)' : 'rgba(100,180,255,0.04)',
                    border: `1px solid ${searchOpen ? HUD.accent + '44' : HUD.divider}`,
                    color: searchOpen ? HUD.accent : HUD.textMuted,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 150ms ease',
                  }}
                >
                  <Search size={15} />
                </motion.button>
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
                <Loader2 size={16} style={{ color: HUD.textMuted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, color: HUD.textMuted }}>
                  Loading...
                </span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, color: HUD.textMuted, padding: '0 8px' }}>
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
                />
              ))
            )}
          </div>

          {/* Compact stats */}
          {!isMobile && (
            <CompactStats
              agentStatus={agentStatus}
              throughput={throughput}
              overallProgress={overallProgress}
            />
          )}

          {/* Notification bell with badge */}
          {!isMobile && (
            <HUDBellButton onClick={onExpandChat} />
          )}

          {/* Divider before chat shortcut */}
          <div style={{ width: 1, height: 36, background: HUD.divider, flexShrink: 0 }} />

          {/* Right: Open sidebar chat button (chat input lives ONLY in sidebar per Patrik directive) */}
          <button
            type="button"
            onClick={() => onExpandChat?.()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(100,180,255,0.06)',
              border: `1px solid ${HUD.divider}`,
              borderRadius: 10,
              padding: isMobile ? '6px 10px' : '8px 16px',
              cursor: 'pointer',
              color: HUD.textSecondary,
              fontSize: isMobile ? 14 : 16,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 500,
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.12)'; e.currentTarget.style.borderColor = HUD.panelBorderHover }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.06)'; e.currentTarget.style.borderColor = HUD.divider }}
            title="Open sidebar chat"
          >
            <MessageSquare size={isMobile ? 14 : 16} />
            {!isMobile && <span>Chat</span>}
          </button>
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
    </div>
  )
}
