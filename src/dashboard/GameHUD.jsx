// Corner: Game HUD (Sims x Modern Dashboard)
// Compact strip at bottom edge. Project pills with progress. Agent status dots.
// Expand on demand for quick task list. Never covers the game.
// Reference 1: The Sims HUD - compact curved panel, iconic buttons, thin control strip
// Reference 2: Chaart dashboard - project cards, progress bars, task checklists
// The baby: 2026, AI-aware, compact, expandable, delightful

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp, ChevronDown, Check, Circle, AlertTriangle,
  Activity, Pause, Eye, Clock, Zap, Users, FolderKanban,
  LayoutGrid, X, Loader2, CheckCircle2, Timer,
} from 'lucide-react'
import { AGENTS, GRID_SPEC } from './gridSpec.js'

// ---- PALETTE (matches GameDashboard) ----------------------------------------
const PALETTE = GRID_SPEC.colorPalette
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// ---- STATUS CONFIG ----------------------------------------------------------
const STATUS_DOT = {
  WORKING:  { color: '#22C55E', glow: 'rgba(34,197,94,0.4)',  label: 'Active' },
  IDLE:     { color: '#4A5568', glow: 'rgba(107,114,128,0.2)', label: 'Idle' },
  BLOCKED:  { color: '#EF4444', glow: 'rgba(239,68,68,0.4)',  label: 'Blocked' },
  DONE:     { color: '#3B82F6', glow: 'rgba(59,130,246,0.3)', label: 'Done' },
  WAITING:  { color: '#F59E0B', glow: 'rgba(245,158,11,0.3)', label: 'Thinking' },
  PAUSED:   { color: '#F97316', glow: 'rgba(249,115,22,0.3)', label: 'Paused' },
}

// ---- PUNCH LIST PARSER (runs client-side) -----------------------------------
function parsePunchList(markdown) {
  if (!markdown) return { projects: [], todayTasks: [] }

  const lines = markdown.split('\n')
  const projects = []
  const todayTasks = []
  let currentSection = ''
  let currentProject = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect section headers
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').trim()

      // Map sections to project groups
      if (currentSection.startsWith('TODAY')) {
        currentProject = { name: 'Today', section: 'today', tasks: [], color: '#E85D26' }
      } else if (currentSection.startsWith('AMBITION')) {
        currentProject = { name: 'Ambition', section: 'ambition', tasks: [], color: '#F59E0B' }
      } else if (currentSection.startsWith('AOM SITE') && currentSection.includes('PHASE 2')) {
        currentProject = { name: 'AOM Phase 2', section: 'aom-phase2', tasks: [], color: '#3B82F6' }
      } else if (currentSection.startsWith('AOM SITE')) {
        currentProject = { name: 'AOM Site', section: 'aom-site', tasks: [], color: '#E85D26' }
      } else if (currentSection.startsWith('GO-TO-MARKET')) {
        currentProject = { name: 'AI Advisory', section: 'gtm', tasks: [], color: '#7C9A72' }
      } else if (currentSection.startsWith('OUTREACH')) {
        currentProject = { name: 'Outreach', section: 'outreach', tasks: [], color: '#EF4444' }
      } else if (currentSection.startsWith('CLIENT DEADLINE')) {
        currentProject = { name: 'Client Deadlines', section: 'deadlines', tasks: [], color: '#F97316' }
      } else if (currentSection.startsWith('INFRASTRUCTURE')) {
        currentProject = { name: 'Infrastructure', section: 'infra', tasks: [], color: '#4CAF50' }
      } else if (currentSection.startsWith('AGENTS')) {
        currentProject = null // skip agent status table
      } else if (currentSection.startsWith('THIS WEEK')) {
        currentProject = { name: 'This Week', section: 'week', tasks: [], color: '#9C27B0' }
      } else {
        currentProject = null
      }

      if (currentProject) {
        projects.push(currentProject)
      }
      continue
    }

    // Parse task lines
    if (currentProject && (trimmed.startsWith('- [') || trimmed.startsWith('| '))) {
      const isDone = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')
      const isCheckbox = trimmed.startsWith('- [')

      if (isCheckbox) {
        // Extract agent from [AgentName] at end
        const agentMatch = trimmed.match(/\[([A-Za-z]+)\s*(?:--|$)/)
        const lastBracket = trimmed.match(/\[([A-Za-z]+)\][\s]*$/)
        let agent = null
        if (lastBracket) {
          const name = lastBracket[1]
          const found = AGENTS.find(a => a.name.toLowerCase() === name.toLowerCase() || a.slug === name.toLowerCase())
          if (found) agent = found.slug
        }
        // Also check for [Patrik], [Ash], etc
        if (!agent && lastBracket) {
          const name = lastBracket[1]
          if (name.toLowerCase() === 'patrik') agent = 'patrik'
          else if (name.toLowerCase() === 'ash') agent = 'ash'
        }

        // Clean the task text
        let text = trimmed
          .replace(/^- \[[ xX]\]\s*/, '')
          .replace(/~~([^~]+)~~/, '$1')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\[([A-Za-z]+(?:\s*(?:--|[+])\s*[^\]]*)?)\]\s*$/, '')
          .replace(/\[([A-Za-z]+)\s*--\s*[^\]]*\]/, '')
          .trim()

        // Truncate long text
        if (text.length > 80) text = text.slice(0, 77) + '...'

        const task = { text, done: isDone, agent, raw: trimmed }
        currentProject.tasks.push(task)

        // Also add to todayTasks if in TODAY section
        if (currentProject.section === 'today' && !isDone) {
          todayTasks.push({ ...task, project: 'Today' })
        }
      }

      // Parse table rows (client deadlines)
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

  // Filter out empty projects and agent-status-only sections
  return {
    projects: projects.filter(p => p.tasks.length > 0),
    todayTasks,
  }
}

