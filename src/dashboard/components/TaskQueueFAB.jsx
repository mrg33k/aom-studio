// TaskQueueFAB.jsx -- Floating task queue panel
// Shows all pipeline tasks with controls: cancel, requeue, delete, start runner.
// Polls v2-task-list API every 5s when open.

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getClientId } from '../lib/clientConfig.js'
import { authFetch } from '../lib/authFetch.js'

const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const STATUS_ORDER = ['running', 'queued', 'needs_input', 'done', 'failed']
const STATUS_COLORS = {
  queued: { bg: '59,130,246', label: 'Queued' },
  running: { bg: '245,158,11', label: 'Running' },
  needs_input: { bg: '234,179,8', label: 'Needs input' },
  done: { bg: '34,197,94', label: 'Done' },
  failed: { bg: '239,68,68', label: 'Failed' },
}

const API_BASE = IS_LOCAL ? '' : ''

async function fetchTasks() {
  const clientId = getClientId()
  const resp = await authFetch(`${API_BASE}/api/dashboard/v2-task-list?client_id=${encodeURIComponent(clientId)}&limit=50`)
  if (!resp.ok) throw new Error(`${resp.status}`)
  const data = await resp.json()
  return data.tasks || []
}

async function taskAction(taskId, action, body = {}) {
  const resp = await authFetch(`${API_BASE}/api/dashboard/task-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, taskId, clientId: getClientId(), ...body }),
  })
  return resp.json()
}

// r7:open-agent-surface — /api/dashboard/v2-task-update now verifies the caller
// against the task's own world, so this has to carry the session like its
// sibling taskAction() above already did. A bare fetch() 401s in production.
async function taskUpdate(taskId, fields) {
  const resp = await authFetch(`${API_BASE}/api/dashboard/v2-task-update`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, ...fields }),
  })
  return resp.json()
}

function StatusPill({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.queued
  const isActive = status === 'running'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 10,
      background: `rgba(${cfg.bg}, 0.15)`,
      border: `1px solid rgba(${cfg.bg}, 0.3)`,
      color: `rgba(${cfg.bg}, 1)`,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {isActive && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: `rgba(${cfg.bg}, 0.9)`,
          animation: 'tqPulse 1.5s ease-in-out infinite',
        }} />
      )}
      {cfg.label}
    </span>
  )
}

function ResultPreview({ payload }) {
  if (!payload || !payload.type) return null
  const boxStyle = {
    marginTop: 6, padding: '8px 10px', borderRadius: 6,
    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
    fontSize: 12, color: 'rgba(226,232,240,0.9)',
  }
  const summaryStyle = { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }
  const { type, payload: value, summary } = payload

  if (type === 'link') {
    return (
      <div style={boxStyle}>
        <a href={value} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block', padding: '4px 10px', borderRadius: 5,
          background: 'rgba(34,197,94,0.22)', color: 'rgba(187,247,208,0.95)',
          textDecoration: 'none', fontSize: 12, fontWeight: 600,
        }}>Open link</a>
        <div style={summaryStyle}>{summary || value}</div>
      </div>
    )
  }
  if (type === 'image') {
    return (
      <div style={boxStyle}>
        <img src={value} alt={summary || 'result'} style={{
          maxWidth: '100%', maxHeight: 180, borderRadius: 4,
          display: 'block',
        }} />
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }
  if (type === 'video') {
    return (
      <div style={boxStyle}>
        <video src={value} controls style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 4 }} />
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }
  if (type === 'text') {
    return (
      <div style={boxStyle}>
        <pre style={{
          whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: 12,
          maxHeight: 140, overflow: 'auto',
        }}>{value}</pre>
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }
  if (type === 'check_external') {
    return (
      <div style={boxStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 11,
            background: 'rgba(245,158,11,0.22)', color: 'rgba(253,230,138,0.9)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
          }}>!</span>
          <span style={{ fontSize: 12 }}>{value}</span>
        </div>
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }
  return null
}

function TaskRow({ task, onAction, expanded, onToggle }) {
  const cfg = STATUS_COLORS[task.status] || STATUS_COLORS.queued
  const isActive = task.status === 'running'
  const ago = task.created_at ? timeAgo(task.created_at) : ''
  const resultPayload = task.metadata?.result_payload || null

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '8px 0',
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', padding: '2px 0',
        }}
      >
        <span style={{
          width: 4, minHeight: 28, borderRadius: 2,
          background: isActive ? `rgba(${cfg.bg}, 0.7)` : 'transparent',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {task.title || task.text || 'Untitled'}
          </div>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.4)',
            display: 'flex', gap: 8, alignItems: 'center', marginTop: 1,
          }}>
            {task.agent_identity && <span>{task.agent_identity}</span>}
            {task.complexity && <span>{task.complexity}</span>}
            {ago && <span>{ago}</span>}
          </div>
        </div>
        <StatusPill status={task.status} />
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 150ms',
        }}>&#9654;</span>
      </div>

      {expanded && (
        <div style={{
          marginLeft: 12, marginTop: 6, padding: '8px 10px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 6,
          fontSize: 12,
        }}>
          {task.description && (
            <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 6, lineHeight: 1.4,
              maxHeight: 80, overflow: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {task.description}
            </div>
          )}

          {task.qa_score != null && (
            <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              QA: {task.qa_score}/10
            </div>
          )}

          {task.error && (
            <div style={{ color: 'rgba(239,68,68,0.8)', marginBottom: 4, fontSize: 11 }}>
              Error: {task.error}
            </div>
          )}

          {task.status === 'done' && resultPayload && (
            <ResultPreview payload={resultPayload} />
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {task.status === 'queued' && (
              <ActionBtn label="Cancel" color="239,68,68" onClick={() => onAction(task.id, 'cancel')} />
            )}
            {task.status === 'failed' && (
              <ActionBtn label="Requeue" color="59,130,246" onClick={() => onAction(task.id, 'requeue')} />
            )}
            {['queued', 'failed', 'done'].includes(task.status) && (
              <ActionBtn label="Delete" color="239,68,68" onClick={() => onAction(task.id, 'delete')} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 10px', borderRadius: 4,
        background: `rgba(${color}, 0.1)`,
        border: `1px solid rgba(${color}, 0.25)`,
        color: `rgba(${color}, 0.9)`,
        fontSize: 11, fontWeight: 600, cursor: 'pointer',
        transition: 'background 100ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = `rgba(${color}, 0.2)`}
      onMouseLeave={e => e.currentTarget.style.background = `rgba(${color}, 0.1)`}
    >
      {label}
    </button>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function TaskQueueFAB({ isNightMode }) {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const panelRef = useRef(null)
  const intervalRef = useRef(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchTasks()
      setTasks(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll when open
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    setLoading(true)
    load()
    intervalRef.current = setInterval(load, 60000)
    return () => clearInterval(intervalRef.current)
  }, [open, load])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current?.contains(e.target)) return
      // Don't close if clicking the FAB itself
      const fab = document.getElementById('tq-fab-btn')
      if (fab?.contains(e.target)) return
      setOpen(false)
    }
    setTimeout(() => document.addEventListener('pointerdown', handler), 0)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  const handleAction = useCallback(async (taskId, action) => {
    try {
      if (action === 'cancel') {
        await taskAction(taskId, 'delete')
      } else if (action === 'requeue') {
        await taskUpdate(taskId, { status: 'queued' })
      } else if (action === 'delete') {
        await taskAction(taskId, 'delete')
      }
      // Refresh immediately
      load()
    } catch (err) {
      console.error('[TaskQueueFAB] action failed:', err)
    }
  }, [load])

  // Group and sort
  const grouped = {}
  for (const s of STATUS_ORDER) grouped[s] = []
  for (const t of tasks) {
    const bucket = grouped[t.status] || grouped.queued
    bucket.push(t)
  }
  // Remove empty groups
  const sections = STATUS_ORDER.filter(s => grouped[s].length > 0)

  const activeCount = tasks.filter(t => ['queued', 'running', 'needs_input'].includes(t.status)).length
  const hasActive = activeCount > 0

  const glowColor = isNightMode ? '120,80,255' : '59,130,246'

  return createPortal(
    <>
      <style>{`
        @keyframes tqPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes tqSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* FAB Button */}
      <button
        id="tq-fab-btn"
        onClick={() => setOpen(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: 20, right: 20,
          width: 48, height: 48, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          background: isNightMode
            ? 'radial-gradient(circle at 40% 35%, rgba(100,60,220,0.95), rgba(30,20,80,0.98))'
            : 'radial-gradient(circle at 40% 35%, rgba(59,130,246,0.95), rgba(15,27,60,0.98))',
          boxShadow: `0 0 0 1.5px rgba(${glowColor},0.4), 0 4px 20px rgba(${glowColor},0.4)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 60,
          transition: 'transform 150ms',
          transform: open ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        {/* Queue icon (stacked lines) */}
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.9)" strokeWidth={2} strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="14" y2="18" />
          <polyline points="17 16 19 18 23 14" strokeWidth={2.5} stroke="rgba(34,197,94,0.9)" />
        </svg>

        {/* Badge */}
        {activeCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, borderRadius: 9,
            background: hasActive ? '#EF4444' : '#6B7280',
            color: '#fff', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid rgba(15,20,40,0.9)',
          }}>
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: 76, right: 16,
            width: 380, maxHeight: 'calc(100vh - 120px)',
            background: isNightMode
              ? 'linear-gradient(180deg, rgba(20,15,50,0.97), rgba(10,8,30,0.99))'
              : 'linear-gradient(180deg, rgba(15,25,50,0.97), rgba(8,15,35,0.99))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            zIndex: 59,
            display: 'flex', flexDirection: 'column',
            animation: 'tqSlideUp 0.2s ease',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                Task Queue
              </span>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.4)',
                padding: '1px 6px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
              }}>
                {tasks.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                &times;
              </button>
            </div>
          </div>

          {/* Task list */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '4px 12px 12px',
            minHeight: 100,
          }}>
            {loading && tasks.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                Loading...
              </div>
            )}

            {error && (
              <div style={{ padding: 12, color: 'rgba(239,68,68,0.8)', fontSize: 12 }}>
                Error: {error}
              </div>
            )}

            {!loading && !error && tasks.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                No tasks in queue
              </div>
            )}

            {sections.map(status => (
              <div key={status}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: `rgba(${(STATUS_COLORS[status] || STATUS_COLORS.queued).bg}, 0.7)`,
                  padding: '10px 0 4px',
                }}>
                  {(STATUS_COLORS[status] || STATUS_COLORS.queued).label} ({grouped[status].length})
                </div>
                {grouped[status].map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    expanded={expandedId === task.id}
                    onToggle={() => setExpandedId(prev => prev === task.id ? null : task.id)}
                    onAction={handleAction}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
