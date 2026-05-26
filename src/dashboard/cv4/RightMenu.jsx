// RightMenu.jsx — CV4 right-rail (corner:right-menu R7)
//
// Layout (top → bottom):
//   PANEL HEADER  "Missions" (Instrument Serif)
//   PROJECT PILLS [all] [corner] [ambition] ... [+]  — filter scope, fade-mask
//   RECENT STRIP  recent · project1 · project2 · ...  — last 10 entered (R7-E)
//   ACCORDION TABS  [ Missions ] [ Tasks ] [ Files ]  — one section open at a time
//
//   MISSIONS tab (default):
//     SUMMARY (only when work is active) + missions list
//     "all" view: project group headers, with optional sub-folders + ungrouped
//     specific view: flat list
//   TASKS tab:
//     Active Tasks + Completed Tasks
//   FILES tab:
//     FilesPanel (current project's canon)
//
// R7 additions vs R6:
//   A. Project group header is clickable (already was); hover affordance louder
//   B/C. Per-project sub-folders via /api/dashboard/mission-folders + move-to button
//   D. Agent / EA / super-agent room → snap pill back to 'all'
//   E. Recent-projects horizontal strip above the three tabs
//   H. Mission row → onClick navigates to its mission chat
//   I. Task row → onClick navigates to the room it was created in
//
// Mission: corner:right-menu

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { C } from '../lib/cv3Colors.js'
import { useCornerAuth, useCornerNav } from '../CornerContext.jsx'
import { useTasks } from '../hooks/useTasks.js'
import { useProjects } from '../hooks/useProjects.js'
import { authFetch } from '../lib/authFetch.js'
import FilesPanel from './FilesPanel.jsx'
import { MissionContextMenu, ProjectContextMenu, FolderContextMenu, useIsMobile, useLongPress } from '../components/cv3/ContextMenuVariants.jsx'
import useChatDispatch from '../components/cv3/useChatDispatch.js'

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

// Pull the project slug out of whatever shape a task carries it in.
function taskProjectSlug(task) {
  return (
    task?.project ||
    task?.metadata?.project ||
    task?.metadata?.repo ||
    null
  )
}

// Pull the mission slug (without project prefix) from a task's metadata.
function taskMissionSlug(task) {
  const raw =
    task?.metadata?.mission_slug ||
    task?.mission_slug ||
    null
  if (!raw) return null
  return raw.includes(':') ? raw.split(':').slice(1).join(':') : raw
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
// R6: dropped subtitle ("MISSIONS · TASKS · FILES") — accordion tabs below name them.
// R8: drop Instrument Serif (Patrik vetoed it on CV4 surfaces). Use Hanken
// Grotesk 600 to match the "Mail" / project list typography on the left rail.

function PanelHeader({ children, action }) {
  return (
    <div style={{
      padding: '14px 14px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.045)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    }}>
      <div style={{
        fontFamily: MENU.bodyFont,
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: '-0.005em',
        lineHeight: 1.1,
        color: C.text,
      }}>{children}</div>
      {action}
    </div>
  )
}

// "+ New" inline affordance — appears next to the panel header. Inline name
// input → POST /api/dashboard/create-project-from-chat → optimistic add +
// select. R8-3.

function NewProjectAffordance({ onCreate, worldId }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)

  async function submit() {
    const n = name.trim()
    if (!n || busy || !worldId) return
    const slug = slugify(n) || `room-${Date.now().toString(36)}`
    setBusy(true)
    try {
      const r = await authFetch('/api/dashboard/create-project-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug, name: n, client_id: worldId }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok) {
        onCreate?.(j.slug || slug, j.name || n)
        setName('')
        setEditing(false)
      }
    } catch { /* swallow — surface in console for debug */ }
    setBusy(false)
  }

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        style={{
          fontSize: 10,
          fontFamily: MENU.monoFont,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: C.muted,
          cursor: 'pointer',
          padding: '3px 8px',
          border: '1px solid ' + C.border,
          borderRadius: 4,
          transition: 'color 120ms ease, border-color 120ms ease',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.muted }}
        onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}
      >+ New</span>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setEditing(false); setName('') }
        }}
        placeholder="project name"
        style={{
          width: 130,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid ' + C.border,
          borderRadius: 3,
          color: C.text,
          fontSize: 11,
          padding: '4px 6px',
          outline: 'none',
          fontFamily: MENU.bodyFont,
        }}
      />
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        style={{
          background: name.trim() ? MENU.amber : 'transparent',
          color: name.trim() ? '#000' : C.muted,
          border: name.trim() ? 'none' : '1px solid ' + C.border,
          borderRadius: 3,
          padding: '4px 7px',
          fontSize: 10,
          fontWeight: 600,
          cursor: name.trim() ? 'pointer' : 'default',
          fontFamily: MENU.monoFont,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >{busy ? '…' : 'add'}</button>
    </div>
  )
}

// "+ new mission" inline affordance — sits alongside "+ new folder" at the
// bottom of an open project group. POST /api/dashboard/create-mission-from-drawer.
// R8-4.

function NewMissionAffordance({ projectSlug, worldId, onCreated }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)

  async function submit() {
    const n = name.trim()
    if (!n || busy || !worldId || !projectSlug) return
    const slug = slugify(n) || `mission-${Date.now().toString(36)}`
    setBusy(true)
    try {
      const r = await authFetch('/api/dashboard/create-mission-from-drawer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parent_slug: projectSlug, mission_slug: slug, name: n, client_id: worldId }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok) {
        onCreated?.(projectSlug, j.mission_slug || slug, j.name || n)
        setName('')
        setEditing(false)
      }
    } catch { /* swallow */ }
    setBusy(false)
  }

  if (!editing) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); setEditing(true) }}
        style={{
          padding: '5px 14px 5px 26px',
          fontSize: 10,
          fontFamily: MENU.monoFont,
          color: C.muted,
          cursor: 'pointer',
          transition: 'color 120ms ease',
          letterSpacing: '0.04em',
        }}
        onMouseEnter={e => e.currentTarget.style.color = C.text2}
        onMouseLeave={e => e.currentTarget.style.color = C.muted}
      >+ new mission</div>
    )
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        padding: '5px 12px 5px 26px',
      }}
    >
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setEditing(false); setName('') }
        }}
        placeholder="mission name"
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid ' + C.border,
          borderRadius: 3,
          color: C.text,
          fontSize: 11,
          padding: '4px 6px',
          outline: 'none',
          fontFamily: MENU.bodyFont,
          minWidth: 0,
        }}
      />
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        style={{
          background: name.trim() ? MENU.amber : 'transparent',
          color: name.trim() ? '#000' : C.muted,
          border: name.trim() ? 'none' : '1px solid ' + C.border,
          borderRadius: 3,
          padding: '4px 8px',
          fontSize: 10,
          fontWeight: 600,
          cursor: name.trim() ? 'pointer' : 'default',
          fontFamily: MENU.monoFont,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >{busy ? '…' : 'add'}</button>
    </div>
  )
}

// ── Project pills ───────────────────────────────────────────────────────────
// R6: pad 14/16px, chip 7/12, gap 6, right-edge fade-mask gradient.

function ProjectPills({ projects, active, onChange, onPillContextMenu }) {
  const baseStyle = {
    fontFamily: MENU.monoFont,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.04em',
    padding: '7px 12px',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
    textTransform: 'lowercase',
    flexShrink: 0,
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
        onContextMenu={isAdd ? undefined : (e) => { e.preventDefault(); if (typeof onPillContextMenu === 'function') onPillContextMenu(e, key, label) }}
        onMouseEnter={e => { if (!isActive && !isAdd) e.currentTarget.style.color = C.text }}
        onMouseLeave={e => { if (!isActive && !isAdd) e.currentTarget.style.color = C.text2 }}
        style={style}
      >{label}</span>
    )
  }
  return (
    <div style={{
      position: 'relative',
      borderBottom: '1px solid rgba(255,255,255,0.045)',
    }}>
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 6,
        padding: '14px 14px 16px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitMaskImage: 'linear-gradient(to right, black 82%, transparent 100%)',
        maskImage: 'linear-gradient(to right, black 82%, transparent 100%)',
      }}>
        {pill('all', 'all')}
        {projects.map(slug => pill(slug, slug))}
        {pill('__add__', '+', true)}
      </div>
    </div>
  )
}

