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

// ---- PARSE RIGHT NOW from notifications (agent-notifications.md is source of truth) ----
// For EACH agent, find their MOST RECENT entry (TASK STARTED or TASK FINISHED).
// If most recent = TASK STARTED, agent is ACTIVE (shows in Right Now).
// If most recent = TASK FINISHED, agent is DONE (excluded from Right Now).
// active-missions.md is a FALLBACK only for agents with zero notification entries.
function parseRightNow(missionsContent, notifContent) {
  // Step 1: Build per-agent most-recent-state from notifications (source of truth)
  // Walk lines top-to-bottom so later entries overwrite earlier ones = most recent wins.
  const agentState = new Map() // slug -> { state: 'started'|'finished', text }

  if (notifContent) {
    const lines = notifContent.trim().split('\n').filter(l => l.startsWith('['))

    for (const line of lines) {
      const startMatch = line.match(/TASK STARTED:\s*(\w[\w\s]*?\d?)\s*[-\u2013]\s*(.+?)$/i)
      if (startMatch) {
        let slug = startMatch[1].toLowerCase().replace(/\s+\d+$/, '').trim()
        if (/^bobby/.test(slug)) slug = 'bobby'
        if (/^steffen/.test(slug)) slug = 'steffen'
        let text = startMatch[2].replace(/\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim()
        if (text.length > 55) text = text.slice(0, 52) + '...'
        agentState.set(slug, { state: 'started', text, agent: slug })
      }
      // Match standard "TASK FINISHED: Agent -" and non-standard variants like
      // "TASK FINISHED Agent:", "TASK FINISHED] Bobby:", "**TASK FINISHED** | Bobby"
      const finishMatch = line.match(/TASK FINISHED[:\s|]*\s*(\w[\w\s]*?\d?)\s*[-\u2013:|]/i)
      if (finishMatch) {
        let slug = finishMatch[1].toLowerCase().replace(/\s+\d+$/, '').replace(/\s*\(.*$/, '').trim()
        if (/^bobby/.test(slug)) slug = 'bobby'
        if (/^steffen/.test(slug)) slug = 'steffen'
        agentState.set(slug, { state: 'finished', text: '', agent: slug })
      }
    }
  }

  // Step 2: Collect agents whose most recent notification is TASK STARTED
  const activeTasks = []
  const agentsFromNotifs = new Set()

  for (const [slug, info] of agentState) {
    agentsFromNotifs.add(slug)
    if (info.state === 'started') {
      activeTasks.push({ text: info.text, agent: slug, done: false, isLive: true })
    }
  }

  // Step 3: FALLBACK -- agents in active-missions.md "Running" table that have
  // zero notification entries get included (they haven't reported in yet).
  if (missionsContent) {
    const runningSection = missionsContent.split(/^## Running/m)[1]
    if (runningSection) {
      const runningContent = runningSection.split(/^## /m)[0]
      const rows = runningContent.trim().split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Agent'))
      for (const row of rows) {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean)
        if (cells.length < 3) continue
        let agentSlug = cells[0].toLowerCase().replace(/\s+\d+$/, '').trim()
        if (/^bobby/.test(agentSlug)) agentSlug = 'bobby'
        if (/^steffen/.test(agentSlug)) agentSlug = 'steffen'
        // Only include if this agent has NO notification entries at all
        if (agentsFromNotifs.has(agentSlug)) continue
        let text = cells[1].replace(/^Relaunched:\s*/i, '').replace(/\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim()
        if (text.length > 55) text = text.slice(0, 52) + '...'
        if (text.length > 3 && agentSlug) {
          activeTasks.push({ text, agent: agentSlug, done: false, isLive: true })
        }
      }
    }
  }

  return activeTasks
}

// ---- PARSE COMPLETED FEED from notifications --------------------------------
function parseCompletedFeed(notifContent) {
  if (!notifContent) return []

  const lines = notifContent.trim().split('\n').filter(l => l.startsWith('['))
  const completionLines = lines
    .filter(l => {
      if (/PATRIK\s*(DIRECTIVE|CLARIFICATION|FEEDBACK|BUG|REMINDER|DECISION)/i.test(l)) return false
      if (/COUNCIL\s*(DIRECTIVE|DECISION)/i.test(l)) return false
      if (/NEXT\s*WAVE/i.test(l)) return false
      return /TASK\s*FINISHED|SHIPPED|DELIVERED|MILESTONE/i.test(l)
    })
    .slice(-8)
    .reverse()

  return completionLines.map((line) => {
    const agentMatch = line.match(/(?:Bobby\s*\d?|Steffen\s*\d?|Cleo|Steve|Elon|Alex|Tony|Jacob|Colton|Elmo|Mom|Paige|Pixel)/i)
    let agentSlug = agentMatch ? agentMatch[0].toLowerCase().replace(/\s+/g, '') : null
    if (agentSlug && /^bobby\d?$/.test(agentSlug)) agentSlug = 'bobby'
    if (agentSlug && /^steffen\d?$/.test(agentSlug)) agentSlug = 'steffen'

    let text = ''
    const taskMatch = line.match(/TASK\s*FINISHED:\s*[\w\s\d]+[-\u2013]\s*(.+?)(?:\.\s|$)/i)
    const shippedMatch = line.match(/SHIPPED:\s*(?:\(1\)\s*)?(.+?)(?:,\s*\(2\)|\.\s|$)/i)
    const milestoneMatch = line.match(/MILESTONE:\s*[\w\s\d]+[-\u2013]\s*(.+?)(?:\.\s|$)/i)
    if (taskMatch) text = taskMatch[1].trim()
    else if (milestoneMatch) text = milestoneMatch[1].trim()
    else if (shippedMatch) text = shippedMatch[1].trim()
    else {
      const afterAgent = line.match(/\]\s*(?:TASK\s*FINISHED:\s*)?(?:Bobby|Steffen|Cleo|Steve|Elon|Alex|Tony|Jacob|Colton|Elmo|Mom|Paige|Pixel)[\d\s]*[-\u2013:]\s*(.+?)(?:\.\s|$)/i)
      text = afterAgent ? afterAgent[1].trim() : ''
    }

    text = text.replace(/@\w+:?/g, '')
      .replace(/\b[0-9a-f]{7,8}\b/g, '')
      .replace(/projects\/\S+/g, '')
      .replace(/\d+\s*commits?\s*pushed\s*\([^)]*\)/gi, '')
      .replace(/\(\s*\d+\s*commits?\s*to\s*[\w-]+[^)]*\)/gi, '')
      .replace(/\([^)]*commits?[^)]*\)/gi, '')
      .replace(/\([\s,]*\)/g, '')
      .replace(/REMAINING\s*TODOs?:.*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\s*[-\u2013:,.\s]+/, '')
      .replace(/[-\u2013:,.\s]+$/, '')
      .trim()
    if (text.length > 55) text = text.slice(0, 52) + '...'

    const isoMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T[^\]]+)\]/)
    const dateMatch = line.match(/\[(\d{4}-\d{2}-\d{2})\]/)
    const rawTimestamp = isoMatch ? isoMatch[1] : (dateMatch ? dateMatch[1] : '')
    const relativeTime = formatRelativeTime(rawTimestamp)

    return {
      text,
      agent: agentSlug,
      timestamp: relativeTime,
      rawTimestamp,
      done: true,
      isLive: false,
    }
  }).filter(t => t.text.length > 3 && t.agent)
}

