// ProjectCard — per-project living summary card with inline accordion.
// R6b (Apr 19, 2026): renders in the Tasks view list when no project filter
// is active. Header shows name, one-line active summary, and a freshness
// label sourced from the project_summary event (written by
// scripts/project-summary-daemon.py into CONTEXT.md + events table).
// Expanding reveals recent shipped, queued count, and next action.
//
// Accordion is single-active across siblings (parent owns expanded state);
// header is a real <button> with aria-expanded/aria-controls for keyboard +
// screen-reader access. Minimum 44px touch target per the R6 research brief.
import { useEffect, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'

function ageLabelOf(rowMs) {
  if (!rowMs) return '—'
  const secs = Math.max(0, Math.round((Date.now() - rowMs) / 1000))
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}

function stripMdInline(text) {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

function oneLineSummary(md) {
  const lines = String(md || '').split('\n').map(s => s.trim()).filter(Boolean)
  if (lines.length === 0) return ''
  const first = lines[0].replace(/^[#>\-*\s]+/, '')
  return stripMdInline(first)
}

export default function ProjectCard({
  slug,
  name,
  color = '#6B8AB0',
  expanded,
  onToggle,
  nextActionFallback = '',
}) {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, setNowTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchLatest = async () => {
      try {
        const resp = await fetch(
          `/api/dashboard/project-summary?slug=${encodeURIComponent(slug)}`
        )
        if (cancelled) return
        if (resp.ok) {
          const data = await resp.json().catch(() => null)
          if (!cancelled) setEvent(data?.event || null)
        }
      } catch {
        // swallow — next tick retries
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchLatest()
    const iv = window.setInterval(fetchLatest, 15000)
    return () => { cancelled = true; window.clearInterval(iv) }
  }, [slug])

  // Re-render once a minute so the "X ago" label stays accurate.
  useEffect(() => {
    if (!event) return
    const iv = window.setInterval(() => setNowTick(t => t + 1), 60000)
    return () => window.clearInterval(iv)
  }, [event])

  const payload = event?.payload || null
  const rowMs = event?.timestamp ? Date.parse(event.timestamp) : null
  const ageLabel = ageLabelOf(rowMs)
  const openN = payload?.open_task_count ?? null
  const doneArr = Array.isArray(payload?.recent_completions)
    ? payload.recent_completions
    : []
  const summaryText = oneLineSummary(payload?.summary_md || '')
  const lastHumanIntent = (payload?.last_human_intent || '').trim()
  const nextAction = lastHumanIntent || nextActionFallback || ''

  const panelId = `project-card-panel-${slug}`
  const headerId = `project-card-header-${slug}`

  return (
    <div
      style={{
        marginBottom: 10,
        borderRadius: 14,
        background: C.s1,
        border: `1px solid ${C.border2}`,
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          height: 2,
          background: `linear-gradient(90deg, ${color}, ${color}44)`,
        }}
      />

      <button
        id={headerId}
        type="button"
        onClick={onToggle}
        aria-expanded={!!expanded}
        aria-controls={panelId}
        style={{
          width: '100%',
          minHeight: 44,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
              letterSpacing: '-0.01em',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: summaryText ? C.text2 : C.dim,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
            }}
          >
            {summaryText
              || (loading
                ? 'Loading…'
                : event
                  ? '—'
                  : 'Awaiting first event')}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span
            title={event?.timestamp || ''}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: C.muted,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {event ? ageLabel : '—'}
          </span>
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.muted}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          style={{
            padding: '12px 16px 14px',
            borderTop: `1px solid ${C.border2}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            {openN != null && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.text,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
                }}
              >
                {openN} queued
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.accent,
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.18)',
              }}
            >
              {doneArr.length} shipped
            </span>
          </div>

          {doneArr.length > 0 && (
            <div style={{ marginBottom: nextAction ? 12 : 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}
              >
                Shipped recently
              </div>
              {doneArr.slice(0, 3).map((row, i) => {
                const label = typeof row === 'string'
                  ? row
                  : (row?.title || row?.summary || row?.id || '')
                if (!label) return null
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: C.text2,
                      lineHeight: 1.45,
                      paddingLeft: 12,
                      position: 'relative',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 7,
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: C.dim,
                      }}
                    />
                    {label}
                  </div>
                )
              })}
            </div>
          )}

          {nextAction && (
            <div
              style={{
                fontSize: 12,
                color: C.text2,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${C.border2}`,
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 4,
                }}
              >
                Next
              </div>
              {nextAction}
            </div>
          )}

          {!doneArr.length && !nextAction && openN == null && (
            <div style={{ fontSize: 12, color: C.dim, padding: '4px 0' }}>
              No recent activity yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
