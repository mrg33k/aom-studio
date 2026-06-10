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

// ── M13 press-send: staged-work tag parsing + card animations ────────────────
// An agent that finished the work embeds `[staged_draft:<gmail-draft-id>|conn:<uuid>]`
// in the wish message. The card then renders as READY TO SEND: the human's only
// step is the amber button (or asking for a change).
const STAGED_RE = /\[staged_draft:([^|\]\s]+)\|conn:([^\]\s]+)\]/

function parseStaged(message) {
  const m = STAGED_RE.exec(message || '')
  if (!m) return null
  return { draftId: m[1], connectionId: m[2], cleanMessage: (message || '').replace(STAGED_RE, '').trim() }
}

let pressSendCssInjected = false
function ensurePressSendCss() {
  if (pressSendCssInjected || typeof document === 'undefined') return
  pressSendCssInjected = true
  const el = document.createElement('style')
  el.textContent = `
    @keyframes ps-breathe { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.0), 0 0 18px rgba(245,158,11,0.10); }
      50% { box-shadow: 0 0 0 1px rgba(245,158,11,0.22), 0 0 28px rgba(245,158,11,0.22); } }
    @keyframes ps-pop { 0% { transform: scale(0.92); opacity: 0.4; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes ps-shimmer { 0% { background-position: -160px 0; } 100% { background-position: 160px 0; } }
    .ps-card { animation: ps-breathe 3.2s ease-in-out infinite; }
    .ps-send-btn { transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease; }
    .ps-send-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(245,158,11,0.45); filter: brightness(1.06); }
    .ps-send-btn:active { transform: translateY(0) scale(0.98); }
    .ps-send-btn[disabled] { background-image: linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 70%);
      background-size: 160px 100%; background-repeat: no-repeat; animation: ps-shimmer 1.1s linear infinite; cursor: wait; }
    .ps-sent { animation: ps-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .ps-ghost-btn { transition: border-color 140ms ease, color 140ms ease; }
    .ps-ghost-btn:hover { border-color: rgba(245,158,11,0.7) !important; color: inherit; }
  `
  document.head.appendChild(el)
}

function timeAgo(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function timeAgoMs(ms) { return ms ? timeAgo(new Date(ms).toISOString()) : '' }

// ── One data source for the whole dashboard ──────────────────────────────────
// The strip and the list used to fetch independently; the Gmail fetch lags the
// wishes fetch, so the counts repainted mid-read (ALL 2 → ALL 32) and the two
// surfaces could disagree at any moment. One fetch, one truth, shared down.
function useSupportData(worldId) {
  const isAom = worldId === 'aom'
  const [wishes, setWishes] = useState(null)
  const [mailboxes, setMailboxes] = useState(null)
  const load = useCallback(async () => {
    try { const r = await fetch('/api/support/wishes'); const d = await r.json(); if (d.ok) setWishes(d.wishes || []) } catch { /* keep last */ }
    if (isAom) {
      try {
        const r2 = await authFetch('/api/support/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'include', body: JSON.stringify({ email: 'patrikmatheson@gmail.com', days: 7 }) })
        const d2 = await r2.json(); if (d2.ok) setMailboxes(d2.mailboxes || [])
      } catch { /* keep last */ }
    } else { setMailboxes([]) }
  }, [isAom])
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])
  return { wishes, mailboxes }
}

// Queue order, not feed order: what waits on you leads, oldest wait first
// (the person waiting longest deserves the top slot). Finished work sinks.
function buildItems(wishes, mailboxes) {
  const items = []
  for (const w of wishes || []) items.push(wishToItem(w))
  for (const box of mailboxes || []) {
    for (const it of box.needs || []) items.push(emailToItem(it, false))
    for (const it of box.replied || []) items.push(emailToItem(it, true))
  }
  const rank = (it) => (it.ready ? 0 : it.status === 'needs_you' ? 1 : it.status === 'working' ? 2 : 3)
  items.sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    if (ra !== rb) return ra - rb
    return ra <= 1 ? (a.date || 0) - (b.date || 0) : (b.date || 0) - (a.date || 0)
  })
  return items
}

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

