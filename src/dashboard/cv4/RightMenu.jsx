// RightMenu.jsx — CV4 right-rail redesign (corner:right-menu R2)
//
// Three vertical sections:
//   1. MISSIONS   — all missions sorted by last-touched (message activity)
//   2. ACTIVE TASKS — running + queued tasks scoped to the current project room
//   3. COMPLETED  — done tasks, per-room, capped at 5 visible + show-more
//
// Replaces TasksPanelCv4 in the right drawer (CornerV4.jsx, tasksDrawerOpen aside).
// Per VISION: missions never "complete", so there is NO "Completed Missions" section.
// Completed section holds completed *tasks*, not missions.
//
// Mission: corner:right-menu
// Round: R2 — React port + Supabase wiring

import { useState, useEffect, useMemo, useCallback } from 'react'
import { C } from '../lib/cv3Colors.js'
import { useCornerAuth, useCornerNav } from '../CornerContext.jsx'
import { useTasks } from '../hooks/useTasks.js'
import { authFetch } from '../lib/authFetch.js'

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
    bg = C.accent; pulse = true
  } else if (status === 'queued' || status === 'queuing') {
    bg = C.yellow
  } else {
    bg = C.muted
  }
  return (
    <span style={{
      display: 'inline-block',
      width: 6, height: 6,
      borderRadius: '50%',
      flexShrink: 0,
      background: bg,
      animation: pulse ? 'rm-breathe 2s ease-in-out infinite' : 'none',
    }} />
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
      letterSpacing: '0.08em',
      padding: '12px 12px 4px',
      fontFamily: "'Inter', sans-serif",
    }}>{children}</div>
  )
}

// ── Mission row ─────────────────────────────────────────────────────────────

function MissionRow({ mission, projectSlug, dotStatus, ageLabel, isCurrent }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px',
      borderRadius: 4,
      cursor: 'pointer',
      transition: 'background 120ms ease',
      minHeight: 28,
      background: isCurrent ? C.s2 : 'transparent',
    }}
      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = C.s1 }}
      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
    >
      <StatusDot status={dotStatus} />
      <span style={{
        flex: 1,
        fontSize: 11,
        fontWeight: 500,
        color: isCurrent ? C.accent : C.text,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontFamily: "'Inter', sans-serif",
      }}>{mission.slug || mission.name || 'unnamed'}</span>
      <span style={{
        fontSize: 10,
        color: C.muted,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        maxWidth: 60,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontFamily: "'Inter', sans-serif",
      }}>{projectSlug}</span>
      {ageLabel && (
        <span style={{
          fontSize: 10,
          color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>{ageLabel}</span>
      )}
    </div>
  )
}

// ── Task row ────────────────────────────────────────────────────────────────

