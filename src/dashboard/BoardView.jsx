// BoardView.jsx -- Full Trello/Kanban view for Corner dashboard
// Columns: one per agent + one per project + Right Now + Completed
// Features: filter bar, search, horizontal scroll, drag-and-drop between columns
// Data source: pipeData from useDataPipe hook (rightNow, completedFeed, punchData)
// DONE(bobby): touch drag-and-drop for iPad/mobile using Pointer Events API

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { AGENTS, PROJECTS } from './gridSpec.js'

const BOARD_IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getAgentColor(slug) {
  if (!slug) return '#6B7280'
  const agent = AGENTS.find(a => a.slug === slug?.toLowerCase())
  if (agent) return agent.color
  const proj = PROJECTS.find(p => p.slug === slug?.toLowerCase())
  return proj?.color || '#6B7280'
}

function getAgentName(slug) {
  if (!slug) return null
  const agent = AGENTS.find(a => a.slug === slug?.toLowerCase())
  if (agent) return agent.name
  const proj = PROJECTS.find(p => p.slug === slug?.toLowerCase())
  return proj?.name || (slug.charAt(0).toUpperCase() + slug.slice(1))
}

// ── COLUMN CONFIGS ─────────────────────────────────────────────────────────

const STATUS_COLS = {
  rightnow: { key: 'rightnow', label: 'Right Now', color: '#F97316', type: 'status' },
  completed: { key: 'completed', label: 'Completed', color: '#22C55E', type: 'status' },
}

// Build agent columns from AGENTS list
const AGENT_COLS = AGENTS.map(a => ({
  key: a.slug,
  label: a.name,
  color: a.color,
  type: 'agent',
}))

// Build project columns from PROJECTS list (exclude hidden)
const PROJECT_COLS = PROJECTS.filter(p => !p.hidden).map(p => ({
  key: p.slug,
  label: p.name,
  color: p.color,
  type: 'project',
}))

// Default column order
const DEFAULT_ORDER = [
  'rightnow',
  'completed',
  ...AGENT_COLS.map(c => c.key),
  ...PROJECT_COLS.map(c => c.key),
]

// All col configs by key
const ALL_COLS = {
  ...STATUS_COLS,
  ...Object.fromEntries(AGENT_COLS.map(c => [c.key, c])),
  ...Object.fromEntries(PROJECT_COLS.map(c => [c.key, c])),
}


// ── TOUCH DRAG GHOST ────────────────────────────────────────────────────────
// Creates a floating ghost element during touch drag. Appended to document.body.
function createTouchGhost(sourceEl) {
  const rect = sourceEl.getBoundingClientRect()
  const ghost = sourceEl.cloneNode(true)
  ghost.id = 'board-touch-ghost'
  ghost.style.cssText = [
    `position: fixed`,
    `left: ${rect.left}px`,
    `top: ${rect.top}px`,
    `width: ${rect.width}px`,
    `pointer-events: none`,
    `z-index: 99999`,
    `opacity: 0.85`,
    `transform: rotate(2deg) scale(1.04)`,
    `box-shadow: 0 12px 40px rgba(0,0,0,0.6)`,
    `transition: none`,
    `border-radius: 8px`,
  ].join(';')
  document.body.appendChild(ghost)
  return ghost
}

function removeTouchGhost() {
  const existing = document.getElementById('board-touch-ghost')
  if (existing) existing.remove()
}

// ── BOARD CARD ──────────────────────────────────────────────────────────────

