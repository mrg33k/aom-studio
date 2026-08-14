// CommandTracker.jsx — Spreadsheet-style room/project status tracker
// Mission: corner:corner-ui-cv6 R3+
// A dense grid view of all projects/rooms: status, live activity, master-loop toggle.
// Replaces the card-style Command Deck with a single scannable table Patrik can steer from.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
 if (!timestamp) return '·'
  const now = Date.now()
  const ts = new Date(timestamp).getTime()
 if (isNaN(ts)) return '·'
  const secs = Math.max(0, Math.floor((now - ts) / 1000))
  if (secs < 90) return 'just now'
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}

// The goal/live feed sometimes carries a raw user message that includes an
// absolute file path or a tracking URL blob. Never surface those to the user
// (rule 4: think in the user's world). Strip them, collapse whitespace; if
// nothing readable is left the caller falls back to a dash.
function cleanCell(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/(?:[A-Za-z]:)?[\\/](?:Users|home)[\\/][^\s]+/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// cc-7: terminal launch-prompts are long, multi-sentence blocks (the raw prompt
// the Claude Code harness was started with). The ledger's GOAL NOW wants a clean
// one-liner, so for any goal that was NOT explicitly curated by Patrik or the
// loop we synthesize the first readable clause — real text from the live
// session, just shortened, never fabricated. A Patrik/loop-set goal is shown
// verbatim (cleanCell only) so editing always seeds from the whole thing.
function synthGoal(s) {
  const clean = cleanCell(s)
  if (!clean) return ''
  // First sentence: up to the first . ! or ? that is followed by a space or end.
  const m = clean.match(/^.*?[.!?](?=\s|$)/)
  let first = (m ? m[0] : clean).trim()
  if (first.length > 120) first = first.slice(0, 117).trimEnd() + '…'
  return first.charAt(0).toUpperCase() + first.slice(1)
}

// cc-6: room-goals stores raw source tags (patrik, inferred, …) and the ledger
// adds doc/session — normalize them all to the three buckets Patrik asked to
// see: you (he set it), loop (the system inferred/advanced it), doc (the mission
// canon). null = don't show a chip.
function normGoalSource(s) {
  if (!s) return null
  const v = String(s).toLowerCase()
  if (['patrik', 'user', 'manual', 'me'].includes(v)) return 'user'
  if (['inferred', 'loop', 'loop-review', 'system', 'auto'].includes(v)) return 'loop'
  if (v === 'doc' || v.startsWith('doc') || v.startsWith('vision') || v.startsWith('context')) return 'doc'
  if (['session', 'terminal', 'live'].includes(v)) return 'session'
  return null
}

function statusColor(status) {
  // Returns a CSS custom property; all are cv6 tokens
  if (status === 'active' || status === 'working') return 'var(--cv6-accent-success)'
  if (status === 'blocked') return 'var(--cv6-accent-warn)'   // kit command.html: blocked = amber (warn), red is reserved for true errors
  if (status === 'error') return 'var(--cv6-accent-error)'
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
        width: 30,
        height: 14,
        borderRadius: 7,
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
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--cv6-surface)',
          position: 'absolute',
          left: on ? 18 : 2,
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
  const [autopilotBusy, setAutopilotBusy] = useState({}) // bareSlug -> optimistic on/off while saving
  const [nameMap, setNameMap] = useState({})
  const [hoveredRoutineId, setHoveredRoutineId] = useState(null) // for hover state
  // Inline quick-reply from the spreadsheet (Patrik: reply right here, restarts the room timer)
  const [replyOpenSlug, setReplyOpenSlug] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replyDoneSlug, setReplyDoneSlug] = useState(null)
  // R110 (Patrik: "user can choose what they want the ea to move forward") — one-tap
  // push per row: tells that room's assistant to make real progress now. Same intent
  // as the Home "Move X forward" chips, but right here in the deck he steers from.
  const [movedSlug, setMovedSlug] = useState(null)
  const moveForward = useCallback(async (row) => {
    const slug = row && row.slug
    if (!slug || !onReplyToRoom) return
    const name = (row.display && row.display.name) || slug
    setMovedSlug(slug)
    try {
      await onReplyToRoom(slug, `Let's make real progress on ${name}. What's the single highest-value next step, and can you start it now?`)
    } catch (_) { /* optimistic; the send path reports its own errors */ }
    setTimeout(() => setMovedSlug((s) => (s === slug ? null : s)), 2500)
  }, [onReplyToRoom])

  // Inline editable goal (Patrik: edit the one-line goal right in the spreadsheet)
  const [editingGoalSlug, setEditingGoalSlug] = useState(null)
  const [goalDraft, setGoalDraft] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  // CV6 master-detail: selecting a row opens the detail panel on the right
  const [selectedRowSlug, setSelectedRowSlug] = useState(null)

  // R78: mobile — the 6-column table is unreadable on a phone (room name + goal
  // collapse to zero width). Below 768px each row renders as a stacked card.
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const saveGoal = useCallback(async (slug) => {
    const g = (goalDraft || '').trim()
    setSavingGoal(true)
    try {
      const res = await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_goal', room: slug, goal: g, world: worldId }),
      })
      if (res?.ok) {
        // Editing the goal counts as activity, so bump recency to re-sort the row.
        const nowIso = new Date().toISOString()
        setRows((prev) => prev.map((r) => r.slug === slug ? { ...r, goal: g, lastActivity: nowIso } : r))
        setEditingGoalSlug(null)
      }
    } finally {
      setSavingGoal(false)
    }
  }, [goalDraft, worldId])

  const sendInlineReply = useCallback(async (slug) => {
    const t = (replyText || '').trim()
    if (!t || !slug || !onReplyToRoom) return
    setReplySending(true)
    try {
      const res = await onReplyToRoom(slug, t)
      if (res && res.ok !== false) {
        setReplyText('')
        setReplyOpenSlug(null)
        setReplyDoneSlug(slug)
        setTimeout(() => setReplyDoneSlug(null), 4000)
        // Restart the room's check-in timer (Patrik: replying resets when it gets
        // checked) and bubble it to the top now without waiting for the next poll.
        const nowIso = new Date().toISOString()
        setRows((prev) => prev.map((r) => r.slug === slug ? { ...r, lastActivity: nowIso, liveNow: t.slice(0, 90) } : r))
        authFetch('/api/dashboard/command-deck-action', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'touch_room', room: slug, world: worldId }),
        }).catch(() => {})
      }
    } finally {
      setReplySending(false)
    }
  }, [replyText, onReplyToRoom, worldId])

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
        try {
          const parsed = JSON.parse(await gRes.text())
          // Ensure parsed goals is an object with a rooms property
          goals = (parsed && typeof parsed === 'object' && parsed.rooms && typeof parsed.rooms === 'object')
            ? parsed
            : { rooms: {} }
        } catch { goals = { rooms: {} } }
      } else {
        loadError = true
      }

      const lgRes = await authFetch(deliverablePath('goal-ledger.json'))
      if (lgRes?.ok) {
        try {
          const ledger = JSON.parse(await lgRes.text())
          const ledgerGoals = {}
          // Defensively guard: ledger might be malformed, ensure it's an object with users
          if (ledger && typeof ledger === 'object') {
            Object.values(ledger.users || {}).forEach((u) => {
              if (u && typeof u === 'object') {
                Object.entries(u.goals || {}).forEach(([slug, g]) => { ledgerGoals[slug] = g })
              }
            })
          }
          goals.rooms = goals.rooms || {}
          Object.entries(ledgerGoals).forEach(([slug, lg]) => {
            const base = goals.rooms[slug] || {}
            const baseGoal = (typeof base.goal === 'string' && base.goal.trim()) ? base.goal : ''
            goals.rooms[slug] = {
              ...base,
              // cc-7: if the room has no explicit goal, fall back to the ledger's
              // doc-derived one-line goal so GOAL NOW is never blank for a real
              // room. An explicit (Patrik/loop) goal always wins.
              goal: baseGoal || (lg.goal || ''),
              // cc-6/cc-7 provenance: where this goal came from (user | loop | doc).
              goalSource: baseGoal ? (base.source || lg.goal_source || 'user') : (lg.goal ? (lg.goal_source || 'doc') : null),
              last_touched: lg.last_touched || base.last_touched || null,
              last_touched_by: lg.last_touched_by || null,
              last_touched_label: lg.last_touched_label || null,
              // cc-12: the open question this room is waiting on Patrik to answer
              // (carried in the ledger; the old Command Deck surfaced these as
              // Decide/Answer cards). Surfacing it as a NEEDS YOU status.
              open_question: lg.open_question || base.open_question || null,
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
      let workers = Array.isArray(stuckData.workers) ? stuckData.workers.filter((w) => w && typeof w === 'object') : []
      
      // cc-3: if live fetch failed and workers array is empty, try to reconstruct from goal-ledger sessions
      // (local fallback: show terminal sessions even when the live feed is unavailable)
      if (!sRes?.ok && workers.length === 0 && goals && typeof goals === 'object' && goals.rooms && typeof goals.rooms === 'object') {
        const fallbackWorkers = []
        Object.values(goals.rooms).forEach((room) => {
          if (room && typeof room === 'object' && Array.isArray(room.sessions)) {
            room.sessions.forEach((s) => {
              if (s && typeof s === 'object' && s.name) {
                // Convert ledger session format to worker format
                fallbackWorkers.push({
                  name: s.name,
                  state: s.state || 'idle',
                  intent: s.intent || s.goal || '',
                  detail: s.detail || '',
                  ageSeconds: typeof s.age_seconds === 'number' ? s.age_seconds : (Date.now() - (s.last_active ? new Date(s.last_active).getTime() : 0)) / 1000,
                  updatedAt: s.last_active || new Date().toISOString(),
                })
              }
            })
          }
        })
        workers = fallbackWorkers
      }

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
 let liveNow = '·'
          if (liveWorker) {
 liveNow = liveWorker.detail || liveWorker.intent || '·'
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
          // Keep the FULL goal text on the row: the cell uses CSS ellipsis for
          // display, hover shows the whole thing, and the inline editor seeds
          // from this — truncating here used to silently shorten a room's goal
          // to 80 chars (and strip path-like substrings) the moment Patrik
          // clicked to edit it. cc-7.
          // cc-7: curated ledger goal wins. When a room has no goal set yet but a
          // terminal is actively working it, surface that worker's real intent as the
          // current goal (real data from the live session, NOT a fabricated stub).
          const curatedGoal = (typeof roomGoal.goal === 'string' && roomGoal.goal.trim()) ? roomGoal.goal : ''
          const goal = curatedGoal || (liveWorker ? (liveWorker.intent || liveWorker.detail || '') : '')

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
            goalCurated: !!curatedGoal, // cc-7: Patrik/loop/doc goal shows verbatim; terminal fallback gets a one-line synth
            goalSource: curatedGoal ? (normGoalSource(roomGoal.goalSource) || 'user') : (liveWorker ? 'session' : null), // cc-6 provenance
            status,
            liveNow,
            lastActivity: lastTouched,
            routineId,
            autopilot: roomGoal.autopilot !== false, // default ON; only explicit false reads as off
            openQuestion: roomGoal.open_question || null, // cc-12: room waiting on Patrik's answer
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
          goal: (w.intent || w.detail || ''),
          goalSource: 'session', // cc-6: terminal-derived goal → LIVE chip
          status,
 liveNow: w.detail || w.intent || '·',
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
          // Capture EVERY room in this world. Project-room messages are stored with
          // client_id=<project slug> (NOT the worldId), so .in('client_id',[worldId,...])
          // misses them entirely. world_id scopes to the whole world and catches them all;
          // we keep the client_id paths for legacy rows that predate world_id stamping.
          const orParts = [
            `world_id.eq.${worldId}`,
            `client_id.eq.${worldId}`,
            ...sharedIds.map((s) => `client_id.eq.${s}`),
          ]
          const { data: msgs } = await supabase
            .from('messages')
            .select('agent,project,text,role,timestamp,metadata,client_id,world_id')
            .or(orParts.join(','))
            .order('timestamp', { ascending: false })
            .limit(600)
          const byRoom = {}        // slug -> { ts, lastUserText }
          const isUserMsg = (m) => m.role === 'user' || m.agent === 'user' || m.sender === 'user'
          for (const m of (msgs || [])) {
            // view-1: steer signals (agent:'system' carrying metadata.view_command)
            // are control messages, not room activity — never let them spawn a room.
            if (m.metadata && m.metadata.view_command) continue;
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
 if ((!row.liveNow || row.liveNow === '·') && hit.lastUserText) row.liveNow = hit.lastUserText
          })

          // Add ANY room with recent activity that the stale ledger doesn't list,
          // so a room worked today still appears live. R88: include project-only
          // and agent rooms too (not just project:mission) so a room Patrik is in
          // shows up even without a mission tag; only the worldId itself is skipped.
          const existingSlugs = new Set(tableRows.map(r => r.slug))
          const NINETY = 90 * 60 * 1000
          Object.entries(byRoom)
            .filter(([slug, v]) => slug && slug !== worldId && v.ts && (nowMs - v.ts) < NINETY && !existingSlugs.has(slug))
            .sort((a, b) => b[1].ts - a[1].ts)
            .slice(0, 12)
            .forEach(([slug, v]) => {
              // Find a routine for this project so the toggle still works.
              let routineId = null
              const projectMatch = slug.split(':')[0]
              if (projectMatch && routinesByProject[projectMatch]) {
                const ml = routinesByProject[projectMatch].find((r) => r && r.id && r.name && r.name.includes('master-loop'))
                if (ml && ml.id) routineId = ml.id
              }
              tableRows.push({
                slug,
                display: roomDisplay(slug, map),
                goal: '',
                status: 'active',
 liveNow: v.lastUserText || '·',
                lastActivity: new Date(v.ts).toISOString(),
                routineId,
                isWorkerRow: false,
              })
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

  // R81 (Patrik: "the command deck has to keep up with what is actually happening
  // on the system"): the deck used to load ONCE and go stale — a terminal could
  // start or finish and the deck wouldn't know until you reopened it. Now it
  // refreshes every 10s WHILE OPEN (this overlay only mounts when the tool is open,
  // so the poll is bounded to when you're actually watching — not a background poll).
  // Terminal sessions live on disk (via the tunnel), not Supabase, so realtime alone
  // can't see them; a short poll is the only way to reflect them within Patrik's
  // "no delay longer than ~10s" tolerance.
  useEffect(() => {
    load()
    const t = setInterval(() => {
      // Skip periodic load if user is actively editing, saving, or sending
      if (editingGoalSlug || savingGoal || replySending) return
      load()
    }, 10000)
    return () => clearInterval(t)
  }, [load, editingGoalSlug, savingGoal, replySending])

  // Open the detail pane on the first room by default (the CV6 design shows it
  // open, not blank). Desktop only; mobile starts on the list. Until the user
  // clicks a row, FOLLOW the first room as the sorted list settles (an early load
  // can put a different room first, so don't lock onto a stale pick).
  const userPickedRow = useRef(false)
  useEffect(() => {
    if (isNarrow) return
    if (userPickedRow.current) return
    if (!Array.isArray(rows) || rows.length === 0) return
    const first = rows.find((r) => !r.isWorkerRow) || rows[0]
    if (first?.slug && first.slug !== selectedRowSlug) setSelectedRowSlug(first.slug)
  }, [rows, selectedRowSlug, isNarrow])

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

  // Per-room autopilot: whether the assistant keeps pushing this room forward on its own.
  // Writes the `autopilot` flag onto the room's goal record; master-loop-tick.py honors it.
  const toggleAutopilot = useCallback(async (slug, wantOn) => {
    const key = String(slug || '').split(':').pop().trim() || String(slug || '')
    if (!key) return
    // Capture current state before optimistic update so we can revert on failure
    const currentState = rows.find(r => r && !r.isWorkerRow && String(r.slug || '').split(':').pop().trim() === key)?.autopilot
    setAutopilotBusy((prev) => ({ ...prev, [key]: wantOn }))
    try {
      const res = await authFetch('/api/dashboard/room-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, slug: key, on: wantOn }),
      })
      if (res?.ok) {
        // Reflect the saved value on the row so it sticks after the busy flag clears.
        setRows((prev) => prev.map((r) => (r && !r.isWorkerRow && String(r.slug || '').split(':').pop().trim() === key)
          ? { ...r, autopilot: wantOn } : r))
      } else {
        console.error('Failed to toggle autopilot:', res?.status)
        // Revert optimistic update on error
        setRows((prev) => prev.map((r) => (r && !r.isWorkerRow && String(r.slug || '').split(':').pop().trim() === key)
          ? { ...r, autopilot: currentState } : r))
      }
    } catch (err) {
      console.error('Error toggling autopilot:', err)
      // Revert optimistic update on error
      setRows((prev) => prev.map((r) => (r && !r.isWorkerRow && String(r.slug || '').split(':').pop().trim() === key)
        ? { ...r, autopilot: currentState } : r))
    } finally {
      setAutopilotBusy((prev) => { const next = { ...prev }; delete next[key]; return next })
    }
  }, [worldId, rows])

  // R99 — the global master-loop control. The Command Center is meant to be the
  // master view Patrik steers everything from, so the main loop that pushes every
  // room forward gets one prominent On/Off at the very top — not just buried in the
  // per-room column. Pick the system-kind master-loop routine (the real one), and
  // fall back to any routine whose name carries "master-loop".
  // NOTE: this hook must stay ABOVE the early returns below — calling it
  // conditionally trips React's rules-of-hooks (error #310).
  const masterLoop = useMemo(() => {
    const all = Object.values(routineMap || {}).filter((r) => r && typeof r === 'object' && r.id)
    return (
      all.find((r) => r.kind === 'system' && (r.name || '').includes('master-loop')) ||
      all.find((r) => (r.mission_slug === 'master-loop') && (r.name || '').includes('master-loop')) ||
      all.find((r) => (r.name || '').includes('master-loop')) ||
      null
    )
  }, [routineMap])

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

  const mlOn = masterLoop?.status === 'running'
  const mlToggling = masterLoop?.id ? toggling[masterLoop.id] : undefined
  const mlBusy = typeof mlToggling === 'boolean'
  const mlShownOn = mlBusy ? mlToggling : mlOn
  const fmtAgo = (ts) => {
    if (!ts) return null
    try {
      const diff = Date.now() - new Date(ts).getTime()
      if (diff < 0) return `in ${Math.max(1, Math.round(-diff / 60000))}m`
      if (diff < 60000) return 'just now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
      return `${Math.floor(diff / 86400000)}d ago`
    } catch { return null }
  }

  // Find the selected row for the detail panel
  const selectedRow = selectedRowSlug ? rows.find((r) => r.slug === selectedRowSlug) : null

  // Header counts for the "Command / Goal ledger · N rooms · N live" title + the
  // live/idle/blocked pills (matches the CV6 design header). The pills count EVERY
  // displayed row by its badge status (worker rows sort to the top and show
  // WORKING/BLOCKED, so counting rooms-only made the pills disagree with what's on
  // screen — e.g. "0 live" next to a WORKING row). "N rooms" stays the room count.
  const roomCount = rows.filter((r) => !r.isWorkerRow).length
  const cLive = rows.filter((r) => r.status === 'active' || r.status === 'working').length
  const cIdle = rows.filter((r) => r.status === 'idle').length
  const cBlocked = rows.filter((r) => r.status === 'blocked' || r.status === 'error').length

  return (
    <div
      // R100 — the glass scrim now lives on the shared tool-overlay wrapper in
      // HomeView (covers every tool), so the tracker root no longer needs its own
      // data-cv6-tool-surface tag.
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
      {/* R99 — global master-loop control. The one switch that runs (or stops) the
          assistant pushing every room forward on its own. */}
      {masterLoop && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 16px',
            background: 'var(--cv6-surface)',
            borderBottom: '1px solid var(--cv6-divider)',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: mlShownOn ? 'var(--cv6-accent-success)' : 'var(--cv6-text-tertiary)',
              boxShadow: mlShownOn ? '0 0 8px var(--cv6-accent-success)' : 'none',
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cv6-text-primary)' }}>Master loop</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: mlShownOn ? 'var(--cv6-accent-success)' : 'var(--cv6-text-tertiary)',
                }}
              >
                {mlShownOn ? 'Running' : 'Off'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--cv6-text-tertiary)', marginTop: 1 }}>
              {mlShownOn
                ? `Pushing every room forward${masterLoop.interval_minutes ? ` · every ${masterLoop.interval_minutes}m` : ''}${fmtAgo(masterLoop.last_run_at) ? ` · last ran ${fmtAgo(masterLoop.last_run_at)}` : ''}`
 : 'Paused, rooms only move when you ask'}
            </div>
          </div>
          <button
            type="button"
            disabled={mlBusy || !masterLoop.id}
            onClick={() => masterLoop.id && toggleRoutine(masterLoop.id, !mlOn)}
            title={mlShownOn ? 'Turn the master loop off' : 'Turn the master loop on'}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 13px',
              borderRadius: 7,
              cursor: mlBusy ? 'default' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid',
              borderColor: mlShownOn ? 'var(--cv6-divider)' : 'color-mix(in srgb, var(--cv6-accent-success) 50%, transparent)',
              background: mlShownOn ? 'transparent' : 'color-mix(in srgb, var(--cv6-accent-success) 16%, transparent)',
              color: mlShownOn ? 'var(--cv6-text-secondary)' : 'var(--cv6-accent-success)',
              opacity: mlBusy ? 0.6 : 1,
            }}
          >
            {mlBusy ? '…' : mlShownOn ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      )}

      {/* Master-detail split: ledger on left, detail on right */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, borderTop: '1px solid var(--cv6-divider)' }}>
        {/* Ledger column (left) */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
 {/* Title header, "Command / Goal ledger · N rooms · N live" + live/idle/blocked pills (CV6 design) */}
          {!isNarrow && (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '18px 24px 14px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--cv6-text-primary)' }}>Command</div>
                <div style={{ fontSize: 12.5, color: 'var(--cv6-text-secondary)', marginTop: 3 }}>Goal ledger · {roomCount} {roomCount === 1 ? 'room' : 'rooms'} · {cLive} live</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {cLive > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--cv6-accent-success)', background: 'var(--cv6-accent-success-weak)', padding: '4px 10px', borderRadius: 13 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cv6-accent-success)' }} />{cLive} live
                  </span>
                )}
                {cIdle > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11.5, fontWeight: 600, color: 'var(--cv6-text-secondary)', background: 'var(--cv6-surface2)', padding: '4px 10px', borderRadius: 13 }}>{cIdle} idle</span>
                )}
                {cBlocked > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11.5, fontWeight: 600, color: 'var(--cv6-accent-warn)', background: 'var(--cv6-accent-warn-weak)', padding: '4px 10px', borderRadius: 13 }}>{cBlocked} blocked</span>
                )}
              </div>
            </div>
          )}
          {/* Header row — matches CV6 design: ROOM, CURRENT GOAL, SET BY, STATUS (170px, flex, 130px, 110px) */}
          <div
            style={{
              display: isNarrow ? 'none' : 'grid',
              gridTemplateColumns: '160px 1fr 110px 90px',
              gap: '12px',
              padding: '12px 24px',
              background: 'var(--cv6-surface)',
              borderBottom: '1px solid var(--cv6-divider)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            {['ROOM', 'CURRENT GOAL', 'SET BY', 'STATUS'].map((col) => (
              <div
                key={col}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'var(--cv6-text-tertiary)',
                }}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Rows container */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {rows.map((row, idx) => {
        // Look up routine status by the routineId (room-goal rows only)
        const routine = row.routineId && typeof routineMap[row.routineId] === 'object'
          ? routineMap[row.routineId]
          : null
        const routineOn = routine?.status === 'running'
        const isToggling = row.routineId && toggling[row.routineId]
        // cc-12: a room with an unanswered open question is waiting on Patrik —
        // surface it as a NEEDS YOU status (amber, the brand accent) so the
        // Command Center carries the old Command Deck's decisions capability.
        const needsYou = !!(row.openQuestion && String(row.openQuestion).trim())
        const color = needsYou ? 'var(--cv6-accent-primary)' : statusColor(row.status)
        const label = needsYou ? 'NEEDS YOU' : statusLabel(row.status)

        const isHovered = hoveredRoutineId === row.routineId
        // Worker rows are read-only (no routine toggle)
        const isWorkerRow = row.isWorkerRow === true

        return (
         <div key={row.slug || `row-${idx}`} style={{ borderBottom: '1px solid var(--cv6-divider)' }}>
          <div
            onClick={() => {
              if (!isWorkerRow) {
                // Master-detail: select this goal to open the detail panel on the right.
                // (Do NOT jump to the room here — that navigated away before the panel showed.)
                userPickedRow.current = true
                setSelectedRowSlug(row.slug)
                setReplyOpenSlug(null)
              }
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: isNarrow ? 'auto 1fr auto' : '160px 1fr 110px 90px',
              gridTemplateAreas: isNarrow ? '"room room toggle" "goal goal goal" "status live last"' : undefined,
              gap: isNarrow ? '7px 10px' : '12px',
              padding: isNarrow ? '14px 16px' : '12px 24px',
              background: isWorkerRow ? 'rgba(255,255,255,0.01)' : (isHovered ? 'var(--cv6-surface-hover)' : 'var(--cv6-surface)'),
              cursor: isWorkerRow ? 'default' : 'pointer',
              transition: 'background 120ms ease',
              alignItems: 'center',
              minHeight: '64px',
              opacity: isWorkerRow ? 0.95 : 1,
            }}
            onMouseEnter={() => !isWorkerRow && setHoveredRoutineId(row.routineId)}
            onMouseLeave={() => !isWorkerRow && setHoveredRoutineId(null)}
          >
            {/* ROOM — color dot + name */}
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, gridArea: isNarrow ? 'room' : undefined }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--cv6-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {(row.display && row.display.name) || row.slug || '(unnamed)'}
                </div>
              </div>
            </div>

            {/* CURRENT GOAL — click to edit (room rows) */}
            {editingGoalSlug === row.slug && !isWorkerRow ? (
              <input
                autoFocus
                value={goalDraft}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setGoalDraft(e.target.value)}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') saveGoal(row.slug); if (e.key === 'Escape') setEditingGoalSlug(null) }}
                onBlur={() => saveGoal(row.slug)}
                disabled={savingGoal}
                placeholder="One-line goal…"
                style={{
                  fontSize: 13.5, minWidth: 0, width: '100%', padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-ground)',
                  color: 'var(--cv6-text-primary)', fontFamily: 'inherit', outline: 'none',
                  gridArea: isNarrow ? 'goal' : undefined,
                }}
              />
            ) : (
              <div
                onClick={(e) => { if (!isWorkerRow) { e.stopPropagation(); setEditingGoalSlug(row.slug); setGoalDraft(row.goalCurated ? cleanCell(row.goal) : synthGoal(row.goal)) } }}
                title={row.goalCurated ? (isWorkerRow ? undefined : 'Click to edit the goal') : (cleanCell(row.goal) || undefined)}
                style={{
                  fontSize: 13.5,
                  color: 'var(--cv6-text-primary)',
                  whiteSpace: isNarrow ? 'normal' : 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: isNarrow ? '-webkit-box' : undefined,
                  WebkitLineClamp: isNarrow ? 3 : undefined,
                  WebkitBoxOrient: isNarrow ? 'vertical' : undefined,
                  minWidth: 0,
                  cursor: isWorkerRow ? 'default' : 'pointer',
                  gridArea: isNarrow ? 'goal' : undefined,
                }}
              >
 {(row.goalCurated ? cleanCell(row.goal) : synthGoal(row.goal)) || '·'}
              </div>
            )}

 {/* SET BY, "Who · time ago". `last_touched_label` is whatever actually
                moved the goal (a person, "loop review", a commit subject). When the
                ledger recorded nobody, the row says Unknown — it does not credit the
                workspace owner for work that has no recorded author. */}
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--cv6-text-tertiary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
 {row.lastActivity ? `${row.last_touched_label || 'Unknown'} · ${relativeTime(row.lastActivity)}` : '·'}
            </div>

            {/* STATUS */}
            <div
              title={needsYou ? `Waiting on your answer: ${cleanCell(row.openQuestion)}` : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                justifyContent: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            </div>
          </div>
          {/* Inline reply composer (expands under the row) */}
          {replyOpenSlug === row.slug && !isWorkerRow && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', gap: 8, padding: '10px 16px 12px', background: 'var(--cv6-surface)', alignItems: 'center' }}
            >
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendInlineReply(row.slug); if (e.key === 'Escape') setReplyOpenSlug(null) }}
                placeholder={`Quick reply to ${(row.display && row.display.name) || row.slug}…`}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--cv6-divider)',
                  background: 'var(--cv6-ground)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: 13, outline: 'none',
                }}
              />
              <button
                onClick={() => sendInlineReply(row.slug)}
                disabled={!replyText.trim() || replySending}
                style={{
                  padding: '8px 14px', borderRadius: 6, border: 'none', cursor: replyText.trim() && !replySending ? 'pointer' : 'not-allowed',
                  background: replyText.trim() && !replySending ? 'var(--cv6-accent-primary)' : 'var(--cv6-hover)',
                  color: replyText.trim() && !replySending ? '#fff' : 'var(--cv6-text-tertiary)', fontSize: 13, fontWeight: 600,
                }}
              >
                {replySending ? 'Sending…' : 'Send'}
              </button>
            </div>
          )}
          {replyDoneSlug === row.slug && (
            <div style={{ padding: '0 16px 10px', fontSize: 11, color: 'var(--cv6-accent-success)' }}>
              Reply sent. The room will pick it up on its next check.
            </div>
          )}
         </div>
        )
            })}
          </div>
        </div>

        {/* Detail panel (right) — CV6 master-detail split */}
        {selectedRow && (
          <div
            style={{
              width: 420,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid var(--cv6-divider)',
              overflowY: 'auto',
              padding: '22px 22px 28px',
              background: 'var(--cv6-ground)',
            }}
          >
            {/* Room name + status chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: statusColor(selectedRow.status), flexShrink: 0 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--cv6-text-primary)', flex: 1 }}>
                {(selectedRow.display && selectedRow.display.name) || selectedRow.slug || '(unnamed)'}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: statusColor(selectedRow.status),
                  background: statusColor(selectedRow.status).includes('success') ? 'var(--cv6-accent-success-weak)' : 'var(--cv6-surface2)',
                  padding: '4px 9px',
                  borderRadius: 6,
                }}
              >
                {statusColor(selectedRow.status).includes('success') && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cv6-accent-success)', animation: 'livePulse 1.8s infinite' }} />
                )}
                {statusLabel(selectedRow.status)}
              </span>
            </div>

            {/* Current goal label */}
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv6-text-tertiary)', marginBottom: 8 }}>
              Current goal
            </div>

            {/* Goal text */}
            <div style={{ fontSize: 17, lineHeight: 1.4, fontWeight: 600, color: 'var(--cv6-text-primary)', marginBottom: 16 }}>
 {(selectedRow.goalCurated ? cleanCell(selectedRow.goal) : synthGoal(selectedRow.goal)) || '·'}
            </div>

            {/* Live activity indicator (if applicable) */}
            {selectedRow.liveNow && (
              <div style={{ background: 'var(--cv6-surface2)', borderRadius: 11, padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--cv6-accent-success)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 7 10 12 5 17" /><line x1="13" y1="17" x2="19" y2="17" /></svg>
                {selectedRow.liveNow.slice(0, 60)}
              </div>
            )}

            {/* Checklist section — real data has no per-goal steps yet, so show an
                honest empty state (no fabricated steps). TODO(cv6: real checklist source). */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv6-text-tertiary)' }}>
                Checklist
              </span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--cv6-text-tertiary)', marginBottom: 16 }}>
              No steps yet — the loop breaks this goal into steps as it works it.
            </div>

            {/* Info box: master-loop queue verification */}
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: 'var(--cv6-surface2)', borderRadius: 10, padding: '11px 13px', marginBottom: 22 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16v-4M12 8v.5" />
              </svg>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--cv6-text-tertiary)' }}>
 Finished steps join the <strong style={{ color: 'var(--cv6-text-primary)', fontWeight: 600 }}>master-loop queue</strong>, the loop verifies each before it's marked done.
              </span>
            </div>

            {/* Autopilot toggle (real toggleAutopilot handler) + Re-task quick action */}
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <button
                onClick={() => toggleAutopilot(selectedRow.slug, !selectedRow.autopilot)}
 title={selectedRow.autopilot ? 'Autopilot on, the loop keeps pushing this room forward' : 'Autopilot off, this room moves only when you ask'}
                style={{
                  flex: 'none',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 11,
                  border: 'none',
                  background: selectedRow.autopilot ? 'var(--cv6-accent-success-weak)' : 'var(--cv6-surface2)',
                  color: selectedRow.autopilot ? 'var(--cv6-accent-success)' : 'var(--cv6-text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Inter',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedRow.autopilot ? 'var(--cv6-accent-success)' : 'var(--cv6-text-tertiary)' }} />
                Autopilot {selectedRow.autopilot ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => onReplyToRoom?.(selectedRow.slug, `Let's make real progress on ${(selectedRow.display && selectedRow.display.name) || selectedRow.slug}. What's the single highest-value next step, and can you start it now?`)}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 11,
                  border: 'none',
                  background: 'var(--cv6-accent-primary)',
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: 'Inter',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Re-task
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}