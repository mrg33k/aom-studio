// SupportDashboard.jsx - M10 Track A. Full-screen Support command center inside Corner.
//
// Opened by the headphones icon (top-right). Takes over the screen (CornerV4 hides
// both rails while supportMode is on) and shows BOTH inbound streams in one view:
//   • Support requests - the speak-freely / email wishes (GET /api/support/wishes).
//     M6 routes inbound support emails into wishes, so this IS the email stream.
//   • Chat support - Corner Support widget visitor conversations (reuses SupportInbox).
// Each stream carries its own unread / needs-you notification count.
//
// Mission: corner:support-desk M10. Editorial deep-ink / bone / amber, the AOM system.

import { useState, useEffect, useCallback } from 'react'
import SupportInbox from './SupportInbox.jsx'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'

// M20-R1: v6 light theme - "Front Desk" design (2026-06-14 Patrik direction)
// Warm cream background, white cards, emerald accent, Fraunces serif + Instrument Sans body.
// "Old people can read em, young people love em" - accessible, modern, professional.
const BG_CREAM = '#F4EFE6'
const BG_WHITE = '#FFFFFF'
const ACCENT_EMERALD = '#0E8F66'
const ACCENT_EMERALD_SOFT = '#E6F5F0'
const ALERT_WARM = '#B5740C'
const ALERT_WARM_SOFT = '#FFF4E6'
const HOLD_BLUE = '#3E6DB5'
const HOLD_BLUE_SOFT = '#E8EFF7'
const TEXT_DARK = '#1A1A14'
const TEXT_DIM = '#5F5C52'
const TEXT_FAINT = '#9C9890'
const BORDER_LINE = '#E8E3D8'
const BORDER_LINE_DIM = '#F0EAE0'

// Typography system: Fraunces (serif, display) + Instrument Sans (body) + JetBrains Mono (labels)
const SERIF = '"Fraunces", Georgia, serif'
const BODY = '"Instrument Sans", system-ui, -apple-system, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, monospace'

// Backwards compat: map old CV3 references to new v6 palette (some components still use old names)
const AMBER = ACCENT_EMERALD
const AMBER_SOFT = ACCENT_EMERALD_SOFT
const INK = BG_CREAM
const INK_PANEL = BG_WHITE
const INK_CARD = BG_WHITE
const LINE = BORDER_LINE
const BONE = TEXT_DARK
const BONE_DIM = TEXT_DIM
const BONE_FAINT = TEXT_FAINT

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

// ── M17: wish messages carry a summary + the full original behind a delimiter ─
// support-email-watch / support-triage compose `summary\n\n--- ORIGINAL MESSAGE ---\noriginal`.
// Cards lead with the summary; the original is one tap away.
const ORIGINAL_DELIM = '--- ORIGINAL MESSAGE ---'
function splitOriginal(text) {
  const i = (text || '').indexOf(ORIGINAL_DELIM)
  if (i === -1) return { summary: (text || '').trim(), original: null }
  return { summary: text.slice(0, i).trim(), original: text.slice(i + ORIGINAL_DELIM.length).trim() }
}

// M17b: structured summaries - line 1 is the subject (headline), the rest is the ask.
// Old free-text cards fall through with no headline and render as plain body.
function parseWishSummary(summary) {
  const lines = (summary || '').split('\n').map((s) => s.trim()).filter(Boolean)
  if (lines.length >= 2) return { headline: lines[0], ask: lines.slice(1).join('\n') }
  return { headline: null, ask: (summary || '').trim() }
}

// M17c: the ask renders as a real bullet list - emerald markers, readable desktop type.
// Plain (non-bulleted, pre-M17c) text falls through as a paragraph.
function AskList({ ask, size = 15 }) {
  if (!ask) return null
  const lines = ask.split('\n').map((s) => s.trim()).filter(Boolean)
  const bullets = lines.filter((l) => l.startsWith('•'))
  if (bullets.length === 0) {
    return <p style={{ margin: 0, fontSize: size, color: BONE, lineHeight: 1.6 }}>{ask}</p>
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((l, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ color: ACCENT_EMERALD, fontSize: size - 2, lineHeight: 1.6, flexShrink: 0 }}>●</span>
          <span style={{ fontSize: size, color: BONE, lineHeight: 1.6 }}>{l.replace(/^•\s*/, '')}</span>
        </li>
      ))}
    </ul>
  )
}

// ── M18: "Chat about this email" - context block the EA chat opens with ──────
// Mirrors the Mail Room context shape agents already act on (mail-room-send-protocol):
// who, subject, the original text, the staged draft if one exists. Closing
// instruction keeps the loop draft-first.
function buildDiscussText({ who, email, subject, original, ask, staged, accessCode }) {
  const lines = [
    '[Mail Room context - discuss this support email]',
    `From: ${who}${email && email !== who ? ` <${email}>` : ''}`,
    subject ? `Subject: ${subject}` : null,
    accessCode ? `Support card: ${accessCode}` : null,
    staged ? `Staged Gmail draft: ${staged.draftId} (connection ${staged.connectionId})` : null,
    '',
    ask ? `What they're asking:\n${ask}\n` : null,
    original ? `Original message:\n${original.slice(0, 2500)}\n` : null,
    "Let's talk through how to respond. When we land on a reply, " +
      (staged ? 'update the staged draft' : 'draft the reply threaded on the original email') +
      " - don't send anything until I say so.",
  ].filter((l) => l !== null)
  return lines.join('\n')
}

