// Realtime subscriptions: agent_status, messages, tasks -- unique channel IDs per instance
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

// Right Now is sourced exclusively from agent_status table (active-agents API).
// No file-based parsing. No event derivation. agent_status is the only source of truth.

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

// ---- BUILD INBOX ITEMS from a newest-first messages array -------------------
// Expects msgs sorted by timestamp DESC (newest first).
// Returns one entry per agent: the most recent message with unread flag.
function buildInboxItems(msgsNewestFirst) {
  const agentLastSeen = {} // agent -> timestamp of last user message from dashboard
  const latestPerAgent = {} // agent -> latest inbox entry
  for (const msg of msgsNewestFirst) {
    if (msg.role === 'user' && msg.source === 'corner-dashboard' && !agentLastSeen[msg.agent]) {
      agentLastSeen[msg.agent] = msg.timestamp
    }
  }
  for (const msg of msgsNewestFirst) {
    if (msg.agent && !latestPerAgent[msg.agent]) {
      const text = msg.text || ''
      const preview = text.slice(0, 80) + (text.length > 80 ? '...' : '')
      const lastSeen = agentLastSeen[msg.agent]
      latestPerAgent[msg.agent] = {
        agent: msg.agent,
        text: preview,
        timestamp: msg.timestamp,
        id: msg.id,
        isUnread: msg.role === 'assistant' && (!lastSeen || msg.timestamp > lastSeen),
      }
    }
  }
  return Object.values(latestPerAgent)
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
  // Active projects from Supabase projects table (is_active=true, scoped by client_id)
  const [projectDefs, setProjectDefs] = useState([])
  // Supabase-sourced agent list for the current world (replaces hardcoded ALL_AGENT_SLUGS)
  const [supabaseAgents, setSupabaseAgents] = useState([])
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

  const fetchAll = useCallback(async () => {
    if (IS_LOCAL) {
      // LOCAL: read from filesystem APIs
      try {
        const [notifRes, punchRes] = await Promise.all([
          fetch('/api/local/file?path=context/agent-notifications.md').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/local/file?path=punch-list.md').then(r => r.ok ? r.json() : null).catch(() => null),
        ])

        const notifContent = notifRes?.content || ''
        const punchContent = punchRes?.content || ''

        // Right Now: tasks table is the source of truth. Same logic for both paths.
        const mergedTasks = []
        const STAGE_LABELS = {
          'queued': 'Queued',
          'classifying': 'Classifying',
          'planning': 'Planning',
          'building': 'Building',
          'qa': 'QA Review',
        }

        try {
          const clientId = getClientId()
          const sbRes = await fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`)
          if (sbRes.ok) {
            const sbData = await sbRes.json()
            if (sbData.tasks) {
              // Build agent display name lookup from response data
              const sbAgentNameMap = {}
              if (sbData.agents) {
                for (const a of sbData.agents) sbAgentNameMap[a.slug] = a.name
              }

              // Pipeline tasks -> Right Now
              const pipelineTasks = sbData.tasks.filter(t => STAGE_LABELS[t.status])
              for (const t of pipelineTasks) {
                const agentSlug = t.agent || t.agent_identity || 'system'
                mergedTasks.push({
                  agent: agentSlug,
                  agentDisplayName: sbAgentNameMap[agentSlug] || null,
                  rawTitle: t.title || t.text || 'Task',
                  text: `[${STAGE_LABELS[t.status]}] ${t.title || t.text || 'Task'}`,
                  isLive: t.status !== 'queued',
                  isQueued: t.status === 'queued',
                  taskId: t.id,
                  qa_score: t.qa_score || null,
                  agent_identity: t.agent_identity || agentSlug,
                  project: t.project || null,
                })
              }

              const doneEntries = sbData.tasks
                .filter(t => t.status === 'done' && t.agent !== 'patrik')
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
              mergedTasks.push(...doneEntries)

              const todoEntries = sbData.tasks
                .filter(t => t.status === 'todo' && t.agent !== 'patrik')
                .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task`, taskId: t.id, done: false, project: t.project }))
              setTodoItems(todoEntries)

              const patrikEntries = sbData.tasks
                .filter(t => t.agent === 'patrik' && t.status !== 'completed' && t.status !== 'done')
                .map(t => ({ text: t.text || '', agent: 'patrik', taskId: t.id, done: false, project: t.project }))
              setPersonalTodos(patrikEntries)
            }

            // Build inbox: latest message per agent (for card previews) -- all sources, no filter
            // sbData.messages is oldest-first (API reverses timestamp.desc fetch)
            if (sbData.messages && sbData.messages.length > 0) {
              setInboxItems(buildInboxItems([...sbData.messages].reverse()))
            }
          }
        } catch {
          // Supabase unavailable in local dev
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
        // Both requests pass client (world slug) so RNB is scoped to the active world.
        const [res, activeAgentsRes] = await Promise.all([
          fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`),
          fetch(`/api/dashboard/active-agents?client=${encodeURIComponent(clientId)}`).catch(() => null),
        ])
        if (!res.ok) return
        const data = await res.json()
        const activeAgentsData = activeAgentsRes?.ok ? await activeAgentsRes.json() : null

        // Right Now: tasks table is the source of truth. Period.
        // Any task that is queued, classifying, planning, building, or in QA shows up.
        // No events derivation. No agent_status. Just read the tasks table.
        {
          const active = []
          const STAGE_LABELS = {
            'queued': 'Queued',
            'classifying': 'Classifying',
            'planning': 'Planning',
            'building': 'Building',
            'qa': 'QA Review',
          }

          if (data.tasks) {
            // Build agent display name lookup from response data
            const agentNameMap = {}
            if (data.agents) {
              for (const a of data.agents) agentNameMap[a.slug] = a.name
            }

            // Active pipeline tasks -> Right Now
            const pipelineTasks = data.tasks.filter(t => STAGE_LABELS[t.status])
            for (const t of pipelineTasks) {
              const agentSlug = t.agent || t.agent_identity || 'system'
              active.push({
                agent: agentSlug,
                agentDisplayName: agentNameMap[agentSlug] || null,
                rawTitle: t.title || t.text || 'Task',
                text: `[${STAGE_LABELS[t.status]}] ${t.title || t.text || 'Task'}`,
                isLive: t.status !== 'queued',
                isQueued: t.status === 'queued',
                taskId: t.id,
                qa_score: t.qa_score || null,
                agent_identity: t.agent_identity || agentSlug,
                project: t.project || null,
              })
            }

            // Done tasks awaiting approval
            const doneEntries = data.tasks
              .filter(t => t.status === 'done' && t.agent !== 'patrik')
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task needs review`, isLive: false, isQueued: false, isDoneAwaitingApproval: true, taskId: t.id }))
            active.push(...doneEntries)

            const todoEntries = data.tasks
              .filter(t => t.status === 'todo' && t.agent !== 'patrik')
              .map(t => ({ agent: t.agent || 'system', text: t.text || `${t.agent} task`, taskId: t.id, done: false, project: t.project }))
            setTodoItems(todoEntries)

            const patrikEntries = data.tasks
              .filter(t => t.agent === 'patrik' && t.status !== 'completed' && t.status !== 'done')
              .map(t => ({ text: t.text || '', agent: 'patrik', taskId: t.id, done: false, project: t.project }))
            setPersonalTodos(patrikEntries)
          }

          setRightNow(active)
        }

        // Store Supabase agent list for world-scoped rooms (replaces hardcoded ALL_AGENT_SLUGS)
        if (data.agents && data.agents.length > 0) {
          setSupabaseAgents(data.agents)
        }

        // Store active project definitions from projects table (is_active=true)
        if (data.projectDefs) {
          setProjectDefs(data.projectDefs)
        }

        // Map tasks to completed feed (only fully approved/completed, not pending-approval 'done')
        if (data.tasks) {
          const completed = data.tasks
            .filter(t => t.status === 'completed')
            .map(t => ({ agent: t.agent || 'system', text: t.text, done: true, isLive: false }))
          setCompletedFeed(completed)
        }

        // Build inbox: latest message per agent (for card previews)
        // FIXED: Fetch latest message PER AGENT individually instead of a global
        // limit(300) which gets drowned by high-volume agents (gary, system, task threads).
        if (supabase) {
          // Get all known agent slugs from the agents list
          const agentSlugs = supabaseAgents.length > 0
            ? supabaseAgents.map(a => a.slug).filter(Boolean)
            : ['rex','bobby','elon','gary','steffen','alex','cleo','colton','jacob','mark','mom','paige','pixel','steve','tony']
          if (agentSlugs.length > 0) {
            const perAgentResults = await Promise.all(
              agentSlugs.map(slug =>
                supabase
                  .from('messages')
                  .select('id, agent, text, timestamp, role, source')
                  .eq('client_id', clientId)
                  .eq('agent', slug)
                  .not('agent', 'like', 'task:%')
                  .order('timestamp', { ascending: false })
                  .limit(1)
                  .then(({ data }) => data?.[0] || null)
              )
            )
            const inboxMsgs = perAgentResults.filter(Boolean)
            if (inboxMsgs.length > 0) {
              setInboxItems(buildInboxItems(inboxMsgs))
            }
          }
        } else if (data.messages) {
          setInboxItems(buildInboxItems([...data.messages].reverse()))
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
              qa_score: task.qa_score || null,
              agent_identity: task.agent_identity || task.agent || null,
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

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 10000) // 10s for faster status + RNB updates

    // Supabase Realtime subscriptions -- instant updates without waiting for poll.
    // Only active where supabase client is configured (production + local with env vars).
    let agentStatusChannel = null
    let tasksChannel = null
    let messagesChannel = null
    if (supabase) {
      const cid = channelIdRef.current
      const clientId = getClientId()
      console.log('[Corner Realtime] Subscribing to agent_status, events, tasks, messages... id:', cid, 'client:', clientId)

      // agent_status table: any change triggers full refresh (RNB, alive dots, agent status)
      // Scoped by client_id for multi-tenant isolation
      agentStatusChannel = supabase
        .channel(`agent-status-changes-${cid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_status', filter: `client_id=eq.${clientId}` }, () => {
          console.log('[Corner Realtime] agent_status changed')
          fetchAll()
        })
        .subscribe((status) => console.log('[Corner Realtime] agent_status sub:', status))

      // tasks table: any change triggers refresh (new tasks, status changes -> pills + RNB)
      tasksChannel = supabase
        .channel(`tasks-changes-${cid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `client_id=eq.${clientId}` }, () => {
          console.log('[Corner Realtime] tasks changed')
          fetchAll()
        })
        .subscribe((status) => console.log('[Corner Realtime] tasks sub:', status))

      // messages table: INSERT triggers immediate inboxItems update + full refresh
      messagesChannel = supabase
        .channel(`messages-inserts-${cid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` }, (event) => {
          console.log('[Corner Realtime] messages INSERT')
          // Immediately update inboxItems from event payload -- no round-trip wait.
          // This ensures the inbox shows the new message the instant it's inserted.
          const newMsg = event.new
          if (newMsg?.agent) {
            const text = newMsg.text || ''
            const preview = text.slice(0, 80) + (text.length > 80 ? '...' : '')
            setInboxItems(prev => {
              const filtered = prev.filter(item => item.agent !== newMsg.agent)
              return [{
                agent: newMsg.agent,
                text: preview,
                timestamp: newMsg.timestamp || new Date().toISOString(),
                id: newMsg.id,
                isUnread: newMsg.role === 'assistant',
              }, ...filtered]
            })
          }
          fetchAll()
        })
        .subscribe((status) => console.log('[Corner Realtime] messages sub:', status))
    } else {
      console.log('[Corner Realtime] supabase client is null -- no Realtime subscriptions')
    }

    return () => {
      clearInterval(timer)
      if (agentStatusChannel) supabase.removeChannel(agentStatusChannel)
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
  //
  // Source of truth: Supabase agent_status table only.
  // Set by: task_runner, gemini, or system safety net (30-min pg_cron clear).
  // No event derivation. No time-based heuristics. No file-based fallbacks.
  //
  // WORLD ISOLATION: Non-AOM worlds use ONLY their Supabase agent_status rows.
  // AOM falls back to hardcoded list for backwards compatibility.
  const AOM_AGENT_SLUGS = supabaseAgents.length > 0
    ? supabaseAgents.map(a => a.slug)
    : ['rex', 'elon', 'bobby', 'gary', 'steffen', 'steve', 'cleo', 'alex', 'mom', 'tony', 'colton', 'jacob', 'paige', 'elmo', 'pixel'] // fallback
  const clientId = getClientId()

  let agents
  if (clientId === 'aom') {
    // AOM always uses the full hardcoded agent list. Supabase agent_status
    // entries overlay status info but never shrink the list. AOM's agent
    // roster is curated in gridSpec -- Supabase may only have a subset.
    const sbMap = Object.fromEntries(supabaseAgents.map(a => [a.slug, a]))
    const gridMap = Object.fromEntries(GRID_AGENTS.map(a => [a.slug, a]))
    agents = AOM_AGENT_SLUGS.map(slug => {
      const sb = sbMap[slug]
      const grid = gridMap[slug]
      // Supabase agent_status is the ONLY source of truth.
      const status = sb?.status ? sb.status.toUpperCase() : 'IDLE'
      return {
        slug,
        name: sb?.name || grid?.name || slug.charAt(0).toUpperCase() + slug.slice(1),
        role: sb?.role || grid?.role || '',
        status,
        color: sb?.color || grid?.color || '#60A5FA',
        updatedAt: sb?.updatedAt || null,
      }
    })
  } else {
    // World-scoped: only agents from Supabase agent_status for this client_id
    const source = supabaseAgents.length > 0 ? supabaseAgents : []
    agents = source.map(a => ({
      slug: a.slug,
      name: a.name || a.slug.charAt(0).toUpperCase() + a.slug.slice(1),
      role: a.role || '',
      // Supabase agent_status is the ONLY source of truth.
      status: a.status ? a.status.toUpperCase() : 'IDLE',
      color: a.color || '#60A5FA',
      updatedAt: a.updatedAt || null,
    }))
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
    projectDefs,
    refetch: fetchAll,
  }
}
