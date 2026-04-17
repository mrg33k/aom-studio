// TasksPanel -- task queue shell: state + orchestration. Section UI lives in ./tasks/*
// pipeline-test 2026-04-12 safe_push verification -- do not remove
//
// R2a (Apr 16, 2026): TasksPanel was 2774 LOC. Split into shell + ./tasks/ subcomponents.
// State and ctx props still flow exactly the same way -- this was a mechanical split,
// not a state-management rewrite (that's R3).
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { C } from '../../lib/cv3Colors.js'
import { supabase } from '../../lib/supabase.js'
import { createTaskWithRex } from '../../lib/rexTaskClient.js'
import { useProjects } from '../../hooks/useProjects'
import { TaskContextMenu } from './ContextMenu.jsx'
import { getClientId } from '../../lib/clientConfig.js'

import { AllFilesSection, ProjectFilesSection } from './tasks/FilesSection.jsx'
import ProjectBriefingCard from './tasks/ProjectBriefingCard.jsx'
import ActiveTasksSection from './tasks/ActiveTasksSection.jsx'
import WaitingTasksSection from './tasks/WaitingTasksSection.jsx'
import FailedTasksSection from './tasks/FailedTasksSection.jsx'
import DoneTasksSection from './tasks/DoneTasksSection.jsx'
import WeeklyStatsCard from './tasks/WeeklyStatsCard.jsx'
import TaskInputBar from './tasks/TaskInputBar.jsx'
import CreateProjectModal from './tasks/CreateProjectModal.jsx'

