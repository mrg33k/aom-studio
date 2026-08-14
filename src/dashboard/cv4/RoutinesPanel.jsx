// CV4 Routines panel — corner:routines R1.
// Lives inside the left drawer's "Routines" TreeSection. Lists every open
// loop (the `routines` table is the registry), with pause/resume (kill),
// run-now, delete, and an inline create form: name, room, prompt, interval,
// model. The loop's activity lands in the attached room as normal chat.
//
// Design: editorial index, monochrome rows — the amber dot is the only color
// and it means "alive". Hanken Grotesk body, JetBrains Mono meta.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'

const FONT = {
  body: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', monospace",
}
const AMBER = 'var(--c-yellow)'

const INTERVALS = [
  { label: 'Every 15 min', value: 15 },
  { label: 'Every 30 min', value: 30 },
  { label: 'Every hour', value: 60 },
  { label: 'Every 4 hours', value: 240 },
  { label: 'Daily', value: 1440 },
  { label: 'Manual only', value: '' },
]
const MODELS = ['haiku', 'sonnet', 'opus']

function intervalLabel(mins) {
  if (!mins) return 'manual'
  if (mins % 1440 === 0) return mins === 1440 ? 'daily' : `every ${mins / 1440}d`
  if (mins % 60 === 0) return mins === 60 ? 'hourly' : `every ${mins / 60}h`
  return `every ${mins}m`
}