// ---- DATA HOOK: fetch punch-list.md -----------------------------------------
function usePunchListData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const endpoint = IS_LOCAL
        ? '/api/local/file?path=punch-list.md'
        : '/api/dashboard/status' // fallback to status API in production
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()

      if (IS_LOCAL && json.content) {
        setData(parsePunchList(json.content))
      } else {
        // Production: build mock project data from agent status
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

// ---- SPRITE AVATAR (compact, for HUD) ----------------------------------------
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

function MiniSprite({ slug, size = 18, borderColor }) {
  const agent = AGENTS.find(a => a.slug === slug)
  const color = borderColor || agent?.color || '#6B7280'
  const hasSpriteFile = slug && SPRITE_AGENTS.includes(slug)

  if (hasSpriteFile) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', border: `1.5px solid ${color}`,
        overflow: 'hidden', flexShrink: 0, background: '#0A0F1E',
      }}>
        <img
          src={`/corner/sprites/${slug}-idle.png`}
          alt=""
          style={{
            width: size * 2, height: size * 2,
            objectFit: 'cover', objectPosition: '15% 5%',
            imageRendering: 'pixelated', display: 'block',
          }}
        />
      </div>
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', border: `1.5px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(7, size * 0.4), fontWeight: 700, color, background: `${color}22`,
      flexShrink: 0,
    }}>
      {agent?.name?.charAt(0) || '?'}
    </div>
  )
}

