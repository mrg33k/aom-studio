// Corner: Game HUD v3 (Sims x Chaart x Indie Game)
// FIXES from 8/10 review:
//   1. Agent sprites 34px -> 42px with Sims plumbob diamond shape (not plain circle)
//   2. Custom SVG diamond/shield edge shape - MEMORABLE silhouette like Sims green diamond
//   3. Projects: flex-wrap two-row at 1440px instead of hidden off-screen
//   4. Ambient animation: warm border shimmer, active agent pulse
//   5. Chat input INTEGRATED into the HUD strip (right side, not hidden below)

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

// Warm HUD colors (connects to the game world's amber lighting)
const HUD = {
  panelBg: 'rgba(18, 14, 10, 0.94)',
  panelBgSolid: '#120E0A',
  panelBorder: 'rgba(255, 183, 77, 0.18)',
  panelBorderHover: 'rgba(255, 183, 77, 0.3)',
  panelInnerGlow: 'rgba(255, 183, 77, 0.05)',
  panelShadow: '0 -8px 48px rgba(0,0,0,0.6), 0 -2px 0 rgba(255,183,77,0.1), inset 0 1px 0 rgba(255,183,77,0.06)',
  divider: 'rgba(255, 183, 77, 0.08)',
  textPrimary: '#F0ECE6',
  textSecondary: '#A89A8C',
  textMuted: '#6B5E52',
  accent: '#E85D26',
  accentGlow: 'rgba(232, 93, 38, 0.3)',
  warmOverlay: 'linear-gradient(180deg, rgba(255,183,77,0.05) 0%, rgba(255,183,77,0.01) 50%, transparent 100%)',
}