function ago(ts) {
  if (!ts) return 'never'
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default function RoutinesPanel({ worldId, projectRooms = [], agents = [], getMissions }) {
  const [routines, setRoutines] = useState(null) // null = loading
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!worldId) return
    try {
      const r = await authFetch(`/api/dashboard/routines?client_id=${encodeURIComponent(worldId)}`)
      if (!r.ok) { setRoutines([]); return }
      const j = await r.json().catch(() => null)
      setRoutines(Array.isArray(j?.routines) ? j.routines : [])
    } catch { setRoutines([]) }
  }, [worldId])

  useEffect(() => { load() }, [load])

  const act = useCallback(async (id, action) => {
    setBusyId(id)
    try {
      await authFetch('/api/dashboard/routines', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, client_id: worldId }),
      })
    } catch { /* surface via reload */ }
    await load()
    setBusyId(null)
  }, [worldId, load])

  const remove = useCallback(async (routine) => {
    if (typeof window !== 'undefined' &&
        !window.confirm(`Delete routine "${routine.name}"? Its loop stops permanently.`)) return
    setBusyId(routine.id)
    try {
      await authFetch('/api/dashboard/routines', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: routine.id, client_id: worldId }),
      })
    } catch { /* surface via reload */ }
    await load()
    setBusyId(null)
  }, [worldId, load])

  return (
    <div data-cv4-routines style={{ padding: '0 4px 4px' }}>
      {routines === null ? (
        <Hint>Loading…</Hint>
      ) : routines.length === 0 && !creating ? (
        <Hint>No open loops. Create one and it runs in the room you attach it to.</Hint>
      ) : (
        <>
          {routines.filter(r => r.kind !== 'system').map(r => (
            <RoutineRow
              key={r.id}
              routine={r}
              busy={busyId === r.id}
              onPause={() => act(r.id, 'pause')}
              onResume={() => act(r.id, 'resume')}
              onRunNow={() => act(r.id, 'run_now')}
              onDelete={() => remove(r)}
            />
          ))}
          {routines.some(r => r.kind === 'system') && (
            <div style={{
              fontSize: 9, fontWeight: 700, color: C.dim,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              fontFamily: FONT.mono, padding: '10px 8px 3px',
            }}>System</div>
          )}
          {routines.filter(r => r.kind === 'system')
            .sort((a, b) => (a.status === 'running' ? 0 : 1) - (b.status === 'running' ? 0 : 1) || a.name.localeCompare(b.name))
            .map(r => (
              <RoutineRow
                key={r.id}
                routine={r}
                system
                busy={busyId === r.id}
                onPause={() => act(r.id, 'pause')}
                onResume={() => act(r.id, 'resume')}
              />
            ))}
        </>
      )}

      {creating ? (
        <CreateForm
          worldId={worldId}
          projectRooms={projectRooms}
          agents={agents}
          getMissions={getMissions}
          onDone={() => { setCreating(false); load() }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          data-cv4-new-routine
          onClick={() => setCreating(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            margin: '6px 4px 2px', padding: '4px 8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.dim, fontFamily: FONT.body, fontSize: 11.5, fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.muted }}
          onMouseLeave={e => { e.currentTarget.style.color = C.dim }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New routine
        </button>
      )}
    </div>
  )
}

function RoutineRow({ routine, system = false, busy, onPause, onResume, onRunNow, onDelete }) {
  const [open, setOpen] = useState(false)
  const running = routine.status === 'running'
  const errored = routine.status === 'error'
  const dotColor = errored ? '#FCA5A5' : (running ? AMBER : 'rgba(255,255,255,0.18)')
  const room = system
    ? 'system'
    : (routine.room_type === 'agent'
      ? routine.agent_slug
      : (routine.room_type === 'mission'
        ? `${routine.project_slug} / ${routine.mission_slug}`
        : routine.project_slug))
  const displayName = system ? routine.name.replace(/^com\.aom(-ea)?\./, '') : routine.name
  const cadence = system && !routine.interval_minutes ? 'always on' : intervalLabel(routine.interval_minutes)

  return (
    <div style={{ borderRadius: 5, opacity: busy ? 0.5 : 1 }}>
      <div
        data-row
        onClick={() => setOpen(v => !v)}
        title={routine.prompt}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: dotColor,
          boxShadow: running ? '0 0 0 2px rgba(234,179,8,0.18)' : 'none',
        }} />
        <span style={{
          flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500,
          color: errored ? '#FCA5A5' : C.text2, fontFamily: FONT.body,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{displayName}</span>
        <span style={{
          fontSize: 9, color: C.dim, fontFamily: FONT.mono, flexShrink: 0,
          letterSpacing: '0.04em',
        }}>{cadence}</span>
      </div>

      {open && (
        <div style={{ padding: '2px 8px 8px 22px' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT.mono, marginBottom: 2 }}>
            {system ? `system loop on the studio · ${routine.status}` : `${room} · ${routine.model} · ran ${ago(routine.last_run_at)}`}
          </div>
          {routine.last_error && (
            <div style={{ fontSize: 10, color: '#FCA5A5', fontFamily: FONT.mono, marginBottom: 4 }}>
              {String(routine.last_error).slice(0, 120)}
            </div>
          )}
          <div style={{
            fontSize: 11, color: C.muted, fontFamily: FONT.body, marginBottom: 6,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{routine.prompt}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {running
              ? <MiniBtn onClick={onPause}>Kill</MiniBtn>
              : <MiniBtn onClick={onResume}>Resume</MiniBtn>}
            {!system && <MiniBtn onClick={onRunNow}>Run now</MiniBtn>}
            {!system && <MiniBtn danger onClick={onDelete}>Delete</MiniBtn>}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniBtn({ children, danger = false, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      style={{
        background: 'none', border: '1px solid ' + C.border, borderRadius: 4,
        color: danger ? '#FCA5A5' : C.muted, cursor: 'pointer',
        padding: '2px 8px', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        fontFamily: FONT.mono, lineHeight: 1.5,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.muted }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border }}
    >{children}</button>
  )
}

function CreateForm({ worldId, projectRooms, agents, getMissions, onDone, onCancel }) {
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [roomKey, setRoomKey] = useState('') // 'project:<slug>' | 'mission:<p>:<m>' | 'agent:<slug>'
  const [interval, setInterval_] = useState(30)
  const [model, setModel] = useState('sonnet')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const roomOptions = useMemo(() => {
    const opts = []
    for (const p of (projectRooms || [])) {
      opts.push({ key: `project:${p.slug}`, label: p.name || p.slug })
      const missions = typeof getMissions === 'function' ? (getMissions(p.slug) || []) : []
      for (const m of missions) {
        opts.push({ key: `mission:${p.slug}:${m.slug}`, label: `${p.name || p.slug} / ${m.name || m.slug}` })
      }
    }
    for (const a of (agents || [])) {
      opts.push({ key: `agent:${a.slug}`, label: `${a.name || a.slug} (1:1)` })
    }
    return opts
  }, [projectRooms, agents, getMissions])

  const submit = async () => {
    if (!name.trim() || !prompt.trim() || !roomKey) {
      setError('Name, room, and instructions are all needed.')
      return
    }
    const [kind, a, b] = roomKey.split(':')
    const body = {
      client_id: worldId,
      name: name.trim(),
      prompt: prompt.trim(),
      model,
      interval_minutes: interval || null,
      room_type: kind,
      project_slug: kind === 'agent' ? null : a,
      mission_slug: kind === 'mission' ? b : null,
      agent_slug: kind === 'agent' ? a : null,
    }
    setSaving(true)
    setError('')
    try {
      const r = await authFetch('/api/dashboard/routines', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setError(j.error || 'Could not create the routine.')
        setSaving(false)
        return
      }
      onDone?.()
    } catch {
      setError('Could not create the routine.')
      setSaving(false)
    }
  }

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 4, color: C.text, padding: '5px 8px',
    fontFamily: FONT.body, fontSize: 12, outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: 9, fontWeight: 700, color: C.dim,
    letterSpacing: '0.10em', textTransform: 'uppercase',
    fontFamily: FONT.mono, margin: '8px 0 3px',
  }

  return (
    <div data-cv4-routine-form style={{ padding: '4px 8px 8px' }}>
      <label style={labelStyle}>Name</label>
      <input style={fieldStyle} value={name} onChange={e => setName(e.target.value)}
        placeholder="Morning pipeline check" />

      <label style={labelStyle}>Room</label>
      <select style={fieldStyle} value={roomKey} onChange={e => setRoomKey(e.target.value)}>
        <option value="">Pick a room…</option>
        {roomOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>

      <label style={labelStyle}>Instructions</label>
      <textarea
        style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }}
        value={prompt} onChange={e => setPrompt(e.target.value)}
 placeholder="What should happen each run? Plain English, it runs in the room like a message from you."
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Repeats</label>
          <select style={fieldStyle} value={interval}
            onChange={e => setInterval_(e.target.value === '' ? '' : +e.target.value)}>
            {INTERVALS.map(i => <option key={String(i.value)} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Model</label>
          <select style={fieldStyle} value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 6, fontSize: 10.5, color: '#FCA5A5', fontFamily: FONT.body }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          onClick={submit}
          disabled={saving}
          style={{
            background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)',
            borderRadius: 4, color: AMBER, cursor: saving ? 'default' : 'pointer',
            padding: '3px 10px', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT.mono,
          }}
        >{saving ? 'Creating…' : 'Create'}</button>
        <MiniBtn onClick={onCancel}>Cancel</MiniBtn>
      </div>
    </div>
  )
}

function Hint({ children }) {
  return (
    <div style={{
      padding: '4px 14px 8px 22px', fontSize: 11, color: C.muted,
      fontStyle: 'italic', fontFamily: FONT.body,
    }}>{children}</div>
  )
}