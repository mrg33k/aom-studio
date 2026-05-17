// MissionStateCard -- corner:mission-rooms R4
//
// Renders the "where are we" snapshot at the top of a mission room so the
// user sees the state of the mission the moment they walk in. Fixes the
// "the room feels empty when I arrive" problem.
//
// Data: /api/dashboard/mission-state?project=<slug>&mission=<rawOrQualified>
//
// The card has three slots:
//   1. Title row: mission name + status pill (or DONE pill)
//   2. Headline: first paragraph of the mission CONTEXT.md (clamped)
//   3. Footer: "Last touched X ago in chat" + optional "next" chip
//
// If the room is empty (zero messages yet), a "Get started" prompt
// surfaces so a single click kicks off the conversation. That is the
// existing-mission equivalent of launch-kicks-the-agent for missions
// that already have an on-disk home.

import { useEffect, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'

function timeAgo(iso) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return null
  const now = Date.now()
  const sec = Math.max(0, Math.round((now - then) / 1000))
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 14) return `${day}d ago`
  const wk = Math.round(day / 7)
  if (wk < 8) return `${wk}w ago`
  const mo = Math.round(day / 30)
  return `${mo}mo ago`
}

function StatusPill({ status, is_done }) {
  if (!status && !is_done) return null
  const label = (is_done ? 'done' : status).toString().toLowerCase()
  const tone = is_done
    ? { bg: 'rgba(110,110,110,0.18)', fg: '#9ca3af', border: 'rgba(255,255,255,0.10)' }
    : label === 'unscaffolded'
      ? { bg: 'rgba(248,113,113,0.10)', fg: '#fca5a5', border: 'rgba(248,113,113,0.30)' }
      : { bg: 'rgba(16,185,129,0.10)', fg: '#6ee7b7', border: 'rgba(16,185,129,0.32)' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      fontFamily: "'JetBrains Mono', monospace",
      padding: '2px 7px',
      borderRadius: 5,
      background: tone.bg, color: tone.fg,
      border: `1px solid ${tone.border}`,
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>{label.slice(0, 32)}</span>
  )
}

export default function MissionStateCard({
  projectSlug,
  missionSlug,
  missionName,
  onAskStarter,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // UI-first: the moment the user clicks "Where are we?", the activity
  // has begun. Hide the button immediately — don't wait for the server
  // round-trip or a re-fetch to confirm message_count > 0. The CTA is
  // for empty rooms; clicking it makes the room no longer empty.
  const [kicked, setKicked] = useState(false)
  // Reset kicked when the room actually changes.
  useEffect(() => { setKicked(false) }, [projectSlug, missionSlug])

  useEffect(() => {
    if (!projectSlug || !missionSlug) {
      setData(null); setLoading(false); return
    }
    let cancelled = false
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const url = `/api/dashboard/mission-state?project=${encodeURIComponent(projectSlug)}&mission=${encodeURIComponent(missionSlug)}`
        const r = await authFetch(url, { credentials: 'include' })
        if (!r.ok) {
          if (!cancelled) { setError(`HTTP ${r.status}`); setLoading(false) }
          return
        }
        const j = await r.json().catch(() => null)
        if (!cancelled) { setData(j); setLoading(false) }
      } catch (e) {
        if (!cancelled) { setError(String(e)); setLoading(false) }
      }
    })()
    return () => { cancelled = true }
  }, [projectSlug, missionSlug])

  if (!projectSlug || !missionSlug) return null

  const displayName = data?.name || missionName || missionSlug
  const lastTouchedIso = data?.last_message_at || data?.last_updated_disk || null
  const lastTouchedLabel = lastTouchedIso ? timeAgo(lastTouchedIso) : null
  const lastTouchedSource = data?.last_message_at ? 'chat' : (data?.last_updated_disk ? 'disk' : null)
  const isEmptyRoom = data && (data.message_count || 0) === 0 && !kicked

  return (
    <div
      data-mission-state-card
      data-mission-slug={data?.slug || missionSlug}
      style={{
        margin: '10px 14px 4px 14px',
        padding: '11px 13px 10px 13px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'Inter', sans-serif",
        display: 'flex', flexDirection: 'column', gap: 6,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: C.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
        }}>{displayName}</span>
        {data && <StatusPill status={data.status} is_done={data.is_done} />}
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
          Reading the mission's state…
        </div>
      )}

      {!loading && error && (
        <div style={{ fontSize: 12, color: '#f59e0b' }}>
          State unavailable ({error}). The chat still works — ask the agent what's going on.
        </div>
      )}

      {!loading && !error && data && data.headline && (
        <div style={{
          fontSize: 12.5, lineHeight: 1.5, color: C.text2,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {data.headline}
        </div>
      )}

      {!loading && !error && data && data.next_line && (
        <div style={{
          fontSize: 11.5, lineHeight: 1.4, color: '#a7f3d0',
          padding: '4px 8px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.18)',
          borderRadius: 6,
          marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          <span style={{
            fontWeight: 700, marginRight: 6,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>NEXT</span>
          {data.next_line}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10,
        fontSize: 11, color: C.muted,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.02em',
        marginTop: 2,
      }}>
        <span>
          {lastTouchedLabel
            ? `Last touched ${lastTouchedLabel}${lastTouchedSource === 'chat' ? ' · in chat' : ' · on disk'}`
            : 'No activity yet'}
        </span>
        {isEmptyRoom && typeof onAskStarter === 'function' && (
          <button
            type="button"
            onClick={() => { setKicked(true); onAskStarter('Where are we on this mission?') }}
            style={{
              fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif",
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(16,185,129,0.16)',
              color: '#6ee7b7',
              border: '1px solid rgba(16,185,129,0.40)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            data-test-id="mission-state-card-ask-starter"
          >
            Where are we? →
          </button>
        )}
      </div>
    </div>
  )
}
