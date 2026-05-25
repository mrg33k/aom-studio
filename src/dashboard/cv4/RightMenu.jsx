// RightMenu.jsx — CV4 right-rail (corner:right-menu R4)
//
// Layout (top → bottom):
//   PANEL HEADER  "Missions" (Instrument Serif)
//   PROJECT PILLS [All] [Corner] [Ambition] ... [+]   filters all accordion sections
//   ACCORDION TABS  [ Missions ] [ Tasks ] [ Files ]  — one section open at a time
//
//   MISSIONS tab (default):
//     SUMMARY + missions list sorted by last_message_at DESC
//   TASKS tab:
//     Active Tasks + Completed Tasks
//   FILES tab:
//     FilesPanel (current project's canon)
//
// Replaces TasksPanelCv4 in the right drawer (CornerV4.jsx, tasksDrawerOpen aside).
// Per VISION: missions never "complete", so there is NO "Completed Missions" section.
//
// Mission: corner:right-menu

import { useState, useEffect, useMemo, useCallback } from 'react'
import { C } from '../lib/cv3Colors.js'
import { useCornerAuth, useCornerNav } from '../CornerContext.jsx'
import { useTasks } from '../hooks/useTasks.js'
import { authFetch } from '../lib/authFetch.js'
import FilesPanel from './FilesPanel.jsx'

const MENU = {
  bodyFont: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  displayFont: "'Instrument Serif', Georgia, serif",
  monoFont: "'JetBrains Mono', monospace",
  amber: 'var(--c-yellow)',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeAge(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 90) return 'now'
  if (diff < 3600) return Math.round(diff / 60) + 'm'
  if (diff < 86400) return Math.round(diff / 3600) + 'h'
  const days = Math.round(diff / 86400)
  return days === 1 ? '1d' : days + 'd'
}

function agentInitials(agentSlug) {
  if (!agentSlug) return '??'
  const parts = agentSlug.split('-')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return agentSlug.slice(0, 2).toUpperCase()
}

function agentBadgeText(task) {
  const slug = task.agent || task.agent_identity || task.metadata?.agent || ''
  return agentInitials(slug)
}

// ── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  let bg, pulse = false
  if (status === 'active' || status === 'running' || status === 'building') {
    bg = MENU.amber; pulse = true
  } else if (status === 'queued' || status === 'queuing') {
    bg = C.yellow
  } else {
    bg = C.muted
  }
  return (
    <span style={{
      display: 'inline-block',
      width: 7, height: 7,
      borderRadius: '50%',
      flexShrink: 0,
      marginTop: 4,
      background: bg,
      animation: pulse ? 'rm-breathe 2s ease-in-out infinite' : 'none',
    }} />
  )
}

// ── Panel header (top-of-rail title) ────────────────────────────────────────

function PanelHeader({ children }) {
  return (
    <div style={{
      padding: '16px 14px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.045)',
    }}>
      <div style={{
        fontFamily: MENU.displayFont,
        fontSize: 26,
        fontWeight: 400,
        lineHeight: 1,
        color: C.text,
      }}>{children}</div>
      <div style={{
        marginTop: 3,
        fontFamily: MENU.monoFont,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: C.dim,
      }}>Missions · tasks · files</div>
    </div>
  )
}

// ── Project pills (filter row directly below header) ────────────────────────

function ProjectPills({ projects, active, onChange }) {
  const baseStyle = {
    fontFamily: MENU.monoFont,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.04em',
    padding: '5px 9px',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
    textTransform: 'lowercase',
  }
  const pill = (key, label, isAdd = false) => {
    const isActive = active === key
    const style = { ...baseStyle }
    if (isAdd) {
      style.color = C.muted
      style.border = '1px dashed ' + C.border2
      style.background = 'transparent'
      style.cursor = 'default'
    } else if (isActive) {
      style.color = MENU.amber
      style.background = 'rgba(234,179,8,0.09)'
      style.borderColor = 'rgba(234,179,8,0.32)'
    } else {
      style.color = C.text2
      style.background = C.chipBg
      style.borderColor = C.border2
    }
    return (
      <span
        key={key}
        onClick={isAdd ? undefined : () => onChange(key)}
        onMouseEnter={e => { if (!isActive && !isAdd) e.currentTarget.style.color = C.text }}
        onMouseLeave={e => { if (!isActive && !isAdd) e.currentTarget.style.color = C.text2 }}
        style={style}
      >{label}</span>
    )
  }
  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      gap: 4,
      padding: '10px 14px 12px',
      scrollbarWidth: 'none',
    }}>
      {pill('all', 'all')}
      {projects.map(slug => pill(slug, slug))}
      {pill('__add__', '+', true)}
    </div>
  )
}