// ---- AGENT STATUS DOT GRID (Sims-style) -------------------------------------
function AgentDotGrid({ agentStatus, onAgentClick }) {
  // Filter to show only active/working/blocked agents first, then rest
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
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {sortedAgents.map(agent => {
        const status = agentStatus?.[agent.slug]?.status || 'IDLE'
        const cfg = STATUS_DOT[status] || STATUS_DOT.IDLE
        const isActive = status === 'WORKING'
        return (
          <div
            key={agent.slug}
            onClick={() => onAgentClick?.(agent.slug)}
            title={`${agent.name}: ${cfg.label}`}
            style={{
              position: 'relative',
              cursor: 'pointer',
              transition: 'transform 150ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <MiniSprite slug={agent.slug} size={20} borderColor={cfg.color} />
            {/* Pulse ring for working agents */}
            {isActive && (
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                border: `1px solid ${cfg.color}`,
                animation: 'hudDotPulse 2s ease-in-out infinite',
                opacity: 0.5,
              }} />
            )}
            {/* Blocked X indicator */}
            {status === 'BLOCKED' && (
              <div style={{
                position: 'absolute', top: -2, right: -2,
                width: 8, height: 8, borderRadius: '50%',
                background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={5} color="#FFF" strokeWidth={3} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- PROJECT PILL (compact, Sims-style) ------------------------------------
function ProjectPill({ project, isExpanded, onClick }) {
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t => t.done).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const remaining = totalTasks - doneTasks

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 32, padding: '0 12px',
        background: isExpanded ? `${project.color}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isExpanded ? `${project.color}40` : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        flexShrink: 0,
      }}
    >
      {/* Color dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: project.color,
        boxShadow: `0 0 6px ${project.color}66`,
        flexShrink: 0,
      }} />

      {/* Project name */}
      <span style={{
        fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, fontWeight: 600,
        color: isExpanded ? '#F0ECE6' : '#A0A0A0',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>
        {project.name}
      </span>

      {/* Task count badge */}
      {remaining > 0 && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
          color: project.color, background: `${project.color}15`,
          padding: '1px 5px', borderRadius: 8,
          letterSpacing: '0.05em',
        }}>
          {remaining}
        </span>
      )}

      {/* Mini progress bar */}
      <div style={{
        width: 32, height: 3, borderRadius: 2,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          width: `${progress}%`, height: '100%',
          background: project.color,
          borderRadius: 2,
          transition: 'width 300ms ease',
        }} />
      </div>
    </motion.button>
  )
}

// ---- EXPANDED TASK LIST (slides up from HUD) --------------------------------
function TaskPanel({ project, onClose }) {
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t => t.done).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Show incomplete tasks first, then completed
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
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'absolute', bottom: '100%', left: 0, right: 0,
        background: 'rgba(10, 15, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
        maxHeight: 320,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: project.color,
            boxShadow: `0 0 8px ${project.color}66`,
          }} />
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 700,
            color: '#F0ECE6',
          }}>
            {project.name}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
            color: '#6B7280',
          }}>
            {doneTasks}/{totalTasks}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Progress bar */}
          <div style={{
            width: 60, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: project.color, borderRadius: 2,
            }} />
          </div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
            color: project.color,
          }}>
            {progress}%
          </span>

          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6B7280', padding: 2,
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div style={{
        padding: '8px 12px 12px',
        overflowY: 'auto', maxHeight: 260,
      }} className="hud-scroll">
        {sortedTasks.map((task, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '6px 4px',
              borderBottom: i < sortedTasks.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              opacity: task.done ? 0.4 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
              border: task.done ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
              background: task.done ? project.color : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {task.done && <Check size={10} color="#FFF" strokeWidth={3} />}
            </div>

            {/* Task text */}
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 400,
              color: task.done ? '#6B7280' : '#D0CBC4',
              lineHeight: 1.4,
              textDecoration: task.done ? 'line-through' : 'none',
              flex: 1,
            }}>
              {task.text}
            </span>

            {/* Agent badge */}
            {task.agent && (
              <MiniSprite slug={task.agent} size={16} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ---- QUICK STATS (Sims-style money/time display) ----------------------------
function QuickStats({ agentStatus, throughput }) {
  const working = throughput?.working || Object.values(agentStatus || {}).filter(a => a?.status === 'WORKING').length
  const blocked = throughput?.blocked || Object.values(agentStatus || {}).filter(a => a?.status === 'BLOCKED').length
  const done = throughput?.doneToday || Object.values(agentStatus || {}).filter(a => a?.status === 'DONE').length
  const total = AGENTS.filter(a => a.slug !== 'paige' && a.slug !== 'pixel').length

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.05em',
    }}>
      {/* Active count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Activity size={10} color="#22C55E" />
        <span style={{ color: '#22C55E' }}>{working}</span>
      </div>

      {/* Blocked count */}
      {blocked > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={10} color="#EF4444" />
          <span style={{ color: '#EF4444' }}>{blocked}</span>
        </div>
      )}

      {/* Done count */}
      {done > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={10} color="#3B82F6" />
          <span style={{ color: '#3B82F6' }}>{done}</span>
        </div>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)' }} />

      {/* Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Timer size={10} color="#6B7280" />
        <span style={{ color: '#8A847C' }}>
          {new Date().toLocaleTimeString('en-US', { timeZone: 'America/Phoenix', hour: 'numeric', minute: '2-digit', hour12: true })}
        </span>
      </div>
    </div>
  )
}

// ---- MAIN HUD COMPONENT ----------------------------------------------------
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

  // Overall stats
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
      {/* Expanded task panel (slides up above the strip) */}
      <AnimatePresence>
        {expandedProject && (
          <TaskPanel
            key={expandedProject.section}
            project={expandedProject}
            onClose={() => setExpandedProject(null)}
          />
        )}
      </AnimatePresence>

      {/* The HUD strip itself */}
      <div style={{
        background: 'rgba(10, 15, 30, 0.88)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        padding: isMobile ? '6px 10px' : '6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 14,
        height: isMobile ? 44 : 48,
        transition: 'height 200ms ease',
      }}>
        {/* Left section: Agent dot grid */}
        {!isMobile && (
          <AgentDotGrid agentStatus={agentStatus} onAgentClick={onAgentClick} />
        )}

        {/* Divider */}
        {!isMobile && (
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
        )}

        {/* Center: Scrollable project pills */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          maskImage: 'linear-gradient(to right, transparent 0%, black 2%, black 96%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 2%, black 96%, transparent 100%)',
          paddingLeft: 4,
          paddingRight: 4,
        }}>
          <style>{`.hud-pills::-webkit-scrollbar { display: none; }`}</style>
          <div className="hud-pills" style={{
            display: 'flex', gap: 6, alignItems: 'center',
          }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}>
                <Loader2 size={12} style={{ color: '#6B7280', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, color: '#6B7280' }}>
                  Loading tasks...
                </span>
              </div>
            ) : projects.length === 0 ? (
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, color: '#4A5568', padding: '0 8px' }}>
                No punch list data
              </span>
            ) : (
              projects.map(project => (
                <ProjectPill
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
        </div>

        {/* Divider */}
        {!isMobile && (
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
        )}

        {/* Right section: Quick stats */}
        <QuickStats agentStatus={agentStatus} throughput={throughput} />

        {/* Overall progress arc (Sims-style) */}
        {!isMobile && (
          <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }} title={`Overall: ${overallProgress}% complete`}>
            <svg width={28} height={28} viewBox="0 0 28 28">
              {/* Background circle */}
              <circle cx={14} cy={14} r={11} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2.5} />
              {/* Progress arc */}
              <circle
                cx={14} cy={14} r={11}
                fill="none"
                stroke="#E85D26"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={`${overallProgress * 0.69} 69`}
                transform="rotate(-90 14 14)"
                style={{ transition: 'stroke-dasharray 500ms ease' }}
              />
            </svg>
            {/* Center text */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 800,
              color: '#E85D26',
            }}>
              {overallProgress}
            </div>
          </div>
        )}
      </div>

      {/* HUD-specific animations */}
      <style>{`
        @keyframes hudDotPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
