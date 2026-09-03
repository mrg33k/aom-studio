// useDataPipe -- ONE hook, ONE data source, ONE truth.
//
// corner:retire-supabase (2026-09-03): the whole pipe reads Convex now. What
// used to be one /api/dashboard/supabase-status poll plus four Supabase Realtime
// channels is four Convex queries, each held open as a live subscription over
// the Convex websocket client, so a new message, a task status change, an agent
// status stamp or a project edit reaches the screen without any polling:
//
//   rooms:listRooms    the rail (room previews, unread state) - was messages + agent_status project rows
//   tasks:find         the task queue                          - was tasks (legacy + v2)
//   agents:listStatus  the roster with idle/working dots       - was agent_status
//   projects:list      the project registry                    - was projects
//
// Rule from before still holds: if the activity feed updates and the pill count
// does not, something is reading separately. Kill it.

import { useState, useEffect, useCallback, useRef } from 'react'
import { authFetch } from '../lib/authFetch'
import { getClientId } from '../lib/clientConfig'
import { isRoomActivityNoise, isMachinePreview } from '../cv6next/data/presentationClean.js'
import { convexQuery, convexWorldId, subscribeConvexQuery, getConvexReactClient } from '../cv6next/data/convexClient.js'
import { convexViewerIdentity, convexReadIdentity } from '../cv6next/data/convexIdentity.js'

// The page's one live Convex socket (src/dashboard/lib/convex.js). It carries
// the signed-in person's token, so world-scoped queries answer for them.
export function liveConvexClient() {
  if (typeof window === 'undefined') return null
  try { return getConvexReactClient() } catch { return null }
}

// Subscribe to a Convex query by its "module:function" path. The callback runs
// with the first value and again every time the server says it changed.
// Returns a stop function. A subscription that cannot start returns a no-op
// stop, so callers keep their one-shot read and simply lose liveness, never
// the data.
export function subscribeConvex(path, args, onValue, onError) {
  try {
    return subscribeConvexQuery(path, args || {}, onValue, (err) => {
      console.warn(`[Corner Convex] ${path} subscription error:`, err)
      if (onError) onError(err)
    })
  } catch (err) {
    console.warn(`[Corner Convex] could not subscribe to ${path}:`, err)
    return () => {}
  }
}

// Catch Up = ONLY the things where Patrik is the bottleneck to respond (his words,
// 2026-06-26). The raw "unread agent message" feed is far too broad: it's full of
// internal THOUGHT reasoning logs, embedded site-chat conversations (not his inbox at
// all), file drops, status updates ("Ready.", "All shipped"), and task-done notices.
// None of those need a decision from him. This predicate keeps an item only when the
// agent is genuinely waiting on Patrik: an explicit needs-input signal, a choices/
// approval block, or a message that actually asks him something.
const ASK_RE = /\b(should i|shall i|which (?:one|option|do|of)|do you want|want me to|would you like|can you (?:confirm|approve|decide|clarify)|need(?:s)? your|your call|your take|let me know|waiting on you|ok(?:ay)? to|sign ?off|approve|go ahead|do you prefer|prefer (?:option|that|this)|thoughts\?|which way)\b/i
function inboxNeedsResponse(msg) {
  const md = (msg && msg.metadata) || {}
  // Embedded widget conversations (e.g. a site's visitor chat) are not Patrik's inbox.
  if (md.embed_source || md.embed_id || md.embed_room || md.embed_visitor_id) return false
  // Ops/infra alerts from supervisor and watchdog daemons are never user asks.
  // These land in the ops room (corner:bridge) and are stamped kind='ops-alert'.
  if (md.kind === 'ops-alert' || md.supervisor_alert === true) return false
  const text = String((msg && msg.text) || '')
  // Internal agent reasoning the bridge logs — never a user-facing ask.
  if (/^\s*THOUGHT\b/i.test(text)) return false
  // Pure file drops are FYI (they live in the room + Files panel), not a bottleneck.
  if (md.attachment && /^\s*attached file/i.test(text)) return false
  // File-share notices ('Shared a file: ...') are informational.
  if (/^shared a file\s*:/i.test(text.trim())) return false
  // Bare acknowledgements ('Synced. Standing by.', 'OK', 'Ready.') are status pings, not asks.
  if (/^(synced\.?|standing by\.?|ok\.?|ready\.?|on it\.?|noted\.?|all (good|done|clear)\.?)$/i.test(text.trim())) return false
  // URL-dominated bodies are informational (a bare link, not a question).
  if (/^https?:\/\/\S+\.?\s*$/.test(text.trim())) return false
  // Explicit machine signals that an agent is blocked on Patrik always count.
  if (md.status === 'needs_input' || md.needs_input === true) return true
  if (Array.isArray(md.blocks) && md.blocks.some((b) => b && (b.type === 'choices' || b.type === 'question' || b.type === 'approval'))) return true
  // A finished-task notification (status set, not needs_input) is informational, not a bottleneck.
  if (md.task_id && md.status && md.status !== 'needs_input') return false
  // Otherwise: does the message actually ask him to decide/answer something?
  const trimmed = text.trim()
  if (/\?\s*$/.test(trimmed)) return true
  return ASK_RE.test(trimmed)
}