// ---- STATUS CONFIG ----------------------------------------------------------
const STATUS_DOT = {
  WORKING:  { color: '#22C55E', glow: 'rgba(34,197,94,0.5)',  label: 'Active',   ring: '#22C55E' },
  IDLE:     { color: '#6B5E52', glow: 'rgba(107,94,82,0.2)',  label: 'Idle',     ring: '#4A4038' },
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

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').trim()

      if (currentSection.startsWith('TODAY')) {
        currentProject = { name: 'Today', section: 'today', tasks: [], color: '#E85D26', icon: 'flame' }
      } else if (currentSection.startsWith('AMBITION')) {
        currentProject = { name: 'Ambition', section: 'ambition', tasks: [], color: '#F59E0B', icon: 'project' }
      } else if (currentSection.startsWith('AOM SITE') && currentSection.includes('PHASE 2')) {
        currentProject = { name: 'Phase 2', section: 'aom-phase2', tasks: [], color: '#3B82F6', icon: 'project' }
      } else if (currentSection.startsWith('AOM SITE')) {
        currentProject = { name: 'AOM Site', section: 'aom-site', tasks: [], color: '#E85D26', icon: 'project' }
      } else if (currentSection.startsWith('GO-TO-MARKET')) {
        currentProject = { name: 'Advisory', section: 'gtm', tasks: [], color: '#7C9A72', icon: 'project' }
      } else if (currentSection.startsWith('OUTREACH')) {
        currentProject = { name: 'Outreach', section: 'outreach', tasks: [], color: '#EF4444', icon: 'project' }
      } else if (currentSection.startsWith('CLIENT DEADLINE')) {
        currentProject = { name: 'Deadlines', section: 'deadlines', tasks: [], color: '#F97316', icon: 'project' }
      } else if (currentSection.startsWith('INFRASTRUCTURE')) {
        currentProject = { name: 'Infra', section: 'infra', tasks: [], color: '#4CAF50', icon: 'project' }
      } else if (currentSection.startsWith('AGENTS')) {
        currentProject = null
      } else if (currentSection.startsWith('THIS WEEK')) {
        currentProject = { name: 'This Week', section: 'week', tasks: [], color: '#9C27B0', icon: 'project' }
      } else {
        currentProject = null
      }

      if (currentProject) projects.push(currentProject)
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
// This is THE silhouette. A pointed diamond/shield shape at the top,
// rounded at the bottom. Instantly recognizable as "agent portrait."
function PlumbobClipDef({ id, size }) {
  // Shield/plumbob: pointed top, rounded bottom
  const w = size
  const h = size
  const cx = w / 2
  const topPoint = h * 0.02       // sharp point at top
  const shoulderY = h * 0.22      // where the diamond widens
  const maxWidth = w * 0.48       // half-width at widest
  const bottomRadius = w * 0.42   // round bottom arc radius
  const bottomY = h * 0.72        // where the bottom curve starts

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

// ---- AGENT PORTRAIT (Sims plumbob shape, 42px, with status ring) ------------
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

function AgentPortrait({ slug, size = 42, status = 'IDLE', onClick, showName = false, index = 0 }) {
  const agent = AGENTS.find(a => a.slug === slug)
  const cfg = STATUS_DOT[status] || STATUS_DOT.IDLE
  const color = agent?.color || '#6B5E52'
  const isActive = status === 'WORKING'
  const isBlocked = status === 'BLOCKED'
  const hasSpriteFile = slug && SPRITE_AGENTS.includes(slug)
  const clipId = `plumbob-clip-${slug}`

  // For the plumbob outline path (matches clip but as stroke)
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
      whileHover={{ scale: 1.18, y: -4, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
      whileTap={{ scale: 0.9, y: 1, transition: { type: 'spring', stiffness: 600, damping: 20 } }}
      title={`${agent?.name || slug}: ${cfg.label}`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Active agent glow - pulses warm */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: -6,
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
              fontSize={size * 0.38}
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
            filter: isActive ? `drop-shadow(0 0 5px ${cfg.glow})` : 'none',
            transition: 'all 300ms ease',
          }}
        />

        {/* Inner highlight stroke for depth */}
        <path
          d={outlinePath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
          strokeLinejoin="round"
          transform={`translate(0.5, 0.5) scale(${(size - 1) / size})`}
          style={{ transformOrigin: 'center' }}
        />
      </svg>

      {/* Status dot at bottom center */}
      <div style={{
        position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
        width: 8, height: 8, borderRadius: '50%',
        background: cfg.color,
        border: '2px solid #120E0A',
        boxShadow: `0 0 6px ${cfg.glow}`,
        animation: isActive ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
      }} />

      {/* Blocked X badge */}
      {isBlocked && (
        <div style={{
          position: 'absolute', top: -1, right: -1,
          width: 13, height: 13, borderRadius: '50%',
          background: '#EF4444', border: '2px solid #120E0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 6px rgba(239,68,68,0.5)',
        }}>
          <X size={7} color="#FFF" strokeWidth={3} />
        </div>
      )}
    </motion.div>
  )
}

// ---- AGENT ROSTER (horizontal strip, plumbob portraits, stagger entrance) ----
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
      display: 'flex', gap: 4, alignItems: 'center',
      padding: '0 2px',
    }}>
      {sortedAgents.map((agent, i) => (
        <AgentPortrait
          key={agent.slug}
          slug={agent.slug}
          size={42}
          status={agentStatus?.[agent.slug]?.status || 'IDLE'}
          onClick={onAgentClick}
          index={i}
        />
      ))}
    </div>
  )
}

