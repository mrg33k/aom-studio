// LivingParagraphCard -- R62 + R62-writer.
//
// Shows a story-form paragraph above WeeklyStatsCard + ActiveTasksSection on
// the tasks view. VISION Pillar 2 living paragraph; R62-writer (session 21)
// switched the source from a template-synthesis endpoint to an LLM-composed
// narrative written to the events table (event_type='project_narrative').
//
// Load order:
//   1. Fetch /api/dashboard/project-narrative (R62-writer cache).
//      - empty → fall back to /api/dashboard/project-paragraph template.
//      - populated → render the overview; show "read more" that expands details.
//   2. Subscribe to Supabase realtime on events table for event_type='project_
//      narrative'. When a new row arrives that matches scope + tenant, update
//      paragraph + details in place. No polling.
//
// "All" scope → tenant-wide narrative. Project pill selected → scoped.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'

export default function LivingParagraphCard({ world, activeProject }) {
  const scope = !activeProject || activeProject === 'all' ? 'all' : activeProject
  const [overview, setOverview] = useState('')
  const [details, setDetails] = useState('')
  const [composedAt, setComposedAt] = useState(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [fallbackDetail, setFallbackDetail] = useState(null)
  const [error, setError] = useState(null)

  // Initial load: try narrative cache first, then fall back to template endpoint.
  useEffect(() => {
    if (!world) return
    let active = true
    setLoading(true)
    setError(null)
    setExpanded(false)
    setFallbackDetail(null)

    const loadNarrative = async () => {
      try {
        const resp = await authFetch(`/api/dashboard/project-narrative?world=${encodeURIComponent(world)}&scope=${encodeURIComponent(scope)}`)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        if (!active) return
        if (data?.empty) {
          // fall back to template endpoint
          const fb = await authFetch(`/api/dashboard/project-paragraph?world=${encodeURIComponent(world)}&scope=${encodeURIComponent(scope)}`)
          if (fb.ok) {
            const fbData = await fb.json()
            if (active) {
              setOverview(fbData?.paragraph || '')
              setDetails('')
              setComposedAt(fbData?.updated_at || null)
              setUsingFallback(true)
            }
          } else {
            if (active) setOverview('')
          }
        } else {
          setOverview(data?.overview || '')
          setDetails(data?.details || '')
          setComposedAt(data?.composed_at || null)
          setUsingFallback(false)
        }
      } catch (err) {
        if (active) setError(err.message || 'fetch failed')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadNarrative()
    return () => { active = false }
  }, [world, scope])

  // Realtime: subscribe to project_narrative event inserts for this tenant+scope.
  // Supabase channel filter is single-column, so we filter by agent (scope
  // signal) server-side and validate tenant + event_type client-side.
  useEffect(() => {
    if (!world || !supabase) return
    const chan = supabase
      .channel(`r62w-narrative-${world}-${scope}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events', filter: `agent=eq.${scope}` },
        (payload) => {
          const row = payload?.new
          if (!row) return
          if (row.event_type !== 'project_narrative') return
          const p = row.payload || {}
          if ((p.tenant_id || '') !== world) return
          // Ignore stale inserts (should not happen since realtime is monotonic).
          const nextAt = p.composed_at || row.timestamp
          if (composedAt && nextAt && new Date(nextAt) < new Date(composedAt)) return
          setOverview(p.overview || '')
          setDetails(p.details || '')
          setComposedAt(nextAt || null)
          setUsingFallback(false)
          setExpanded(false)
          setError(null)
        })
      .subscribe()
    return () => {
      try { supabase.removeChannel(chan) } catch (_) {}
    }
  }, [world, scope, composedAt])

  // Lazy fetch fallback detail block on first expand (only for template-path paragraphs).
  useEffect(() => {
    if (!expanded || !usingFallback || fallbackDetail || !world) return
    authFetch(`/api/dashboard/project-paragraph?world=${encodeURIComponent(world)}&scope=${encodeURIComponent(scope)}&expanded=1`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.detail) setFallbackDetail(data.detail) })
      .catch(() => {})
  }, [expanded, usingFallback, fallbackDetail, world, scope])

  const showOverview = useMemo(() => {
 if (error && !overview) return `(living paragraph unavailable, ${error})`
    if (loading && !overview) return 'Loading…'
 return overview || '·'
  }, [error, loading, overview])

  const hasDetails = (!usingFallback && !!details) || usingFallback

  return (
    <div
      data-testid="living-paragraph"
      data-scope={scope}
      data-source={usingFallback ? 'template' : 'narrative'}
      style={{ marginBottom: 28 }}
    >
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
              whiteSpace: 'pre-wrap',
            }}
          >
            {showOverview}
          </p>
          {overview && hasDetails && (
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
                whiteSpace: 'pre-wrap',
              }}
            >
              {usingFallback
                ? <FallbackDetailBlock detail={fallbackDetail} />
                : (details || 'No additional detail yet.')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FallbackDetailBlock({ detail }) {
  if (!detail) return <span style={{ color: C.muted }}>Loading detail…</span>
  const entries = []
  if (Array.isArray(detail.recent_messages) && detail.recent_messages.length) {
    entries.push(
      <section key="rm" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 4 }}>Recent messages</div>
        {detail.recent_messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
 <span style={{ color: C.muted, fontSize: 11 }}>{m.when}</span>, {m.preview || '(no preview)'}
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
 <span style={{ color: C.muted, fontSize: 11 }}>{m.when} · {m.project}</span>, {m.preview || '(no preview)'}
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
 <span style={{ color: C.muted, fontSize: 11 }}>{e.when}</span>, {e.type}
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
 <span style={{ color: C.muted, fontSize: 11 }}>{t.updated}</span>, {t.title}
          </div>
        ))}
      </section>
    )
  }
  if (!entries.length) return <span style={{ color: C.muted }}>No recent detail to show.</span>
  return <>{entries}</>
}