function DiscussBtn({ onDiscuss, payload, style }) {
  if (!onDiscuss) return null
  return (
    <button className="ps-ghost-btn" onClick={(e) => { e.stopPropagation(); onDiscuss(buildDiscussText(payload)) }}
      title="Open a chat with your agent about this email"
      style={{ fontFamily: BODY, fontWeight: 600, fontSize: 13, color: TEXT_DIM, background: 'transparent',
        border: `1px solid ${BORDER_LINE}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
        transition: 'border-color 140ms ease, color 140ms ease', ...style }}
      onMouseEnter={(e) => { e.target.style.borderColor = ACCENT_EMERALD; e.target.style.color = BONE }}
      onMouseLeave={(e) => { e.target.style.borderColor = BORDER_LINE; e.target.style.color = TEXT_DIM }}>
      Chat about this
    </button>
  )
}

function OriginalBlock({ original }) {
  const [show, setShow] = useState(false)
  if (!original) return null
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={(e) => { e.stopPropagation(); setShow((v) => !v) }} style={{ background: 'transparent',
        border: 'none', padding: 0, fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: ACCENT_EMERALD, cursor: 'pointer' }}>
        {show ? 'Hide original message' : 'View original message'}
      </button>
      {show && (
        <p style={{ margin: '6px 0 0', padding: '8px 10px', background: BG_WHITE, borderRadius: 4,
          border: `1px solid ${BORDER_LINE_DIM}`, fontSize: 12, color: TEXT_DIM, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>{original}</p>
      )}
    </div>
  )
}

let pressSendCssInjected = false
function ensurePressSendCss() {
  if (pressSendCssInjected || typeof document === 'undefined') return
  pressSendCssInjected = true
  const el = document.createElement('style')
  el.textContent = `
    @keyframes ps-breathe { 0%,100% { box-shadow: 0 0 0 0 rgba(14,143,102,0.0), 0 0 18px rgba(14,143,102,0.10); }
      50% { box-shadow: 0 0 0 1px rgba(14,143,102,0.22), 0 0 28px rgba(14,143,102,0.22); } }
    @keyframes ps-pop { 0% { transform: scale(0.92); opacity: 0.4; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes ps-shimmer { 0% { background-position: -160px 0; } 100% { background-position: 160px 0; } }
    .ps-card { animation: ps-breathe 3.2s ease-in-out infinite; }
    .ps-send-btn { transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease; }
    .ps-send-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(14,143,102,0.45); filter: brightness(0.95); }
    .ps-send-btn:active { transform: translateY(0) scale(0.98); }
    .ps-send-btn[disabled] { background-image: linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 70%);
      background-size: 160px 100%; background-repeat: no-repeat; animation: ps-shimmer 1.1s linear infinite; cursor: wait; }
    .ps-sent { animation: ps-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .ps-ghost-btn { transition: border-color 140ms ease, color 140ms ease; }
    .ps-ghost-btn:hover { border-color: rgba(14,143,102,0.7) !important; color: inherit; }
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

// R88: keep the support board for real, two-way support. An email from a
// no-reply / automated / bulk-marketing sender can never be a support
// conversation, so drop it before it clutters the board. Conservative on
// purpose: only clear automated senders and obvious marketing, never an
// ambiguous human address (better to show a maybe than hide a real customer).
function isNonSupportEmail(it) {
  const from = String(it.email || it.from || '').toLowerCase()
  const subj = String(it.subject || '').toLowerCase()
  const body = String((it.lastInbound && it.lastInbound.snippet) || it.snippet || '').toLowerCase()
  // Automated / no-reply senders: never a reply-able support thread.
  if (/(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce[@+]|notifications?@|newsletter@|marketing@|mailchimp|sendgrid|salesforce|hubspot)/.test(from)) return true
  // Obvious bulk marketing: an unsubscribe footer AND a promo subject.
  if (/unsubscribe|update your preferences|view (this|in) (your )?browser/.test(body) &&
      /(% off|\bsale\b|webinar|newsletter|deal|limited time|promo|discount|save \$|free trial)/.test(subj + ' ' + body)) return true
  return false
}

// A wish can also be spawned from a marketing blast that slipped past intake
// (the triage agent even stages a reply to it). Same posture as the email
// filter: only drop clear automated/marketing senders, and NEVER something a
// human already replied to or resolved. Conservative AND condition on the body
// so a real customer ask is never hidden.
function isNonSupportWish(w) {
  if (!w || w.status === 'resolved' || w.latest_response) return false
  // The intake/triage agent already classifies blasts as 'spam' — honor it.
  // (Bug was: wishToItem only special-cased 'resolved', so a spam wish with a
  // staged draft still computed ready=true and showed in 'Ready to send'.)
  if (w.status === 'spam') return true
  const from = String(w.email || '').toLowerCase()
  const body = String(w.message || '').toLowerCase()
  if (/(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce[@+]|notifications?@|newsletter@|marketing@|mailchimp|sendgrid|klaviyo|kmail-lists|salesforce|hubspot)/.test(from)) return true
  if (/unsubscribe|update your preferences|manage your preferences|view (this|in) (your )?browser/.test(body) &&
      /(% off|\bsale\b|webinar|newsletter|deal|limited time|promo|discount|save \$|save up to|free trial|purchase online)/.test(body)) return true
  return false
}

// What needs you leads (ready -> needs_you -> working -> rest), then NEWEST FIRST
// within each group. Newest-first matches a normal inbox + the CV6 design (recent
// asks at top); the old oldest-wait-first surfaced stale days-old promo mail at the
// very top, which read as "emails not in order".
function buildItems(wishes, mailboxes) {
  const items = []
  for (const w of wishes || []) { if (isNonSupportWish(w)) continue; items.push(wishToItem(w)) }
  for (const box of mailboxes || []) {
    for (const it of box.needs || []) { if (isNonSupportEmail(it)) continue; items.push(emailToItem(it, false)) }
    for (const it of box.replied || []) { if (isNonSupportEmail(it)) continue; items.push(emailToItem(it, true)) }
  }
  const rank = (it) => (it.ready ? 0 : it.status === 'needs_you' ? 1 : it.status === 'working' ? 2 : 3)
  items.sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    if (ra !== rb) return ra - rb
    return (b.date || 0) - (a.date || 0) // newest first within a group
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
  if (state === 'done') return <span style={{ fontFamily: MONO, fontSize: 10, color: ACCENT_EMERALD, ...style }}>Resolved ✓</span>
  return (
    <button onClick={go} disabled={state === 'busy'} title="Close this card - handled outside the system"
      style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: TEXT_FAINT,
        background: 'transparent', border: `1px solid ${BORDER_LINE}`, borderRadius: 999,
        padding: '2px 10px', cursor: 'pointer', ...style }}>
      {state === 'busy' ? '…' : 'Mark resolved ✓'}
    </button>
  )
}

// ── M13: the press-send card - work is DONE, the human only fires ─────────────
function PressSendCard({ w, staged, onDiscuss }) {
  ensurePressSendCss()
  const [phase, setPhase] = useState('ready') // ready | sending | sent | error
  const [err, setErr] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)
  const [note, setNote] = useState('')
  const [noteState, setNoteState] = useState('idle') // idle | sending | done
  // Long drafts clamp so the Send button never falls below the fold - the card's
  // whole reason to exist is that button. Full text is one tap away.
  const [fullReply, setFullReply] = useState(false)
  // The actual outgoing email - fetched so the human reads what really goes out.
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
      background: BG_WHITE,
      border: `1.5px solid ${sent ? `rgba(14,143,102,0.15)` : `rgba(14,143,102,0.35)`}`,
      borderRadius: 18, padding: '20px 22px 18px', marginBottom: 14,
      boxShadow: '0 2px 8px rgba(26,26,20,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em',
          color: BG_WHITE, background: ACCENT_EMERALD, padding: '4px 12px', borderRadius: 999 }}>
          {sent ? 'SENT ✓' : '✦ READY TO SEND'}
        </span>
        {(() => {
          // Gap #7: ready cards age - past an hour the wait turns warm-alert and names itself.
          const waitedMs = Date.now() - new Date(w.created_at).getTime()
          const old = !sent && waitedMs > 60 * 60 * 1000
          return (
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: old ? 700 : 400,
              color: old ? ALERT_WARM : TEXT_FAINT }}>
              {old ? `waiting on you · ${timeAgo(w.created_at)}` : timeAgo(w.created_at)}
            </span>
          )
        })()}
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 13.5, color: TEXT_DIM, margin: '14px 0 0',
        letterSpacing: '0.01em' }}>
        {w.name || w.email}
      </div>
      {(() => {
        const { summary, original } = splitOriginal(staged.cleanMessage)
        const { headline, ask } = parseWishSummary(summary)
        return (
          <>
            {headline && (
              <div style={{ fontFamily: SERIF, fontSize: 25, color: TEXT_DARK, margin: '4px 0 0', lineHeight: 1.2, fontWeight: 600 }}>
                {headline}
              </div>
            )}
            {/* M17c: their points on the left, the original on the right (scrollable). */}
            <div style={{ display: 'grid', gridTemplateColumns: original ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
              gap: 20, marginTop: 16, alignItems: 'start' }}>
              {ask && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: ACCENT_EMERALD, marginBottom: 10, fontWeight: 600 }}>They asked</div>
                  <AskList ask={ask} size={15} />
                </div>
              )}
              {original && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: TEXT_FAINT, marginBottom: 10, fontWeight: 600 }}>Original message</div>
                  <div style={{ padding: '12px 14px', background: BG_WHITE, borderRadius: 6,
                    border: `1px solid ${BORDER_LINE_DIM}`, fontSize: 13.5, color: TEXT_DIM, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto' }}>{original}</div>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* The reply that actually goes out, verbatim - plus its attachments. */}
      <div style={{ marginTop: 18, padding: '14px 18px', background: BG_WHITE,
        borderLeft: `2.5px solid ${ACCENT_EMERALD}`, borderRadius: '4px 8px 8px 4px',
        border: `1px solid ${BORDER_LINE_DIM}`, borderLeftWidth: '2.5px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT_EMERALD, fontWeight: 600 }}>
          Our reply{preview && !preview.error && preview.to ? ` · to ${preview.to}` : ''}
        </div>
        {preview === null && (
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: TEXT_FAINT, fontStyle: 'italic' }}>Opening the staged reply…</p>
        )}
        {preview?.error && (
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: TEXT_FAINT }}>
            Couldn't open the reply preview ({preview.error}) - Send still fires the staged draft as-is.
          </p>
        )}
        {preview && !preview.error && (
          <>
            {preview.subject && (
              <div style={{ margin: '6px 0 0', fontSize: 12, color: TEXT_DIM, fontWeight: 600 }}>{preview.subject}</div>
            )}
            <p style={{ margin: '8px 0 0', fontSize: 15, color: TEXT_DARK, lineHeight: 1.65, whiteSpace: 'pre-wrap',
              display: '-webkit-box', WebkitLineClamp: fullReply ? 999 : 8, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {preview.text || '(no text body)'}
            </p>
            {(preview.text || '').split('\n').length > 8 && (
              <button onClick={() => setFullReply((v) => !v)} style={{ background: 'transparent', border: 'none',
                padding: 0, marginTop: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: ACCENT_EMERALD, cursor: 'pointer' }}>
                {fullReply ? 'Collapse reply' : 'Show full reply'}
              </button>
            )}
            {preview.attachments?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {preview.attachments.map((a, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 10.5, color: TEXT_DIM,
                    border: `1px solid ${BORDER_LINE}`, borderRadius: 999, padding: '3px 10px' }}>
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
            fontFamily: BODY, fontWeight: 700, fontSize: 14, color: BG_WHITE, background: ACCENT_EMERALD,
            border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', letterSpacing: '0.01em' }}>
            {phase === 'sending' ? 'Sending…' : 'Send it'}
          </button>
          <button className="ps-ghost-btn" onClick={() => setChangeOpen((v) => !v)} style={{
            fontFamily: BODY, fontWeight: 600, fontSize: 13, color: TEXT_DIM, background: 'transparent',
            border: `1px solid ${BORDER_LINE}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
            transition: 'border-color 140ms ease, color 140ms ease' }}>
            Ask for a change
          </button>
          {(() => {
            const { summary, original } = splitOriginal(staged.cleanMessage)
            const { headline, ask } = parseWishSummary(summary)
            return <DiscussBtn onDiscuss={onDiscuss} payload={{ who: w.name || w.email, email: w.email,
              subject: headline, original, ask, staged, accessCode: w.access_code }} />
          })()}
          <ResolveBtn wishId={w.id} style={{ marginLeft: 'auto' }} />
          {phase === 'error' && <span style={{ fontSize: 12, color: '#F0A07A' }}>{err}</span>}
        </div>
      )}
      {sent && (
        <p style={{ margin: '12px 0 0', fontFamily: MONO, fontSize: 11, color: AMBER }}>
          Reply is on its way. Card resolves itself - nothing else needed.
        </p>
      )}
      {changeOpen && !sent && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {noteState === 'done' ? (
            <span style={{ fontSize: 12, color: ACCENT_EMERALD, fontFamily: MONO }}>Noted - the agent is revising. A fresh card will appear when it's re-staged.</span>
          ) : (
            <>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change?"
                onKeyDown={(e) => { if (e.key === 'Enter') sendNote() }}
                style={{ flex: 1, fontFamily: BODY, fontSize: 13, color: TEXT_DARK, background: BG_WHITE,
                  border: `1px solid ${BORDER_LINE}`, borderRadius: 8, padding: '8px 12px', outline: 'none' }} />
              <button onClick={sendNote} disabled={noteState === 'sending'} style={{
                fontFamily: BODY, fontWeight: 600, fontSize: 13, color: TEXT_DIM, background: 'transparent',
                border: `1px solid rgba(14,143,102,0.35)`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
                {noteState === 'sending' ? '…' : 'Send note'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// The conversation on a card: who said what, in order, with the actual text. This is "show me what
// we said to the person" — the holding note, our replies, and their messages, all readable.
function ConversationThread({ updates, wish }) {
  const convo = (updates || []).filter((u) => ['client_message', 'soft_ack', 'response'].includes(u.kind))
  if (!convo.length) return null
  const META = {
    client_message: { who: wish.name || wish.email || 'Them', out: false },
    soft_ack: { who: 'We sent a holding note', out: true },
    response: { who: 'We replied', out: true },
  }
  return (
    <div style={{ margin: '4px 0 2px' }}>
      {convo.map((u) => {
        const m = META[u.kind]
        return (
          <div key={u.id} style={{ display: 'flex', justifyContent: m.out ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
            <div style={{ maxWidth: '88%', background: m.out ? ACCENT_EMERALD_SOFT : BG_WHITE,
              border: `1px solid ${m.out ? 'rgba(14,143,102,0.30)' : BORDER_LINE}`, borderRadius: 12, padding: '7px 10px' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: m.out ? ACCENT_EMERALD : TEXT_FAINT, marginBottom: 2 }}>
                {m.who} · {timeAgo(u.created_at)}
              </div>
              <div style={{ fontFamily: BODY, fontSize: 13, color: TEXT_DARK, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{u.body || ''}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Reply to the chain, in-thread, from the board. Posts to /api/support/reply.
function ReplyComposer({ wish, onSent }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState(null)
  async function send() {
    if (!text.trim() || sending) return
    setSending(true); setErr(null)
    try {
      const r = await authFetch('/api/support/reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: wish.access_code, text }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.ok) { setErr(d.error === 'send-failed' ? 'could not send the email' : (d.error || 'could not send')); return }
      onSent && onSent(text)
      setText('')
    } catch { setErr('could not send') }
    finally { setSending(false) }
  }
  return (
    <div style={{ marginTop: 8 }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="Reply to this person, in their email thread…"
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: BODY, fontSize: 13, color: TEXT_DARK,
          border: `1px solid ${BORDER_LINE}`, borderRadius: 12, padding: '8px 10px', resize: 'vertical', background: BG_WHITE }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: err ? ALERT_WARM : TEXT_FAINT }}>
          {err ? err : 'Sends from the inbox it arrived in, in the same thread.'}
        </span>
        <button onClick={send} disabled={!text.trim() || sending}
          style={{ fontFamily: BODY, fontSize: 13, fontWeight: 600, color: BG_WHITE,
            background: text.trim() && !sending ? ACCENT_EMERALD : TEXT_FAINT, border: 'none',
            borderRadius: 10, padding: '7px 16px', cursor: text.trim() && !sending ? 'pointer' : 'default' }}>
          {sending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </div>
  )
}

function WishRow({ w, dim }) {
  const staged = parseStaged(w.message)
  if (staged && w.status !== 'resolved') return <PressSendCard w={w} staged={staged} />
  const msgParts = splitOriginal((w.message || '').replace(STAGED_RE, '').trim())
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
    <div style={{ background: loud ? ACCENT_EMERALD_SOFT : BG_WHITE,
      border: `1px solid ${loud ? 'rgba(14,143,102,0.35)' : BORDER_LINE}`, borderRadius: 18,
      padding: 12, marginBottom: 8, opacity: dim ? 0.6 : 1 }}>
      <button onClick={toggle} aria-expanded={open} style={{ display: 'block', width: '100%',
        textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: TEXT_DARK }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14, color: TEXT_DARK }}>{w.name || w.email}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {overSla && (
              <span title="Open past the 10-minute target" style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700,
                color: BG_WHITE, background: ALERT_WARM, padding: '1px 5px', borderRadius: 8 }}>OVER 10M</span>
            )}
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: loud ? ACCENT_EMERALD : TEXT_DIM, background: 'transparent',
              border: `1px solid ${loud ? ACCENT_EMERALD : BORDER_LINE}`, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap' }}>
              {STATUS_LABEL[w.status] || w.status}
            </span>
          </span>
        </div>
        {(() => {
          const { headline, ask } = parseWishSummary(msgParts.summary)
          return (
            <>
              {headline && (
                <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 15, color: TEXT_DARK,
                  margin: '6px 0 0', lineHeight: 1.35 }}>{headline}</div>
              )}
              <p style={{ margin: headline ? '4px 0 0' : '6px 0 0', fontSize: 14, color: TEXT_DIM, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ask}</p>
            </>
          )
        })()}
        {w.latest_response && (
          <div style={{ marginTop: 7, padding: '6px 9px', background: ACCENT_EMERALD_SOFT, borderLeft: `2px solid ${ACCENT_EMERALD}`, borderRadius: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT_EMERALD }}>We replied</span>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: TEXT_DIM, lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{w.latest_response.body}</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, alignItems: 'baseline' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_FAINT }}>{w.source || 'web'}</span>
            {w.soft_ack_at && !w.latest_response && (
 <span title={`Holding note auto-sent ${timeAgo(w.soft_ack_at)}, real reply still pending`}
                style={{ fontFamily: MONO, fontSize: 9.5, color: ACCENT_EMERALD, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 7 }}>●</span> holding note sent
              </span>
            )}
          </span>
          <span style={{ fontSize: 11, color: TEXT_FAINT }}>{open ? 'hide activity' : 'activity'} · {timeAgo(w.created_at)}</span>
        </div>
      </button>
      {w.status !== 'resolved' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <ResolveBtn wishId={w.id} />
        </div>
      )}
      {open && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${BORDER_LINE}`, paddingTop: 8 }}>
          <OriginalBlock original={msgParts.original} />
          {loading && <span style={{ fontSize: 12, color: TEXT_FAINT }}>Loading conversation…</span>}
          {updates && updates.length === 0 && <span style={{ fontSize: 12, color: TEXT_FAINT }}>No activity yet - heard, awaiting triage.</span>}
          {/* The actual conversation: what they sent, what WE sent back (holding note + replies). */}
          <ConversationThread updates={updates} wish={w} />
          {/* Internal status moves, kept faint and out of the way. */}
          {updates && updates.filter((u) => u.kind === 'status_change').map((u) => (
            <div key={u.id} style={{ display: 'flex', gap: 8, padding: '2px 0', alignItems: 'baseline' }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: TEXT_FAINT, textTransform: 'uppercase', minWidth: 64 }}>
                {STATUS_LABEL[u.status] || u.status || 'note'}
              </span>
              <span style={{ flex: 1, fontSize: 11, color: TEXT_FAINT, lineHeight: 1.4 }}>{u.body || ''}</span>
              <span style={{ fontSize: 9, color: TEXT_FAINT }}>{timeAgo(u.created_at)}</span>
            </div>
          ))}
          {/* Reply to the chain yourself — in-thread, from the inbox it arrived in. */}
          {w.status !== 'resolved' && updates !== null && (
            <ReplyComposer wish={w} onSent={(t) => setUpdates((prev) => [...(prev || []), {
              id: `local-${Date.now()}`, kind: 'response', body: t, author: 'patrik',
              visible_to_client: true, created_at: new Date().toISOString(),
            }])} />
          )}
        </div>
      )}
    </div>
  )
}

function StreamHeader({ title, sub, count, total, onRefresh }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '16px 16px 12px', borderBottom: `1px solid ${BORDER_LINE}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 22, margin: 0, color: TEXT_DARK }}>{title}</h2>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEXT_FAINT }}>{sub}</span>
        {count > 0 && (
          <span style={{ background: ACCENT_EMERALD, color: BG_WHITE, fontFamily: MONO, fontSize: 11, fontWeight: 700,
            padding: '1px 7px', borderRadius: 10 }}>{count}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_FAINT }}>{total ?? ''}</span>
        {onRefresh && <button onClick={onRefresh} style={ghostBtn}>Refresh</button>}
      </div>
    </div>
  )
}

// ── Cross-mailbox inbox (the "support emails" stream beyond wishes) ───────────
// Each correspondent renders as an expandable thread card: collapsed shows who +
// subject + a preview of the latest message; expanded shows what THEY wrote and
// what WE replied, with Open-in-Gmail + reply-by-mail links. This is the heart of
// "show me the support emails we responded to" - our actual reply text, inline.
function InboxThreadCard({ it, loud }) {
  const [open, setOpen] = useState(false)
  const gmailUrl = it.threadId ? `https://mail.google.com/mail/u/0/#all/${it.threadId}` : null
  const previewWho = it.lastReply?.snippet ? 'You' : it.from
  const preview = it.lastReply?.snippet || it.lastInbound?.snippet || ''
  const when = it.lastReply?.date || it.lastInbound?.date || it.date
  return (
    <div style={{ background: loud ? ACCENT_EMERALD_SOFT : BG_WHITE,
      border: `1px solid ${loud ? 'rgba(14,143,102,0.35)' : BORDER_LINE}`, borderRadius: 18, padding: 12, marginBottom: 8 }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ display: 'block', width: '100%',
        textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: TEXT_DARK }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: loud ? ACCENT_EMERALD : TEXT_FAINT }} />
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14, color: TEXT_DARK,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.from}</span>
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: loud ? ACCENT_EMERALD : TEXT_FAINT, textTransform: 'uppercase', flexShrink: 0 }}>
            {loud ? 'Needs reply' : 'Responded'}
          </span>
        </div>
        <p style={{ margin: '5px 0 0', fontSize: 13, color: TEXT_DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.subject}</p>
        {preview && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: TEXT_FAINT, lineHeight: 1.4, display: '-webkit-box',
            WebkitLineClamp: open ? 99 : 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <span style={{ color: it.lastReply?.snippet ? ACCENT_EMERALD : TEXT_FAINT }}>{previewWho}:</span> {preview}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span style={{ fontSize: 11, color: TEXT_FAINT }}>{open ? 'hide thread' : 'view thread'}</span>
          <span style={{ fontSize: 11, color: TEXT_FAINT }}>{timeAgoMs(when)}</span>
        </div>
      </button>
      {open && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${BORDER_LINE}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEXT_FAINT, marginBottom: 4 }}>
              They wrote {it.lastInbound?.date ? `· ${timeAgoMs(it.lastInbound.date)}` : ''}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: TEXT_DIM, lineHeight: 1.5 }}>{it.lastInbound?.snippet || '-'}</p>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: it.lastReply ? ACCENT_EMERALD : TEXT_FAINT, marginBottom: 4 }}>
              We replied {it.lastReply?.date ? `· ${timeAgoMs(it.lastReply.date)}` : ''}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: it.lastReply ? TEXT_DARK : TEXT_FAINT, lineHeight: 1.5 }}>
              {it.lastReply?.snippet || 'No reply sent yet.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {gmailUrl && (
              <a href={gmailUrl} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: ACCENT_EMERALD, textDecoration: 'none' }}>Open in Gmail →</a>
            )}
            <a href={`mailto:${it.email}?subject=${encodeURIComponent('Re: ' + (it.subject || ''))}`}
              style={{ fontFamily: MONO, fontSize: 11, color: TEXT_FAINT, textDecoration: 'none' }}>Reply by mail</a>
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
  // rather than a barren empty view - Responded is genuinely sparse, so it's one
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
        else if (isAom) { setError('Could not verify your session - refresh and try again.') }
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
        <p style={{ fontFamily: SERIF, fontSize: 22, margin: '0 0 6px', color: TEXT_DARK }}>Unlock the inbox</p>
        <p style={{ color: TEXT_DIM, fontSize: 13, margin: '0 0 14px' }}>Cross-mailbox tracking needs the team password.</p>
        <form onSubmit={(e) => { e.preventDefault(); load(input) }}>
          <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Team password"
            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: `1px solid ${BORDER_LINE}`,
              borderRadius: 4, color: TEXT_DARK, fontFamily: BODY, fontSize: 14, padding: '10px 12px', marginBottom: 10, outline: 'none' }} />
          {error && <p style={{ color: ALERT_WARM, fontSize: 12 }}>{error}</p>}
          <button type="submit" style={{ background: ACCENT_EMERALD, color: BG_WHITE, border: 'none', fontFamily: BODY,
            fontSize: 14, fontWeight: 700, padding: '10px 22px', borderRadius: 3, cursor: 'pointer' }}>Load inbox</button>
        </form>
      </div>
    )
  }
  if (loading && !data) return <p style={{ padding: 24, color: TEXT_DIM }}>Reading the mailboxes…</p>
  if (error && !data) return <div style={{ padding: 24 }}><p style={{ color: ALERT_WARM, marginBottom: 10 }}>{error}</p><button onClick={() => load(pw)} style={ghostBtn}>Retry</button></div>
  if (!data) return null
  const boxes = data.mailboxes || []
  const totalNeeds = boxes.reduce((n, b) => n + (b.needs?.length || 0), 0)
  const totalReplied = boxes.reduce((n, b) => n + (b.replied?.length || 0), 0)
  const shownCount = filter === 'needs' ? totalNeeds : filter === 'replied' ? totalReplied : totalNeeds + totalReplied
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: '0 0 16px' }}>
        <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEXT_FAINT, margin: 0 }}>
          Last {data.days} days · support mailboxes · their message + our reply
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label={`All ${totalNeeds + totalReplied}`} />
          <FilterPill active={filter === 'needs'} onClick={() => setFilter('needs')} label={`Needs reply ${totalNeeds}`} loud />
          <FilterPill active={filter === 'replied'} onClick={() => setFilter('replied')} label={`Responded ${totalReplied}`} />
        </div>
      </div>
      {boxes.length === 0 && <p style={{ color: TEXT_DIM }}>No connected mailboxes.</p>}
      {boxes.length > 0 && shownCount === 0 && (
        <div style={{ padding: '28px 4px', color: TEXT_FAINT, fontSize: 13, lineHeight: 1.5 }}>
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
          <section key={box.email} style={{ background: BG_WHITE, border: `1px solid ${BORDER_LINE}`, borderRadius: 8, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 18, margin: 0, color: TEXT_DARK }}>{box.email}</h3>
              {box.error
                ? <span style={{ fontFamily: MONO, fontSize: 10, color: ALERT_WARM }}>{box.error}</span>
                : <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_FAINT }}>{(box.needs?.length || 0)} need reply · {(box.replied?.length || 0)} replied</span>}
            </div>
            {!box.error && needs.map((it) => <InboxThreadCard key={'n' + it.email + it.threadId} it={it} loud />)}
            {!box.error && replied.map((it) => <InboxThreadCard key={'r' + it.email + it.threadId} it={it} />)}
            {!box.error && needs.length === 0 && replied.length === 0 &&
              <span style={{ fontSize: 12, color: TEXT_FAINT }}>
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
    <button onClick={onClick} style={{ background: active ? (loud ? ACCENT_EMERALD : BG_WHITE) : 'transparent',
      color: active ? (loud ? BG_WHITE : TEXT_DARK) : TEXT_FAINT, border: `1px solid ${active ? (loud ? ACCENT_EMERALD : BORDER_LINE) : BORDER_LINE}`,
      borderRadius: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: '3px 10px', cursor: 'pointer', fontWeight: active ? 700 : 500 }}>{label}</button>
  )
}