// ---- PROJECT CARD (game-style button, not a generic pill) -------------------
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
      whileHover={{ scale: 1.06, y: -3, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
      whileTap={{ scale: 0.93, y: 1, transition: { type: 'spring', stiffness: 600, damping: 20 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 28, padding: '0 10px',
        background: isExpanded
          ? `linear-gradient(135deg, ${project.color}18, ${project.color}08)`
          : isToday
            ? 'rgba(232, 93, 38, 0.06)'
            : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isExpanded ? `${project.color}45` : isToday ? 'rgba(232, 93, 38, 0.15)' : 'rgba(255,183,77,0.06)'}`,
        borderRadius: 5,
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 200ms ease',
      }}
    >
      {/* Bottom progress fill */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: `${progress}%`, height: 2,
        background: `linear-gradient(90deg, ${project.color}60, ${project.color})`,
        transition: 'width 500ms ease',
      }} />

      {/* Side accent for Today */}
      {isToday && (
        <div style={{
          position: 'absolute', left: 0, top: 3, bottom: 3,
          width: 2, borderRadius: 1,
          background: project.color,
          boxShadow: `0 0 6px ${project.color}66`,
        }} />
      )}

      {/* Project indicator */}
      {isToday ? (
        <Flame size={11} color={project.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 3px ${project.color}66)` }} />
      ) : (
        <div style={{
          width: 6, height: 6, borderRadius: 2,
          background: allDone ? `${project.color}60` : project.color,
          boxShadow: allDone ? 'none' : `0 0 6px ${project.color}44`,
          flexShrink: 0,
        }} />
      )}

      {/* Name */}
      <span style={{
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: 11, fontWeight: isToday ? 700 : 600,
        color: isExpanded ? HUD.textPrimary : isToday ? '#F0ECE6' : HUD.textSecondary,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}>
        {project.name}
      </span>

      {/* Task count badge */}
      {remaining > 0 && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, fontWeight: 700,
          color: project.color,
          background: `${project.color}12`,
          padding: '1px 5px', borderRadius: 3,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {remaining}
        </span>
      )}

      {allDone && (
        <Check size={10} color={project.color} strokeWidth={3} style={{ flexShrink: 0, opacity: 0.6 }} />
      )}
    </motion.button>
  )
}

// ---- EXPANDED TASK PANEL (warm, game-styled) --------------------------------
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
        borderRadius: '10px 10px 0 0',
        overflow: 'hidden',
        maxHeight: 340,
        boxShadow: '0 -12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,183,77,0.06)',
      }}
    >
      {/* Warm inner glow at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 40,
        background: 'linear-gradient(180deg, rgba(255,183,77,0.04) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px 10px',
        borderBottom: `1px solid ${HUD.divider}`,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: 3,
            background: project.color,
            boxShadow: `0 0 10px ${project.color}44`,
          }} />
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, fontWeight: 700,
            color: HUD.textPrimary,
          }}>
            {project.name}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
            color: HUD.textMuted,
          }}>
            {doneTasks}/{totalTasks}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Progress bar */}
          <div style={{
            width: 80, height: 5, borderRadius: 3,
            background: 'rgba(255,255,255,0.06)',
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
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
            color: project.color,
            minWidth: 28,
          }}>
            {progress}%
          </span>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${HUD.divider}`,
              borderRadius: 4, cursor: 'pointer',
              color: HUD.textMuted, padding: '3px 3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = HUD.textSecondary }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = HUD.textMuted }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div style={{
        padding: '6px 14px 14px',
        overflowY: 'auto', maxHeight: 270,
      }} className="hud-scroll">
        {sortedTasks.map((task, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.15 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 6px',
              borderBottom: i < sortedTasks.length - 1 ? `1px solid ${HUD.divider}` : 'none',
              opacity: task.done ? 0.35 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
              border: task.done ? 'none' : `1.5px solid rgba(255,183,77,0.15)`,
              background: task.done ? project.color : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}>
              {task.done && <Check size={11} color="#FFF" strokeWidth={3} />}
            </div>

            {/* Task text */}
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 400,
              color: task.done ? HUD.textMuted : HUD.textSecondary,
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
                  width: 22, height: 22, borderRadius: '50%',
                  border: `1.5px solid ${a?.color || '#6B5E52'}`,
                  overflow: 'hidden', flexShrink: 0,
                  background: `${a?.color || '#6B5E52'}15`,
                }} title={a?.name || task.agent}>
                  {hasSpr ? (
                    <img
                      src={`/corner/sprites/${task.agent}-idle.png`}
                      alt=""
                      style={{
                        width: 36, height: 36,
                        objectFit: 'cover', objectPosition: '20% 8%',
                        imageRendering: 'pixelated', display: 'block',
                        marginLeft: -5, marginTop: -2,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: a?.color || '#6B5E52',
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

// ---- COMPACT STATS (inline, no box) -----------------------------------------
function CompactStats({ agentStatus, throughput, overallProgress }) {
  const working = throughput?.working || Object.values(agentStatus || {}).filter(a => a?.status === 'WORKING').length
  const blocked = throughput?.blocked || Object.values(agentStatus || {}).filter(a => a?.status === 'BLOCKED').length

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 4px rgba(34,197,94,0.4)' }} />
        <span style={{ color: '#22C55E' }}>{working}</span>
      </div>
      {blocked > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 4px rgba(239,68,68,0.4)' }} />
          <span style={{ color: '#EF4444' }}>{blocked}</span>
        </div>
      )}
      {/* Mini progress ring */}
      <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
        <svg width={28} height={28} viewBox="0 0 28 28">
          <circle cx={14} cy={14} r={10} fill="none" stroke="rgba(255,183,77,0.06)" strokeWidth={2.5} />
          <circle
            cx={14} cy={14} r={10}
            fill="none" stroke={HUD.accent} strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${overallProgress * 0.628} 62.8`}
            transform="rotate(-90 14 14)"
            style={{ transition: 'stroke-dasharray 600ms ease', filter: `drop-shadow(0 0 3px ${HUD.accentGlow})` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 800, color: HUD.accent,
        }}>
          {overallProgress}
        </div>
      </div>
    </div>
  )
}

