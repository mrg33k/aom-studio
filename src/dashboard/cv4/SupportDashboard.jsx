// SupportDashboard.jsx — M10 Track A. Full-screen Support command center inside Corner.
//
// Opened by the headphones icon (top-right). Takes over the screen (CornerV4 hides
// both rails while supportMode is on) and shows BOTH inbound streams in one view:
//   • Support requests — the speak-freely / email wishes (GET /api/support/wishes).
//     M6 routes inbound support emails into wishes, so this IS the email stream.
//   • Chat support — Corner Support widget visitor conversations (reuses SupportInbox).
// Each stream carries its own unread / needs-you notification count.
//
// Mission: corner:support-desk M10. Editorial deep-ink / bone / amber, the AOM system.

import { useState, useEffect, useCallback } from 'react'
import SupportInbox from './SupportInbox.jsx'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'

// Theme-aware: follows Corner's current theme (same tokens SupportInbox uses) so
// both streams render consistently, light or dark.
const AMBER = C.accent
const AMBER_SOFT = C.accentBg
const INK = C.bg
const INK_PANEL = C.bg2
const INK_CARD = C.s1
const LINE = C.border2
const BONE = C.text
const BONE_DIM = C.text2
const BONE_FAINT = C.muted
const SERIF = '"Instrument Serif", Georgia, serif'
const BODY = '"Hanken Grotesk", system-ui, -apple-system, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, monospace'

const STATUS_LABEL = { heard: 'Heard', working: 'Working', needs_team: 'Needs you', resolved: 'Resolved' }

function timeAgo(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function timeAgoMs(ms) { return ms ? timeAgo(new Date(ms).toISOString()) : '' }

// ── Support requests (wishes) stream ─────────────────────────────────────────
function RequestsStream() {
  const [wishes, setWishes] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const r = await fetch('/api/support/wishes')
      const d = await r.json()
      if (!r.ok || !d.ok) { setError(d.error || 'load failed'); return }
      setWishes(d.wishes || [])
    } catch { setError('Could not load support requests.') }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  const open = (wishes || []).filter((w) => w.status !== 'resolved')
  const resolved = (wishes || []).filter((w) => w.status === 'resolved')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <StreamHeader title="Support requests" sub="speak-freely + email"
        count={open.filter((w) => w.status === 'needs_team').length} total={(wishes || []).length} onRefresh={load} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {error && <p style={{ color: '#F0A07A', fontSize: 13 }}>{error}</p>}
        {wishes === null && !error && <p style={{ color: BONE_DIM, fontSize: 13 }}>Loading…</p>}
        {wishes && open.length === 0 && <p style={{ color: BONE_FAINT, fontSize: 13 }}>No open requests.</p>}
        {open.map((w) => <WishRow key={w.id} w={w} />)}
        {resolved.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: BONE_FAINT, margin: '0 0 8px' }}>Resolved ({resolved.length})</div>
            {resolved.slice(0, 20).map((w) => <WishRow key={w.id} w={w} dim />)}
          </div>
        )}
      </div>
    </div>
  )
}