// ── M14: quiet resolve for any open wish card ("I finished this myself") ──────
function ResolveBtn({ wishId, onDone, style }) {
  const [state, setState] = useState('idle') // idle | busy | done
  async function go(e) {
    e.stopPropagation()
    setState('busy')
    try {
      const r = await authFetch('/api/support/send-staged', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', wish_id: wishId }),
      })
      const d = await r.json()
      if (r.ok && d.ok) { setState('done'); onDone && onDone() } else setState('idle')
    } catch { setState('idle') }
  }
  if (state === 'done') return <span style={{ fontFamily: MONO, fontSize: 10, color: AMBER, ...style }}>Resolved ✓</span>
  return (
    <button onClick={go} disabled={state === 'busy'} title="Close this card — handled outside the system"
      style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: BONE_FAINT,
        background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 999,
        padding: '2px 10px', cursor: 'pointer', ...style }}>
      {state === 'busy' ? '…' : 'Mark resolved ✓'}
    </button>
  )
}

// ── M13: the press-send card — work is DONE, the human only fires ─────────────
function PressSendCard({ w, staged }) {
  ensurePressSendCss()
  const [phase, setPhase] = useState('ready') // ready | sending | sent | error
  const [err, setErr] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)
  const [note, setNote] = useState('')
  const [noteState, setNoteState] = useState('idle') // idle | sending | done
  // Long drafts clamp so the Send button never falls below the fold — the card's
  // whole reason to exist is that button. Full text is one tap away.
  const [fullReply, setFullReply] = useState(false)
  // The actual outgoing email — fetched so the human reads what really goes out.
  const [preview, setPreview] = useState(null) // {to, subject, text, attachments} | {error}
  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const r = await authFetch('/api/support/send-staged', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'preview', draft_id: staged.draftId, connection_id: staged.connectionId }),
        })
        const d = await r.json()
        if (!dead) setPreview(r.ok && d.ok ? d : { error: d.error || 'preview failed' })
      } catch { if (!dead) setPreview({ error: 'preview unreachable' }) }
    })()
    return () => { dead = true }
  }, [staged.draftId, staged.connectionId])

  async function fire() {
    setPhase('sending'); setErr('')
    try {
      const r = await authFetch('/api/support/send-staged', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', wish_id: w.id, draft_id: staged.draftId, connection_id: staged.connectionId }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) { setPhase('error'); setErr(d.error || 'send failed'); return }
      setPhase('sent')
    } catch { setPhase('error'); setErr('Could not reach the send endpoint.') }
  }

  async function sendNote() {
    if (!note.trim()) return
    setNoteState('sending')
    try {
      const r = await authFetch('/api/support/send-staged', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change', wish_id: w.id, note }),
      })
      const d = await r.json()
      setNoteState(r.ok && d.ok ? 'done' : 'idle')
    } catch { setNoteState('idle') }
  }

  const sent = phase === 'sent'
  return (
    <div className={sent ? 'ps-sent' : 'ps-card'} style={{
      background: `radial-gradient(120% 140% at 0% 0%, ${AMBER_SOFT} 0%, ${INK_CARD} 55%)`,
      border: `1.5px solid ${sent ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.55)'}`,
      borderRadius: 10, padding: '16px 16px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em',
          color: '#1A1206', background: AMBER, padding: '3px 10px', borderRadius: 999 }}>
          {sent ? 'SENT ✓' : '✦ WORK DONE — READY TO SEND'}
        </span>
        {(() => {
          // Gap #7: ready cards age — past an hour the wait turns amber and names itself.
          const waitedMs = Date.now() - new Date(w.created_at).getTime()
          const old = !sent && waitedMs > 60 * 60 * 1000
          return (
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: old ? 700 : 400,
              color: old ? AMBER : BONE_FAINT }}>
              {old ? `waiting on you · ${timeAgo(w.created_at)}` : timeAgo(w.created_at)}
            </span>
          )
        })()}
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 19, color: BONE, margin: '12px 0 4px', lineHeight: 1.2 }}>
        {w.name || w.email}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: BONE_DIM, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
        {staged.cleanMessage}
      </p>

      {/* The reply that actually goes out, verbatim — plus its attachments. */}
      <div style={{ marginTop: 12, padding: '10px 14px', background: INK_PANEL,
        borderLeft: `2.5px solid ${AMBER}`, borderRadius: '4px 8px 8px 4px' }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: AMBER }}>
          The reply{preview && !preview.error && preview.to ? ` · to ${preview.to}` : ''}
        </div>
        {preview === null && (
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: BONE_FAINT, fontStyle: 'italic' }}>Opening the staged reply…</p>
        )}
        {preview?.error && (
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: BONE_FAINT }}>
            Couldn't open the reply preview ({preview.error}) — Send still fires the staged draft as-is.
          </p>
        )}
        {preview && !preview.error && (
          <>
            {preview.subject && (
              <div style={{ margin: '6px 0 0', fontSize: 12, color: BONE_DIM, fontWeight: 600 }}>{preview.subject}</div>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 13, color: BONE, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              display: '-webkit-box', WebkitLineClamp: fullReply ? 999 : 8, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {preview.text || '(no text body)'}
            </p>
            {(preview.text || '').split('\n').length > 8 && (
              <button onClick={() => setFullReply((v) => !v)} style={{ background: 'transparent', border: 'none',
                padding: 0, marginTop: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: AMBER, cursor: 'pointer' }}>
                {fullReply ? 'Collapse reply' : 'Show full reply'}
              </button>
            )}
            {preview.attachments?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {preview.attachments.map((a, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 10.5, color: BONE_DIM,
                    border: `1px solid ${LINE}`, borderRadius: 999, padding: '3px 10px' }}>
                    ⎙ {a.name}{a.size ? ` · ${a.size > 1048576 ? (a.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(a.size / 1024)) + ' KB'}` : ''}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {phase !== 'sent' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="ps-send-btn" disabled={phase === 'sending'} onClick={fire} style={{
            fontFamily: BODY, fontWeight: 700, fontSize: 14, color: '#1A1206', background: AMBER,
            border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', letterSpacing: '0.01em' }}>
            {phase === 'sending' ? 'Sending…' : 'Send it →'}
          </button>
          <button className="ps-ghost-btn" onClick={() => setChangeOpen((v) => !v)} style={{
            fontFamily: BODY, fontWeight: 600, fontSize: 13, color: BONE_DIM, background: 'transparent',
            border: `1px solid ${LINE}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer' }}>
            Ask for a change
          </button>
          <ResolveBtn wishId={w.id} style={{ marginLeft: 'auto' }} />
          {phase === 'error' && <span style={{ fontSize: 12, color: '#F0A07A' }}>{err}</span>}
        </div>
      )}
      {sent && (
        <p style={{ margin: '12px 0 0', fontFamily: MONO, fontSize: 11, color: AMBER }}>
          Reply is on its way. Card resolves itself — nothing else needed.
        </p>
      )}
      {changeOpen && !sent && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {noteState === 'done' ? (
            <span style={{ fontSize: 12, color: AMBER, fontFamily: MONO }}>Noted — the agent is revising. A fresh card will appear when it's re-staged.</span>
          ) : (
            <>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change?"
                onKeyDown={(e) => { if (e.key === 'Enter') sendNote() }}
                style={{ flex: 1, fontFamily: BODY, fontSize: 13, color: BONE, background: INK_PANEL,
                  border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 12px', outline: 'none' }} />
              <button onClick={sendNote} disabled={noteState === 'sending'} style={{
                fontFamily: BODY, fontWeight: 600, fontSize: 13, color: BONE, background: 'transparent',
                border: `1px solid rgba(245,158,11,0.55)`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
                {noteState === 'sending' ? '…' : 'Send note'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function WishRow({ w, dim }) {
  const staged = parseStaged(w.message)
  if (staged && w.status !== 'resolved') return <PressSendCard w={w} staged={staged} />
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
          display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{(w.message || '').replace(STAGED_RE, '').trim()}</p>
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
      {w.status !== 'resolved' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <ResolveBtn wishId={w.id} />
        </div>
      )}
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
  // Open to "All" so the panel shows real content (with bulk mail filtered out)
  // rather than a barren empty view — Responded is genuinely sparse, so it's one
  // tap away rather than the default. The Responded view is where our inline
  // reply text shows once we've answered support threads.
  const [filter, setFilter] = useState('all') // all | needs | replied

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
          Last {data.days} days · support mailboxes · their message + our reply
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

// ── The focal point — one statement, not four equal tiles ────────────────────
// The only number that changes what you do next is how many things wait on you,
// so it is the headline (and a button: tap it, see them). Everything else reads
// as periphery. Counts render only after the full universe (wishes + mail) has
// loaded, so a number never shifts while you're reading it.
function FocusStrip({ loaded, needsCount, respondedToday, rate, onNeedsYou }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
      padding: '20px 24px 16px', borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
      {!loaded ? (
        <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, color: BONE_FAINT }}>·</span>
      ) : needsCount > 0 ? (
        <button onClick={onNeedsYou} title="Show what's waiting"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, color: BONE }}>
            <span style={{ color: AMBER }}>{needsCount}</span> waiting on you
          </span>
        </button>
      ) : (
        <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, color: BONE }}>All quiet.</span>
      )}
      {loaded && (
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: BONE_FAINT, paddingBottom: 7, whiteSpace: 'nowrap' }}>
          {respondedToday} responded today{rate == null ? '' : ` · ${rate}%`}
        </span>
      )}
    </div>
  )
}

// ── Unified "Support items" — wishes + email threads in one status-chipped list ─
// One item per contact regardless of channel. Common status vocabulary so a
// request and an email read the same: Needs you / Working / Responded / Resolved.
const UNI_STATUS = {
  needs_you: { label: 'Needs you', loud: true },
  working: { label: 'Working', loud: false },
  responded: { label: 'Responded', loud: false },
  resolved: { label: 'Resolved', loud: false },
}

function wishToItem(w) {
  // A staged (ready-to-send) wish IS waiting on you — it used to map to
  // 'working', which silently excluded it from the Needs-you filter.
  const ready = w.status !== 'resolved' && !!parseStaged(w.message)
  const status = w.status === 'resolved' ? 'resolved' : (w.status === 'needs_team' || ready) ? 'needs_you' : 'working'
  return {
    key: 'w' + w.id, kind: 'Request', who: w.name || w.email || 'Someone', ready,
    // strip the machine tag — resolved/fallback cards must never show raw [staged_draft:…]
    text: (w.message || '').replace(STAGED_RE, '').trim(),
    reply: w.latest_response?.body || null, status,
    date: w.created_at ? new Date(w.created_at).getTime() : 0, link: null,
    wish: w, // M13: lets the unified card render the press-send variant
  }
}
function emailToItem(it, replied) {
  return {
    key: (replied ? 'r' : 'n') + it.email + it.threadId, kind: 'Email', who: it.from || it.email,
    subject: it.subject, text: it.lastInbound?.snippet || it.subject || '',
    reply: replied ? (it.lastReply?.snippet || null) : null, status: replied ? 'responded' : 'needs_you',
    date: it.lastReply?.date || it.lastInbound?.date || it.date || 0,
    link: it.threadId ? `https://mail.google.com/mail/u/0/#all/${it.threadId}` : null,
  }
}

function SupportItemCard({ it }) {
  const st = UNI_STATUS[it.status] || { label: it.status, loud: false }
  const [open, setOpen] = useState(false)
  // M13: a wish carrying staged work renders as the press-send hero card.
  if (it.wish && it.wish.status !== 'resolved') {
    const staged = parseStaged(it.wish.message)
    if (staged) return <PressSendCard w={it.wish} staged={staged} />
  }
  return (
    <div style={{ background: st.loud ? AMBER_SOFT : INK_CARD, border: `1px solid ${st.loud ? 'rgba(245,158,11,0.35)' : LINE}`, borderRadius: 6, padding: 12, marginBottom: 8 }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: BONE }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: BONE_FAINT, border: `1px solid ${LINE}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{it.kind}</span>
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14, color: BONE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.who}</span>
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: st.loud ? AMBER : BONE_DIM, border: `1px solid ${st.loud ? AMBER : LINE}`, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap', flexShrink: 0 }}>{st.label}</span>
        </div>
        {it.subject && <p style={{ margin: '5px 0 0', fontSize: 13, color: BONE_DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.subject}</p>}
        {it.text && <p style={{ margin: '4px 0 0', fontSize: 12, color: BONE_FAINT, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.text}</p>}
        {it.reply && (
          <div style={{ marginTop: 7, padding: '6px 9px', background: AMBER_SOFT, borderLeft: `2px solid ${AMBER}`, borderRadius: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: AMBER }}>We replied</span>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: BONE_DIM, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.reply}</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span style={{ fontSize: 11, color: BONE_FAINT }}>{it.link ? (open ? 'hide' : 'view thread') : (open ? 'hide' : 'details')}</span>
          <span style={{ fontSize: 11, color: BONE_FAINT }}>{timeAgoMs(it.date)}</span>
        </div>
      </button>
      {open && it.link && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
          <a href={it.link} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: AMBER, textDecoration: 'none' }}>Open in Gmail →</a>
        </div>
      )}
      {it.wish && it.status !== 'resolved' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <ResolveBtn wishId={it.wish.id} />
        </div>
      )}
    </div>
  )
}

// The unified list, purely presentational — data + filter live in the parent so
// the headline, the chips, and the list can never tell three different stories.
function ItemsList({ items, loaded, filter }) {
  const shown = filter === 'all' ? items : items.filter((i) => i.status === filter)
  const firstDoneIdx = filter === 'all' ? shown.findIndex((i) => i.status === 'responded' || i.status === 'resolved') : -1
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 28px' }}>
      {!loaded && items.length === 0 && <p style={{ color: BONE_DIM, fontSize: 13 }}>Loading…</p>}
      {loaded && shown.length === 0 && (
        <div style={{ padding: '72px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: SERIF, fontSize: 24, color: BONE, margin: 0 }}>
            {filter === 'all' ? 'All quiet.' : 'Nothing here.'}
          </p>
          <p style={{ fontSize: 13, color: BONE_FAINT, margin: '8px 0 0' }}>
            {filter === 'all' ? 'New requests land here the moment they arrive.' : 'Items move here as their status changes.'}
          </p>
        </div>
      )}
      {shown.map((it, i) => (
        <div key={it.key}>
          {i === firstDoneIdx && firstDoneIdx > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 10px' }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: BONE_FAINT }}>Done</span>
              <span style={{ flex: 1, height: 1, background: LINE }} />
            </div>
          )}
          <SupportItemCard it={it} />
        </div>
      ))}
    </div>
  )
}

// ── Full dashboard ───────────────────────────────────────────────────────────
export default function SupportDashboard({ isDesktop = true, onClose, worldId }) {
  const [view, setView] = useState('all') // all | streams | chat | inbox (chat = mobile-only pane)
  const [filter, setFilter] = useState('all') // all | needs_you | responded | resolved

  // One data spine. The headline, the chips, and the list all read from here.
  const { wishes, mailboxes } = useSupportData(worldId)
  const loaded = wishes !== null && mailboxes !== null
  const items = buildItems(wishes, mailboxes)
  const counts = {
    all: items.length,
    needs_you: items.filter((i) => i.status === 'needs_you').length,
    responded: items.filter((i) => i.status === 'responded').length,
    resolved: items.filter((i) => i.status === 'resolved').length,
  }
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const wishResolvedToday = (wishes || []).filter((w) => w.status === 'resolved' && w.updated_at && new Date(w.updated_at) >= startOfDay).length
  const emailRepliedToday = (mailboxes || []).reduce((n, b) =>
    n + (b.replied || []).filter((it) => (it.lastReply?.date || 0) >= startOfDay.getTime()).length, 0)
  const respondedToday = wishResolvedToday + emailRepliedToday
  const openCount = counts.needs_you + items.filter((i) => i.status === 'working').length
  const rate = (openCount + respondedToday) > 0 ? Math.round((respondedToday / (openCount + respondedToday)) * 100) : null
  const goToNeedsYou = () => { setView('all'); setFilter('needs_you') }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 24px', borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
      <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 26, margin: 0, color: BONE, letterSpacing: '-0.01em' }}>Support</h1>
      <button onClick={onClose} style={{ ...ghostBtn, fontSize: 13 }} aria-label="Close support">Close ✕</button>
    </div>
  )

  const chips = view === 'all' && (
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 6 }}>
      <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label={loaded ? `All ${counts.all}` : 'All'} />
      <FilterPill active={filter === 'needs_you'} onClick={() => setFilter('needs_you')} label={loaded ? `Needs you ${counts.needs_you}` : 'Needs you'} loud />
      <FilterPill active={filter === 'responded'} onClick={() => setFilter('responded')} label={loaded ? `Responded ${counts.responded}` : 'Responded'} />
      {counts.resolved > 0 && <FilterPill active={filter === 'resolved'} onClick={() => setFilter('resolved')} label={`Resolved ${counts.resolved}`} />}
    </div>
  )

  if (!isDesktop) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: INK }}>
        {header}
        <FocusStrip loaded={loaded} needsCount={counts.needs_you} respondedToday={respondedToday} rate={rate} onNeedsYou={goToNeedsYou} />
        <div style={{ display: 'flex', gap: 4, padding: '8px 24px 0', flexWrap: 'wrap', alignItems: 'center' }}>
          <TabBtn active={view === 'all'} onClick={() => setView('all')} label="All" />
          <TabBtn active={view === 'streams'} onClick={() => setView('streams')} label="Requests" />
          <TabBtn active={view === 'chat'} onClick={() => setView('chat')} label="Chat" />
          <TabBtn active={view === 'inbox'} onClick={() => setView('inbox')} label="Inbox" />
          {chips}
        </div>
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {view === 'all' ? <ItemsList items={items} loaded={loaded} filter={filter} />
            : view === 'streams' ? <RequestsStream />
              : view === 'chat' ? <SupportInbox isDesktop={false} />
                : <InboxPanel worldId={worldId} />}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: INK }}>
      {header}
      <FocusStrip loaded={loaded} needsCount={counts.needs_you} respondedToday={respondedToday} rate={rate} onNeedsYou={goToNeedsYou} />
      <div style={{ display: 'flex', gap: 4, padding: '6px 24px 0', borderBottom: `1px solid ${LINE}`, alignItems: 'center', flexWrap: 'wrap' }}>
        <TabBtn active={view === 'all'} onClick={() => setView('all')} label="All support" />
        <TabBtn active={view === 'streams'} onClick={() => setView('streams')} label="Requests & chat" />
        <TabBtn active={view === 'inbox'} onClick={() => setView('inbox')} label="Inbox" />
        {chips}
      </div>
      {view === 'all' ? (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <ItemsList items={items} loaded={loaded} filter={filter} />
        </div>
      ) : view === 'streams' ? (
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
