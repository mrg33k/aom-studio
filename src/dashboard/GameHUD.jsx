// Corner: Game HUD v4 (BLUE + LARGER + GAME FEEL)
// Patrik directive: BLUE HUD. Cool blue glass panel. The warm office glows orange behind it.
// The contrast makes both pop. LARGER on desktop. Game scale, not web app scale.
// Chat + HUD = ONE unified element.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp, ChevronDown, Check, Circle, AlertTriangle,
  Activity, Pause, Eye, Clock, Zap, Users, FolderKanban,
  LayoutGrid, X, Loader2, CheckCircle2, Timer, Flame,
  Send, MessageSquare,
} from 'lucide-react'
import { AGENTS, GRID_SPEC } from './gridSpec.js'

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

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').trim()
      const sectionUpper = currentSection.toUpperCase()

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
  }

  return {
    projects: projects.filter(p => p.tasks.length > 0),
    todayTasks,
  }
}

// ---- RECENCY WEIGHTS (CORNER should be #1 because that's what Patrik works on) --
// Hard-coded recency weights until we have git log / activity timestamps.
// The system KNOWS what matters based on what you talk about.
const PROJECT_RECENCY_WEIGHTS = {
  'today':      100,  // Always first
  'corner':     95,   // #1 project right now
  'aom-site':   85,   // Active site work
  'aom-phase2': 80,   // Phase 2 builds
  'ambition':   70,   // Client site
  'outreach':   65,   // Active outreach
  'gtm':        60,   // Advisory
  'cleo':       55,   // Content
  'content':    55,
  'kohrs':      50,   // Client
  'isa':        45,
  'skylar':     40,
  'deadlines':  35,
  'infra':      30,
  'week':       25,
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

function AgentPortrait({ slug, size = 58, status = 'IDLE', onClick, showName = false, index = 0 }) {
  const agent = AGENTS.find(a => a.slug === slug)
  const cfg = STATUS_DOT[status] || STATUS_DOT.IDLE
  const color = agent?.color || '#4A6080'
  const isActive = status === 'WORKING'
  const isBlocked = status === 'BLOCKED'
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
      whileHover={{ scale: 1.15, y: -5, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
      whileTap={{ scale: 0.88, y: 2, transition: { type: 'spring', stiffness: 600, damping: 20 } }}
      title={`${agent?.name || slug}: ${cfg.label}`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Active agent glow */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: -8,
          background: `radial-gradient(ellipse at center, ${cfg.glow} 0%, transparent 70%)`,
          animation: 'hudActiveGlow 2s ease-in-out infinite',
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
              fontFamily="Space Grotesk, sans-serif"
              fontWeight="700"
              fontSize={size * 0.36}
            >
              {agent?.name?.charAt(0) || '?'}
            </text>
          </g>
        )}

        {/* Plumbob outline stroke - status colored */}
        <path
          d={outlinePath}
          fill="none"
          stroke={cfg.ring}
          strokeWidth={isActive ? 2.5 : 1.8}
          strokeLinejoin="round"
          style={{
            filter: isActive ? `drop-shadow(0 0 6px ${cfg.glow})` : 'none',
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

      {/* Status dot at bottom center */}
      <div style={{
        position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
        width: 10, height: 10, borderRadius: '50%',
        background: cfg.color,
        border: `2px solid ${HUD.panelBgSolid}`,
        boxShadow: `0 0 8px ${cfg.glow}`,
        animation: isActive ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
      }} />

      {/* Blocked X badge */}
      {isBlocked && (
        <div style={{
          position: 'absolute', top: -2, right: -2,
          width: 15, height: 15, borderRadius: '50%',
          background: '#EF4444', border: `2px solid ${HUD.panelBgSolid}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 8px rgba(239,68,68,0.5)',
        }}>
          <X size={8} color="#FFF" strokeWidth={3} />
        </div>
      )}
    </motion.div>
  )
}

// ---- AGENT ROSTER (horizontal strip, LARGER portraits, game spacing) --------
function AgentRoster({ agentStatus, onAgentClick }) {
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

  return (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'center',
      padding: '0 4px',
    }}>
      {sortedAgents.map((agent, i) => (
        <AgentPortrait
          key={agent.slug}
          slug={agent.slug}
          size={58}
          status={agentStatus?.[agent.slug]?.status || 'IDLE'}
          onClick={onAgentClick}
          index={i}
        />
      ))}
    </div>
  )
}

// ---- PROJECT CARD (VEGAS ENERGY: Trello thickness, physical objects) ---------
// If you think it's big enough, DOUBLE IT. Slot machine buttons. Casino cards.
// Drop shadows, bold rounded corners, chunky, grabbable, satisfying.
function ProjectCard({ project, isExpanded, onClick }) {
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t => t.done).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const remaining = totalTasks - doneTasks
  const isToday = project.section === 'today'
  const allDone = remaining === 0 && totalTasks > 0

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -5, transition: { type: 'spring', stiffness: 450, damping: 10 } }}
      whileTap={{ scale: 0.90, y: 3, transition: { type: 'spring', stiffness: 600, damping: 18 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        height: 52, padding: '0 22px',
        background: isExpanded
          ? `linear-gradient(135deg, ${project.color}22, ${project.color}0C)`
          : isToday
            ? 'linear-gradient(135deg, rgba(255, 107, 61, 0.14), rgba(255, 107, 61, 0.06))'
            : 'linear-gradient(135deg, rgba(100,180,255,0.07), rgba(100,180,255,0.02))',
        border: `2px solid ${isExpanded ? `${project.color}55` : isToday ? 'rgba(255, 107, 61, 0.28)' : 'rgba(100,180,255,0.14)'}`,
        borderRadius: 16,
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 200ms ease',
        // VEGAS: Physical drop shadow. These pills feel like objects you can GRAB.
        boxShadow: isExpanded
          ? `0 6px 24px ${project.color}30, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`
          : isToday
            ? '0 4px 20px rgba(255,107,61,0.2), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Bottom progress fill - THICKER */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: `${progress}%`, height: 4,
        background: `linear-gradient(90deg, ${project.color}70, ${project.color})`,
        transition: 'width 500ms ease',
        borderRadius: '0 0 14px 14px',
      }} />

      {/* Side accent for Today - THICKER */}
      {isToday && (
        <div style={{
          position: 'absolute', left: 0, top: 6, bottom: 6,
          width: 4, borderRadius: 2,
          background: project.color,
          boxShadow: `0 0 12px ${project.color}88`,
        }} />
      )}

      {/* Project indicator - BIGGER */}
      {isToday ? (
        <Flame size={18} color={project.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${project.color}88)` }} />
      ) : (
        <div style={{
          width: 12, height: 12, borderRadius: 4,
          background: allDone ? `${project.color}60` : project.color,
          boxShadow: allDone ? 'none' : `0 0 12px ${project.color}55`,
          flexShrink: 0,
        }} />
      )}

      {/* Name - VEGAS SIZE. Bold. Chunky. Impossible to miss. */}
      <span style={{
        fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif",
        fontSize: 18, fontWeight: 900,
        color: isExpanded ? '#FFFFFF' : isToday ? '#EDF2FA' : HUD.textPrimary,
        whiteSpace: 'nowrap',
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        textShadow: isToday ? '0 1px 4px rgba(255,107,61,0.3)' : 'none',
      }}>
        {project.name}
      </span>

      {/* Task count badge - BIGGER, bolder */}
      {remaining > 0 && (
        <span style={{
          fontFamily: "'Inter Tight', JetBrains Mono, monospace",
          fontSize: 16, fontWeight: 900,
          color: '#FFF',
          background: project.color,
          padding: '4px 12px', borderRadius: 10,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          boxShadow: `0 2px 8px ${project.color}55`,
          minWidth: 28, textAlign: 'center',
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

// ---- EXPANDED TASK PANEL (blue glass, game-styled) --------------------------
function TaskPanel({ project, onClose }) {
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t => t.done).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const sortedTasks = useMemo(() => {
    return [...project.tasks].sort((a, b) => {
      if (a.done === b.done) return 0
      return a.done ? 1 : -1
    })
  }, [project.tasks])

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
        border: `1px solid ${HUD.panelBorder}`,
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
            fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800,
            color: HUD.textPrimary,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}>
            {project.name}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600,
            color: HUD.textMuted,
          }}>
            {doneTasks}/{totalTasks}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Progress bar */}
          <div style={{
            width: 100, height: 6, borderRadius: 3,
            background: 'rgba(100,180,255,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: `linear-gradient(90deg, ${project.color}AA, ${project.color})`,
              borderRadius: 3,
              transition: 'width 300ms ease',
            }} />
          </div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700,
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
        {sortedTasks.map((task, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.15 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 8px',
              borderBottom: i < sortedTasks.length - 1 ? `1px solid ${HUD.divider}` : 'none',
              opacity: task.done ? 0.35 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: task.done ? 'none' : `1.5px solid rgba(100,180,255,0.18)`,
              background: task.done ? project.color : 'rgba(100,180,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}>
              {task.done && <Check size={12} color="#FFF" strokeWidth={3} />}
            </div>

            {/* Task text - LARGER */}
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 400,
              color: task.done ? HUD.textMuted : HUD.textPrimary,
              lineHeight: 1.45,
              textDecoration: task.done ? 'line-through' : 'none',
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
                      fontSize: 10, fontWeight: 700, color: a?.color || '#4A6080',
                      fontFamily: 'Space Grotesk, sans-serif',
                    }}>
                      {a?.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
              )
            })()}
          </motion.div>
        ))}
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
      fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
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
          fontSize: 10, fontWeight: 800, color: HUD.accent,
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
              fill={agentColor} fontFamily="Space Grotesk, sans-serif"
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
          height: isMobile ? 34 : 40,
          padding: '0 16px',
          color: HUD.textPrimary,
          fontSize: isMobile ? 14 : 15,
          fontFamily: 'Space Grotesk, sans-serif',
          outline: 'none',
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          minWidth: 0,
        }}
        onFocus={e => {
          e.target.style.borderColor = `${agentColor}55`
          e.target.style.boxShadow = `0 0 0 3px ${agentColor}12`
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
}) {
  const [expandedProject, setExpandedProject] = useState(null)
  const { data: punchData, loading } = usePunchListData()
  const hudRef = useRef(null)

  // Sort projects by RECENCY WEIGHT first, then incomplete task count.
  // CORNER is #1 because that's what Patrik has been doing.
  // The system KNOWS what matters based on conversation frequency.
  const projects = useMemo(() => {
    const raw = punchData?.projects || []
    return [...raw].sort((a, b) => {
      const aWeight = PROJECT_RECENCY_WEIGHTS[a.section] || 10
      const bWeight = PROJECT_RECENCY_WEIGHTS[b.section] || 10
      // Primary: recency weight (higher = first)
      if (aWeight !== bWeight) return bWeight - aWeight
      // Secondary: incomplete tasks (more = first)
      const aRemaining = a.tasks.filter(t => !t.done).length
      const bRemaining = b.tasks.filter(t => !t.done).length
      if (bRemaining !== aRemaining) return bRemaining - aRemaining
      // Tertiary: total tasks
      return b.tasks.length - a.tasks.length
    })
  }, [punchData])

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

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0)
  const totalDone = projects.reduce((sum, p) => sum + p.tasks.filter(t => t.done).length, 0)
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
          borderTop: `1px solid ${HUD.panelBorder}`,
          borderLeft: '1px solid rgba(100,180,255,0.06)',
          borderRight: '1px solid rgba(100,180,255,0.06)',
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
          minHeight: isMobile ? 56 : 100,
          position: 'relative',
          zIndex: 1,
          padding: isMobile ? 0 : '8px 0',
        }}>
          {/* Left: Agent plumbob portraits */}
          {!isMobile && (
            <AgentRoster agentStatus={agentStatus} onAgentClick={onAgentClick} />
          )}

          {/* Divider */}
          {!isMobile && (
            <div style={{ width: 1, height: 36, background: HUD.divider, flexShrink: 0 }} />
          )}

          {/* Center: Project cards (flex-wrap, VEGAS sizing) */}
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
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
                <Loader2 size={16} style={{ color: HUD.textMuted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, color: HUD.textMuted }}>
                  Loading...
                </span>
              </div>
            ) : projects.length === 0 ? (
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, color: HUD.textMuted, padding: '0 8px' }}>
                No task data
              </span>
            ) : (
              projects.map(project => (
                <ProjectCard
                  key={project.section}
                  project={project}
                  isExpanded={expandedProject?.section === project.section}
                  onClick={() => {
                    setExpandedProject(
                      expandedProject?.section === project.section ? null : project
                    )
                  }}
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

          {/* Divider before chat */}
          <div style={{ width: 1, height: 36, background: HUD.divider, flexShrink: 0 }} />

          {/* Right: Integrated chat input */}
          <HUDChatInput
            chatAgent={chatAgent}
            agentStatus={agentStatus}
            onChatSubmit={onChatSubmit}
            onExpandChat={onExpandChat}
            isMobile={isMobile}
          />
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
      `}</style>
    </div>
  )
}