function WishRow({ w, dim }) {
  const loud = w.status === 'needs_team'
  const overSla = w.status !== 'resolved' && (Date.now() - new Date(w.created_at).getTime()) > 10 * 60 * 1000
  const [open, setOpen] = useState(false)
  const [updates, setUpdates] = useState(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && updates === null) {
      setLoading(true)
      try {
        const r = await fetch(`/api/support/wishes?access_code=${encodeURIComponent(w.access_code)}`)
        const d = await r.json()
        setUpdates(d?.updates || [])
      } catch { setUpdates([]) }
      finally { setLoading(false) }
    }
  }

  return (
    <div style={{ background: loud ? AMBER_SOFT : INK_CARD,
      border: `1px solid ${loud ? 'rgba(245,158,11,0.35)' : LINE}`, borderRadius: 6,
      padding: 12, marginBottom: 8, opacity: dim ? 0.6 : 1 }}>
      <button onClick={toggle} aria-expanded={open} style={{ display: 'block', width: '100%',
        textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: BONE }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14, color: BONE }}>{w.name || w.email}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {overSla && (
              <span title="Open past the 10-minute target" style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700,
                color: '#1A1206', background: AMBER, padding: '1px 5px', borderRadius: 8 }}>OVER 10M</span>
            )}
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: loud ? AMBER : BONE_DIM, background: 'transparent',
              border: `1px solid ${loud ? AMBER : LINE}`, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap' }}>
              {STATUS_LABEL[w.status] || w.status}
            </span>
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: BONE_DIM, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{w.message}</p>
        {w.latest_response && (
          <div style={{ marginTop: 7, padding: '6px 9px', background: AMBER_SOFT, borderLeft: `2px solid ${AMBER}`, borderRadius: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: AMBER }}>We replied</span>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: BONE_DIM, lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{w.latest_response.body}</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BONE_FAINT }}>{w.source || 'web'}</span>
          <span style={{ fontSize: 11, color: BONE_FAINT }}>{open ? 'hide activity' : 'activity'} · {timeAgo(w.created_at)}</span>
        </div>
      </button>
      {open && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
          {loading && <span style={{ fontSize: 12, color: BONE_FAINT }}>Loading activity…</span>}
          {updates && updates.length === 0 && <span style={{ fontSize: 12, color: BONE_FAINT }}>No activity yet — heard, awaiting triage.</span>}
          {updates && updates.map((u) => (
            <div key={u.id} style={{ display: 'flex', gap: 10, padding: '4px 0', alignItems: 'baseline' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: AMBER, minWidth: 70, textTransform: 'uppercase' }}>
                {u.kind === 'status_change' ? (STATUS_LABEL[u.status] || u.status) : u.kind}
              </span>
              <span style={{ flex: 1, fontSize: 12, color: BONE_DIM, lineHeight: 1.4 }}>{u.body || ''}</span>
              <span style={{ fontSize: 10, color: BONE_FAINT }}>{timeAgo(u.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StreamHeader({ title, sub, count, total, onRefresh }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '16px 16px 12px', borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 22, margin: 0, color: BONE }}>{title}</h2>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: BONE_FAINT }}>{sub}</span>
        {count > 0 && (
          <span style={{ background: AMBER, color: '#1A1206', fontFamily: MONO, fontSize: 11, fontWeight: 700,
            padding: '1px 7px', borderRadius: 10 }}>{count}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: BONE_FAINT }}>{total ?? ''}</span>
        {onRefresh && <button onClick={onRefresh} style={ghostBtn}>Refresh</button>}
      </div>
    </div>
  )
}

// ── Cross-mailbox inbox (the "support emails" stream beyond wishes) ───────────
// Each correspondent renders as an expandable thread card: collapsed shows who +
// subject + a preview of the latest message; expanded shows what THEY wrote and
// what WE replied, with Open-in-Gmail + reply-by-mail links. This is the heart of
// "show me the support emails we responded to" — our actual reply text, inline.
function InboxThreadCard({ it, loud }) {
  const [open, setOpen] = useState(false)
  const gmailUrl = it.threadId ? `https://mail.google.com/mail/u/0/#all/${it.threadId}` : null
  const previewWho = it.lastReply?.snippet ? 'You' : it.from
  const preview = it.lastReply?.snippet || it.lastInbound?.snippet || ''
  const when = it.lastReply?.date || it.lastInbound?.date || it.date
  return (
    <div style={{ background: loud ? AMBER_SOFT : INK_CARD,
      border: `1px solid ${loud ? 'rgba(245,158,11,0.35)' : LINE}`, borderRadius: 6, padding: 12, marginBottom: 8 }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ display: 'block', width: '100%',
        textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: BONE }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: loud ? AMBER : BONE_FAINT }} />
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14, color: BONE,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.from}</span>
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: loud ? AMBER : BONE_FAINT, textTransform: 'uppercase', flexShrink: 0 }}>
            {loud ? 'Needs reply' : 'Responded'}
          </span>
        </div>
        <p style={{ margin: '5px 0 0', fontSize: 13, color: BONE_DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.subject}</p>
        {preview && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: BONE_FAINT, lineHeight: 1.4, display: '-webkit-box',
            WebkitLineClamp: open ? 99 : 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <span style={{ color: it.lastReply?.snippet ? AMBER : BONE_FAINT }}>{previewWho}:</span> {preview}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span style={{ fontSize: 11, color: BONE_FAINT }}>{open ? 'hide thread' : 'view thread'}</span>
          <span style={{ fontSize: 11, color: BONE_FAINT }}>{timeAgoMs(when)}</span>
        </div>
      </button>
      {open && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${LINE}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: BONE_FAINT, marginBottom: 4 }}>
              They wrote {it.lastInbound?.date ? `· ${timeAgoMs(it.lastInbound.date)}` : ''}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: BONE_DIM, lineHeight: 1.5 }}>{it.lastInbound?.snippet || '—'}</p>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: it.lastReply ? AMBER : BONE_FAINT, marginBottom: 4 }}>
              We replied {it.lastReply?.date ? `· ${timeAgoMs(it.lastReply.date)}` : ''}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: it.lastReply ? BONE : BONE_FAINT, lineHeight: 1.5 }}>
              {it.lastReply?.snippet || 'No reply sent yet.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {gmailUrl && (
              <a href={gmailUrl} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: AMBER, textDecoration: 'none' }}>Open in Gmail →</a>
            )}
            <a href={`mailto:${it.email}?subject=${encodeURIComponent('Re: ' + (it.subject || ''))}`}
              style={{ fontFamily: MONO, fontSize: 11, color: BONE_FAINT, textDecoration: 'none' }}>Reply by mail</a>
          </div>
        </div>
      )}
    </div>
  )
}