// ---- BUILD AUTO-CHECK KEYWORDS from notifications ---------------------------
function buildAutoCheckKeywords(notifContent) {
  if (!notifContent) return new Set()

  const lines = notifContent.trim().split('\n').filter(l => l.startsWith('['))
  const completionLines = lines.filter(l =>
    /TASK\s*FINISHED|COMPLETE|DELIVERED|SHIPPED/i.test(l)
  )

  const completedDescriptions = []
  for (const line of completionLines) {
    const taskMatch = line.match(/TASK\s*FINISHED:\s*[\w\s\d]+[-\u2013]\s*(.+?)(?:\.\s|$)/i)
    const shippedMatch = line.match(/SHIPPED:\s*(?:\(\d+\)\s*)?(.+?)(?:,\s*\(\d+\)|\.\s|$)/i)
    if (taskMatch) completedDescriptions.push(taskMatch[1].trim().toLowerCase())
    if (shippedMatch) completedDescriptions.push(shippedMatch[1].trim().toLowerCase())
    const numberedItems = line.matchAll(/\((\d+)\)\s*([^,(]+)/g)
    for (const match of numberedItems) {
      completedDescriptions.push(match[2].trim().toLowerCase())
    }
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

  // Right Now: tasks whose latest event is task_started
  const rightNowTasks = []
  for (const [, info] of taskLatest) {
    if (info.event_type !== 'task_started') continue
    const description = info.payload.description || info.payload.task || info.payload.text || 'Working...'
    rightNowTasks.push({
      agent:     info.agent,
      text:      description.length > 55 ? description.slice(0, 52) + '...' : description,
      isLive:    true,
      isQueued:  false,
      fromEvents: true,
    })
  }

  // Agent statuses derived from latest event
  const agentStatuses = {}
  for (const [agent, info] of agentLatest) {
    const ageMs = info.timestamp ? now - new Date(info.timestamp).getTime() : 0
    let status = 'IDLE'
    if (info.event_type === 'task_started') {
      status = ageMs >= STALL_MS ? 'STALLED' : 'WORKING'
    } else if (info.event_type === 'task_completed' || info.event_type === 'qa_passed' || info.event_type === 'build_pushed') {
      status = 'IDLE'
    } else if (info.event_type === 'task_failed' || info.event_type === 'qa_failed') {
      status = 'STUCK'
    }
    agentStatuses[agent] = status
  }

  return { rightNowTasks, agentStatuses }
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
  // Supabase-sourced agent list for the current world (replaces hardcoded ALL_AGENT_SLUGS)
  const [supabaseAgents, setSupabaseAgents] = useState([])
  // Events-derived agent statuses: agent slug -> 'WORKING'|'IDLE'|'STUCK'|'STALLED'
  const eventsAgentStatusRef = useRef({})

  // Auto-check keywords stored in ref for stable callback
  const keywordsRef = useRef(new Set())

  // Store parsePunchList in a ref so the callback doesn't re-create on every render
  const parseFnRef = useRef(parsePunchList)
  parseFnRef.current = parsePunchList

  const fetchAll = useCallback(async () => {
    if (IS_LOCAL) {
      // LOCAL: read from filesystem APIs
      try {
        const [notifRes, punchRes, missionsRes, taskStatusRes] = await Promise.all([
          fetch('/api/local/file?path=context/agent-notifications.md').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/local/file?path=punch-list.md').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/local/file?path=context/active-missions.md').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/local/file?path=context/task-status.jsonl').then(r => r.ok ? r.json() : null).catch(() => null),
        ])

        const notifContent = notifRes?.content || ''
        const punchContent = punchRes?.content || ''
        const missionsContent = missionsRes?.content || ''
        const taskStatusContent = taskStatusRes?.content || ''

        // Parse task-status.jsonl: each line is JSON with status: STARTED, WORKING, QUEUED, FINISHED
        let taskStatusTasks = []
        if (taskStatusContent) {
          const lines = taskStatusContent.trim().split('\n').filter(line => line && !line.startsWith('#'))
          for (const line of lines) {
            try {
              const task = JSON.parse(line)
              if (task.status === 'STARTED' || task.status === 'WORKING') {
                taskStatusTasks.push({
                  text: task.description || task.task || task.text || 'Running...',
                  agent: task.agent || 'system',
                  done: false,
                  isLive: true,
                  isQueued: false,
                  taskId: task.id,
                })
              } else if (task.status === 'QUEUED') {
                taskStatusTasks.push({
                  text: task.description || task.task || task.text || 'Queued...',
                  agent: task.agent || 'system',
                  done: false,
                  isLive: true,
                  isQueued: true,
                  taskId: task.id,
                })
              }
            } catch {
              // Skip malformed lines
            }
          }
        }

        // Merge task-status tasks with notifications-based tasks (task-status takes priority)
        const notifTasks = parseRightNow(missionsContent, notifContent)
        const mergedTasks = [...taskStatusTasks]
        for (const task of notifTasks) {
          if (!mergedTasks.some(t => t.agent === task.agent)) {
            mergedTasks.push(task)
          }
        }

        // Hybrid: also read Supabase for done/todo tasks + events (not tracked in local files)
        // done tasks -> Right Now with isDoneAwaitingApproval (yellow)
        // todo tasks -> To Do pill via setTodoItems
        // events -> Right Now active tasks + agent status overrides
        try {
          const clientId = getClientId()
          const sbRes = await fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`)
          if (sbRes.ok) {
            const sbData = await sbRes.json()
            if (sbData.tasks) {
              // Done tasks awaiting approval
              const doneEntries = sbData.tasks
                .filter(t => t.status === 'done' && t.agent !== 'patrik')
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
              mergedTasks.push(...doneEntries)

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
            // Events table: derive Right Now tasks and agent statuses
            if (sbData.events && sbData.events.length > 0) {
              const { rightNowTasks, agentStatuses } = deriveStateFromEvents(sbData.events)
              eventsAgentStatusRef.current = agentStatuses
              // Merge events-derived tasks: events take priority for agents that have event data
              const eventsAgentSet = new Set(rightNowTasks.map(t => t.agent))
              const filteredMerged = mergedTasks.filter(t => !eventsAgentSet.has(t.agent) || t.isDoneAwaitingApproval)
              mergedTasks.length = 0
              mergedTasks.push(...rightNowTasks, ...filteredMerged)
            }
          }
        } catch {
          // Supabase unavailable in local dev -- skip done/todo tasks
        }

        setRightNow(mergedTasks)
        setCompletedFeed(parseCompletedFeed(notifContent))
        keywordsRef.current = buildAutoCheckKeywords(notifContent)

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

        // cage-match A: fetch active_processes (PID-verified truth) in parallel with main status
        const [res, activeAgentsRes] = await Promise.all([
          fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`),
          fetch('/api/dashboard/active-agents').catch(() => null),
        ])
        if (!res.ok) return
        const data = await res.json()
        const activeAgentsData = activeAgentsRes?.ok ? await activeAgentsRes.json() : null

        // Map Supabase data to Right Now format
        // cage-match A: Right Now = PID-verified processes from active_processes table.
        // Tasks table status is NEVER used for Right Now (it drifts). Only used for
        // queued/todo/done task pills.
        {
          const active = []

          // PRIMARY SOURCE (cage-match A): processes confirmed alive by PID check on the Mac.
          // Each row = an agent that has a live OS process right now. Zero drift possible.
          if (activeAgentsData?.active?.length > 0) {
            const pidVerifiedAgents = new Set()
            for (const proc of activeAgentsData.active) {
              pidVerifiedAgents.add(proc.agent)
              active.push({
                agent:    proc.agent,
                text:     proc.task_text || `${proc.agent} is working`,
                isLive:   true,
                isQueued: false,
                taskId:   proc.task_id || null,
                // Surface heartbeat age so the UI can show "last seen Xs ago"
                heartbeatAge: proc.age_seconds,
              })
            }
          } else if (!activeAgentsData || !activeAgentsData.tableExists) {
            // active_processes table not yet migrated -- fall back to tasks table
            // (old behavior, same as contender B). Remove once table is live.
            if (data.tasks) {
              const workingEntries = data.tasks
                .filter(t => t.status === 'active' || t.status === 'working' || t.status === 'in_progress')
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} is working`, isLive: true, isQueued: false, taskId: t.id }))
              active.push(...workingEntries)

              const queuedEntries = data.tasks
                .filter(t => t.status === 'queued')
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task queued`, isLive: true, isQueued: true, taskId: t.id }))
              active.push(...queuedEntries)
            }
          }

          // ALWAYS: Done tasks awaiting approval -> Inbox pill (not Right Now)
          if (data.tasks) {
            const doneEntries = data.tasks
              .filter(t => t.status === 'done' && t.agent !== 'patrik')
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
            active.push(...doneEntries)

            // Todo tasks for To Do pill (never shown in Right Now)
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

          // Events table: merge events-derived Right Now tasks + store agent statuses.
          // Events are the new source of truth for Right Now. They take priority over
          // active_processes and tasks table for agents that have event data.
          if (data.events && data.events.length > 0) {
            const { rightNowTasks, agentStatuses } = deriveStateFromEvents(data.events)
            eventsAgentStatusRef.current = agentStatuses
            if (rightNowTasks.length > 0) {
              // For agents that have events data: replace their active entry with the events version.
              // Agents only in active_processes (no events) are kept as-is.
              const eventsAgentSet = new Set(rightNowTasks.map(t => t.agent))
              const nonEventsActive = active.filter(t => !eventsAgentSet.has(t.agent) || t.isDoneAwaitingApproval)
              active.length = 0
              active.push(...rightNowTasks, ...nonEventsActive)
            }
          }

          // FALLBACK: agent_status table with status='working' + current_task.
          // write-checkpoint.py PATCHes agent_status directly. If no active_processes
          // rows AND no events captured the agent, this is the last source of truth.
          // Only add agents not already represented in active[].
          if (data.agents && data.agents.length > 0) {
            const alreadyInActive = new Set(active.map(t => t.agent))
            const workingFromStatus = data.agents
              .filter(a => a.status === 'working' && a.currentTask && !alreadyInActive.has(a.slug))
              .map(a => ({
                agent: a.slug,
                text: a.currentTask,
                isLive: true,
                isQueued: false,
                taskId: null,
                source: 'agent_status',
              }))
            if (workingFromStatus.length > 0) {
              active.push(...workingFromStatus)
            }
          }

          setRightNow(active)
        }

        // Store Supabase agent list for world-scoped rooms (replaces hardcoded ALL_AGENT_SLUGS)
        if (data.agents && data.agents.length > 0) {
          setSupabaseAgents(data.agents)
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

        setPunchLoading(false)
        setLastUpdated(Date.now())
      } catch {
        setPunchLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 10000) // 10s for faster status + RNB updates

    // Supabase Realtime subscriptions -- instant updates without waiting for poll.
    // Only active where supabase client is configured (production + local with env vars).
    let agentStatusChannel = null
    let eventsChannel = null
    let tasksChannel = null
    let messagesChannel = null
    if (supabase) {
      console.log('[Corner Realtime] Subscribing to agent_status, events, tasks, messages...')

      // agent_status table: any change triggers full refresh (RNB, alive dots, agent status)
      agentStatusChannel = supabase
        .channel('agent-status-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_status' }, () => {
          console.log('[Corner Realtime] agent_status changed')
          fetchAll()
        })
        .subscribe((status) => console.log('[Corner Realtime] agent_status sub:', status))

      // events table: INSERT triggers refresh (task_started/completed -> RNB pills)
      eventsChannel = supabase
        .channel('events-inserts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, () => {
          console.log('[Corner Realtime] events INSERT')
          fetchAll()
        })
        .subscribe((status) => console.log('[Corner Realtime] events sub:', status))

      // tasks table: any change triggers refresh (new tasks, status changes -> pills + RNB)
      tasksChannel = supabase
        .channel('tasks-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          console.log('[Corner Realtime] tasks changed')
          fetchAll()
        })
        .subscribe((status) => console.log('[Corner Realtime] tasks sub:', status))

      // messages table: INSERT triggers refresh (new chat messages update throughput + unread)
      messagesChannel = supabase
        .channel('messages-inserts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          console.log('[Corner Realtime] messages INSERT')
          fetchAll()
        })
        .subscribe((status) => console.log('[Corner Realtime] messages sub:', status))
    } else {
      console.log('[Corner Realtime] supabase client is null -- no Realtime subscriptions')
    }

    return () => {
      clearInterval(timer)
      if (agentStatusChannel) supabase.removeChannel(agentStatusChannel)
      if (eventsChannel) supabase.removeChannel(eventsChannel)
      if (tasksChannel) supabase.removeChannel(tasksChannel)
      if (messagesChannel) supabase.removeChannel(messagesChannel)
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
  //
  // WORLD ISOLATION: Non-AOM worlds use ONLY their Supabase agent_status rows.
  // AOM falls back to hardcoded list for backwards compatibility.
  const AOM_AGENT_SLUGS = ['elon', 'bobby', 'gary', 'steffen', 'steve', 'cleo', 'alex', 'mom', 'tony', 'colton', 'jacob', 'paige', 'elmo', 'pixel']
  const clientId = getClientId()
  const activeAgentSlugs = new Set(rightNow.filter(t => t.isLive).map(t => t.agent))
  const eventsStatuses = eventsAgentStatusRef.current

  let agents
  if (clientId === 'aom') {
    // AOM always uses the full hardcoded agent list. Supabase agent_status
    // entries overlay status info but never shrink the list. AOM's agent
    // roster is curated in gridSpec -- Supabase may only have a subset.
    const sbMap = Object.fromEntries(supabaseAgents.map(a => [a.slug, a]))
    agents = AOM_AGENT_SLUGS.map(slug => {
      const sb = sbMap[slug]
      let status = 'IDLE'
      if (eventsStatuses[slug]) status = eventsStatuses[slug]
      else if (activeAgentSlugs.has(slug)) status = 'WORKING'
      else if (sb?.status) status = sb.status.toUpperCase()
      return {
        slug,
        name: sb?.name || slug.charAt(0).toUpperCase() + slug.slice(1),
        role: sb?.role || '',
        status,
        color: sb?.color || '#60A5FA',
        updatedAt: sb?.updatedAt || null,
      }
    })
  } else {
    // World-scoped: only agents from Supabase agent_status for this client_id
    const source = supabaseAgents.length > 0 ? supabaseAgents : []
    agents = source.map(a => {
      let status = 'IDLE'
      if (eventsStatuses[a.slug]) status = eventsStatuses[a.slug]
      else if (activeAgentSlugs.has(a.slug)) status = 'WORKING'
      return {
        slug: a.slug,
        name: a.name || a.slug.charAt(0).toUpperCase() + a.slug.slice(1),
        role: a.role || '',
        status,
        color: a.color || '#60A5FA',
        updatedAt: a.updatedAt || null,
      }
    })
  }

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
