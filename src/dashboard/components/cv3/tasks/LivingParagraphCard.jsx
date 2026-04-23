// LivingParagraphCard -- R62 (session 20). Context-aware 2-3 sentence
// paragraph that sits above the WeeklyStatsCard + ActiveTasksSection
// stack on the tasks view. VISION Pillar 2 living greeting-paragraph.
//
// "All" scope → roundup across every project in the last 7 days.
// Project pill selected → scoped 14-day summary for that project.
// Read-more toggle expands a detail block (recent messages, scaffold
// events, open tasks) sourced from the same endpoint with expanded=1.
//
// Backend: /api/dashboard/project-paragraph (R62 endpoint). A deferred
// R62-writer sub-round will move this to a daemon-written project_state_
// summary cache table; today every request recomposes from source.
import { useEffect, useMemo, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'

export default function LivingParagraphCard({ world, activeProject }) {
  const scope = !activeProject || activeProject === 'all' ? 'all' : activeProject
  const [paragraph, setParagraph] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)

  // Fetch the paragraph when scope changes.
  useEffect(() => {
    if (!world) return
    let active = true
    setLoading(true)
    setError(null)
    setExpanded(false)
    setDetail(null)
    fetch(`/api/dashboard/project-paragraph?world=${encodeURIComponent(world)}&scope=${encodeURIComponent(scope)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { if (active) { setParagraph(data?.paragraph || ''); setLoading(false) } })
      .catch(err => { if (active) { setError(err.message || 'fetch failed'); setLoading(false) } })
    return () => { active = false }
  }, [world, scope])

  // Lazy fetch the detail block on first expand.
  useEffect(() => {
    if (!expanded || detail || !world) return
    fetch(`/api/dashboard/project-paragraph?world=${encodeURIComponent(world)}&scope=${encodeURIComponent(scope)}&expanded=1`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.detail) setDetail(data.detail) })
      .catch(() => {})
  }, [expanded, detail, world, scope])

  const showParagraph = useMemo(() => {
    if (error) return `(living paragraph unavailable — ${error})`
    if (loading && !paragraph) return 'Loading…'
    return paragraph || '—'
  }, [error, loading, paragraph])

  return (
    <div data-testid="living-paragraph" data-scope={scope} style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 9, height: 9, borderRadius: '50%',
          marginTop: 14,
          background: C.accent,
          boxShadow: `0 0 8px ${C.accent}`,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            data-testid="living-paragraph-text"
            style={{
              fontSize: 'clamp(18px, 2.2vw, 22px)',
              fontWeight: 700,
              lineHeight: 1.35,
              letterSpacing: '-0.015em',
              color: C.text,
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {showParagraph}
          </p>
          {paragraph && (
            <button
              type="button"
              data-testid="living-paragraph-read-more"
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded ? 'true' : 'false'}
              style={{
                marginTop: 8,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 600,
                color: C.muted,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {expanded ? 'show less' : 'read more'}
            </button>
          )}
          {expanded && (
            <div
              data-testid="living-paragraph-detail"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${C.border}`,
                fontSize: 13,
                lineHeight: 1.55,
                color: C.text2,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <DetailBlock detail={detail} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailBlock({ detail }) {
  if (!detail) return <span style={{ color: C.muted }}>Loading detail…</span>
  const entries = []
  if (Array.isArray(detail.recent_messages) && detail.recent_messages.length) {
    entries.push(
      <section key="rm" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 4 }}>Recent messages</div>
        {detail.recent_messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 11 }}>{m.when}</span> — {m.preview || '(no preview)'}
          </div>
        ))}
      </section>
    )
  }
  if (Array.isArray(detail.recent_activity) && detail.recent_activity.length) {
    entries.push(
      <section key="ra" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 4 }}>Recent activity</div>
        {detail.recent_activity.map((m, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 11 }}>{m.when} · {m.project}</span> — {m.preview || '(no preview)'}
          </div>
        ))}
      </section>
    )
  }
  if (Array.isArray(detail.scaffold_events) && detail.scaffold_events.length) {
    entries.push(
      <section key="se" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 4 }}>Scaffold changes</div>
        {detail.scaffold_events.map((e, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 11 }}>{e.when}</span> — {e.type}
            {e.meta?.filename ? `: ${e.meta.filename}` : ''}
          </div>
        ))}
      </section>
    )
  }
  if (Array.isArray(detail.open_tasks) && detail.open_tasks.length) {
    entries.push(
      <section key="ot">
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 4 }}>Open tasks</div>
        {detail.open_tasks.map((t, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 11 }}>{t.updated}</span> — {t.title}
          </div>
        ))}
      </section>
    )
  }
  if (!entries.length) return <span style={{ color: C.muted }}>No recent detail to show.</span>
  return <>{entries}</>
}