function InboxPanel({ worldId }) {
  // Patrik's own logged-in dashboard session (the aom world) auto-unlocks: the
  // Supabase JWT rides via authFetch and the server verifies it (verifyTenant),
  // so no password screen. Everyone else still gets the team-password unlock.
  const isAom = worldId === 'aom'
  const [pw, setPw] = useState(() => { try { return sessionStorage.getItem('support-admin-pw') || '' } catch { return '' } })
  const [input, setInput] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Default to "Responded" — Patrik's literal ask is "the support emails we
  // responded to," so the panel opens to that, not to a wall of needs-reply mail.
  const [filter, setFilter] = useState('replied') // all | needs | replied

  const load = useCallback(async (password) => {
    if (!isAom && !password) return
    setLoading(true); setError('')
    try {
      const reqBody = { email: 'patrikmatheson@gmail.com', days: 7 }
      if (password) reqBody.password = password
      const r = await authFetch('/api/support/inbox', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(reqBody),
      })
      const d = await r.json()
      if (r.status === 401) {
        if (password) { try { sessionStorage.removeItem('support-admin-pw') } catch {} ; setPw(''); setError('Wrong team password.') }
        else if (isAom) { setError('Could not verify your session — refresh and try again.') }
        setLoading(false); return
      }
      if (!r.ok || !d.ok) { setError(d.error || 'Could not load the inbox.'); setLoading(false); return }
      if (password) { try { sessionStorage.setItem('support-admin-pw', password) } catch {} ; setPw(password) }
      setData(d)
    } catch { setError('Could not reach the mailboxes.') }
    finally { setLoading(false) }
  }, [isAom])

  // Auto-unlock for Patrik's session; otherwise use any cached team password.
  useEffect(() => { if (isAom) load(); else if (pw) load(pw) }, [isAom, pw, load])

  if (!isAom && !pw && !data) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 360 }}>
        <p style={{ fontFamily: SERIF, fontSize: 22, margin: '0 0 6px', color: BONE }}>Unlock the inbox</p>
        <p style={{ color: BONE_DIM, fontSize: 13, margin: '0 0 14px' }}>Cross-mailbox tracking needs the team password.</p>
        <form onSubmit={(e) => { e.preventDefault(); load(input) }}>
          <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Team password"
            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: `1px solid ${LINE}`,
              borderRadius: 4, color: BONE, fontFamily: BODY, fontSize: 14, padding: '10px 12px', marginBottom: 10, outline: 'none' }} />
          {error && <p style={{ color: '#F0A07A', fontSize: 12 }}>{error}</p>}
          <button type="submit" style={{ background: AMBER, color: '#1A1206', border: 'none', fontFamily: BODY,
            fontSize: 14, fontWeight: 700, padding: '10px 22px', borderRadius: 3, cursor: 'pointer' }}>Load inbox</button>
        </form>
      </div>
    )
  }
  if (loading && !data) return <p style={{ padding: 24, color: BONE_DIM }}>Reading the mailboxes…</p>
  if (error && !data) return <div style={{ padding: 24 }}><p style={{ color: '#F0A07A', marginBottom: 10 }}>{error}</p><button onClick={() => load(pw)} style={ghostBtn}>Retry</button></div>
  if (!data) return null
  const boxes = data.mailboxes || []
  const totalNeeds = boxes.reduce((n, b) => n + (b.needs?.length || 0), 0)
  const totalReplied = boxes.reduce((n, b) => n + (b.replied?.length || 0), 0)
  const shownCount = filter === 'needs' ? totalNeeds : filter === 'replied' ? totalReplied : totalNeeds + totalReplied
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: '0 0 16px' }}>
        <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: BONE_FAINT, margin: 0 }}>
          Last {data.days} days · the emails we{"'"}ve responded to
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label={`All ${totalNeeds + totalReplied}`} />
          <FilterPill active={filter === 'needs'} onClick={() => setFilter('needs')} label={`Needs reply ${totalNeeds}`} loud />
          <FilterPill active={filter === 'replied'} onClick={() => setFilter('replied')} label={`Responded ${totalReplied}`} />
        </div>
      </div>
      {boxes.length === 0 && <p style={{ color: BONE_DIM }}>No connected mailboxes.</p>}
      {boxes.length > 0 && shownCount === 0 && (
        <div style={{ padding: '28px 4px', color: BONE_FAINT, fontSize: 13, lineHeight: 1.5 }}>
          {filter === 'replied'
            ? `No support emails responded to in the last ${data.days} days. Replies you send to support threads will show up here, with our reply text.`
            : filter === 'needs'
              ? 'Nothing needs a reply right now.'
              : 'Nothing in the window.'}
        </div>
      )}
      {boxes.length > 0 && shownCount > 0 && boxes.map((box) => {
        const needs = filter === 'replied' ? [] : (box.needs || [])
        const replied = filter === 'needs' ? [] : (box.replied || [])
        return (
          <section key={box.email} style={{ background: INK_PANEL, border: `1px solid ${LINE}`, borderRadius: 8, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 18, margin: 0, color: BONE }}>{box.email}</h3>
              {box.error
                ? <span style={{ fontFamily: MONO, fontSize: 10, color: '#F0A07A' }}>{box.error}</span>
                : <span style={{ fontFamily: MONO, fontSize: 10, color: BONE_FAINT }}>{(box.needs?.length || 0)} need reply · {(box.replied?.length || 0)} replied</span>}
            </div>
            {!box.error && needs.map((it) => <InboxThreadCard key={'n' + it.email + it.threadId} it={it} loud />)}
            {!box.error && replied.map((it) => <InboxThreadCard key={'r' + it.email + it.threadId} it={it} />)}
            {!box.error && needs.length === 0 && replied.length === 0 &&
              <span style={{ fontSize: 12, color: BONE_FAINT }}>
                {filter === 'all' ? 'Nothing personal in the window.' : `Nothing ${filter === 'needs' ? 'needs a reply' : 'responded to'} here.`}
              </span>}
          </section>
        )
      })}
    </div>
  )
}

