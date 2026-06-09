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
          <span style={{ fontFamily: MONO, fontSize: 10, color: loud ? AMBER : BONE_FAINT, textTransform: 'uppercase' }}>
            {STATUS_LABEL[w.status] || w.status}
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: BONE_DIM, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{w.message}</p>
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

// ── Full dashboard ───────────────────────────────────────────────────────────
export default function SupportDashboard({ isDesktop = true, onClose }) {
  const [tab, setTab] = useState('requests') // mobile single-pane

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
        <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0' }}>
          <TabBtn active={tab === 'requests'} onClick={() => setTab('requests')} label="Requests" />
          <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')} label="Chat support" />
        </div>
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {tab === 'requests' ? <RequestsStream /> : <SupportInbox isDesktop={false} />}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: INK }}>
      {header}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: '1 1 50%', minWidth: 0, borderRight: `1px solid ${LINE}`, overflow: 'hidden' }}>
          <RequestsStream />
        </div>
        <div style={{ flex: '1 1 50%', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <SupportInbox isDesktop />
        </div>
      </div>
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
