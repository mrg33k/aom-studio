// CommandTracker.jsx — Spreadsheet-style room/project status tracker
// Mission: corner:corner-ui-cv6 R3+
// A dense grid view of all projects/rooms: status, live activity, master-loop toggle.
// Replaces the card-style Command Deck with a single scannable table Patrik can steer from.

import { useState, useEffect, useCallback, useRef } from 'react'
import { authFetch } from '../lib/authFetch.js'
import { supabase } from '../lib/supabase.js'

function titleCaseSlug(s) {
  return (s || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function roomDisplay(slug, nameMap = {}) {
  if (!slug) return { name: '', tag: '' }
  if (!slug.includes(':')) return { name: titleCaseSlug(slug), tag: '' }
  const parts = slug.split(':')
  const mission = parts[parts.length - 1]
  const project = parts[parts.length - 2] || ''
  let name = nameMap[slug]
  if (!name || name.includes(':')) name = titleCaseSlug(mission)
  return { name, tag: project ? titleCaseSlug(project) : '' }
}

function relativeTime(timestamp) {
  if (!timestamp) return '—'
  const now = Date.now()
  const ts = new Date(timestamp).getTime()
  if (isNaN(ts)) return '—'
  const secs = Math.max(0, Math.floor((now - ts) / 1000))
  if (secs < 90) return 'just now'
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}

function statusColor(status) {
  // Returns a CSS custom property; all are cv6 tokens
  if (status === 'active' || status === 'working') return 'var(--cv6-accent-success)'
  if (status === 'blocked' || status === 'error') return 'var(--cv6-accent-error)'
  if (status === 'idle') return 'var(--cv6-text-tertiary)'
  return 'var(--cv6-text-secondary)'
}

function statusLabel(status) {
  if (status === 'active' || status === 'working') return 'WORKING'
  if (status === 'blocked' || status === 'error') return 'BLOCKED'
  if (status === 'idle') return 'IDLE'
  return 'UNKNOWN'
}

function ToggleSwitch({ on, onChange, disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: on ? 'var(--cv6-accent-success)' : 'var(--cv6-divider)',
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative',
        padding: 2,
        boxSizing: 'border-box',
        transition: 'background 200ms ease',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'var(--cv6-surface)',
          position: 'absolute',
          left: on ? 22 : 2,
          top: 2,
          transition: 'left 200ms ease',
        }}
      />
    </button>
  )
}

