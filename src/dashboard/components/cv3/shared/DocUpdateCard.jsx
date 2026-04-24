import { C } from '../../../lib/cv3Colors.js'
import { useEffect, useState } from 'react'

// R75-h1: compact "doc updated" card. Fetches /api/dashboard/doc-updates
// scoped by project (+ optional mission) and renders the latest N as a
// collapsible stripe at the top of a chat thread. Same visual grammar as
// TaskStatusCard so the thread reads as one consistent surface.
//
// Props:
//   project   string  — required. Project slug (e.g. 'corner').
//   mission   string  — optional. Mission slug to scope to (e.g. 'launch-mvp').
//   limit     number  — default 5. Max cards to show.
//   compact   bool    — default true. Shows a single-line summary row that
//                        expands on click. false → always expanded.

function docIcon(type) {
  switch (type) {
    case 'VISION': return '✨'
    case 'BUILD': return '🔨'
    case 'CONTEXT': return '📍'
    case 'RESEARCH': return '🔬'
    default: return '📝'
  }
}

function relTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const now = Date.now()
  const s = Math.floor((now - then) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

export default function DocUpdatesStripe({ project, mission = '', limit = 5, compact = true }) {
  const [updates, setUpdates] = useState([])
  const [expanded, setExpanded] = useState(!compact)

  useEffect(() => {
    if (!project) return
    let cancelled = false
    const fetchUpdates = async () => {
      try {
        const qs = new URLSearchParams({ project, limit: String(limit) })
        if (mission) qs.set('mission', mission)
        const r = await fetch(`/api/dashboard/doc-updates?${qs.toString()}`)
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled) setUpdates(Array.isArray(j.updates) ? j.updates : [])
      } catch (_) {}
    }
    fetchUpdates()
    const id = setInterval(fetchUpdates, 15_000)
    const visHandler = () => { if (document.visibilityState === 'visible') fetchUpdates() }
    document.addEventListener('visibilitychange', visHandler)
    return () => { cancelled = true; clearInterval(id); document.removeEventListener('visibilitychange', visHandler) }
  }, [project, mission, limit])

  if (!updates.length) return null

  const latest = updates[0]
  const extra = updates.length - 1

  if (compact && !expanded) {
    return (
      <div
        data-testid="doc-updates-stripe"
        onClick={() => setExpanded(true)}
        style={{
          cursor: 'pointer',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '8px 12px',
          margin: '4px 0 8px',
          background: C.surfaceAlt || 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, color: C.text,
        }}
      >
        <span style={{ fontSize: 16 }}>{docIcon(latest.doc_type)}</span>
        <span style={{ fontWeight: 600 }}>{latest.doc_type}</span>
        <span style={{ color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {latest.summary}
        </span>
        <span style={{ color: C.muted, fontSize: 11 }}>{relTime(latest.timestamp)}</span>
        {extra > 0 && (
          <span style={{ color: C.muted, fontSize: 11, marginLeft: 4 }}>+{extra} more</span>
        )}
      </div>
    )
  }

  return (
    <div data-testid="doc-updates-stripe" style={{ margin: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {compact && (
        <div
          onClick={() => setExpanded(false)}
          style={{ cursor: 'pointer', fontSize: 11, color: C.muted, padding: '0 4px' }}
        >
          recent doc updates · click to collapse
        </div>
      )}
      {updates.map((u) => (
        <div
          key={u.id}
          data-testid="doc-update-card"
          data-doc-type={u.doc_type}
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            background: C.surfaceAlt || 'rgba(255,255,255,0.02)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontSize: 13, color: C.text,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: '18px' }}>{docIcon(u.doc_type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>{u.doc_type} updated</span>
              <span style={{ color: C.muted, fontSize: 11 }}>{u.mission ? `${u.project}/${u.mission}` : u.project}</span>
              <span style={{ color: C.muted, fontSize: 11, marginLeft: 'auto' }}>{relTime(u.timestamp)}</span>
            </div>
            <div style={{ color: C.muted, marginTop: 2, wordBreak: 'break-word' }}>{u.summary}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
