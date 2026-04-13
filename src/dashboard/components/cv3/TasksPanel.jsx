// TasksPanel -- task queue with search, filters, stats, and task creation
// Extracted from CornerV3.jsx
// pipeline-test 2026-04-12 safe_push verification -- do not remove
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { C } from '../../lib/cv3Colors.js'
import { getShippedCardColor } from './shared.jsx'
import { supabase } from '../../lib/supabase.js'
import { createTaskWithRex } from '../../lib/rexTaskClient.js'
import { useProjects } from '../../hooks/useProjects'

export default function TasksPanel({ queued, rightNow, waiting, done, worldId, refreshTasks, addOptimisticTask, showToast, currentUser, setActiveTab, setActiveConversation, setPrefillMessage }) {
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeProject, setActiveProject] = useState('all')
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [projectName,            setProjectName]            = useState('')
  const [selectedColor,          setSelectedColor]          = useState('#10B981')
  const [shippedLimit,           setShippedLimit]           = useState(50)
  const [projectNames,           setProjectNames]           = useState([])
  const [taskInput,              setTaskInput]              = useState('')
  const [taskInputFocused,       setTaskInputFocused]       = useState(false)
  const [taskSubmitting,         setTaskSubmitting]         = useState(false)
  const [expandedTask,           setExpandedTask]           = useState(null)
  const [taskThread,             setTaskThread]             = useState([])
  const [threadLoading,          setThreadLoading]          = useState(false)
  const taskInputRef = useRef(null)
  const [isRecording,  setIsRecording]  = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null) // eslint-disable-line no-unused-vars
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const micStreamRef     = useRef(null)

  // Project files state
  const [showProjectFiles, setShowProjectFiles] = useState(false)
  const [projectFiles, setProjectFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState('corner') // Default to 'corner' project

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
  const { projects: taskProjects } = useProjects()

  // Auto-start runner every time Tasks tab mounts
  useEffect(() => {
    fetch('/api/dashboard/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'startRunner' }),
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Instant task maker: submit handler
  const handleTaskSubmit = useCallback(async () => {
    const text = taskInput.trim()
    if (!text || taskSubmitting) return

    setTaskSubmitting(true)
    try {
      const userId   = currentUser?.id || null
      const userName = currentUser?.user_metadata?.full_name || null
      const result = await createTaskWithRex(text, userId, userName)
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

  // Load project names from Supabase on mount
  useEffect(() => {
    if (!supabase) return
    supabase.from('projects').select('name,slug').eq('is_active', true).eq('client_id', worldId).order('name')
      .then(({ data }) => {
        if (data) setProjectNames(data.map(p => p.name))
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

  // Reply input state for waiting tasks
  const [waitingReply, setWaitingReply] = useState({})
  const [waitingReplySending, setWaitingReplySending] = useState({})

  // Project pills from Supabase projects table
  const projectPills = ['All', ...projectNames]

  // Filter helper
  function filterTasks(tasks) {
    return tasks.filter(t => {
      const title  = (t.title || t.text || '').toLowerCase()
      const matchQ = !searchQuery || title.includes(searchQuery.toLowerCase())
      const agent  = (t.agent_identity || t.agentIdentity || '').toLowerCase()
      const matchP = activeProject === 'all'
        || title.includes(activeProject.toLowerCase())
        || agent.includes(activeProject.toLowerCase())
      return matchQ && matchP
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
  const DAY_LABELS    = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const MIN_BAR_H     = 2
  const MAX_BAR_H     = 19

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
      `}</style>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Search + Filters */}
        <div style={{ marginBottom: 16 }}>
          {/* Search input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: C.s1,
            border: '1px solid ' + (searchFocused ? 'rgba(16,185,129,0.15)' : C.border),
            borderRadius: 12,
            padding: '9px 14px',
            transition: 'border-color 0.2s',
            marginBottom: 10,
          }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
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
                fontSize: 13,
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
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {projectPills.map(p => {
              const key      = p === 'All' ? 'all' : p.toLowerCase()
              const isActive = activeProject === key
              return (
                <button
                  key={p}
                  onClick={() => setActiveProject(key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 16,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid ' + C.border,
                    background: isActive ? 'rgba(16,185,129,0.1)' : C.s1,
                    color: isActive ? C.accent : C.text2,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >{p}</button>
              )
            })}
            <button
              onClick={() => {
                if (!showCreateProjectModal) { setProjectName(''); setSelectedColor('#10B981'); }
                setShowCreateProjectModal(prev => !prev);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 1,
                cursor: 'pointer',
                flexShrink: 0,
                border: '1px solid ' + C.border,
                background: C.s1,
                color: C.text2,
                fontFamily: "'Inter', sans-serif",
              }}
            >+</button>
          </div>
        </div>

        {/* Building Now */}
        {filteredActive.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 6px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                Building Now
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                {filteredActive.length}
              </span>
            </div>
            {filteredActive.map((t, i) => {
              const isBuilding = t.status === 'building' || t.status === 'qa'
              const cardColor = isBuilding ? '#22C55E' : '#EAB308'
              const cardBorder = isBuilding ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.1)'
              const statusLabel = t.status === 'building' ? 'Building' : t.status === 'qa' ? 'QA' : t.status === 'planning' ? 'Planning' : t.status === 'classifying' ? 'Classifying' : 'Queued'
              return (
              <div
                key={t.id}
                onClick={() => toggleTaskExpand(t.id)}
                style={{
                  padding: '14px 16px',
                  marginBottom: 8,
                  borderRadius: 14,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  background: '#1A2035',
                  border: `1px solid ${expandedTask === t.id ? 'rgba(255,255,255,0.15)' : cardBorder}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = ''
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                {/* Animated top progress bar */}
                {isBuilding && <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: 2,
                  background: cardColor,
                  animation: 'bld 5s ease-in-out infinite',
                  borderRadius: '14px 14px 0 0',
                }} />}
                {!isBuilding && <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: 2,
                  background: cardColor,
                  animation: 'bld 8s ease-in-out infinite',
                  borderRadius: '14px 14px 0 0',
                  opacity: 0.6,
                }} />}

                {/* Card content row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: cardColor, fontSize: 14, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap' }}>
                      {t.title || t.text || 'Untitled task'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      {t.project_id && (() => {
                        const proj = taskProjects.find(p => String(p.id) === String(t.project_id))
                        return proj ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: proj.color, flexShrink: 0 }} /> : null
                      })()}
                      {t.agent_identity || t.agentIdentity ? (
                        <span style={{ color: '#475569', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {t.agent_identity || t.agentIdentity}
                        </span>
                      ) : null}
                      {t.attempt_count > 1 ? (
                        <span style={{ color: '#475569', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Attempt {t.attempt_count}
                        </span>
                      ) : null}
                      <span style={{ color: C.dim, fontSize: 9 }}>{expandedTask === t.id ? '▾' : '▸'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: cardColor, fontSize: 12, fontWeight: 800, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                      {t.qa_score || t.qaScore || '...'}
                    </div>
                    <div style={{ color: t.status === 'building' ? cardColor : t.status === 'queued' ? C.dim : C.muted, fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>
                      {statusLabel}
                    </div>
                  </div>
                </div>
                {/* Expandable thread */}
                {expandedTask === t.id && (
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                    {threadLoading ? (
                      <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                    ) : taskThread.length === 0 ? (
                      <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events yet.</div>
                    ) : taskThread.map((m, idx) => (
                      <div key={idx} style={{
                        fontSize: 11, color: C.text2, lineHeight: 1.4,
                        padding: '3px 0',
                        fontFamily: "'JetBrains Mono', monospace",
                        borderBottom: idx < taskThread.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      }}>
                        <span style={{ color: C.dim, fontSize: 9 }}>{(m.timestamp || '').slice(11, 19)}</span>
                        {' '}
                        <span>{m.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )})}

          </div>
        )}

        {/* Weekly Stats Bar */}
        <div style={{
          background: C.s1,
          border: '1px solid ' + C.border,
          borderRadius: 14,
          padding: '12px 14px',
          margin: '14px -4px 16px',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 8,
          }}>This Week</div>

          {/* 7-day bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 32 }}>
            {DAY_LABELS.map((label, i) => {
              const count    = dailyCounts[i]
              const isFuture = i > (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
              const barH     = count > 0 ? Math.round((count / maxDailyCount) * (MAX_BAR_H - MIN_BAR_H)) + MIN_BAR_H : MIN_BAR_H
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 3 }}>
                  <div style={{
                    width: '100%',
                    height: barH,
                    borderRadius: 3,
                    background: isFuture || count === 0 ? 'rgba(255,255,255,0.06)' : C.accent,
                    minHeight: 2,
                    transition: 'height 0.3s ease',
                  }} />
                  <div style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color: C.dim,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{label}</div>
                </div>
              )
            })}
          </div>

          {/* Metrics row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid ' + C.border,
          }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, textAlign: 'center', color: C.text }}>{weekTotal}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Tasks</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, textAlign: 'center', color: C.text }}>{passRate !== null ? passRate + '%' : '--'}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Pass Rate</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, textAlign: 'center', color: C.text }}>{avgQA !== null ? avgQA : '--'}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Avg QA</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, textAlign: 'center', color: C.text }}>{qaRatio}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>QAd</div>
            </div>
          </div>
        </div>

        {/* Waiting for input */}
        {waitingTasks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ padding: '12px 0 6px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                Needs Input
              </span>
            </div>
            {waitingTasks.map((t) => {
              const agent = t.agent_identity || t.agentIdentity || 'agent'
              const question = t.metadata?.checkpoint?.question || 'Waiting for your input...'
              const replyText = waitingReply[t.id] || ''
              const sending = waitingReplySending[t.id] || false
              return (
                <div
                  key={t.id}
                  style={{
                    padding: '14px 16px',
                    marginBottom: 8,
                    borderRadius: 14,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.15)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{agent}</span>
                    <span style={{ fontSize: 9, color: C.dim }}>needs input</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(240,244,255,0.7)', lineHeight: 1.2, marginBottom: 8 }}>
                    {t.title || t.text || 'Untitled task'}
                  </div>
                  <div style={{
                    fontSize: 13, color: '#F59E0B', lineHeight: 1.4,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.1)',
                    marginBottom: 10,
                  }}>
                    {question}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setWaitingReply(prev => ({ ...prev, [t.id]: e.target.value }))}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && replyText.trim() && !sending) {
                          setWaitingReplySending(prev => ({ ...prev, [t.id]: true }))
                          await fetch('/api/dashboard/task-action', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'resume', taskId: t.id, payload: { answer: replyText.trim() } }),
                          })
                          setWaitingReply(prev => ({ ...prev, [t.id]: '' }))
                          setWaitingReplySending(prev => ({ ...prev, [t.id]: false }))
                        }
                      }}
                      placeholder="Reply..."
                      style={{
                        flex: 1, padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, color: C.text,
                        fontSize: 13, fontFamily: "'Inter', sans-serif",
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={async () => {
                        if (!replyText.trim() || sending) return
                        setWaitingReplySending(prev => ({ ...prev, [t.id]: true }))
                        await fetch('/api/dashboard/task-action', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'resume', taskId: t.id, payload: { answer: replyText.trim() } }),
                        })
                        setWaitingReply(prev => ({ ...prev, [t.id]: '' }))
                        setWaitingReplySending(prev => ({ ...prev, [t.id]: false }))
                      }}
                      disabled={!replyText.trim() || sending}
                      style={{
                        padding: '8px 14px', borderRadius: 10,
                        background: replyText.trim() && !sending ? '#F59E0B' : 'rgba(255,255,255,0.05)',
                        border: 'none', cursor: replyText.trim() && !sending ? 'pointer' : 'default',
                        color: replyText.trim() && !sending ? '#000' : C.muted,
                        fontSize: 12, fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {sending ? '...' : 'Reply'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Failed tasks */}
        {filteredFailed.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 6px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                Failed
              </span>
              <button
                onClick={async () => {
                  for (const t of filteredFailed) {
                    await fetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
                  }
                  refreshTasks()
                }}
                style={{ fontSize: 10, fontWeight: 600, color: C.dim, cursor: 'pointer', letterSpacing: '0.02em', background: 'none', border: 'none', padding: '4px 0', WebkitTapHighlightColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = C.muted }}
                onMouseLeave={e => { e.currentTarget.style.color = C.dim }}
              >
                Clear all
              </button>
            </div>
            {filteredFailed.map((t) => {
              const qa = t.qa_score || t.qaScore
              const agent = t.agent_identity || t.agentIdentity
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTaskExpand(t.id)}
                  style={{
                    padding: '14px 16px',
                    marginBottom: 8,
                    borderRadius: 14,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'rgba(239,68,68,0.08)',
                    border: expandedTask === t.id ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(239,68,68,0.12)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(240,244,255,0.6)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap' }}>
                        {t.title || t.text || 'Untitled task'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                        {agent && <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(240,244,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{agent}</span>}
                        {qa && <span style={{ fontSize: 9, fontWeight: 700, color: '#EF4444', letterSpacing: '0.06em' }}>QA {qa}/10</span>}
                        <span style={{ color: C.dim, fontSize: 9 }}>{expandedTask === t.id ? '▾' : '▸'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const prompt = typeof t.result === 'string' ? t.result.trim() : ''
                          const project = getTaskProject(t)
                          if (!project || !prompt) {
                            if (showToast) showToast('No linked project or prompt found for this failed task.')
                            return
                          }
                          setPrefillMessage(prompt)
                          setActiveConversation(project)
                          setActiveTab('chat')
                        }}
                        style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        Requeue
                      </button>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>|</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await fetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
                          refreshTasks()
                        }}
                        style={{ fontSize: 11, fontWeight: 600, color: C.dim, cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  {/* Expandable: result summary + thread */}
                  {expandedTask === t.id && (
                    <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                      {/* Follow-up summary */}
                      {t.result && (
                        <div style={{
                          fontSize: 12, color: 'rgba(240,244,255,0.7)', lineHeight: 1.5,
                          padding: '8px 10px', marginBottom: 8,
                          background: 'rgba(239,68,68,0.06)', borderRadius: 8,
                          fontFamily: "'Inter', sans-serif",
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {t.result}
                        </div>
                      )}
                      {threadLoading ? (
                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                      ) : taskThread.length === 0 && !t.result ? (
                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events.</div>
                      ) : taskThread.map((m, idx) => (
                        <div key={idx} style={{
                          fontSize: 11, color: C.text2, lineHeight: 1.4,
                          padding: '3px 0',
                          fontFamily: "'JetBrains Mono', monospace",
                          borderBottom: idx < taskThread.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        }}>
                          <span style={{ color: C.dim, fontSize: 9 }}>{(m.timestamp || '').slice(11, 19)}</span>
                          {' '}
                          <span>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Shipped tasks */}
        {filteredCompleted.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 6px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                Shipped
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                {filteredCompleted.length}
              </span>
            </div>
            {filteredCompleted.slice(0, shippedLimit).map((t, i) => {
              const cardColor = getShippedCardColor(t, i)
              const qa        = t.qa_score || t.qaScore
              const agent     = t.agent_identity || t.agentIdentity
              const project   = t.project_name || t.projectName
              const isFailed     = t.status === 'failed'
              const isDark       = isFailed
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTaskExpand(t.id)}
                  style={{
                    padding: '14px 16px',
                    marginBottom: 8,
                    borderRadius: 14,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    backgroundColor: isFailed ? 'rgba(239,68,68,0.15)' : cardColor,
                    opacity: 1,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#F0F4FF' : '#0A0A0A', lineHeight: 1.2, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap', textDecoration: 'none' }}>
                        {t.title || t.text || 'Untitled task'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                        {t.project_id && (() => {
                          const proj = taskProjects.find(p => String(p.id) === String(t.project_id))
                          return proj ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: proj.color, flexShrink: 0 }} /> : null
                        })()}
                        {agent && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(240,244,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {agent}
                          </span>
                        )}
                        {project && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(240,244,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {project}
                          </span>
                        )}
                        {!agent && !project && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(240,244,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {isFailed ? 'Failed' : 'Shipped'}
                          </span>
                        )}
                      </div>
                    </div>
                    {qa && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: isFailed ? '#EF4444' : 'rgba(0,0,0,0.55)', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                          {qa}
                        </div>
                        <div style={{ fontSize: 8, fontWeight: 600, color: isDark ? 'rgba(240,244,255,0.3)' : 'rgba(0,0,0,0.3)', textTransform: 'uppercase', textAlign: 'right', marginTop: 2 }}>
                          QA
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Expandable: result summary + thread */}
                  {expandedTask === t.id && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, paddingTop: 8 }}>
                      {/* Follow-up summary */}
                      {t.result && (
                        <div style={{
                          fontSize: 12, color: isDark ? 'rgba(240,244,255,0.7)' : 'rgba(0,0,0,0.6)', lineHeight: 1.5,
                          padding: '8px 10px', marginBottom: 8,
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 8,
                          fontFamily: "'Inter', sans-serif",
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {t.result}
                        </div>
                      )}
                      {threadLoading ? (
                        <div style={{ fontSize: 11, color: isDark ? C.dim : 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                      ) : taskThread.length === 0 && !t.result ? (
                        <div style={{ fontSize: 11, color: isDark ? C.dim : 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events.</div>
                      ) : taskThread.map((m, idx) => (
                        <div key={idx} style={{
                          fontSize: 11, color: isDark ? C.text2 : 'rgba(0,0,0,0.5)', lineHeight: 1.4,
                          padding: '3px 0',
                          fontFamily: "'JetBrains Mono', monospace",
                          borderBottom: idx < taskThread.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'}` : 'none',
                        }}>
                          <span style={{ color: isDark ? C.dim : 'rgba(0,0,0,0.25)', fontSize: 9 }}>{(m.timestamp || '').slice(11, 19)}</span>
                          {' '}
                          <span>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredCompleted.length > shippedLimit && (
              <div
                onClick={() => setShippedLimit(prev => prev + 50)}
                style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.muted, cursor: 'pointer', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                Show more ({filteredCompleted.length - shippedLimit} remaining)
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {filteredActive.length === 0 && filteredCompleted.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.muted, gap: 8, paddingTop: 60 }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
            </svg>
            <span style={{ fontSize: 13 }}>{searchQuery || activeProject !== 'all' ? 'No matching tasks' : 'No tasks'}</span>
          </div>
        )}
      </div>

      {/* Task creation input bar */}
      <div style={{
        flexShrink: 0,
        padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: '1px solid ' + C.border,
      }}>
        {/* Recording indicator */}
        {isRecording && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginBottom: 6,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#EF4444',
              animation: 'rec-dot 1s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#EF4444',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.04em',
            }}>Recording...</span>
          </div>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: isRecording ? 'rgba(239,68,68,0.06)' : C.s1,
          border: '1.5px solid ' + (isRecording ? 'rgba(239,68,68,0.3)' : taskInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 16px',
          maxWidth: 560,
          margin: '0 auto',
          boxShadow: isRecording ? '0 0 0 4px rgba(239,68,68,0.06)' : taskInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
        }}>
          <input
            ref={taskInputRef}
            type="text"
            placeholder={isRecording ? 'Listening...' : 'Add a task...'}
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            onFocus={() => setTaskInputFocused(true)}
            onBlur={() => setTaskInputFocused(false)}
            onKeyDown={handleTaskInputKeyDown}
            disabled={isRecording}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: isRecording ? 'rgba(239,68,68,0.5)' : C.text,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {!isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button title="Attach" onClick={() => {}} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <button title="Commands" onClick={() => {}} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </button>
            </div>
          )}
          {(!taskInput.trim() || isRecording) && (
            <button
              title={isRecording ? 'Stop recording' : 'Voice'}
              onClick={toggleVoiceRecording}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: isRecording ? '#EF4444' : C.accent,
                border: 'none',
                color: '#000', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                animation: isRecording ? 'rec-pulse 1.2s ease-in-out infinite' : 'none',
                transition: 'background 0.2s',
              }}
            >
              {isRecording ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0014 0"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              )}
            </button>
          )}
          {taskInput.trim() && (
            <button
              title="Create task"
              onClick={handleTaskSubmit}
              disabled={taskSubmitting}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent, border: 'none',
                color: '#000', cursor: taskSubmitting ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                opacity: taskSubmitting ? 0.6 : 1,
                transition: 'transform 0.15s',
              }}
            >
              {taskSubmitting ? (
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setShowCreateProjectModal(false); setProjectName(''); setSelectedColor('#10B981') }}
        >
          <div
            style={{
              background: C.s1,
              border: '1px solid ' + C.border2,
              borderRadius: 16,
              padding: 24,
              width: 300,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
              New Project
            </div>

            <input
              type="text"
              placeholder="Project name..."
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              style={{
                background: C.bg2,
                border: '1px solid ' + C.border2,
                borderRadius: 8,
                padding: '8px 12px',
                color: C.text,
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              {['#EAB308', '#22C55E', '#A78BFA', '#F59E0B', '#10B981', '#F97316'].map(color => (
                <div
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: color,
                    cursor: 'pointer',
                    border: selectedColor === color ? '2px solid #fff' : '2px solid transparent',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    outline: selectedColor === color ? '2px solid rgba(255,255,255,0.25)' : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCreateProjectModal(false); setProjectName(''); setSelectedColor('#10B981') }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid ' + C.border2,
                  background: 'none',
                  color: C.text2,
                  fontFamily: "'Inter', sans-serif",
                }}
              >Cancel</button>
              <button
                onClick={() => setShowCreateProjectModal(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: C.accent,
                  color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                }}
              >Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
