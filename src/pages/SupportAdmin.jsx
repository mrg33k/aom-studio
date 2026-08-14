import React, { useState, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Support Desk — AOM command center.  Route: /support/admin
// Team-gated (allowlist + team password via /api/support/admin-auth, own session
// in 'support-admin-session' localStorage — never touches Corner/Supabase auth).
//
// One screen, two halves of the same job:
//   • REQUESTS — the speak-freely / email wishes board (New / Needs you / Resolved).
//   • INBOX    — cross-mailbox tracking (/api/support/inbox): who's written in across
//                our mailboxes and who still needs a reply.
// A summary strip up top keeps both worlds visible at a glance.
//
// Visual DNA: unmistakably AOM — editorial deep-ink ground, warm bone text,
// Instrument Serif headlines, amber as the ONLY color. No SaaS card-grid, no
// gradients, no chrome. Quiet until something needs you, then amber.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'support-admin-session'
const PW_KEY = 'support-admin-pw' // sessionStorage only, authorizes inbox reads

const INK = '#0A0E1C'
const INK_PANEL = '#10162A'
const INK_CARD = '#0C1122'
const INK_LINE = 'rgba(237,233,222,0.10)'
const BONE = '#EDE9DE'
const BONE_DIM = 'rgba(237,233,222,0.58)'
const BONE_FAINT = 'rgba(237,233,222,0.32)'
const AMBER = '#F59E0B'
const AMBER_SOFT = 'rgba(245,158,11,0.10)'
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
  const t = typeof iso === 'number' ? iso : new Date(iso).getTime()
  const diff = (Date.now() - t) / 1000
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
  return <Board session={session} onLogout={() => {
    localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(PW_KEY); setSession(null)
  }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

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
      try { sessionStorage.setItem(PW_KEY, password) } catch { /* private mode */ }
      onAuthed(sess)
    } catch (e) { setError('Something went wrong. Try again.'); setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: INK, color: BONE, fontFamily: BODY,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360 }}>
        <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: BONE_FAINT, margin: '0 0 14px' }}>AOM Support · Team</p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 42, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
          The command center
        </h1>
        <p style={{ color: BONE_DIM, fontSize: 14, margin: '0 0 28px', lineHeight: 1.5 }}>
          Everything coming in, and everything we owe back.
        </p>
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

// ─────────────────────────────────────────────────────────────────────────────
// Command center
// ─────────────────────────────────────────────────────────────────────────────

