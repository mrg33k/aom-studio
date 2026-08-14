// Realtime subscriptions: agent_status, messages, events, tasks -- unique channel IDs per instance
// useDataPipe -- ONE hook, ONE poll, ONE truth.
// Bobby2: Replaces useRightNowLiveTasks, useCompletedFeed, useAutoCheckFromNotifications,
// usePatrikTodos, useCheckingInTasks, and usePunchListData across GameHUD + ChecklistMode.
//
// BEFORE: 6+ hooks polling 3 files at different intervals (3s, 5s, 8s).
//   - agent-notifications.md polled 3 separate times per cycle
//   - punch-list.md polled at 5s, re-derived in PatrikTodos/CheckingIn
//   - active-missions.md polled at 3s
//   Total: ~7 fetch calls per cycle. Data arrives at different times. Pills lag behind activity feed.
//
// AFTER: 1 poll every 3s. 3 parallel fetches (one per file). All data computed in the same tick.
//   Total: 3 fetch calls per 3s window. Everything updates together. Pill counts match activity feed.
//
// Rule: If the activity feed updates and the pill count doesn't, something is polling separately. Kill it.

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { authFetch } from '../lib/authFetch'
import { getClientId } from '../lib/clientConfig'
import { isRoomActivityNoise, isMachinePreview } from '../cv6next/data/presentationClean.js'

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