// ── Section header ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      textTransform: 'uppercase',
      fontSize: 10,
      fontWeight: 700,
      color: C.muted,
      letterSpacing: '0.12em',
      padding: '16px 14px 7px',
      fontFamily: MENU.monoFont,
    }}>{children}</div>
  )
}

// ── Summary block (plain-English briefing, not stat counters) ───────────────

function SummaryBlock({ missionCount, runningCount, queuedCount, scopeLabel, lastActiveName, lastActiveAge }) {
  const activeCount = runningCount + queuedCount

  // Build the primary sentence in plain English
  let primary
  if (activeCount > 0) {
    const taskWord = activeCount === 1 ? 'task' : 'tasks'
    if (runningCount > 0 && queuedCount > 0) {
      primary = `${runningCount} running, ${queuedCount} queued in ${scopeLabel}.`
    } else if (runningCount > 0) {
      primary = `${runningCount} ${taskWord} running in ${scopeLabel}.`
    } else {
      primary = `${queuedCount} ${taskWord} queued in ${scopeLabel}.`
    }
  } else {
    const mWord = missionCount === 1 ? 'mission' : 'missions'
    primary = `${missionCount} ${mWord} in ${scopeLabel}. Quiet right now.`
  }

  return (
    <div style={{
      padding: '12px 14px',
      fontFamily: MENU.bodyFont,
      background: 'rgba(255,255,255,0.018)',
      borderBottom: '1px solid rgba(255,255,255,0.045)',
    }}>
      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.45 }}>{primary}</div>
      {lastActiveName && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
          {'Last active: '}
          <span style={{ color: C.text2 }}>{lastActiveName}</span>
          {lastActiveAge && (
            <span style={{
              color: C.muted,
              fontFamily: MENU.monoFont,
              marginLeft: 5,
            }}>{lastActiveAge}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Mission row ─────────────────────────────────────────────────────────────

function MissionRow({ mission, projectSlug, dotStatus, ageLabel, isCurrent }) {
  const stripeColor = isCurrent
    ? MENU.amber
    : dotStatus === 'queued'
    ? 'rgba(245,158,11,0.5)'
    : 'transparent'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 6,
      padding: '8px 14px',
      cursor: 'pointer',
      transition: 'background 120ms ease',
      minHeight: 38,
      borderLeft: '2px solid ' + stripeColor,
      borderBottom: '1px solid rgba(255,255,255,0.025)',
      background: isCurrent ? 'rgba(234,179,8,0.055)' : 'transparent',
    }}
      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = C.s1 }}
      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
    >
      <StatusDot status={dotStatus} />
      {/* Two-line layout: name on top, project + age below */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.3,
          color: isCurrent ? MENU.amber : C.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: MENU.bodyFont,
        }}>{mission.slug || mission.name || 'unnamed'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 400,
            lineHeight: 1.2,
            color: C.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: MENU.bodyFont,
          }}>{projectSlug}</span>
          {ageLabel && (
            <span style={{
              fontSize: 10,
              color: C.muted,
              fontFamily: MENU.monoFont,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>{ageLabel}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Task row ────────────────────────────────────────────────────────────────

function TaskRow({ task, isDone }) {
  const badge = agentBadgeText(task)
  const age = relativeAge(isDone ? (task.completed_at || task.updated_at) : task.created_at)
  const title = task.title || task.text || '(untitled)'
  const status = task.status

  const isRunning = status === 'running' || status === 'building'
  const isQueued = status === 'queued' || status === 'planning' || status === 'classifying'
  const stripeColor = isRunning
    ? MENU.amber
    : isQueued
    ? 'rgba(245,158,11,0.5)'
    : 'transparent'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '8px 14px',
      cursor: 'pointer',
      minHeight: 38,
      transition: 'background 120ms ease',
      borderLeft: '2px solid ' + (isDone ? 'transparent' : stripeColor),
      borderBottom: '1px solid rgba(255,255,255,0.025)',
    }}
      onMouseEnter={e => e.currentTarget.style.background = C.s1}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Agent badge */}
      <div style={{
        width: 20, height: 20,
        borderRadius: 4,
        background: C.dim,
        border: '1px solid ' + C.border2,
        fontSize: 9,
        fontWeight: 700,
        color: C.text2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
        textTransform: 'uppercase',
        fontFamily: MENU.monoFont,
        opacity: isDone ? 0.45 : 1,
      }}>{badge}</div>

      {/* Task body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: isDone ? C.muted : C.text,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontFamily: MENU.bodyFont,
          textDecoration: isDone ? 'line-through' : 'none',
        }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          {!isDone && (
            <StatusIndicator status={status} />
          )}
          <span style={{
            fontSize: 10,
            color: C.muted,
            fontFamily: MENU.monoFont,
          }}>{age}{isDone ? ' ago' : ''}</span>
        </div>
      </div>
    </div>
  )
}

// ── Status indicator (dot + mono text, no pill chrome) ──────────────────────

function StatusIndicator({ status }) {
  const isRunning = status === 'running' || status === 'building'
  const isQueued = status === 'queued' || status === 'planning' || status === 'classifying'
  const isWaiting = status === 'waiting' || status === 'needs_input'
  const isFailed = status === 'failed'

  let color, label
  if (isRunning) {
    color = MENU.amber; label = 'running'
  } else if (isQueued) {
    color = C.yellow; label = 'queued'
  } else if (isWaiting) {
    color = C.blue; label = 'waiting'
  } else if (isFailed) {
    color = C.red; label = 'failed'
  } else {
    return null
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 10,
      fontFamily: MENU.monoFont,
      color,
      flexShrink: 0,
    }}>
      <span style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        flexShrink: 0,
      }} />
      {label}
    </span>
  )
}

// ── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{
      height: 1,
      background: C.border,
      margin: 0,
      opacity: 0.55,
    }} />
  )
}

// ── Accordion tabs ────────────────────────────────────────────────────────────

function AccordionTabs({ active, onChange }) {
  const tabs = [
    { key: 'missions', label: 'Missions' },
    { key: 'tasks',    label: 'Tasks'    },
    { key: 'files',    label: 'Files'    },
  ]
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid ' + C.border,
      margin: 0,
      padding: '4px 8px 0',
      gap: 4,
    }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1,
            padding: '9px 8px 8px',
            background: 'transparent',
            border: '1px solid transparent',
            borderBottom: active === t.key ? '1px solid ' + MENU.amber : '1px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: active === t.key ? MENU.amber : C.muted,
            transition: 'color 120ms ease, border-color 120ms ease',
            fontFamily: MENU.monoFont,
            marginBottom: -1,
          }}
          onMouseEnter={e => { if (active !== t.key) e.currentTarget.style.color = C.text2 }}
          onMouseLeave={e => { if (active !== t.key) e.currentTarget.style.color = C.muted }}
        >{t.label}</button>
      ))}
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ text }) {
  return (
    <div style={{
      fontSize: 11,
      color: C.muted,
      padding: '4px 12px 8px',
      fontStyle: 'italic',
      fontFamily: MENU.bodyFont,
    }}>{text}</div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RightMenu() {
  const { worldId } = useCornerAuth()
  const { conversationTarget } = useCornerNav()
  const { rightNow, queued, done, loading: tasksLoading } = useTasks(worldId)

  // Missions flat list from missions-tree API
  const [missionsFlat, setMissionsFlat] = useState([])
  const [missionsLoading, setMissionsLoading] = useState(true)

  useEffect(() => {
    if (!worldId) return
    let cancelled = false
    setMissionsLoading(true)
    ;(async () => {
      try {
        // Fetch missions tree + recent messages in parallel
        const [treeRes, msgsRes] = await Promise.all([
          authFetch(`/api/dashboard/missions-tree?client=${encodeURIComponent(worldId)}`, { credentials: 'include' }),
          // Recent messages (last 30 days) to derive per-project activity timestamps
          authFetch(`/api/dashboard/messages-recent?client=${encodeURIComponent(worldId)}&limit=200`, { credentials: 'include' })
            .catch(() => null),
        ])

        if (!treeRes.ok) return
        const j = await treeRes.json().catch(() => null)
        if (cancelled || !j || !Array.isArray(j.projects)) return

        // Build a project → last message timestamp map from recent messages
        const projectLastMsg = new Map()
        if (msgsRes?.ok) {
          const msgs = await msgsRes.json().catch(() => null)
          for (const msg of (Array.isArray(msgs?.messages) ? msgs.messages : (Array.isArray(msgs) ? msgs : []))) {
            const ts = msg?.created_at || msg?.timestamp
            const clientId = msg?.client_id || ''
            if (!ts || !clientId) continue
            // client_id can be: "corner" (project room), "corner:right-menu" (mission room)
            const projectSlug = clientId.includes(':') ? clientId.split(':')[0] : clientId
            const missionSlug = clientId.includes(':') ? clientId.split(':').slice(1).join(':') : null
            const key = missionSlug ? `${projectSlug}:${missionSlug}` : projectSlug
            if (!projectLastMsg.has(key) || new Date(ts) > new Date(projectLastMsg.get(key))) {
              projectLastMsg.set(key, ts)
            }
            // Also set project-level key
            if (!projectLastMsg.has(projectSlug) || new Date(ts) > new Date(projectLastMsg.get(projectSlug))) {
              projectLastMsg.set(projectSlug, ts)
            }
          }
        }

        // Flatten: one row per mission
        const flat = []
        for (const p of j.projects) {
          for (const m of (p.missions || [])) {
            const tasks = m.tasks || []
            const hasRunning = tasks.some(t => ['running', 'building', 'active'].includes(t.status))
            const hasQueued = tasks.some(t => ['queued', 'planning', 'classifying'].includes(t.status))
            const dotStatus = hasRunning ? 'running' : hasQueued ? 'queued' : 'idle'

            const projectSlug = p.slug || p.name
            const missionKey = `${projectSlug}:${m.slug}`

            // Recency: mission-level message first, then project-level, then registry timestamps
            const lastTouched =
              m.last_message_at ||
              projectLastMsg.get(missionKey) ||
              projectLastMsg.get(projectSlug) ||
              m.last_updated ||
              null

            flat.push({
              slug: m.slug || m.path,
              name: m.name || m.slug || m.path,
              projectSlug,
              dotStatus,
              lastTouched,
            })
          }
        }

        // Sort: most recently active mission first
        flat.sort((a, b) => {
          if (a.lastTouched && b.lastTouched) return new Date(b.lastTouched) - new Date(a.lastTouched)
          if (a.lastTouched) return -1
          if (b.lastTouched) return 1
          return (a.slug || '').localeCompare(b.slug || '')
        })

        if (!cancelled) {
          setMissionsFlat(flat)
          setMissionsLoading(false)
        }
      } catch {
        if (!cancelled) setMissionsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [worldId])

  // Accordion tab state
  const [activeTab, setActiveTab] = useState('missions')

  // Active tasks = running + queued
  const activeTasks = useMemo(() => {
    return [...rightNow, ...queued]
  }, [rightNow, queued])

  // Completed tasks capped at 5 visible + show-more
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const COMPLETED_CAP = 5

  // Determine current mission for highlighting
  const currentMission = conversationTarget?.type === 'mission' ? conversationTarget.slug : null
  const currentProject = conversationTarget?.type === 'project' ? conversationTarget.slug : null

  // Project pills — derived from missions (unique projectSlug, in order of appearance)
  const [activePill, setActivePill] = useState('all')
  const projectsList = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const m of missionsFlat) {
      if (m.projectSlug && !seen.has(m.projectSlug)) {
        seen.add(m.projectSlug)
        out.push(m.projectSlug)
      }
    }
    return out
  }, [missionsFlat])

  // If the user navigates into a project room, follow it on the pill — unless
  // they explicitly clicked a different pill. We do this by snapping to the
  // current project on mount / when conversation target changes.
  useEffect(() => {
    if (currentProject && projectsList.includes(currentProject)) {
      setActivePill(currentProject)
    }
  }, [currentProject, projectsList])

  // Filter missions by active pill
  const filteredMissions = useMemo(() => {
    if (activePill === 'all') return missionsFlat
    return missionsFlat.filter(m => m.projectSlug === activePill)
  }, [missionsFlat, activePill])

  // Filter tasks by active pill too — so "Active Tasks" + "Completed" stay in
  // sync with the pill scope. When 'all', show everything; when a project, filter.
  const filteredActiveTasks = useMemo(() => {
    if (activePill === 'all') return activeTasks
    return activeTasks.filter(t => (
      t.project === activePill ||
      t.metadata?.project === activePill ||
      t.metadata?.repo === activePill
    ))
  }, [activeTasks, activePill])

  const filteredDone = useMemo(() => {
    if (activePill === 'all') return done
    return done.filter(t => (
      t.project === activePill ||
      t.metadata?.project === activePill ||
      t.metadata?.repo === activePill
    ))
  }, [done, activePill])

  const completedToShow = showAllCompleted ? filteredDone.slice(0, 20) : filteredDone.slice(0, COMPLETED_CAP)
  const hiddenCompletedCount = Math.max(0, filteredDone.length - COMPLETED_CAP)

  // Summary stats — scoped to the active pill
  const runningCount = filteredActiveTasks.filter(t => ['running', 'building', 'active'].includes(t.status)).length
  const queuedCount = filteredActiveTasks.filter(t => ['queued', 'planning', 'classifying'].includes(t.status)).length
  const scopeLabel = activePill === 'all' ? 'all projects' : activePill

  // "Last active" — the most recently touched mission in the filtered list
  const lastActiveM = filteredMissions.find(m => m.lastTouched) || null
  const lastActiveAge = lastActiveM?.lastTouched ? relativeAge(lastActiveM.lastTouched) : null
  const lastActiveName = lastActiveM
    ? (activePill === 'all'
        ? `${lastActiveM.projectSlug}:${lastActiveM.slug}`
        : lastActiveM.slug)
    : null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: C.bg,
      fontFamily: MENU.bodyFont,
    }}>
      <style>{`
        @keyframes rm-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      {/* ── PANEL HEADER ──────────────────────────────────────── */}
      <PanelHeader>Missions</PanelHeader>

      {/* ── PROJECT PILLS ─────────────────────────────────────── */}
      <ProjectPills
        projects={projectsList}
        active={activePill}
        onChange={setActivePill}
      />

      {/* ── ACCORDION TABS ────────────────────────────────────── */}
      <AccordionTabs active={activeTab} onChange={setActiveTab} />

      {/* ═══════════════ TAB: MISSIONS ═══════════════════════════ */}
      {activeTab === 'missions' && (
        <>
          {/* Summary */}
          <SummaryBlock
            missionCount={filteredMissions.length}
            runningCount={runningCount}
            queuedCount={queuedCount}
            scopeLabel={scopeLabel}
            lastActiveName={lastActiveName}
            lastActiveAge={lastActiveAge}
          />

          <Divider />

          {/* Missions list — sorted by recency (last_message_at DESC) */}
          {missionsLoading && (
            <div style={{ padding: '10px 14px', fontSize: 11, color: C.muted, fontFamily: MENU.bodyFont }}>
              Loading…
            </div>
          )}

          {!missionsLoading && filteredMissions.length === 0 && (
            <EmptyState text={activePill === 'all' ? 'No missions yet' : `No missions in ${activePill}`} />
          )}

          {filteredMissions.map((m, i) => (
            <MissionRow
              key={m.slug + '-' + i}
              mission={m}
              projectSlug={m.projectSlug}
              dotStatus={m.dotStatus}
              ageLabel={m.lastTouched ? relativeAge(m.lastTouched) : null}
              isCurrent={
                (currentMission && m.slug === currentMission) ||
                (currentProject && m.projectSlug === currentProject && !currentMission)
              }
            />
          ))}
        </>
      )}

      {/* ═══════════════ TAB: TASKS ══════════════════════════════ */}
      {activeTab === 'tasks' && (
        <>
          {/* Active tasks */}
          {filteredActiveTasks.length > 0 ? (
            <>
              <SectionLabel>Active</SectionLabel>
              {filteredActiveTasks.map(task => (
                <TaskRow key={task.id} task={task} isDone={false} />
              ))}
              <Divider />
            </>
          ) : (
            <EmptyState text="No active tasks" />
          )}

          {/* Completed tasks */}
          <SectionLabel>Completed</SectionLabel>

          {filteredDone.length === 0 && (
            <EmptyState text="No completed tasks yet" />
          )}

          {completedToShow.map(task => (
            <TaskRow key={task.id} task={task} isDone={true} />
          ))}

          {!showAllCompleted && hiddenCompletedCount > 0 && (
            <button
              onClick={() => setShowAllCompleted(true)}
              style={{
                width: '100%',
                padding: '6px 12px',
                background: 'transparent',
                border: 'none',
                color: C.muted,
                fontSize: 11,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'color 120ms ease',
                fontFamily: MENU.bodyFont,
                marginTop: 2,
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.text2}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
            >
              + {hiddenCompletedCount} more completed
            </button>
          )}
        </>
      )}

      {/* ═══════════════ TAB: FILES ══════════════════════════════ */}
      {activeTab === 'files' && (
        <FilesPanel projectSlug={activePill === 'all' ? currentProject : activePill} />
      )}

      {/* Bottom breathing room */}
      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  )
}
