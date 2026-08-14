// ForemanTasksSection -- foreman parent card with indented child sub-tasks beneath.
// AL-3: parent-card grouping + pause/resume for foreman-orchestrate.py --loop tasks.
import { useState, useCallback } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { LIFECYCLE } from './lifecycle.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'
import { useCornerData } from '../../../CornerContext.jsx'
import { authFetch } from '../../../lib/authFetch.js'

export default function ForemanTasksSection() {
  const {
    active,
    expandedTask,
    toggleTaskExpand,
    openTaskMenu,
    startTaskLongPress,
    cancelTaskLongPress,
    taskThread,
    threadLoading,
    activeForemanMissions,
  } = useTasksPanelCtx()

  const { allTasks } = useCornerData()

  const [pausingIds, setPausingIds] = useState(() => new Set())
  const [pauseToast, setPauseToast] = useState(null)

  const foremanTasks = (active || []).filter(t => t.metadata?.is_foreman)

  if (foremanTasks.length === 0) return null

  // Child tasks: any task whose mission_slug matches the foreman's mission
  const allActive = allTasks || []
  const childrenByMission = {}
  for (const t of allActive) {
    const ms = t.metadata?.mission_slug
    if (ms && activeForemanMissions.has(ms) && !t.metadata?.is_foreman) {
      if (!childrenByMission[ms]) childrenByMission[ms] = []
      childrenByMission[ms].push(t)
    }
  }

  const showPauseToast = (msg) => {
    setPauseToast(msg)
    setTimeout(() => setPauseToast(null), 2400)
  }

  const handlePause = useCallback(async (task) => {
    setPausingIds(s => new Set(s).add(task.id))
    try {
      const res = await authFetch('/api/dashboard/foreman-pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, missionSlug: task.metadata?.mission }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) throw new Error(data.error || `Pause failed (${res.status})`)
 showPauseToast('Pause signal sent, foreman will stop after current round.')
    } catch (err) {
      showPauseToast(err?.message || 'Could not send pause signal')
    } finally {
      setPausingIds(s => { const n = new Set(s); n.delete(task.id); return n })
    }
  }, [])

  const cardColor = LIFECYCLE.working

  return (
    <div style={{ marginBottom: 36, position: 'relative' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <h2
          data-testid="task-column-header"
          data-column="foreman"
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: C.text,
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1,
          }}
        >
          Foreman
        </h2>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: cardColor,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {foremanTasks.length}
        </span>
      </div>

      {foremanTasks.map(t => {
        const mission = t.metadata?.mission || ''
        const children = childrenByMission[mission] || []
        const doneChildren = children.filter(c => c.status === 'done').length
        const failedChildren = children.filter(c => c.status === 'failed').length
        const isPausing = pausingIds.has(t.id)

        return (
          <div key={t.id} style={{ marginBottom: 16 }}>
            {/* Parent foreman card */}
            <div
              data-testid="foreman-card"
              data-task-id={t.id}
              aria-expanded={expandedTask === t.id ? 'true' : 'false'}
              aria-controls={`foreman-accordion-${t.id}`}
              onClick={() => toggleTaskExpand(t.id)}
              onContextMenu={(e) => openTaskMenu(e, t)}
              onTouchStart={(e) => startTaskLongPress(e, t)}
              onTouchEnd={cancelTaskLongPress}
              onTouchMove={cancelTaskLongPress}
              onTouchCancel={cancelTaskLongPress}
              style={{
                padding: '18px 20px',
                borderRadius: 16,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${cardColor}14, ${cardColor}07)`,
                border: `1.5px solid ${expandedTask === t.id ? cardColor + '45' : cardColor + '28'}`,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 12px 32px ${cardColor}18`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              {/* Animated top progress bar */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, height: 3,
                background: `linear-gradient(90deg, ${cardColor}, ${cardColor}88)`,
                animation: 'bld 5s ease-in-out infinite',
                borderRadius: '16px 16px 0 0',
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {/* FOREMAN badge + mission slug */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: cardColor, letterSpacing: '0.08em',
                      textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      FOREMAN
                    </span>
                    {mission && (
                      <>
                        <span style={{ color: C.dim, fontSize: 9 }}>·</span>
                        <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                          {mission}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{
                    color: C.text,
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap',
                  }}>
                    {t.title || `Foreman: drive ${mission}`}
                  </div>

                  {/* Status row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 12,
                      background: cardColor + '18',
                      fontSize: 11, fontWeight: 700, color: cardColor,
                      letterSpacing: '0.02em',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: cardColor,
                        animation: 'rn-glow 2s ease-in-out infinite',
                        flexShrink: 0,
                      }} />
                      Running
                    </span>
                    {children.length > 0 && (
                      <span style={{ color: C.dim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                        {doneChildren}/{children.length} done
                        {failedChildren > 0 ? ` · ${failedChildren} failed` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pause button */}
                <button
                  data-testid="foreman-pause-btn"
                  onClick={(e) => { e.stopPropagation(); handlePause(t) }}
                  disabled={isPausing}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: C.text2,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 12px',
                    cursor: isPausing ? 'not-allowed' : 'pointer',
                    opacity: isPausing ? 0.5 : 1,
                    transition: 'background 0.15s',
                    flexShrink: 0,
                    marginTop: 2,
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => { if (!isPausing) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                >
                  {isPausing ? '…' : 'Pause'}
                </button>
              </div>

              {/* Accordion thread */}
              {expandedTask === t.id && (
                <div
                  id={`foreman-accordion-${t.id}`}
                  data-testid="foreman-brief-accordion"
                  style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}
                >
                  {threadLoading ? (
                    <div style={{ fontSize: 12, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                  ) : taskThread.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events yet.</div>
                  ) : taskThread.map((m, idx) => (
                    <div key={idx} style={{
                      fontSize: 12, color: C.text2, lineHeight: 1.5,
                      padding: '4px 0',
                      fontFamily: "'JetBrains Mono', monospace",
                      borderBottom: idx < taskThread.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    }}>
                      <span style={{ color: C.dim, fontSize: 10 }}>{(m.timestamp || '').slice(11, 19)}</span>
                      {' '}
                      <span>{m.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Child sub-tasks — indented below parent */}
            {children.length > 0 && (
              <div style={{
                marginLeft: 20,
                marginTop: 6,
                paddingLeft: 14,
                borderLeft: `2px solid ${cardColor}20`,
              }}>
                {children.map(child => {
                  const isWorking = ['building', 'qa'].includes(child.status)
                  const isQueued = ['queued', 'classifying', 'planning'].includes(child.status)
                  const childColor = child.status === 'done'
                    ? LIFECYCLE.done
                    : child.status === 'failed'
                      ? LIFECYCLE.failed
                      : child.status === 'needs_input' || child.status === 'waiting'
                        ? LIFECYCLE.waiting
                        : isWorking
                          ? LIFECYCLE.working
                          : LIFECYCLE.queued
                  const childStatusLabel = isWorking
                    ? child.status === 'qa' ? 'QA' : 'Building'
                    : child.status === 'done' ? 'Done'
                    : child.status === 'failed' ? 'Failed'
                    : child.status === 'needs_input' ? 'Input'
                    : isQueued ? 'Queued'
                    : child.status

                  return (
                    <div
                      key={child.id}
                      data-testid="foreman-child-card"
                      data-task-id={child.id}
                      onClick={() => toggleTaskExpand(child.id)}
                      style={{
                        padding: '10px 14px',
                        marginBottom: 6,
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: `${childColor}08`,
                        border: `1px solid ${childColor}18`,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = `${childColor}12`}
                      onMouseLeave={e => e.currentTarget.style.background = `${childColor}08`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            color: C.text2,
                            fontSize: 13,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {child.title || child.text || 'Untitled'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: childColor,
                              padding: '2px 7px',
                              borderRadius: 8,
                              background: childColor + '15',
                              letterSpacing: '0.02em',
                            }}>
                              {childStatusLabel}
                            </span>
                            {child.attempt_count > 1 && (
                              <span style={{ color: C.dim, fontSize: 10 }}>×{child.attempt_count}</span>
                            )}
                          </div>
                        </div>
                        {child.qa_score != null && (
                          <div style={{
                            color: childColor,
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            flexShrink: 0,
                          }}>
                            {child.qa_score}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Pause feedback toast */}
      {pauseToast && (
        <div style={{
          position: 'fixed',
          bottom: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          background: '#1E293B',
          border: '1px solid rgba(255,107,61,0.25)',
          borderRadius: 12,
          padding: '10px 16px',
          fontSize: 12,
          fontWeight: 600,
          color: '#CBD5E1',
          fontFamily: "'Inter', sans-serif",
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {pauseToast}
        </div>
      )}
    </div>
  )
}