// =============================================================================
// useDataPipe -- THE hook. One poll. All data. Every 3 seconds.
//
// Parameters:
//   parsePunchList: function(markdown) => { projects: [], todayTasks: [] }
//     Each consumer passes their own parsePunchList (GameHUD has CLIENT_SUBSECTION_MAP,
//     ChecklistMode has a simpler version). This keeps the config where it belongs.
//
// Returns: { rightNow, completedFeed, yourTodos, finishThese, schedule, projectProgress,
//            pillCounts, isAutoChecked, punchData, punchLoading, lastUpdated, refetch }
// =============================================================================
// options.enabled=false renders the hook inert (no fetch, no poll, no realtime
// channels) while keeping the hook call unconditional for the rules of hooks.
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
  // Supabase-sourced agent list for the current world (replaces hardcoded ALL_AGENT_SLUGS)
  const [supabaseAgents, setSupabaseAgents] = useState([])
  // Project rooms from agent_status (type=project) — used for non-AOM worlds where
  // the projects table may be empty but agent_status has project room entries.
  const [supabaseProjectRooms, setSupabaseProjectRooms] = useState([])
  // Mission rooms: missions with last_message_at computed from messages, so Recently Active
  // on Home can surface missions the user actively worked in (not only inbox-pinged ones).
  const [missionRooms, setMissionRooms] = useState([])
  // Direct 1:1 agent threads with computed last activity, for Recently Active.
  const [agentThreadRooms, setAgentThreadRooms] = useState([])
  // Unique channel ID per hook instance -- prevents duplicate channel name conflicts when
  // useDataPipe is mounted in multiple components (GameDashboard, UnifiedPanel, ChecklistMode, GameHUD)
  const channelIdRef = useRef(`pipe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)

  // Liveness detection -- toast when agents go silent or tasks stall
  const { showToast } = useSystemToast()
  const showToastRef = useRef(showToast)
  showToastRef.current = showToast
  // slug -> ms timestamp of last "stuck" toast (dedup: re-toast only after 5min cooldown)
  const stuckAgentToastsRef = useRef(new Map())
  // Set of task_ids already toasted for timeout (one toast per task, ever)
  const stuckTaskToastsRef = useRef(new Set())

  // Auto-check keywords stored in ref for stable callback
  const keywordsRef = useRef(new Set())

  // Store parsePunchList in a ref so the callback doesn't re-create on every render
  const parseFnRef = useRef(parsePunchList)
  parseFnRef.current = parsePunchList
  // R14e-4: currentUserSlug is a prop that resolves asynchronously (async
  // tenant_users fetch). fetchAll is a useCallback with empty deps so it
  // stays stable across renders; without a ref, the closure would capture
  // the initial null value forever and personal-todos would never populate.
  const currentUserSlugRef = useRef(currentUserSlug)
  currentUserSlugRef.current = currentUserSlug

  // corner:corner-ui-cv6 (2026-06-24): the project-room list (84 rooms Patrik waits
  // on) is rebuilt and re-set on every 60s poll AND every 2.5s realtime debounce. When
  // nothing changed, that re-renders the whole list for no reason — the "waiting for
  // projects" churn. Keep the last serialized list and skip the setter when identical.
  // A real change (new room, new message → recency reorder) still serializes differently
  // and re-renders normally.
  const projectRoomsSigRef = useRef('')

  const fetchAll = useCallback(async () => {
    if (IS_LOCAL) {
      // LOCAL: read from filesystem APIs (punch-list only -- status comes from Supabase)
      try {
        // r7:open-agent-surface — /api/local/file requires a session now (it
        // reads straight off the AOM-EA repo), so send one.
        const punchRes = await authFetch('/api/local/file?path=punch-list.md').then(r => r.ok ? r.json() : null).catch(() => null)
        const punchContent = punchRes?.content || ''

        // Right Now: Supabase is the ONLY source of truth.
        // task-status.jsonl, agent-notifications.md, active-missions.md are NOT read.
        const mergedTasks = []

        try {
          const clientId = getClientId()
          const sbRes = await authFetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`)
          if (sbRes.ok) {
            const sbData = await sbRes.json()
            // R14e-4: read the freshest viewer slug from the ref -- this
            // fetchAll closure was captured on mount with slug=null.
            const slug = currentUserSlugRef.current
            if (sbData.tasks) {
              // Done tasks awaiting approval (exclude viewer's own tasks; agents review theirs elsewhere)
              const doneEntries = sbData.tasks
                .filter(t => t.status === 'done' && t.agent !== slug)
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
              mergedTasks.push(...doneEntries)

              // Todo tasks for To Do pill (exclude viewer's own tasks; those render in Personal Todos)
              const todoEntries = sbData.tasks
                .filter(t => t.status === 'todo' && t.agent !== slug)
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task`, taskId: t.id, done: false, project: t.project }))
              setTodoItems(todoEntries)

              // Viewer's personal tasks (null-safe: empty when slug is unknown)
              const ownerEntries = slug
                ? sbData.tasks
                    .filter(t => t.agent === slug && t.status !== 'completed' && t.status !== 'done')
                    .map(t => ({ text: t.text || '', agent: slug, taskId: t.id, done: false, project: t.project }))
                : []
              setPersonalTodos(ownerEntries)
            }

            // Architecture v2: task-runner tasks (source of truth for Right Now bar).
            // Right Now = status building | running | qa. running is set by task-runner.sh claim.
            // Tasks clear on completion (status -> done/failed), NOT on timeout.
            if (sbData.tasksV2 && sbData.tasksV2.length > 0) {
              const v2RightNow = sbData.tasksV2.filter(t => t.status === 'building' || t.status === 'running' || t.status === 'qa')
              for (const t of v2RightNow) {
                mergedTasks.push({
                  agent:   t.agent_identity || 'system',
                  text:    t.title || t.description || 'Working...',
                  isLive:  t.status === 'building',
                  isQA:    t.status === 'qa',
                  isQueued: false,
                  taskId:  t.id,
                  fromTasksV2: true,
                })
              }
            }

            // Completed feed from Supabase tasks (same as production path)
            {
              const completed = []
              if (sbData.tasks) {
                completed.push(...sbData.tasks
                  .filter(t => t.status === 'completed')
                  .map(t => ({ agent: t.agent || 'system', text: t.text, done: true, isLive: false })))
              }
              if (sbData.tasksV2) {
                completed.push(...sbData.tasksV2
                  .filter(t => t.status === 'done')
                  .map(t => ({
                    agent:     t.agent_identity || 'system',
                    text:      t.title || t.description || '',
                    done:      true,
                    isLive:    false,
                    result:    t.result || null,
                    qaScore:   t.qa_score || null,
                    timestamp: t.completed_at || t.created_at,
                    isV2Task:  true,
                  })))
              }
              setCompletedFeed(completed)
            }

            // Supabase agents for status dots
            if (sbData.agents && sbData.agents.length > 0) {
              setSupabaseAgents(sbData.agents)
            }
          }
        } catch {
          // Supabase unavailable in local dev
        }

        setRightNow(mergedTasks)

        if (punchContent && parseFnRef.current) {
          setPunchData(parseFnRef.current(punchContent))
        } else {
          setPunchData(null)
        }
        setPunchLoading(false)
        setLastUpdated(Date.now())
      } catch {
        setPunchLoading(false)
      }
    } else {
      // PRODUCTION: read from Supabase via API
      try {
        const clientId = getClientId()

        // Primary source: agent_status table (status, current_task, status_source, status_set_at)
        // Right Now = agent_status rows where status='working' AND current_task is non-empty.
        const res = await authFetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`)
        if (!res.ok) return
        const data = await res.json()
        const activeAgentsData = null // active_processes table dependency removed

        // Map Supabase data to Right Now format
        // Primary source: agent_status table (status='working' + current_task non-empty).
        // Tasks table status is NEVER used for Right Now (it drifts). Only used for
        // queued/todo/done task pills.
        {
          const active = []

          // Queued tasks shown -- no events emitted for queued state.
          if (data.tasks) {
            const queuedEntries = data.tasks
              .filter(t => t.status === 'queued')
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task queued`, isLive: true, isQueued: true, taskId: t.id }))
            active.push(...queuedEntries)
          }

          // ALWAYS: Done tasks awaiting approval -> Inbox pill (not Right Now)
          // R14e-4: read fresh slug from ref (fetchAll closure captured mount-time value).
          const slug = currentUserSlugRef.current
          if (data.tasks) {
            const doneEntries = data.tasks
              .filter(t => t.status === 'done' && t.agent !== slug)
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
            active.push(...doneEntries)

            // Todo tasks for To Do pill (never shown in Right Now)
            const todoEntries = data.tasks
              .filter(t => t.status === 'todo' && t.agent !== slug)
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task`, taskId: t.id, done: false, project: t.project }))
            setTodoItems(todoEntries)

            // Viewer's personal tasks (null-safe: empty when slug is unknown)
            const ownerEntries = slug
              ? data.tasks
                  .filter(t => t.agent === slug && t.status !== 'completed' && t.status !== 'done')
                  .map(t => ({ text: t.text || '', agent: slug, taskId: t.id, done: false, project: t.project }))
              : []
            setPersonalTodos(ownerEntries)
          }

          // Architecture v2: task-runner tasks (source of truth for Right Now bar).
          // Right Now = status building | running | qa. running is set by task-runner.sh claim.
          // Tasks clear on completion (status -> done/failed), NOT on timeout.
          // Only add tasks not already present from events table (events take priority).
          if (data.tasksV2 && data.tasksV2.length > 0) {
            const v2RightNow = data.tasksV2.filter(t => t.status === 'building' || t.status === 'running' || t.status === 'qa')
            const alreadyInActive = new Set(active.map(t => t.taskId).filter(Boolean))
            for (const t of v2RightNow) {
              if (!alreadyInActive.has(t.id)) {
                active.push({
                  agent:   t.agent_identity || 'system',
                  text:    t.title || t.description || 'Working...',
                  isLive:  t.status === 'building' || t.status === 'running',
                  isQA:    t.status === 'qa',
                  isQueued: false,
                  taskId:  t.id,
                  fromTasksV2: true,
                })
              }
            }
          }

          setRightNow(active)
        }

        // Store Supabase agent list for world-scoped rooms (replaces hardcoded ALL_AGENT_SLUGS)
        if (data.agents && data.agents.length > 0) {
          setSupabaseAgents(data.agents)
        }

        // Store project rooms — MERGES two sources so CV4's middle switcher
        // + left drawer match what CV3's home page shows:
        //   1) agent_status rows with type='project' (have status, color, etc.)
        //   2) projects table rows (data.projectDefs) — the canonical list
        //      from supabase, which may include projects that don't yet have
        //      an agent_status row (e.g. Nancy and other newer rooms). Without
        //      this merge CV4 silently drops them.
        const fromAgents = (data.projects || []).map(p => ({
          id: p.id || p.slug,
          slug: p.slug,
          name: p.name || p.slug,
          color: p.color || '#6B8AB0',
          is_active: true,
          isShared: false,
          section: 'general',
          tasks: [],
          isClient: false,
          status: p.status ? p.status.toUpperCase() : 'IDLE',
          status_set_at: p.status_set_at || p.updated_at || null,
        }))
        const fromAgentsSlugs = new Set(fromAgents.map(p => p.slug))
        const fromDefs = (data.projectDefs || [])
          .filter(p => p?.slug && !fromAgentsSlugs.has(p.slug))
          .map(p => ({
            id: p.id || p.slug,
            slug: p.slug,
            name: p.name || p.slug,
            color: p.color || '#6B8AB0',
            is_active: p.is_active !== false,
            isShared: !!p.is_shared,
            section: 'general',
            tasks: [],
            isClient: false,
            status: 'IDLE',
          }))
        const merged = [...fromAgents, ...fromDefs]
        // corner:corner-ui-cv6 — order project rooms by recent activity so the
        // Home room list leads with what the user touched last. Recency = the
        // latest message in the project; every message carries a `project` field
        // (mission-tagged ones included), matching the missions-tree recency rule.
        // Projects with no recent activity fall to the bottom, then alphabetical.
        // Also compute per-mission recency so Recently Active can surface missions
        // the user actively worked in (not only ones with an inbox-ping).
        {
          const projRecency = {}
          // Rollup keeps mission activity in the project FOLDER ordering (the intent
          // in the comment above), but the SURFACED last_message/preview a project
          // exposes to Recently Active excludes mission rows — see the loop below.
          const projRollup = {}
          const missionRecency = {}
          // Per-agent recency for 1:1 chats: a direct agent thread is a message
          // carrying an agent but NO project and NO mission (those belong to the
          // project/mission room, not the agent). Lets Recently Active surface an
          // agent you actually talked to, the same way missions/projects surface —
          // without an agent ever masquerading as a project (Patrik 2026-07-21).
          const agentRecency = {}
          // Preview text rides with recency (Home resting digest, loop R5): the room's last
          // message, whitespace-collapsed. Structured payloads (raw JSON) never preview.
          // ARTIFACT_GUARD — skip QA/screenshot paths, round-labelled filenames (r7-*),
          // census-*, *-shot-* captures, *-critique-* slugs, and dotfiles so agent
          // housekeeping noise never surfaces in "pick up where you left off".
          const ARTIFACT_RE = /^(?:qa\/|screenshots?\/|r\d+[-.]|census-|\.)|([-_]shot[-_]|[-_]critique[-_])/i
          const previewOf = (m) => {
            const t = String(m.text || '').replace(/\s+/g, ' ').trim()
            if (!t || t.startsWith('{') || t.startsWith('[')) return ''
            if (ARTIFACT_RE.test(t)) return ''
            // Room-row contract §3: transport never previews as conversation. A bridge
            // delivery ack ("Received — … reached the dispatcher"), dispatch plumbing or
            // a probe is an assistant row on the normal chat path — only its SHAPE gives
            // it away. Blanks the line; the room itself still ranks by this message.
            if (isMachinePreview(t, m)) return ''
            return t.slice(0, 160)
          }
          for (const m of (data.messages || [])) {
            if (!m.timestamp) continue
            // Home is a human activity digest, not an infrastructure log. Supervisor
            // health alerts remain available in their room but never become recents.
            if (isRoomActivityNoise(m)) continue
            const t = new Date(m.timestamp).getTime()
            if (Number.isNaN(t)) continue
            // A message belongs to exactly ONE recency bucket, in the same
            // precedence deriveRoomId uses: mission > project > agent. Previously a
            // mission-tagged message ALSO bumped its parent project's SURFACED
            // recency, so a child mission's reply floated the parent project into
            // Recently Active wearing the child's preview — while the parent row's
            // click-target (its project_only thread) opened the parent's own, older
            // last message. Preview and destination disagreed (Patrik 2026-07-22,
            // corner:front-door Bug 2). Rollup still tracks mission activity for the
            // folder ORDERING; the surfaced last_message excludes missions.
            const ms = m.metadata && m.metadata.mission_slug
            if (m.project && (!projRollup[m.project] || t > projRollup[m.project])) projRollup[m.project] = t
            if (m.project && !ms && (!projRecency[m.project] || t > projRecency[m.project].t)) projRecency[m.project] = { t, text: previewOf(m) }
            if (ms) {
              if (!missionRecency[ms] || t > missionRecency[ms].ts) missionRecency[ms] = { ts: t, project: m.project || '', text: previewOf(m) }
            }
            if (m.agent && !m.project && !ms) {
              if (!agentRecency[m.agent] || t > agentRecency[m.agent].ts) agentRecency[m.agent] = { ts: t, text: previewOf(m) }
            }
          }
          for (const p of merged) { const r = projRecency[p.slug]; p.last_message_at = r ? r.t : 0; p.last_message_text = r ? r.text : '' }
          // Order by rollup recency (mission activity counts here, so a project the
          // user is actively working inside a mission of still leads the folder list),
          // then by the project's own surfaced recency, then alphabetical.
          merged.sort((a, b) => ((projRollup[b.slug] || b.last_message_at || 0) - (projRollup[a.slug] || a.last_message_at || 0)) || (a.name || '').localeCompare(b.name || ''))
          // Expose mission recency so useHome can populate Recently Active without
          // waiting for an inbox ping. Stored as { slug, project, last_message_at }.
          const missionList = Object.entries(missionRecency).map(([slug, v]) => ({ slug, project: v.project, last_message_at: v.ts, last_message_text: v.text || '' }))
          setMissionRooms(missionList)
          // Same for direct agent threads — { agent, last_message_at, last_message_text }.
          // Merge with previous state rather than replacing: the 100-message fetch window
          // may not include an older agent thread on a busy client, which would wipe it
          // from recents on the next poll. Accumulate seen agents; prune entries older
          // than 24 h so stale threads don't linger forever.
          const agentThreadList = Object.entries(agentRecency).map(([agent, v]) => ({ agent, last_message_at: v.ts, last_message_text: v.text || '' }))
          const cutoff = Date.now() - 24 * 60 * 60 * 1000
          setAgentThreadRooms(prev => {
            const merged = {}
            for (const a of (prev || [])) {
              if (a.last_message_at >= cutoff) merged[a.agent] = a
            }
            for (const a of agentThreadList) {
              if (!merged[a.agent] || a.last_message_at > merged[a.agent].last_message_at) merged[a.agent] = a
            }
            return Object.values(merged)
          })
        }
        if (merged.length > 0) {
          const sig = JSON.stringify(merged)
          if (sig !== projectRoomsSigRef.current) { projectRoomsSigRef.current = sig; setSupabaseProjectRooms(merged) }
        }

        // corner:corner-ui-cv6 wd40 DEF-4: the set of project rooms that still
        // exist. supabase-status.js now excludes archived projects from both
        // sources, so anything absent here is archived (or deleted) — its old
        // messages must not keep spawning catch-up cards. Guarded on a
        // non-empty merge so a transient empty payload never blanks catch-up.
        const activeProjectSlugs = merged.length > 0 ? new Set(merged.map(p => p.slug)) : null

        // Map tasks to completed feed (only fully approved/completed, not pending-approval 'done')
        {
          const completed = []
          if (data.tasks) {
            const legacyCompleted = data.tasks
              .filter(t => t.status === 'completed')
              .map(t => ({ agent: t.agent || 'system', text: t.text, done: true, isLive: false }))
            completed.push(...legacyCompleted)
          }
          // Architecture v2: add task-runner completed tasks to the feed
          if (data.tasksV2) {
            const v2Completed = data.tasksV2
              .filter(t => t.status === 'done')
              .map(t => ({
                agent:     t.agent_identity || 'system',
                text:      t.title || t.description || '',
                done:      true,
                isLive:    false,
                result:    t.result || null,
                qaScore:   t.qa_score || null,
                timestamp: t.completed_at || t.created_at,
                isV2Task:  true,
              }))
            completed.push(...v2Completed)
          }
          setCompletedFeed(completed)
        }

        // Compute unread inbox items: assistant messages newer than the user's
        // last message IN THAT ROOM. corner:notifications R1 — a notification
        // points to the ROOM, not the agent. Every message row already carries
        // `project` and `metadata.mission_slug` (verified live DB 2026-05-22);
        // the old builder discarded both and de-duped one-card-per-agent, which
        // collapsed multiple rooms into a single agent card. Now: one card per
        // room (mission room > project room > 1:1 agent thread).
        if (data.messages) {
          // Messages arrive oldest-first (reversed in supabase-status.js).
          // roomKey identifies the room a message belongs to. It must resolve
          // identically for the user message and the assistant reply in the
          // same room: mission rooms key on mission_slug, project rooms on
          // project, 1:1 agent threads on `agent:<slug>`.
          const roomKey = (m) =>
            (m.metadata && m.metadata.mission_slug) ||
            m.project ||
            (m.agent ? `agent:${m.agent}` : null)
          const roomLastSeen = {} // roomKey -> timestamp of last dashboard user message
          for (const msg of data.messages) {
            if (msg.role === 'user' && msg.source === 'corner-dashboard') {
              const k = roomKey(msg)
              if (k) roomLastSeen[k] = msg.timestamp
            }
          }
          const unread = []
          const freshRooms = [] // broad feed: any new agent message, update or question
          const seenRooms = new Set() // one card per room max
          for (const msg of [...data.messages].reverse()) { // newest first
            if (msg.role !== 'assistant' || !msg.agent) continue
            // wd40 DEF-4: skip messages from archived project rooms (mission
            // messages carry the project too, so archived missions go with it).
            // 1:1 agent threads have no project field and are unaffected.
            if (activeProjectSlugs && msg.project && !activeProjectSlugs.has(msg.project)) continue
            const k = roomKey(msg)
            if (!k || seenRooms.has(k)) continue
            const lastSeen = roomLastSeen[k]
            if (!lastSeen || msg.timestamp > lastSeen) {
              seenRooms.add(k) // this room's newest unread is now decided (handled either way)
              // Green dot first: it fires on ANY new agent message in the room.
              if (unreadIsRealMessage(msg)) {
                freshRooms.push({
                  agent: msg.agent,
                  project: msg.project || null,
                  missionSlug: (msg.metadata && msg.metadata.mission_slug) || null,
                  roomKey: k,
                  timestamp: msg.timestamp,
                })
              }
              // Only surface rooms where the agent is actually waiting on Patrik.
              if (!inboxNeedsResponse(msg)) continue
              const preview = summarizeAsk(msg.text)
              unread.push({
                agent: msg.agent,
                project: msg.project || null,
                missionSlug: (msg.metadata && msg.metadata.mission_slug) || null,
                roomKey: k,
                text: preview,
                timestamp: msg.timestamp,
                id: msg.id,
              })
            }
          }
          setInboxItems(unread)
          setUnreadRooms(freshRooms)
        }

        // Build punchData from Supabase tasks so pills render on production.
        // Group tasks by project into the { projects: [], todayTasks: [] } format.
        // S3 FIX: DEFAULT_PROJECTS is AOM-only. Every other client sees only their
        // own Supabase tasks as project pills -- no AOM client data leaks.
        {
          const projectMap = new Map()
          const todayTasks = []

          // Color palette for known projects + dynamic hash for new ones
          const PROD_COLORS = {
            'rightnow': '#FF6B3D', 'your-todos': '#EF4444', 'schedule': '#FF6B3D',
            'finish-these': '#6B8AB0', 'corner': '#3B9EFF', 'ambition': '#F59E0B',
            'outreach': '#EF4444', 'infra': '#4CAF50', 'content': '#FF7043',
            'multi-tenant': '#7C3AED',
          }
          // Auto-generate a color for any project not in PROD_COLORS
          const AUTO_COLORS = ['#7C3AED','#06B6D4','#F97316','#EC4899','#10B981','#8B5CF6','#F43F5E','#14B8A6','#E11D48','#0EA5E9']
          function hashColor(name) {
            let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
            return AUTO_COLORS[Math.abs(h) % AUTO_COLORS.length]
          }
          const getColor = (slug) => PROD_COLORS[slug] || hashColor(slug)

          if (data.tasks && data.tasks.length > 0) {
            for (const task of data.tasks) {
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

              if (slug === 'schedule' && !isDone) {
                todayTasks.push({ ...taskObj, project: 'Schedule' })
              }
            }
          }

          // Architecture v2: add task-runner tasks (queued pipeline) to project pills.
          // These tasks use `title` + `agent_identity` (v2 schema) instead of `text` + `agent`.
          // Only include non-terminal tasks: queued/classifying/planning/building/qa.
          if (data.tasksV2 && data.tasksV2.length > 0) {
            for (const task of data.tasksV2) {
              if (task.status === 'done' || task.status === 'failed') continue
              const projectKey = task.metadata?.project || 'queue'
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
              const isDone = task.status === 'done' || task.status === 'failed'
              proj.tasks.push({
                id:             task.id || null,
                text:           task.title || task.description || '',
                done:           isDone,
                agent:          task.agent_identity || null,
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
          }

          // S3 FIX: Default project pills are AOM-only.
          // Primary source: Supabase projects table (live, editable without a deploy).
          // Fallback: hardcoded list, but ONLY for AOM account.
          // Prospects and new accounts see only their own data.
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
            const liveProjectDefs = (data.projectDefs || [])
              .map(p => ({ name: p.name, section: p.slug, color: p.color || '#888', icon: p.icon || 'project' }))
            const defaultsToApply = liveProjectDefs.length > 0 ? liveProjectDefs : AOM_DEFAULT_PROJECTS_FALLBACK
            for (const dp of defaultsToApply) {
              if (!projectMap.has(dp.section)) {
                projectMap.set(dp.section, { ...dp, tasks: [] })
              }
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
      } catch {
        setPunchLoading(false)
      }
    }
  }, [])

  // When the active world changes (e.g. auth resolves and sets client_id from "aom" to
  // the user's actual world), clear stale agent data and immediately refetch so the
  // correct agents/rooms appear without waiting for the next poll interval.
  const prevWorldRef = useRef(worldId)
  useEffect(() => {
    if (!enabled) return
    if (worldId && worldId !== prevWorldRef.current) {
      prevWorldRef.current = worldId
      setSupabaseAgents([])
      setSupabaseProjectRooms([])
      fetchAll()
    }
  }, [worldId, fetchAll, enabled])

  useEffect(() => {
    // Inert instance (shared-pipe consumer) — no fetch, no poll, no channels.
    if (!enabled) return
    // ISOLATION FIX 2026-05-24: Only fetch after worldId is known.
    // If worldId is null (auth still resolving), skip fetch to prevent
    // cross-tenant data leak (Ben/Karen/Tim seeing AOM world).
    if (!worldId) {
      return
    }
    fetchAll()
    // Poll is a fallback only. Supabase Realtime below does the heavy lifting;
    // this catches state after a dropped subscription. 60s keeps the bill sane.
    const timer = setInterval(fetchAll, 60000)

    // corner:dashboard-speed (2026-06-02): kill the re-download storm.
    // Each realtime event used to call fetchAll() immediately, so a burst of
    // agent_status / task / message changes (constant during active use)
    // fired N full ~225KB downloads back-to-back — the dashboard felt slow /
    // "still struggling" while agents worked. Coalesce realtime triggers into
    // ONE fetch per window. Mount + 60s poll stay immediate; only the
    // event-driven refetches are debounced.
    let realtimeDebounce = null
    const scheduleFetch = () => {
      if (realtimeDebounce) clearTimeout(realtimeDebounce)
      realtimeDebounce = setTimeout(() => { realtimeDebounce = null; fetchAll() }, 2500)
    }

    // Supabase Realtime subscriptions -- instant updates without waiting for poll.
    // Only active where supabase client is configured (production + local with env vars).
    let agentStatusChannel = null
    let tasksChannel = null
    let messagesChannel = null
    let projectsChannel = null
    if (supabase) {
      const cid = channelIdRef.current
      console.log('[Corner Realtime] Subscribing to agent_status, tasks, messages... id:', cid)

      // agent_status table: any change triggers a (debounced) refresh (RNB, alive dots, agent status)
      agentStatusChannel = supabase
        .channel(`agent-status-changes-${cid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_status' }, () => {
          console.log('[Corner Realtime] agent_status changed')
          scheduleFetch()
        })
        .subscribe((status) => console.log('[Corner Realtime] agent_status sub:', status))

      // tasks table: any change triggers (debounced) refresh (new tasks, status changes -> pills + RNB)
      tasksChannel = supabase
        .channel(`tasks-changes-${cid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          console.log('[Corner Realtime] tasks changed')
          scheduleFetch()
        })
        .subscribe((status) => console.log('[Corner Realtime] tasks sub:', status))

      // messages table: INSERT triggers (debounced) refresh (new chat messages update throughput + unread)
      messagesChannel = supabase
        .channel(`messages-inserts-${cid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          console.log('[Corner Realtime] messages INSERT')
          scheduleFetch()
        })
        .subscribe((status) => console.log('[Corner Realtime] messages sub:', status))

      // projects table: any change triggers (debounced) refresh. Realtime contract
      // (2026-07-02): the project-registry reconciler auto-inserts a row when a new
      // project folder lands on disk — without this channel that row waited on the
      // 60s poll to reach the screen.
      projectsChannel = supabase
        .channel(`projects-changes-${cid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
          console.log('[Corner Realtime] projects changed')
          scheduleFetch()
        })
        .subscribe((status) => console.log('[Corner Realtime] projects sub:', status))
    } else {
      console.log('[Corner Realtime] supabase client is null -- no Realtime subscriptions')
    }

    // O3 (corner-ui-cv6 census): a same-tab signal for structural registry changes
    // (project/mission rename/move/create/archive from Organize). The `projects` table
    // realtime channel above only fires when that table is in Supabase's realtime
    // publication — which isn't guaranteed — so a rename could sit stale on the sidebar
    // + composer picker until the 60s poll. This listener refetches immediately when
    // Organize broadcasts, so the new name propagates to every surface at once.
    const onExternalRefresh = () => { fetchAll() }
    if (typeof window !== 'undefined') window.addEventListener('cv6:data-refresh', onExternalRefresh)

    return () => {
      clearInterval(timer)
      if (realtimeDebounce) clearTimeout(realtimeDebounce)
      if (agentStatusChannel) supabase.removeChannel(agentStatusChannel)
      if (tasksChannel) supabase.removeChannel(tasksChannel)
      if (messagesChannel) supabase.removeChannel(messagesChannel)
      if (projectsChannel) supabase.removeChannel(projectsChannel)
      if (typeof window !== 'undefined') window.removeEventListener('cv6:data-refresh', onExternalRefresh)
    }
  }, [worldId, fetchAll, enabled])

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
  // Source of truth: agent_status table only (set by task_runner or system).
  //
  // Post-rewire (Apr 14): AOM terminal rooms. Rex added Apr 15 (chat was not wired).
  // The picker reads this array, so the guaranteed set here prevents a stale Supabase
  // row from leaking a ghost room back into the UI.
  // Order matters: the first is_ea+is_terminal agent in this list becomes
  // the default landing room for AOM users (see CornerV4 landing effect).
  const AOM_TERMINAL_SLUGS = ['elon', 'rex', 'gary']
  const clientId = getClientId()

  let agents
  if (clientId === 'aom') {
    const sbMap = Object.fromEntries(supabaseAgents.map(a => [a.slug, a]))
    const gridMap = Object.fromEntries(GRID_AGENTS.map(a => [a.slug, a]))
    agents = AOM_TERMINAL_SLUGS.map(slug => {
      const sb = sbMap[slug]
      const grid = gridMap[slug]
      const status = sb?.status ? sb.status.toUpperCase() : 'IDLE'
      return {
        slug,
        name: sb?.name || grid?.name || slug.charAt(0).toUpperCase() + slug.slice(1),
        display_name: sb?.display_name || null,
        role: sb?.role || grid?.role || '',
        status,
        color: sb?.color || grid?.color || '#60A5FA',
        updatedAt: sb?.updatedAt || null,
        last_naming_nudge_at: sb?.last_naming_nudge_at || null,
        is_super: sb?.is_super || false,
        is_ea: sb?.is_ea || false,
        is_terminal: sb?.is_terminal || false,
        is_owner: sb?.is_owner || false,
      }
    })
  } else {
    // World-scoped: only agents from Supabase agent_status for this client_id
    agents = (supabaseAgents.length > 0 ? supabaseAgents : []).map(a => ({
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
  // sends a message so Recently Active reflects the send without waiting for the
  // next poll cycle (which could take 3s, or miss the thread entirely if the
  // 100-message window is full of more-recent project/mission messages).
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
    projectRooms: supabaseProjectRooms,
    missionRooms,
    agentThreadRooms,
    bumpAgentThread,
    refetch: fetchAll,
  }
}
