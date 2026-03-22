// BoardView.jsx -- Full Trello/Kanban view for Corner dashboard
// Columns: one per agent + one per project + Right Now + Completed
// Features: filter bar, search, horizontal scroll, drag-and-drop between columns
// Data source: pipeData from useDataPipe hook (rightNow, completedFeed, punchData)
// DONE(bobby): touch drag-and-drop for iPad/mobile using Pointer Events API

import { useState, useRef, useCallback, useMemo, useEffect, Fragment } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AGENTS, PROJECTS } from './gridSpec.js'
import TaskContextMenu, { handleTaskContextAction } from './components/TaskContextMenu.jsx'
import TaskDetailAccordion from './components/TaskDetailAccordion.jsx'

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


// ── COLUMN TOUCH GHOST ──────────────────────────────────────────────────────
// Floating pill badge that follows the finger during touch column drag.
function createColGhost(colKey) {
  removeColGhost()
  const cfg = ALL_COLS[colKey] || { label: colKey, color: '#6B7280' }
  const ghost = document.createElement('div')
  ghost.id = 'board-col-ghost'
  ghost.textContent = cfg.label
  ghost.style.cssText = [
    'position:fixed',
    'left:-200px',
    'top:-200px',
    'pointer-events:none',
    'z-index:99999',
    `background:${cfg.color}22`,
    `border:2px solid ${cfg.color}`,
    'border-radius:20px',
    'padding:6px 14px',
    `color:${cfg.color}`,
    'font-family:Inter,system-ui,sans-serif',
    'font-size:12px',
    'font-weight:800',
    'text-transform:uppercase',
    'letter-spacing:0.08em',
    'white-space:nowrap',
    'box-shadow:0 4px 24px rgba(0,0,0,0.5)',
    'transform:scale(1.06)',
  ].join(';')
  document.body.appendChild(ghost)
}

function moveColGhost(x, y) {
  const ghost = document.getElementById('board-col-ghost')
  if (!ghost) return
  const w = ghost.getBoundingClientRect().width || 80
  ghost.style.left = `${x - w / 2}px`
  ghost.style.top = `${y - 32}px`
}

function removeColGhost() {
  const el = document.getElementById('board-col-ghost')
  if (el) el.remove()
}

// ── BOARD CARD ──────────────────────────────────────────────────────────────

