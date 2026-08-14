// CV4 Routines board — corner:routines R3.
// Full-area card view of every open loop, opened by clicking "Routines" in
// the left drawer. Mounted in CornerV4's center column off activeTool ===
// 'routines'; selecting any agent / project / mission / mail force-closes it
// (those handlers already clear activeTool).
//
// Each card: what the loop does (plain English), where it lives, when it
// started, cadence, estimated AI tokens per day, and the controls.
// Design: editorial card index — ink ground, bone text, the amber dot is the
// only color and it means "alive". Hanken Grotesk heavy card titles.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'

const FONT = {
  body: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', monospace",
}
const AMBER = 'var(--c-yellow)'

function cadenceLabel(r) {
  const m = r.interval_minutes
  if (!m) return r.kind === 'system' ? 'always on' : 'manual'
  if (m % 1440 === 0) return m === 1440 ? 'daily' : `every ${m / 1440} days`
  if (m % 60 === 0) return m === 60 ? 'hourly' : `every ${m / 60}h`
  return `every ${m}m`
}

function since(ts) {
  if (!ts) return null
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

function tokensLabel(r) {
  if (r.kind === 'system') {
    if (!r.tokens_day_est) return 'no AI tokens'
    return `~${Math.round(r.tokens_day_est / 1000)}k tokens/day est.`
  }
  if (r.tokens_day_est) return `~${Math.round(r.tokens_day_est / 1000)}k tokens/day est.`
  return '~8k tokens per run est.'
}

function roomLabel(r) {
  if (r.kind === 'system') return 'System · studio'
  if (r.room_type === 'agent') return `${r.agent_slug} (1:1)`
  if (r.room_type === 'mission') return `${r.project_slug} / ${r.mission_slug}`
  return r.project_slug
}

export default function RoutinesBoard({ worldId, onClose, onNewRoutine }) {
  const [routines, setRoutines] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!worldId) return
    try {
      const r = await authFetch(`/api/dashboard/routines?client_id=${encodeURIComponent(worldId)}`)
      const j = r.ok ? await r.json().catch(() => null) : null
      setRoutines(Array.isArray(j?.routines) ? j.routines : [])
    } catch { setRoutines([]) }
  }, [worldId])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const act = useCallback(async (id, action) => {
    setBusyId(id)
    try {
      await authFetch('/api/dashboard/routines', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, client_id: worldId }),
      })
    } catch { /* reload reflects truth */ }
    await load()
    setBusyId(null)
  }, [worldId, load])

  const remove = useCallback(async (r) => {
    if (typeof window !== 'undefined' &&
        !window.confirm(`Delete routine "${r.name}"? Its loop stops permanently.`)) return
    setBusyId(r.id)
    try {
      await authFetch('/api/dashboard/routines', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, client_id: worldId }),
      })
    } catch { /* reload reflects truth */ }
    await load()
    setBusyId(null)
  }, [worldId, load])

  const { user, system, runningCount } = useMemo(() => {
    const all = routines || []
    const user = all.filter(r => r.kind !== 'system')
    const system = all.filter(r => r.kind === 'system')
      .sort((a, b) => (b.tokens_day_est || 0) - (a.tokens_day_est || 0) || a.name.localeCompare(b.name))
    return { user, system, runningCount: all.filter(r => r.status === 'running').length }
  }, [routines])

  return (
    <div data-cv4-routines-board style={{
      flex: 1, overflowY: 'auto', padding: '28px 28px 48px',
      fontFamily: FONT.body,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
        <h1 style={{
          margin: 0, fontFamily: FONT.display, fontWeight: 800,
          fontSize: 34, color: C.text, letterSpacing: '-0.03em',
        }}>Routines<span style={{ color: AMBER }}>.</span></h1>
        {routines !== null && (
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted }}>
            {runningCount} alive · {(routines || []).length} total
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button
          onClick={onClose}
          aria-label="Close routines"
          style={{
            background: 'none', border: '1px solid ' + C.border, borderRadius: 6,
            color: C.muted, cursor: 'pointer', width: 28, height: 28,
            fontSize: 15, lineHeight: 1,
          }}
        >×</button>
      </div>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: C.muted, maxWidth: 560 }}>
        Every loop running on your system. Yours run in the room they're attached
        to; system loops keep the machine itself going. Token figures are rough estimates.
      </p>

      {routines === null ? (
        <div style={{ color: C.muted, fontStyle: 'italic', fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          <SectionLabel>Your loops</SectionLabel>
          {user.length === 0 ? (
            <div style={{ color: C.muted, fontStyle: 'italic', fontSize: 13, margin: '6px 0 22px' }}>
              None yet — create one from the Routines section in the left menu and it runs in the room you attach it to.
            </div>
          ) : (
            <CardGrid>
              {user.map(r => (
                <RoutineCard key={r.id} r={r} busy={busyId === r.id}
                  onPause={() => act(r.id, 'pause')} onResume={() => act(r.id, 'resume')}
                  onRunNow={() => act(r.id, 'run_now')} onDelete={() => remove(r)} />
              ))}
            </CardGrid>
          )}

          <SectionLabel style={{ marginTop: 30 }}>System loops</SectionLabel>
          <CardGrid>
            {system.map(r => (
              <RoutineCard key={r.id} r={r} system busy={busyId === r.id}
                onPause={() => act(r.id, 'pause')} onResume={() => act(r.id, 'resume')} />
            ))}
          </CardGrid>
        </>
      )}
    </div>
  )
}

function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: C.muted, fontFamily: FONT.mono, margin: '0 0 10px', ...style,
    }}>{children}</div>
  )
}

