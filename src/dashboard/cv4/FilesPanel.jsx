// CV4 FilesPanel — project canon files, simple rows.
//
// Mission: corner:right-menu (R4+ — files section redesign)
// Pattern: old task-menu row design (ActiveTasksSection / DoneTasksSection cadence)
// Shows: VISION, CONTEXT, BUILD, RESEARCH — the canon files only, cleanly.
// No modal, no complex tree. Just straightforward file list in the right rail.
//
// Scoped project passed via projectSlug prop. When projectSlug is set,
// fetch and display that project's canon files. Uses a simple REST call
// to a file-list endpoint (no modal, no ProjectFileReader).

import { useEffect, useMemo, useState, useCallback } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeAge(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 90) return 'now'
  if (diff < 3600) return Math.round(diff / 60) + 'm'
  if (diff < 86400) return Math.round(diff / 3600) + 'h'
  const days = Math.round(diff / 86400)
  if (days < 7) return days + 'd'
  if (days < 60) return Math.round(days / 7) + 'w'
  return Math.round(days / 30) + 'mo'
}

// ── File row — task-menu pattern (simple + clean) ──────────────────────────

function FileRow({ name, url, age }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        cursor: 'pointer',
        transition: 'background 120ms ease',
        minHeight: 34,
        textDecoration: 'none',
        color: 'inherit',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.s1 }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 12,
        fontWeight: 500,
        color: C.text,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        fontFamily: "'Inter', sans-serif",
      }}>{name}</span>
      {age && (
        <span style={{
          fontSize: 10, color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}>{age}</span>
      )}
    </a>
  )
}

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

// ── Main component ─────────────────────────────────────────────────────────

export default function FilesPanel({ projectSlug }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch canon files when projectSlug changes
  useEffect(() => {
    if (!projectSlug) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const r = await authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(projectSlug)}`)
        if (cancelled || !r.ok) return
        const body = await r.json().catch(() => null)
        if (cancelled || !body) return

        // Filter to canon files only: VISION, CONTEXT, BUILD, RESEARCH
        const canons = (body.files || [])
          .filter(f => f.kind === 'canon')
          .map(f => ({
            name: f.name.replace(/\.md$/, ''),
            path: f.path,
            age: relativeAge(f.last_modified),
          }))
          .sort((a, b) => {
            // Sort: VISION, CONTEXT, BUILD, RESEARCH
            const order = { VISION: 0, CONTEXT: 1, BUILD: 2, RESEARCH: 3 }
            const aOrder = order[a.name] ?? 99
            const bOrder = order[b.name] ?? 99
            return aOrder - bOrder
          })

        if (!cancelled) {
          setFiles(canons)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectSlug])

  // No project: empty state
  if (!projectSlug) {
    return <EmptyState text="Open a project to see files." />
  }

  // Loading
  if (loading) {
    return <EmptyState text="Loading…" />
  }

  // Empty
  if (files.length === 0) {
    return <EmptyState text="No files yet." />
  }

  // Render: each file as a clickable row
  return (
    <>
      {files.map(f => (
        <FileRow key={f.path} name={f.name} url={f.path} age={f.age} />
      ))}
    </>
  )
}