// ── Recent missions strip (R8-2; was projects in R7-E) ──────────────────────
// Sits between PROJECT PILLS and ACCORDION TABS. Shows the last 10 distinct
// missions the user has visited, latest first. Click a chip → navigate to
// that mission room. State persisted in localStorage per world. Hidden when
// empty. Each entry: { qualified: "project:mission", display: "mission",
// project: "project", name: "mission" }.

const RECENT_KEY = (worldId) => `rm-recent-missions:${worldId || 'aom'}`

// R10-5: group recents by project. Each project is its own row.
// Project label on the left (mono uppercase), recent room chips on the right.
function RecentMissionsStrip({ recents, onSelect }) {
  if (!recents || recents.length === 0) return null

  // Group preserving recency order: first occurrence of a project wins its
  // slot in the group order; entries inside a group keep their own order.
  const groups = []
  const groupIdx = new Map()
  for (const entry of recents) {
    if (!entry.project) continue
    if (!groupIdx.has(entry.project)) {
      groupIdx.set(entry.project, groups.length)
      groups.push({ project: entry.project, entries: [] })
    }
    groups[groupIdx.get(entry.project)].entries.push(entry)
  }
  if (groups.length === 0) return null

  return (
    <div style={{
      padding: '8px 14px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.035)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <span style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: C.muted,
        fontFamily: MENU.monoFont,
      }}>RECENT</span>

      {groups.map(g => (
        <div key={g.project} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
        }}>
          <span
            onClick={() => onSelect({ kind: 'project', project: g.project, name: g.project })}
            title={`Open ${g.project}`}
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: C.text2,
              fontFamily: MENU.monoFont,
              flexShrink: 0,
              cursor: 'pointer',
              maxWidth: 90,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 120ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.text2}
          >{g.project}</span>
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 5,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
            maskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
            flex: 1,
            minWidth: 0,
          }}>
            {g.entries.map(entry => (
              <span
                key={entry.qualified}
                onClick={() => onSelect(entry)}
                title={entry.qualified}
                onMouseEnter={e => e.currentTarget.style.color = C.text}
                onMouseLeave={e => e.currentTarget.style.color = C.text2}
                style={{
                  fontFamily: MENU.monoFont,
                  fontSize: 10,
                  fontWeight: 400,
                  color: C.text2,
                  cursor: 'pointer',
                  padding: '2px 7px',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'color 120ms ease',
                  textTransform: 'lowercase',
                }}
              >{entry.display}</span>
            ))}
          </div>
        </div>
      ))}
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

// ── Summary block ────────────────────────────────────────────────────────────

function SummaryBlock({ missionCount, runningCount, queuedCount, scopeLabel, lastActiveName, lastActiveAge }) {
  const activeCount = runningCount + queuedCount

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

// ── Move-to-folder button + picker (R7-C) ───────────────────────────────────
// Small icon next to each mission row. Click opens a floating picker listing
// folders for that project + an "ungroup" option + an inline new-folder input.

function MoveToFolderButton({ projectSlug, missionSlug, currentFolderSlug, folders, onMove, onCreateFolder }) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const projectFolders = folders.filter(f => f.project_slug === projectSlug)

  async function handleCreate() {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    const folder = await onCreateFolder(projectSlug, name)
    setCreating(false)
    if (folder) {
      setNewName('')
      onMove(missionSlug, folder.slug)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}
         onClick={(e) => e.stopPropagation()}>
      <span
        onClick={() => setOpen(o => !o)}
        title="Move to folder"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18, height: 18,
          fontSize: 11,
          color: C.muted,
          cursor: 'pointer',
          borderRadius: 3,
          opacity: 0.5,
          transition: 'opacity 120ms ease, background 120ms ease, color 120ms ease',
          fontFamily: MENU.monoFont,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.color = C.text2
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0.5'
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = C.muted
        }}
      >⋯</span>

      {open && (
        <div style={{
          position: 'absolute',
          top: 22,
          right: 0,
          minWidth: 180,
          background: 'rgba(15,23,42,0.98)',
          border: '1px solid ' + C.border,
          borderRadius: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 100,
          padding: '4px 0',
          fontFamily: MENU.bodyFont,
        }}>
          <div style={{
            padding: '6px 10px 4px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: C.muted,
            fontFamily: MENU.monoFont,
          }}>Move to</div>

          {/* Ungroup option (only when currently in a folder) */}
          {currentFolderSlug && (
            <div
              onClick={() => { onMove(missionSlug, null); setOpen(false) }}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                color: C.text2,
                cursor: 'pointer',
                fontStyle: 'italic',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >— ungroup</div>
          )}

          {projectFolders.length === 0 && !currentFolderSlug && (
            <div style={{ padding: '6px 10px', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
              No folders yet
            </div>
          )}

          {projectFolders.map(f => {
            const isCurrent = f.slug === currentFolderSlug
            return (
              <div
                key={f.slug}
                onClick={() => { if (!isCurrent) { onMove(missionSlug, f.slug); setOpen(false) } }}
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  color: isCurrent ? MENU.amber : C.text,
                  cursor: isCurrent ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: isCurrent ? MENU.amber : C.muted }}>▸</span>
                <span style={{ flex: 1 }}>{f.name}</span>
                {isCurrent && <span style={{ fontSize: 10, color: MENU.amber }}>✓</span>}
              </div>
            )
          })}

          {/* Inline new-folder input */}
          <div style={{
            borderTop: '1px solid ' + C.border,
            marginTop: 4,
            padding: '6px 8px',
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              placeholder="+ new folder"
              autoFocus
              style={{
                flex: 1,
                minWidth: 0,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid ' + C.border,
                borderRadius: 3,
                color: C.text,
                fontSize: 11,
                padding: '4px 6px',
                outline: 'none',
                fontFamily: MENU.bodyFont,
              }}
            />
            {newName.trim() && (
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  background: MENU.amber,
                  color: '#000',
                  border: 'none',
                  borderRadius: 3,
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: creating ? 'wait' : 'pointer',
                  fontFamily: MENU.monoFont,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >{creating ? '…' : 'add'}</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Mission row ─────────────────────────────────────────────────────────────
// R7-H: onClick navigates to the mission room.
// R7-C: optional move-to button (shown when showMove=true).
// hideProject: omit the project-slug line when row sits under a project header.

function MissionRow({
  mission, projectSlug, dotStatus, ageLabel, isCurrent, hideProject,
  onClick, onContextMenu, onLongPress, showMove, currentFolderSlug, folders, onMove, onCreateFolder,
  depth = 0, hasChildren = false, isExpanded = false, onToggleChildren = null,
}) {
  const longPressHandlers = useLongPress(onLongPress ? (x, y) => onLongPress(x, y, mission, projectSlug) : null)
  const stripeColor = isCurrent
    ? MENU.amber
    : dotStatus === 'queued'
    ? 'rgba(245,158,11,0.5)'
    : 'transparent'
  // R-MP-2 — nested rows indent + show chevron toggle for parents.
  const indentBase = 14
  const indentStep = 16
  const paddingLeft = indentBase + (depth * indentStep)

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...(longPressHandlers || {})}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: `5px 14px 5px ${paddingLeft}px`,
        cursor: 'pointer',
        transition: 'background 120ms ease',
        minHeight: 30,
        borderLeft: '2px solid ' + stripeColor,
        background: isCurrent ? 'rgba(234,179,8,0.055)' : 'transparent',
      }}
      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = C.s1 }}
      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
    >
      {hasChildren ? (
        <span
          onClick={e => { e.stopPropagation(); onToggleChildren?.() }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 14, height: 18, marginRight: -2, marginTop: 1, flexShrink: 0,
            cursor: 'pointer', color: C.muted,
            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.12s',
            fontFamily: MENU.monoFont, fontSize: 10, lineHeight: 1,
          }}
        >▾</span>
      ) : (depth > 0 ? <span style={{ width: 14, flexShrink: 0 }} /> : null)}
      <StatusDot status={dotStatus} />
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
        }}>{mission.name || mission.slug || 'unnamed'}</span>
      </div>
      {showMove && (
        <MoveToFolderButton
          projectSlug={projectSlug}
          missionSlug={mission.slug}
          currentFolderSlug={currentFolderSlug}
          folders={folders}
          onMove={onMove}
          onCreateFolder={onCreateFolder}
        />
      )}
    </div>
  )
}