// ── The focal point - one statement, not four equal tiles ────────────────────
// The only number that changes what you do next is how many things wait on you,
// so it is the headline (and a button: tap it, see them). Everything else reads
// as periphery. Counts render only after the full universe (wishes + mail) has
// loaded, so a number never shifts while you're reading it.
function FocusStrip({ loaded, needsCount, respondedToday, rate, onNeedsYou }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
      padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER_LINE}`, flexShrink: 0 }}>
      {!loaded ? (
        <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, color: TEXT_FAINT }}>·</span>
      ) : needsCount > 0 ? (
        <button onClick={onNeedsYou} title="Show what's waiting"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, color: TEXT_DARK }}>
            <span style={{ color: ACCENT_EMERALD }}>{needsCount}</span> waiting on you
          </span>
        </button>
      ) : (
        <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, color: TEXT_DARK }}>All quiet.</span>
      )}
      {loaded && (
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: TEXT_FAINT, paddingBottom: 7, whiteSpace: 'nowrap' }}>
          {respondedToday} responded today{rate == null ? '' : ` · ${rate}%`}
        </span>
      )}
    </div>
  )
}

// ── Unified "Support items" - wishes + email threads in one status-chipped list ─
// One item per contact regardless of channel. Common status vocabulary so a
// request and an email read the same: Needs you / Working / Responded / Resolved.
const UNI_STATUS = {
  needs_you: { label: 'Needs you', loud: true },
  working: { label: 'Working', loud: false },
  responded: { label: 'Responded', loud: false },
  resolved: { label: 'Resolved', loud: false },
}

function wishToItem(w) {
  // A staged (ready-to-send) wish IS waiting on you - it used to map to
  // 'working', which silently excluded it from the Needs-you filter.
  const ready = w.status !== 'resolved' && !!parseStaged(w.message)
  const status = w.status === 'resolved' ? 'resolved' : (w.status === 'needs_team' || ready) ? 'needs_you' : 'working'
  // M17b: structured message - headline as subject, ask as preview, original collapsed.
  const { summary, original } = splitOriginal((w.message || '').replace(STAGED_RE, '').trim())
  const { headline, ask } = parseWishSummary(summary)
  return {
    key: 'w' + w.id, kind: 'Request', who: w.name || w.email || 'Someone', ready,
    subject: headline || null, text: ask, original,
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

function SupportItemCard({ it, onDiscuss }) {
  const st = UNI_STATUS[it.status] || { label: it.status, loud: false }
  const [open, setOpen] = useState(false)
  // M13: a wish carrying staged work renders as the press-send hero card.
  if (it.wish && it.wish.status !== 'resolved') {
    const staged = parseStaged(it.wish.message)
    if (staged) return <PressSendCard w={it.wish} staged={staged} onDiscuss={onDiscuss} />
  }
  return (
    <div style={{ background: st.loud ? ACCENT_EMERALD_SOFT : BG_WHITE, border: `1px solid ${st.loud ? 'rgba(14,143,102,0.35)' : BORDER_LINE}`, borderRadius: 18, padding: 12, marginBottom: 8 }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: TEXT_DARK }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: TEXT_FAINT, border: `1px solid ${BORDER_LINE}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{it.kind}</span>
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14, color: TEXT_DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.who}</span>
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: st.loud ? ACCENT_EMERALD : TEXT_DIM, border: `1px solid ${st.loud ? ACCENT_EMERALD : BORDER_LINE}`, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap', flexShrink: 0 }}>{st.label}</span>
        </div>
        {it.subject && <p style={{ margin: '5px 0 0', fontSize: 14.5, fontWeight: 600, color: TEXT_DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.subject}</p>}
        {it.text && <p style={{ margin: '5px 0 0', fontSize: 13.5, color: TEXT_DIM, lineHeight: 1.5, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.text}</p>}
        {it.reply && (
          <div style={{ marginTop: 7, padding: '6px 9px', background: ACCENT_EMERALD_SOFT, borderLeft: `2px solid ${ACCENT_EMERALD}`, borderRadius: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT_EMERALD }}>We replied</span>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: TEXT_DIM, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.reply}</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span style={{ fontSize: 11, color: TEXT_FAINT }}>{it.link ? (open ? 'hide' : 'view thread') : (open ? 'hide' : 'details')}</span>
          <span style={{ fontSize: 11, color: TEXT_FAINT }}>{timeAgoMs(it.date)}</span>
        </div>
      </button>
      {open && (it.link || it.original) && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${BORDER_LINE}`, paddingTop: 8 }}>
          {it.original && <OriginalBlock original={it.original} />}
          {it.link && (
            <a href={it.link} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: ACCENT_EMERALD, textDecoration: 'none' }}>Open in Gmail →</a>
          )}
        </div>
      )}
      {it.status !== 'resolved' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <DiscussBtn onDiscuss={onDiscuss} style={{ fontSize: 11, padding: '4px 12px' }}
            payload={{ who: it.who, email: it.wish?.email, subject: it.subject,
              original: it.original || it.text, ask: it.original ? it.text : null,
              staged: null, accessCode: it.wish?.access_code }} />
          {it.wish && <ResolveBtn wishId={it.wish.id} />}
        </div>
      )}
    </div>
  )
}

// The unified list, purely presentational - data + filter live in the parent so
// the headline, the chips, and the list can never tell three different stories.
function ItemsList({ items, loaded, filter, onDiscuss }) {
  const shown = filter === 'all' ? items : items.filter((i) => i.status === filter)
  const firstDoneIdx = filter === 'all' ? shown.findIndex((i) => i.status === 'responded' || i.status === 'resolved') : -1
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 28px' }}>
      {!loaded && items.length === 0 && <p style={{ color: TEXT_DIM, fontSize: 13 }}>Loading…</p>}
      {loaded && shown.length === 0 && (
        <div style={{ padding: '72px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: SERIF, fontSize: 24, color: TEXT_DARK, margin: 0 }}>
            {filter === 'all' ? 'All quiet.' : 'Nothing here.'}
          </p>
          <p style={{ fontSize: 13, color: TEXT_FAINT, margin: '8px 0 0' }}>
            {filter === 'all' ? 'New requests land here the moment they arrive.' : 'Items move here as their status changes.'}
          </p>
        </div>
      )}
      {shown.map((it, i) => (
        <div key={it.key}>
          {i === firstDoneIdx && firstDoneIdx > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 10px' }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: TEXT_FAINT }}>Done</span>
              <span style={{ flex: 1, height: 1, background: BORDER_LINE }} />
            </div>
          )}
          <SupportItemCard it={it} onDiscuss={onDiscuss} />
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// M20 FRONT DESK (v6) - the live redesign. Outcome columns, big tactile cards,
// human bullet summaries, action options. Reuses all existing wiring below.
// Locked design: corner/missions/support-desk/research/mockups/2026-06-14-support-redesign-v6-inline.html
// ════════════════════════════════════════════════════════════════════════════

const ACCENT_EMERALD_DARK = '#0B7355'

let frontDeskCssInjected = false
function ensureFrontDeskCss() {
  if (frontDeskCssInjected || typeof document === 'undefined') return
  frontDeskCssInjected = true
  const el = document.createElement('style')
  el.textContent = `
    .fd-card { transition: transform .16s ease, box-shadow .16s ease; }
    .fd-card:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(26,26,20,0.05), 0 14px 36px rgba(26,26,20,0.10); }
    .fd-tab { transition: background .14s ease, border-color .14s ease, color .14s ease; }
  `
  document.head.appendChild(el)
}

// Avatar identity tones (kept inside the v6 palette family).
const AV_TONES = [
  { bg: 'rgba(14,143,102,0.14)', fg: '#0E8F66' },
  { bg: 'rgba(124,91,196,0.14)', fg: '#7C5BC4' },
  { bg: 'rgba(14,143,138,0.14)', fg: '#0E8F8A' },
  { bg: 'rgba(177,76,130,0.14)', fg: '#B14C82' },
  { bg: 'rgba(62,109,181,0.14)', fg: '#3E6DB5' },
]
function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function toneOf(name) {
  let h = 0
  for (const c of (name || 'x')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AV_TONES[h % AV_TONES.length]
}

// Round 1: map a wish to one of the three outcomes from its existing status + staged
// state. A real triage 'outcome' field arrives in a later round.
function wishOutcome(w) {
  if (w.status === 'resolved') return 'done'
  if (parseStaged(w.message) || w.status === 'needs_team') return 'needs'
  if (w.status === 'working') return 'got'
  return 'holding'
}

const OUTCOME_PILL = {
  got: { label: 'Working on it', fg: ACCENT_EMERALD, bg: ACCENT_EMERALD_SOFT },
  needs: { label: 'Your decision', fg: ALERT_WARM, bg: ALERT_WARM_SOFT },
  holding: { label: 'Just arrived', fg: HOLD_BLUE, bg: HOLD_BLUE_SOFT },
  held: { label: 'Acknowledged', fg: ACCENT_EMERALD, bg: ACCENT_EMERALD_SOFT },
}

function Avatar({ name }) {
  const t = toneOf(name)
  return (
    <span style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: t.bg, color: t.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: 16 }}>
      {initialsOf(name)}
    </span>
  )
}

function CardHead({ name, account, channel, when }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
      <Avatar name={name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: TEXT_DARK, lineHeight: 1.15 }}>{name}</div>
        <div style={{ fontFamily: BODY, fontSize: 12.5, color: TEXT_DIM, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {account}{channel ? ` · ${channel}` : ''}
        </div>
      </div>
      <span style={{ fontFamily: BODY, fontSize: 11.5, color: TEXT_FAINT, flexShrink: 0, alignSelf: 'flex-start' }}>{when}</span>
    </div>
  )
}

function OutcomePill({ outcome }) {
  const p = OUTCOME_PILL[outcome] || OUTCOME_PILL.holding
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: BODY, fontSize: 11, fontWeight: 600,
      padding: '5px 12px', borderRadius: 999, marginTop: 15, color: p.fg, background: p.bg }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.fg }} />{p.label}
    </span>
  )
}

// A non-staged wish rendered as a v6 front-desk card.
function FrontDeskCard({ w, outcome, onDiscuss }) {
  ensureFrontDeskCss()
  const msgParts = splitOriginal((w.message || '').replace(STAGED_RE, '').trim())
  const { ask } = parseWishSummary(msgParts.summary)
  const overSla = outcome === 'holding' && (Date.now() - new Date(w.created_at).getTime()) > 10 * 60 * 1000
  // Conversation + reply: load this card's full back-and-forth (their messages + every note WE sent)
  // so Patrik can SEE what was said and reply into the same email thread.
  const [convoOpen, setConvoOpen] = useState(false)
  const [updates, setUpdates] = useState(null)
  const [loadingConvo, setLoadingConvo] = useState(false)
  async function toggleConvo() {
    const next = !convoOpen
    setConvoOpen(next)
    if (next && updates === null) {
      setLoadingConvo(true)
      try {
        const r = await fetch(`/api/support/wishes?access_code=${encodeURIComponent(w.access_code)}`)
        const d = await r.json()
        setUpdates(d?.updates || [])
      } catch { setUpdates([]) }
      finally { setLoadingConvo(false) }
    }
  }
  return (
    <div className="fd-card" style={{ background: BG_WHITE, border: `1px solid ${BORDER_LINE}`, borderRadius: 18,
      padding: '20px 20px 16px', boxShadow: '0 1px 2px rgba(26,26,20,0.04), 0 6px 22px rgba(26,26,20,0.05)' }}>
      <CardHead name={w.name || w.email || 'Someone'}
        account={w.source === 'email' ? (w.email || 'email') : 'spoke to us'}
        channel={w.source === 'email' ? 'email' : 'speak-freely'} when={timeAgo(w.created_at)} />
      <OutcomePill outcome={outcome === 'holding' && w.soft_ack_at && !w.latest_response ? 'held' : outcome} />
      <div style={{ marginTop: 14 }}><AskList ask={ask} size={14.5} /></div>
      {w.latest_response && (
        <div style={{ marginTop: 14, padding: '13px 15px', background: ACCENT_EMERALD_SOFT, borderRadius: 13 }}>
          <div style={{ fontFamily: BODY, fontSize: 11, fontWeight: 600, color: ACCENT_EMERALD }}>We replied</div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: TEXT_DIM, lineHeight: 1.55, fontStyle: 'italic' }}>{w.latest_response.body}</p>
        </div>
      )}
      {w.soft_ack_at && !w.latest_response && (
        <div style={{ marginTop: 14, padding: '13px 15px', background: ACCENT_EMERALD_SOFT, borderRadius: 13 }}>
          <div style={{ fontFamily: BODY, fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', color: ACCENT_EMERALD,
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT_EMERALD }} />
            Holding note sent · {timeAgo(w.soft_ack_at)}
          </div>
          <p style={{ margin: '6px 0 0', fontFamily: BODY, fontSize: 12.5, color: TEXT_DIM, lineHeight: 1.5 }}>
            We let them know we have read it and will follow up. The full reply is still owed.
          </p>
        </div>
      )}
      {outcome === 'holding' && !w.soft_ack_at && (
        <div style={{ marginTop: 13, padding: '11px 14px', background: HOLD_BLUE_SOFT, borderRadius: 12,
          fontFamily: BODY, fontSize: 12.5, color: TEXT_DIM, lineHeight: 1.5 }}>
          {overSla ? 'Waiting over 10 minutes. A soft note that we have read it goes out shortly.'
            : 'Just landed. If it is not picked up soon, we let them know we have read it and will follow up.'}
        </div>
      )}
      <OriginalBlock original={msgParts.original} />
      {/* See the whole conversation (what we actually said) + reply into the same email thread. */}
      {convoOpen && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER_LINE}`, paddingTop: 12 }}>
          {loadingConvo && <span style={{ fontFamily: BODY, fontSize: 12, color: TEXT_FAINT }}>Loading conversation…</span>}
          {updates && <ConversationThread updates={updates} wish={w} />}
          {updates && updates.filter((u) => ['client_message', 'soft_ack', 'response'].includes(u.kind)).length === 0 && !loadingConvo && (
            <span style={{ fontFamily: BODY, fontSize: 12, color: TEXT_FAINT }}>Nothing sent to them yet. Write the first reply below.</span>
          )}
          {w.status !== 'resolved' && updates !== null && (
            <ReplyComposer wish={w} onSent={(t) => setUpdates((prev) => [...(prev || []), {
              id: `local-${Date.now()}`, kind: 'response', body: t, author: 'patrik',
              visible_to_client: true, created_at: new Date().toISOString(),
            }])} />
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 15, flexWrap: 'wrap' }}>
        <DiscussBtn onDiscuss={onDiscuss} payload={{ who: w.name || w.email, email: w.email,
          subject: null, original: msgParts.original, ask, staged: null, accessCode: w.access_code }} />
        <button onClick={toggleConvo} className="fd-tab" style={{ fontFamily: BODY, fontSize: 13, fontWeight: 600,
          color: convoOpen ? TEXT_DARK : ACCENT_EMERALD, background: 'transparent',
          border: `1px solid ${convoOpen ? BORDER_LINE : 'rgba(14,143,102,0.35)'}`, borderRadius: 10,
          padding: '7px 14px', cursor: 'pointer' }}>
          {convoOpen ? 'Hide conversation' : 'See conversation & reply'}
        </button>
        <ResolveBtn wishId={w.id} style={{ marginLeft: 'auto' }} />
      </div>
    </div>
  )
}

