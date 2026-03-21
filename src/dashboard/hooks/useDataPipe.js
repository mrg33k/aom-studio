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
  const [punchData, setPunchData] = useState(null)
  const [punchLoading, setPunchLoading] = useState(IS_LOCAL)
  const [lastUpdated, setLastUpdated] = useState(null)

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
        const res = await fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`)
        if (!res.ok) return
        const data = await res.json()

        // Map Supabase data to Right Now format
        // Right Now shows TASKS not AGENTS. Each active task gets its own card.
        // If an agent has 3 active tasks, they show as 3 separate Right Now items.
        {
          const active = []

          // Primary source: active tasks from tasks table (one card per task)
          if (data.tasks) {
            // Working/active tasks -- agent is actually running them
            const workingEntries = data.tasks
              .filter(t => t.status === 'active' || t.status === 'working' || t.status === 'in_progress')
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} is working`, isLive: true, isQueued: false, taskId: t.id }))
            active.push(...workingEntries)

            // Queued tasks -- waiting for an agent to pick them up
            const queuedEntries = data.tasks
              .filter(t => t.status === 'queued')
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task queued`, isLive: true, isQueued: true, taskId: t.id }))
            active.push(...queuedEntries)
          }

          // Fallback: working agents from agent_status that have NO active tasks
          if (data.agents) {
            const agentsWithTasks = new Set(active.map(a => a.agent))
            const agentFallback = data.agents
              .filter(a => a.status === 'working' && !agentsWithTasks.has(a.slug))
              .map(a => ({ agent: a.slug, text: a.currentTask || `${a.name} is working`, isLive: true }))
            active.push(...agentFallback)
          }

          setRightNow(active)
        }

        // Map tasks to completed feed
        if (data.tasks) {
          const completed = data.tasks
            .filter(t => t.status === 'completed' || t.status === 'done')
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
        if (data.tasks && data.tasks.length > 0) {
          const projectMap = new Map()
          const todayTasks = []

          // Color palette for auto-generated project pills
          const PROD_COLORS = {
            'rightnow': '#FF6B3D', 'your-todos': '#EF4444', 'schedule': '#FF6B3D',
            'finish-these': '#6B8AB0', 'corner': '#3B9EFF', 'ambition': '#F59E0B',
            'outreach': '#EF4444', 'infra': '#4CAF50', 'content': '#FF7043',
          }
          const DEFAULT_COLOR = '#6B8AB0'

          for (const task of data.tasks) {
            const projectKey = task.project || task.section || 'general'
            const slug = projectKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')

            if (!projectMap.has(slug)) {
              projectMap.set(slug, {
                name: task.project || projectKey.charAt(0).toUpperCase() + projectKey.slice(1),
                section: slug,
                color: PROD_COLORS[slug] || DEFAULT_COLOR,
                icon: 'project',
                tasks: [],
              })
            }

            const proj = projectMap.get(slug)
            const isDone = task.status === 'completed' || task.status === 'done'
            const taskObj = {
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

          // Ensure default project pills always exist even without tasks
          const DEFAULT_PROJECTS = [
            { name: 'Corner', section: 'corner', color: '#3B9EFF', icon: 'project' },
            { name: 'Ambition', section: 'ambition', color: '#F59E0B', icon: 'project' },
            { name: 'KOHRS', section: 'kohrs', color: '#EF4444', icon: 'project' },
            { name: 'ISA', section: 'isa', color: '#F97316', icon: 'project' },
            { name: 'Skylar', section: 'skylar', color: '#EC4899', icon: 'project' },
            { name: 'Outreach', section: 'outreach', color: '#EF4444', icon: 'project' },
            { name: 'IH', section: 'ih', color: '#EF4444', icon: 'client' },
            { name: 'Brandon Wiley', section: 'brandon-wiley', color: '#9C27B0', icon: 'project' },
            { name: 'NABI', section: 'nabi', color: '#F97316', icon: 'project' },
            { name: 'LBX', section: 'lbx', color: '#9C27B0', icon: 'project' },
          ]
          for (const dp of DEFAULT_PROJECTS) {
            if (!projectMap.has(dp.section)) {
              projectMap.set(dp.section, { ...dp, tasks: [] })
            }
          }
          setPunchData({ projects: Array.from(projectMap.values()), todayTasks })
        } else {
          setPunchData({ projects: [], todayTasks: [] })
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

    // FIX 3: Supabase Realtime subscription -- updates Right Now instantly on agent_status changes
    // without waiting for the 10s poll. Only active in production where supabase is configured.
    let channel = null
    if (!IS_LOCAL && supabase) {
      channel = supabase
        .channel('agent-status-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_status' }, () => {
          // Re-fetch all data on any agent_status change
          fetchAll()
        })
        .subscribe()
    }

    return () => {
      clearInterval(timer)
      if (channel) supabase.removeChannel(channel)
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
    schedule: schedule.length,
    finishThese: finishThese.length,
    inbox: inboxItems.length,
  }

  // Build agents status map for CanvasOffice room states
  const ALL_AGENT_SLUGS = ['elon', 'bobby', 'steffen', 'steve', 'cleo', 'alex', 'mom', 'tony', 'colton', 'jacob', 'paige', 'elmo', 'pixel']
  const activeAgentSlugs = new Set(rightNow.filter(t => t.isLive).map(t => t.agent))
  const agents = ALL_AGENT_SLUGS.map(slug => ({
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    status: activeAgentSlugs.has(slug) ? 'WORKING' : 'IDLE',
  }))

  return {
    rightNow,
    completedFeed,
    inboxItems,
    yourTodos,
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
