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
  const [punchData, setPunchData] = useState(null)
  const [punchLoading, setPunchLoading] = useState(IS_LOCAL)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Auto-check keywords stored in ref for stable callback
  const keywordsRef = useRef(new Set())

  // Store parsePunchList in a ref so the callback doesn't re-create on every render
  const parseFnRef = useRef(parsePunchList)
  parseFnRef.current = parsePunchList

  const fetchAll = useCallback(async () => {
    if (!IS_LOCAL) return

    try {
      // ONE poll, THREE parallel fetches
      const [notifRes, punchRes, missionsRes] = await Promise.all([
        fetch('/api/local/file?path=context/agent-notifications.md').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/local/file?path=punch-list.md').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/local/file?path=context/active-missions.md').then(r => r.ok ? r.json() : null).catch(() => null),
      ])

      const notifContent = notifRes?.content || ''
      const punchContent = punchRes?.content || ''
      const missionsContent = missionsRes?.content || ''

      // All computed from the same data snapshot, same tick
      setRightNow(parseRightNow(missionsContent, notifContent))
      setCompletedFeed(parseCompletedFeed(notifContent))
      keywordsRef.current = buildAutoCheckKeywords(notifContent)

      // Parse punch-list using consumer's parser
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
  }, [])

  useEffect(() => {
    if (!IS_LOCAL) return
    fetchAll()
    const timer = setInterval(fetchAll, 3000)
    return () => clearInterval(timer)
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
  }

  return {
    rightNow,
    completedFeed,
    yourTodos,
    finishThese,
    schedule,
    projectProgress,
    pillCounts,
    isAutoChecked,
    punchData,
    punchLoading,
    lastUpdated,
    refetch: fetchAll,
  }
}
