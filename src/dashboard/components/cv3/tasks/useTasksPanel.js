// useTasksPanel -- scoped hook owning TasksPanel's internal state + derivations.
// Introduced in R3a. R3d (Apr 17, 2026): cross-cutting inputs (currentUser,
// worldId, task pipes, chat-nav callbacks) now come from the top-level
// CornerContext (auth/data/nav slices) instead of props; the shell calls
// useTasksPanel() with no arguments and the hook resolves everything via
// useCornerAuth / useCornerData / useCornerNav.
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { authFetch } from '../../../lib/authFetch.js'
import { createTaskWithRex } from '../../../lib/rexTaskClient.js'
import { getClientId } from '../../../lib/clientConfig.js'
import { useProjects } from '../../../hooks/useProjects'
import { useCornerAuth, useCornerData, useCornerNav } from '../../../CornerContext.jsx'

const snippetOfTitle = (s, n = 90) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

export function useTasksPanel() {
  const { currentUser, worldId, showToast } = useCornerAuth()
  const { queued, rightNow, waiting, done, allTasks, refreshTasks, addOptimisticTask, currentUserSlug, personalTodos } = useCornerData()
  const {
    setTab: setActiveTab,
    handleSelectProject: setActiveConversation,
    setPrefillMessage,
  } = useCornerNav()
  // ── Filter + project pill state ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeProject, setActiveProject] = useState('all')
  const [projectDefs, setProjectDefs] = useState([]) // [{name, slug}]

  // ── Create-project modal ───────────────────────────────────────────────
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#10B981')
  const [createProjectSubmitting, setCreateProjectSubmitting] = useState(false)
  const [createProjectError, setCreateProjectError] = useState(null)

  // ── Task card lifecycle ────────────────────────────────────────────────
  const [shippedLimit, setShippedLimit] = useState(50)
  const [expandedTask, setExpandedTask] = useState(null)
  const [taskThread, setTaskThread] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState({})
  const [insightsData, setInsightsData] = useState({})
  const [insightsLoading, setInsightsLoading] = useState({})
  const [insightsError, setInsightsError] = useState({})

  // ── Task input + voice recording ───────────────────────────────────────
  const [taskInput, setTaskInput] = useState('')
  const [taskInputFocused, setTaskInputFocused] = useState(false)
  const [taskSubmitting, setTaskSubmitting] = useState(false)
  const taskInputRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null) // eslint-disable-line no-unused-vars
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const micStreamRef = useRef(null)

  // ── Right-click / long-press context menu ──────────────────────────────
  const [taskMenu, setTaskMenu] = useState(null) // { x, y, task }
  const [taskVerifyIds, setTaskVerifyIds] = useState(() => new Set())
  const [ctxToast, setCtxToast] = useState(null)
  const showCtxToast = useCallback((text) => {
    setCtxToast({ text, at: Date.now() })
    setTimeout(() => setCtxToast(null), 2400)
  }, [])
  const openTaskMenu = useCallback((e, task) => {
    e.preventDefault()
    e.stopPropagation()
    setTaskMenu({ x: e.clientX, y: e.clientY, task })
  }, [])
  const taskLongPressRef = useRef(null)
  const startTaskLongPress = useCallback((e, task) => {
    if (!e.touches?.length) return
    const t = e.touches[0]
    const x = t.clientX, y = t.clientY
    taskLongPressRef.current = setTimeout(() => setTaskMenu({ x, y, task }), 600)
  }, [])
  const cancelTaskLongPress = useCallback(() => {
    if (taskLongPressRef.current) clearTimeout(taskLongPressRef.current)
    taskLongPressRef.current = null
  }, [])

  // ── Files section state ────────────────────────────────────────────────
  const [taskFilesOpen, setTaskFilesOpen] = useState(false)
  const [taskBriefs, setTaskBriefs] = useState([])
  const [taskAttachments, setTaskAttachments] = useState([])
  const [taskFilesLoading, setTaskFilesLoading] = useState(false)
  // R39-3: missions = sub-projects nested under activeProject. Data flows from
  // /api/dashboard/missions?project=<slug> (rolls up scaffold_file events
  // keyed by agent='<project>:<mission>'). R39-4 handles drill-in.
  const [taskMissions, setTaskMissions] = useState([])
  const [taskMissionsOpen, setTaskMissionsOpen] = useState(true)
  const [taskMissionsLoading, setTaskMissionsLoading] = useState(false)
  // R39-4: mission mini Command Center. When set, drawer body swaps to a
  // mission-scoped view. Russian-doll: clicking a mission row inside a
  // mission view appends ':<slug>' (e.g. 'corner:music-pack:drum-kit').
  // Reset whenever activeProject changes (different pill = fresh drawer).
  const [activeMissionPath, setActiveMissionPath] = useState('')
  useEffect(() => { setActiveMissionPath('') }, [activeProject])
  const drawerScope = activeMissionPath || activeProject
  const [taskIsMobile, setTaskIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  // Global Files section state (all projects view)
  const [allBriefs, setAllBriefs] = useState([])
  const [allBriefsLoading, setAllBriefsLoading] = useState(false)
  const [allBriefsOpen, setAllBriefsOpen] = useState(false)
  const [allBriefsLimit, setAllBriefsLimit] = useState(25)

  // Inline brief viewer
  const [selectedBrief, setSelectedBrief] = useState(null)
  const [briefHtml, setBriefHtml] = useState('')
  const [briefLoading, setBriefLoading] = useState(false)

  // Live project summary card
  const [summaryEvent, setSummaryEvent] = useState(null)
  const [summaryJustUpdated, setSummaryJustUpdated] = useState(false)
  const [summaryNowTick, setSummaryNowTick] = useState(0)

  // Reply input for waiting tasks
  const [waitingReply, setWaitingReply] = useState({})
  const [waitingReplySending, setWaitingReplySending] = useState({})

  // ── Task thread expansion ──────────────────────────────────────────────
  // R2 (corner:task-rooms): the drawer now loads BOTH legacy task-pipeline
  // messages (agent='task:<id>') AND the new task-room messages keyed via
  // metadata.task_id. Two queries merged client-side because the supabase-js
  // .or() filter doesn't cleanly mix .eq on a column with a JSON-path filter.
  const toggleTaskExpand = useCallback(async (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null)
      setTaskThread([])
      return
    }
    setExpandedTask(taskId)
    setThreadLoading(true)
    try {
      const [legacyRes, roomRes] = await Promise.all([
        supabase
          .from('messages')
          .select('text,timestamp,role,source,metadata')
          .eq('agent', `task:${taskId}`)
          .order('timestamp', { ascending: true })
          .limit(30),
        supabase
          .from('messages')
          .select('text,timestamp,role,source,metadata')
          .eq('metadata->>task_id', taskId)
          .order('timestamp', { ascending: true })
          .limit(30),
      ])
      const merged = [...(legacyRes.data || []), ...(roomRes.data || [])]
      const seen = new Set()
      const deduped = []
      for (const m of merged) {
        const key = `${m.timestamp}|${m.text}`
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(m)
      }
      deduped.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
      setTaskThread(deduped)
    } catch { setTaskThread([]) }
    setThreadLoading(false)
  }, [expandedTask])

  // ── Per-task failure insights ──────────────────────────────────────────
  const toggleInsights = useCallback(async (taskId) => {
    const alreadyOpen = !!insightsOpen[taskId]
    if (alreadyOpen) {
      setInsightsOpen(prev => ({ ...prev, [taskId]: false }))
      return
    }
    setInsightsOpen(prev => ({ ...prev, [taskId]: true }))

    if (insightsData[taskId]) return

    setInsightsLoading(prev => ({ ...prev, [taskId]: true }))
    setInsightsError(prev => ({ ...prev, [taskId]: null }))
    try {
      if (!supabase) throw new Error('Supabase not configured')
      const [taskRes, msgRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('qa_score,qa_notes,error,metadata,attempt_count,result')
          .eq('id', taskId)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('text,timestamp,role,source')
          .eq('agent', `task:${taskId}`)
          .order('timestamp', { ascending: false })
          .limit(40),
      ])
      if (taskRes.error) throw new Error(taskRes.error.message || 'Failed to load task')
      if (msgRes.error) throw new Error(msgRes.error.message || 'Failed to load logs')

      const row = taskRes.data || {}
      const allMsgs = msgRes.data || []
      const failureKeywords = /\b(qa|fail|error|stuck|timeout|reject|retry|denied|exception)\b/i
      const failureLogs = allMsgs
        .filter(m => {
          const src = String(m.source || m.role || '').toLowerCase()
          if (src.includes('qa') || src.includes('error') || src.includes('fail')) return true
          return failureKeywords.test(String(m.text || ''))
        })
        .slice(0, 15)
        .reverse()

      setInsightsData(prev => ({
        ...prev,
        [taskId]: {
          qaScore: row.qa_score ?? null,
          qaNotes: row.qa_notes || '',
          error: row.error || '',
          attemptCount: row.attempt_count || 1,
          resultSummary: row.result || '',
          failureLogs,
          logCount: failureLogs.length,
        },
      }))
    } catch (err) {
      setInsightsError(prev => ({ ...prev, [taskId]: err?.message || 'Failed to load insights' }))
    } finally {
      setInsightsLoading(prev => ({ ...prev, [taskId]: false }))
    }
  }, [insightsOpen, insightsData])

  const { projects: taskProjects } = useProjects()

  // Auto-start runner every time Tasks tab mounts
  useEffect(() => {
    authFetch('/api/dashboard/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'startRunner', clientId: worldId || getClientId() || 'aom' }),
    }).catch(() => {})
  }, [worldId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll latest project_summary event
  useEffect(() => {
    if (!activeProject || activeProject === 'all') {
      setSummaryEvent(null)
      setSummaryJustUpdated(false)
      return
    }
    let cancelled = false
    let lastSeenTs = null

    const fetchLatest = async () => {
      try {
        const resp = await fetch(`/api/dashboard/project-summary?slug=${encodeURIComponent(activeProject)}`)
        if (cancelled) return
        if (!resp.ok) return
        const data = await resp.json().catch(() => null)
        if (cancelled) return
        const row = data?.event || null
        if (!row) {
          if (lastSeenTs !== null) setSummaryEvent(null)
          lastSeenTs = null
          return
        }
        if (row.timestamp !== lastSeenTs) {
          const wasFirst = lastSeenTs === null
          lastSeenTs = row.timestamp
          setSummaryEvent(row)
          if (!wasFirst) {
            setSummaryJustUpdated(true)
            window.setTimeout(() => setSummaryJustUpdated(false), 1800)
          }
        }
      } catch {
        // swallow — next tick will retry
      }
    }

    fetchLatest()
    const iv = window.setInterval(fetchLatest, 60000)
    return () => { cancelled = true; window.clearInterval(iv) }
  }, [activeProject])

  // Drive "updated Ns ago" label without re-fetching
  useEffect(() => {
    if (!summaryEvent) return
    const iv = window.setInterval(() => setSummaryNowTick(t => t + 1), 1000)
    return () => window.clearInterval(iv)
  }, [summaryEvent])

  // Mobile breakpoint watcher for Files section
  useEffect(() => {
    const handleResize = () => setTaskIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load per-project (or per-mission) files when drawer scope changes.
  // drawerScope = activeMissionPath || activeProject (R39-4). Image listings
  // still key on the raw project slug because mission assets aren't under
  // the mission prefix in Storage yet.
  useEffect(() => {
    if (!drawerScope || drawerScope === 'all') {
      setTaskBriefs([])
      setTaskAttachments([])
      setTaskFilesOpen(false)
      return
    }
    let cancelled = false
    setTaskFilesLoading(true)
    // R39-1: dropped ?type=text — post-R30 the briefs endpoint covers scaffold
    // rows; text was the legacy text_files path and returning scaffold rows
    // there caused duplicate drawer entries (slug-based dedup couldn't catch
    // them because text-path rows carry no slug field).
    const imgPrefix = activeProject
    Promise.all([
      fetch(`/api/dashboard/files?type=images&prefix=${encodeURIComponent(imgPrefix)}/`).then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] })),
      fetch(`/api/dashboard/files?type=briefs&project=${encodeURIComponent(drawerScope)}&client=${encodeURIComponent(worldId || 'aom')}`).then(r => r.ok ? r.json() : { briefs: [] }).catch(() => ({ briefs: [] })),
    ]).then(([imgData, briefsData]) => {
      if (cancelled) return
      const images = (imgData.files || []).map(f => ({ ...f, filename: f.name }))
      const briefs = briefsData.briefs || []
      setTaskBriefs(briefs)
      // Attachments only relevant at project root; mission view doesn't own
      // Storage assets. Avoids showing the parent's images in every mission.
      setTaskAttachments(activeMissionPath ? [] : images)
    }).catch(() => {
      if (!cancelled) { setTaskBriefs([]); setTaskAttachments([]); setTaskFilesOpen(false) }
    }).finally(() => { if (!cancelled) setTaskFilesLoading(false) })
    return () => { cancelled = true }
  }, [drawerScope, activeProject, activeMissionPath])

  // R39-3/R39-4: load missions for the current drawer scope. Same endpoint
  // works for projects (project=corner) and mission paths (project=corner:
  // music-pack) — it matches any agent with that prefix and returns the
  // direct-child level.
  useEffect(() => {
    if (!drawerScope || drawerScope === 'all') {
      setTaskMissions([])
      return
    }
    let cancelled = false
    setTaskMissionsLoading(true)
    fetch(`/api/dashboard/missions?project=${encodeURIComponent(drawerScope)}`)
      .then(r => r.ok ? r.json() : { missions: [] })
      .catch(() => ({ missions: [] }))
      .then(data => {
        if (!cancelled) setTaskMissions(Array.isArray(data.missions) ? data.missions : [])
      })
      .finally(() => { if (!cancelled) setTaskMissionsLoading(false) })
    return () => { cancelled = true }
  }, [drawerScope])

  // Load all briefs for global Files section
  useEffect(() => {
    if (activeProject !== 'all') return
    let cancelled = false
    setAllBriefsLoading(true)
    fetch(`/api/dashboard/files?type=briefs&project=all&client=${encodeURIComponent(worldId || 'aom')}`)
      .then(r => r.ok ? r.json() : { briefs: [] })
      .catch(() => ({ briefs: [] }))
      .then(data => {
        if (!cancelled) {
          setAllBriefs(data.briefs || [])
          setAllBriefsLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [activeProject, worldId])

  // Open brief inline viewer
  // R37b: scaffold-source briefs (event_type=scaffold_file) are looked up by
  // (project, filename) — their slugs contain caps (e.g. "VISION") and aren't
  // build-time briefs. The endpoint renders MD→HTML server-side via `marked`.
  const handleBriefClick = useCallback(async (brief) => {
    setSelectedBrief(brief)
    setBriefHtml('')
    setBriefLoading(true)
    try {
      const isScaffold = brief.source === 'scaffold' || (brief.project && brief.filename)
      let url
      if (isScaffold) {
        const project = encodeURIComponent(brief.project || '')
        const filename = encodeURIComponent(brief.filename || '')
        url = `/api/dashboard/file-content?project=${project}&filename=${filename}`
      } else {
        const slug = brief.slug || (brief.filename || '').replace('.md', '')
        url = `/api/dashboard/file-content?slug=${encodeURIComponent(slug)}`
      }
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setBriefHtml(data.content || '')
      } else {
        setBriefHtml('<p style="color:#94A3B8">Brief content not available.</p>')
      }
    } catch {
      setBriefHtml('<p style="color:#94A3B8">Failed to load brief.</p>')
    }
    setBriefLoading(false)
  }, [])

  const closeBriefViewer = useCallback(() => {
    setSelectedBrief(null)
    setBriefHtml('')
  }, [])

  // Instant task maker
  const handleTaskSubmit = useCallback(async () => {
    const text = taskInput.trim()
    if (!text || taskSubmitting) return

    setTaskSubmitting(true)
    try {
      const userId = currentUser?.id || null
      const userName = currentUser?.user_metadata?.full_name || null
      const projectSlug = (activeProject && activeProject !== 'all') ? activeProject : null
      const result = await createTaskWithRex(text, userId, userName, {
        projectSlug,
        clientId: worldId || 'aom',
      })
      setTaskInput('')
      if (result.task) {
        if (addOptimisticTask) addOptimisticTask(result.task)
      } else {
        if (refreshTasks) refreshTasks()
      }
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to create task')
    } finally {
      setTaskSubmitting(false)
    }
  }, [taskInput, taskSubmitting, currentUser, addOptimisticTask, refreshTasks, showToast, activeProject, worldId])

  const handleTaskInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTaskSubmit()
    }
  }, [handleTaskSubmit])

  const toggleVoiceRecording = useCallback(async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      micStreamRef.current = stream
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        console.log('[voice-task] Captured audio blob:', blob, 'size:', blob.size, 'bytes')
        micStreamRef.current?.getTracks().forEach(t => t.stop())
        micStreamRef.current = null
        setIsRecording(false)
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('[voice-task] Mic access error:', err)
    }
  }, [isRecording])

  // Load project definitions from Supabase
  useEffect(() => {
    if (!supabase) return
    supabase.from('projects').select('name,slug').eq('is_active', true).eq('client_id', worldId).order('name')
      .then(({ data }) => {
        if (data) setProjectDefs(data.map(p => ({ name: p.name, slug: p.slug })))
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ───────────────────────────────────────────────────────
  const active = [...(rightNow || []), ...(queued || [])]
  const completed = done || []
  const waitingTasks = waiting || []

  // Foreman grouping: missions that have an active foreman task driving them.
  // Tasks whose metadata.mission_slug matches are treated as children of that foreman.
  const activeForemanMissions = useMemo(() => {
    const s = new Set()
    for (const t of active) {
      if (t.metadata?.is_foreman && t.metadata?.mission) s.add(t.metadata.mission)
    }
    return s
  }, [active])

  const getTaskProject = useCallback((task) => {
    const projectPath = task?.project_path || task?.projectPath || ''
    const normalizedPath = String(projectPath || '').toLowerCase()
    const projectSlug = task?.project_slug || task?.projectSlug || (normalizedPath ? normalizedPath.split('/').filter(Boolean).pop() : '')
    return taskProjects.find((project) => {
      const slug = String(project?.slug || '').toLowerCase()
      const name = String(project?.name || '').toLowerCase()
      return (projectSlug && slug === String(projectSlug).toLowerCase())
        || (normalizedPath && slug && normalizedPath.endsWith(`/${slug}`))
        || (normalizedPath && name && normalizedPath.includes(name))
    }) || null
  }, [taskProjects])

  const projectPills = [{ name: 'All', slug: 'all' }, ...projectDefs]
  const slugToName = useMemo(() => Object.fromEntries(projectDefs.map(p => [p.slug, p.name])), [projectDefs])

  const filterTasks = useCallback((tasks) => {
    return tasks.filter(t => {
      const title = (t.title || t.text || '').toLowerCase()
      const matchQ = !searchQuery || title.includes(searchQuery.toLowerCase())
      if (activeProject === 'all') return matchQ
      const taskProject = (t.project || '').toLowerCase()
      return matchQ && taskProject === activeProject
    })
  }, [searchQuery, activeProject])

  const filteredActive = filterTasks(active.filter(t => {
    if (t.metadata?.is_foreman) return false
    const ms = t.metadata?.mission_slug
    return !(ms && activeForemanMissions.has(ms))
  }))
  const isDismissed = t => t.metadata?.dismissed === true
  const filteredFailed = filterTasks(completed.filter(t => t.status === 'failed' && !isDismissed(t)))
  const filteredBlocked = filterTasks(completed.filter(t => t.status === 'blocked' && !isDismissed(t)))
  const filteredCompleted = filterTasks(completed.filter(t => t.status !== 'failed' && t.status !== 'blocked' && !isDismissed(t)))

  // Weekly bar chart counts
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - daysFromMon)

  const dailyCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const t of completed) {
    const ts = t.completed_at || t.updated_at || t.created_at
    if (!ts) continue
    const date = new Date(ts)
    if (date >= weekStart) {
      const d = date.getDay()
      const idx = d === 0 ? 6 : d - 1
      dailyCounts[idx]++
    }
  }
  const maxDailyCount = Math.max(...dailyCounts, 1)
  const weekTotal = dailyCounts.reduce((s, c) => s + c, 0)

  const weekCompleted = completed.filter(t => {
    const ts = t.completed_at || t.updated_at || t.created_at
    if (!ts) return false
    return new Date(ts) >= weekStart
  })
  // R48 (2026-04-22): retire the QA-score concept on this card — most tasks
  // never carried a qa_score so avgQA/passRate-from-QA read '--' forever.
  // Swap to pass-rate derived from status (done vs done+failed), and replace
  // the "QAd" slot with "Days active" — count of weekdays that saw activity.
  const weekDone = weekCompleted.filter(t => t.status === 'done').length
  const weekFailed = weekCompleted.filter(t => t.status === 'failed').length
  const closedCount = weekDone + weekFailed
  const passRate = closedCount > 0 ? Math.round((weekDone / closedCount) * 100) : null
  const daysActive = dailyCounts.filter(n => n > 0).length

  // ── Context-menu handlers (cross-cutting callbacks) ────────────────────
  const currentTaskClientId = worldId || getClientId() || 'aom'

  const handleTaskFollowUp = useCallback((task) => {
    if (!task) return
    const label = snippetOfTitle(task.title || task.id, 80)
    const text = `Re: task "${label}" (${task.id})\n\n`
    if (typeof setPrefillMessage === 'function') setPrefillMessage(text)
    if (typeof setActiveTab === 'function') setActiveTab('chat')
    showCtxToast('Opening chat with task reference…')
  }, [setPrefillMessage, setActiveTab, showCtxToast])

  const handleTaskNeedsVerification = useCallback(async (task) => {
    if (!task) return
    setTaskVerifyIds(prev => { const next = new Set(prev); next.add(task.id); return next })
    try {
 const body = `Verify task "${task.title || task.id}" output.\n\nParent task id: ${task.id}\nProject: ${task.project || '·'}\n\nRead the parent's completion payload and confirm it matches expectations.`
      const row = {
        title: `Verify: ${snippetOfTitle(task.title || task.id)}`,
        text: body,
        description: body,
        status: 'queued',
        source: 'corner-dashboard-task',
        client_id: currentTaskClientId,
        created_by: currentUser?.id || null,
        project: task.project || null,
        metadata: {
          parent_task_id: task.id,
          kind: 'verify',
          created_via: 'context-menu',
          model: 'sonnet',
        },
      }
      await supabase.from('tasks').insert(row)
      showCtxToast('Verify sub-task queued')
      if (typeof refreshTasks === 'function') refreshTasks()
    } catch (err) {
      console.error('[TasksPanel] verify error:', err)
      showCtxToast('Could not queue verify sub-task')
    }
  }, [currentTaskClientId, currentUser, refreshTasks, showCtxToast])

  const handleTaskResearch = useCallback(async (task) => {
    if (!task) return
    try {
 const body = `Research follow-up for task "${task.title || task.id}".\n\nParent task id: ${task.id}\nProject: ${task.project || '·'}\n\nWrite a brief in docs/briefs/ and attach it to the ${task.project || 'relevant'} project's Files section.`
      const row = {
        title: `Research: ${snippetOfTitle(task.title || task.id)}`,
        text: body,
        description: body,
        status: 'queued',
        source: 'corner-dashboard-task',
        client_id: currentTaskClientId,
        created_by: currentUser?.id || null,
        project: task.project || null,
        metadata: {
          parent_task_id: task.id,
          kind: 'research',
          created_via: 'context-menu',
          model: 'sonnet',
        },
      }
      await supabase.from('tasks').insert(row)
      showCtxToast('Research sub-task queued')
      if (typeof refreshTasks === 'function') refreshTasks()
    } catch (err) {
      console.error('[TasksPanel] research error:', err)
      showCtxToast('Could not queue research sub-task')
    }
  }, [currentTaskClientId, currentUser, refreshTasks, showCtxToast])

  const handleCreateProject = useCallback(async () => {
    const name = projectName.trim()
    if (!name || createProjectSubmitting) return
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const clientId = worldId || getClientId() || 'aom'
    setCreateProjectSubmitting(true)
    setCreateProjectError(null)
    try {
      const { error } = await supabase
        .from('projects')
        .insert({ name, slug, color: selectedColor, is_active: true, client_id: clientId })
      if (error) throw new Error(error.message || 'Failed to create project')
      // R30 — fire the scaffold endpoint so VISION/RESEARCH/BUILD/CONTEXT/
      // last-conversation + research/README stubs land in text_files for this
      // project. Best-effort: if the endpoint fails the project row still
      // exists and the scaffold can be re-run later.
      authFetch('/api/dashboard/scaffold-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, description: '', tenant: clientId }),
      }).catch(() => {})
      setProjectDefs(prev => [...prev, { name, slug }].sort((a, b) => a.name.localeCompare(b.name)))
      setActiveProject(slug)
      setShowCreateProjectModal(false)
      setProjectName('')
      setSelectedColor('#10B981')
      setCreateProjectError(null)
    } catch (err) {
      setCreateProjectError(err.message || 'Failed to create project')
    } finally {
      setCreateProjectSubmitting(false)
    }
  }, [projectName, selectedColor, worldId, createProjectSubmitting])

  const handleTaskMoveTo = useCallback(async (task, target) => {
    if (!task || !target?.slug) return
    const fromSlug = task.project || null
    if (fromSlug && String(fromSlug).toLowerCase() === String(target.slug).toLowerCase()) return
    try {
      const existingMeta = (task.metadata && typeof task.metadata === 'object') ? task.metadata : {}
      const history = Array.isArray(existingMeta.move_history) ? existingMeta.move_history : []
      const nextMeta = {
        ...existingMeta,
        move_history: [
          ...history,
          { from: fromSlug, to: target.slug, at: new Date().toISOString(), by: currentUser?.id || null },
        ],
      }
      await supabase
        .from('tasks')
        .update({ project: target.slug, metadata: nextMeta })
        .eq('id', task.id)
      showCtxToast(`Moved to ${target.name || target.slug}`)
      if (typeof refreshTasks === 'function') refreshTasks()
    } catch (err) {
      console.error('[TasksPanel] move error:', err)
      showCtxToast('Could not move task')
    }
  }, [currentUser, refreshTasks, showCtxToast])

  const handleRequeueFailedTask = useCallback((task) => {
    const prompt = typeof task?.result === 'string' ? task.result.trim() : ''
    const project = getTaskProject(task)
    if (!project || !prompt) {
      if (showToast) showToast('No linked project or prompt found for this failed task.')
      return
    }
    setPrefillMessage(prompt)
    setActiveConversation(project)
    setActiveTab('chat')
  }, [getTaskProject, showToast, setPrefillMessage, setActiveConversation, setActiveTab])

  // R5b: one-click retry for failed tasks. POSTs to /api/dashboard/retry-task
  // which inserts a NEW queued row inheriting title/body/model/project/agent
  // from the failed row and links back via metadata.parent_id.
  const [retryingTaskIds, setRetryingTaskIds] = useState(() => new Set())
  const handleRetryFailedTask = useCallback(async (task) => {
    if (!task?.id) return
    setRetryingTaskIds(prev => { const next = new Set(prev); next.add(task.id); return next })
    try {
      // authFetch, not fetch: retry-task gates on verifyTenant against the
      // OWNING world of the failed row, so the request must carry the session
      // JWT. Any member of that world (not just the super-admin) passes.
      const resp = await authFetch('/api/dashboard/retry-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || data.error) throw new Error(data.error || `Retry failed (${resp.status})`)
      if (showToast) showToast('Task re-queued')
      if (typeof refreshTasks === 'function') refreshTasks()
    } catch (err) {
      console.error('[TasksPanel] retry error:', err)
      if (showToast) showToast(err?.message || 'Could not retry task')
    } finally {
      setRetryingTaskIds(prev => { const next = new Set(prev); next.delete(task.id); return next })
    }
  }, [refreshTasks, showToast])

  const handleForemanResume = useCallback(async (task) => {
    try {
      const resp = await authFetch('/api/dashboard/foreman-pause', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, missionSlug: task.metadata?.mission }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || data.error) throw new Error(data.error || `Resume failed (${resp.status})`)
      if (showToast) showToast('Foreman restarted')
      if (typeof refreshTasks === 'function') refreshTasks()
    } catch (err) {
      console.error('[TasksPanel] foreman resume error:', err)
      if (showToast) showToast(err?.message || 'Could not restart foreman')
    }
  }, [refreshTasks, showToast])

  const closeCreateProjectModal = useCallback(() => {
    setShowCreateProjectModal(false)
    setProjectName('')
    setSelectedColor('#10B981')
    setCreateProjectError(null)
  }, [])

  const toggleCreateProjectModal = useCallback(() => {
    setShowCreateProjectModal(prev => {
      if (!prev) { setProjectName(''); setSelectedColor('#10B981') }
      return !prev
    })
  }, [])

  // R49 (2026-04-23 session 18): conversational project creation. Clicking
  // "+ project" drops the user into the EA chat with a recipe prompt
  // instead of opening the name/color modal. The EA asks what the project
  // is, what the first thing to build is, and who's on it — one question
  // at a time — then fires project creation via the existing task path
  // (server endpoint /api/dashboard/create-project-task). The R24 modal
  // stays as a fallback for power users; this handler is the default.
  const startConversationalProjectCreation = useCallback(() => {
    const recipe = [
      '/new-project',
      '',
      'Let\'s start a new project together. Ask me one question at a time:',
 '1. What\'s this project about, a sentence is fine.',
      '2. What\'s the first concrete thing we should build or learn?',
      '3. Who\'s involved?',
      '',
      'When you have enough, create the project as a task so it shows up with its own scaffold.',
    ].join('\n')
    if (typeof setPrefillMessage === 'function') setPrefillMessage(recipe)
    if (typeof setActiveTab === 'function') setActiveTab('chat')
    if (typeof showCtxToast === 'function') showCtxToast('Starting a new-project recipe with your EA…')
  }, [setPrefillMessage, setActiveTab, showCtxToast])

  return {
    // Cross-cutting passthroughs (from CornerV3, surfaced for subcomponents)
    worldId,
    currentUser,
    refreshTasks,
    addOptimisticTask,
    showToast,
    setActiveTab,
    setActiveConversation,
    setPrefillMessage,

    // Search + filter
    searchQuery, setSearchQuery,
    searchFocused, setSearchFocused,
    activeProject, setActiveProject,

    // Projects data
    projectDefs,
    projectPills,
    slugToName,
    taskProjects,
    getTaskProject,

    // Create project modal + R49 recipe flow
    showCreateProjectModal,
    startConversationalProjectCreation,
    projectName, setProjectName,
    selectedColor, setSelectedColor,
    createProjectSubmitting,
    createProjectError,
    handleCreateProject,
    closeCreateProjectModal,
    toggleCreateProjectModal,

    // Task lists (raw + filtered)
    active,
    completed,
    waitingTasks,
    filteredActive,
    filteredFailed,
    filteredBlocked,
    filteredCompleted,

    // Card lifecycle
    shippedLimit, setShippedLimit,
    expandedTask, toggleTaskExpand,
    taskThread, threadLoading,
    insightsOpen, insightsData, insightsLoading, insightsError,
    toggleInsights,
    taskVerifyIds,

    // Context menu
    taskMenu, setTaskMenu,
    openTaskMenu,
    startTaskLongPress,
    cancelTaskLongPress,
    handleTaskFollowUp,
    handleTaskNeedsVerification,
    handleTaskResearch,
    handleTaskMoveTo,
    handleRequeueFailedTask,
    handleRetryFailedTask,
    retryingTaskIds,
    activeForemanMissions,
    handleForemanResume,

    // Ctx toast
    ctxToast,
    showCtxToast,

    // Waiting tasks replies
    waitingReply, setWaitingReply,
    waitingReplySending, setWaitingReplySending,

    // Files sections
    taskIsMobile,
    taskFilesOpen, setTaskFilesOpen,
    taskBriefs,
    taskAttachments,
    taskFilesLoading,
    allBriefs,
    allBriefsLoading,
    allBriefsOpen, setAllBriefsOpen,
    allBriefsLimit, setAllBriefsLimit,

    // Missions section (R39-3) + mini Command Center (R39-4)
    taskMissions,
    taskMissionsOpen, setTaskMissionsOpen,
    taskMissionsLoading,
    activeMissionPath, setActiveMissionPath,
    drawerScope,

    // Brief viewer
    selectedBrief,
    briefHtml,
    briefLoading,
    handleBriefClick,
    closeBriefViewer,

    // Project summary card
    summaryEvent,
    summaryJustUpdated,
    summaryNowTick,

    // Weekly stats
    dailyCounts,
    maxDailyCount,
    dayOfWeek,
    weekTotal,
    passRate,
    daysActive,
    closedCount,

    // Task input + voice
    taskInput, setTaskInput,
    taskInputFocused, setTaskInputFocused,
    taskSubmitting,
    taskInputRef,
    isRecording,
    toggleVoiceRecording,
    handleTaskSubmit,
    handleTaskInputKeyDown,

    // R14e-4: viewing user's slug inside this tenant + their personal todos
    currentUserSlug,
    personalTodos: personalTodos || [],
  }
}