export default function TasksPanel({ queued, rightNow, waiting, done, worldId, refreshTasks, addOptimisticTask, showToast, currentUser, setActiveTab, setActiveConversation, setPrefillMessage }) {
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeProject, setActiveProject] = useState('all')
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [projectName,            setProjectName]            = useState('')
  const [selectedColor,          setSelectedColor]          = useState('#10B981')
  const [shippedLimit,           setShippedLimit]           = useState(50)
  const [projectDefs,            setProjectDefs]             = useState([])  // [{name, slug}]
  const [taskInput,              setTaskInput]              = useState('')
  const [taskInputFocused,       setTaskInputFocused]       = useState(false)
  const [taskSubmitting,         setTaskSubmitting]         = useState(false)
  const [expandedTask,           setExpandedTask]           = useState(null)
  const [taskThread,             setTaskThread]             = useState([])
  const [threadLoading,          setThreadLoading]          = useState(false)
  const [insightsOpen,           setInsightsOpen]           = useState({})
  const [insightsData,           setInsightsData]           = useState({})
  const [insightsLoading,        setInsightsLoading]        = useState({})
  const [insightsError,          setInsightsError]          = useState({})
  const taskInputRef = useRef(null)
  // Right-click context-menu state for tasks
  const [taskMenu, setTaskMenu] = useState(null) // { x, y, task }
  const [taskVerifyIds, setTaskVerifyIds] = useState(() => new Set())
  const [ctxToast, setCtxToast] = useState(null)
  const showCtxToast = useCallback((text) => {
    setCtxToast({ text, at: Date.now() })
    setTimeout(() => setCtxToast(null), 2400)
  }, [])
  const openTaskMenu = (e, task) => {
    e.preventDefault()
    e.stopPropagation()
    setTaskMenu({ x: e.clientX, y: e.clientY, task })
  }
  const taskLongPressRef = useRef(null)
  const startTaskLongPress = (e, task) => {
    if (!e.touches?.length) return
    const t = e.touches[0]
    const x = t.clientX, y = t.clientY
    taskLongPressRef.current = setTimeout(() => setTaskMenu({ x, y, task }), 600)
  }
  const cancelTaskLongPress = () => {
    if (taskLongPressRef.current) clearTimeout(taskLongPressRef.current)
    taskLongPressRef.current = null
  }
  const [isRecording,  setIsRecording]  = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null) // eslint-disable-line no-unused-vars
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const micStreamRef     = useRef(null)

  // Files section state
  const [taskFilesOpen, setTaskFilesOpen] = useState(false)
  const [taskBriefs, setTaskBriefs] = useState([])
  const [taskAttachments, setTaskAttachments] = useState([])
  const [taskFilesLoading, setTaskFilesLoading] = useState(false)
  const [taskIsMobile, setTaskIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  // Global Files section state (all projects view)
  const [allBriefs, setAllBriefs] = useState([])
  const [allBriefsLoading, setAllBriefsLoading] = useState(false)
  const [allBriefsOpen, setAllBriefsOpen] = useState(true)
  const [allBriefsLimit, setAllBriefsLimit] = useState(25)

  // Inline brief viewer state
  const [selectedBrief, setSelectedBrief] = useState(null)
  const [briefHtml, setBriefHtml] = useState('')
  const [briefLoading, setBriefLoading] = useState(false)

  // R2: live project summary card driven by project-summary-daemon events
  // Reads the latest row from the shared `events` table where
  // event_type='project_summary' and agent=<slug>. Polls every 4s while a
  // project pill is selected. Flashes on change.
  const [summaryEvent, setSummaryEvent] = useState(null)
  const [summaryJustUpdated, setSummaryJustUpdated] = useState(false)
  const [summaryNowTick, setSummaryNowTick] = useState(0)

  // Reply input state for waiting tasks (kept here so state survives waiting list re-renders)
  const [waitingReply, setWaitingReply] = useState({})
  const [waitingReplySending, setWaitingReplySending] = useState({})

  // Fetch task thread messages when a task is expanded
  const toggleTaskExpand = useCallback(async (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null)
      setTaskThread([])
      return
    }
    setExpandedTask(taskId)
    setThreadLoading(true)
    try {
      const { data } = await supabase
        .from('messages')
        .select('text,timestamp,role,source')
        .eq('agent', `task:${taskId}`)
        .order('timestamp', { ascending: true })
        .limit(30)
      setTaskThread(data || [])
    } catch { setTaskThread([]) }
    setThreadLoading(false)
  }, [expandedTask])

  // Fetch per-task failure insights (QA notes, error, failure-related pipeline events)
  const toggleInsights = useCallback(async (taskId) => {
    const alreadyOpen = !!insightsOpen[taskId]
    if (alreadyOpen) {
      setInsightsOpen(prev => ({ ...prev, [taskId]: false }))
      return
    }
    setInsightsOpen(prev => ({ ...prev, [taskId]: true }))

    // Already loaded -- show cached
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
    fetch('/api/dashboard/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'startRunner' }),
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // R2: poll the latest project_summary event when a project pill is active.
  // The daemon writes new rows on debounce, so polling every 4s picks them up
  // within one beat. We flash the card when the timestamp advances.
  useEffect(() => {
    if (!activeProject || activeProject === 'all') {
      setSummaryEvent(null)
      setSummaryJustUpdated(false)
      return
    }
    let cancelled = false
    let lastSeenTs = null

    // R6 hotfix: events table has RLS on, anon key can't SELECT. Reading
    // the latest project_summary row through a server-side endpoint that
    // uses the service role key instead of a direct supabase-js query.
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
    const iv = window.setInterval(fetchLatest, 4000)
    return () => { cancelled = true; window.clearInterval(iv) }
  }, [activeProject])

  // Drive the "updated Ns ago" label without re-fetching
  useEffect(() => {
    if (!summaryEvent) return
    const iv = window.setInterval(() => setSummaryNowTick(t => t + 1), 1000)
    return () => window.clearInterval(iv)
  }, [summaryEvent])

  // Mobile breakpoint watcher for the Files section
  useEffect(() => {
    const handleResize = () => setTaskIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load project files when active project changes
  useEffect(() => {
    if (!activeProject || activeProject === 'all') {
      setTaskBriefs([])
      setTaskAttachments([])
      setTaskFilesOpen(false)
      return
    }
    let cancelled = false
    setTaskFilesLoading(true)
    Promise.all([
      fetch(`/api/dashboard/files?type=text&client=${encodeURIComponent(activeProject)}`).then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] })),
      fetch(`/api/dashboard/files?type=images&prefix=${encodeURIComponent(activeProject)}/`).then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] })),
      fetch(`/api/dashboard/files?type=briefs&project=${encodeURIComponent(activeProject)}`).then(r => r.ok ? r.json() : { briefs: [] }).catch(() => ({ briefs: [] })),
    ]).then(([textData, imgData, briefsData]) => {
      if (cancelled) return
      const textFiles = textData.files || []
      const textBriefs = textFiles.filter(f => String(f.filename || f.name || '').endsWith('.md'))
      const textAttachments = textFiles.filter(f => !String(f.filename || f.name || '').endsWith('.md'))
      const images = (imgData.files || []).map(f => ({ ...f, filename: f.name }))
      const indexBriefs = briefsData.briefs || []
      const seenSlugs = new Set(indexBriefs.map(b => b.slug).filter(Boolean))
      const mergedBriefs = [...indexBriefs, ...textBriefs.filter(b => !seenSlugs.has(b.slug))]
      setTaskBriefs(mergedBriefs)
      setTaskAttachments([...textAttachments, ...images])
      const hasAny = mergedBriefs.length > 0 || textAttachments.length > 0 || images.length > 0
      setTaskFilesOpen(hasAny)
    }).catch(() => {
      if (!cancelled) { setTaskBriefs([]); setTaskAttachments([]); setTaskFilesOpen(false) }
    }).finally(() => { if (!cancelled) setTaskFilesLoading(false) })
    return () => { cancelled = true }
  }, [activeProject])

  // Load all briefs for the global Files section (activeProject === 'all')
  useEffect(() => {
    if (activeProject !== 'all') return
    let cancelled = false
    setAllBriefsLoading(true)
    fetch('/api/dashboard/files?type=briefs&project=all')
      .then(r => r.ok ? r.json() : { briefs: [] })
      .catch(() => ({ briefs: [] }))
      .then(data => {
        if (!cancelled) {
          setAllBriefs(data.briefs || [])
          setAllBriefsLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [activeProject])

  // Open brief inline viewer
  const handleBriefClick = useCallback(async (brief) => {
    const slug = brief.slug || (brief.filename || '').replace('.md', '')
    setSelectedBrief(brief)
    setBriefHtml('')
    setBriefLoading(true)
    try {
      const res = await fetch(`/api/dashboard/file-content?slug=${encodeURIComponent(slug)}`)
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

  // Instant task maker: submit handler
  const handleTaskSubmit = useCallback(async () => {
    const text = taskInput.trim()
    if (!text || taskSubmitting) return

    setTaskSubmitting(true)
    try {
      const userId   = currentUser?.id || null
      const userName = currentUser?.user_metadata?.full_name || null
      // R5: pass the active project pill (if any) so the task gets the
      // right project + repo_path without Haiku guessing.
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
  }, [taskInput, taskSubmitting, currentUser, addOptimisticTask, refreshTasks, showToast])

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

  // Load project definitions from Supabase on mount
  useEffect(() => {
    if (!supabase) return
    supabase.from('projects').select('name,slug').eq('is_active', true).eq('client_id', worldId).order('name')
      .then(({ data }) => {
        if (data) setProjectDefs(data.map(p => ({ name: p.name, slug: p.slug })))
      })
  }, [])

  const active    = [...(rightNow || []), ...(queued || [])]
  const completed = done || []
  const waitingTasks = waiting || []

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

  // Project pills from Supabase projects table -- [{name, slug}] with 'all' sentinel
  const projectPills = [{ name: 'All', slug: 'all' }, ...projectDefs]
  // Slug-to-name map for display in summary header etc.
  const slugToName = useMemo(() => Object.fromEntries(projectDefs.map(p => [p.slug, p.name])), [projectDefs])

  // Filter helper -- matches on the task's project field (slug), not title text
  function filterTasks(tasks) {
    return tasks.filter(t => {
      const title  = (t.title || t.text || '').toLowerCase()
      const matchQ = !searchQuery || title.includes(searchQuery.toLowerCase())
      if (activeProject === 'all') return matchQ
      const taskProject = (t.project || '').toLowerCase()
      return matchQ && taskProject === activeProject
    })
  }

  const filteredActive    = filterTasks(active)
  const isDismissed       = t => t.metadata?.dismissed === true
  const filteredFailed    = filterTasks(completed.filter(t => t.status === 'failed' && !isDismissed(t)))
  const filteredCompleted = filterTasks(completed.filter(t => t.status !== 'failed' && !isDismissed(t)))

  // Per-day task counts for M-S bar chart
  const now         = new Date()
  const dayOfWeek   = now.getDay()
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart   = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - daysFromMon)

  const dailyCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const t of completed) {
    const ts = t.completed_at || t.updated_at || t.created_at
    if (!ts) continue
    const date = new Date(ts)
    if (date >= weekStart) {
      const d   = date.getDay()
      const idx = d === 0 ? 6 : d - 1
      dailyCounts[idx]++
    }
  }
  const maxDailyCount = Math.max(...dailyCounts, 1)
  const weekTotal     = dailyCounts.reduce((s, c) => s + c, 0)

  // Weekly stats derived from completed tasks
  const weekCompleted = completed.filter(t => {
    const ts = t.completed_at || t.updated_at || t.created_at
    if (!ts) return false
    return new Date(ts) >= weekStart
  })
  const withQA    = weekCompleted.filter(t => t.qa_score || t.qaScore)
  const avgQA     = withQA.length > 0
    ? (withQA.reduce((s, t) => s + Number(t.qa_score || t.qaScore || 0), 0) / withQA.length).toFixed(1)
    : null
  const passCount = withQA.filter(t => Number(t.qa_score || t.qaScore || 0) >= 8).length
  // Denominator = ALL completed this week. Tasks without QA score = unknown, not pass.
  const passRate  = weekCompleted.length > 0 ? Math.round((passCount / weekCompleted.length) * 100) : null
  const qaRatio   = `${withQA.length}/${weekCompleted.length}`

  // Time-based greeting
  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'

  // Right-click context-menu action handlers
  const snippetOfTitle = (s, n = 90) => {
    const t = String(s || '').replace(/\s+/g, ' ').trim()
    return t.length > n ? t.slice(0, n - 1) + '…' : t
  }
  const currentTaskClientId = worldId || getClientId() || 'aom'

  // TASKS: Follow-up → switch to chat with prefill referencing this task
  const handleTaskFollowUp = useCallback((task) => {
    if (!task) return
    const label = snippetOfTitle(task.title || task.id, 80)
    const text = `Re: task "${label}" (${task.id})\n\n`
    if (typeof setPrefillMessage === 'function') setPrefillMessage(text)
    if (typeof setActiveTab === 'function') setActiveTab('chat')
    showCtxToast('Opening chat with task reference…')
  }, [setPrefillMessage, setActiveTab, showCtxToast])

  // TASKS: Needs verification → create verify sub-task linked via metadata.parent_task_id
  const handleTaskNeedsVerification = useCallback(async (task) => {
    if (!task) return
    setTaskVerifyIds(prev => { const next = new Set(prev); next.add(task.id); return next })
    try {
      const body = `Verify task "${task.title || task.id}" output.\n\nParent task id: ${task.id}\nProject: ${task.project || '—'}\n\nRead the parent's completion payload and confirm it matches expectations.`
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

  // TASKS: Research → spawn research sub-task
  const handleTaskResearch = useCallback(async (task) => {
    if (!task) return
    try {
      const body = `Research follow-up for task "${task.title || task.id}".\n\nParent task id: ${task.id}\nProject: ${task.project || '—'}\n\nWrite a brief in docs/briefs/ and attach it to the ${task.project || 'relevant'} project's Files section.`
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

  // TASKS: Move to (project) → update tasks.project + push metadata.move_history entry
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

      {/* Keyframes for animated progress bars */}
      <style>{`
        @keyframes cv3-progress-sweep {
          0%   { width: 25% }
          50%  { width: 72% }
          100% { width: 25% }
        }
        @keyframes bld {
          0%   { width: 5% }
          50%  { width: 60% }
          100% { width: 90% }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes rec-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5) } 60% { box-shadow: 0 0 0 8px rgba(239,68,68,0) } }
        @keyframes rec-dot { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes cv3-summary-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); border-color: rgba(16,185,129,0.55) }
          70%  { box-shadow: 0 0 0 12px rgba(16,185,129,0) }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0) }
        }
        @keyframes cv3-summary-dot {
          0%, 100% { opacity: 0.35; transform: scale(1) }
          50%      { opacity: 1;    transform: scale(1.4) }
        }
        .briefing-summary-body {
          font-family: 'Inter', sans-serif;
          word-break: break-word;
        }
        .briefing-summary-body p {
          margin: 0 0 8px 0;
          line-height: 1.65;
        }
        .briefing-summary-body p:last-child { margin-bottom: 0; }
        .briefing-summary-body strong { font-weight: 700; color: #F1F5F9; }
        .briefing-summary-body em { font-style: italic; color: #94A3B8; }
        .briefing-summary-body ul, .briefing-summary-body ol {
          margin: 6px 0 10px 0;
          padding-left: 18px;
        }
        .briefing-summary-body li {
          margin-bottom: 4px;
          line-height: 1.55;
        }
        .briefing-summary-body h1, .briefing-summary-body h2,
        .briefing-summary-body h3, .briefing-summary-body h4 {
          font-weight: 700;
          color: #F1F5F9;
          margin: 12px 0 6px 0;
          line-height: 1.3;
        }
        .briefing-summary-body h1 { font-size: 15px; }
        .briefing-summary-body h2 { font-size: 14px; }
        .briefing-summary-body h3 { font-size: 13px; }
        .briefing-summary-body a {
          color: #60a5fa;
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-color: rgba(96,165,250,0.3);
        }
        .briefing-summary-body code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85em;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          padding: 1px 5px;
        }
        .briefing-summary-body hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin: 12px 0;
        }
        .briefing-summary-body blockquote {
          border-left: 3px solid rgba(255,255,255,0.15);
          margin: 8px 0;
          padding: 4px 12px;
          color: #94A3B8;
        }
        @keyframes rn-glow {
          0%, 100% { opacity: 0.4 }
          50%      { opacity: 1 }
        }
      `}</style>

      {/* ── Inline brief viewer overlay ─────────────────────────── */}
      {selectedBrief && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: C.bg,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 20px 14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            <button
              onClick={() => { setSelectedBrief(null); setBriefHtml('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                minWidth: 44, minHeight: 44,
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.muted, padding: '0 8px', borderRadius: 8,
                fontFamily: "'Inter', sans-serif", fontSize: 13,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedBrief.title || selectedBrief.filename || 'Brief'}
              </div>
              {(selectedBrief.agent || selectedBrief.dateFormatted || selectedBrief.date) && (
                <div style={{ fontSize: 11, color: C.dim, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                  {[selectedBrief.agent, selectedBrief.dateFormatted || selectedBrief.date].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
          {/* Content */}
          <div style={{ flex: 1, padding: '20px 20px 40px', maxWidth: 720, width: '100%', boxSizing: 'border-box' }}>
            {briefLoading ? (
              <div style={{ color: C.dim, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Loading…</div>
            ) : (
              <div
                className="briefing-summary-body"
                style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: briefHtml }}
              />
            )}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 24px' }}>

        {/* ── Greeting header ─────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: C.text,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: 0,
          }}>
            {greeting}<span style={{ color: C.accent }}>.</span>
          </h1>
          <p style={{
            fontSize: 14,
            fontWeight: 500,
            color: C.muted,
            margin: '6px 0 0',
            lineHeight: 1.4,
          }}>
            {filteredActive.length > 0
              ? `${filteredActive.length} task${filteredActive.length !== 1 ? 's' : ''} in motion`
              : 'All clear'}
            {waitingTasks.length > 0 ? ` · ${waitingTasks.length} need${waitingTasks.length !== 1 ? '' : 's'} input` : ''}
            {filteredCompleted.length > 0 ? ` · ${filteredCompleted.length} done` : ''}
          </p>
        </div>

        {/* ── Search + Project filters ────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          {/* Search input — minimal */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid ' + (searchFocused ? 'rgba(255,255,255,0.1)' : 'transparent'),
            borderRadius: 14,
            padding: '10px 16px',
            transition: 'border-color 0.2s, background 0.2s',
            marginBottom: 12,
          }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
              stroke={C.dim} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: C.text,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                  fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                }}
              >×</button>
            )}
          </div>

          {/* Project filter pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {projectPills.map(p => {
              const isActive = activeProject === p.slug
              return (
                <button
                  key={p.slug}
                  onClick={() => setActiveProject(p.slug)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: isActive ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? C.accent : C.text2,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >{p.name}</button>
              )
            })}
            <button
              onClick={() => {
                if (!showCreateProjectModal) { setProjectName(''); setSelectedColor('#10B981'); }
                setShowCreateProjectModal(prev => !prev);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1,
                cursor: 'pointer',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                color: C.text2,
                fontFamily: "'Inter', sans-serif",
              }}
            >+</button>
          </div>
        </div>

        {/* Project briefing card — executive snapshot, not dev notes.
            Data: project-summary-daemon → events table → /api/dashboard/project-summary.
            Polls every 4s via useEffect above. */}
        {activeProject && activeProject !== 'all' && (
          <ProjectBriefingCard
            activeProject={activeProject}
            summaryEvent={summaryEvent}
            summaryJustUpdated={summaryJustUpdated}
            summaryNowTick={summaryNowTick}
            taskProjects={taskProjects}
            slugToName={slugToName}
          />
        )}

        {/* ── Files section ───────────────────────────────────── */}
        {activeProject && activeProject !== 'all' && (
          <ProjectFilesSection
            isMobile={taskIsMobile}
            isOpen={taskFilesOpen}
            onToggle={() => setTaskFilesOpen(prev => !prev)}
            briefs={taskBriefs}
            attachments={taskAttachments}
            loading={taskFilesLoading}
            onBriefClick={handleBriefClick}
          />
        )}

        {/* ── Files section (all-projects view) — top of task list, matches per-project spec */}
        {(!activeProject || activeProject === 'all') && !searchQuery && (
          <AllFilesSection
            briefs={allBriefs}
            loading={allBriefsLoading}
            isOpen={allBriefsOpen}
            onToggle={() => setAllBriefsOpen(prev => !prev)}
            limit={allBriefsLimit}
            onShowMore={() => setAllBriefsLimit(prev => prev + 25)}
            onBriefClick={handleBriefClick}
          />
        )}

        {/* ── RIGHT NOW — Hero section ─────────────────────────── */}
        <ActiveTasksSection
          filteredActive={filteredActive}
          expandedTask={expandedTask}
          toggleTaskExpand={toggleTaskExpand}
          openTaskMenu={openTaskMenu}
          startTaskLongPress={startTaskLongPress}
          cancelTaskLongPress={cancelTaskLongPress}
          taskVerifyIds={taskVerifyIds}
          taskProjects={taskProjects}
          taskThread={taskThread}
          threadLoading={threadLoading}
        />

        {/* ── This Week — Clean stats ─────────────────────────── */}
        <WeeklyStatsCard
          dailyCounts={dailyCounts}
          maxDailyCount={maxDailyCount}
          dayOfWeek={dayOfWeek}
          weekTotal={weekTotal}
          passRate={passRate}
          avgQA={avgQA}
          qaRatio={qaRatio}
        />

        {/* ── Needs Input ──────────────────────────────────────── */}
        <WaitingTasksSection
          waitingTasks={waitingTasks}
          waitingReply={waitingReply}
          setWaitingReply={setWaitingReply}
          waitingReplySending={waitingReplySending}
          setWaitingReplySending={setWaitingReplySending}
        />

        {/* ── Failed ──────────────────────────────────────────── */}
        <FailedTasksSection
          filteredFailed={filteredFailed}
          refreshTasks={refreshTasks}
          expandedTask={expandedTask}
          toggleTaskExpand={toggleTaskExpand}
          openTaskMenu={openTaskMenu}
          startTaskLongPress={startTaskLongPress}
          cancelTaskLongPress={cancelTaskLongPress}
          toggleInsights={toggleInsights}
          insightsOpen={insightsOpen}
          insightsLoading={insightsLoading}
          insightsError={insightsError}
          insightsData={insightsData}
          threadLoading={threadLoading}
          taskThread={taskThread}
          showToast={showToast}
          setPrefillMessage={setPrefillMessage}
          setActiveConversation={setActiveConversation}
          setActiveTab={setActiveTab}
          getTaskProject={getTaskProject}
        />

        {/* ── Done ────────────────────────────────────────────── */}
        <DoneTasksSection
          filteredCompleted={filteredCompleted}
          shippedLimit={shippedLimit}
          setShippedLimit={setShippedLimit}
          expandedTask={expandedTask}
          toggleTaskExpand={toggleTaskExpand}
          openTaskMenu={openTaskMenu}
          startTaskLongPress={startTaskLongPress}
          cancelTaskLongPress={cancelTaskLongPress}
          taskProjects={taskProjects}
          taskThread={taskThread}
          threadLoading={threadLoading}
        />

        {/* Empty state */}
        {filteredActive.length === 0 && filteredCompleted.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.muted, gap: 16, paddingTop: 80 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', marginBottom: 6 }}>
                {searchQuery || activeProject !== 'all' ? 'No matching tasks' : 'All clear'}
              </div>
              <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
                {searchQuery || activeProject !== 'all' ? 'Try a different search or filter' : 'Nothing on your plate right now'}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Task creation input bar */}
      <TaskInputBar
        taskInput={taskInput}
        setTaskInput={setTaskInput}
        taskInputFocused={taskInputFocused}
        setTaskInputFocused={setTaskInputFocused}
        taskSubmitting={taskSubmitting}
        taskInputRef={taskInputRef}
        isRecording={isRecording}
        toggleVoiceRecording={toggleVoiceRecording}
        handleTaskSubmit={handleTaskSubmit}
        handleTaskInputKeyDown={handleTaskInputKeyDown}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        show={showCreateProjectModal}
        onClose={() => { setShowCreateProjectModal(false); setProjectName(''); setSelectedColor('#10B981') }}
        projectName={projectName}
        setProjectName={setProjectName}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
      />

      {/* Right-click context menu for task cards */}
      <TaskContextMenu
        open={!!taskMenu}
        x={taskMenu?.x || 0}
        y={taskMenu?.y || 0}
        task={taskMenu?.task || null}
        projects={(taskProjects || []).map(p => ({ slug: p.slug, name: p.name }))}
        onClose={() => setTaskMenu(null)}
        onFollowUp={(task) => handleTaskFollowUp(task)}
        onNeedsVerification={(task) => handleTaskNeedsVerification(task)}
        onResearch={(task) => handleTaskResearch(task)}
        onMoveTo={(target) => handleTaskMoveTo(taskMenu?.task, target)}
      />

      {ctxToast && (
        <div
          data-test-id="ctx-toast"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 20,
            transform: 'translateX(-50%)',
            zIndex: 9998,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.32)',
            color: '#A7F3D0',
            padding: '8px 14px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          }}
        >
          {ctxToast.text}
        </div>
      )}
    </div>
  )
}
