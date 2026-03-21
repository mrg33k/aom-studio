// TaskPanel.jsx -- extracted from GameHUD.jsx (god file split 4/6)
// Contains: TaskPanel component
// Pure extraction -- zero functionality changes.

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { AGENTS } from '../gridSpec.js'
import { PALETTE, HUD, STATUS_DOT, IS_LOCAL } from './HUDConstants.jsx'

// Agents that have sprite image files
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

// DONE(bobby2): RIGHT NOW INLINE ADD TASK -- isAddPrompt tasks render as an inline text input. Enter adds to localStorage manual tasks. Manual tasks are right-clickable + checkable.
export function TaskPanel({ project, onClose, isNightMode, onAddManualTask, onToggleManualTask, onDeleteManualTask, allProjects, onTaskContextMenu, hudTaskCtxId, onNavigateToProject, highlightedTask }) {
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
        padding: '16px 24px 12px',
        borderBottom: `1px solid ${tpDivider}`,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 12, height: 12, borderRadius: 4,
            background: project.color,
            boxShadow: `0 0 12px ${project.color}44`,
          }} />
          <span style={{
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 26, fontWeight: 900,
            color: tpTextPrimary,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}>
            {project.name}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600,
            color: tpTextMuted,
          }}>
            {doneTasks}/{totalTasks}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Progress bar - THICKER per Steffen spec (12px) */}
          <div style={{
            width: 100, height: 12, borderRadius: 6,
            background: tpProgressBg,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: `linear-gradient(90deg, ${project.color}AA, ${project.color})`,
              borderRadius: 6,
              transition: 'width 300ms ease',
            }} />
          </div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700,
            color: project.color,
            minWidth: 32,
          }}>
            {progress}%
          </span>

          <button
            onClick={onClose}
            style={{
              background: tpCloseBg, border: `1px solid ${tpDivider}`,
              borderRadius: 8, cursor: 'pointer',
              color: tpTextMuted,
              width: 44, height: 44, minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = tpCloseHoverBg; e.currentTarget.style.color = isDaytime ? '#8BA4C4' : HUD.textSecondary }}
            onMouseLeave={e => { e.currentTarget.style.background = tpCloseBg; e.currentTarget.style.color = tpTextMuted }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div style={{
        padding: '8px 16px 16px',
        overflowY: 'auto', maxHeight: 300,
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
      }} className="hud-scroll">
        {sortedTasks.map((task, i) => {
          const isDone = getTaskDone(task, task.origIdx)
          const isSaving = saving === task.origIdx

          // DONE(bobby2): isAddPrompt renders as inline input for adding manual tasks to Right Now
          if (task.isAddPrompt) {
            return (
              <motion.div
                key="add-prompt"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.15 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 8px',
                  borderBottom: i < sortedTasks.length - 1 ? `1px solid ${tpDivider}` : 'none',
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

          return (
            <motion.div
              key={task.isManual ? `manual-${task.manualId}` : task.origIdx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.15 }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onTaskContextMenu?.(e, task, project)
              }}
              onTouchStart={(e) => {
                // Long-press for mobile context menu (500ms)
                const touch = e.touches[0]
                const timer = setTimeout(() => {
                  e.preventDefault?.()
                  onTaskContextMenu?.({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {}, stopPropagation: () => {} }, task, project)
                }, 500)
                e.currentTarget._longPressTimer = timer
              }}
              onTouchEnd={(e) => {
                clearTimeout(e.currentTarget._longPressTimer)
              }}
              onTouchMove={(e) => {
                clearTimeout(e.currentTarget._longPressTimer)
              }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 8px',
                minHeight: 44,
                borderBottom: i < sortedTasks.length - 1 ? `1px solid ${tpDivider}` : 'none',
                opacity: isDone ? 0.35 : 1,
                transition: 'opacity 200ms ease, background 300ms ease, border-left 300ms ease',
                // Highlight when navigated-to OR context menu open
                background: highlightedTask && task.text === highlightedTask.text
                  ? (isDaytime ? 'rgba(59,158,255,0.25)' : 'rgba(59,158,255,0.2)')
                  : hudTaskCtxId === (task.isManual ? `manual-${task.manualId}` : task.origIdx)
                    ? (isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.15)')
                    : 'transparent',
                borderLeft: highlightedTask && task.text === highlightedTask.text
                  ? `3px solid ${project.color || '#3B9EFF'}`
                  : hudTaskCtxId === (task.isManual ? `manual-${task.manualId}` : task.origIdx)
                    ? `3px solid ${project.color || '#3B82F6'}`
                    : '3px solid transparent',
              }}
            >
              {/* Checkbox - CLICKABLE (44px touch target via padding) */}
              <motion.div
                onClick={() => {
                  if (task.isManual) {
                    onToggleManualTask?.(task.manualId)
                  } else {
                    toggleTask(task, task.origIdx)
                  }
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 0,
                  border: isDone ? 'none' : `1.5px solid ${tpCheckboxBorder}`,
                  background: isDone ? (task.autoChecked ? '#22C55E' : project.color) : tpCheckboxBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease',
                  cursor: 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                  boxShadow: task.autoChecked ? '0 0 8px rgba(34,197,94,0.4)' : 'none',
                  // 44px touch target via invisible padding (checkbox visual stays 24px, tap area 44px)
                  padding: 10, margin: -10, boxSizing: 'content-box',
                }}>
                {isDone && <Check size={14} color="#FFF" strokeWidth={3} />}
              </motion.div>

              {/* Task text - LARGER. Clickable if task has a project link. */}
              <span
                onClick={() => {
                  if (task.projectSource || task.projectSection) {
                    onNavigateToProject?.(task)
                  }
                }}
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, fontWeight: 400,
                  color: isDone ? tpTextMuted : tpTextPrimary,
                  lineHeight: 1.45,
                  textDecoration: isDone ? 'line-through' : 'none',
                  flex: 1,
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

              {/* LIVE badge for live agent tasks */}
              {task.isLive && (
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
  )
}
