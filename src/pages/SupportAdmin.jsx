import React, { useState, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Support Desk — AOM board.  Route: /support/admin
// Team-gated (allowlist + team password via /api/support/admin-auth, own session
// in 'support-admin-session' localStorage — never touches Corner/Supabase auth).
// Three columns: New (heard+working) / Needs you (needs_team, loud) / Resolved.
// Working a card lets the team write a response (emails the client + resolves) or
// change status. CV4 editorial styling: deep ink, bone, amber as the only accent.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'support-admin-session'

const INK = '#0A0E1C'
const INK_PANEL = '#10162A'
const INK_LINE = 'rgba(237,233,222,0.10)'
const BONE = '#EDE9DE'
const BONE_DIM = 'rgba(237,233,222,0.58)'
const BONE_FAINT = 'rgba(237,233,222,0.32)'
const AMBER = '#F59E0B'
const SERIF = '"Instrument Serif", Georgia, serif'
const BODY = '"Hanken Grotesk", system-ui, -apple-system, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, monospace'

const COLUMNS = [
  { key: 'new', title: 'New', statuses: ['heard', 'working'], loud: false },
  { key: 'needs', title: 'Needs you', statuses: ['needs_team'], loud: true },
  { key: 'resolved', title: 'Resolved', statuses: ['resolved'], loud: false },
]

function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function SupportAdmin() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
  })

  if (!session) return <Login onAuthed={setSession} />
  return <Board session={session} onLogout={() => { localStorage.removeItem(SESSION_KEY); setSession(null) }} />
}