function TaskRow({ task, isDone }) {
  const badge = agentBadgeText(task)
  const age = relativeAge(isDone ? (task.completed_at || task.updated_at) : task.created_at)
  const title = task.title || task.text || '(untitled)'
  const status = task.status

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '5px 12px',
      borderRadius: 4,
      cursor: 'pointer',
      minHeight: 32,
      transition: 'background 120ms ease',
      opacity: isDone ? 0.7 : 1,
    }}
      onMouseEnter={e => e.currentTarget.style.background = C.s1}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Agent badge */}
      <div style={{
        width: 20, height: 20,
        borderRadius: '50%',
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
        fontFamily: "'JetBrains Mono', monospace",
      }}>{badge}</div>

      {/* Task body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          color: isDone ? C.text2 : C.text,
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif",
          textDecoration: isDone ? 'line-through' : 'none',
        }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          {!isDone && (
            <StatusPill status={status} />
          )}
          <span style={{
            fontSize: 10,
            color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{age}{isDone ? ' ago' : ''}</span>
        </div>
      </div>
    </div>
  )
}

// ── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const isRunning = status === 'running' || status === 'building'
  const isQueued = status === 'queued' || status === 'planning' || status === 'classifying'
  const isWaiting = status === 'waiting' || status === 'needs_input'
  const isFailed = status === 'failed'

  let bg, color, border, label
  if (isRunning) {
    bg = 'rgba(16,185,129,0.15)'; color = C.accent; border = 'rgba(16,185,129,0.3)'; label = 'running'
  } else if (isQueued) {
    bg = 'rgba(234,179,8,0.12)'; color = C.yellow; border = 'rgba(234,179,8,0.25)'; label = 'queued'
  } else if (isWaiting) {
    bg = 'rgba(96,165,250,0.12)'; color = C.blue; border = 'rgba(96,165,250,0.25)'; label = 'waiting'
  } else if (isFailed) {
    bg = 'rgba(239,68,68,0.12)'; color = C.red; border = 'rgba(239,68,68,0.25)'; label = 'failed'
  } else {
    return null
  }

  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 5px',
      borderRadius: 3,
      letterSpacing: '0.03em',
      flexShrink: 0,
      textTransform: 'lowercase',
      fontFamily: "'JetBrains Mono', monospace",
      background: bg,
      color,
      border: '1px solid ' + border,
    }}>{label}</span>
  )
}

// ── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{
      height: 1,
      background: C.border,
      margin: '8px 12px',
      opacity: 0.5,
    }} />
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
      fontFamily: "'Inter', sans-serif",
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
        const r = await authFetch(`/api/dashboard/missions-tree?client=${encodeURIComponent(worldId)}`, { credentials: 'include' })
        if (!r.ok) return
        const j = await r.json().catch(() => null)
        if (cancelled || !j || !Array.isArray(j.projects)) return

        // Flatten: one row per mission with project slug + task status
        const flat = []
        for (const p of j.projects) {
          for (const m of (p.missions || [])) {
            const tasks = m.tasks || []
            const hasRunning = tasks.some(t => ['running', 'building', 'active'].includes(t.status))
            const hasQueued = tasks.some(t => ['queued', 'planning', 'classifying'].includes(t.status))
            const dotStatus = hasRunning ? 'running' : hasQueued ? 'queued' : 'idle'
            flat.push({
              slug: m.slug || m.path,
              name: m.name || m.slug || m.path,
              projectSlug: p.slug || p.name,
              dotStatus,
              lastTouched: m.last_touched || null,
              // put running ones first, then queued, then idle — last-touched within each group
            })
          }
        }

        // Sort: running first, then queued, then idle; within groups by last_touched desc
        flat.sort((a, b) => {
          const order = { running: 0, queued: 1, idle: 2 }
          const ao = order[a.dotStatus] ?? 2
          const bo = order[b.dotStatus] ?? 2
          if (ao !== bo) return ao - bo
          if (a.lastTouched && b.lastTouched) return new Date(b.lastTouched) - new Date(a.lastTouched)
          if (a.lastTouched) return -1
          if (b.lastTouched) return 1
          return 0
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

  // Active tasks = running + queued
  const activeTasks = useMemo(() => {
    return [...rightNow, ...queued]
  }, [rightNow, queued])

  // Completed tasks capped at 5 visible + show-more
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const COMPLETED_CAP = 5
  const completedToShow = showAllCompleted ? done.slice(0, 20) : done.slice(0, COMPLETED_CAP)
  const hiddenCompletedCount = Math.max(0, done.length - COMPLETED_CAP)

  // Determine current mission for highlighting
  const currentMission = conversationTarget?.type === 'mission' ? conversationTarget.slug : null
  const currentProject = conversationTarget?.type === 'project' ? conversationTarget.slug : null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: C.bg,
    }}>
      <style>{`
        @keyframes rm-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      {/* ── 1. MISSIONS ───────────────────────────────────────── */}
      <SectionLabel>Missions</SectionLabel>

      {missionsLoading && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: C.muted, fontFamily: "'Inter', sans-serif" }}>
          Loading…
        </div>
      )}

      {!missionsLoading && missionsFlat.length === 0 && (
        <EmptyState text="No missions yet" />
      )}

      {missionsFlat.map((m, i) => (
        <MissionRow
          key={m.slug + '-' + i}
          mission={m}
          projectSlug={m.projectSlug}
          dotStatus={m.dotStatus}
          ageLabel={m.lastTouched ? relativeAge(m.lastTouched) : null}
          isCurrent={
            (currentMission && m.slug === currentMission) ||
            (currentProject && m.projectSlug === currentProject)
          }
        />
      ))}

      <Divider />

      {/* ── 2. ACTIVE TASKS ───────────────────────────────────── */}
      <SectionLabel>Active Tasks</SectionLabel>

      {activeTasks.length === 0 && (
        <EmptyState text="Nothing running" />
      )}

      {activeTasks.map(task => (
        <TaskRow key={task.id} task={task} isDone={false} />
      ))}

      <Divider />

      {/* ── 3. COMPLETED ──────────────────────────────────────── */}
      <SectionLabel>Completed</SectionLabel>

      {done.length === 0 && (
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
            padding: '4px 12px',
            background: 'transparent',
            border: 'none',
            color: C.muted,
            fontSize: 11,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'color 120ms ease',
            fontFamily: "'Inter', sans-serif",
            marginTop: 2,
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.text2}
          onMouseLeave={e => e.currentTarget.style.color = C.muted}
        >
          + {hiddenCompletedCount} more completed
        </button>
      )}

      {/* Bottom breathing room */}
      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  )
}