function FilterPill({ active, onClick, label, loud }) {
  return (
    <button onClick={onClick} style={{ background: active ? (loud ? AMBER : INK_CARD) : 'transparent',
      color: active ? (loud ? '#1A1206' : BONE) : BONE_FAINT, border: `1px solid ${active ? (loud ? AMBER : LINE) : LINE}`,
      borderRadius: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: '3px 10px', cursor: 'pointer', fontWeight: active ? 700 : 500 }}>{label}</button>
  )
}

// ── Summary strip — real counts across the top (counts that reflect reality) ──
function SummaryStrip() {
  const [wishes, setWishes] = useState(null)
  const load = useCallback(async () => {
    try { const r = await fetch('/api/support/wishes'); const d = await r.json(); if (d.ok) setWishes(d.wishes || []) } catch { /* keep last */ }
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  const ws = wishes || []
  const open = ws.filter((w) => w.status !== 'resolved')
  const resolved = ws.filter((w) => w.status === 'resolved')
  const overSla = open.filter((w) => (Date.now() - new Date(w.created_at).getTime()) > 10 * 60 * 1000)
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const respondedToday = resolved.filter((w) => w.updated_at && new Date(w.updated_at) >= startOfDay)
  const rate = ws.length ? Math.round((resolved.length / ws.length) * 100) : null

  const tiles = [
    { label: 'Open', value: open.length },
    { label: 'Responded today', value: respondedToday.length },
    { label: 'Over 10 min', value: overSla.length, loud: overSla.length > 0 },
    { label: 'Response rate', value: rate == null ? '—' : rate + '%' },
  ]
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
      {tiles.map((t, i) => (
        <div key={t.label} style={{ flex: 1, padding: '12px 20px', borderRight: i < tiles.length - 1 ? `1px solid ${LINE}` : 'none' }}>
          <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 26, lineHeight: 1, color: t.loud ? AMBER : BONE }}>
            {wishes === null ? '·' : t.value}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: BONE_FAINT, marginTop: 5 }}>{t.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Full dashboard ───────────────────────────────────────────────────────────
export default function SupportDashboard({ isDesktop = true, onClose, worldId }) {
  const [tab, setTab] = useState('requests') // mobile single-pane
  const [view, setView] = useState('streams') // desktop: streams | inbox

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 24px', borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 26, margin: 0, color: BONE, letterSpacing: '-0.01em' }}>Support</h1>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: BONE_FAINT }}>Command center</span>
      </div>
      <button onClick={onClose} style={{ ...ghostBtn, fontSize: 13 }} aria-label="Close support">Close ✕</button>
    </div>
  )

  if (!isDesktop) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: INK }}>
        {header}
        <SummaryStrip />
        <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0' }}>
          <TabBtn active={tab === 'requests'} onClick={() => setTab('requests')} label="Requests" />
          <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')} label="Chat" />
          <TabBtn active={tab === 'inbox'} onClick={() => setTab('inbox')} label="Inbox" />
        </div>
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {tab === 'requests' ? <RequestsStream /> : tab === 'chat' ? <SupportInbox isDesktop={false} /> : <InboxPanel worldId={worldId} />}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: INK }}>
      {header}
      <SummaryStrip />
      <div style={{ display: 'flex', gap: 4, padding: '10px 24px 0', borderBottom: `1px solid ${LINE}` }}>
        <TabBtn active={view === 'streams'} onClick={() => setView('streams')} label="Requests & chat" />
        <TabBtn active={view === 'inbox'} onClick={() => setView('inbox')} label="Inbox" />
      </div>
      {view === 'streams' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ flex: '1 1 50%', minWidth: 0, borderRight: `1px solid ${LINE}`, overflow: 'hidden' }}>
            <RequestsStream />
          </div>
          <div style={{ flex: '1 1 50%', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <SupportInbox isDesktop />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <InboxPanel worldId={worldId} />
        </div>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: BODY,
      padding: '8px 4px', marginRight: 20, color: active ? BONE : BONE_FAINT, fontSize: 15,
      fontWeight: active ? 700 : 500, borderBottom: `2px solid ${active ? AMBER : 'transparent'}` }}>{label}</button>
  )
}

const ghostBtn = {
  background: 'transparent', color: BONE_DIM, border: `1px solid ${LINE}`, borderRadius: 3,
  fontFamily: BODY, fontSize: 12, padding: '6px 12px', cursor: 'pointer',
}