function OutcomeColumn({ tone, title, sub, count, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 0' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: tone, flexShrink: 0 }} />
        <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: TEXT_DARK }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontFamily: BODY, fontSize: 12, fontWeight: 600, color: TEXT_DIM,
          background: BG_CREAM, borderRadius: 8, padding: '2px 9px' }}>{count}</span>
      </div>
      <div style={{ fontFamily: BODY, fontSize: 11.5, color: TEXT_FAINT, padding: '0 2px', marginTop: -10 }}>{sub}</div>
      {count === 0
        ? <div style={{ fontFamily: BODY, fontSize: 12.5, color: TEXT_FAINT, padding: '22px 4px', textAlign: 'center',
            border: `1px dashed ${BORDER_LINE}`, borderRadius: 14 }}>Nothing here right now.</div>
        : children}
    </div>
  )
}

function tabStyle(active) {
  return { fontFamily: BODY, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
    color: active ? TEXT_DARK : TEXT_FAINT, background: active ? BG_WHITE : 'transparent',
    border: `1px solid ${active ? BORDER_LINE : 'transparent'}`, borderRadius: 10, padding: '8px 14px' }
}

// ── Full dashboard ───────────────────────────────────────────────────────────
export { useSupportData, buildItems }

export default function SupportDashboard({ isDesktop = true, onClose, worldId, onDiscuss }) {
  const [view, setView] = useState('desk') // desk | inbox | chat
  const { wishes } = useSupportData(worldId)
  const loaded = wishes !== null

  // Cleared cards (dismissed test cards / filtered spam) never show on the board.
  const visible = (wishes || []).filter((w) => w.status !== 'dismissed' && w.status !== 'spam')
  const open = visible.filter((w) => w.status !== 'resolved')
  const got = open.filter((w) => wishOutcome(w) === 'got')
  const needs = open.filter((w) => wishOutcome(w) === 'needs')
  const holding = open.filter((w) => wishOutcome(w) === 'holding')
  const resolved = visible.filter((w) => w.status === 'resolved')

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const handledToday = resolved.filter((w) => w.updated_at && new Date(w.updated_at) >= startOfDay).length

  const renderWish = (w) => {
    const staged = parseStaged(w.message)
    if (staged && w.status !== 'resolved') return <PressSendCard key={w.id} w={w} staged={staged} onDiscuss={onDiscuss} />
    return <FrontDeskCard key={w.id} w={w} outcome={wishOutcome(w)} onDiscuss={onDiscuss} />
  }

  const gridCols = isDesktop ? 'repeat(3, 1fr)' : '1fr'

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 26px 14px', flexShrink: 0, gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span style={{ width: 34, height: 34, borderRadius: 11, background: ACCENT_EMERALD, color: BG_WHITE,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: 18 }}>S</span>
        <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 24, margin: 0, color: TEXT_DARK, letterSpacing: '-0.01em' }}>Front desk</h1>
        <span style={{ fontFamily: BODY, fontSize: 12, color: TEXT_FAINT, paddingTop: 5 }}>Support · today</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="fd-tab" onClick={() => setView('desk')} style={tabStyle(view === 'desk')}>Front desk</button>
        <button className="fd-tab" onClick={() => setView('inbox')} style={tabStyle(view === 'inbox')}>Inbox</button>
        <button className="fd-tab" onClick={() => setView('chat')} style={tabStyle(view === 'chat')}>Chat</button>
        <button onClick={onClose} style={{ ...ghostBtn, borderRadius: 10, fontSize: 13, padding: '8px 14px' }} aria-label="Close support">Close</button>
      </div>
    </div>
  )

  const briefing = (
    <div style={{ fontFamily: SERIF, fontSize: isDesktop ? 20 : 16.5, fontWeight: 500, color: TEXT_DARK,
      padding: '0 26px 18px', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
      {!loaded ? 'Reading the desk…' : (
        <>
          Today, <b style={{ color: ACCENT_EMERALD_DARK, fontWeight: 600 }}>{handledToday} {handledToday === 1 ? 'request was' : 'requests were'} handled for you</b>.{' '}
          {needs.length > 0
            ? <span style={{ color: ALERT_WARM }}>{needs.length} {needs.length === 1 ? 'is' : 'are'} waiting on your call</span>
            : <span style={{ color: TEXT_FAINT }}>Nothing is waiting on you</span>}
          {holding.length > 0
            ? <span style={{ color: TEXT_FAINT }}>, and {holding.length} just arrived.</span>
            : <span style={{ color: TEXT_FAINT }}>.</span>}
        </>
      )}
    </div>
  )

  const desk = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 26px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 16, alignItems: 'start' }}>
        <OutcomeColumn tone={ACCENT_EMERALD} title="We've got this" sub="handled on its own, nothing needed from you" count={got.length}>
          {got.map(renderWish)}
        </OutcomeColumn>
        <OutcomeColumn tone={ALERT_WARM} title="Needs you" sub="your call, a reply is ready" count={needs.length}>
          {needs.map(renderWish)}
        </OutcomeColumn>
        <OutcomeColumn tone={HOLD_BLUE} title="Holding" sub="no one left waiting" count={holding.length}>
          {holding.map(renderWish)}
        </OutcomeColumn>
      </div>
      {resolved.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div style={{ fontFamily: BODY, fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
            color: TEXT_FAINT, margin: '0 0 12px' }}>Recently handled</div>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 16, alignItems: 'start', opacity: 0.7 }}>
            {resolved.slice(0, 9).map((w) => <FrontDeskCard key={w.id} w={w} outcome="got" onDiscuss={onDiscuss} />)}
          </div>
        </div>
      )}
      <div style={{ marginTop: 28, padding: '15px 20px', background: BG_WHITE, border: `1px solid ${BORDER_LINE}`,
        borderRadius: 14, fontFamily: BODY, fontSize: 13.5, color: TEXT_DIM, lineHeight: 1.5 }}>
        Cold outreach and newsletters are filtered out before they reach the desk. Only real client requests show up here.
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG_CREAM, fontFamily: BODY }}>
      {header}
      {view === 'desk' ? (<>{briefing}{desk}</>)
        : view === 'inbox' ? (
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}><InboxPanel worldId={worldId} /></div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}><SupportInbox isDesktop={isDesktop} /></div>
        )}
    </div>
  )
}

function TabBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: BODY,
      padding: '8px 4px', marginRight: 20, color: active ? TEXT_DARK : TEXT_FAINT, fontSize: 15,
      fontWeight: active ? 700 : 500, borderBottom: `2px solid ${active ? ACCENT_EMERALD : 'transparent'}` }}>{label}</button>
  )
}

const ghostBtn = {
  background: 'transparent', color: TEXT_DIM, border: `1px solid ${BORDER_LINE}`, borderRadius: 3,
  fontFamily: BODY, fontSize: 12, padding: '6px 12px', cursor: 'pointer',
}