// ── Task row ────────────────────────────────────────────────────────────────
// R7-I: onClick navigates to the room the task was created in.

function TaskRow({ task, isDone, onClick }) {
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
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 14px',
        cursor: 'pointer',
        minHeight: 38,
        transition: 'background 120ms ease',
        borderLeft: '2px solid ' + (isDone ? 'transparent' : stripeColor),
      }}
      onMouseEnter={e => e.currentTarget.style.background = C.s1}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
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
          {!isDone && <StatusIndicator status={status} />}
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

// ── Status indicator ────────────────────────────────────────────────────────

function StatusIndicator({ status }) {
  const isRunning = status === 'running' || status === 'building'
  const isQueued = status === 'queued' || status === 'planning' || status === 'classifying'
  const isWaiting = status === 'waiting' || status === 'needs_input'
  const isFailed = status === 'failed'

  let color, label
  if (isRunning)      { color = MENU.amber; label = 'running' }
  else if (isQueued)  { color = C.yellow;   label = 'queued'  }
  else if (isWaiting) { color = C.blue;     label = 'waiting' }
  else if (isFailed)  { color = C.red;      label = 'failed'  }
  else return null

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontFamily: MENU.monoFont, color, flexShrink: 0,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: color, display: 'inline-block', flexShrink: 0,
      }} />
      {label}
    </span>
  )
}

// ── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{ height: 1, background: C.border, margin: 0, opacity: 0.55 }} />
  )
}

// ── Accordion tabs ──────────────────────────────────────────────────────────

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

// ── Project group header (R6 + R7-A affordance bump) ────────────────────────
// Whole bar is the click target (was already wired in R6); R7 bumps the hover
// state so the affordance reads more clearly.

