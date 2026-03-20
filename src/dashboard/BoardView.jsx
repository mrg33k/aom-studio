// BoardView.jsx -- Trello/Kanban alternative view for Corner dashboard
// Three columns: Right Now (active) | To Do (queued) | Done (completed)
// Data source: pipeData from useDataPipe hook
// Design: dark #0F1B2D, card borders match agent colors, 16px+ text

import { AGENTS } from './gridSpec.js'

// Resolve agent color by slug
function getAgentColor(slug) {
  if (!slug) return '#6B7280'
  const agent = AGENTS.find(a => a.slug === slug?.toLowerCase())
  return agent?.color || '#6B7280'
}

// Column header colors (status-based, matching game theme)
const COLUMN_CONFIG = {
  rightNow: {
    label: 'Right Now',
    color: '#F97316',   // orange
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.35)',
  },
  toDo: {
    label: 'To Do',
    color: '#3B82F6',   // blue
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
  },
  done: {
    label: 'Done',
    color: '#22C55E',   // green
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.35)',
  },
}

// Single kanban card
function BoardCard({ entry, columnKey }) {
  const agentSlug = entry.agent?.toLowerCase()
  const agentColor = getAgentColor(agentSlug)
  const taskText = entry.text || entry.description || entry.currentTask || 'No task'
  const agentName = entry.agent
    ? entry.agent.charAt(0).toUpperCase() + entry.agent.slice(1)
    : null
  const projectTag = entry.project || null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `3px solid ${agentColor}`,
      borderRadius: 8,
      padding: '12px 14px',
      marginBottom: 8,
      transition: 'background 150ms ease, border-color 150ms ease',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.borderColor = `rgba(255,255,255,0.14)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        e.currentTarget.style.borderColor = `rgba(255,255,255,0.08)`
      }}
    >
      {/* Task text */}
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 15,
        fontWeight: 500,
        color: '#F1F5F9',
        lineHeight: 1.45,
        marginBottom: agentName || projectTag ? 10 : 0,
        wordBreak: 'break-word',
      }}>
        {taskText}
      </div>

      {/* Footer: agent + project tag */}
      {(agentName || projectTag) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          flexWrap: 'wrap',
        }}>
          {agentName && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: agentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: `${agentColor}18`,
              border: `1px solid ${agentColor}30`,
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
            }}>
              {agentName}
            </span>
          )}
          {projectTag && (
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 500,
              color: '#64748B',
              background: 'rgba(100,116,139,0.1)',
              border: '1px solid rgba(100,116,139,0.2)',
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
            }}>
              {projectTag}
            </span>
          )}
          {entry.timestamp && (
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 11,
              color: '#475569',
              marginLeft: 'auto',
              flexShrink: 0,
            }}>
              {entry.timestamp}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Single column
function BoardColumn({ columnKey, cards }) {
  const config = COLUMN_CONFIG[columnKey]
  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 260,
      maxWidth: 400,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: config.bg,
        border: `2px solid ${config.border}`,
        borderRadius: '10px 10px 0 0',
        padding: '10px 16px',
        marginBottom: 0,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: config.color,
          boxShadow: `0 0 6px ${config.color}80`,
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 14,
          fontWeight: 800,
          color: config.color,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {config.label}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: 600,
          color: config.color,
          background: `${config.color}20`,
          border: `1px solid ${config.color}40`,
          borderRadius: 6,
          padding: '1px 8px',
          flexShrink: 0,
        }}>
          {cards.length}
        </span>
      </div>

      {/* Card stack */}
      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${config.border}`,
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        padding: '12px',
        overflowY: 'auto',
        minHeight: 120,
      }}>
        {cards.length === 0 ? (
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14,
            color: '#334155',
            textAlign: 'center',
            paddingTop: 24,
            fontStyle: 'italic',
          }}>
            Nothing here
          </div>
        ) : (
          cards.map((card, i) => (
            <BoardCard key={`${columnKey}-${i}`} entry={card} columnKey={columnKey} />
          ))
        )}
      </div>
    </div>
  )
}

// Main BoardView component
export default function BoardView({ pipeData, isMobile, isNightMode }) {
  const rightNow = pipeData?.rightNow || []
  const completedFeed = pipeData?.completedFeed || []
  const punchData = pipeData?.punchData

  // To Do: tasks from punchData that are queued (not in rightNow by agent slug)
  const activeAgentSlugs = new Set(rightNow.map(t => t.agent?.toLowerCase()).filter(Boolean))

  let toDo = []
  if (punchData?.projects) {
    for (const project of punchData.projects) {
      // Skip done-only sections
      if (['done', 'completed'].includes(project.section)) continue
      for (const task of project.tasks) {
        if (task.done) continue
        // Skip tasks from agents already in Right Now
        const taskAgent = (task.agent || '').toLowerCase()
        if (taskAgent && activeAgentSlugs.has(taskAgent)) continue
        toDo.push({
          text: task.text,
          agent: task.agent || null,
          project: project.name,
          projectSection: project.section,
          done: false,
        })
      }
    }
  }
  // Cap at 20 to avoid overwhelming the column
  toDo = toDo.slice(0, 20)

  const topPadding = isMobile ? 'calc(48px + env(safe-area-inset-top, 0px))' : '52px'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      top: 0,
      background: isNightMode ? '#0A0F1E' : '#0F1B2D',
      paddingTop: topPadding,
      paddingBottom: isMobile ? 80 : 20,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 15,
      overflow: 'hidden',
    }}>
      {/* Board container */}
      <div style={{
        flex: 1,
        padding: isMobile ? '16px 12px' : '20px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 16,
        overflowX: isMobile ? 'visible' : 'auto',
        overflowY: isMobile ? 'auto' : 'hidden',
        alignItems: isMobile ? 'stretch' : 'flex-start',
      }}>
        <BoardColumn columnKey="rightNow" cards={rightNow} />
        <BoardColumn columnKey="toDo" cards={toDo} />
        <BoardColumn columnKey="done" cards={completedFeed} />
      </div>
    </div>
  )
}