function BoardCard({ entry, columnKey, onDragStart, onDragEnd, isDragging, taskIndex, onContextMenu, onTouchDrop, onDragOverCard, isNightMode = true, isExpanded, onExpand, onTaskTap }) {
  const agentSlug = entry.agent?.toLowerCase()
  const agentColor = getAgentColor(agentSlug)
  const taskText = entry.text || entry.description || entry.currentTask || 'No task'
  const agentName = entry.agent ? getAgentName(agentSlug) : null
  const projectTag = entry.project || null
  const cardRef = useRef(null)

  // Night/day card colors -- blue glass
  const cardBg = isNightMode ? 'rgba(15,45,140,0.22)' : 'rgba(30,80,220,0.28)'
  const cardBgExpanded = isNightMode ? 'rgba(25,65,170,0.35)' : 'rgba(40,100,255,0.38)'
  const cardBorder = isNightMode ? 'rgba(60,120,255,0.22)' : 'rgba(80,150,255,0.45)'
  const cardBorderExpanded = isNightMode ? 'rgba(80,150,255,0.45)' : 'rgba(100,180,255,0.65)'
  const cardHoverBg = isNightMode ? 'rgba(20,60,180,0.32)' : 'rgba(40,100,255,0.40)'
  const cardTextColor = isNightMode ? '#F1F5F9' : '#EEF4FF'

  // Track if a mouse HTML5 drag happened -- prevents onClick from expanding after drag
  const didMouseDragRef = useRef(false)

  // Pointer-based drag (works for both mouse and touch)
  const pointerDragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    pointerId: null,
    longPressTimer: null,
    inColInsertIdx: null,
  })

  // Only show agent badge if it differs from the column we're in
  const showAgentBadge = agentName && agentSlug !== columnKey

  const handlePointerDown = useCallback((e) => {
    // Mouse drag is handled by HTML5 drag API. Pointer events are for touch/pen only.
    if (e.pointerType === 'mouse') return
    // Capture pointer so move/up events fire even when finger leaves the card bounds
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
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
      onDragStart?.()
    }

    if (state.active) {
      e.preventDefault()

      // Highlight drop target column
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const colEl = el?.closest('[data-board-col]')
      const allCols = document.querySelectorAll('[data-board-col]')
      allCols.forEach(c => c.setAttribute('data-drop-hover', c === colEl ? '1' : '0'))

      // Compute within-column insert position for reorder feedback
      const toCol = colEl?.getAttribute('data-board-col')
      if (toCol === columnKey) {
        const cardEls = [...(colEl?.querySelectorAll('[data-board-card-idx]') || [])]
        let insertIdx = cardEls.length
        for (const cardEl of cardEls) {
          const r = cardEl.getBoundingClientRect()
          if (e.clientY < r.top + r.height / 2) {
            insertIdx = parseInt(cardEl.getAttribute('data-board-card-idx'))
            break
          }
        }
        state.inColInsertIdx = insertIdx
        onDragOverCard?.(insertIdx)
      } else {
        state.inColInsertIdx = null
        onDragOverCard?.(null)
      }
    }
  }, [onDragStart, onDragOverCard, columnKey])

  const handlePointerUp = useCallback((e) => {
    const state = pointerDragRef.current
    clearTimeout(state.longPressTimer)

    if (state.active) {
      // Find drop target column
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const colEl = el?.closest('[data-board-col]')
      if (colEl) {
        const toCol = colEl.getAttribute('data-board-col')
        if (toCol) {
          if (toCol !== columnKey) {
            // Cross-column drop
            onTouchDrop?.(toCol, { entry, fromCol: columnKey, taskIndex })
          } else {
            // Same-column: within-column reorder
            onTouchDrop?.(toCol, { entry, fromCol: columnKey, taskIndex, insertIdx: state.inColInsertIdx })
          }
        }
      }
      // Clear hover state
      document.querySelectorAll('[data-board-col]').forEach(c => c.removeAttribute('data-drop-hover'))
      onDragOverCard?.(null)
      onDragEnd?.()
    } else if (!state.moved && state.pointerId !== null) {
      // Clean tap (no drag) -- open task detail sheet on mobile, inline expand on desktop
      if (onTaskTap) {
        onTaskTap(
          {
            text: entry.text || entry.description || entry.currentTask || 'No task',
            agent: entry.agent || null,
            done: entry.done === true || entry.status === 'completed',
            isLive: entry.isLive || entry.status === 'active',
            note: entry.note || entry.context || '',
            id: entry.taskId || entry.id || null,
          },
          {
            name: ALL_COLS[columnKey]?.label || columnKey,
            color: ALL_COLS[columnKey]?.color || '#6B7280',
          }
        )
      } else {
        onExpand?.()
      }
    }

    state.active = false
    state.moved = false
    state.pointerId = null
    state.inColInsertIdx = null
  }, [entry, columnKey, taskIndex, onTouchDrop, onDragEnd, onDragOverCard, onExpand, onTaskTap])

  const handlePointerCancel = useCallback(() => {
    const state = pointerDragRef.current
    clearTimeout(state.longPressTimer)
    document.querySelectorAll('[data-board-col]').forEach(c => c.removeAttribute('data-drop-hover'))
    if (state.active) {
      onDragOverCard?.(null)
      onDragEnd?.()
    }
    state.active = false
    state.moved = false
    state.pointerId = null
    state.inColInsertIdx = null
  }, [onDragEnd, onDragOverCard])

  // Build the task object expected by TaskDetailAccordion
  const accordionTask = {
    text: taskText,
    agent: entry.agent || null,
    done: entry.done === true || entry.status === 'completed',
    isLive: entry.isLive || entry.status === 'active',
    note: entry.note || entry.context || '',
    id: entry.taskId || entry.id || null,
  }
  const accordionProject = {
    name: ALL_COLS[columnKey]?.label || columnKey,
    color: ALL_COLS[columnKey]?.color || '#6B7280',
  }

  return (
    <div style={{ marginBottom: isExpanded ? 10 : 7 }}>
      <div
        ref={cardRef}
        data-board-card-idx={taskIndex}
        draggable
        onDragStart={(e) => {
          didMouseDragRef.current = true
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', JSON.stringify({ entry, fromCol: columnKey, taskIndex }))
          // Suppress browser drag ghost -- insertion line is the only drag feedback
          const ghost = document.createElement('div')
          ghost.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px'
          document.body.appendChild(ghost)
          e.dataTransfer.setDragImage(ghost, 0, 0)
          setTimeout(() => ghost.remove(), 0)
          onDragStart?.()
        }}
        onDragEnd={() => {
          onDragEnd?.()
          // Reset after a tick so the onClick that fires after dragEnd doesn't trigger expand
          setTimeout(() => { didMouseDragRef.current = false }, 0)
        }}
        onClick={() => {
          // Mouse tap: expand only if no drag happened
          if (didMouseDragRef.current) { didMouseDragRef.current = false; return }
          onExpand?.()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu?.({ x: e.clientX, y: e.clientY, entry, columnKey })
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          background: isExpanded ? cardBgExpanded : cardBg,
          border: `1px solid ${isExpanded ? cardBorderExpanded : cardBorder}`,
          borderLeft: `3px solid ${agentColor}`,
          borderRadius: isExpanded ? '8px 8px 0 0' : 8,
          padding: '10px 12px',
          transition: 'background 150ms ease, box-shadow 150ms ease, border-radius 100ms ease',
          cursor: 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
        }}
        onMouseEnter={e => {
          if (!isDragging && !isExpanded) {
            e.currentTarget.style.background = cardHoverBg
            e.currentTarget.style.boxShadow = `0 0 0 1px ${agentColor}30`
          }
        }}
        onMouseLeave={e => {
          if (!isExpanded) {
            e.currentTarget.style.background = cardBg
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: cardTextColor,
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
                color: isNightMode ? 'rgba(140,180,255,0.7)' : 'rgba(160,200,255,0.85)',
                background: isNightMode ? 'rgba(30,70,180,0.2)' : 'rgba(60,130,255,0.18)',
                border: `1px solid ${isNightMode ? 'rgba(80,130,255,0.28)' : 'rgba(100,160,255,0.35)'}`,
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

      {/* Inline task detail accordion */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <TaskDetailAccordion
              task={accordionTask}
              project={accordionProject}
              isNightMode={isNightMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
  isNightMode = true,
  expandedCardId,
  onExpandCard,
  onTaskTap,
}) {
  const config = ALL_COLS[colKey] || { label: colKey, color: '#6B7280', type: 'other' }
  const dragInsertRef = useRef(null)
  const [touchHover, setTouchHover] = useState(false)
  const [cardInsertIdx, setCardInsertIdx] = useState(null)

  // Touch column drag (pointer events -- handles iPad/mobile where HTML5 drag API doesn't work)
  const colGripPointerRef = useRef({ active: false, moved: false, startX: 0, startY: 0, pointerId: null })

  const handleColGripDown = useCallback((e) => {
    if (e.pointerType === 'mouse') return // mouse uses HTML5 drag
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    const s = colGripPointerRef.current
    s.startX = e.clientX; s.startY = e.clientY
    s.pointerId = e.pointerId; s.active = false; s.moved = false
  }, [])

  const handleColGripMove = useCallback((e) => {
    const s = colGripPointerRef.current
    if (s.pointerId === null || e.pointerId !== s.pointerId) return
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY
    if (Math.sqrt(dx * dx + dy * dy) > 8 && !s.active) {
      s.active = true; s.moved = true
      onColDragStart?.(colKey)
      createColGhost(colKey)
    }
    if (s.active) {
      moveColGhost(e.clientX, e.clientY)
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const targetColEl = el?.closest('[data-board-col]')
      const toKey = targetColEl?.getAttribute('data-board-col')
      if (toKey && toKey !== colKey) {
        const rect = targetColEl.getBoundingClientRect()
        const side = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
        onColDragOver?.(toKey, side)
      } else {
        onColDragOver?.(null, null)
      }
    }
  }, [colKey, onColDragStart, onColDragOver])

  const handleColGripUp = useCallback((e) => {
    const s = colGripPointerRef.current
    if (s.pointerId === null || e.pointerId !== s.pointerId) return
    if (s.active) {
      removeColGhost()
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const targetColEl = el?.closest('[data-board-col]')
      const toKey = targetColEl?.getAttribute('data-board-col')
      if (toKey) {
        onColDrop?.(toKey)
      } else {
        onColDragEnd?.()
      }
      document.querySelectorAll('[data-board-col]').forEach(c => c.removeAttribute('data-drop-hover'))
    }
    s.active = false; s.moved = false; s.pointerId = null
  }, [onColDrop, onColDragEnd])

  const handleColGripCancel = useCallback(() => {
    const s = colGripPointerRef.current
    if (s.active) {
      removeColGhost()
      onColDragEnd?.()
      document.querySelectorAll('[data-board-col]').forEach(c => c.removeAttribute('data-drop-hover'))
    }
    s.active = false; s.moved = false; s.pointerId = null
  }, [onColDragEnd])

  // Night/day column colors -- blue glass
  const colBodyBg = isNightMode
    ? 'rgba(20,50,130,0.28)'
    : 'rgba(25,70,200,0.35)'
  const colBodyHoverBg = isNightMode
    ? `${config.color}20`
    : `${config.color}38`
  const emptyTextColor = isNightMode ? 'rgba(80,120,200,0.5)' : 'rgba(140,190,255,0.55)'

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
    // Compute card insert position for within-column reorder indicator
    const cardEls = [...(dragInsertRef.current?.querySelectorAll('[data-board-card-idx]') || [])]
    let insertIdx = cardEls.length
    for (const cardEl of cardEls) {
      const r = cardEl.getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) {
        insertIdx = parseInt(cardEl.getAttribute('data-board-card-idx'))
        break
      }
    }
    setCardInsertIdx(insertIdx)
  }, [colKey, onDragOver, onColDragOver])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('application/x-board-col')) {
      onColDrop?.(colKey)
      setCardInsertIdx(null)
      return
    }
    const raw = e.dataTransfer.getData('text/plain')
    try {
      const payload = JSON.parse(raw)
      if (payload.fromCol === colKey) {
        // Within-column reorder (HTML5 drag)
        const texts = sortedCards.map(c => c.text)
        const fromIdx = texts.indexOf(payload.entry.text)
        if (fromIdx !== -1) texts.splice(fromIdx, 1)
        const insertAt = Math.min(cardInsertIdx ?? texts.length, texts.length)
        texts.splice(insertAt, 0, payload.entry.text)
        onTaskReorder?.(texts)
      } else {
        // Cross-column drop -- pass cardInsertIdx so parent can position card correctly
        onDrop(colKey, { ...payload, insertIdx: cardInsertIdx })
      }
    } catch {}
    setCardInsertIdx(null)
  }, [colKey, onDrop, onColDrop, sortedCards, cardInsertIdx, onTaskReorder])

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
          setCardInsertIdx(null)
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
        background: isNightMode ? `${config.color}14` : `${config.color}22`,
        border: `2px solid ${isHighlighted ? config.color : `${config.color}50`}`,
        borderRadius: '10px 10px 0 0',
        padding: '9px 14px',
        transition: 'border-color 150ms ease',
      }}>
        {/* Grip handle -- HTML5 drag for mouse, pointer events for touch/iPad */}
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-board-col', colKey)
            e.dataTransfer.effectAllowed = 'move'
            e.stopPropagation()
            onColDragStart?.(colKey)
          }}
          onDragEnd={() => onColDragEnd?.()}
          onPointerDown={handleColGripDown}
          onPointerMove={handleColGripMove}
          onPointerUp={handleColGripUp}
          onPointerCancel={handleColGripCancel}
          style={{ cursor: 'grab', touchAction: 'none', color: 'rgba(150,190,255,0.5)', display: 'flex', alignItems: 'center', padding: '0 2px 0 0', flexShrink: 0 }}
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
          background: isHighlighted ? colBodyHoverBg : colBodyBg,
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
            color: emptyTextColor,
            textAlign: 'center',
            paddingTop: 20,
            fontStyle: 'italic',
          }}>
            {isHighlighted ? 'Drop here' : 'Nothing here'}
          </div>
        ) : (
          <>
            {sortedCards.map((card, i) => (
              <Fragment key={`${colKey}-${card.text?.slice(0, 20)}-${i}`}>
                {cardInsertIdx === i && (
                  <div style={{ height: 3, background: '#3B82F6', borderRadius: 2, marginBottom: 6, pointerEvents: 'none', boxShadow: '0 0 6px rgba(59,130,246,0.8)' }} />
                )}
                <BoardCard
                  entry={card}
                  columnKey={colKey}
                  taskIndex={i}
                  isDragging={draggingKey === `${colKey}-${i}`}
                  onDragStart={() => onCardDragStart(`${colKey}-${i}`)}
                  onDragEnd={() => { setCardInsertIdx(null); onCardDragEnd() }}
                  onContextMenu={(ctx) => onContextMenu?.(ctx)}
                  onDragOverCard={(idx) => setCardInsertIdx(idx)}
                  isNightMode={isNightMode}
                  isExpanded={expandedCardId === card._id}
                  onExpand={() => onExpandCard?.(card._id)}
                  onTaskTap={onTaskTap}
                  onTouchDrop={(toCol, payload) => {
                    if (toCol === colKey && payload.insertIdx !== undefined) {
                      // Same-column pointer drag reorder
                      const texts = sortedCards.map(c => c.text)
                      const fromIdx = texts.indexOf(payload.entry.text)
                      if (fromIdx !== -1) texts.splice(fromIdx, 1)
                      const insertAt = Math.min(payload.insertIdx ?? texts.length, texts.length)
                      texts.splice(insertAt, 0, payload.entry.text)
                      onTaskReorder?.(texts)
                      setCardInsertIdx(null)
                    } else {
                      onTouchDrop(toCol, payload)
                    }
                  }}
                />
              </Fragment>
            ))}
            {cardInsertIdx === sortedCards.length && (
              <div style={{ height: 3, background: '#3B82F6', borderRadius: 2, marginTop: 4, pointerEvents: 'none', boxShadow: '0 0 6px rgba(59,130,246,0.8)' }} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── FILTER TOGGLE PILL ──────────────────────────────────────────────────────

function FilterPill({ label, active, color, onClick, isNightMode = true }) {
  const inactiveBg = isNightMode ? 'rgba(255,255,255,0.04)' : 'rgba(60,130,255,0.12)'
  const inactiveBorder = isNightMode ? 'rgba(255,255,255,0.1)' : 'rgba(100,170,255,0.28)'
  const inactiveText = isNightMode ? '#64748B' : '#8BBCE8'
  const hoverBg = isNightMode ? 'rgba(255,255,255,0.07)' : 'rgba(60,130,255,0.22)'
  const hoverBorder = isNightMode ? 'rgba(255,255,255,0.2)' : 'rgba(100,170,255,0.45)'
  const hoverText = isNightMode ? '#94A3B8' : '#BDDEFF'

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
        background: active ? `${color}22` : inactiveBg,
        border: `1.5px solid ${active ? color : inactiveBorder}`,
        color: active ? color : inactiveText,
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
          e.currentTarget.style.background = hoverBg
          e.currentTarget.style.borderColor = hoverBorder
          e.currentTarget.style.color = hoverText
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = inactiveBg
          e.currentTarget.style.borderColor = inactiveBorder
          e.currentTarget.style.color = inactiveText
        }
      }}
    >
      {label}
    </button>
  )
}