// The GREEN DOT feed is a different question from the "needs you" feed above.
// inboxNeedsResponse answers "is an agent BLOCKED on Patrik" and deliberately drops
// status updates, task-done notices and file shares — correct for the catch-up inbox,
// wrong for "they just messaged us" (Patrik 2026-08-06). This one keeps every real
// agent message and only strips things that were never addressed to a human.
function unreadIsRealMessage(msg) {
  const md = (msg && msg.metadata) || {}
  if (md.embed_source || md.embed_id || md.embed_room || md.embed_visitor_id) return false
  if (md.kind === 'ops-alert' || md.supervisor_alert === true) return false
  const text = String((msg && msg.text) || '').trim()
  if (!text) return false
  if (/^\s*THOUGHT\b/i.test(text)) return false
  return true
}

// A catch-up summary should read as WHAT the agent needs from Patrik, not a generic
// status line. Strip markdown, then prefer the actual question (the last sentence
// ending in '?'); fall back to the opening sentence. Capped so the card stays scannable.
function summarizeAsk(text) {
  const s = String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const questions = s.match(/[^.?!]*\?/g)
  if (questions && questions.length) return questions[questions.length - 1].trim().slice(0, 180)
  return s.slice(0, 180)
}
import { AGENTS as GRID_AGENTS } from '../gridSpec'
import { useSystemToast } from '../SystemToast'

const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// ---- RELATIVE TIME FORMATTER ------------------------------------------------
export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const now = new Date()
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay === 1) return 'yesterday'
    if (diffDay < 7) return `${diffDay}d ago`
    return dateStr.split('T')[0]
  } catch {
    return dateStr
  }
}


// ---- DERIVE YOUR TODOS from parsed punch data --------------------------------
// Your TODOs = BLOCKERS that only Patrik can unblock.
// Source: ONLY the "## YOUR TODOS [Patrik]" section (section key 'your-todos').
// Not a scan of every [Patrik] tag across the entire punch-list (that double-counts).
function derivePatrikTodos(punchData) {
  if (!punchData?.projects) return []
  const todos = []
  for (const project of punchData.projects) {
    // Only pull from the your-todos section (blocker items needing Patrik's action)
    if (project.section !== 'your-todos') continue
    for (const task of project.tasks) {
      if (task.done) continue
      todos.push({
        text: task.text,
        agent: 'patrik',
        project: project.name,
        projectSection: project.section,
        projectColor: project.color,
        raw: task.raw,
        done: false,
      })
    }
  }
  return todos
}

// ---- DERIVE FINISH THESE (stale tasks) from parsed punch data ----------------
function deriveFinishThese(punchData) {
  if (!punchData?.projects) return []
  const stale = []
  const activeSections = new Set(['rightnow', 'schedule', 'today', 'your-todos', 'finish-these', 'checking-in'])
  for (const project of punchData.projects) {
    if (activeSections.has(project.section)) continue
    for (const task of project.tasks) {
      if (task.done) continue
      const hasBlockedKeyword = /blocked|overdue|behind|zero|waiting|red|urgent/i.test(task.raw || '')
      const hasRecentKeyword = /shipped|done|live|active|relaunched/i.test(task.raw || '')
      if (hasRecentKeyword) continue
      if (hasBlockedKeyword) {
        stale.push({
          text: task.text,
          agent: task.agent,
          project: project.name,
          projectSection: project.section,
          projectColor: project.color,
          raw: task.raw,
          done: false,
          isStale: true,
        })
      }
    }
  }
  return stale.slice(0, 6)
}

// ---- DERIVE PROJECT PROGRESS from parsed punch data --------------------------
function deriveProjectProgress(punchData) {
  if (!punchData?.projects) return {}
  const progress = {}
  for (const project of punchData.projects) {
    const total = project.tasks.length
    const done = project.tasks.filter(t => t.done).length
    progress[project.section] = { done, total, remaining: total - done }
  }
  return progress
}

// ---- CONVEX ROW SHAPING ------------------------------------------------------
// The four reads, and how each is folded into the shape the derivation below
// has always consumed (agents, projects, projectDefs, tasks, tasksV2, rooms).

// Statuses the two task views used to be split on. The legacy list is what the
// pills and the done-awaiting-approval inbox read; the v2 list is what the
// Right Now bar and the completed feed read. Same rows, two lenses, exactly as
// the two Supabase queries overlapped before.
const LEGACY_TASK_STATUSES = new Set(['queued', 'active', 'todo', 'working', 'needs_input', 'completed'])
const V2_TASK_STATUSES = new Set(['queued', 'classifying', 'planning', 'building', 'running', 'qa', 'done', 'failed'])
const TASK_TEXT_MAX = 280
const TASK_FETCH_LIMIT = 300

function slimMeta(md) {
  if (!md || typeof md !== 'object' || Array.isArray(md)) return md
  const out = {}
  for (const [k, v] of Object.entries(md)) {
    if (v == null || typeof v === 'object') continue
    out[k] = (typeof v === 'string' && v.length > TASK_TEXT_MAX) ? v.slice(0, TASK_TEXT_MAX) : v
  }
  return out
}

// One task row, the way both lenses read it: `text` and `agent` filled from the
// v2 columns when the legacy ones are empty, long fields cut to a display length.
function normalizeTask(t) {
  if (!t || typeof t !== 'object') return t
  const out = { ...t }
  out.text = out.text || out.title || ''
  out.agent = out.agent || out.agent_identity || null
  for (const f of ['text', 'description', 'result', 'error']) {
    if (typeof out[f] === 'string' && out[f].length > TASK_TEXT_MAX) out[f] = out[f].slice(0, TASK_TEXT_MAX)
  }
  if (out.metadata && typeof out.metadata === 'object') out.metadata = slimMeta(out.metadata)
  return out
}