function ProjectGroupHeader({ projectSlug, count, isRunning, isQueued, isCollapsed, onToggle, onContextMenu }) {
  // R-MP-2 cleanup — dot only when there's actual signal (running/queued).
  // Idle projects don't earn pixels.
  const dotStatus = isRunning ? 'running' : isQueued ? 'queued' : null
  return (
    <div
      onClick={onToggle}
      onContextMenu={onContextMenu}
      title={isCollapsed ? `Expand ${projectSlug}` : `Collapse ${projectSlug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 14px 8px 12px',
        cursor: 'pointer',
        background: 'transparent',
        borderTop: '1px solid rgba(255,255,255,0.025)',
        transition: 'background 120ms ease, color 120ms ease',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(234,179,8,0.05)'
        e.currentTarget.querySelectorAll('[data-pg-slug]').forEach(n => n.style.color = C.text)
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.022)'
        e.currentTarget.querySelectorAll('[data-pg-slug]').forEach(n => n.style.color = C.text2)
      }}
    >
      {dotStatus && <StatusDot status={dotStatus} />}
      <span data-pg-slug style={{
        flex: 1,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: C.text2,
        fontFamily: MENU.monoFont,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'color 120ms ease',
      }}>{projectSlug}</span>
      {count > 0 && (
        <span style={{
          fontSize: 9,
          color: C.dim,
          fontFamily: MENU.monoFont,
          flexShrink: 0,
          marginRight: 3,
        }}>{count}</span>
      )}
      <span style={{
        fontSize: 11,
        color: C.muted,
        fontFamily: MENU.monoFont,
        flexShrink: 0,
        display: 'inline-block',
        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 180ms ease',
        lineHeight: 1,
      }}>▾</span>
    </div>
  )
}

// ── Folder row (R7-C) ───────────────────────────────────────────────────────
// Indented under its parent project group; click toggles its own collapse.

function FolderRow({ folder, count, isCollapsed, onToggle, depth = 0, onContextMenu }) {
  // R-MP-2 — subfolders indent by depth; same chevron pattern as MissionRow
  const indentBase = 20
  const indentStep = 14
  const paddingLeft = indentBase + (depth * indentStep)
  return (
    <div
      onClick={onToggle}
      onContextMenu={onContextMenu}
      title={isCollapsed ? `Expand ${folder.name}` : `Collapse ${folder.name}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: `4px 14px 4px ${paddingLeft}px`,
        cursor: 'pointer',
        background: 'transparent',
        transition: 'background 120ms ease, color 120ms ease',
        userSelect: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{
        fontSize: 10,
        color: C.muted,
        fontFamily: MENU.monoFont,
        flexShrink: 0,
        display: 'inline-block',
        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 180ms ease',
        lineHeight: 1,
      }}>▾</span>
      <span style={{
        flex: 1,
        fontSize: 11,
        fontWeight: 500,
        color: C.text2,
        fontFamily: MENU.bodyFont,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{folder.name}</span>
      <span style={{
        fontSize: 9,
        color: C.muted,
        fontFamily: MENU.monoFont,
        flexShrink: 0,
      }}>{count}</span>
    </div>
  )
}

// "+ folder" inline affordance — sits at bottom of an open project group.

function NewFolderAffordance({ projectSlug, onCreateFolder }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  async function submit() {
    const n = name.trim()
    if (!n || busy) return
    setBusy(true)
    await onCreateFolder(projectSlug, n)
    setBusy(false)
    setName('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); setEditing(true) }}
        style={{
          padding: '5px 14px 8px 26px',
          fontSize: 10,
          fontFamily: MENU.monoFont,
          color: C.muted,
          cursor: 'pointer',
          transition: 'color 120ms ease',
          letterSpacing: '0.04em',
        }}
        onMouseEnter={e => e.currentTarget.style.color = C.text2}
        onMouseLeave={e => e.currentTarget.style.color = C.muted}
      >+ new folder</div>
    )
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        padding: '5px 12px 8px 26px',
      }}
    >
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setEditing(false); setName('') }
        }}
        placeholder="folder name"
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid ' + C.border,
          borderRadius: 3,
          color: C.text,
          fontSize: 11,
          padding: '4px 6px',
          outline: 'none',
          fontFamily: MENU.bodyFont,
          minWidth: 0,
        }}
      />
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        style={{
          background: name.trim() ? MENU.amber : 'transparent',
          color: name.trim() ? '#000' : C.muted,
          border: name.trim() ? 'none' : '1px solid ' + C.border,
          borderRadius: 3,
          padding: '4px 8px',
          fontSize: 10,
          fontWeight: 600,
          cursor: name.trim() ? 'pointer' : 'default',
          fontFamily: MENU.monoFont,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >{busy ? '…' : 'add'}</button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RightMenu() {
  // ── R6 right-click + long-press wiring ──
  const dispatchToChat = useChatDispatch()
  const isMobile = useIsMobile()
  const [ctxMenu, setCtxMenu] = useState(null) // {kind:'mission'|'project', x, y, payload, projectSlug?, folders?}
  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])
  const openMissionMenu = useCallback((x, y, mission, projectSlug) => {
    setCtxMenu({ kind: 'mission', x, y, mission, projectSlug })
  }, [])
  const openProjectMenu = useCallback((x, y, project) => {
    setCtxMenu({ kind: 'project', x, y, project })
  }, [])
  const handleAgentPrompt = useCallback(async (text) => {
    closeCtxMenu()
    const r = await dispatchToChat(text)
    if (!r?.ok) console.warn('[RightMenu] chat dispatch failed', r)
  }, [dispatchToChat, closeCtxMenu])
  const handleMissionRename = useCallback(async (mission) => {
    closeCtxMenu()
    const current = mission.name || mission.slug
    const next = typeof window !== 'undefined' ? window.prompt(`Rename mission "${current}" to:`, current) : null
    if (!next || next.trim() === current) return
    try {
      const r = await authFetch('/api/dashboard/mission-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: mission.projectSlug || mission.project, mission_slug: mission.slug, name: next.trim() }),
      })
      if (!r.ok) console.warn('[RightMenu] mission rename failed', await r.text())
    } catch (e) { console.error('[RightMenu] mission rename error', e) }
  }, [closeCtxMenu])
  const handleMissionDelete = useCallback(async (mission) => {
    closeCtxMenu()
    if (typeof window === 'undefined') return
    const confirmText = window.prompt(`Delete mission "${mission.name || mission.slug}"? Type DELETE in caps to confirm:`)
    if (confirmText !== 'DELETE') return
    try {
      await authFetch('/api/dashboard/mission-update', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: mission.projectSlug || mission.project, mission_slug: mission.slug, confirm: 'DELETE' }),
      })
    } catch (e) { console.error('[RightMenu] mission delete error', e) }
  }, [closeCtxMenu])
  const handleProjectRename = useCallback(async (project) => {
    closeCtxMenu()
    const current = project.name || project.slug
    const next = typeof window !== 'undefined' ? window.prompt(`Rename project "${current}" to:`, current) : null
    if (!next || next.trim() === current) return
    try {
      const r = await authFetch('/api/dashboard/project-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: project.slug, name: next.trim() }),
      })
      if (!r.ok) console.warn('[RightMenu] project rename failed', await r.text())
    } catch (e) { console.error('[RightMenu] project rename error', e) }
  }, [closeCtxMenu])
  const handleProjectDelete = useCallback(async (project) => {
    closeCtxMenu()
    if (typeof window === 'undefined') return
    const confirmText = window.prompt(`Delete project "${project.name || project.slug}"? Type DELETE in caps to confirm:`)
    if (confirmText !== 'DELETE') return
    try {
      await authFetch('/api/dashboard/project-update', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: project.slug, confirm: 'DELETE' }),
      })
    } catch (e) { console.error('[RightMenu] project delete error', e) }
  }, [closeCtxMenu])
  const handleCreateSubfolderForMission = useCallback(async (mission) => {
    closeCtxMenu()
    const name = typeof window !== 'undefined' ? window.prompt(`Create subfolder under project "${mission.projectSlug || mission.project}":`) : null
    if (!name || !name.trim()) return
    try {
      await authFetch('/api/dashboard/mission-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: mission.projectSlug || mission.project, name: name.trim() }),
      })
    } catch (e) { console.error('[RightMenu] create folder error', e) }
  }, [closeCtxMenu])
  const handleMissionMoveToFolder = useCallback(async (mission, folder) => {
    closeCtxMenu()
    try {
      await authFetch('/api/dashboard/mission-folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: mission.projectSlug || mission.project, mission_slug: mission.slug, folder_slug: folder?.slug || null }),
      })
    } catch (e) { console.error('[RightMenu] move folder error', e) }
  }, [closeCtxMenu])
  const handleCreateSubfolderForProject = useCallback(async (project) => {
    closeCtxMenu()
    const name = typeof window !== 'undefined' ? window.prompt(`Create subfolder under project "${project.name || project.slug}":`) : null
    if (!name || !name.trim()) return
    try {
      await authFetch('/api/dashboard/mission-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: project.slug, name: name.trim() }),
      })
    } catch (e) { console.error('[RightMenu] create folder error', e) }
  }, [closeCtxMenu])

  // ── Folder right-click handlers (R-MP-2 cleanup) ──────────────────────────
  const openFolderMenu = useCallback((x, y, folder) => {
    setCtxMenu({ kind: 'folder', x, y, folder })
  }, [])

  const handleCreateSubfolderUnderFolder = useCallback(async (folder) => {
    closeCtxMenu()
    const name = typeof window !== 'undefined' ? window.prompt(`Create subfolder under "${folder.name || folder.slug}":`) : null
    if (!name || !name.trim()) return
    try {
      await authFetch('/api/dashboard/mission-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_slug: folder.project_slug,
          name: name.trim(),
          parent_folder_slug: folder.slug,
        }),
      })
      refreshFolders()
    } catch (e) { console.error('[RightMenu] create subfolder error', e) }
  }, [closeCtxMenu])

  const handleFolderRename = useCallback((folder) => {
    closeCtxMenu()
    // TODO: rename API not wired yet; surface to user
    if (typeof window !== 'undefined') {
      window.alert('Folder rename not wired yet — folder slug is the stable id; the API would need a PATCH route.')
    }
  }, [closeCtxMenu])

  const handleFolderDelete = useCallback((folder) => {
    closeCtxMenu()
    if (typeof window !== 'undefined') {
      window.alert('Folder delete not wired yet — assignments would need to migrate to null. Surface this if you actually need it.')
    }
  }, [closeCtxMenu])

  const handleCreateMissionInFolder = useCallback((folder) => {
    closeCtxMenu()
    // For now, hand off to the inline NewMissionAffordance flow by opening the
    // generic create flow scoped to the folder's project. Folder assignment
    // can be set after creation via the mission's context menu → move to folder.
    const name = typeof window !== 'undefined' ? window.prompt(`Create mission in folder "${folder.name || folder.slug}":`) : null
    if (!name || !name.trim()) return
    // Reuse the existing handleCreateMissionInline path via the inline modal —
    // fall back to a direct POST if available.
    if (typeof handleCreateMissionInline === 'function') {
      const slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || `m-${Date.now().toString(36)}`
      handleCreateMissionInline(folder.project_slug, slug, name.trim())
    }
  }, [closeCtxMenu])

  const { worldId } = useCornerAuth()
  const nav = useCornerNav()
  const {
    conversationTarget,
    selectedAgent,
    handleSelectMission,
    handleSelectProject,
    handleSelectTask,
  } = nav
  const { rightNow, queued, done } = useTasks(worldId)
  // R10-13: useProjects queries the projects table directly so newly-created
  // projects appear in the pills row even when they have zero missions yet.
  // (missions-tree only surfaces a project once it has at least one mission /
  // dynamic agent_status row / task — so a fresh project would otherwise be
  // invisible until you also create a mission inside it.)
  const { projects: dbProjects } = useProjects(worldId)

  // ── Missions ────────────────────────────────────────────────────────────────
  const [missionsFlat, setMissionsFlat] = useState([])
  const [missionsLoading, setMissionsLoading] = useState(true)
  // R10-13: bump this to force the missions-tree fetch to re-run after a
  // mission has been created via the inline affordance.
  const [missionsRefetchKey, setMissionsRefetchKey] = useState(0)

  useEffect(() => {
    if (!worldId) return
    let cancelled = false
    setMissionsLoading(true)
    ;(async () => {
      try {
        const [treeRes, msgsRes] = await Promise.all([
          authFetch(`/api/dashboard/missions-tree?client=${encodeURIComponent(worldId)}`, { credentials: 'include' }),
          authFetch(`/api/dashboard/messages-recent?client=${encodeURIComponent(worldId)}&limit=200`, { credentials: 'include' })
            .catch(() => null),
        ])

        if (!treeRes.ok) return
        const j = await treeRes.json().catch(() => null)
        if (cancelled || !j || !Array.isArray(j.projects)) return

        const projectLastMsg = new Map()
        if (msgsRes?.ok) {
          const msgs = await msgsRes.json().catch(() => null)
          for (const msg of (Array.isArray(msgs?.messages) ? msgs.messages : (Array.isArray(msgs) ? msgs : []))) {
            const ts = msg?.created_at || msg?.timestamp
            const clientId = msg?.client_id || ''
            if (!ts || !clientId) continue
            const projectSlug = clientId.includes(':') ? clientId.split(':')[0] : clientId
            const missionSlug = clientId.includes(':') ? clientId.split(':').slice(1).join(':') : null
            const key = missionSlug ? `${projectSlug}:${missionSlug}` : projectSlug
            if (!projectLastMsg.has(key) || new Date(ts) > new Date(projectLastMsg.get(key))) {
              projectLastMsg.set(key, ts)
            }
            if (!projectLastMsg.has(projectSlug) || new Date(ts) > new Date(projectLastMsg.get(projectSlug))) {
              projectLastMsg.set(projectSlug, ts)
            }
          }
        }

        const flat = []
        for (const p of j.projects) {
          // R-MP-2 — build a raw_slug → name lookup so nested missions can
          // prefix their parent chain into the display name (Parent › Child
          // › Grand). The flat right-rail list stays flat structurally but
          // reads as nested.
          const nameByRawSlug = new Map()
          for (const m of (p.missions || [])) {
            if (m.raw_slug) nameByRawSlug.set(m.raw_slug, m.name || m.raw_slug)
          }
          const parentByRawSlug = new Map()
          for (const m of (p.missions || [])) {
            if (m.raw_slug) parentByRawSlug.set(m.raw_slug, m.parent_raw_slug || null)
          }
          function ancestorNames(rawSlug) {
            const chain = []
            let cur = parentByRawSlug.get(rawSlug) || null
            while (cur) {
              chain.unshift(nameByRawSlug.get(cur) || cur)
              cur = parentByRawSlug.get(cur) || null
            }
            return chain
          }
          for (const m of (p.missions || [])) {
            const tasks = m.tasks || []
            const hasRunning = tasks.some(t => ['running', 'building', 'active'].includes(t.status))
            const hasQueued = tasks.some(t => ['queued', 'planning', 'classifying'].includes(t.status))
            const dotStatus = hasRunning ? 'running' : hasQueued ? 'queued' : 'idle'
            const projectSlug = p.slug || p.name
            const missionKey = `${projectSlug}:${m.slug}`
            const lastTouched =
              m.last_message_at ||
              projectLastMsg.get(missionKey) ||
              projectLastMsg.get(projectSlug) ||
              m.last_updated ||
              null
            const ownName = m.name || m.slug || m.path
            const ancestors = m.raw_slug ? ancestorNames(m.raw_slug) : []
            const displayName = ancestors.length > 0
              ? [...ancestors, ownName].join(' \u203A ')
              : ownName
            // R-MP-2 fix — flat.slug must be the bare raw_slug so the folder
            // assignment lookup (assignments[`${projectSlug}:${m.slug}`]) matches
            // the key shape stored in the assignments map (project:raw_slug).
            // Using m.slug here would double-prefix because API ships slug as
            // 'project:raw_slug' already.
            flat.push({
              slug: m.raw_slug || m.slug || m.path,
              name: displayName,
              depth: typeof m.depth === 'number' ? m.depth : 0,
              parent_raw_slug: m.parent_raw_slug || null,
              projectSlug, dotStatus, lastTouched,
            })
          }
        }
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
  }, [worldId, missionsRefetchKey])

  // ── Folders + assignments (R7-B/C) ──────────────────────────────────────────
  const [folders, setFolders] = useState([])
  const [assignments, setAssignments] = useState({}) // { "<project>:<mission>": folderSlug }

  const refreshFolders = useCallback(async () => {
    if (!worldId) return
    try {
      const r = await authFetch(`/api/dashboard/mission-folders?client=${encodeURIComponent(worldId)}`, { credentials: 'include' })
      if (!r.ok) return
      const j = await r.json()
      setFolders(Array.isArray(j?.folders) ? j.folders : [])
      const map = {}
      for (const a of (Array.isArray(j?.assignments) ? j.assignments : [])) {
        if (a?.project_slug && a?.mission_slug) {
          map[`${a.project_slug}:${a.mission_slug}`] = a.folder_slug || null
        }
      }
      setAssignments(map)
    } catch { /* silent */ }
  }, [worldId])

  useEffect(() => { refreshFolders() }, [refreshFolders])

  const handleCreateFolder = useCallback(async (projectSlug, name) => {
    try {
      const r = await authFetch(`/api/dashboard/mission-folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ project_slug: projectSlug, name }),
      })
      if (!r.ok) return null
      const j = await r.json()
      const folder = j?.folder
      if (folder) {
        setFolders(prev => [...prev, folder])
        return folder
      }
      return null
    } catch { return null }
  }, [])

  const handleMoveMission = useCallback(async (projectSlug, missionSlug, folderSlug) => {
    // Optimistic update
    setAssignments(prev => ({ ...prev, [`${projectSlug}:${missionSlug}`]: folderSlug || null }))
    try {
      await authFetch(`/api/dashboard/mission-folders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ project_slug: projectSlug, mission_slug: missionSlug, folder_slug: folderSlug || null }),
      })
    } catch {
      // Re-fetch to recover
      refreshFolders()
    }
  }, [refreshFolders])

  // ── Tab + sort state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('missions')
  const activeTasks = useMemo(() => [...rightNow, ...queued], [rightNow, queued])
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const COMPLETED_CAP = 5

  // Current mission / project from conversation target
  const currentMission = conversationTarget?.type === 'mission' ? conversationTarget.slug : null
  const currentProject = conversationTarget?.type === 'project' ? conversationTarget.slug : null
  const inAgentRoom = !!selectedAgent || conversationTarget?.type === 'agent'

  // Optimistic state — new-in-session projects / missions land here so they
  // appear in the rail before missions-tree / projects-list re-fetches.
  // MUST be declared BEFORE the useMemos that consume them (TDZ guard).
  const [pendingProjects, setPendingProjects] = useState([])
  const [pendingMissions, setPendingMissions] = useState([])

  // Project pills = union of missions-derived projects + projects-table rows
  // (useProjects) + pending (new-in-session) — so newly-created projects with
  // zero missions still appear in the pills.
  const [activePill, setActivePill] = useState('all')
  const projectsList = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const m of missionsFlat) {
      if (m.projectSlug && !seen.has(m.projectSlug)) {
        seen.add(m.projectSlug); out.push(m.projectSlug)
      }
    }
    for (const p of (dbProjects || [])) {
      if (p?.slug && !seen.has(p.slug)) {
        seen.add(p.slug); out.push(p.slug)
      }
    }
    for (const slug of pendingProjects) {
      if (slug && !seen.has(slug)) {
        seen.add(slug); out.push(slug)
      }
    }
    return out
  }, [missionsFlat, dbProjects, pendingProjects])

  // Effective missions = server missions + pending (new-in-session) missions
  // that haven't yet shown up in a missions-tree refetch.
  const effectiveMissions = useMemo(() => {
    if (pendingMissions.length === 0) return missionsFlat
    const seen = new Set(missionsFlat.map(m => `${m.projectSlug}:${m.slug}`))
    const adds = pendingMissions.filter(pm => !seen.has(`${pm.projectSlug}:${pm.slug}`))
    return adds.length === 0 ? missionsFlat : [...adds, ...missionsFlat]
  }, [missionsFlat, pendingMissions])

  // R7-D: agent / EA / super-agent room → snap pill back to 'all'.
  // Otherwise: if in a project room, follow that project's pill.
  useEffect(() => {
    if (inAgentRoom) {
      setActivePill('all')
    } else if (currentProject && projectsList.includes(currentProject)) {
      setActivePill(currentProject)
    }
  }, [inAgentRoom, currentProject, projectsList])

  // R8-2 / R10-fix: recent rooms strip — last 10 distinct rooms visited, per
  // world. Tracks ANY navigation: mission rooms, project rooms, and agent rooms.
  // Patrik 2026-05-25: "when I change rooms it doesn't change the recent
  // missions section" — switching project / agent rooms now updates it too.
  //
  // conversationTarget shape (from CornerV4):
  //   mission room → { type: 'project', slug: project, missionSlug, missionName }
  //   project room → { type: 'project', slug: project, name } (no missionSlug)
  //   agent room   → set via selectedAgent (separate slice); conversationTarget
  //                  may be null OR { type: 'agent', slug: 'elon' }.
  const [recentMissions, setRecentMissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY(worldId)) || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    const t = conversationTarget
    // Build a normalized entry from the active room. Skip if nothing to track.
    let entry = null

    // R10-5: missions + project rooms only (no agents per Patrik 2026-05-25).
    if (t?.missionSlug) {
      const projectSlug = t.slug
      const missionSlug = t.missionSlug
      const bare = missionSlug.includes(':') ? missionSlug.split(':').slice(1).join(':') : missionSlug
      entry = {
        kind: 'mission',
        qualified: `${projectSlug}:${bare}`,
        display: bare,
        project: projectSlug,
        name: t.missionName || bare,
      }
    } else if (t?.slug && (t.type === 'project' || !t.type)) {
      entry = {
        kind: 'project',
        qualified: `project:${t.slug}`,
        display: t.slug,
        project: t.slug,
        name: t.name || t.slug,
      }
    }

    if (!entry) return
    setRecentMissions(prev => {
      const filtered = prev.filter(e => e.qualified !== entry.qualified)
      const next = [entry, ...filtered].slice(0, 10)
      try { localStorage.setItem(RECENT_KEY(worldId), JSON.stringify(next)) } catch {}
      return next
    })
  }, [conversationTarget, selectedAgent, worldId])

  // (pendingProjects + pendingMissions declared earlier — moved above the
  // projectsList / effectiveMissions useMemos to avoid TDZ on minified build.)

  const handleCreateProjectInline = useCallback((slug, name) => {
    setPendingProjects(prev => prev.some(p => p === slug) ? prev : [...prev, slug])
    setActivePill(slug)
    // R10-13: kick a missions-tree refetch so the new project's dynamic
    // missions (if any) and agent_status row show up alongside the pill.
    setMissionsRefetchKey(k => k + 1)
  }, [])

  const handleCreateMissionInline = useCallback((projectSlug, missionSlug, missionName) => {
    setPendingMissions(prev => {
      const key = `${projectSlug}:${missionSlug}`
      if (prev.some(m => `${m.projectSlug}:${m.slug}` === key)) return prev
      return [...prev, {
        slug: missionSlug,
        name: missionName || missionSlug,
        projectSlug,
        dotStatus: 'idle',
        lastTouched: new Date().toISOString(),
      }]
    })
    // R10-13: re-fetch missions-tree so the new mission lands in the server
    // truth (via agent_status / scaffolds) and replaces the optimistic
    // placeholder on the next render.
    setMissionsRefetchKey(k => k + 1)
    if (handleSelectMission) {
      handleSelectMission(
        { slug: missionSlug, bare_slug: missionSlug, name: missionName || missionSlug, project_slug: projectSlug },
        { slug: projectSlug, name: projectSlug },
      )
    }
  }, [handleSelectMission])

  // Filter missions / tasks by active pill (effectiveMissions = real + pending)
  const filteredMissions = useMemo(() => {
    if (activePill === 'all') return effectiveMissions
    return effectiveMissions.filter(m => m.projectSlug === activePill)
  }, [effectiveMissions, activePill])

  const filteredActiveTasks = useMemo(() => {
    if (activePill === 'all') return activeTasks
    return activeTasks.filter(t => taskProjectSlug(t) === activePill)
  }, [activeTasks, activePill])

  const filteredDone = useMemo(() => {
    if (activePill === 'all') return done
    return done.filter(t => taskProjectSlug(t) === activePill)
  }, [done, activePill])

  const completedToShow = showAllCompleted ? filteredDone.slice(0, 20) : filteredDone.slice(0, COMPLETED_CAP)
  const hiddenCompletedCount = Math.max(0, filteredDone.length - COMPLETED_CAP)

  // Collapsed-state map for project groups (localStorage persisted)
  const [collapsedProjects, setCollapsedProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rm-collapsed-projects') || '{}') }
    catch { return {} }
  })
  const toggleProjectCollapse = useCallback((slug) => {
    setCollapsedProjects(prev => {
      const next = { ...prev, [slug]: !prev[slug] }
      try { localStorage.setItem('rm-collapsed-projects', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // Collapsed-state map for folders (localStorage persisted)
  const [collapsedFolders, setCollapsedFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rm-collapsed-folders') || '{}') }
    catch { return {} }
  })
  const toggleFolderCollapse = useCallback((projectSlug, folderSlug) => {
    const key = `${projectSlug}:${folderSlug}`
    setCollapsedFolders(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('rm-collapsed-folders', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // R-MP-2 — expand/collapse state for nested missions (parent → children).
  // Key is the qualified mission slug: `<projectSlug>:<raw_slug>`. Persisted
  // so the user's tree shape survives reload.
  const [expandedMissions, setExpandedMissions] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('rm-expanded-missions') || '[]')) }
    catch { return new Set() }
  })
  const toggleMissionExpand = useCallback((missionKey) => {
    setExpandedMissions(prev => {
      const next = new Set(prev)
      if (next.has(missionKey)) next.delete(missionKey); else next.add(missionKey)
      try { localStorage.setItem('rm-expanded-missions', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }, [])

  // Grouped missions (used when activePill === 'all'):
  // each group carries the project's folders + ungrouped pile.
  const groupedMissions = useMemo(() => {
    if (activePill !== 'all') return null
    const map = new Map()
    for (const m of filteredMissions) {
      const key = m.projectSlug || '__unknown__'
      if (!map.has(key)) {
        map.set(key, { projectSlug: key, missions: [], hasRunning: false, hasQueued: false, lastTouched: null })
      }
      const g = map.get(key)
      g.missions.push(m)
      if (m.dotStatus === 'running') g.hasRunning = true
      if (m.dotStatus === 'queued') g.hasQueued = true
      if (m.lastTouched && (!g.lastTouched || new Date(m.lastTouched) > new Date(g.lastTouched))) {
        g.lastTouched = m.lastTouched
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.hasRunning && !b.hasRunning) return -1
      if (!a.hasRunning && b.hasRunning) return 1
      if (a.hasQueued && !b.hasQueued) return -1
      if (!a.hasQueued && b.hasQueued) return 1
      if (a.lastTouched && b.lastTouched) return new Date(b.lastTouched) - new Date(a.lastTouched)
      if (a.lastTouched) return -1
      if (b.lastTouched) return 1
      return a.projectSlug.localeCompare(b.projectSlug)
    })
  }, [activePill, filteredMissions])

  // Summary stats — scoped to active pill
  const runningCount = filteredActiveTasks.filter(t => ['running', 'building', 'active'].includes(t.status)).length
  const queuedCount = filteredActiveTasks.filter(t => ['queued', 'planning', 'classifying'].includes(t.status)).length
  const scopeLabel = activePill === 'all' ? 'all projects' : activePill

  const lastActiveM = filteredMissions.find(m => m.lastTouched) || null
  const lastActiveAge = lastActiveM?.lastTouched ? relativeAge(lastActiveM.lastTouched) : null
  const lastActiveName = lastActiveM
    ? (activePill === 'all' ? `${lastActiveM.projectSlug}:${lastActiveM.slug}` : lastActiveM.slug)
    : null

  // ── Mission row click handler (R7-H) ────────────────────────────────────────
  // mission.slug from missions-tree API may arrive qualified ("project:slug")
  // or bare ("slug"). Normalize so the URL never double-prefixes.
  const onMissionClick = useCallback((mission) => {
    if (!handleSelectMission) return
    const rawSlug = mission.slug || ''
    const qualified = rawSlug.includes(':') ? rawSlug : `${mission.projectSlug}:${rawSlug}`
    const bareSlug = rawSlug.includes(':') ? rawSlug.split(':').slice(1).join(':') : rawSlug
    handleSelectMission(
      {
        slug: qualified,
        bare_slug: bareSlug,
        name: mission.name || bareSlug,
        project_slug: mission.projectSlug,
      },
      { slug: mission.projectSlug, name: mission.projectSlug },
    )
  }, [handleSelectMission])

  // ── Task row click handler (R7-I) ───────────────────────────────────────────
  // Prefer mission room; fall back to project room if no mission_slug.
  const onTaskClick = useCallback((task) => {
    const projectSlug = taskProjectSlug(task)
    const missionSlug = taskMissionSlug(task)
    if (handleSelectTask) {
      try { handleSelectTask(task); return }
      catch { /* fall through */ }
    }
    if (missionSlug && projectSlug && handleSelectMission) {
      handleSelectMission(
        {
          slug: `${projectSlug}:${missionSlug}`,
          bare_slug: missionSlug,
          name: task.title || missionSlug,
          project_slug: projectSlug,
        },
        { slug: projectSlug, name: projectSlug },
      )
      return
    }
    if (projectSlug && handleSelectProject) {
      handleSelectProject({ slug: projectSlug, name: projectSlug })
    }
  }, [handleSelectTask, handleSelectMission, handleSelectProject])

  // ── Render a project group with folder interleaving + nested tree ──────────
  function renderGroupBody(group) {
    const projectFolders = folders.filter(f => f.project_slug === group.projectSlug)

    // R-MP-2 — build parent → children map from parent_raw_slug. raw_slug
    // here is the flat entry's `slug` field (set from m.slug in the API,
    // which is the raw_slug from the registry; the project prefix is on
    // missionKey but not on m.slug in this codepath).
    const knownRawSlugs = new Set(group.missions.map(m => m.slug).filter(Boolean))
    const childrenByRawSlug = new Map()
    const roots = []
    for (const m of group.missions) {
      const parentInGroup = m.parent_raw_slug && knownRawSlugs.has(m.parent_raw_slug)
      if (parentInGroup) {
        if (!childrenByRawSlug.has(m.parent_raw_slug)) childrenByRawSlug.set(m.parent_raw_slug, [])
        childrenByRawSlug.get(m.parent_raw_slug).push(m)
      } else {
        roots.push(m)
      }
    }

    // Split ROOT missions: folder-bound vs ungrouped. Children come along
    // for the ride (rendered nested under their parent regardless of folder).
    const folderBuckets = new Map() // folder_slug → mission[]
    const ungrouped = []
    for (const m of roots) {
      const folderSlug = assignments[`${m.projectSlug}:${m.slug}`] || null
      if (folderSlug) {
        if (!folderBuckets.has(folderSlug)) folderBuckets.set(folderSlug, [])
        folderBuckets.get(folderSlug).push(m)
      } else {
        ungrouped.push(m)
      }
    }

    // Recursive renderer for a mission + its children (sorted by name).
    function renderMissionTreeRow(m, depth, keyPrefix) {
      const children = (childrenByRawSlug.get(m.slug) || []).slice().sort((a, b) =>
        (a.name || '').localeCompare(b.name || ''))
      const hasChildren = children.length > 0
      const missionKey = `${m.projectSlug}:${m.slug}`
      const isExpanded = expandedMissions.has(missionKey)
      // Inside the tree, indent + parent row above carry the context.
      // Strip the breadcrumb prefix (set in the flat-list builder) so the
      // visible name is just the own name (Hero, Color system, etc.).
      const treeName = (m.name || '').includes(' \u203A ')
        ? m.name.split(' \u203A ').pop()
        : (m.name || m.slug)
      const missionForRow = { ...m, name: treeName }
      return (
        <div key={`${keyPrefix}-${m.slug}`}>
          <MissionRow
            mission={missionForRow}
            projectSlug={m.projectSlug}
            dotStatus={m.dotStatus}
            ageLabel={m.lastTouched ? relativeAge(m.lastTouched) : null}
            isCurrent={
              (currentMission && m.slug === currentMission) ||
              (currentProject && m.projectSlug === currentProject && !currentMission)
            }
            hideProject={true}
            onClick={() => onMissionClick(m)}
            onContextMenu={(e) => { e.preventDefault(); openMissionMenu(e.clientX, e.clientY, { ...m, projectSlug: m.projectSlug || group?.projectSlug }, m.projectSlug || group?.projectSlug) }}
            onLongPress={openMissionMenu}
            showMove={true}
            currentFolderSlug={null}
            folders={folders}
            onMove={(missionSlug, folderSlug) => handleMoveMission(group.projectSlug, missionSlug, folderSlug)}
            onCreateFolder={handleCreateFolder}
            depth={depth}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            onToggleChildren={hasChildren ? () => toggleMissionExpand(missionKey) : null}
          />
          {hasChildren && isExpanded && children.map(c => renderMissionTreeRow(c, depth + 1, keyPrefix))}
        </div>
      )
    }
    return (
      <>
        {/* Folders, nested by parent_folder_slug. Top-level folders (parent=null)
            render as roots; subfolders render recursively under their parent. */}
        {(() => {
          const childrenOf = new Map()
          for (const f of projectFolders) {
            const key = f.parent_folder_slug || null
            if (!childrenOf.has(key)) childrenOf.set(key, [])
            childrenOf.get(key).push(f)
          }
          function renderFolderNode(folder, depth) {
            const bucket = folderBuckets.get(folder.slug) || []
            const childFolders = childrenOf.get(folder.slug) || []
            const fKey = `${folder.project_slug}:${folder.slug}`
            const isFolderCollapsed = !!collapsedFolders[fKey]
            const totalCount = bucket.length + childFolders.reduce((sum, cf) => {
              const cb = folderBuckets.get(cf.slug) || []
              return sum + cb.length
            }, 0)
            return (
              <div key={folder.slug}>
                <FolderRow
                  folder={folder}
                  count={totalCount}
                  isCollapsed={isFolderCollapsed}
                  onToggle={() => toggleFolderCollapse(group.projectSlug, folder.slug)}
                  depth={depth}
                  onContextMenu={(e) => { e.preventDefault(); openFolderMenu(e.clientX, e.clientY, folder) }}
                />
                {!isFolderCollapsed && (
                  <>
                    {childFolders.map(cf => renderFolderNode(cf, depth + 1))}
                    {bucket.map(m => renderMissionTreeRow(m, depth + 1, `folder-${folder.slug}`))}
                  </>
                )}
              </div>
            )
          }
          return (childrenOf.get(null) || []).map(root => renderFolderNode(root, 0))
        })()}
        {/* Ungrouped roots — each renders with its children nested */}
        {ungrouped.map(m => renderMissionTreeRow(m, 0, 'ungrouped'))}
      </>
    )
  }

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

      <PanelHeader action={<NewProjectAffordance onCreate={handleCreateProjectInline} worldId={worldId} />}>
        Projects
      </PanelHeader>

      <ProjectPills projects={projectsList} active={activePill} onChange={setActivePill} onPillContextMenu={(e, key, label) => { openProjectMenu(e.clientX, e.clientY, { slug: key, name: label || key }) }} />

      {/* R10-14: filter recents against the live projectsList so entries
          pointing at deleted projects auto-disappear. Patrik 2026-05-25:
          'im seeing remnants of the test chats in the recents' — Recents
          is per-browser localStorage; DB deletion can't reach it, so we
          must filter at render time. Also opportunistically prune the
          stored list so the orphans don't keep accumulating. */}
      <RecentMissionsStrip
        recents={(() => {
          const live = new Set(projectsList)
          const filtered = recentMissions.filter(e => e?.project && live.has(e.project))
          if (filtered.length !== recentMissions.length && projectsList.length > 0) {
            // Opportunistic prune: only when projectsList has loaded (don't
            // wipe everything on the loading frame).
            try { localStorage.setItem(RECENT_KEY(worldId), JSON.stringify(filtered)) } catch {}
          }
          return filtered
        })()}
        onSelect={(entry) => {
          // Backward compat: pre-R10 entries lack `kind` (always mission).
          const kind = entry.kind || 'mission'
          if (kind === 'mission' && handleSelectMission) {
            // Strip project prefix if it sneaked into display (post-R10b had it).
            const bare = (entry.display || '').includes('/')
              ? entry.display.split('/').slice(1).join('/')
              : entry.display
            handleSelectMission(
              { slug: bare, bare_slug: bare, name: entry.name, project_slug: entry.project },
              { slug: entry.project, name: entry.project },
            )
          } else if (kind === 'project' && handleSelectProject) {
            handleSelectProject({ slug: entry.project, name: entry.name || entry.project })
          }
        }}
      />

      <AccordionTabs active={activeTab} onChange={setActiveTab} />

      {/* ═══════════════ TAB: MISSIONS ═══════════════════════════ */}
      {activeTab === 'missions' && (
        <>
          {(runningCount + queuedCount) > 0 && (
            <>
              <SummaryBlock
                missionCount={filteredMissions.length}
                runningCount={runningCount}
                queuedCount={queuedCount}
                scopeLabel={scopeLabel}
                lastActiveName={lastActiveName}
                lastActiveAge={lastActiveAge}
              />
              <Divider />
            </>
          )}

          {missionsLoading && (
            <div style={{ padding: '10px 14px', fontSize: 11, color: C.muted, fontFamily: MENU.bodyFont }}>
              Loading…
            </div>
          )}

          {!missionsLoading && filteredMissions.length === 0 && (
            <EmptyState text={activePill === 'all' ? 'No missions yet' : `No missions in ${activePill}`} />
          )}

          {/* ALL view: project group accordions, folders interleaved */}
          {activePill === 'all' && groupedMissions && groupedMissions.map(group => {
            const idleDefault = !group.hasRunning && !group.hasQueued
            const isCollapsed = collapsedProjects.hasOwnProperty(group.projectSlug)
              ? collapsedProjects[group.projectSlug]
              : idleDefault
            return (
              <div key={group.projectSlug}>
                <ProjectGroupHeader
                  projectSlug={group.projectSlug}
                  count={group.missions.length}
                  isRunning={group.hasRunning}
                  isQueued={group.hasQueued}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleProjectCollapse(group.projectSlug)}
                  onContextMenu={(e) => { e.preventDefault(); openProjectMenu(e.clientX, e.clientY, { slug: group.projectSlug, name: group.projectSlug }) }}
                />
                {!isCollapsed && renderGroupBody(group)}
              </div>
            )
          })}

          {/* Specific pill view: flat list (no grouping). Folders still shown
              if any exist for this project. */}
          {activePill !== 'all' && (
            (() => {
              const projectFolders = folders.filter(f => f.project_slug === activePill)
              const folderBuckets = new Map()
              const ungrouped = []
              for (const m of filteredMissions) {
                const folderSlug = assignments[`${m.projectSlug}:${m.slug}`] || null
                if (folderSlug) {
                  if (!folderBuckets.has(folderSlug)) folderBuckets.set(folderSlug, [])
                  folderBuckets.get(folderSlug).push(m)
                } else {
                  ungrouped.push(m)
                }
              }
              return (
                <>
                  {/* Affordances retired — right-click ProjectGroupHeader or
                      FolderRow to create missions / folders / subfolders. */}
                  {projectFolders.map(folder => {
                    const bucket = folderBuckets.get(folder.slug) || []
                    const fKey = `${folder.project_slug}:${folder.slug}`
                    const isFolderCollapsed = !!collapsedFolders[fKey]
                    return (
                      <div key={folder.slug}>
                        <FolderRow
                          folder={folder}
                          count={bucket.length}
                          isCollapsed={isFolderCollapsed}
                          onToggle={() => toggleFolderCollapse(activePill, folder.slug)}
                          onContextMenu={(e) => { e.preventDefault(); openFolderMenu(e.clientX, e.clientY, folder) }}
                        />
                        {!isFolderCollapsed && bucket.map((m, i) => (
                          <MissionRow
                            key={`${folder.slug}-${m.slug}-${i}`}
                            mission={m}
                            projectSlug={m.projectSlug}
                            dotStatus={m.dotStatus}
                            ageLabel={m.lastTouched ? relativeAge(m.lastTouched) : null}
                            isCurrent={
                              (currentMission && m.slug === currentMission) ||
                              (currentProject && m.projectSlug === currentProject && !currentMission)
                            }
                            hideProject={false}
                            onClick={() => onMissionClick(m)}
                            onContextMenu={(e) => { e.preventDefault(); openMissionMenu(e.clientX, e.clientY, m, m.projectSlug) }}
                            onLongPress={openMissionMenu}
                            showMove={true}
                            currentFolderSlug={folder.slug}
                            folders={folders}
                            onMove={(missionSlug, folderSlug) => handleMoveMission(activePill, missionSlug, folderSlug)}
                            onCreateFolder={handleCreateFolder}
                          />
                        ))}
                      </div>
                    )
                  })}
                  {ungrouped.map((m, i) => (
                    <MissionRow
                      key={`ungrouped-${m.slug}-${i}`}
                      mission={m}
                      projectSlug={m.projectSlug}
                      dotStatus={m.dotStatus}
                      ageLabel={m.lastTouched ? relativeAge(m.lastTouched) : null}
                      isCurrent={
                        (currentMission && m.slug === currentMission) ||
                        (currentProject && m.projectSlug === currentProject && !currentMission)
                      }
                      hideProject={false}
                      onClick={() => onMissionClick(m)}
                      onContextMenu={(e) => { e.preventDefault(); openMissionMenu(e.clientX, e.clientY, m, m.projectSlug) }}
                      onLongPress={openMissionMenu}
                      showMove={true}
                      currentFolderSlug={null}
                      folders={folders}
                      onMove={(missionSlug, folderSlug) => handleMoveMission(activePill, missionSlug, folderSlug)}
                      onCreateFolder={handleCreateFolder}
                    />
                  ))}
                </>
              )
            })()
          )}
        </>
      )}

      {/* ═══════════════ TAB: TASKS ══════════════════════════════ */}
      {activeTab === 'tasks' && (
        <>
          {filteredActiveTasks.length > 0 ? (
            <>
              <SectionLabel>Active</SectionLabel>
              {filteredActiveTasks.map(task => (
                <TaskRow key={task.id} task={task} isDone={false} onClick={() => onTaskClick(task)} />
              ))}
              <Divider />
            </>
          ) : (
            <EmptyState text="No active tasks" />
          )}

          <SectionLabel>Completed</SectionLabel>
          {filteredDone.length === 0 && (
            <EmptyState text="No completed tasks yet" />
          )}
          {completedToShow.map(task => (
            <TaskRow key={task.id} task={task} isDone={true} onClick={() => onTaskClick(task)} />
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
        <FilesPanel projectSlug={activePill === 'all' ? (currentProject || projectsList[0] || null) : activePill} />
      )}

      <div style={{ height: 24, flexShrink: 0 }} />

      {ctxMenu?.kind === 'mission' && (
        <MissionContextMenu
          open
          x={ctxMenu.x}
          y={ctxMenu.y}
          mission={ctxMenu.mission}
          folders={folders}
          mobile={isMobile}
          onClose={closeCtxMenu}
          onAgentPrompt={handleAgentPrompt}
          onRename={handleMissionRename}
          onDelete={handleMissionDelete}
          onCreateSubfolder={handleCreateSubfolderForMission}
          onMoveToFolder={handleMissionMoveToFolder}
        />
      )}
      {ctxMenu?.kind === 'project' && (
        <ProjectContextMenu
          open
          x={ctxMenu.x}
          y={ctxMenu.y}
          project={ctxMenu.project}
          folders={folders}
          mobile={isMobile}
          onClose={closeCtxMenu}
          onAgentPrompt={handleAgentPrompt}
          onRename={handleProjectRename}
          onDelete={handleProjectDelete}
          onCreateSubfolder={handleCreateSubfolderForProject}
          onMoveToFolder={() => { /* projects-as-folders TBD; no-op for now */ closeCtxMenu() }}
        />
      )}
      {ctxMenu?.kind === 'folder' && (
        <FolderContextMenu
          open
          x={ctxMenu.x}
          y={ctxMenu.y}
          folder={ctxMenu.folder}
          mobile={isMobile}
          onClose={closeCtxMenu}
          onCreateSubfolder={handleCreateSubfolderUnderFolder}
          onCreateMission={handleCreateMissionInFolder}
          onRename={handleFolderRename}
          onDelete={handleFolderDelete}
        />
      )}
    </div>
  )
}