// ── MAIN BOARD VIEW ─────────────────────────────────────────────────────────

export default function BoardView({ pipeData, isMobile, isNightMode = true, hudHeight = 60, onTaskTap, onViewDetail }) {
  const rightNow = pipeData?.rightNow || []
  const completedFeed = pipeData?.completedFeed || []
  const punchData = pipeData?.punchData

  // Filter state: which types are visible
  const [showStatus, setShowStatus] = useState(true)
  const [showAgents, setShowAgents] = useState(true)
  const [showProjects, setShowProjects] = useState(true)

  // Hide empty columns toggle
  const [hideEmpty, setHideEmpty] = useState(false)

  // Search
  const [search, setSearch] = useState('')
  const searchInputRef = useRef(null)

  // Board scroll container ref (for auto-scroll during drag)
  const boardScrollRef = useRef(null)

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

  const [expandedCardId, setExpandedCardId] = useState(null)
  const [colDragging, setColDragging] = useState(null) // colKey being dragged
  const [colDragInsert, setColDragInsert] = useState(null) // { targetKey, side: 'before'|'after' }

  // Drag state
  const [draggingCard, setDraggingCard] = useState(null) // key like "rightnow-0"
  const [dropTargetCol, setDropTargetCol] = useState(null)

  // Context menu state -- { position: {x,y}, task } -- drives shared TaskContextMenu (Supabase-driven)
  const [boardCtxMenu, setBoardCtxMenu] = useState(null)

  // Map a board entry to the task shape expected by TaskContextMenu
  const entryToTask = useCallback((entry, columnKey) => ({
    text: entry?.text || entry?.description || entry?.currentTask || '',
    id: entry?.taskId || entry?.id || null,
    _id: entry?._id || null,   // board-local card ID for optimistic column moves
    agent: entry?.agent || null,
    projectSection: entry?.project || columnKey || null,
    done: entry?.done === true || entry?.status === 'completed',
    status: entry?.status,
    rightNow: entry?.status === 'active',
    priority: entry?.priority || null,
    note: entry?.note || entry?.context || '',
  }), [])

  const handleContextAction = useCallback((action, task, payload) => {
    if (action === 'viewDetail') {
      onViewDetail?.(task)
      setBoardCtxMenu(null)
      return
    }
    // Optimistic column moves so the card shifts immediately (data pipe catches up in 3-10s)
    if (task._id) {
      if (action === 'markDone') {
        setCardOverrides(prev => ({
          ...prev,
          [task._id]: { toCol: 'completed', card: { ...task, done: true, status: 'completed', _id: task._id } },
        }))
      } else if (action === 'addToRightNow') {
        setCardOverrides(prev => ({
          ...prev,
          [task._id]: { toCol: 'rightnow', card: { ...task, status: 'active', isLive: true, _id: task._id } },
        }))
      }
    }
    setBoardCtxMenu(null)
    handleTaskContextAction(action, task, payload, null)
  }, [onViewDetail, setCardOverrides])

  // Persist column order to localStorage
  useEffect(() => {
    try { localStorage.setItem('corner-board-col-order', JSON.stringify(colOrder)) } catch {}
  }, [colOrder])

  // Per-column task order (for within-column reordering) -- persisted to localStorage
  const [taskOrders, setTaskOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('corner-board-task-orders') || '{}') } catch { return {} }
  })

  const saveTaskOrders = useCallback((orders) => {
    setTaskOrders(orders)
    try { localStorage.setItem('corner-board-task-orders', JSON.stringify(orders)) } catch {}
  }, [])

  // ── Keyboard shortcut: '/' to focus search, 'Escape' to clear ──────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase()
      const isEditable = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable

      if (e.key === '/' && !isEditable) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearch('')
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Auto-scroll during drag ─────────────────────────────────────────────
  useEffect(() => {
    const isDragging = draggingCard !== null || colDragging !== null
    if (!isDragging) return

    const container = boardScrollRef.current
    if (!container) return

    let rafId = null
    let lastX = null

    const handlePointerMove = (e) => {
      lastX = e.clientX
    }

    const scroll = () => {
      if (lastX === null) {
        rafId = requestAnimationFrame(scroll)
        return
      }
      const rect = container.getBoundingClientRect()
      const EDGE = 80
      const leftDist = lastX - rect.left
      const rightDist = rect.right - lastX

      if (leftDist < EDGE && leftDist >= 0) {
        // Near left edge -- scroll left; closer = faster (max ~12px/frame)
        const speed = Math.round((1 - leftDist / EDGE) * 12)
        container.scrollLeft -= speed
      } else if (rightDist < EDGE && rightDist >= 0) {
        // Near right edge -- scroll right
        const speed = Math.round((1 - rightDist / EDGE) * 12)
        container.scrollLeft += speed
      }
      rafId = requestAnimationFrame(scroll)
    }

    container.addEventListener('pointermove', handlePointerMove)
    rafId = requestAnimationFrame(scroll)

    return () => {
      container.removeEventListener('pointermove', handlePointerMove)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [draggingCard, colDragging])

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

      // Hide empty columns when toggle is on and no search is active
      if (hideEmpty && !search.trim()) {
        const cards = cardMap[key] || []
        if (cards.length === 0) return false
      }

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
  }, [colOrder, showStatus, showAgents, showProjects, hideEmpty, search, cardMap])

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

  const bgColor = isNightMode ? '#060E1C' : '#0A2060'
  const toolbarBorderColor = isNightMode ? 'rgba(255,255,255,0.06)' : 'rgba(80,150,255,0.20)'
  const dividerColor = isNightMode ? 'rgba(255,255,255,0.08)' : 'rgba(80,150,255,0.20)'
  const colCountColor = isNightMode ? '#334155' : '#88B8E8'

  // Scroll shadow gradient (fades from bg to transparent at each edge)
  const shadowLeft = `linear-gradient(to right, ${bgColor}, transparent)`
  const shadowRight = `linear-gradient(to left, ${bgColor}, transparent)`

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      top: 0,
      background: bgColor,
      paddingTop: topPadding,
      paddingBottom: hudHeight + 12,
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
        borderBottom: `1px solid ${toolbarBorderColor}`,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {/* Filter pills */}
        <FilterPill
          label="Status"
          active={showStatus}
          color="#F97316"
          onClick={() => setShowStatus(s => !s)}
          isNightMode={isNightMode}
        />
        <FilterPill
          label="Agents"
          active={showAgents}
          color="#3B82F6"
          onClick={() => setShowAgents(s => !s)}
          isNightMode={isNightMode}
        />
        <FilterPill
          label="Projects"
          active={showProjects}
          color="#22C55E"
          onClick={() => setShowProjects(s => !s)}
          isNightMode={isNightMode}
        />
        <FilterPill
          label="Hide Empty"
          active={hideEmpty}
          color="#4A90D9"
          onClick={() => setHideEmpty(v => !v)}
          isNightMode={isNightMode}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: dividerColor, flexShrink: 0 }} />

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: isNightMode ? 'rgba(255,255,255,0.05)' : 'rgba(60,130,255,0.12)',
          border: `1.5px solid ${isNightMode ? 'rgba(255,255,255,0.1)' : 'rgba(100,170,255,0.25)'}`,
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
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cards... (/)"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#EEF4FF',
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
          color: colCountColor,
          flexShrink: 0,
          marginLeft: 'auto',
          whiteSpace: 'nowrap',
        }}>
          {visibleColKeys.length} columns
        </span>
      </div>

      {/* ── KANBAN BOARD: horizontal scroll with shadow indicators ───── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Left scroll shadow */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 32,
          background: shadowLeft,
          zIndex: 10,
          pointerEvents: 'none',
        }} />
        {/* Right scroll shadow */}
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 32,
          background: shadowRight,
          zIndex: 10,
          pointerEvents: 'none',
        }} />

        <div
          ref={boardScrollRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            padding: isMobile ? '12px' : '16px 20px',
            overflowX: 'auto',
            overflowY: 'hidden',
            alignItems: 'stretch',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(59,130,246,0.2) transparent',
            WebkitOverflowScrolling: 'touch',
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
              onContextMenu={(ctx) => setBoardCtxMenu({ position: { x: ctx.x, y: ctx.y }, task: entryToTask(ctx.entry, ctx.columnKey) })}
              onTouchDrop={handleCardTouchDrop}
              isColDragging={colDragging === key}
              colDragInsertSide={colDragInsert?.targetKey === key ? colDragInsert.side : null}
              onColDragStart={handleColDragStart}
              onColDragOver={handleColDragOver}
              onColDrop={handleColDrop}
              onColDragEnd={handleColDragEnd}
              isNightMode={isNightMode}
              expandedCardId={expandedCardId}
              onExpandCard={(id) => setExpandedCardId(prev => prev === id ? null : id)}
              onTaskTap={onTaskTap}
            />
          ))}

          {visibleColKeys.length === 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isNightMode ? '#334155' : '#94A3B8',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 14,
              fontStyle: 'italic',
            }}>
              {search ? 'No cards match your search' : 'No columns visible -- turn on a filter above'}
            </div>
          )}
        </div>
      </div>

      {/* Board card context menu -- shared Supabase-driven component */}
      <AnimatePresence>
        {boardCtxMenu && (
          <TaskContextMenu
            key="board-ctx"
            position={boardCtxMenu.position}
            task={boardCtxMenu.task}
            onClose={() => setBoardCtxMenu(null)}
            onAction={handleContextAction}
            isNightMode={isNightMode}
            projects={[]}
            showViewDetail={true}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
