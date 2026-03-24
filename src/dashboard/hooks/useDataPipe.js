// useDataPipe -- ONE hook, ONE poll, ONE truth.
// Bobby2: Replaces useRightNowLiveTasks, useCompletedFeed, useAutoCheckFromNotifications,
// usePatrikTodos, useCheckingInTasks, and usePunchListData across GameHUD + ChecklistMode.
//
// BEFORE: 6+ hooks polling 3 files at different intervals (3s, 5s, 8s).
//   - events table is the SOLE source of truth for Right Now + agent status
//   - punch-list.md polled at 5s, re-derived in PatrikTodos/CheckingIn
//   Total: 2 fetch calls per 3s window. Everything updates together. Pill counts match activity feed.
//
// AFTER: 1 poll every 3s. events table drives Right Now + agent status. punch-list drives task pills.
//   All data computed in the same tick.
//
// Rule: If the activity feed updates and the pill count doesn't, something is polling separately. Kill it.

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getClientId } from '../lib/clientConfig'

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

// ---- BUILD AUTO-CHECK KEYWORDS from events table ----------------------------
// Extracts keywords from task_completed events to fuzzy-match against punch-list tasks.
function buildAutoCheckKeywordsFromEvents(events) {
  if (!events || events.length === 0) return new Set()

  const completedDescriptions = []
  for (const ev of events) {
    if (ev.event_type !== 'task_completed' && ev.event_type !== 'qa_passed' && ev.event_type !== 'build_pushed') continue
    const desc = ev.payload?.description || ev.payload?.task || ev.payload?.text
    if (desc) completedDescriptions.push(desc.toLowerCase())
  }

  const keywords = new Set()
  for (const desc of completedDescriptions) {
    const tokens = desc
      .replace(/[*_`#\[\]()]/g, '')
      .replace(/\b(the|a|an|for|to|in|on|at|by|is|was|with|and|or|all|from|of)\b/gi, '')
      .split(/\s+/)
      .filter(t => t.length > 3)
    for (let i = 0; i < tokens.length; i++) {
      keywords.add(tokens[i])
      if (i + 1 < tokens.length) keywords.add(`${tokens[i]} ${tokens[i+1]}`)
      if (i + 2 < tokens.length) keywords.add(`${tokens[i]} ${tokens[i+1]} ${tokens[i+2]}`)
    }
  }

  return keywords
}

// ---- DERIVE RIGHT NOW + AGENT STATUS from events table -----------------------
// Events are newest-first from the API. We find the latest event per task_id
// and per agent to determine what's active and what each agent's status is.
//
// Active task = latest event for a task_id is task_started (no subsequent
//   task_completed or task_failed).
//
// Agent status:
//   WORKING  = latest event for this agent is task_started
//   IDLE     = latest event is task_completed
//   STUCK    = latest event is task_failed
//   STALLED  = task_started was the latest event but it arrived 20+ min ago
export function deriveStateFromEvents(events) {
  if (!events || events.length === 0) {
    return { rightNowTasks: [], agentStatuses: {} }
  }

  const STALL_MS = 20 * 60 * 1000 // 20 minutes
  const now = Date.now()

  // Walk events newest-first.
  // For each task_id: track the latest event_type.
  // For each agent: track the latest event_type + timestamp.
  const taskLatest = new Map()  // task_id -> { event_type, agent, payload, timestamp }
  const agentLatest = new Map() // agent -> { event_type, payload, timestamp }

  for (const ev of events) {
    const taskId = ev.payload?.task_id || ev.id
    const agent = ev.agent
    const ts = ev.timestamp

    // Per-task tracking (first seen = newest)
    if (taskId && !taskLatest.has(taskId)) {
      taskLatest.set(taskId, {
        event_type: ev.event_type,
        agent,
        payload: ev.payload || {},
        timestamp: ts,
      })
    }

    // Per-agent tracking (first seen = newest)
    if (agent && !agentLatest.has(agent)) {
      agentLatest.set(agent, {
        event_type: ev.event_type,
        payload: ev.payload || {},
        timestamp: ts,
      })
    }
  }

  // Right Now: tasks whose latest event is task_started, task_queued, or build_pushed
  // FIX #7: Color mapping:
  //   task_queued  -> isQueued: true, isLive: false  -> fuchsia (#E91E90)
  //   task_started -> isLive: true,  isQueued: false -> orange  (#FF6B3D)
  //   build_pushed -> isDoneAwaitingApproval: true   -> yellow  (#F59E0B)
  const rightNowTasks = []
  for (const [, info] of taskLatest) {
    const ev = info.event_type
    if (ev !== 'task_started' && ev !== 'task_queued' && ev !== 'build_pushed') continue
    const description = info.payload.description || info.payload.task || info.payload.text || 'Working...'
    rightNowTasks.push({
      agent:                info.agent,
      text:                 description.length > 55 ? description.slice(0, 52) + '...' : description,
      isLive:               ev === 'task_started',
      isQueued:             ev === 'task_queued',
      isDoneAwaitingApproval: ev === 'build_pushed',
      fromEvents:           true,
    })
  }

  // Dedup: one task per agent (newest wins -- taskLatest is built newest-first)
  const seenAgents = new Set()
  const dedupedTasks = []
  for (const task of rightNowTasks) {
    if (seenAgents.has(task.agent)) continue
    seenAgents.add(task.agent)
    dedupedTasks.push(task)
  }

  // Agent statuses derived from latest event
  // Also track the last completed task description per agent (for Info tab latestResult)
  const agentStatuses = {}
  const agentLastCompleted = {} // agent slug -> last completed task description string
  for (const [agent, info] of agentLatest) {
    const ageMs = info.timestamp ? now - new Date(info.timestamp).getTime() : 0
    let status = 'IDLE'
    if (info.event_type === 'task_started') {
      status = ageMs >= STALL_MS ? 'STALLED' : 'WORKING'
    } else if (info.event_type === 'task_completed' || info.event_type === 'qa_passed' || info.event_type === 'build_pushed') {
      status = 'IDLE'
      // Capture the last completed task description for the Info tab
      const desc = info.payload?.description || info.payload?.task || info.payload?.text || null
      if (desc) agentLastCompleted[agent] = desc
    } else if (info.event_type === 'task_failed' || info.event_type === 'qa_failed') {
      status = 'STUCK'
    }
    agentStatuses[agent] = status
  }

  return { rightNowTasks: dedupedTasks, agentStatuses, agentLastCompleted }
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
export function useDataPipe(parsePunchList) {
  const [rightNow, setRightNow] = useState([])
  const [completedFeed, setCompletedFeed] = useState([])
  const [inboxItems, setInboxItems] = useState([])
  const [personalTodos, setPersonalTodos] = useState([])
  const [todoItems, setTodoItems] = useState([])
  const [punchData, setPunchData] = useState(null)
  const [punchLoading, setPunchLoading] = useState(IS_LOCAL)
  const [lastUpdated, setLastUpdated] = useState(null)
  // Events-derived agent statuses: agent slug -> 'WORKING'|'IDLE'|'STUCK'|'STALLED'
  const eventsAgentStatusRef = useRef({})
  // Events-derived last completed task per agent: agent slug -> description string
  const eventsAgentLastCompletedRef = useRef({})

  // Auto-check keywords stored in ref for stable callback
  const keywordsRef = useRef(new Set())

  // Store parsePunchList in a ref so the callback doesn't re-create on every render
  const parseFnRef = useRef(parsePunchList)
  parseFnRef.current = parsePunchList

  const fetchAll = useCallback(async () => {
    if (IS_LOCAL) {
      // LOCAL: read from filesystem API (punch-list only) + Supabase events
      try {
        const punchRes = await fetch('/api/local/file?path=punch-list.md').then(r => r.ok ? r.json() : null).catch(() => null)
        const punchContent = punchRes?.content || ''

        // Right Now: events table is the SOLE source (same as production).
        // task_started with no subsequent task_completed = task is active.
        // Per-agent dedup: only the newest task per agent.
        const localActive = []
        let localEvents = []
        try {
          const clientId = getClientId()
          const sbRes = await fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`)
          if (sbRes.ok) {
            const sbData = await sbRes.json()
            if (sbData.events && sbData.events.length > 0) {
              localEvents = sbData.events
              const { rightNowTasks, agentStatuses, agentLastCompleted } = deriveStateFromEvents(sbData.events)
              eventsAgentStatusRef.current = agentStatuses
              eventsAgentLastCompletedRef.current = agentLastCompleted
              localActive.push(...rightNowTasks)
            }
            if (sbData.tasks) {
              // Done tasks awaiting approval
              const doneEntries = sbData.tasks
                .filter(t => t.status === 'done' && t.agent !== 'patrik')
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
              localActive.push(...doneEntries)

              // Todo tasks for To Do pill
              const todoEntries = sbData.tasks
                .filter(t => t.status === 'todo' && t.agent !== 'patrik')
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task`, taskId: t.id, done: false, project: t.project }))
              setTodoItems(todoEntries)

              // Patrik's personal tasks
              const patrikEntries = sbData.tasks
                .filter(t => t.agent === 'patrik' && t.status !== 'completed' && t.status !== 'done')
                .map(t => ({ text: t.text || '', agent: 'patrik', taskId: t.id, done: false, project: t.project }))
              setPersonalTodos(patrikEntries)
            }
          }
        } catch {
          // Supabase unavailable in local dev -- Right Now stays empty
        }

        setRightNow(localActive)
        keywordsRef.current = buildAutoCheckKeywordsFromEvents(localEvents)

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

        const res = await fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`)
        if (!res.ok) return
        const data = await res.json()

        // Right Now: events table is the SOLE source.
        // task_started with no subsequent task_completed = task is active.
        // Per-agent dedup: only the newest task per agent.
        {
          const active = []

          if (data.events && data.events.length > 0) {
            const { rightNowTasks, agentStatuses, agentLastCompleted } = deriveStateFromEvents(data.events)
            eventsAgentStatusRef.current = agentStatuses
            eventsAgentLastCompletedRef.current = agentLastCompleted
            active.push(...rightNowTasks)
          }

          // KEEP: Done tasks awaiting approval -> Inbox pill (not Right Now)
          if (data.tasks) {
            const doneEntries = data.tasks
              .filter(t => t.status === 'done' && t.agent !== 'patrik')
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
            active.push(...doneEntries)

            // Todo tasks for To Do pill
            const todoEntries = data.tasks
              .filter(t => t.status === 'todo' && t.agent !== 'patrik')
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task`, taskId: t.id, done: false, project: t.project }))
            setTodoItems(todoEntries)

            // Patrik's personal tasks
            const patrikEntries = data.tasks
              .filter(t => t.agent === 'patrik' && t.status !== 'completed' && t.status !== 'done')
              .map(t => ({ text: t.text || '', agent: 'patrik', taskId: t.id, done: false, project: t.project }))
            setPersonalTodos(patrikEntries)
          }

          setRightNow(active)
        }

        // Map tasks to completed feed (only fully approved/completed, not pending-approval 'done')
        if (data.tasks) {
          const completed = data.tasks
            .filter(t => t.status === 'completed')
            .map(t => ({ agent: t.agent || 'system', text: t.text, done: true, isLive: false }))
          setCompletedFeed(completed)
        }

        // Compute unread inbox items: assistant messages newer than user's last message per agent
        if (data.messages) {
          // Messages arrive oldest-first (reversed in supabase-status.js)
          const agentLastSeen = {} // agent -> timestamp of last user message from dashboard
          for (const msg of data.messages) {
            if (msg.role === 'user' && msg.source === 'corner-dashboard') {
              agentLastSeen[msg.agent] = msg.timestamp
            }
          }
          const unread = []
          const seenAgents = new Set() // one card per agent max
          for (const msg of [...data.messages].reverse()) { // newest first
            if (msg.role === 'assistant' && msg.agent && !seenAgents.has(msg.agent)) {
              const lastSeen = agentLastSeen[msg.agent]
              if (!lastSeen || msg.timestamp > lastSeen) {
                seenAgents.add(msg.agent)
                const preview = (msg.text || '').slice(0, 80) + ((msg.text || '').length > 80 ? '...' : '')
                unread.push({
                  agent: msg.agent,
                  text: preview,
                  timestamp: msg.timestamp,
                  id: msg.id,
                })
              }
            }
          }
          setInboxItems(unread)
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

        // Build auto-check keywords from completed events (events table is source of truth)
        if (data.events && data.events.length > 0) {
          keywordsRef.current = buildAutoCheckKeywordsFromEvents(data.events)
        }

        setPunchLoading(false)
        setLastUpdated(Date.now())
      } catch {
        setPunchLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchAll()
    // Local: poll every 3s. Production: poll every 10s (Supabase has rate limits)
    const interval = IS_LOCAL ? 3000 : 10000
    const timer = setInterval(fetchAll, interval)

    // Supabase Realtime subscriptions -- instant updates without waiting for poll.
    // Only active where supabase client is configured (production + local with env vars).
    let agentStatusChannel = null
    let eventsChannel = null
    if (supabase) {
      // agent_status table: existing subscription
      agentStatusChannel = supabase
        .channel('agent-status-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_status' }, () => {
          fetchAll()
        })
        .subscribe()

      // events table: new INSERT subscription -- fires fetchAll immediately when an agent
      // writes a new event (task_started, task_completed, task_failed, etc.).
      // This is the primary real-time trigger for Right Now task pills and agent status.
      eventsChannel = supabase
        .channel('events-inserts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, () => {
          fetchAll()
        })
        .subscribe()
    }

    return () => {
      clearInterval(timer)
      if (agentStatusChannel) supabase.removeChannel(agentStatusChannel)
      if (eventsChannel) supabase.removeChannel(eventsChannel)
    }
  }, [fetchAll])

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
  // Priority order: events table (richest -- WORKING/IDLE/STUCK/STALLED) >
  //   rightNow isLive flag (WORKING) > fallback IDLE.
  // STALLED is amber: task_started but 20+ min with no follow-up event.
  const ALL_AGENT_SLUGS = ['elon', 'gary', 'bobby', 'steffen', 'steve', 'cleo', 'alex', 'mom', 'tony', 'colton', 'jacob', 'paige', 'elmo', 'pixel']
  const activeAgentSlugs = new Set(rightNow.filter(t => t.isLive).map(t => t.agent))
  const eventsStatuses = eventsAgentStatusRef.current
  const eventsLastCompleted = eventsAgentLastCompletedRef.current
  const agents = ALL_AGENT_SLUGS.map(slug => {
    let status = 'IDLE'
    if (eventsStatuses[slug]) {
      // Events table is richest source: WORKING, IDLE, STUCK, or STALLED
      status = eventsStatuses[slug]
    } else if (activeAgentSlugs.has(slug)) {
      status = 'WORKING'
    }
    return {
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      status,
      latestResult: eventsLastCompleted[slug] || null,
    }
  })

  return {
    rightNow,
    completedFeed,
    inboxItems,
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
    refetch: fetchAll,
  }
}