// Infrastructure project slugs never reach a rail (same list the old status
// route kept server-side).
function isInfraSlug(slug) {
  if (!slug) return false
  const s = String(slug).toLowerCase()
  return s === 'bridge-smoke' || s.startsWith('lab-') || s.startsWith('qa-') || s.startsWith('smoke-') || s.startsWith('proj-tool-') || s.startsWith('loop-test-') || s === 'daily-research'
}

// "aom:project:wolfpack" -> "wolfpack"; "aom:mission:corner:x" -> "corner:x".
function legacyTail(room, worldId) {
  const legacy = String(room?.legacyRoomId || '')
  if (!legacy) return ''
  const prefix = `${worldId}:${room.kind}:`
  if (legacy.startsWith(prefix)) return legacy.slice(prefix.length)
  const idx = legacy.indexOf(`:${room.kind}:`)
  return idx >= 0 ? legacy.slice(idx + room.kind.length + 2) : ''
}

function toIso(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return null
  try { return new Date(n).toISOString() } catch { return null }
}

// Read the four Convex sources once over plain fetch. Used on mount, on a world
// change, on cv6:data-refresh and by refetch(); the live subscriptions carry
// every change after that.
async function readConvexSnapshot(cxWorld, userId) {
  const [rooms, tasks, agents, projects] = await Promise.all([
    convexQuery('rooms:listRooms', { worldId: cxWorld, ...(userId ? { userId } : {}) }).catch(() => []),
    convexQuery('tasks:find', { client_id: cxWorld, order: 'created_at.desc', limit: TASK_FETCH_LIMIT }).catch(() => []),
    convexQuery('agents:listStatus', { worldId: cxWorld }).catch(() => []),
    convexQuery('projects:list', { worldId: cxWorld, includeShared: true }).catch(() => []),
  ])
  return { rooms, tasks, agents, projects }
}