function Login({ onAuthed }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e && e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/support/admin-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'Login failed'); setBusy(false); return }
      const sess = { email: d.email, at: Date.now() }
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess))
      onAuthed(sess)
    } catch (e) { setError('Something went wrong. Try again.'); setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: INK, color: BONE, fontFamily: BODY,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360 }}>
        <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: BONE_FAINT, margin: '0 0 14px' }}>AOM Support · Team</p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 38, margin: '0 0 28px' }}>The board</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="AOM email" type="email"
          style={loginField} autoFocus />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Team password" type="password"
          style={loginField} />
        {error && <p style={{ color: '#F0A07A', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ ...sendBtn, width: '100%', marginTop: 18, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}

function Board({ session, onLogout }) {
  const [wishes, setWishes] = useState(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null) // selected wish

  const load = useCallback(async () => {
    setError('')
    try {
      const r = await fetch('/api/support/wishes')
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'load failed'); return }
      setWishes(d.wishes || [])
    } catch (e) { setError('Could not load the board.') }
  }, [])

  useEffect(() => { load() }, [load])

  const byColumn = (col) => (wishes || []).filter((w) => col.statuses.includes(w.status))

  return (
    <div style={{ minHeight: '100vh', background: INK, color: BONE, fontFamily: BODY }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '22px 28px', borderBottom: `1px solid ${INK_LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 26, margin: 0 }}>Support</h1>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: BONE_FAINT }}>The board</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={load} style={ghostBtn}>Refresh</button>
          <span style={{ fontSize: 13, color: BONE_FAINT }}>{session.email}</span>
          <button onClick={onLogout} style={ghostBtn}>Sign out</button>
        </div>
      </header>

      {error && <p style={{ color: '#F0A07A', padding: '12px 28px' }}>{error}</p>}
      {wishes === null && <p style={{ padding: '24px 28px', color: BONE_DIM }}>Loading…</p>}

      {wishes && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, padding: 28,
          alignItems: 'start' }}>
          {COLUMNS.map((col) => {
            const items = byColumn(col)
            return (
              <section key={col.key} style={{
                background: col.loud && items.length ? 'rgba(245,158,11,0.05)' : INK_PANEL,
                border: `1px solid ${col.loud && items.length ? 'rgba(245,158,11,0.4)' : INK_LINE}`,
                borderRadius: 6, padding: 16, minHeight: 200,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', margin: 0,
                    color: col.loud && items.length ? AMBER : BONE_DIM }}>{col.title}</h2>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: BONE_FAINT }}>{items.length}</span>
                </div>
                {items.length === 0 && <p style={{ color: BONE_FAINT, fontSize: 13, margin: 0 }}>Nothing here.</p>}
                {items.map((w) => (
                  <button key={w.id} onClick={() => setActive(w)} style={card(col.loud)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{w.name || w.email}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: BONE_FAINT }}>{w.access_code}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: BONE_DIM, lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {w.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: BONE_FAINT, textTransform: 'uppercase' }}>{w.source}</span>
                      <span style={{ fontSize: 11, color: BONE_FAINT }}>{timeAgo(w.created_at)}</span>
                    </div>
                  </button>
                ))}
              </section>
            )
          })}
        </div>
      )}

      {active && <CardDetail wish={active} onClose={() => setActive(null)} onChanged={() => { setActive(null); load() }} />}
    </div>
  )
}

function CardDetail({ wish, onClose, onChanged }) {
  const [response, setResponse] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function patch(body) {
    setBusy(true); setError('')
    try {
      const r = await fetch(`/api/support/wishes?id=${wish.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, author: 'aom' }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'failed'); setBusy(false); return }
      onChanged()
    } catch (e) { setError('Something went wrong.'); setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,7,13,0.7)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 100%)', height: '100%',
        background: INK_PANEL, borderLeft: `1px solid ${INK_LINE}`, padding: 28, overflowY: 'auto',
        fontFamily: BODY, color: BONE, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: AMBER, letterSpacing: '0.12em' }}>{wish.access_code}</span>
          <button onClick={onClose} style={ghostBtn}>Close</button>
        </div>
        <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 28, margin: '10px 0 4px' }}>
          {wish.name || 'Anonymous'}
        </h2>
        <a href={`mailto:${wish.email}`} style={{ color: BONE_DIM, fontSize: 14, textDecoration: 'none' }}>{wish.email}</a>
        <div style={{ display: 'flex', gap: 14, margin: '10px 0 22px' }}>
          <Tag>{wish.status}</Tag><Tag>{wish.source}</Tag><Tag>{timeAgo(wish.created_at)}</Tag>
        </div>

        <p style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.5, color: BONE, margin: '0 0 28px' }}>
          "{wish.message}"
        </p>

        <label style={lbl}>Write a response (emails the client + marks Resolved)</label>
        <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={5}
          placeholder="Got that all taken care of — let me know if you hit any issues with…"
          style={detailTextarea} />
        {error && <p style={{ color: '#F0A07A', fontSize: 13 }}>{error}</p>}
        <button disabled={busy || !response.trim()} onClick={() => patch({ response: response.trim(), status: 'resolved' })}
          style={{ ...sendBtn, width: '100%', marginTop: 12, opacity: busy || !response.trim() ? 0.5 : 1 }}>
          {busy ? 'Sending…' : 'Send response + Resolve'}
        </button>

        <div style={{ borderTop: `1px solid ${INK_LINE}`, marginTop: 26, paddingTop: 18 }}>
          <label style={lbl}>Or change status</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {['heard', 'working', 'needs_team', 'resolved'].map((s) => (
              <button key={s} disabled={busy || s === wish.status} onClick={() => patch({ status: s })}
                style={{ ...statusBtn, opacity: s === wish.status ? 0.4 : 1,
                  borderColor: s === 'needs_team' ? 'rgba(245,158,11,0.5)' : INK_LINE }}>
                {s === 'needs_team' ? 'Needs you' : s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const Tag = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: 11, color: BONE_FAINT, textTransform: 'uppercase',
    border: `1px solid ${INK_LINE}`, borderRadius: 3, padding: '3px 8px' }}>{children}</span>
)

const loginField = {
  width: '100%', boxSizing: 'border-box', background: 'transparent', border: `1px solid ${INK_LINE}`,
  borderRadius: 4, color: BONE, fontFamily: BODY, fontSize: 15, padding: '12px 14px', marginBottom: 12, outline: 'none',
}
const card = (loud) => ({
  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
  background: INK, border: `1px solid ${loud ? 'rgba(245,158,11,0.3)' : INK_LINE}`, borderRadius: 5,
  padding: 13, marginBottom: 10, color: BONE, fontFamily: BODY,
})
const sendBtn = {
  background: AMBER, color: '#1A1206', border: 'none', fontFamily: BODY, fontSize: 15, fontWeight: 700,
  padding: '13px 30px', borderRadius: 3, cursor: 'pointer',
}
const ghostBtn = {
  background: 'transparent', color: BONE_DIM, border: `1px solid ${INK_LINE}`, borderRadius: 3,
  fontFamily: BODY, fontSize: 13, padding: '6px 12px', cursor: 'pointer',
}
const statusBtn = {
  background: 'transparent', color: BONE, border: `1px solid ${INK_LINE}`, borderRadius: 3,
  fontFamily: MONO, fontSize: 12, padding: '7px 12px', cursor: 'pointer', textTransform: 'uppercase',
}
const detailTextarea = {
  width: '100%', boxSizing: 'border-box', background: INK, border: `1px solid ${INK_LINE}`, borderRadius: 4,
  color: BONE, fontFamily: BODY, fontSize: 15, lineHeight: 1.5, padding: 12, resize: 'vertical', outline: 'none',
}
const lbl = { display: 'block', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: BONE_FAINT, marginBottom: 6 }