function Board({ session, onLogout }) {
  const [wishes, setWishes] = useState(null)
  const [wishErr, setWishErr] = useState('')
  const [active, setActive] = useState(null)
  const [tab, setTab] = useState('requests')

  const [inbox, setInbox] = useState(null)
  const [inboxErr, setInboxErr] = useState('')
  const [inboxLoading, setInboxLoading] = useState(false)
  const [needPw, setNeedPw] = useState(false)

  const loadWishes = useCallback(async () => {
    setWishErr('')
    try {
      const r = await fetch('/api/support/wishes')
      const d = await r.json()
      if (!r.ok || !d.ok) { setWishErr(d.error || 'load failed'); return }
      setWishes(d.wishes || [])
    } catch (e) { setWishErr('Could not load the board.') }
  }, [])

  const loadInbox = useCallback(async (pwOverride) => {
    const pw = pwOverride || sessionStorage.getItem(PW_KEY)
    if (!pw) { setNeedPw(true); return }
    setInboxLoading(true); setInboxErr(''); setNeedPw(false)
    try {
      const r = await fetch('/api/support/inbox', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, password: pw, days: 3 }),
      })
      const d = await r.json()
      if (r.status === 401) { sessionStorage.removeItem(PW_KEY); setNeedPw(true); setInboxLoading(false); return }
      if (!r.ok || !d.ok) { setInboxErr(d.error || 'Could not load the inbox.'); setInboxLoading(false); return }
      try { sessionStorage.setItem(PW_KEY, pw) } catch { /* private mode */ }
      setInbox(d)
    } catch (e) { setInboxErr('Could not reach the mailboxes.') }
    finally { setInboxLoading(false) }
  }, [session.email])

  useEffect(() => { loadWishes() }, [loadWishes])
  useEffect(() => { loadInbox() }, [loadInbox])

  function refreshAll() { loadWishes(); loadInbox() }

  const byColumn = (col) => (wishes || []).filter((w) => col.statuses.includes(w.status))

  // Summary counts — the glance.
  const needsYou = (wishes || []).filter((w) => w.status === 'needs_team').length
  const newCount = (wishes || []).filter((w) => w.status === 'heard' || w.status === 'working').length
  const inboxNeeds = (inbox?.mailboxes || []).reduce((n, m) => n + (m.needs?.length || 0), 0)
  const inboxHint = inbox
    ? `across ${inbox.mailboxes?.length || 0} mailbox${(inbox.mailboxes?.length || 0) === 1 ? '' : 'es'}`
    : needPw ? 'unlock in Inbox tab' : inboxLoading ? 'reading…' : inboxErr ? 'mailboxes unreachable' : 'loading…'

  return (
    <div style={{ minHeight: '100vh', background: INK, color: BONE, fontFamily: BODY }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '24px 32px 18px', borderBottom: `1px solid ${INK_LINE}`, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 30, margin: 0, letterSpacing: '-0.01em' }}>Support</h1>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: BONE_FAINT }}>Command center</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={refreshAll} style={ghostBtn}>Refresh</button>
          <span style={{ fontSize: 13, color: BONE_FAINT }}>{session.email}</span>
          <button onClick={onLogout} style={ghostBtn}>Sign out</button>
        </div>
      </header>

      {/* Summary strip — both worlds at a glance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14,
        padding: '20px 32px 4px' }}>
        <Stat label="Needs you" value={needsYou} loud={needsYou > 0} hint="escalated requests" />
        <Stat label="New requests" value={newCount} hint="just in / triaging" />
        <Stat label="Inbox needs reply" value={inboxNeeds} loud={inboxNeeds > 0} hint={inboxHint} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '18px 32px 0' }}>
        <Tab active={tab === 'requests'} onClick={() => setTab('requests')}
          label="Requests" count={(wishes || []).length} />
        <Tab active={tab === 'inbox'} onClick={() => setTab('inbox')}
          label="Inbox" count={inboxNeeds} loud={inboxNeeds > 0} />
      </div>

      {tab === 'requests' && (
        <RequestsBoard wishes={wishes} error={wishErr} byColumn={byColumn} onOpen={setActive} />
      )}

      {tab === 'inbox' && (
        <InboxView inbox={inbox} loading={inboxLoading} error={inboxErr}
          needPw={needPw} onUnlock={(pw) => loadInbox(pw)} onRetry={() => loadInbox()} />
      )}

      {active && <CardDetail wish={active} onClose={() => setActive(null)}
        onChanged={() => { setActive(null); loadWishes() }} />}
    </div>
  )
}

function Stat({ label, value, hint, loud }) {
  return (
    <div style={{ background: loud ? AMBER_SOFT : INK_PANEL,
      border: `1px solid ${loud ? 'rgba(245,158,11,0.35)' : INK_LINE}`, borderRadius: 8, padding: '16px 18px' }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: loud ? AMBER : BONE_FAINT }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 40, lineHeight: 1.05, marginTop: 4,
        color: loud ? AMBER : BONE }}>{value}</div>
      <div style={{ fontSize: 12, color: BONE_FAINT, marginTop: 2 }}>{hint}</div>
    </div>
  )
}

function Tab({ active, onClick, label, count, loud }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: BODY,
      padding: '8px 4px', marginRight: 22, color: active ? BONE : BONE_FAINT,
      fontSize: 15, fontWeight: active ? 700 : 500, letterSpacing: '0.01em',
      borderBottom: `2px solid ${active ? AMBER : 'transparent'}`,
    }}>
      {label}
      {count > 0 && (
        <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 11,
          color: loud ? AMBER : BONE_FAINT }}>{count}</span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests board
// ─────────────────────────────────────────────────────────────────────────────

function RequestsBoard({ wishes, error, byColumn, onOpen }) {
  return (
    <>
      {error && <p style={{ color: '#F0A07A', padding: '12px 32px' }}>{error}</p>}
      {wishes === null && !error && <p style={{ padding: '24px 32px', color: BONE_DIM }}>Loading…</p>}
      {wishes && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18,
          padding: '22px 32px 40px', alignItems: 'start' }}>
          {COLUMNS.map((col) => {
            const items = byColumn(col)
            const hot = col.loud && items.length
            return (
              <section key={col.key} style={{
                background: hot ? AMBER_SOFT : INK_PANEL,
                border: `1px solid ${hot ? 'rgba(245,158,11,0.4)' : INK_LINE}`,
                borderRadius: 8, padding: 16, minHeight: 200,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase', margin: 0, color: hot ? AMBER : BONE_DIM }}>{col.title}</h2>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: BONE_FAINT }}>{items.length}</span>
                </div>
                {items.length === 0 && <p style={{ color: BONE_FAINT, fontSize: 13, margin: 0 }}>Nothing here.</p>}
                {items.map((w) => (
                  <button key={w.id} onClick={() => onOpen(w)} style={card(col.loud)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{w.name || w.email}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: BONE_FAINT }}>{w.access_code}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: BONE_DIM, lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {w.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: BONE_FAINT, textTransform: 'uppercase' }}>{w.source || ''}</span>
                      <span style={{ fontSize: 11, color: BONE_FAINT }}>{timeAgo(w.created_at)}</span>
                    </div>
                  </button>
                ))}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inbox view — cross-mailbox tracking
// ─────────────────────────────────────────────────────────────────────────────

function InboxView({ inbox, loading, error, needPw, onUnlock, onRetry }) {
  const [pw, setPw] = useState('')

  if (needPw) {
    return (
      <div style={{ padding: '40px 32px', maxWidth: 380 }}>
        <p style={{ fontFamily: SERIF, fontSize: 24, margin: '0 0 6px' }}>Unlock the inbox</p>
        <p style={{ color: BONE_DIM, fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
          The mailbox view needs your team password again (it isn't kept between visits).
        </p>
        <form onSubmit={(e) => { e.preventDefault(); onUnlock(pw) }}>
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="Team password"
            style={loginField} autoFocus />
          <button type="submit" style={{ ...sendBtn, marginTop: 8 }}>Load inbox</button>
        </form>
      </div>
    )
  }

  if (loading) return <p style={{ padding: '28px 32px', color: BONE_DIM }}>Reading the mailboxes…</p>

  if (error) {
    return (
      <div style={{ padding: '28px 32px' }}>
        <p style={{ color: '#F0A07A', margin: '0 0 12px' }}>{error}</p>
        <button onClick={onRetry} style={ghostBtn}>Try again</button>
      </div>
    )
  }

  if (!inbox) return null
  const boxes = inbox.mailboxes || []

  return (
    <div style={{ padding: '22px 32px 48px', display: 'flex', flexDirection: 'column', gap: 26 }}>
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: BONE_FAINT, margin: 0 }}>Last {inbox.days} days · real people only</p>
      {boxes.length === 0 && <p style={{ color: BONE_DIM }}>No connected mailboxes to track yet.</p>}
      {boxes.map((box) => (
        <section key={box.email} style={{ background: INK_PANEL, border: `1px solid ${INK_LINE}`,
          borderRadius: 8, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
            marginBottom: 14, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 22, margin: 0 }}>{box.email}</h3>
            {box.error
              ? <span style={{ fontFamily: MONO, fontSize: 11, color: '#F0A07A' }}>{box.error}</span>
              : <span style={{ fontFamily: MONO, fontSize: 11, color: BONE_FAINT }}>
                  {(box.needs?.length || 0)} need reply · {(box.replied?.length || 0)} replied
                </span>}
          </div>

          {box.error ? null : (
            <>
              {(box.needs?.length || 0) === 0 && (box.replied?.length || 0) === 0 && (
                <p style={{ color: BONE_FAINT, fontSize: 13, margin: 0 }}>Nothing personal in the window.</p>
              )}

              {(box.needs?.length || 0) > 0 && (
                <div style={{ marginBottom: box.replied?.length ? 18 : 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: AMBER, marginBottom: 8 }}>Needs reply</div>
                  {box.needs.map((it) => <InboxRow key={it.email + it.threadId} item={it} mailbox={box.email} loud />)}
                </div>
              )}

              {(box.replied?.length || 0) > 0 && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: BONE_FAINT, marginBottom: 8 }}>Replied</div>
                  {box.replied.map((it) => <InboxRow key={it.email + it.threadId} item={it} mailbox={box.email} />)}
                </div>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  )
}

function InboxRow({ item, mailbox, loud }) {
  const subject = `Re: ${item.subject || ''}`.slice(0, 120)
  return (
    <a href={`mailto:${item.email}?subject=${encodeURIComponent(subject)}`}
      style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
        padding: '10px 0', borderBottom: `1px solid ${INK_LINE}`, color: BONE }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: loud ? AMBER : 'rgba(237,233,222,0.32)' }} />
      <span style={{ flex: '0 0 auto', maxWidth: '34%', fontWeight: 600, fontSize: 14, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.from}</span>
      <span style={{ flex: 1, minWidth: 0, color: BONE_DIM, fontSize: 13, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subject}</span>
      <span style={{ flex: '0 0 auto', fontSize: 11, color: BONE_FAINT }}>{timeAgo(item.date)}</span>
      <span style={{ flex: '0 0 auto', fontFamily: MONO, fontSize: 11,
        color: loud ? AMBER : BONE_FAINT }}>{loud ? 'Reply →' : 'Open'}</span>
    </a>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Card detail (wish)
// ─────────────────────────────────────────────────────────────────────────────

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
          <Tagchip>{wish.status}</Tagchip><Tagchip>{wish.source || 'web'}</Tagchip><Tagchip>{timeAgo(wish.created_at)}</Tagchip>
        </div>

        <p style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.5, color: BONE, margin: '0 0 28px' }}>
          "{wish.message}"
        </p>

        <label style={lbl}>Write a response (emails the client + marks Resolved)</label>
        <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={5}
 placeholder="Got that all taken care of, let me know if you hit any issues with…"
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

const Tagchip = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: 11, color: BONE_FAINT, textTransform: 'uppercase',
    border: `1px solid ${INK_LINE}`, borderRadius: 3, padding: '3px 8px' }}>{children}</span>
)

const loginField = {
  width: '100%', boxSizing: 'border-box', background: 'transparent', border: `1px solid ${INK_LINE}`,
  borderRadius: 4, color: BONE, fontFamily: BODY, fontSize: 15, padding: '12px 14px', marginBottom: 12, outline: 'none',
}
const card = (loud) => ({
  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
  background: INK_CARD, border: `1px solid ${loud ? 'rgba(245,158,11,0.3)' : INK_LINE}`, borderRadius: 6,
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