// =============================================================================
// useDataPipe -- THE hook. One read, four live subscriptions. All data.
//
// Parameters:
//   parsePunchList: function(markdown) => { projects: [], todayTasks: [] }
//     Each consumer passes their own parsePunchList (GameHUD has CLIENT_SUBSECTION_MAP,
//     ChecklistMode has a simpler version). This keeps the config where it belongs.
//
// Returns: { rightNow, completedFeed, yourTodos, finishThese, schedule, projectProgress,
//            pillCounts, isAutoChecked, punchData, punchLoading, lastUpdated, refetch }
// =============================================================================
// options.enabled=false renders the hook inert (no fetch, no subscriptions)
// while keeping the hook call unconditional for the rules of hooks.
// Used by consumers that receive the shared DataContext pipe instead of owning
// one — qa-sweep 2026-07-17 found FOUR live pipes on one /dashboard load
// (DataProvider + useCommand + useTrackerBugs + ActivityDock's useCommand),
// quadrupling every poll and realtime INSERT handler.
export function useDataPipe(parsePunchList, worldId, currentUserSlug = null, options = {}) {
  const enabled = options.enabled !== false
  const [rightNow, setRightNow] = useState([])
  const [completedFeed, setCompletedFeed] = useState([])
  const [inboxItems, setInboxItems] = useState([])
  // Rooms with a new agent message Patrik has not answered — updates included.
  const [unreadRooms, setUnreadRooms] = useState([])
  const [personalTodos, setPersonalTodos] = useState([])
  const [todoItems, setTodoItems] = useState([])
  const [punchData, setPunchData] = useState(null)
  const [punchLoading, setPunchLoading] = useState(IS_LOCAL)
  const [lastUpdated, setLastUpdated] = useState(null)
  // Agent roster for the current world, from agents:listStatus (replaces hardcoded ALL_AGENT_SLUGS)
  const [liveAgents, setLiveAgents] = useState([])
  // Project rooms: rooms:listRooms kind=project merged with the projects registry.
  const [liveProjectRooms, setLiveProjectRooms] = useState([])
  // Mission rooms: missions with last_message_at from the room preview, so Recently Active
  // on Home can surface missions the user actively worked in (not only inbox-pinged ones).
  const [missionRooms, setMissionRooms] = useState([])
  // Direct 1:1 agent threads with computed last activity, for Recently Active.
  const [agentThreadRooms, setAgentThreadRooms] = useState([])

  // Liveness detection -- toast when agents go silent or tasks stall
  const { showToast } = useSystemToast()
  const showToastRef = useRef(showToast)
  showToastRef.current = showToast

  // Auto-check keywords stored in ref for stable callback
  const keywordsRef = useRef(new Set())

  // Store parsePunchList in a ref so the callback doesn't re-create on every render
  const parseFnRef = useRef(parsePunchList)
  parseFnRef.current = parsePunchList
  // R14e-4: currentUserSlug is a prop that resolves asynchronously. applyData is
  // stable across renders; without a ref, the closure would capture the initial
  // null value forever and personal-todos would never populate.
  const currentUserSlugRef = useRef(currentUserSlug)
  currentUserSlugRef.current = currentUserSlug

  // corner:corner-ui-cv6 (2026-06-24): the project-room list (84 rooms Patrik waits
  // on) is rebuilt on every change. When nothing changed, that re-renders the whole
  // list for no reason. Keep the last serialized list and skip the setter when identical.
  const projectRoomsSigRef = useRef('')

  // The latest value of each source. Live subscriptions patch one key at a time;
  // the derivation always runs over the whole set.
  const dataRef = useRef({ rooms: null, tasks: null, agents: null, projects: null })
  // Local dev: the punch-list markdown read off disk, parsed by the consumer.
  const punchContentRef = useRef('')

  // ---- THE DERIVATION: Convex rows in, every list the screens read out ----
  const applyData = useCallback((data) => {
    try {
      const clientId = getClientId()
      const cxWorld = convexWorldId(clientId)
      const roomRows = Array.isArray(data.rooms) ? data.rooms.filter((r) => r && !r.archived) : []
      const taskRows = (Array.isArray(data.tasks) ? data.tasks : []).map(normalizeTask)
      const agentRows = Array.isArray(data.agents) ? data.agents : []
      const projectRows = Array.isArray(data.projects) ? data.projects : []

      // Two lenses on the one task table (see LEGACY_TASK_STATUSES).
      const tasks = taskRows.filter((t) => LEGACY_TASK_STATUSES.has(t.status))
      const tasksV2 = taskRows.filter((t) => V2_TASK_STATUSES.has(t.status))

      // The registry rows the pills and pickers read as projectDefs.
      const projectDefs = projectRows
        .filter((p) => p && p.slug && !p.archived && !isInfraSlug(p.slug))
        .map((p) => ({
          id: p._id || p.slug,
          slug: p.slug,
          name: p.name || p.slug,
          color: p.color || null,
          icon: 'project',
          is_active: p.isActive !== false,
          is_shared: !!p.sharedRole,
        }))

      // Right Now + queued + done-awaiting-approval + todo + personal.
      {
        const active = []
        const queuedEntries = tasks
          .filter(t => t.status === 'queued')
          .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task queued`, isLive: true, isQueued: true, taskId: t.id }))
        active.push(...queuedEntries)

        // ALWAYS: Done tasks awaiting approval -> Inbox pill (not Right Now)
        // R14e-4: read fresh slug from ref (the closure captured the mount-time value).
        const slug = currentUserSlugRef.current
        const doneEntries = tasks
          .filter(t => t.status === 'done' && t.agent !== slug)
          .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
        active.push(...doneEntries)

        // Todo tasks for To Do pill (never shown in Right Now)
        const todoEntries = tasks
          .filter(t => t.status === 'todo' && t.agent !== slug)
          .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task`, taskId: t.id, done: false, project: t.project }))
        setTodoItems(todoEntries)

        // Viewer's personal tasks (null-safe: empty when slug is unknown)
        const ownerEntries = slug
          ? tasks
              .filter(t => t.agent === slug && t.status !== 'completed' && t.status !== 'done')
              .map(t => ({ text: t.text || '', agent: slug, taskId: t.id, done: false, project: t.project }))
          : []
        setPersonalTodos(ownerEntries)

        // Architecture v2: task-runner tasks (source of truth for Right Now bar).
        // Right Now = status building | running | qa. running is set by task-runner.sh claim.
        // Tasks clear on completion (status -> done/failed), NOT on timeout.
        const v2RightNow = tasksV2.filter(t => t.status === 'building' || t.status === 'running' || t.status === 'qa')
        const alreadyInActive = new Set(active.map(t => t.taskId).filter(Boolean))
        for (const t of v2RightNow) {
          if (!alreadyInActive.has(t.id)) {
            active.push({
              agent:   t.agent_identity || t.agent || 'system',
              text:    t.title || t.description || 'Working...',
              isLive:  t.status === 'building' || t.status === 'running',
              isQA:    t.status === 'qa',
              isQueued: false,
              taskId:  t.id,
              fromTasksV2: true,
            })
          }
        }
        setRightNow(active)
      }

      // Agent roster for status dots (agents:listStatus).
      setLiveAgents(agentRows.map((a) => ({
        slug: a.slug,
        name: a.title || a.slug,
        display_name: null,
        role: a.subtitle || '',
        chatTitle: null,
        status: a.status || 'idle',
        currentTask: a.currentTask || '',
        color: a.color || null,
        updatedAt: toIso(a.updatedAt),
        statusSource: null,
        statusSetAt: toIso(a.updatedAt),
        last_naming_nudge_at: null,
        is_super: false,
        is_ea: false,
        is_terminal: false,
        is_owner: false,
      })))

      // Project rooms — MERGES two sources so every switcher matches Home:
      //   1) rooms:listRooms kind=project (the chat rooms, with previews)
      //   2) projects:list (the registry), which may hold projects with no
      //      room yet. Without this merge those are silently dropped.
      const fromRooms = []
      const roomSlugs = new Set()
      for (const r of roomRows) {
        if (r.kind !== 'project') continue
        const slug = legacyTail(r, cxWorld) || r.project || ''
        if (!slug || isInfraSlug(slug) || roomSlugs.has(slug)) continue
        roomSlugs.add(slug)
        fromRooms.push({
          id: slug,
          slug,
          name: r.title || slug,
          color: '#6B8AB0',
          is_active: true,
          isShared: false,
          section: 'general',
          tasks: [],
          isClient: false,
          status: 'IDLE',
          status_set_at: toIso(r.lastMessage?.createdAt),
        })
      }
      const fromDefs = projectDefs
        .filter(p => !roomSlugs.has(p.slug))
        .map(p => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          color: p.color || '#6B8AB0',
          is_active: p.is_active !== false,
          isShared: p.is_shared,
          section: 'general',
          tasks: [],
          isClient: false,
          status: 'IDLE',
        }))
      const merged = [...fromRooms, ...fromDefs]

      // Recency + previews from the room rows. A room belongs to exactly ONE
      // bucket (mission > project > agent), same precedence deriveRoomId uses.
      // Mission activity still rolls up into the parent project's ORDER (the
      // folder leads the list while you work inside one of its missions), but
      // the project's own surfaced preview excludes missions (corner:front-door Bug 2).
      {
        const ARTIFACT_RE = /^(?:qa\/|screenshots?\/|r\d+[-.]|census-|\.)|([-_]shot[-_]|[-_]critique[-_])/i
        const previewOf = (text, lm) => {
          const t = String(text || '').replace(/\s+/g, ' ').trim()
          if (!t || t.startsWith('{') || t.startsWith('[')) return ''
          if (ARTIFACT_RE.test(t)) return ''
          if (isMachinePreview(t, lm)) return ''
          return t.slice(0, 160)
        }
        const projRecency = {}
        const projRollup = {}
        const missionRecency = {}
        const agentRecency = {}
        for (const r of roomRows) {
          const lm = r.lastMessage
          if (!lm || !lm.createdAt) continue
          const msgLike = { text: lm.text || '', metadata: {} }
          if (isRoomActivityNoise(msgLike)) continue
          const t = Number(lm.createdAt)
          if (!Number.isFinite(t)) continue
          const preview = previewOf(lm.text, msgLike)
          if (r.kind === 'mission') {
            const ms = legacyTail(r, cxWorld) || (r.project ? `${r.project}:${r._id}` : String(r._id))
            const projectSlug = r.project || (ms.includes(':') ? ms.split(':')[0] : '')
            if (projectSlug && (!projRollup[projectSlug] || t > projRollup[projectSlug])) projRollup[projectSlug] = t
            if (!missionRecency[ms] || t > missionRecency[ms].ts) missionRecency[ms] = { ts: t, project: projectSlug, text: preview }
          } else if (r.kind === 'project') {
            const slug = legacyTail(r, cxWorld) || r.project || ''
            if (!slug) continue
            if (!projRollup[slug] || t > projRollup[slug]) projRollup[slug] = t
            if (!projRecency[slug] || t > projRecency[slug].t) projRecency[slug] = { t, text: preview }
          } else {
            const slug = legacyTail(r, cxWorld) || r.specialist || ''
            if (!slug) continue
            if (!agentRecency[slug] || t > agentRecency[slug].ts) agentRecency[slug] = { ts: t, text: preview }
          }
        }
        for (const p of merged) { const rec = projRecency[p.slug]; p.last_message_at = rec ? rec.t : 0; p.last_message_text = rec ? rec.text : '' }
        merged.sort((a, b) => ((projRollup[b.slug] || b.last_message_at || 0) - (projRollup[a.slug] || a.last_message_at || 0)) || (a.name || '').localeCompare(b.name || ''))
        setMissionRooms(Object.entries(missionRecency).map(([slug, v]) => ({ slug, project: v.project, last_message_at: v.ts, last_message_text: v.text || '' })))
        // Direct agent threads accumulate rather than replace, pruned at 24h, so
        // a thread does not vanish from recents between two answers.
        const agentThreadList = Object.entries(agentRecency).map(([agent, v]) => ({ agent, last_message_at: v.ts, last_message_text: v.text || '' }))
        const cutoff = Date.now() - 24 * 60 * 60 * 1000
        setAgentThreadRooms(prev => {
          const map = {}
          for (const a of (prev || [])) { if (a.last_message_at >= cutoff) map[a.agent] = a }
          for (const a of agentThreadList) { if (!map[a.agent] || a.last_message_at > map[a.agent].last_message_at) map[a.agent] = a }
          return Object.values(map)
        })
      }
      if (merged.length > 0) {
        const sig = JSON.stringify(merged)
        if (sig !== projectRoomsSigRef.current) { projectRoomsSigRef.current = sig; setLiveProjectRooms(merged) }
      }
      // The set of project rooms that still exist. Anything absent is archived
      // (or deleted) and must not keep spawning catch-up cards. Guarded on a
      // non-empty merge so a transient empty payload never blanks catch-up.
      const activeProjectSlugs = merged.length > 0 ? new Set(merged.map(p => p.slug)) : null

      // Completed feed (only fully approved/completed, not pending-approval 'done')
      {
        const completed = []
        completed.push(...tasks
          .filter(t => t.status === 'completed')
          .map(t => ({ agent: t.agent || 'system', text: t.text, done: true, isLive: false })))
        completed.push(...tasksV2
          .filter(t => t.status === 'done')
          .map(t => ({
            agent:     t.agent_identity || t.agent || 'system',
            text:      t.title || t.description || '',
            done:      true,
            isLive:    false,
            result:    t.result || null,
            qaScore:   t.qa_score || null,
            timestamp: t.completed_at || t.created_at,
            isV2Task:  true,
          })))
        setCompletedFeed(completed)
      }

      // Unread inbox items: one card per room where the agent spoke last and the
      // person has not caught up. rooms:listRooms authors the read state when it
      // knows the viewer (hasUnread / unreadCount); when it does not, "the last
      // message is the agent's" is the same test the old digest ran by hand.
      {
        const unread = []
        const freshRooms = []
        for (const r of roomRows) {
          const lm = r.lastMessage
          if (!lm || !lm.agentSlug) continue
          const known = typeof r.unreadCount === 'number'
          const isFresh = r.hasUnread === true || (!known && !!lm.agentSlug)
          if (!isFresh) continue
          const missionSlug = r.kind === 'mission' ? (legacyTail(r, cxWorld) || null) : null
          const project = r.kind === 'agent' ? null : (r.project || (r.kind === 'project' ? (legacyTail(r, cxWorld) || null) : null))
          if (activeProjectSlugs && project && !activeProjectSlugs.has(project)) continue
          const agentSlug = r.kind === 'agent' ? (legacyTail(r, cxWorld) || r.specialist || lm.agentSlug) : lm.agentSlug
          const k = missionSlug || project || (agentSlug ? `agent:${agentSlug}` : null)
          if (!k) continue
          const msg = { text: lm.text || '', metadata: {} }
          const timestamp = toIso(lm.createdAt)
          if (unreadIsRealMessage(msg)) {
            freshRooms.push({ agent: lm.agentSlug, project, missionSlug, roomKey: k, timestamp })
          }
          if (!inboxNeedsResponse(msg)) continue
          unread.push({
            agent: lm.agentSlug,
            project,
            missionSlug,
            roomKey: k,
            text: summarizeAsk(lm.text),
            timestamp,
            id: r._id,
          })
        }
        setInboxItems(unread)
        setUnreadRooms(freshRooms)
      }

      // punchData: local dev parses the punch-list markdown when the consumer
      // gave a parser; everyone else builds the pills from the task queue.
      const punchContent = punchContentRef.current
      if (IS_LOCAL && punchContent && parseFnRef.current) {
        setPunchData(parseFnRef.current(punchContent))
      } else {
        const projectMap = new Map()
        const todayTasks = []

        const PROD_COLORS = {
          'rightnow': '#FF6B3D', 'your-todos': '#EF4444', 'schedule': '#FF6B3D',
          'finish-these': '#6B8AB0', 'corner': '#3B9EFF', 'ambition': '#F59E0B',
          'outreach': '#EF4444', 'infra': '#4CAF50', 'content': '#FF7043',
          'multi-tenant': '#7C3AED',
        }
        const AUTO_COLORS = ['#7C3AED','#06B6D4','#F97316','#EC4899','#10B981','#8B5CF6','#F43F5E','#14B8A6','#E11D48','#0EA5E9']
        function hashColor(name) {
          let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
          return AUTO_COLORS[Math.abs(h) % AUTO_COLORS.length]
        }
        const getColor = (slug) => PROD_COLORS[slug] || hashColor(slug)

        for (const task of tasks) {
          const projectKey = task.project || task.section || 'general'
          const slug = projectKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          if (!projectMap.has(slug)) {
            projectMap.set(slug, {
              name: task.project || projectKey.charAt(0).toUpperCase() + projectKey.slice(1),
              section: slug,
              color: getColor(slug),
              icon: 'project',
              tasks: [],
            })
          }
          const proj = projectMap.get(slug)
          const isDone = task.status === 'completed' || task.status === 'done'
          const taskObj = {
            id: task.id || null,
            text: task.text || '',
            done: isDone,
            agent: task.agent || null,
            raw: '',
            projectSource: proj.name,
            projectSection: slug,
            projectColor: proj.color,
          }
          proj.tasks.push(taskObj)
          if (slug === 'schedule' && !isDone) todayTasks.push({ ...taskObj, project: 'Schedule' })
        }

        // Architecture v2: task-runner tasks (queued pipeline) as project pills.
        for (const task of tasksV2) {
          if (task.status === 'done' || task.status === 'failed') continue
          const projectKey = task.metadata?.project || task.project || 'queue'
          const slug = projectKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          if (!projectMap.has(slug)) {
            projectMap.set(slug, {
              name: projectKey === 'queue' ? 'Task Queue' : (projectKey.charAt(0).toUpperCase() + projectKey.slice(1)),
              section: slug,
              color: getColor(slug),
              icon: 'project',
              tasks: [],
            })
          }
          const proj = projectMap.get(slug)
          proj.tasks.push({
            id:             task.id || null,
            text:           task.title || task.description || '',
            done:           false,
            agent:          task.agent_identity || task.agent || null,
            status:         task.status,
            priority:       task.priority,
            sort_order:     task.sort_order,
            raw:            '',
            projectSource:  proj.name,
            projectSection: slug,
            projectColor:   proj.color,
            isV2Task:       true,
          })
        }

        // S3 FIX: Default project pills are AOM-only. Primary source: the live
        // registry. Fallback: hardcoded list, but ONLY for the AOM account.
        if (clientId === 'aom') {
          const AOM_DEFAULT_PROJECTS_FALLBACK = [
            { name: 'Corner', section: 'corner', color: '#3B9EFF', icon: 'project' },
            { name: 'Ambition', section: 'ambition-mechanical', color: '#F59E0B', icon: 'project' },
            { name: 'KOHRS', section: 'kohrs', color: '#EF4444', icon: 'project' },
            { name: 'ISA Energy', section: 'isa-energy', color: '#F97316', icon: 'project' },
            { name: 'Skylar', section: 'skylar', color: '#EC4899', icon: 'project' },
            { name: 'Outreach', section: 'outreach', color: '#EF4444', icon: 'project' },
            { name: 'Included Health', section: 'included-health', color: '#EF4444', icon: 'project' },
            { name: 'Brandon Wiley', section: 'brandon-wiley', color: '#9C27B0', icon: 'project' },
            { name: 'NABI', section: 'nabi', color: '#F97316', icon: 'project' },
            { name: 'LBX', section: 'lbx', color: '#9C27B0', icon: 'project' },
          ]
          const liveProjectDefs = projectDefs.map(p => ({ name: p.name, section: p.slug, color: p.color || '#888', icon: p.icon || 'project' }))
          const defaultsToApply = liveProjectDefs.length > 0 ? liveProjectDefs : AOM_DEFAULT_PROJECTS_FALLBACK
          for (const dp of defaultsToApply) {
            if (!projectMap.has(dp.section)) projectMap.set(dp.section, { ...dp, tasks: [] })
          }
        }
        setPunchData({ projects: Array.from(projectMap.values()), todayTasks })
      }

      // ── LIVENESS DETECTION (disabled) ──────────────────────────────────
      // Heartbeat + task timeout toasts removed. They fire inaccurately
      // when agents work as sub-agents (Bobby for Gary, etc.) and make
      // users uneasy. RNB pills are the source of truth for task state.
      // ─────────────────────────────────────────────────────────────────────

      setPunchLoading(false)
      setLastUpdated(Date.now())
    } catch (err) {
      console.warn('[useDataPipe] derive failed:', err)
      setPunchLoading(false)
    }
  }, [])

  // One-shot read of everything, then derive. The live subscriptions keep the
  // screen current after this; refetch() and cv6:data-refresh call it again.
  const fetchAll = useCallback(async () => {
    try {
      const clientId = getClientId()
      const cxWorld = convexWorldId(clientId)
      if (IS_LOCAL) {
        // r7:open-agent-surface — /api/local/file requires a session now (it
        // reads straight off the AOM-EA repo), so send one.
        const punchRes = await authFetch('/api/local/file?path=punch-list.md').then(r => r.ok ? r.json() : null).catch(() => null)
        punchContentRef.current = punchRes?.content || ''
      }
      let userId = ''
      try { userId = convexReadIdentity(await convexViewerIdentity()) } catch { userId = '' }
      const snapshot = await readConvexSnapshot(cxWorld, userId)
      dataRef.current = { ...dataRef.current, ...snapshot }
      applyData(dataRef.current)
    } catch {
      setPunchLoading(false)
    }
  }, [applyData])

  // When the active world changes (e.g. auth resolves and sets client_id from "aom" to
  // the user's actual world), clear stale agent data and immediately refetch so the
  // correct agents/rooms appear without waiting on the subscriptions to re-open.
  const prevWorldRef = useRef(worldId)
  useEffect(() => {
    if (!enabled) return
    if (worldId && worldId !== prevWorldRef.current) {
      prevWorldRef.current = worldId
      setLiveAgents([])
      setLiveProjectRooms([])
      dataRef.current = { rooms: null, tasks: null, agents: null, projects: null }
      fetchAll()
    }
  }, [worldId, fetchAll, enabled])

  useEffect(() => {
    // Inert instance (shared-pipe consumer) — no fetch, no subscriptions.
    if (!enabled) return
    // ISOLATION FIX 2026-05-24: Only read after worldId is known.
    // If worldId is null (auth still resolving), skip to prevent
    // cross-tenant data leak (Ben/Karen/Tim seeing AOM world).
    if (!worldId) {
      return
    }
    fetchAll()

    // Live subscriptions. Each callback patches its own source and the
    // derivation re-runs once per short window, so a burst of changes (an
    // agent answering while a task flips status) is one re-render, not four.
    let cancelled = false
    let stops = []
    let deriveTimer = null
    const scheduleDerive = () => {
      if (deriveTimer) clearTimeout(deriveTimer)
      deriveTimer = setTimeout(() => { deriveTimer = null; if (!cancelled) applyData(dataRef.current) }, 300)
    }
    const onLive = (key) => (value) => {
      if (cancelled) return
      dataRef.current = { ...dataRef.current, [key]: value }
      scheduleDerive()
    }
    const cxWorld = convexWorldId(worldId)
    convexViewerIdentity().catch(() => ({})).then((viewer) => {
      if (cancelled) return
      const userId = convexReadIdentity(viewer)
      stops = [
        subscribeConvex('rooms:listRooms', { worldId: cxWorld, ...(userId ? { userId } : {}) }, onLive('rooms')),
        subscribeConvex('tasks:find', { client_id: cxWorld, order: 'created_at.desc', limit: TASK_FETCH_LIMIT }, onLive('tasks')),
        subscribeConvex('agents:listStatus', { worldId: cxWorld }, onLive('agents')),
        subscribeConvex('projects:list', { worldId: cxWorld, includeShared: true }, onLive('projects')),
      ]
    })

    // O3 (corner-ui-cv6 census): a same-tab signal for structural registry changes
    // (project/mission rename/move/create/archive from Organize). The subscriptions
    // catch a registry write on their own; this keeps the immediate refetch other
    // surfaces already rely on.
    const onExternalRefresh = () => { fetchAll() }
    if (typeof window !== 'undefined') window.addEventListener('cv6:data-refresh', onExternalRefresh)

    return () => {
      cancelled = true
      if (deriveTimer) clearTimeout(deriveTimer)
      for (const stop of stops) { try { stop() } catch { /* closed */ } }
      if (typeof window !== 'undefined') window.removeEventListener('cv6:data-refresh', onExternalRefresh)
    }
  }, [worldId, fetchAll, applyData, enabled])

  // Stable isAutoChecked function -- reads from ref, never causes re-renders
  const isAutoChecked = useCallback((taskText) => {
    const keywords = keywordsRef.current
    if (keywords.size === 0) return false
    const normalized = taskText.toLowerCase()
      .replace(/[*_`#\[\]()]/g, '')
      .replace(/\b(the|a|an|for|to|in|on|at|by|is|was|with|and|or|all|from|of)\b/gi, '')
    const tokens = normalized.split(/\s+/).filter(t => t.length > 3)
    let matchCount = 0
    for (const token of tokens) {
      if (keywords.has(token)) matchCount++
    }
    for (let i = 0; i + 1 < tokens.length; i++) {
      if (keywords.has(`${tokens[i]} ${tokens[i+1]}`)) matchCount += 2
    }
    return matchCount >= 2
  }, [])

  // Derived data (recomputed when punchData changes)
  const yourTodos = derivePatrikTodos(punchData)
  const finishThese = deriveFinishThese(punchData)
  const projectProgress = deriveProjectProgress(punchData)

  // Schedule: tasks from the schedule section of punchData
  const schedule = punchData?.todayTasks || []

  // Pill counts -- computed from the same data, same tick
  const pillCounts = {
    rightNow: rightNow.length,
    yourTodos: yourTodos.length,
    personalTodos: personalTodos.length,
    todoItems: todoItems.length,
    schedule: schedule.length,
    finishThese: finishThese.length,
    inbox: inboxItems.length,
  }

  // Build agents status map for CanvasOffice room states.
  // Source of truth: agents:listStatus only (stamped by the agents' own hooks).
  //
  // Post-rewire (Apr 14): AOM terminal rooms. Rex added Apr 15 (chat was not wired).
  // The picker reads this array, so the guaranteed set here prevents a stale
  // row from leaking a ghost room back into the UI.
  // Order matters: the first is_ea+is_terminal agent in this list becomes
  // the default landing room for AOM users (see CornerV4 landing effect).
  const AOM_TERMINAL_SLUGS = ['elon', 'rex', 'gary']
  const clientId = getClientId()

  let agents
  if (clientId === 'aom') {
    const liveMap = Object.fromEntries(liveAgents.map(a => [a.slug, a]))
    const gridMap = Object.fromEntries(GRID_AGENTS.map(a => [a.slug, a]))
    agents = AOM_TERMINAL_SLUGS.map(slug => {
      const live = liveMap[slug]
      const grid = gridMap[slug]
      const status = live?.status ? live.status.toUpperCase() : 'IDLE'
      return {
        slug,
        name: live?.name || grid?.name || slug.charAt(0).toUpperCase() + slug.slice(1),
        display_name: live?.display_name || null,
        role: live?.role || grid?.role || '',
        status,
        color: live?.color || grid?.color || '#60A5FA',
        updatedAt: live?.updatedAt || null,
        last_naming_nudge_at: live?.last_naming_nudge_at || null,
        is_super: live?.is_super || false,
        is_ea: live?.is_ea || false,
        is_terminal: live?.is_terminal || false,
        is_owner: live?.is_owner || false,
      }
    })
  } else {
    // World-scoped: only agents the roster lists for this world
    agents = (liveAgents.length > 0 ? liveAgents : []).map(a => ({
      slug: a.slug,
      name: a.name || a.slug.charAt(0).toUpperCase() + a.slug.slice(1),
      display_name: a.display_name || null,
      role: a.role || '',
      status: a.status ? a.status.toUpperCase() : 'IDLE',
      color: a.color || '#60A5FA',
      updatedAt: a.updatedAt || null,
      last_naming_nudge_at: a.last_naming_nudge_at || null,
      is_super: a.is_super || false,
      is_ea: a.is_ea || false,
      is_terminal: a.is_terminal || false,
      is_owner: a.is_owner || false,
    }))
  }

  // Immediate recency bump for direct agent threads: called right after the user
  // sends a message so Recently Active reflects the send before the room
  // subscription delivers the new preview.
  const bumpAgentThread = useCallback((agentSlug, text) => {
    if (!agentSlug) return
    const ts = Date.now()
    setAgentThreadRooms(prev => {
      const map = {}
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      for (const a of (prev || [])) { if (a.last_message_at >= cutoff) map[a.agent] = a }
      map[agentSlug] = { agent: agentSlug, last_message_at: ts, last_message_text: String(text || '').slice(0, 160) }
      return Object.values(map)
    })
  }, [])

  return {
    rightNow,
    completedFeed,
    inboxItems,
    unreadRooms,
    yourTodos,
    personalTodos,
    todoItems,
    finishThese,
    schedule,
    projectProgress,
    pillCounts,
    isAutoChecked,
    punchData,
    punchLoading,
    lastUpdated,
    agents,
    projectRooms: liveProjectRooms,
    missionRooms,
    agentThreadRooms,
    bumpAgentThread,
    refetch: fetchAll,
  }
}
