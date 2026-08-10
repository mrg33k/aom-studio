import { C } from '../../../lib/cv3Colors.js'
import { useEffect, useState } from 'react'
import { useCornerNav } from '../../../CornerContext.jsx'
import { authFetch } from '../../../lib/authFetch.js'

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
    case 'MISSION': return '🎯'
    default: return '📝'
  }
}

function docLabel(type) {
  return type === 'MISSION' ? 'New mission' : `${type} updated`
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
  const [missions, setMissions] = useState([])
  const [expanded, setExpanded] = useState(!compact)
  const { handleSelectProject, handleSelectMission } = useCornerNav()

  const openRoom = (u) => {
    if (u.mission) {
      handleSelectMission({ slug: u.mission, name: u.mission }, { slug: u.project, name: u.project })
    } else {
      handleSelectProject({ slug: u.project, name: u.project })
    }
  }

  useEffect(() => {
    if (!project) return
    let cancelled = false
    const fetchAll = async () => {
      try {
        const qs = new URLSearchParams({ project, limit: String(limit) })
        if (mission) qs.set('mission', mission)
        const [docsR, missR] = await Promise.all([
          authFetch(`/api/dashboard/doc-updates?${qs.toString()}`),
          authFetch(`/api/dashboard/missions-created?project=${encodeURIComponent(project)}&limit=5`),
        ])
        if (!cancelled) {
          if (docsR.ok) {
            const j = await docsR.json()
            setUpdates(Array.isArray(j.updates) ? j.updates : [])
          }
          if (missR.ok) {
            const j = await missR.json()
            setMissions(Array.isArray(j.missions) ? j.missions : [])
          }
        }
      } catch (_) {}
    }
    fetchAll()
    const id = setInterval(fetchAll, 15_000)
    const visHandler = () => { if (document.visibilityState === 'visible') fetchAll() }
    document.addEventListener('visibilitychange', visHandler)
    return () => { cancelled = true; clearInterval(id); document.removeEventListener('visibilitychange', visHandler) }
  }, [project, mission, limit])

  // Merge mission_created into updates with a synthetic doc_type='MISSION' so the
  // stripe renders one unified feed.
  const merged = [
    ...missions.map(m => ({
      id: `mission-${m.id}`,
      doc_type: 'MISSION',
      summary: m.description || `New mission: ${m.mission}`,
      file: m.mission,
      project: m.project,
      mission: m.mission,
      file_count: m.file_count,
      timestamp: m.timestamp,
    })),
    ...updates,
  ].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, limit)

  if (!merged.length) return null

  const latest = merged[0]
  const extra = merged.length - 1

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
        <span style={{ fontWeight: 600 }}>{docLabel(latest.doc_type)}</span>
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
          recent doc + mission updates · click to collapse
        </div>
      )}
      {merged.map((u) => (
        <div
          key={u.id}
          data-testid={u.doc_type === 'MISSION' ? 'mission-created-card' : 'doc-update-card'}
          data-doc-type={u.doc_type}
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            background: C.surfaceAlt || 'rgba(255,255,255,0.02)',
            display: 'flex', flexDirection: 'column', gap: 6,
            fontSize: 13, color: C.text,
          }}
        >
          {/* Room link — the first thing in the card, one-click jump into the room */}
          <button
            onClick={() => openRoom(u)}
            style={{
              alignSelf: 'flex-start',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, margin: 0,
              fontSize: 11, fontWeight: 600,
              color: C.accent || '#c8a96e',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
              letterSpacing: '0.02em',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Open room
          </button>
          {/* Card body — icon + label + path + summary */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 16, lineHeight: '18px' }}>{docIcon(u.doc_type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{docLabel(u.doc_type)}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>
                  {u.doc_type === 'MISSION'
                    ? `${u.project}/${u.mission}${u.file_count ? ` · ${u.file_count} files` : ''}`
                    : (u.mission ? `${u.project}/${u.mission}` : u.project)}
                </span>
                <span style={{ color: C.muted, fontSize: 11, marginLeft: 'auto' }}>{relTime(u.timestamp)}</span>
              </div>
              <div style={{ color: C.muted, marginTop: 2, wordBreak: 'break-word' }}>{u.summary}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
