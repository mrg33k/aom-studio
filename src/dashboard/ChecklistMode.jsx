// Corner C3: Checklist Mode
// Per-agent draggable task list. The workhorse mode.
// Design: Steffen's c3-checklist-mode-spec.md
// Apple Reminders meets Linear. Clean, typography-driven.

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronDown, Check, Plus, GripVertical,
  LayoutGrid,
} from 'lucide-react'
import { AGENTS } from './gridSpec.js'

// Sprite avatar (duplicated here to avoid circular imports, small component)
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

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
      fontSize: Math.max(8, size * 0.35), fontWeight: 700, color, background: `${color}33`,
      flexShrink: 0, ...extraStyle,
    }}>
      {agent?.name?.charAt(0) || '?'}
    </div>
  )
}

// Status pill colors
const STATUS_COLORS = {
  in_progress: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'ACTIVE' },
  pending: { bg: 'rgba(107,114,128,0.15)', text: '#6B7280', label: 'QUEUED' },
  blocked: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'BLOCKED' },
  done: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'DONE' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

// Agent Selector Sidebar
function AgentSelector({ agents, selectedAgent, onSelectAgent, agentStatus, isMobile }) {
  const allAgents = agents.filter(a => a.slug !== 'paige' && a.slug !== 'pixel')

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
        {/* All Agents chip */}
        <button
          onClick={() => onSelectAgent(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 40, padding: '0 12px',
            background: !selectedAgent ? 'rgba(232,93,38,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${!selectedAgent ? 'rgba(232,93,38,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
            cursor: 'pointer', scrollSnapAlign: 'start',
            color: !selectedAgent ? '#E85D26' : '#F0ECE6',
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 500,
          }}
        >
          <LayoutGrid size={16} />
          All
        </button>

        {allAgents.map(a => {
          const selected = selectedAgent === a.slug
          return (
            <button
              key={a.slug}
              onClick={() => onSelectAgent(a.slug)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 40, padding: '0 12px',
                background: selected ? `${a.color}1F` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected ? `${a.color}4D` : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
                cursor: 'pointer', scrollSnapAlign: 'start',
                color: selected ? a.color : '#F0ECE6',
                fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 500,
              }}
            >
              <SpriteAvatar agentSlug={a.slug} size={24} borderColor={a.color} />
              {a.name}
            </button>
          )
        })}
      </div>
    )
  }

  // Desktop sidebar
  return (
    <div style={{
      width: 220, flexShrink: 0, height: '100%',
      background: 'rgba(10, 15, 30, 0.5)',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      padding: '16px 0', overflowY: 'auto',
    }}>
      {/* Section label */}
      <div style={{
        padding: '0 16px', marginBottom: 12,
        fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
        color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.15em',
      }}>
        AGENTS
      </div>

      {/* All Agents option */}
      <button
        onClick={() => onSelectAgent(null)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          height: 40, padding: !selectedAgent ? '0 13px' : '0 16px',
          background: !selectedAgent ? 'rgba(255,255,255,0.06)' : 'transparent',
          borderLeft: !selectedAgent ? '3px solid #E85D26' : '3px solid transparent',
          border: 'none', borderBottom: 'none', borderTop: 'none', borderRight: 'none',
          borderLeftWidth: 3, borderLeftStyle: 'solid',
          borderLeftColor: !selectedAgent ? '#E85D26' : 'transparent',
          cursor: 'pointer', transition: 'background 100ms ease',
          color: '#F0ECE6', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 500,
          textAlign: 'left',
        }}
      >
        <LayoutGrid size={16} style={{ color: '#6B7280' }} />
        All Agents
      </button>

      {/* Individual agents */}
      {allAgents.map(a => {
        const selected = selectedAgent === a.slug
        const status = agentStatus?.[a.slug]
        const isActive = status?.status === 'WORKING'
        return (
          <button
            key={a.slug}
            onClick={() => onSelectAgent(a.slug)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              height: 40, padding: selected ? '0 13px' : '0 16px',
              background: selected ? 'rgba(255,255,255,0.06)' : 'transparent',
              borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none',
              borderLeftWidth: 3, borderLeftStyle: 'solid',
              borderLeftColor: selected ? a.color : 'transparent',
              cursor: 'pointer', transition: 'background 100ms ease',
              color: '#F0ECE6', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 500,
              textAlign: 'left',
            }}
          >
            <SpriteAvatar agentSlug={a.slug} size={28} borderColor={a.color} />
            <span style={{ flex: 1 }}>{a.name}</span>
            {/* Status dot */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isActive ? a.color : '#6B7280',
              flexShrink: 0,
            }}>
              {isActive && (
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: a.color,
                  animation: 'checklistDotPulse 1.5s ease-in-out infinite',
                }} />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Task Item Card
function TaskCard({ task, isTop, agentColor, onCheck, index }) {
  const [isHovered, setIsHovered] = useState(false)
  const status = STATUS_COLORS[task.status] || STATUS_COLORS.pending
  const isDone = task.status === 'done'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        minHeight: 52,
        background: isDone
          ? 'rgba(255,255,255,0.01)'
          : isTop
            ? `${agentColor}08`
            : isHovered
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
        borderLeft: isTop && !isDone ? `3px solid ${agentColor}` : undefined,
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 6,
        display: 'flex', alignItems: 'flex-start', gap: 12,
        cursor: 'default',
        transition: 'background 100ms ease, border-color 100ms ease',
      }}
    >
      {/* Drag handle (visible on hover) */}
      <div style={{
        opacity: isHovered ? 0.5 : 0,
        transition: 'opacity 100ms ease',
        cursor: 'grab',
        display: 'flex', flexDirection: 'column', gap: 2,
        paddingTop: 4,
      }}>
        <GripVertical size={14} color="#4A5568" />
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onCheck?.(task.id)}
        style={{
          width: 18, height: 18, flexShrink: 0,
          border: `2px solid ${isDone ? agentColor : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 4,
          background: isDone ? agentColor : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 200ms ease',
          marginTop: 2,
        }}
      >
        {isDone && <Check size={12} color="#FDF6EC" />}
      </button>

      {/* Task text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 15,
          color: isDone ? '#6B7280' : '#F0ECE6',
          lineHeight: 1.45,
          textDecoration: isDone ? 'line-through' : 'none',
        }}>
          {task.text}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          {/* Status pill (only on top item or always if done) */}
          {(isTop || isDone) && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: status.text, background: status.bg,
              padding: '2px 8px', borderRadius: 3,
            }}>
              {status.label}
            </span>
          )}

          {/* Agent name (when viewing All) */}
          {task.agentName && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: task.agentColor || '#6B7280',
            }}>
              {task.agentName}
            </span>
          )}

          {/* Timestamp (on hover or done) */}
          {(isHovered || isDone) && task.time && (
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 11,
              color: '#6B7280', marginLeft: 'auto',
            }}>
              {timeAgo(task.time)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Empty State
function EmptyState({ agent }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      {agent && <SpriteAvatar agentSlug={agent.slug} size={64} borderColor={agent.color} style={{ margin: '0 auto' }} />}
      <div style={{
        fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 18,
        color: '#F0ECE6', marginTop: 16,
      }}>
        {agent?.name || 'All Agents'}
      </div>
      <div style={{
        fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 14,
        color: '#6B7280', marginTop: 8,
      }}>
        No tasks yet. Type one below.
      </div>
    </div>
  )
}

// Main Checklist Mode Component
export default function ChecklistMode({ agentStatus, isMobile, data }) {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showDone, setShowDone] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
  const inputRef = useRef(null)

  // Generate tasks from agent data
  const agent = selectedAgent ? AGENTS.find(a => a.slug === selectedAgent) : null
  const agentColor = agent?.color || '#E85D26'

  // Build task list from dashboard data
  const allTasks = []
  if (data?.agents) {
    for (const a of data.agents) {
      if (selectedAgent && a.slug !== selectedAgent) continue
      const agentInfo = AGENTS.find(ag => ag.slug === a.slug)
      if (!agentInfo) continue

      // Active task
      if (a.currentTask && a.currentTask !== 'Standing by') {
        allTasks.push({
          id: `${a.slug}-active`,
          automation_id: a.slug,
          text: a.currentTask,
          status: a.status === 'WORKING' ? 'in_progress' : a.status === 'BLOCKED' ? 'blocked' : 'pending',
          position: 0,
          time: a.timeActive || new Date().toISOString(),
          agentName: selectedAgent ? undefined : agentInfo.name,
          agentColor: agentInfo.color,
        })
      }

      // Last completion as done task
      if (a.lastCompletion) {
        allTasks.push({
          id: `${a.slug}-done`,
          automation_id: a.slug,
          text: a.lastCompletion.description,
          status: 'done',
          position: 999,
          time: a.lastCompletion.date,
          agentName: selectedAgent ? undefined : agentInfo.name,
          agentColor: agentInfo.color,
        })
      }
    }
  }

  // Separate active and done tasks
  const activeTasks = allTasks.filter(t => t.status !== 'done').sort((a, b) => a.position - b.position)
  const doneTasks = allTasks.filter(t => t.status === 'done')

  const handleAddTask = (e) => {
    e.preventDefault()
    if (!newTaskText.trim()) return
    // For C3 MVP, tasks are read-only from the data layer.
    // When Supabase is connected (C4), this writes to the tasks table.
    setNewTaskText('')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Agent Selector */}
      <AgentSelector
        agents={AGENTS}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
        agentStatus={agentStatus}
        isMobile={isMobile}
      />

      {/* Task List */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Scrollable task area */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: isMobile ? '16px' : '24px 32px',
          maxWidth: isMobile ? '100%' : 720,
          margin: '0 auto', width: '100%',
        }}>
          {/* Agent Header */}
          {agent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <SpriteAvatar agentSlug={agent.slug} size={40} borderColor={agent.color} />
              <div>
                <div style={{
                  fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 20,
                  color: '#FDF6EC',
                }}>
                  {agent.name}
                </div>
                <div style={{
                  fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 13,
                  color: '#6B7280',
                }}>
                  {agent.role}
                </div>
              </div>
              {/* Status pill */}
              {agentStatus?.[agent.slug] && (
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: 'auto',
                  color: STATUS_COLORS[agentStatus[agent.slug].status === 'WORKING' ? 'in_progress' : 'pending']?.text || '#6B7280',
                  background: STATUS_COLORS[agentStatus[agent.slug].status === 'WORKING' ? 'in_progress' : 'pending']?.bg || 'rgba(107,114,128,0.15)',
                  padding: '4px 10px', borderRadius: 4,
                }}>
                  {agentStatus[agent.slug].status === 'WORKING' ? 'ACTIVE' : agentStatus[agent.slug].status}
                </span>
              )}
            </div>
          )}

          {/* Empty state */}
          {activeTasks.length === 0 && doneTasks.length === 0 && (
            <EmptyState agent={agent} />
          )}

          {/* Active tasks */}
          <AnimatePresence>
            {activeTasks.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                isTop={i === 0}
                agentColor={task.agentColor || agentColor}
                index={i}
              />
            ))}
          </AnimatePresence>

          {/* Done section */}
          {doneTasks.length > 0 && (
            <div style={{ marginTop: 24 }}>
              {/* Divider */}
              <button
                onClick={() => setShowDone(!showDone)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 0',
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 10,
                  color: '#6B7280', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {showDone ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  Done ({doneTasks.length})
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </button>

              {/* Done tasks */}
              <AnimatePresence>
                {showDone && doneTasks.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isTop={false}
                    agentColor={task.agentColor || agentColor}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

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
            placeholder={`Add a task for ${agent?.name || 'any agent'}...`}
            style={{
              width: '100%', height: isMobile ? 44 : 40,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '0 16px',
              fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 14,
              color: '#FDF6EC', outline: 'none',
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => e.target.style.borderColor = `${agentColor}66`}
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