// ---- INLINE CHAT INPUT (integrated into HUD strip) --------------------------
function HUDChatInput({ chatAgent, agentStatus, onChatSubmit, onExpandChat, isMobile }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const currentAgent = chatAgent
    ? AGENTS.find(a => a.slug === chatAgent)
    : AGENTS.find(a => a.slug === 'elon')
  const agentSlug = currentAgent?.slug || 'elon'
  const agentColor = currentAgent?.color || '#E85D26'
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)

  const handleSubmit = (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    onChatSubmit?.(agentSlug, text)
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      flexShrink: 0,
      minWidth: isMobile ? 0 : 220,
      maxWidth: isMobile ? '100%' : 320,
    }}>
      {/* Agent plumbob mini portrait */}
      <div
        onClick={() => onExpandChat?.()}
        style={{
          width: 30, height: 30, flexShrink: 0,
          cursor: 'pointer', position: 'relative',
        }}
        title={`Chat with ${currentAgent?.name}`}
      >
        <svg width={30} height={30} viewBox="0 0 30 30">
          <PlumbobClipDef id="chat-plumbob-clip" size={30} />
          <path
            d={`M 15 ${30*0.02} L ${15+30*0.48} ${30*0.22} L ${15+30*0.48} ${30*0.72} Q ${15+30*0.48} ${30*0.98}, 15 ${30*0.98} Q ${15-30*0.48} ${30*0.98}, ${15-30*0.48} ${30*0.72} L ${15-30*0.48} ${30*0.22} Z`}
            fill={`${agentColor}25`}
          />
          {hasSpriteFile ? (
            <image
              href={`/corner/sprites/${agentSlug}-idle.png`}
              x={-4} y={-1}
              width={40} height={40}
              clipPath="url(#chat-plumbob-clip)"
              style={{ imageRendering: 'pixelated' }}
              preserveAspectRatio="xMidYMin slice"
            />
          ) : (
            <text x={15} y={18} textAnchor="middle" dominantBaseline="middle"
              fill={agentColor} fontFamily="Space Grotesk, sans-serif"
              fontWeight="700" fontSize={12}>
              {currentAgent?.name?.charAt(0) || '?'}
            </text>
          )}
          <path
            d={`M 15 ${30*0.02} L ${15+30*0.48} ${30*0.22} L ${15+30*0.48} ${30*0.72} Q ${15+30*0.48} ${30*0.98}, 15 ${30*0.98} Q ${15-30*0.48} ${30*0.98}, ${15-30*0.48} ${30*0.72} L ${15-30*0.48} ${30*0.22} Z`}
            fill="none" stroke={agentColor} strokeWidth={1.5} strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Text input */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={isMobile ? 'Message...' : `Message ${currentAgent?.name}...`}
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid rgba(255,183,77,0.08)`,
          borderRadius: 8,
          height: 32,
          padding: '0 12px',
          color: HUD.textPrimary,
          fontSize: 13,
          fontFamily: 'Space Grotesk, sans-serif',
          outline: 'none',
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          minWidth: 0,
        }}
        onFocus={e => {
          e.target.style.borderColor = `${agentColor}55`
          e.target.style.boxShadow = `0 0 0 2px ${agentColor}12`
        }}
        onBlur={e => {
          e.target.style.borderColor = 'rgba(255,183,77,0.08)'
          e.target.style.boxShadow = 'none'
        }}
      />

      {/* Send button */}
      <button
        type="submit"
        disabled={!input.trim()}
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: input.trim() ? agentColor : 'rgba(255,255,255,0.04)',
          color: input.trim() ? '#FDF6EC' : HUD.textMuted,
          border: input.trim() ? 'none' : `1px solid ${HUD.divider}`,
          cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms ease',
          flexShrink: 0,
          opacity: input.trim() ? 1 : 0.5,
        }}
      >
        <Send size={13} style={{ marginLeft: 1 }} />
      </button>

      {/* Expand chat button */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => onExpandChat?.()}
          style={{
            width: 26, height: 26,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${HUD.divider}`,
            borderRadius: 4,
            cursor: 'pointer',
            color: HUD.textMuted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = HUD.textSecondary; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.color = HUD.textMuted; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          title="Expand chat"
        >
          <ChevronUp size={13} />
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

  const projects = punchData?.projects || []

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

      {/* The HUD panel - distinctive Sims silhouette shape */}
      <div
        className="hud-panel-shimmer"
        style={{
          background: HUD.panelBg,
          backdropFilter: 'blur(24px)',
          borderTop: `1px solid ${HUD.panelBorder}`,
          borderLeft: `1px solid rgba(255,183,77,0.04)`,
          borderRight: `1px solid rgba(255,183,77,0.04)`,
          // Distinctive tab shape: wider top corners like a Sims panel
          borderRadius: isMobile ? 0 : '16px 16px 0 0',
          boxShadow: HUD.panelShadow,
          padding: isMobile ? '4px 8px' : '0 16px',
          margin: isMobile ? 0 : '0 8px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Warm glow overlay at top edge */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          background: HUD.warmOverlay,
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }} />

        {/* Ambient shimmer on top border */}
        <div className="hud-border-shimmer" style={{
          position: 'absolute', top: -1, left: 20, right: 20, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,183,77,0.3) 25%, rgba(255,220,150,0.5) 50%, rgba(255,183,77,0.3) 75%, transparent 100%)',
          backgroundSize: '200% 100%',
          borderRadius: 1,
          pointerEvents: 'none',
        }} />

        {/* Subtle noise texture */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', overflow: 'hidden' }}>
          <filter id="hudNoise3">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hudNoise3)" opacity="0.015" style={{ mixBlendMode: 'overlay' }} />
        </svg>

        {/* Main row: Agents | Projects + Stats | Chat */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 12,
          height: isMobile ? 50 : 56,
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Left: Agent plumbob portraits */}
          {!isMobile && (
            <AgentRoster agentStatus={agentStatus} onAgentClick={onAgentClick} />
          )}

          {/* Divider */}
          {!isMobile && (
            <div style={{ width: 1, height: 28, background: HUD.divider, flexShrink: 0 }} />
          )}

          {/* Center: Project cards (flex-wrap for two rows at 1440px) */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 4,
            padding: '2px 4px',
            maxHeight: 64,
            overflow: 'hidden',
            alignContent: 'center',
          }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
                <Loader2 size={14} style={{ color: HUD.textMuted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, color: HUD.textMuted }}>
                  Loading...
                </span>
              </div>
            ) : projects.length === 0 ? (
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, color: HUD.textMuted, padding: '0 8px' }}>
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
          <div style={{ width: 1, height: 28, background: HUD.divider, flexShrink: 0 }} />

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

      {/* HUD animations */}
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
          border-top-color: rgba(255, 183, 77, 0.28);
        }
        .hud-scroll::-webkit-scrollbar { width: 4px; }
        .hud-scroll::-webkit-scrollbar-track { background: transparent; }
        .hud-scroll::-webkit-scrollbar-thumb { background: rgba(255,183,77,0.1); border-radius: 2px; }
        .hud-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,183,77,0.2); }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
