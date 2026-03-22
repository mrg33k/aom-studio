// TaskPanel.jsx -- extracted from GameHUD.jsx (god file split 4/6)
// Contains: TaskPanel component
// Pure extraction -- zero functionality changes.
// DONE(bobby): touch drag-to-reorder task list on iPad/mobile using Pointer Events API
// DONE(bobby): consistent checkbox list item spacing across all platforms (8-10px gap, 44px tap target)

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Check, GripVertical } from 'lucide-react'
import { AGENTS } from '../gridSpec.js'
import { PALETTE, HUD, IS_LOCAL } from './HUDConstants.jsx'
import { supabase } from '../lib/supabase.js'
import { getClientId } from '../lib/clientConfig.js'
import { useLongPress } from '../hooks/useLongPress.js'

// Fallback list used on localhost or if Supabase is unavailable
const SPRITE_AGENTS_FALLBACK = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

// DONE(bobby2): RIGHT NOW INLINE ADD TASK -- isAddPrompt tasks render as an inline text input. Enter adds to localStorage manual tasks. Manual tasks are right-clickable + checkable.
export function TaskPanel({ project, onClose, isNightMode, onAddManualTask, onToggleManualTask, onDeleteManualTask, allProjects, onTaskContextMenu, hudTaskCtxId, onNavigateToProject, highlightedTask, onDoneTaskAction, approvedTaskIds, pendingCompletion, onUndoMarkDone }) {
  const isDaytime = isNightMode === false
  // Daytime palette for the expanded task panel (brighter blue glass, vibrant accents)
  const tpBg = isDaytime ? 'rgba(18, 42, 75, 0.97)' : HUD.panelBg
  const tpBorder = isDaytime ? 'rgba(59, 130, 246, 0.3)' : HUD.panelBorder
  const tpShadow = isDaytime
    ? '0 -12px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(100,180,255,0.12)'
    : '0 -12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(100,180,255,0.08)'
  const tpDivider = isDaytime ? 'rgba(59, 130, 246, 0.18)' : HUD.divider
  const tpTextPrimary = isDaytime ? '#F1F5F9' : HUD.textPrimary
  const tpTextMuted = isDaytime ? '#94B8D8' : HUD.textMuted
  const tpGlow = isDaytime
    ? 'linear-gradient(180deg, rgba(59,130,246,0.12) 0%, transparent 100%)'
    : 'linear-gradient(180deg, rgba(100,180,255,0.05) 0%, transparent 100%)'
  const tpCheckboxBorder = isDaytime ? 'rgba(59,130,246,0.3)' : 'rgba(100,180,255,0.18)'
  const tpCheckboxBg = isDaytime ? 'rgba(59,130,246,0.12)' : 'rgba(100,180,255,0.03)'
  const tpCloseBg = isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(100,180,255,0.06)'
  const tpCloseHoverBg = isDaytime ? 'rgba(59,130,246,0.25)' : 'rgba(100,180,255,0.12)'
  const tpProgressBg = isDaytime ? 'rgba(59,130,246,0.12)' : 'rgba(100,180,255,0.06)'
  // Sprite agents: fetched from Supabase agent_status(has_sprite=true), falls back to static list
  const [spriteAgents, setSpriteAgents] = useState(SPRITE_AGENTS_FALLBACK)
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('agent_status')
      .select('slug')
      .eq('has_sprite', true)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setSpriteAgents(data.map(r => r.slug))
        }
      })
  }, [])

  // Local state for optimistic checkbox toggling
  const [localToggles, setLocalToggles] = useState({}) // task index -> toggled done state
  const [saving, setSaving] = useState(null) // which task index is saving
  // Inline add-task input state
  const [addingTask, setAddingTask] = useState(false)
  const [addTaskText, setAddTaskText] = useState('')
  const addTaskInputRef = useRef(null)
  // Swipe-to-dismiss (mobile): track touch start Y, swipe down > 60px = close
  const swipeStartY = useRef(0)
  const handleSwipeTouchStart = useCallback((e) => {
    swipeStartY.current = e.touches[0].clientY
  }, [])
  const handleSwipeTouchEnd = useCallback((e) => {
    const deltaY = e.changedTouches[0].clientY - swipeStartY.current
    if (deltaY > 60) onClose() // swipe down = dismiss
  }, [onClose])

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

  // Drag-to-reorder state: stores an ordered array of task keys, persists to Supabase + localStorage fallback
  // Only applies to the current pill's tasks (live tasks sort is per-pill)
  const DRAG_ORDER_KEY = project?.section ? `corner-task-order-${project.section}` : null
  const [dragOrder, setDragOrder] = useState(() => {
    if (!DRAG_ORDER_KEY) return null
    try { return JSON.parse(localStorage.getItem(DRAG_ORDER_KEY) || 'null') } catch { return null }
  })

  // On mount: load persisted order from Supabase (overrides localStorage if present)
  useEffect(() => {
    if (!supabase || !DRAG_ORDER_KEY || !project?.section) return
    const clientId = getClientId()
    supabase
      .from('task_orders')
      .select('ordered_keys')
      .eq('client_id', clientId)
      .eq('section', project.section)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.ordered_keys && Array.isArray(data.ordered_keys) && data.ordered_keys.length > 0) {
          setDragOrder(data.ordered_keys)
          try { localStorage.setItem(DRAG_ORDER_KEY, JSON.stringify(data.ordered_keys)) } catch {}
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.section])
  const [activeDragKey, setActiveDragKey] = useState(null) // key of the actively dragged row
  const [hoveredKey, setHoveredKey] = useState(null) // key of hovered row (for grip handle visibility)
  const dragStateRef = useRef({
    active: false,
    dragKey: null,    // key of the card being dragged
    startY: 0,
    pointerId: null,
  })
  const taskListRef = useRef(null)

  // Long-press state (single set of refs -- only one finger can long-press at a time)
  const lpTimerRef = useRef(null)
  const lpStartRef = useRef(null)
  const lpFiredRef = useRef(false)

  // Get the task key for drag ordering
  const getTaskKey = (task) => task.isManual ? `manual-${task.manualId}` : String(task.origIdx)

  // Build ordered task list (dragOrder overrides sortedTasks order)
  const orderedTasks = useMemo(() => {
    if (!dragOrder) return sortedTasks
    const keyMap = new Map(sortedTasks.map(t => [
      t.isManual ? `manual-${t.manualId}` : String(t.origIdx),
      t,
    ]))
    const result = []
    for (const k of dragOrder) {
      if (keyMap.has(k)) result.push(keyMap.get(k))
    }
    // Add any tasks not in dragOrder (e.g. newly added) at the end
    for (const t of sortedTasks) {
      const k = t.isManual ? `manual-${t.manualId}` : String(t.origIdx)
      if (!dragOrder.includes(k)) result.push(t)
    }
    return result
  }, [sortedTasks, dragOrder])

  // Get task row element Y position relative to list
  function getRowIndexAtY(listEl, clientY) {
    if (!listEl) return -1
    const rows = listEl.querySelectorAll('[data-task-row]')
    let best = -1
    let bestDist = Infinity
    rows.forEach((row, i) => {
      const rect = row.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const dist = Math.abs(clientY - midY)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    return best
  }

  const handleRowPointerDown = useCallback((e, task) => {
    // Skip add-prompt rows and live agent tasks (live tasks shouldn't be manually reordered)
    if (task.isAddPrompt || task.isLive) return

    const state = dragStateRef.current
    state.startY = e.clientY
    state.dragKey = getTaskKey(task)
    state.pointerId = e.pointerId
    state.active = false
  }, [])

  const handleRowPointerMove = useCallback((e) => {
    const state = dragStateRef.current
    if (!state.dragKey) return
    if (state.pointerId !== e.pointerId) return

    const dy = Math.abs(e.clientY - state.startY)
    if (dy > 8 && !state.active) {
      state.active = true
      setActiveDragKey(state.dragKey)
    }

    if (state.active) {
      e.stopPropagation() // prevent swipe-to-dismiss while reordering
      const listEl = taskListRef.current
      const overIdx = getRowIndexAtY(listEl, e.clientY)
      if (overIdx < 0) return

      const currentOrder = dragOrder || orderedTasks.map(getTaskKey)
      const fromIdx = currentOrder.indexOf(state.dragKey)
      if (fromIdx < 0 || fromIdx === overIdx) return

      // Reorder: move dragKey from fromIdx to overIdx
      const newOrder = [...currentOrder]
      newOrder.splice(fromIdx, 1)
      newOrder.splice(overIdx, 0, state.dragKey)
      setDragOrder(newOrder)
    }
  }, [dragOrder, orderedTasks])

  const handleRowPointerUp = useCallback((finalOrder) => {
    const state = dragStateRef.current
    const wasDragging = state.active
    state.active = false
    state.dragKey = null
    state.pointerId = null
    setActiveDragKey(null)
    if (wasDragging && finalOrder && DRAG_ORDER_KEY) {
      // Persist to localStorage (instant, device-local)
      try { localStorage.setItem(DRAG_ORDER_KEY, JSON.stringify(finalOrder)) } catch {}
      // Persist to Supabase (survives refresh, cross-device) -- fire-and-forget
      if (supabase && project?.section) {
        const clientId = getClientId()
        supabase
          .from('task_orders')
          .upsert(
            { client_id: clientId, section: project.section, ordered_keys: finalOrder, updated_at: new Date().toISOString() },
            { onConflict: 'client_id,section' }
          )
          .then(({ error }) => {
            if (error) console.warn('[Corner] task_orders upsert failed:', error.message)
          })
      }
    }
  }, [DRAG_ORDER_KEY, project?.section])

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
    <>
    <style>{`
      @keyframes taskApprovedGlow {
        0%   { box-shadow: inset 0 0 0 1px rgba(34,197,94,0.5), 0 0 10px rgba(34,197,94,0.35); }
        50%  { box-shadow: inset 0 0 0 1px rgba(34,197,94,0.9), 0 0 24px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.2); }
        100% { box-shadow: inset 0 0 0 1px rgba(34,197,94,0.5), 0 0 10px rgba(34,197,94,0.35); }
      }
      .task-approved-glow {
        animation: taskApprovedGlow 1.2s ease-in-out infinite;
      }
    `}</style>
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onTouchStart={handleSwipeTouchStart}
      onTouchEnd={handleSwipeTouchEnd}
      style={{
        position: 'absolute', bottom: '100%', left: 8, right: 8,
        background: tpBg,
        backdropFilter: 'blur(24px)',
        border: `2px solid ${tpBorder}`,
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
        maxHeight: 'min(380px, calc(100vh - 200px))',
        boxShadow: tpShadow,
      }}
    >
      {/* Drag handle (mobile swipe indicator) */}
      <div style={{
        display: 'flex', justifyContent: 'center', padding: '8px 0 4px',
        cursor: 'grab',
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: isDaytime ? 'rgba(59,130,246,0.25)' : 'rgba(100,180,255,0.2)',
        }} />
      </div>

      {/* Inner glow at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 50,
        background: tpGlow,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 10px',
        borderBottom: `1px solid ${tpDivider}`,
        position: 'relative',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 10, height: 10, borderRadius: 3, flexShrink: 0,
            background: project.color,
            boxShadow: `0 0 8px ${project.color}44`,
          }} />
          <span style={{
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 20, fontWeight: 900,
            color: tpTextPrimary,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {project.name}
          </span>
          {project.isCompletedFeed ? (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
              color: project.color, flexShrink: 0,
              background: `${project.color}18`, padding: '2px 8px', borderRadius: 5,
              letterSpacing: '0.04em',
            }}>
              {totalTasks} DONE
            </span>
          ) : (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
              color: tpTextMuted, flexShrink: 0,
            }}>
              {doneTasks}/{totalTasks}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Progress bar -- hidden for completed feed (always 100%, noise) */}
          {!project.isCompletedFeed && (
            <>
              <div style={{
                width: 80, height: 8, borderRadius: 4,
                background: tpProgressBg,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress}%`, height: '100%',
                  background: `linear-gradient(90deg, ${project.color}AA, ${project.color})`,
                  borderRadius: 4,
                  transition: 'width 300ms ease',
                }} />
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700,
                color: project.color,
                minWidth: 30,
              }}>
                {progress}%
              </span>
            </>
          )}

          <button
            onClick={onClose}
            style={{
              background: tpCloseBg, border: `1px solid ${tpDivider}`,
              borderRadius: 7, cursor: 'pointer',
              color: tpTextMuted,
              width: 32, height: 32, minWidth: 32, minHeight: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = tpCloseHoverBg; e.currentTarget.style.color = isDaytime ? '#8BA4C4' : HUD.textSecondary }}
            onMouseLeave={e => { e.currentTarget.style.background = tpCloseBg; e.currentTarget.style.color = tpTextMuted }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div
        ref={taskListRef}
        style={{
          padding: '4px 12px 12px',
          overflowY: 'auto', maxHeight: 300,
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          cursor: activeDragKey ? 'grabbing' : 'default',
        }}
        className="hud-scroll"
        onPointerMove={handleRowPointerMove}
        onPointerUp={() => handleRowPointerUp(dragOrder)}
        onPointerCancel={() => handleRowPointerUp(null)}
      >
        {orderedTasks.map((task, i) => {
          const isSaving = saving === task.origIdx

          // DONE(bobby2): isAddPrompt renders as inline input for adding manual tasks to Right Now
          if (task.isAddPrompt) {
            return (
              <motion.div
                key="add-prompt"
                data-task-row
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.15 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '4px 8px',
                  minHeight: 44,
                  borderBottom: i < orderedTasks.length - 1 ? `1px solid ${tpDivider}` : 'none',
                }}
              >
                {addingTask ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `1.5px solid rgba(255,107,61,0.4)`,
                      background: 'rgba(255,107,61,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: '#FF6B3D', fontSize: 14, fontWeight: 800, lineHeight: 1 }}>+</span>
                    </div>
                    <input
                      ref={addTaskInputRef}
                      autoFocus
                      value={addTaskText}
                      onChange={e => setAddTaskText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && addTaskText.trim()) {
                          onAddManualTask?.(addTaskText.trim())
                          setAddTaskText('')
                          setAddingTask(false)
                        }
                        if (e.key === 'Escape') {
                          setAddTaskText('')
                          setAddingTask(false)
                        }
                      }}
                      onBlur={() => {
                        if (addTaskText.trim()) {
                          onAddManualTask?.(addTaskText.trim())
                        }
                        setAddTaskText('')
                        setAddingTask(false)
                      }}
                      placeholder="Type a task, hit Enter..."
                      style={{
                        flex: 1,
                        background: isDaytime ? 'rgba(255,107,61,0.06)' : 'rgba(255,107,61,0.08)',
                        border: `1.5px solid rgba(255,107,61,0.3)`,
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 16, fontWeight: 500,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        color: tpTextPrimary,
                        outline: 'none',
                        caretColor: '#FF6B3D',
                      }}
                    />
                  </div>
                ) : (
                  <motion.div
                    onClick={() => setAddingTask(true)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, flex: 1,
                      cursor: 'pointer', padding: '4px 0',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `1.5px dashed rgba(255,107,61,0.35)`,
                      background: 'rgba(255,107,61,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: '#FF6B3D', fontSize: 14, fontWeight: 800, lineHeight: 1 }}>+</span>
                    </div>
                    <span style={{
                      fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 500,
                      color: isDaytime ? 'rgba(255,107,61,0.7)' : 'rgba(255,107,61,0.6)',
                      fontStyle: 'italic',
                    }}>
                      Add task...
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )
          }

          const taskKey = task.isManual ? `manual-${task.manualId}` : String(task.origIdx)
          const pcKey = task.taskId ? String(task.taskId) : task.text
          const isPending = !task.isManual && !!pendingCompletion?.[pcKey]
          // eslint-disable-next-line no-shadow
          const isDone = isPending ? true : getTaskDone(task, task.origIdx)
          const isDraggingThis = activeDragKey === taskKey
          const isDoneAwaiting = !!task.isDoneAwaitingApproval
          const isApproved = !!(task.taskId && approvedTaskIds?.has(String(task.taskId)))

          // Green palette overrides yellow when approved; yellow for awaiting approval
          const doneBg = isApproved ? 'rgba(34,197,94,0.18)' : isDoneAwaiting ? 'rgba(245,158,11,0.20)' : null
          const doneBorder = isApproved ? '3px solid #22C55E' : isDoneAwaiting ? '3px solid #F59E0B' : null

          return (
            <motion.div
              key={task.isManual ? `manual-${task.manualId}` : task.origIdx}
              data-task-row
              className={isApproved ? 'task-approved-glow' : undefined}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.15 }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (isDoneAwaiting) {
                  // Done tasks get approve/deny/clarify menu, not the generic task menu
                  onDoneTaskAction?.(e, task, project, 'menu')
                } else {
                  onTaskContextMenu?.(e, task, project)
                }
              }}
              onTouchStart={(e) => {
                if (e.touches.length !== 1) return
                const { clientX, clientY } = e.touches[0]
                lpFiredRef.current = false
                lpStartRef.current = { x: clientX, y: clientY }
                if (lpTimerRef.current) clearTimeout(lpTimerRef.current)
                lpTimerRef.current = setTimeout(() => {
                  lpFiredRef.current = true
                  const synth = { clientX, clientY, preventDefault: () => {}, stopPropagation: () => {} }
                  if (isDoneAwaiting) {
                    onDoneTaskAction?.(synth, task, project, 'menu')
                  } else {
                    onTaskContextMenu?.(synth, task, project)
                  }
                }, 500)
              }}
              onTouchMove={(e) => {
                if (!lpTimerRef.current || !lpStartRef.current) return
                const t = e.touches[0]
                const dx = Math.abs(t.clientX - lpStartRef.current.x)
                const dy = Math.abs(t.clientY - lpStartRef.current.y)
                if (dx > 10 || dy > 10) {
                  clearTimeout(lpTimerRef.current)
                  lpTimerRef.current = null
                }
              }}
              onTouchEnd={(e) => {
                if (lpTimerRef.current) { clearTimeout(lpTimerRef.current); lpTimerRef.current = null }
                if (lpFiredRef.current) { e.preventDefault(); lpFiredRef.current = false }
              }}
              onTouchCancel={() => {
                if (lpTimerRef.current) { clearTimeout(lpTimerRef.current); lpTimerRef.current = null }
              }}
              onPointerDown={(e) => handleRowPointerDown(e, task)}
              onMouseEnter={() => setHoveredKey(taskKey)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: project.isCompletedFeed ? '2px 8px' : '4px 8px',
                minHeight: project.isCompletedFeed ? 36 : 44,
                borderBottom: i < orderedTasks.length - 1 ? `1px solid ${tpDivider}` : 'none',
                opacity: project.isCompletedFeed ? 0.85 : isDone && !isDoneAwaiting ? 0.45 : isDraggingThis ? 0.5 : 1,
                transition: 'opacity 200ms ease, background 300ms ease, border-left 300ms ease',
                touchAction: 'pan-y',
                // iOS: suppress white tap-highlight and native long-press callout so the
                // custom context menu is the only visual feedback on long-press.
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                // Yellow background for done-awaiting-approval tasks
                background: isDoneAwaiting
                  ? doneBg
                  : isDraggingThis
                    ? (isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.12)')
                    : highlightedTask && task.text === highlightedTask.text
                      ? (isDaytime ? 'rgba(59,158,255,0.25)' : 'rgba(59,158,255,0.2)')
                      : hudTaskCtxId === (task.isManual ? `manual-${task.manualId}` : task.origIdx)
                        ? (isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.15)')
                        : 'transparent',
                borderLeft: isDoneAwaiting
                  ? doneBorder
                  : isDraggingThis
                    ? `3px solid ${project.color || '#3B82F6'}`
                    : highlightedTask && task.text === highlightedTask.text
                      ? `3px solid ${project.color || '#3B9EFF'}`
                      : hudTaskCtxId === (task.isManual ? `manual-${task.manualId}` : task.origIdx)
                        ? `3px solid ${project.color || '#3B82F6'}`
                        : '3px solid transparent',
                boxShadow: isApproved ? undefined : isDoneAwaiting ? 'inset 0 0 0 1px rgba(245,158,11,0.55), 0 2px 12px rgba(245,158,11,0.20)' : 'none',
                borderRadius: (isDoneAwaiting || isApproved) ? 6 : 0,
              }}
            >
              {/* Drag handle -- hidden for completed feed (log, not reorderable) */}
              {!task.isLive && !project.isCompletedFeed && (
                <div style={{
                  flexShrink: 0,
                  opacity: hoveredKey === taskKey || isDraggingThis ? 0.45 : 0.12,
                  transition: 'opacity 100ms ease',
                  cursor: isDraggingThis ? 'grabbing' : 'grab',
                  display: 'flex', alignItems: 'center',
                  touchAction: 'none',
                }}>
                  <GripVertical size={12} color={tpTextMuted} />
                </div>
              )}

              {/* Checkbox - CLICKABLE (44px touch target via wrapper div). Non-interactive for completed feed log. */}
              <div style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div
                  onClick={project.isCompletedFeed ? undefined : () => {
                    if (task.isManual) {
                      onToggleManualTask?.(task.manualId)
                    } else {
                      toggleTask(task, task.origIdx)
                    }
                  }}
                  whileHover={project.isCompletedFeed ? undefined : { scale: 1.15 }}
                  whileTap={project.isCompletedFeed ? undefined : { scale: 0.85 }}
                  style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: isDone ? 'none' : `1.5px solid ${tpCheckboxBorder}`,
                    background: isDone ? (task.autoChecked ? '#22C55E' : project.color) : tpCheckboxBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 150ms ease',
                    cursor: project.isCompletedFeed ? 'default' : 'pointer',
                    opacity: isSaving ? 0.5 : 1,
                    boxShadow: task.autoChecked ? '0 0 8px rgba(34,197,94,0.4)' : 'none',
                  }}>
                  {isDone && <Check size={12} color="#FFF" strokeWidth={3} />}
                </motion.div>
              </div>

              {/* Task text - Clickable if task has a project link. */}
              <span
                onClick={() => {
                  if (task.projectSource || task.projectSection) {
                    onNavigateToProject?.(task)
                  }
                }}
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 400,
                  color: project.isCompletedFeed ? tpTextPrimary : isDone ? tpTextMuted : tpTextPrimary,
                  lineHeight: 1.4,
                  textDecoration: project.isCompletedFeed ? 'none' : isDone ? 'line-through' : 'none',
                  flex: 1,
                  minWidth: 0,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  cursor: (task.projectSource || task.projectSection) ? 'pointer' : 'default',
                }}
              >
                {task.text}
                {/* Project source badge - shows which project this task lives in */}
                {(task.projectSource || task.projectSection) && !isDone && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginLeft: 8, verticalAlign: 'middle',
                    fontSize: 10, fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: task.projectColor || '#60A5FA',
                    background: `${task.projectColor || '#60A5FA'}15`,
                    border: `1px solid ${task.projectColor || '#60A5FA'}30`,
                    borderRadius: 4, padding: '1px 6px',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    opacity: 0.8,
                  }}>
                    {task.projectSource || task.projectSection}
                  </span>
                )}
              </span>

              {/* QUEUED badge for tasks waiting in queue (fuschia) */}
              {task.isQueued && (
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, fontWeight: 800,
                  color: '#E91E90',
                  background: 'rgba(233,30,144,0.12)',
                  padding: '2px 6px', borderRadius: 4,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(233,30,144,0.25)',
                  flexShrink: 0,
                  animation: 'statusPulse 2s ease-in-out infinite',
                }}>
                  QUEUED
                </span>
              )}

              {/* UNDO button -- 30s window after user marks a task done */}
              {isPending && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUndoMarkDone?.(pcKey) }}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9, fontWeight: 800,
                    color: '#60A5FA',
                    background: 'rgba(96,165,250,0.12)',
                    padding: '2px 7px', borderRadius: 4,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(96,165,250,0.35)',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  UNDO
                </button>
              )}

              {/* DONE badge for tasks awaiting approval (yellow) */}
              {isDoneAwaiting && (
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, fontWeight: 800,
                  color: '#FBBF24',
                  background: 'rgba(245,158,11,0.28)',
                  padding: '2px 6px', borderRadius: 4,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: '1px solid #F59E0B',
                  flexShrink: 0,
                  animation: 'statusPulse 2s ease-in-out infinite',
                }}>
                  DONE
                </span>
              )}

              {/* LIVE badge for actively working tasks (orange) */}
              {task.isLive && !task.isQueued && !isDoneAwaiting && (
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, fontWeight: 800,
                  color: '#FF6B3D',
                  background: 'rgba(255,107,61,0.12)',
                  padding: '2px 6px', borderRadius: 4,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255,107,61,0.25)',
                  flexShrink: 0,
                  animation: 'statusPulse 2s ease-in-out infinite',
                }}>
                  LIVE
                </span>
              )}

              {/* Agent badge */}
              {task.agent && (() => {
                const a = AGENTS.find(x => x.slug === task.agent)
                const hasSpr = task.agent && spriteAgents.includes(task.agent)
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
    </>
  )
}