function CardGrid({ children }) {
  return (
    <div style={{
      display: 'grid', gap: 12,
      gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    }}>{children}</div>
  )
}

function RoutineCard({ r, system = false, busy, onPause, onResume, onRunNow, onDelete }) {
  const running = r.status === 'running'
  const errored = r.status === 'error'
  const dot = errored ? '#FCA5A5' : (running ? AMBER : 'rgba(255,255,255,0.18)')
  const name = system ? r.name.replace(/^com\.aom(-ea)?\./, '') : r.name
  // System interval jobs have no live pid between runs — no honest start
  // time, so show nothing rather than the row's tracked-since date.
  const startedAgo = since(r.started_at || (!system ? r.created_at : null))
  const description = r.description || (system ? r.prompt : r.prompt)

  return (
    <div style={{
      border: '1px solid ' + C.border, borderRadius: 10,
      padding: '14px 16px 12px', opacity: busy ? 0.5 : 1,
      background: 'rgba(255,255,255,0.015)',
      display: 'flex', flexDirection: 'column', gap: 8, minHeight: 150,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dot,
          boxShadow: running ? '0 0 0 3px rgba(234,179,8,0.14)' : 'none',
        }} />
        <span style={{
          fontFamily: FONT.display, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: errored ? '#FCA5A5' : C.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>{name}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.dim, flexShrink: 0 }}>
          {cadenceLabel(r)}
        </span>
      </div>

      <div style={{
        fontSize: 12.5, color: C.text2, lineHeight: 1.45, flex: 1,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
 }}>{description || ', '}</div>

      {r.last_error && (
        <div style={{ fontSize: 10.5, color: '#FCA5A5', fontFamily: FONT.mono }}>
          {String(r.last_error).slice(0, 110)}
        </div>
      )}

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '3px 14px',
        fontFamily: FONT.mono, fontSize: 10, color: C.muted,
        borderTop: '1px solid ' + C.border, paddingTop: 8,
      }}>
        <span title="Where this loop lives">{roomLabel(r)}</span>
        {startedAgo && <span title="How long it's been going">up {startedAgo}</span>}
        {!system && <span>{r.model}</span>}
        <span title="Rough AI token estimate">{tokensLabel(r)}</span>
        {r.last_run_at && <span>ran {since(r.last_run_at)} ago</span>}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {running
          ? <CardBtn onClick={onPause}>Kill</CardBtn>
          : <CardBtn onClick={onResume}>Resume</CardBtn>}
        {!system && <CardBtn onClick={onRunNow}>Run now</CardBtn>}
        {!system && <CardBtn danger onClick={onDelete}>Delete</CardBtn>}
      </div>
    </div>
  )
}

function CardBtn({ children, danger = false, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: '1px solid ' + C.border, borderRadius: 5,
        color: danger ? '#FCA5A5' : C.muted, cursor: 'pointer',
        padding: '3px 10px', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        fontFamily: FONT.mono, lineHeight: 1.5,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.muted; e.currentTarget.style.color = danger ? '#FCA5A5' : C.text }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = danger ? '#FCA5A5' : C.muted }}
    >{children}</button>
  )
}