function BoardCard({ entry, columnKey, onDragStart, onDragEnd, isDragging, taskIndex, onContextMenu, onTouchDrop }) {
  const agentSlug = entry.agent?.toLowerCase()
  const agentColor = getAgentColor(agentSlug)
  const taskText = entry.text || entry.description || entry.currentTask || 'No task'
  const agentName = entry.agent ? getAgentName(agentSlug) : null
  const projectTag = entry.project || null
  const cardRef = useRef(null)

  // Pointer-based drag (works for both mouse and touch)
  const pointerDragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    pointerId: null,
    longPressTimer: null,
  })

  // Only show agent badge if it differs from the column we're in
  const showAgentBadge = agentName && agentSlug !== columnKey

  const handlePointerDown = useCallback((e) => {
    // Only primary button for mouse, any for touch
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const state = pointerDragRef.current
    state.startX = e.clientX
    state.startY = e.clientY
    state.pointerId = e.pointerId
    state.active = false
    state.moved = false

    // Long-press = context menu (500ms, cancels if we start dragging)
    state.longPressTimer = setTimeout(() => {
      if (!state.moved) {
        onContextMenu?.({ x: e.clientX, y: e.clientY, entry, columnKey })
      }
    }, 500)
  }, [entry, columnKey, onContextMenu])

  const handlePointerMove = useCallback((e) => {
    const state = pointerDragRef.current
    if (state.pointerId === null) return
    if (state.pointerId !== e.pointerId) return

    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 6 && !state.active) {
      // Start drag
      state.active = true
      state.moved = true
      clearTimeout(state.longPressTimer)

      // Create ghost from card element
      if (cardRef.current) {
        createTouchGhost(cardRef.current)
      }
      onDragStart?.()
    }

    if (state.active) {
      e.preventDefault()
      const ghost = document.getElementById('board-touch-ghost')
      if (ghost) {
        const rect = cardRef.current?.getBoundingClientRect()
        const offsetX = rect ? e.clientX - state.startX : 0
        const offsetY = rect ? e.clientY - state.startY : 0
        ghost.style.left = `${(rect?.left ?? 0) + offsetX}px`
        ghost.style.top = `${(rect?.top ?? 0) + offsetY}px`

        // Highlight drop target column
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const colEl = el?.closest('[data-board-col]')
        const allCols = document.querySelectorAll('[data-board-col]')
        allCols.forEach(c => c.setAttribute('data-drop-hover', c === colEl ? '1' : '0'))
      }
    }
  }, [onDragStart])

  const handlePointerUp = useCallback((e) => {
    const state = pointerDragRef.current
    clearTimeout(state.longPressTimer)

    if (state.active) {
      // Find drop target column
      removeTouchGhost()
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const colEl = el?.closest('[data-board-col]')
      if (colEl) {
        const toCol = colEl.getAttribute('data-board-col')
        if (toCol && toCol !== columnKey) {
          onTouchDrop?.(toCol, { entry, fromCol: columnKey, taskIndex })
        }
      }
      // Clear hover state
      document.querySelectorAll('[data-board-col]').forEach(c => c.removeAttribute('data-drop-hover'))
      onDragEnd?.()
    }

    state.active = false
    state.moved = false
    state.pointerId = null
  }, [entry, columnKey, taskIndex, onTouchDrop, onDragEnd])

  const handlePointerCancel = useCallback(() => {
    const state = pointerDragRef.current
    clearTimeout(state.longPressTimer)
    removeTouchGhost()
    document.querySelectorAll('[data-board-col]').forEach(c => c.removeAttribute('data-drop-hover'))
    if (state.active) onDragEnd?.()
    state.active = false
    state.moved = false
    state.pointerId = null
  }, [onDragEnd])

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', JSON.stringify({ entry, fromCol: columnKey, taskIndex }))
        onDragStart?.()
      }}
      onDragEnd={() => onDragEnd?.()}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.({ x: e.clientX, y: e.clientY, entry, columnKey })
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${agentColor}`,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 7,
        transition: 'background 150ms ease, box-shadow 150ms ease, opacity 150ms ease',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.boxShadow = `0 0 0 1px ${agentColor}30`
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: '#F1F5F9',
        lineHeight: 1.45,
        marginBottom: (showAgentBadge || projectTag) ? 8 : 0,
        wordBreak: 'break-word',
      }}>
        {taskText}
      </div>

      {(showAgentBadge || projectTag) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {showAgentBadge && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              color: agentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              background: `${agentColor}18`,
              border: `1px solid ${agentColor}30`,
              borderRadius: 4,
              padding: '1px 5px',
              flexShrink: 0,
            }}>
              {agentName}
            </span>
          )}
          {projectTag && (
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 500,
              color: '#64748B',
              background: 'rgba(100,116,139,0.1)',
              border: '1px solid rgba(100,116,139,0.2)',
              borderRadius: 4,
              padding: '1px 5px',
              flexShrink: 0,
            }}>
              {projectTag}
            </span>
          )}
          {entry.isLive && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              color: '#F97316',
              background: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.35)',
              borderRadius: 4,
              padding: '1px 5px',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}>
              LIVE
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── BOARD COLUMN ────────────────────────────────────────────────────────────

function BoardColumn({
  colKey,
  cards,
  isDropTarget,
  onDragOver,
  onDrop,
  onDragLeave,
  onCardDragStart,
  onCardDragEnd,
  draggingKey,
  isVisible,
  taskOrder,
  onTaskReorder,
  onContextMenu,
  onTouchDrop,
  isColDragging,
  colDragInsertSide,
  onColDragStart,
  onColDragOver,
  onColDrop,
  onColDragEnd,
}) {
  const config = ALL_COLS[colKey] || { label: colKey, color: '#6B7280', type: 'other' }
  const dragInsertRef = useRef(null)
  const [touchHover, setTouchHover] = useState(false)

  // Keep touchHover in sync with data-drop-hover attribute changes
  useEffect(() => {
    const colEl = dragInsertRef.current?.closest('[data-board-col]')
    if (!colEl) return
    const obs = new MutationObserver(() => {
      setTouchHover(colEl.getAttribute('data-drop-hover') === '1')
    })
    obs.observe(colEl, { attributes: true, attributeFilter: ['data-drop-hover'] })
    return () => obs.disconnect()
  }, [])

  // Sort cards by stored task order
  const sortedCards = useMemo(() => {
    if (!taskOrder || taskOrder.length === 0) return cards
    const indexMap = new Map(taskOrder.map((t, i) => [t, i]))
    return [...cards].sort((a, b) => {
      const ia = indexMap.has(a.text) ? indexMap.get(a.text) : 9999
      const ib = indexMap.has(b.text) ? indexMap.get(b.text) : 9999
      return ia - ib
    })
  }, [cards, taskOrder])

  const handleDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes('application/x-board-col')) {
      e.preventDefault()
      const rect = e.currentTarget.getBoundingClientRect()
      const side = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
      onColDragOver?.(colKey, side)
      return
    }
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver(colKey)
  }, [colKey, onDragOver, onColDragOver])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('application/x-board-col')) {
      onColDrop?.(colKey)
      return
    }
    const raw = e.dataTransfer.getData('text/plain')
    try {
      const payload = JSON.parse(raw)
      onDrop(colKey, payload)
    } catch {}
  }, [colKey, onDrop, onColDrop])

  if (!isVisible) return null

  const isHighlighted = isDropTarget || touchHover

  return (
    <div
      data-board-col={colKey}
      style={{
        flex: '0 0 260px',
        width: 260,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        opacity: isColDragging ? 0.3 : 1,
        transition: 'opacity 150ms ease',
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          onDragLeave()
          onColDragOver?.(null, null)
        }
      }}
    >
      {colDragInsertSide === 'before' && (
        <div style={{
          position: 'absolute', left: -7, top: 0, bottom: 0, width: 3,
          background: '#3B82F6', borderRadius: 2, zIndex: 100,
          pointerEvents: 'none',
        }} />
      )}
      {colDragInsertSide === 'after' && (
        <div style={{
          position: 'absolute', right: -7, top: 0, bottom: 0, width: 3,
          background: '#3B82F6', borderRadius: 2, zIndex: 100,
          pointerEvents: 'none',
        }} />
      )}
      {/* Column header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: `${config.color}12`,
        border: `2px solid ${isHighlighted ? config.color : `${config.color}38`}`,
        borderRadius: '10px 10px 0 0',
        padding: '9px 14px',
        transition: 'border-color 150ms ease',
      }}>
        {/* Grip handle */}
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-board-col', colKey)
            e.dataTransfer.effectAllowed = 'move'
            e.stopPropagation()
            onColDragStart?.(colKey)
          }}
          onDragEnd={() => onColDragEnd?.()}
          style={{ cursor: 'grab', color: '#334155', display: 'flex', alignItems: 'center', padding: '0 2px 0 0', flexShrink: 0 }}
        >
          <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
            <circle cx="2" cy="2" r="1.3"/><circle cx="6" cy="2" r="1.3"/>
            <circle cx="2" cy="6" r="1.3"/><circle cx="6" cy="6" r="1.3"/>
            <circle cx="2" cy="10" r="1.3"/><circle cx="6" cy="10" r="1.3"/>
          </svg>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: config.color,
          boxShadow: `0 0 5px ${config.color}80`,
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 800,
          color: config.color,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {config.label}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          color: config.color,
          background: `${config.color}20`,
          border: `1px solid ${config.color}40`,
          borderRadius: 5,
          padding: '0 6px',
          lineHeight: '18px',
          flexShrink: 0,
        }}>
          {sortedCards.length}
        </span>
      </div>

      {/* Card stack / drop zone */}
      <div
        ref={dragInsertRef}
        style={{
          flex: 1,
          background: isHighlighted ? `${config.color}08` : 'rgba(255,255,255,0.015)',
          border: `1.5px solid ${isHighlighted ? config.color : `${config.color}28`}`,
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: '10px',
          overflowY: 'auto',
          minHeight: 100,
          transition: 'background 150ms ease, border-color 150ms ease',
          boxShadow: isHighlighted ? `inset 0 0 12px ${config.color}15` : 'none',
        }}>
        {sortedCards.length === 0 ? (
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            color: '#2D3F55',
            textAlign: 'center',
            paddingTop: 20,
            fontStyle: 'italic',
          }}>
            {isHighlighted ? 'Drop here' : 'Nothing here'}
          </div>
        ) : (
          sortedCards.map((card, i) => (
            <BoardCard
              key={`${colKey}-${card.text?.slice(0, 20)}-${i}`}
              entry={card}
              columnKey={colKey}
              taskIndex={i}
              isDragging={draggingKey === `${colKey}-${i}`}
              onDragStart={() => onCardDragStart(`${colKey}-${i}`)}
              onDragEnd={() => onCardDragEnd()}
              onContextMenu={(ctx) => onContextMenu?.(ctx)}
              onTouchDrop={onTouchDrop}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── FILTER TOGGLE PILL ──────────────────────────────────────────────────────

function FilterPill({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 26,
        padding: '0 10px',
        borderRadius: 13,
        background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
        color: active ? color : '#64748B',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
          e.currentTarget.style.color = '#94A3B8'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.color = '#64748B'
        }
      }}
    >
      {label}
    </button>
  )
}

// ── MAIN BOARD VIEW ─────────────────────────────────────────────────────────

export default function BoardView({ pipeData, isMobile, isNightMode }) {
  const rightNow = pipeData?.rightNow || []
  const completedFeed = pipeData?.completedFeed || []
  const punchData = pipeData?.punchData

  // Filter state: which types are visible
  const [showStatus, setShowStatus] = useState(true)
  const [showAgents, setShowAgents] = useState(true)
  const [showProjects, setShowProjects] = useState(true)

  // Search
  const [search, setSearch] = useState('')

  // Column order (drag to reorder columns)
  const [colOrder, setColOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('corner-board-col-order')
      if (saved) {
        const parsed = JSON.parse(saved)
        const valid = parsed.filter(k => DEFAULT_ORDER.includes(k))
        const missing = DEFAULT_ORDER.filter(k => !valid.includes(k))
        return [...valid, ...missing]
      }
    } catch {}
    return [...DEFAULT_ORDER]
  })

  const [colDragging, setColDragging] = useState(null) // colKey being dragged
  const [colDragInsert, setColDragInsert] = useState(null) // { targetKey, side: 'before'|'after' }

  // Drag state
  const [draggingCard, setDraggingCard] = useState(null) // key like "rightnow-0"
  const [dropTargetCol, setDropTargetCol] = useState(null)

  // Context menu state
  const [boardCtxMenu, setBoardCtxMenu] = useState(null) // { x, y, entry, columnKey }
  const boardCtxRef = useRef(null)

  // Dismiss context menu on outside click / Escape
  useEffect(() => {
    if (!boardCtxMenu) return
    const delay = 150
    const timer = setTimeout(() => {
      const handler = (e) => {
        if (boardCtxRef.current && boardCtxRef.current.contains(e.target)) return
        setBoardCtxMenu(null)
      }
      const keyHandler = (e) => { if (e.key === 'Escape') setBoardCtxMenu(null) }
      document.addEventListener('mousedown', handler)
      document.addEventListener('touchstart', handler, { passive: true })
      document.addEventListener('keydown', keyHandler)
      boardCtxMenu._cleanup = () => {
        document.removeEventListener('mousedown', handler)
        document.removeEventListener('touchstart', handler)
        document.removeEventListener('keydown', keyHandler)
      }
    }, delay)
    return () => {
      clearTimeout(timer)
      boardCtxMenu._cleanup?.()
    }
  }, [boardCtxMenu])

  // Persist column order to localStorage
  useEffect(() => {
    try { localStorage.setItem('corner-board-col-order', JSON.stringify(colOrder)) } catch {}
  }, [colOrder])

  // Per-column task order (for within-column reordering)
  const [taskOrders, setTaskOrders] = useState({})

  const saveTaskOrders = useCallback((orders) => {
    setTaskOrders(orders)
  }, [])

  // ── Build cards per column ─────────────────────────────────────────────

  // Track which tasks are "overridden" to a different column by drag-and-drop
  const [cardOverrides, setCardOverrides] = useState({})

  const saveCardOverrides = useCallback((overrides) => {
    setCardOverrides(overrides)
  }, [])

  // Build the base card map (column -> cards[])
  const baseCardMap = useMemo(() => {
    const map = {}

    // Init all columns
    for (const key of DEFAULT_ORDER) {
      map[key] = []
    }

    // Right Now column
    for (const task of rightNow) {
      map['rightnow'].push({ ...task, _id: `rn-${task.agent}-${task.text?.slice(0, 20)}` })
    }

    // Completed column
    for (const task of completedFeed.slice(0, 30)) {
      map['completed'].push({ ...task, _id: `done-${task.agent}-${task.text?.slice(0, 20)}` })
    }

    // Agent and project columns from punch-list
    if (punchData?.projects) {
      for (const project of punchData.projects) {
        if (['done', 'completed'].includes(project.section)) continue
        for (const task of project.tasks) {
          if (task.done) continue

          const agentSlug = task.agent?.toLowerCase()
          const cardData = {
            text: task.text,
            agent: task.agent,
            project: project.name,
            done: false,
            _id: `punch-${project.section}-${task.text?.slice(0, 20)}`,
          }

          // Put in agent column if agent matches a known column
          if (agentSlug && map[agentSlug] !== undefined) {
            map[agentSlug].push(cardData)
          }

          // Also put in project column if the section maps to a project slug
          const projSlug = PROJECT_COLS.find(p =>
            p.label.toLowerCase() === project.name?.toLowerCase() ||
            p.key === project.section
          )?.key
          if (projSlug && map[projSlug] !== undefined && projSlug !== agentSlug) {
            map[projSlug].push({ ...cardData, _id: cardData._id + '-proj' })
          }
        }
      }
    }

    return map
  }, [rightNow, completedFeed, punchData])

  // Apply overrides
  const cardMap = useMemo(() => {
    const map = {}
    for (const key of DEFAULT_ORDER) {
      map[key] = [...(baseCardMap[key] || [])]
    }
    // Apply card moves
    for (const [cardId, { toCol, card }] of Object.entries(cardOverrides)) {
      // Remove from any column that has this card
      for (const key of Object.keys(map)) {
        map[key] = map[key].filter(c => c._id !== cardId)
      }
      // Add to target column
      if (map[toCol]) {
        map[toCol].push(card)
      }
    }
    return map
  }, [baseCardMap, cardOverrides])

  // ── Filter logic ───────────────────────────────────────────────────────

  const visibleColKeys = useMemo(() => {
    return colOrder.filter(key => {
      const col = ALL_COLS[key]
      if (!col) return false
      if (col.type === 'status' && !showStatus) return false
      if (col.type === 'agent' && !showAgents) return false
      if (col.type === 'project' && !showProjects) return false

      // Search filter: only show columns that have matching cards (or if no search)
      if (search.trim()) {
        const q = search.toLowerCase()
        const cards = cardMap[key] || []
        const colMatchesName = col.label.toLowerCase().includes(q)
        const hasMatchingCard = cards.some(c =>
          (c.text || '').toLowerCase().includes(q) ||
          (c.agent || '').toLowerCase().includes(q) ||
          (c.project || '').toLowerCase().includes(q)
        )
        if (!colMatchesName && !hasMatchingCard) return false
      }

      return true
    })
  }, [colOrder, showStatus, showAgents, showProjects, search, cardMap])

  // Filter cards by search within visible columns
  const filteredCardMap = useMemo(() => {
    if (!search.trim()) return cardMap
    const q = search.toLowerCase()
    const result = {}
    for (const key of visibleColKeys) {
      result[key] = (cardMap[key] || []).filter(c =>
        (c.text || '').toLowerCase().includes(q) ||
        (c.agent || '').toLowerCase().includes(q) ||
        (c.project || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [cardMap, visibleColKeys, search])

  // ── Drag handlers ──────────────────────────────────────────────────────

  // Persist a card move to Supabase (fire-and-forget)
  const persistDrop = useCallback((toCol, entry) => {
    if (BOARD_IS_LOCAL) return
    const taskText = entry.text || entry.description || entry.currentTask
    const taskId = entry.taskId || entry.id || null
    if (!taskText && !taskId) return

    const colType = ALL_COLS[toCol]?.type
    let body

    if (toCol === 'rightnow') {
      body = { action: 'addToRightNow', taskText, taskId, agent: entry.agent || 'elon' }
    } else if (toCol === 'completed') {
      body = { action: 'markDone', taskText, taskId }
    } else if (colType === 'agent') {
      body = { action: 'reassign', taskText, taskId, payload: toCol }
    } else if (colType === 'project') {
      body = { action: 'moveToProject', taskText, taskId, payload: toCol }
    } else {
      return
    }

    fetch('/api/dashboard/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }, [])

  const handleCardDrop = useCallback((toCol, payload) => {
    const { entry, fromCol, taskIndex } = payload
    setDropTargetCol(null)
    setDraggingCard(null)

    if (fromCol === toCol) {
      // Within same column -- reorder not implemented at card level yet
      return
    }

    // Persist to Supabase
    persistDrop(toCol, entry)

    // Move card to new column (immediate visual feedback)
    const cardId = entry._id || `override-${entry.text?.slice(0, 20)}-${Date.now()}`
    const card = { ...entry, _id: cardId }
    const newOverrides = { ...cardOverrides, [cardId]: { toCol, card } }
    saveCardOverrides(newOverrides)
  }, [cardOverrides, saveCardOverrides, persistDrop])

  // Touch drag handler -- same logic as handleCardDrop but triggered by Pointer Events
  const handleCardTouchDrop = useCallback((toCol, payload) => {
    const { entry, fromCol, taskIndex } = payload
    if (fromCol === toCol) return

    // Persist to Supabase
    persistDrop(toCol, entry)

    const cardId = entry._id || `override-${entry.text?.slice(0, 20)}-${Date.now()}`
    const card = { ...entry, _id: cardId }
    const newOverrides = { ...cardOverrides, [cardId]: { toCol, card } }
    saveCardOverrides(newOverrides)
    setDraggingCard(null)
  }, [cardOverrides, saveCardOverrides, persistDrop])

  const handleDragOver = useCallback((colKey) => {
    setDropTargetCol(colKey)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropTargetCol(null)
  }, [])

  const handleColDragStart = useCallback((key) => {
    setColDragging(key)
    setColDragInsert(null)
  }, [])

  const handleColDragEnd = useCallback(() => {
    setColDragging(null)
    setColDragInsert(null)
  }, [])

  const handleColDragOver = useCallback((targetKey, side) => {
    if (!targetKey || targetKey === colDragging) {
      setColDragInsert(null)
      return
    }
    setColDragInsert({ targetKey, side })
  }, [colDragging])

  const handleColDrop = useCallback((targetKey) => {
    if (!colDragging || colDragging === targetKey) {
      setColDragging(null)
      setColDragInsert(null)
      return
    }
    const side = colDragInsert?.side || 'after'
    const newOrder = [...colOrder].filter(k => k !== colDragging)
    const targetIdx = newOrder.indexOf(targetKey)
    if (targetIdx === -1) { setColDragging(null); setColDragInsert(null); return }
    newOrder.splice(side === 'before' ? targetIdx : targetIdx + 1, 0, colDragging)
    setColOrder(newOrder)
    setColDragging(null)
    setColDragInsert(null)
  }, [colDragging, colDragInsert, colOrder])

  // ── Layout ─────────────────────────────────────────────────────────────

  const topPadding = isMobile
    ? 'calc(48px + env(safe-area-inset-top, 0px))'
    : '52px'

  const bgColor = isNightMode ? '#0A0F1E' : '#0F1B2D'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      top: 0,
      background: bgColor,
      paddingTop: topPadding,
      paddingBottom: isMobile ? 80 : 12,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 15,
      overflow: 'hidden',
    }}>

      {/* ── TOOLBAR: filter toggles + search ─────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: isMobile ? '8px 12px' : '10px 20px',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {/* Filter pills */}
        <FilterPill
          label="Status"
          active={showStatus}
          color="#F97316"
          onClick={() => setShowStatus(s => !s)}
        />
        <FilterPill
          label="Agents"
          active={showAgents}
          color="#3B82F6"
          onClick={() => setShowAgents(s => !s)}
        />
        <FilterPill
          label="Projects"
          active={showProjects}
          color="#22C55E"
          onClick={() => setShowProjects(s => !s)}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.05)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '4px 10px',
          flex: '0 1 220px',
          minWidth: 120,
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="#fff" strokeWidth="1.5"/>
            <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cards..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F1F5F9',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 12,
              fontWeight: 400,
              width: '100%',
              caretColor: '#3B82F6',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748B', padding: 0, display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Column count */}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 600,
          color: '#334155',
          flexShrink: 0,
          marginLeft: 'auto',
          whiteSpace: 'nowrap',
        }}>
          {visibleColKeys.length} columns
        </span>
      </div>

      {/* ── KANBAN BOARD: horizontal scroll ─────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: 12,
        padding: isMobile ? '12px' : '16px 20px',
        overflowX: 'auto',
        overflowY: 'hidden',
        alignItems: 'flex-start',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(59,130,246,0.2) transparent',
      }}>
        {visibleColKeys.map(key => (
          <BoardColumn
            key={key}
            colKey={key}
            cards={filteredCardMap[key] || []}
            isDropTarget={dropTargetCol === key}
            onDragOver={handleDragOver}
            onDrop={handleCardDrop}
            onDragLeave={handleDragLeave}
            onCardDragStart={setDraggingCard}
            onCardDragEnd={() => setDraggingCard(null)}
            draggingKey={draggingCard}
            isVisible={true}
            taskOrder={taskOrders[key] || []}
            onTaskReorder={(newOrder) => {
              const updated = { ...taskOrders, [key]: newOrder }
              saveTaskOrders(updated)
            }}
            onContextMenu={(ctx) => setBoardCtxMenu(ctx)}
            onTouchDrop={handleCardTouchDrop}
            isColDragging={colDragging === key}
            colDragInsertSide={colDragInsert?.targetKey === key ? colDragInsert.side : null}
            onColDragStart={handleColDragStart}
            onColDragOver={handleColDragOver}
            onColDrop={handleColDrop}
            onColDragEnd={handleColDragEnd}
          />
        ))}

        {visibleColKeys.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#334155',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14,
            fontStyle: 'italic',
          }}>
            {search ? 'No cards match your search' : 'No columns visible -- turn on a filter above'}
          </div>
        )}
      </div>

      {/* Board card context menu */}
      {boardCtxMenu && (() => {
        const menuW = 220
        const menuH = 200
        const x = Math.min(boardCtxMenu.x, window.innerWidth - menuW - 8)
        const y = boardCtxMenu.y + menuH > window.innerHeight - 8
          ? boardCtxMenu.y - menuH - 4
          : boardCtxMenu.y + 4
        const entry = boardCtxMenu.entry
        const taskText = entry?.text || entry?.description || entry?.currentTask || ''
        return (
          <div
            ref={boardCtxRef}
            style={{
              position: 'fixed', left: x, top: y, zIndex: 9999,
              minWidth: menuW,
              background: 'rgba(12, 18, 35, 0.97)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(100, 180, 255, 0.18)',
              borderRadius: 10,
              padding: '6px 0',
              boxShadow: '0 12px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* Task name header */}
            <div style={{
              padding: '6px 14px 8px',
              fontSize: 11, fontWeight: 700, color: '#4A6080',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              borderBottom: '1px solid rgba(100,180,255,0.08)',
              marginBottom: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {taskText.slice(0, 40)}{taskText.length > 40 ? '...' : ''}
            </div>
            {/* Promote to Right Now */}
            <button onClick={() => {
              // Supabase: promote task to active (fire-and-forget)
              if (!BOARD_IS_LOCAL) {
                fetch('/api/dashboard/task-action', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'addToRightNow', taskText, taskId: entry.taskId || entry.id || null, agent: entry.agent || 'patrik' }),
                }).catch(() => {})
              }
              setBoardCtxMenu(null)
            }} style={boardCtxBtn('#FF6B3D')}>
              Send to Right Now
            </button>
            {/* Create Task (add copy to manual tasks) */}
            <button onClick={() => {
              // Supabase: create task as todo (fire-and-forget)
              if (!BOARD_IS_LOCAL) {
                fetch('/api/dashboard/agent-status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: taskText, agent: entry.agent || 'elon', status: 'todo' }),
                }).catch(() => {})
              }
              setBoardCtxMenu(null)
            }} style={boardCtxBtn('#5BB8FF')}>
              Add to HUD Pill
            </button>
            {/* Mark done */}
            <button onClick={() => {
              // Supabase: mark done (fire-and-forget)
              if (!BOARD_IS_LOCAL) {
                fetch('/api/dashboard/task-action', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'markDone', taskText, taskId: entry.taskId || entry.id || null }),
                }).catch(() => {})
              }
              setBoardCtxMenu(null)
            }} style={boardCtxBtn('#22C55E')}>
              Mark Done
            </button>
            <div style={{ height: 1, background: 'rgba(100,180,255,0.08)', margin: '4px 10px' }} />
            {/* Copy text */}
            <button onClick={() => {
              try { navigator.clipboard.writeText(taskText) } catch {}
              setBoardCtxMenu(null)
            }} style={boardCtxBtn('#D0D8E8')}>
              Copy Text
            </button>
          </div>
        )
      })()}
    </div>
  )
}

function boardCtxBtn(color) {
  return {
    width: '100%', display: 'flex', alignItems: 'center',
    padding: '9px 14px',
    background: 'none', border: 'none', cursor: 'pointer',
    color, fontSize: 14, fontWeight: 500,
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: 'left',
    transition: 'background 80ms ease',
  }
}
