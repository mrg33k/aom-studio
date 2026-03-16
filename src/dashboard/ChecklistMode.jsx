// Corner C3.1: Checklist Mode (GROUPED BY PROJECT)
// Steve's coach fix: group by project, not agent. Reuses GameHUD's parsePunchList.
// Working checkboxes wired. Apple Reminders meets Linear. Clean, typography-driven.

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronDown, Check, Plus, GripVertical,
  LayoutGrid, FolderKanban, Flame, CheckCircle2,
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

        if (currentProject.section === 'today' && !isDone) {
          todayTasks.push({ text, done: isDone, agent, project: 'Today' })
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
  'today':      100,
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

// ---- DATA HOOK for punch-list.md --------------------------------------------
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

  return { data, loading, refetch: fetchData }
}

// ---- PROJECT SIDEBAR (replaces agent sidebar) --------------------------------
function ProjectSidebar({ projects, selectedProject, onSelectProject, isMobile }) {
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
            fontFamily: "'Inter Tight', Space Grotesk, sans-serif", fontSize: 15, fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          <LayoutGrid size={16} />
          All
        </button>

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
                fontFamily: "'Inter Tight', Space Grotesk, sans-serif", fontSize: 15, fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {p.section === 'today' ? <Flame size={14} color={p.color} /> : (
                <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
              )}
              {p.name}
              {remaining > 0 && (
                <span style={{
                  fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
                  fontSize: 14, color: '#FFF', background: p.color,
                  padding: '2px 7px', borderRadius: 8, lineHeight: 1,
                }}>
                  {remaining}
                </span>
              )}
            </button>
          )
        })}
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
          color: '#F0ECE6', fontFamily: "'Inter Tight', Space Grotesk, sans-serif",
          fontSize: 15, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase',
        }}
      >
        <LayoutGrid size={18} style={{ color: '#6B7280' }} />
        All Projects
      </button>

      {/* Individual projects */}
      {projects.map(p => {
        const selected = selectedProject === p.section
        const remaining = p.tasks.filter(t => !t.done).length
        const totalTasks = p.tasks.length
        const doneTasks = totalTasks - remaining
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
        const isToday = p.section === 'today'

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
              color: '#F0ECE6', fontFamily: "'Inter Tight', Space Grotesk, sans-serif",
              fontSize: 15, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase',
              position: 'relative',
            }}
          >
            {isToday ? (
              <Flame size={16} color={p.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 4px ${p.color}66)` }} />
            ) : (
              <div style={{ width: 12, height: 12, borderRadius: 4, background: p.color, flexShrink: 0, boxShadow: `0 0 8px ${p.color}33` }} />
            )}
            <span style={{ flex: 1, letterSpacing: '-0.01em' }}>{p.name}</span>
            {/* Remaining count */}
            {remaining > 0 ? (
              <span style={{
                fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
                fontSize: 13, color: '#FFF', background: p.color,
                padding: '3px 9px', borderRadius: 8, lineHeight: 1,
                boxShadow: `0 2px 6px ${p.color}44`,
                minWidth: 26, textAlign: 'center',
              }}>
                {remaining}
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
    </div>
  )
}

// ---- TASK ITEM CARD (with WORKING checkbox) ---------------------------------
function TaskCard({ task, projectColor, onCheck, index }) {
  const [isHovered, setIsHovered] = useState(false)
  const isDone = task.done

  // Find agent info for badge
  const agentInfo = task.agent ? AGENTS.find(a => a.slug === task.agent) : null
  const hasSpr = task.agent && SPRITE_AGENTS.includes(task.agent)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 16,
          color: isDone ? '#6B7280' : '#F0ECE6',
          lineHeight: 1.45,
          textDecoration: isDone ? 'line-through' : 'none',
        }}>
          {task.text}
        </div>

        {/* Agent badge (if assigned) */}
        {agentInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {hasSpr ? (
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
            ) : null}
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: agentInfo.color,
            }}>
              {agentInfo.name}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---- PROJECT GROUP HEADER ---------------------------------------------------
function ProjectGroupHeader({ project, isCollapsed, onToggle }) {
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t => t.done).length
  const remaining = totalTasks - doneTasks
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const isToday = project.section === 'today'
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
      {isToday ? (
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
        fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif",
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

        {/* Count */}
        {remaining > 0 ? (
          <span style={{
            fontFamily: "'Inter Tight', JetBrains Mono, monospace", fontWeight: 900,
            fontSize: 14, color: '#FFF', background: project.color,
            padding: '3px 10px', borderRadius: 8, lineHeight: 1,
            boxShadow: `0 2px 6px ${project.color}44`,
            minWidth: 28, textAlign: 'center',
          }}>
            {remaining}
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
        fontFamily: "'Inter Tight', Space Grotesk, sans-serif", fontWeight: 800, fontSize: 20,
        color: '#F0ECE6', marginTop: 16, textTransform: 'uppercase',
      }}>
        No Tasks
      </div>
      <div style={{
        fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 14,
        color: '#6B7280', marginTop: 8,
      }}>
        Tasks sync from punch-list.md
      </div>
    </div>
  )
}

// ---- MAIN CHECKLIST MODE COMPONENT -----------------------------------------
export default function ChecklistMode({ agentStatus, isMobile, data }) {
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

  // Sync checkbox state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('corner-checks', JSON.stringify(checkedTasks))
    } catch { /* quota exceeded or private browsing - ignore */ }
  }, [checkedTasks])

  // Fetch punch-list data (grouped by project)
  const { data: punchData, loading } = usePunchListData()
  const conversationScores = useConversationRecency()

  // Sort projects by conversation-driven recency weight
  const projects = useMemo(() => {
    const raw = punchData?.projects || []
    const weights = conversationScores || DEFAULT_RECENCY_WEIGHTS
    return [...raw].sort((a, b) => {
      // Today always first
      if (a.section === 'today') return -1
      if (b.section === 'today') return 1
      const aWeight = weights[a.section] || 10
      const bWeight = weights[b.section] || 10
      if (aWeight !== bWeight) return bWeight - aWeight
      const aRemaining = a.tasks.filter(t => !t.done).length
      const bRemaining = b.tasks.filter(t => !t.done).length
      if (bRemaining !== aRemaining) return bRemaining - aRemaining
      return b.tasks.length - a.tasks.length
    })
  }, [punchData, conversationScores])

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
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 14,
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
            {visibleProjects.length === 0 && <EmptyState />}

            {/* Project groups */}
            {visibleProjects.map(project => {
              const isCollapsed = collapsedProjects[project.section]
              // Apply local check overrides
              const tasks = project.tasks.map(t => ({
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
                      {project.section === 'today' ? (
                        <Flame size={24} color={project.color} style={{ filter: `drop-shadow(0 0 6px ${project.color}66)` }} />
                      ) : (
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: project.color, boxShadow: `0 0 12px ${project.color}44` }} />
                      )}
                      <span style={{
                        fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif",
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
                          index={i}
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
              fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 15,
              color: '#FDF6EC', outline: 'none',
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => e.target.style.borderColor = `${selectedProjectData?.color || '#3B9EFF'}66`}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </form>
      </div>

      <style>{`
        @keyframes checklistDotPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}
