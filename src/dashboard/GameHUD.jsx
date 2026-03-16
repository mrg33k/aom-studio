// Corner: Game HUD v2 (Sims x Chaart x Indie Game)
// Warm panel at bottom. Shaped like furniture, not a toolbar.
// Agent portraits with status rings. Project cards with progress.
// Expandable task drawer. Feels like it belongs in the game world.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp, ChevronDown, Check, Circle, AlertTriangle,
  Activity, Pause, Eye, Clock, Zap, Users, FolderKanban,
  LayoutGrid, X, Loader2, CheckCircle2, Timer, Flame,
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

// ---- AGENT PORTRAIT (Sims-style, bigger, with status ring) ------------------
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

function AgentPortrait({ slug, size = 28, status = 'IDLE', onClick, showName = false }) {
  const agent = AGENTS.find(a => a.slug === slug)
  const cfg = STATUS_DOT[status] || STATUS_DOT.IDLE
  const color = agent?.color || '#6B5E52'
  const isActive = status === 'WORKING'
  const isBlocked = status === 'BLOCKED'
  const hasSpriteFile = slug && SPRITE_AGENTS.includes(slug)
  const innerSize = size - 6
  const circumference = Math.PI * (size - 3)

  return (
    <motion.div
      onClick={() => onClick?.(slug)}
      whileHover={{ scale: 1.12, y: -2 }}
      whileTap={{ scale: 0.95 }}
      title={`${agent?.name || slug}: ${cfg.label}`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Glow behind portrait for active agents */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: -4,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          animation: 'hudPortraitGlow 2s ease-in-out infinite',
        }} />
      )}

      {/* Status ring (SVG) */}
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        <circle
          cx={size/2} cy={size/2} r={size/2 - 1.5}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={2}
        />
        <circle
          cx={size/2} cy={size/2} r={size/2 - 1.5}
          fill="none"
          stroke={cfg.ring}
          strokeWidth={isActive ? 2.5 : 2}
          strokeLinecap="round"
          strokeDasharray={isActive ? `${circumference}` : `${circumference * 0.75} ${circumference * 0.25}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{
            filter: isActive ? `drop-shadow(0 0 4px ${cfg.glow})` : 'none',
            transition: 'all 300ms ease',
          }}
        />
      </svg>

      {/* Portrait circle */}
      <div style={{
        position: 'absolute',
        inset: 3,
        borderRadius: '50%',
        overflow: 'hidden',
        background: `${color}15`,
        border: `1px solid ${color}20`,
      }}>
        {hasSpriteFile ? (
          <img
            src={`/corner/sprites/${slug}-idle.png`}
            alt=""
            style={{
              width: innerSize * 2,
              height: innerSize * 2,
              objectFit: 'cover',
              objectPosition: '20% 8%',
              imageRendering: 'pixelated',
              display: 'block',
              marginLeft: -innerSize * 0.25,
              marginTop: -innerSize * 0.05,
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.max(10, size * 0.35), fontWeight: 700,
            color, fontFamily: 'Space Grotesk, sans-serif',
          }}>
            {agent?.name?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* Blocked badge */}
      {isBlocked && (
        <div style={{
          position: 'absolute', top: -2, right: -2,
          width: 11, height: 11, borderRadius: '50%',
          background: '#EF4444', border: '2px solid #120E0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 6px rgba(239,68,68,0.5)',
        }}>
          <X size={6} color="#FFF" strokeWidth={3} />
        </div>
      )}
    </motion.div>
  )
}

// ---- AGENT ROSTER (horizontal strip, Sims-style portraits) ------------------
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
      display: 'flex', gap: 5, alignItems: 'center',
      padding: '0 4px',
    }}>
      {sortedAgents.map(agent => (
        <AgentPortrait
          key={agent.slug}
          slug={agent.slug}
          size={34}
          status={agentStatus?.[agent.slug]?.status || 'IDLE'}
          onClick={onAgentClick}
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
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 36, padding: '0 14px',
        background: isExpanded
          ? `linear-gradient(135deg, ${project.color}18, ${project.color}08)`
          : isToday
            ? 'rgba(232, 93, 38, 0.06)'
            : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isExpanded ? `${project.color}45` : isToday ? 'rgba(232, 93, 38, 0.15)' : 'rgba(255,183,77,0.06)'}`,
        borderRadius: 6,
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
        background: allDone
          ? `linear-gradient(90deg, ${project.color}60, ${project.color})`
          : `linear-gradient(90deg, ${project.color}60, ${project.color})`,
        transition: 'width 500ms ease',
      }} />

      {/* Subtle side accent for Today */}
      {isToday && (
        <div style={{
          position: 'absolute', left: 0, top: 4, bottom: 4,
          width: 2, borderRadius: 1,
          background: project.color,
          boxShadow: `0 0 6px ${project.color}66`,
        }} />
      )}

      {/* Project indicator */}
      {isToday ? (
        <Flame size={13} color={project.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 3px ${project.color}66)` }} />
      ) : (
        <div style={{
          width: 7, height: 7, borderRadius: 2,
          background: allDone ? `${project.color}60` : project.color,
          boxShadow: allDone ? 'none' : `0 0 6px ${project.color}44`,
          flexShrink: 0,
        }} />
      )}

      {/* Name */}
      <span style={{
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: 12, fontWeight: isToday ? 700 : 600,
        color: isExpanded ? HUD.textPrimary : isToday ? '#F0ECE6' : HUD.textSecondary,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}>
        {project.name}
      </span>

      {/* Task count */}
      {remaining > 0 && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, fontWeight: 700,
          color: project.color,
          background: `${project.color}12`,
          padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {remaining}
        </span>
      )}

      {/* All done: show filled progress bar instead of confusing icon */}
      {allDone && (
        <Check size={12} color={project.color} strokeWidth={3} style={{ flexShrink: 0, opacity: 0.6 }} />
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

            {/* Agent badge (simplified for task list) */}
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

// ---- STATS CLUSTER (right side, game-style readouts) ------------------------
function StatsCluster({ agentStatus, throughput, overallProgress, totalTasks, totalDone }) {
  const working = throughput?.working || Object.values(agentStatus || {}).filter(a => a?.status === 'WORKING').length
  const blocked = throughput?.blocked || Object.values(agentStatus || {}).filter(a => a?.status === 'BLOCKED').length
  const done = throughput?.doneToday || Object.values(agentStatus || {}).filter(a => a?.status === 'DONE').length

  const timeStr = new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/Phoenix', hour: 'numeric', minute: '2-digit', hour12: true,
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Agent activity counts */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${HUD.divider}`,
        borderRadius: 6,
        padding: '4px 10px',
        letterSpacing: '0.02em',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 4px rgba(34,197,94,0.4)' }} />
          <span style={{ color: '#22C55E' }}>{working}</span>
        </div>

        {blocked > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 4px rgba(239,68,68,0.4)' }} />
            <span style={{ color: '#EF4444' }}>{blocked}</span>
          </div>
        )}

        {done > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 4px rgba(59,130,246,0.3)' }} />
            <span style={{ color: '#3B82F6' }}>{done}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: HUD.divider, flexShrink: 0 }} />

      {/* Time */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
        color: HUD.textMuted,
        letterSpacing: '0.02em',
      }}>
        {timeStr}
      </span>

      {/* Overall progress ring */}
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <svg width={36} height={36} viewBox="0 0 36 36">
          {/* Background track */}
          <circle
            cx={18} cy={18} r={14}
            fill="none"
            stroke="rgba(255,183,77,0.06)"
            strokeWidth={3}
          />
          {/* Progress arc */}
          <circle
            cx={18} cy={18} r={14}
            fill="none"
            stroke={HUD.accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${overallProgress * 0.88} 88`}
            transform="rotate(-90 18 18)"
            style={{
              transition: 'stroke-dasharray 600ms ease',
              filter: `drop-shadow(0 0 4px ${HUD.accentGlow})`,
            }}
          />
        </svg>
        {/* Center value */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 800,
          color: HUD.accent,
        }}>
          {overallProgress}
        </div>
      </div>
    </div>
  )
}

// ---- MAIN HUD ---------------------------------------------------------------
export default function GameHUD({ agentStatus, throughput, onAgentClick, isMobile }) {
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

      {/* The HUD panel */}
      <div style={{
        background: HUD.panelBg,
        backdropFilter: 'blur(24px)',
        borderTop: `1px solid ${HUD.panelBorder}`,
        borderLeft: `1px solid rgba(255,183,77,0.04)`,
        borderRight: `1px solid rgba(255,183,77,0.04)`,
        borderRadius: isMobile ? 0 : '12px 12px 0 0',
        boxShadow: HUD.panelShadow,
        padding: isMobile ? '4px 8px' : '0 22px',
        margin: isMobile ? 0 : '0 8px',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 14,
        height: isMobile ? 50 : 58,
        position: 'relative',
      }}>
        {/* Warm glow overlay at top edge */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          background: HUD.warmOverlay,
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }} />

        {/* Subtle noise texture (game panel feel) */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', overflow: 'hidden' }}>
          <filter id="hudNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hudNoise)" opacity="0.015" style={{ mixBlendMode: 'overlay' }} />
        </svg>

        {/* Left: Agent portraits */}
        {!isMobile && (
          <AgentRoster agentStatus={agentStatus} onAgentClick={onAgentClick} />
        )}

        {/* Divider */}
        {!isMobile && (
          <div style={{ width: 1, height: 28, background: HUD.divider, flexShrink: 0 }} />
        )}

        {/* Center: Project cards */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          maskImage: 'linear-gradient(to right, transparent 0%, black 1%, black 98%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 1%, black 98%, transparent 100%)',
          gap: 7,
          padding: '0 6px',
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

        {/* Divider */}
        {!isMobile && (
          <div style={{ width: 1, height: 28, background: HUD.divider, flexShrink: 0 }} />
        )}

        {/* Right: Stats cluster */}
        <StatsCluster
          agentStatus={agentStatus}
          throughput={throughput}
          overallProgress={overallProgress}
          totalTasks={totalTasks}
          totalDone={totalDone}
        />
      </div>

      {/* HUD animations */}
      <style>{`
        @keyframes hudPortraitGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
        .hud-scroll::-webkit-scrollbar { width: 4px; }
        .hud-scroll::-webkit-scrollbar-track { background: transparent; }
        .hud-scroll::-webkit-scrollbar-thumb { background: rgba(255,183,77,0.1); border-radius: 2px; }
        .hud-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,183,77,0.2); }
      `}</style>
    </div>
  )
}