export default function CommandTracker({ worldId, onJumpToRoom, basePath, onReplyToRoom }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [routineMap, setRoutineMap] = useState({}) // id by routine id (not name)
  const [toggling, setToggling] = useState({}) // id -> isOptimistic state
  const [nameMap, setNameMap] = useState({})
  const [hoveredRoutineId, setHoveredRoutineId] = useState(null) // for hover state

  const load = useCallback(async () => {
    try {
      // Guard: worldId must be present
      if (!worldId) {
        setLoading(false)
        return
      }

      // Construct paths dynamically per worldId
      const deliverablePath = (file) => `/api/dashboard/project-file?raw=1&path=corner/users/${worldId}/missions/master-loop/deliverables/${file}`

      // Load room goals + ledger
      const gRes = await authFetch(deliverablePath('room-goals.json'))
      let goals = { rooms: {} }
      let loadError = false
      if (gRes?.ok) {
        try { goals = JSON.parse(await gRes.text()) } catch { goals = { rooms: {} } }
      } else {
        loadError = true
      }

      const lgRes = await authFetch(deliverablePath('goal-ledger.json'))
      if (lgRes?.ok) {
        try {
          const ledger = JSON.parse(await lgRes.text())
          const ledgerGoals = {}
          Object.values(ledger.users || {}).forEach((u) => {
            Object.entries(u.goals || {}).forEach(([slug, g]) => { ledgerGoals[slug] = g })
          })
          goals.rooms = goals.rooms || {}
          Object.entries(ledgerGoals).forEach(([slug, lg]) => {
            const base = goals.rooms[slug] || {}
            goals.rooms[slug] = {
              ...base,
              last_touched: lg.last_touched || base.last_touched || null,
              last_touched_by: lg.last_touched_by || null,
              last_touched_label: lg.last_touched_label || null,
              sessions: Array.isArray(lg.sessions) ? lg.sessions : [],
            }
          })
        } catch { /* ledger optional */ }
      }

      // Load claude sessions (both blocked/stalled sessions and all active workers)
      // workers is the real LIVE array: all currently active terminal sessions
      const sRes = await authFetch('/api/dashboard/claude-sessions')
      const stuckData = sRes?.ok ? await sRes.json() : { sessions: [], workers: [] }
      const blockedSessions = Array.isArray(stuckData.sessions) ? stuckData.sessions.filter((s) => s && typeof s === 'object') : []
      const workers = Array.isArray(stuckData.workers) ? stuckData.workers.filter((w) => w && typeof w === 'object') : []

      // Build a worker lookup by name so we can match them to room-goal rows
      const workersByName = {}
      workers.forEach((w) => {
        if (w && w.name) workersByName[w.name] = w
      })

      // Load routines
      const rRes = await authFetch(`/api/dashboard/routines?client_id=${encodeURIComponent(worldId)}`)
      const routinesData = rRes?.ok ? await rRes.json() : { routines: [] }
      if (!rRes?.ok) loadError = true

      // Build routine map by id (primary key for lookups and updates)
      const rMap = {}
      const routinesByProject = {}
      ;(Array.isArray(routinesData.routines) ? routinesData.routines : []).forEach((r) => {
        if (r && typeof r === 'object' && r.id) {
          rMap[r.id] = r
          if (r.project_slug) {
            if (!routinesByProject[r.project_slug]) routinesByProject[r.project_slug] = []
            routinesByProject[r.project_slug].push(r)
          }
        }
      })
      setRoutineMap(rMap)

      // Load structure map for room names
      const smRes = await authFetch(deliverablePath('structure-map.json'))
      const map = {}
      if (smRes?.ok) {
        try {
          const sm = JSON.parse(await smRes.text())
          ;(sm.rooms || []).forEach((r) => {
            if (r && typeof r === 'object' && r.slug && r.title) map[r.slug] = r.title
          })
        } catch { /* keep empty */ }
      } else {
        loadError = true
      }
      setNameMap(map)

      // If any critical load failed, show error state
      if (loadError) {
        setRows([{ error: 'Failed to load tracker data. Try refreshing.' }])
        setLoading(false)
        return
      }

      // Build rows: room-goals + active workers not in room-goals
      // Workers are terminal sessions actively working; they may or may not map to a room-goal
      const roomSlugs = new Set(Object.keys(goals.rooms || {}))
      const tableRows = []

      // First pass: emit room-goal rows (with optional attached worker)
      const usedWorkerNames = new Set()  // Track which workers we've attached
      Array.from(roomSlugs)
        .sort()
        .forEach((slug) => {
          const roomGoal = (goals.rooms || {})[slug] || {}

          // Try to find a live worker for this room by name matching
          // Worker names may contain the room slug or mission name; look for any worker
          // that mentions this slug or mission in their name
          let liveWorker = null
          const mission = slug.includes(':') ? slug.split(':').pop() : null
          for (const [workerName, w] of Object.entries(workersByName)) {
            if (!usedWorkerNames.has(workerName)) {
              // Match if worker name contains the full slug or the mission name
              if (workerName.includes(slug) || (mission && workerName.includes(mission))) {
                liveWorker = w
                usedWorkerNames.add(workerName)
                break
              }
            }
          }

          // Derive LIVE NOW: the worker's short current-status line (detail),
          // falling back to its intent. GOAL NOW carries the longer goal below.
          let liveNow = '—'
          if (liveWorker) {
            liveNow = liveWorker.detail || liveWorker.intent || '—'
          }

          // Derive status from worker recency + staleness
          // WORKING if worker touched recently and state is 'working'
          // BLOCKED if worker has blocked/error state
          // IDLE if no worker OR worker is stale (>30 min) OR last activity is old
          let status = 'idle'
          if (liveWorker) {
            const ageMs = (liveWorker.ageSeconds || 0) * 1000
            const thirtyMinMs = 30 * 60 * 1000
            const isRecent = ageMs < thirtyMinMs

            if (liveWorker.state === 'blocked' || liveWorker.state === 'error') {
              status = 'blocked'
            } else if (liveWorker.state === 'working' && isRecent) {
              status = 'active'
            } else {
              status = 'idle'
            }
          } else {
            // No live worker: check if last activity is stale
            const lastTouchTs = roomGoal.last_touched ? new Date(roomGoal.last_touched).getTime() : null
            if (lastTouchTs) {
              const now = Date.now()
              const thirtyMinMs = 30 * 60 * 1000
              status = (now - lastTouchTs) > thirtyMinMs ? 'idle' : 'active'
            }
          }

          const lastTouched = roomGoal.last_touched || (liveWorker && liveWorker.updatedAt) || null
          const goal = (typeof roomGoal.goal === 'string' ? roomGoal.goal : '').substring(0, 80)

          // Find routine for this project (by project_slug match, looking for one with master-loop in the name)
          let routineId = null
          const projectMatch = slug.includes(':') ? slug.split(':')[0] : null
          if (projectMatch && routinesByProject[projectMatch]) {
            const masterLoopRoutine = routinesByProject[projectMatch].find((r) => r && r.id && r.name && r.name.includes('master-loop'))
            if (masterLoopRoutine && masterLoopRoutine.id) {
              routineId = masterLoopRoutine.id
            }
          }

          tableRows.push({
            slug,
            display: roomDisplay(slug, map),
            goal,
            status,
            liveNow,
            lastActivity: lastTouched,
            routineId,
            isWorkerRow: false,
          })
        })

      // Second pass: emit active workers NOT already attached to a room-goal row
      // These are terminal sessions working on something not explicitly in room-goals
      workers.forEach((w) => {
        if (!w || !w.name || usedWorkerNames.has(w.name)) return  // Skip if already attached to a room-goal
        const isRecent = (w.ageSeconds || 0) < (30 * 60)  // < 30 min
        const isWorking = w.state === 'working' || w.state === 'blocked'
        if (!isRecent && !isWorking) return  // Skip old inactive workers

        // Emit as standalone worker row
        const display = roomDisplay(w.name, map)
        let status = 'idle'
        if (w.state === 'blocked' || w.state === 'error') {
          status = 'blocked'
        } else if (w.state === 'working') {
          status = isRecent ? 'active' : 'idle'
        }

        // claude-sessions workers report ageSeconds (not a timestamp); convert.
        const workerLastActivity = typeof w.ageSeconds === 'number'
          ? new Date(Date.now() - w.ageSeconds * 1000).toISOString()
          : null
        // intent = the goal/task (long); detail = the short current-status line.
        // GOAL NOW = goal (truncated), LIVE NOW = live status.
        tableRows.push({
          slug: `workers:${w.name}`,
          display: { name: w.name, tag: 'Terminal' },
          goal: (w.intent || w.detail || '').substring(0, 80),
          status,
          liveNow: w.detail || w.intent || '—',
          lastActivity: workerLastActivity,
          routineId: null,
          isWorkerRow: true,
        })
      })

      // ── Live accuracy: enrich rows with recent MESSAGE activity ──────────────
      // The goal-ledger.json is updated by a daemon and can lag days behind, so
      // rows looked IDLE even for rooms worked today. The messages table is the
      // live truth: pull recent messages, map them to room slugs, and use the
      // newest of (ledger last_touched, latest message) for recency + status.
      // Also surface the last USER message (one line) as LIVE NOW for room rows.
      try {
        if (supabase && worldId) {
          const sharedIds = Array.from(new Set(
            tableRows.filter(r => !r.isWorkerRow && r.slug && r.slug.includes(':'))
              .map(r => `shared:${r.slug.split(':')[0]}`)
          ))
          const clientIds = [worldId, ...sharedIds]
          const { data: msgs } = await supabase
            .from('messages')
            .select('agent,project,text,role,sender,timestamp,metadata,client_id')
            .in('client_id', clientIds)
            .order('timestamp', { ascending: false })
            .limit(600)
          const byRoom = {}        // slug -> { ts, lastUserText }
          const isUserMsg = (m) => m.role === 'user' || m.agent === 'user' || m.sender === 'user'
          for (const m of (msgs || [])) {
            // Derive the room slug this message belongs to.
            let slug = null
            const missionTag = m.metadata && m.metadata.mission_slug
            if (m.project && missionTag) slug = `${m.project}:${missionTag}`
            else if (m.project) slug = m.project
            else if (m.agent && !String(m.agent).startsWith('project:')) slug = m.agent
            else if (m.agent && String(m.agent).startsWith('project:')) slug = m.agent.slice(8)
            if (!slug) continue
            const ts = m.timestamp ? new Date(m.timestamp).getTime() : 0
            if (!byRoom[slug]) byRoom[slug] = { ts: 0, lastUserText: '' }
            if (ts > byRoom[slug].ts) byRoom[slug].ts = ts
            if (isUserMsg(m) && !byRoom[slug].lastUserText && (m.text || '').trim()) {
              byRoom[slug].lastUserText = (m.text || '').replace(/\s+/g, ' ').trim().slice(0, 90)
            }
          }
          const nowMs = Date.now()
          const THIRTY = 30 * 60 * 1000
          tableRows.forEach((row) => {
            if (row.isWorkerRow) return
            // Try exact slug, then project-only match.
            const hit = byRoom[row.slug] || (row.slug.includes(':') ? byRoom[row.slug.split(':')[0]] : null)
            if (!hit) return
            const rowTs = row.lastActivity ? new Date(row.lastActivity).getTime() : 0
            if (hit.ts > rowTs) row.lastActivity = new Date(hit.ts).toISOString()
            // Recent message ⇒ the room is active (overrides a stale-ledger idle).
            if (hit.ts && (nowMs - hit.ts) < THIRTY && row.status === 'idle') row.status = 'active'
            // Surface the last user message as LIVE NOW when nothing live is set.
            if ((!row.liveNow || row.liveNow === '—') && hit.lastUserText) row.liveNow = hit.lastUserText
          })
        }
      } catch (_) { /* message enrichment is best-effort */ }

      // Sort: ACTIVE then BLOCKED at top (workers first), then IDLE below
      tableRows.sort((a, b) => {
        const statusOrder = { active: 0, blocked: 1, idle: 2 }
        // Nullish coalescing, NOT ||: active maps to 0 and `0 || 99` would wrongly be 99.
        const aStatus = statusOrder[a.status] ?? 99
        const bStatus = statusOrder[b.status] ?? 99
        if (aStatus !== bStatus) return aStatus - bStatus
        // Within same status: workers first
        if (a.isWorkerRow !== b.isWorkerRow) return a.isWorkerRow ? -1 : 1
        // Then by last activity (newer first)
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
        if (aTime !== bTime) return bTime - aTime
        // Finally by slug
        return (a.slug || '').localeCompare(b.slug || '')
      })

      setRows(tableRows)
      setLoading(false)
    } catch (err) {
      console.error('Error loading CommandTracker:', err)
      setRows([{ error: 'Failed to load tracker data. Try refreshing.' }])
      setLoading(false)
    }
  }, [worldId])

  useEffect(() => {
    load()
  }, [load])

  const toggleRoutine = useCallback(async (routineId, wantOn) => {
    if (!routineId || typeof routineId !== 'string') {
      console.warn('toggleRoutine called with invalid routineId:', routineId)
      return
    }
    // Optimistic update: show the new state immediately
    setToggling((prev) => ({ ...prev, [routineId]: wantOn }))
    try {
      const res = await authFetch('/api/dashboard/routines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: routineId,
          action: wantOn ? 'resume' : 'pause',
        }),
      })
      if (res?.ok) {
        // Update the routine map with the response (keyed by id, not name)
        try {
          const data = await res.json()
          if (data && data.routine && typeof data.routine === 'object' && data.routine.id) {
            setRoutineMap((prev) => ({ ...prev, [data.routine.id]: data.routine }))
          }
        } catch (parseErr) {
          console.warn('Error parsing routine response:', parseErr)
        }
        // Clear toggling state on success
        setToggling((prev) => {
          const next = { ...prev }
          delete next[routineId]
          return next
        })
      } else {
        // Rollback optimistic update on failure
        console.error('Failed to toggle routine:', res?.status, await res?.text?.())
        setToggling((prev) => {
          const next = { ...prev }
          delete next[routineId]
          return next
        })
      }
    } catch (err) {
      // Rollback optimistic update on error
      console.error('Error toggling routine:', err)
      setToggling((prev) => {
        const next = { ...prev }
        delete next[routineId]
        return next
      })
    }
  }, [])

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--cv6-text-secondary)',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        background: 'var(--cv6-ground)',
      }}>
        Loading tracker...
      </div>
    )
  }

  // Handle error state
  if (Array.isArray(rows) && rows.length === 1 && rows[0].error) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--cv6-accent-error)',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        background: 'var(--cv6-ground)',
      }}>
        {rows[0].error}
      </div>
    )
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--cv6-text-tertiary)',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        background: 'var(--cv6-ground)',
      }}>
        No active rooms or projects.
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--cv6-ground)',
        color: 'var(--cv6-text-primary)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 80px 1.5fr 100px 60px',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--cv6-surface)',
          borderBottom: '1px solid var(--cv6-divider)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        {['ROOM', 'GOAL NOW', 'STATUS', 'LIVE NOW', 'LAST ACTIVITY', 'MASTER LOOP'].map((col) => (
          <div
            key={col}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--cv6-text-tertiary)',
              textAlign: col === 'LIVE NOW' ? 'left' : col === 'LAST ACTIVITY' ? 'right' : 'left',
            }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, idx) => {
        // Look up routine status by the routineId (room-goal rows only)
        const routine = row.routineId && typeof routineMap[row.routineId] === 'object'
          ? routineMap[row.routineId]
          : null
        const routineOn = routine?.status === 'running'
        const isToggling = row.routineId && toggling[row.routineId]
        const color = statusColor(row.status)
        const label = statusLabel(row.status)

        const isHovered = hoveredRoutineId === row.routineId
        // Worker rows are read-only (no routine toggle)
        const isWorkerRow = row.isWorkerRow === true

        return (
          <div
            key={row.slug || `row-${idx}`}
            onClick={() => !isWorkerRow && onJumpToRoom?.(row.slug)}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 80px 1.5fr 100px 60px',
              gap: '12px',
              padding: '11px 16px',
              borderBottom: '1px solid var(--cv6-divider)',
              background: isWorkerRow ? 'rgba(255,255,255,0.01)' : (isHovered ? 'var(--cv6-surface-hover)' : 'var(--cv6-surface)'),
              cursor: isWorkerRow ? 'default' : 'pointer',
              transition: 'background 120ms ease',
              alignItems: 'center',
              opacity: isWorkerRow ? 0.95 : 1,
            }}
            onMouseEnter={() => !isWorkerRow && setHoveredRoutineId(row.routineId)}
            onMouseLeave={() => !isWorkerRow && setHoveredRoutineId(null)}
          >
            {/* ROOM / WORKER NAME */}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: isWorkerRow ? 500 : 600,
                  color: 'var(--cv6-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {(row.display && row.display.name) || row.slug || '(unnamed)'}
              </div>
              {row.display && row.display.tag && (
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--cv6-text-tertiary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {row.display.tag}
                </div>
              )}
            </div>

            {/* GOAL NOW */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--cv6-text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {(typeof row.goal === 'string' && row.goal) ? row.goal : '—'}
            </div>

            {/* STATUS */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            </div>

            {/* LIVE NOW */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--cv6-text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {(typeof row.liveNow === 'string' && row.liveNow) ? row.liveNow : '—'}
            </div>

            {/* LAST ACTIVITY */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--cv6-text-tertiary)',
                textAlign: 'right',
                whiteSpace: 'nowrap',
              }}
            >
              {relativeTime(row.lastActivity)}
            </div>

            {/* MASTER LOOP TOGGLE (room-goal rows only) */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {!isWorkerRow && row.routineId && typeof row.routineId === 'string' ? (
                <ToggleSwitch
                  on={toggling[row.routineId] !== undefined ? toggling[row.routineId] : routineOn}
                  onChange={(wantOn) => toggleRoutine(row.routineId, wantOn)}
                  disabled={!!isToggling}
                />
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--cv6-text-tertiary)',
                    fontStyle: 'italic',
                  }}
                >
                  —
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
