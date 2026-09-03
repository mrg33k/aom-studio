import React, { useState, useEffect } from 'react'
import { getSession } from '../dashboard/lib/auth.js'

// Corner accounts that get in with their own login (no admin key needed).
const DEAL_BANK_ALLOWLIST = ['ben@arsenalgpa.com', 'patrikmatheson@gmail.com']
function isAllowedCornerEmail(email) {
  if (!email) return false
  const n = String(email).trim().toLowerCase()
  return n.endsWith('@aom-inhouse.com') || DEAL_BANK_ALLOWLIST.includes(n)
}

// Space Rising — Deal Bank Admin Tool
// Route: /space-rising/deal-bank/admin
// For the AOM / Space Rising team to log new closed space deals.
// Not linked from any public page. Bookmark it.

const ACCENT = '#E5451F'
const ACCENT_DIM = 'rgba(229,69,31,0.15)'
const ACCENT_BRD = 'rgba(229,69,31,0.45)'
const BG = '#07090C'
const SURFACE = '#0F1216'
const SURFACE2 = '#161A1F'
const BORDER = 'rgba(255,255,255,0.07)'
const BORDER_STRONG = 'rgba(255,255,255,0.13)'
const TEXT = '#E8ECF0'
const MUTED = '#7A838C'
const SUCCESS = '#2F9E5A'
const SUCCESS_BG = 'rgba(47,158,90,0.12)'
const ERROR_BG = 'rgba(229,69,31,0.12)'
const MONO = "'JetBrains Mono', 'Fira Code', monospace"
const HEADING = "'Oswald', 'Impact', sans-serif"
const BODY = "'Inter', system-ui, sans-serif"

const EMPTY_FORM = {
  company: '',
  round: '',
  amount_raised: '',
  amount_usd_m: '',
  date: '',
  segment: '',
  short_description: '',
  investors: '',
  region: '',
  source: '',
  source_url: '',
  notes: '',
}

const SEGMENTS = [
  '', 'Launch', 'Satellites', 'Space Applications', 'In-Space Servicing',
  'Ground Segment', 'Propulsion', 'Space Stations', 'Lunar', 'Deep Space',
  'Defense', 'Space Tourism', 'Other',
]

const ROUND_EXAMPLES = [
  'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D',
  'Growth', 'Refinancing', 'SPAC', 'IPO', 'Debt',
]

export default function SpaceRisingDealBankAdmin() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('sr-deal-bank-admin-key') || '')
  const [keyInput, setKeyInput] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [sessionToken, setSessionToken] = useState('')   // Corner login token (same login Ben already uses)
  const [cornerEmail, setCornerEmail] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { ok, message, row }
  const [recentDeals, setRecentDeals] = useState([])
  const [loadingRecent, setLoadingRecent] = useState(false)

  // Auto-authenticate if key is in localStorage
  useEffect(() => {
    if (adminKey) setAuthenticated(true)
  }, [adminKey])

  // Auto-authenticate via the user's existing Corner login (no separate key).
  // If Ben (or Patrik / AOM team) is already signed into the dashboard, they're in.
  useEffect(() => {
    let active = true
    // Convex Auth session (corner:retire-supabase R3): { user, access_token } or null.
    getSession().then((sess) => {
      const email = sess && sess.user && sess.user.email
      if (active && sess && isAllowedCornerEmail(email)) {
        setSessionToken(sess.access_token || '')
        setCornerEmail(email)
        setAuthenticated(true)
      }
    }).catch(() => {})
    return () => { active = false }
  }, [])

  // Load recent deals when authenticated
  useEffect(() => {
    if (!authenticated) return
    setLoadingRecent(true)
    fetch('https://www.aheadofmarket.com/api/deal-bank/completed')
      .then(r => r.json())
      .then(j => {
        if (Array.isArray(j.rounds)) {
          setRecentDeals(j.rounds.slice(0, 20))
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRecent(false))
  }, [authenticated, result])

  function handleKeySubmit(e) {
    e.preventDefault()
    if (!keyInput.trim()) return
    localStorage.setItem('sr-deal-bank-admin-key', keyInput.trim())
    setAdminKey(keyInput.trim())
    setAuthenticated(true)
  }

  function handleLogOut() {
    localStorage.removeItem('sr-deal-bank-admin-key')
    setAdminKey('')
    setAuthenticated(false)
    setKeyInput('')
  }

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.company.trim() || !form.round.trim()) return
    setSubmitting(true)
    setResult(null)
    try {
      const payload = {
        company: form.company.trim(),
        round: form.round.trim(),
        amount_raised: form.amount_raised.trim() || undefined,
        amount_usd_m: form.amount_usd_m ? parseFloat(form.amount_usd_m) : undefined,
        date: form.date || undefined,
        segment: form.segment || undefined,
        short_description: form.short_description.trim() || undefined,
        investors: form.investors.trim() || undefined,
        region: form.region.trim() || undefined,
        source: form.source.trim() || undefined,
        source_url: form.source_url.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      const res = await fetch('/api/deal-bank/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { 'x-admin-key': adminKey } : {}),
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
 setResult({ ok: true, message: `Added: ${form.company}, ${form.round}`, row: json.row })
        setForm(EMPTY_FORM)
      } else {
        // If unauthorized, clear the key
        if (res.status === 401) {
          handleLogOut()
          setResult({ ok: false, message: 'Invalid admin key. Try again.' })
        } else {
          setResult({ ok: false, message: json.error || `Server error ${res.status}` })
        }
      }
    } catch (err) {
      setResult({ ok: false, message: `Network error: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%',
    background: SURFACE,
    border: `1px solid ${BORDER_STRONG}`,
    color: TEXT,
    borderRadius: 6,
    padding: '9px 12px',
    fontSize: 13,
    fontFamily: BODY,
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: MONO,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 5,
  }
  const fieldWrap = { marginBottom: 14 }

  // ── Key Gate ────────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100dvh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>
        <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: HEADING, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Deal Bank <span style={{ color: ACCENT }}>Admin</span>
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 28 }}>Space Rising team only. Enter your admin key.</div>
          <form onSubmit={handleKeySubmit}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Admin Key</label>
              <input
                type="password"
                autoFocus
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="Paste your admin key..."
                style={{ ...inputStyle }}
              />
            </div>
            <button
              type="submit"
              disabled={!keyInput.trim()}
              style={{
                width: '100%',
                background: keyInput.trim() ? ACCENT : SURFACE2,
                color: keyInput.trim() ? '#fff' : MUTED,
                border: 'none',
                borderRadius: 6,
                padding: '11px 0',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: BODY,
                cursor: keyInput.trim() ? 'pointer' : 'not-allowed',
                letterSpacing: '0.04em',
                transition: 'background .15s',
              }}
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Admin UI ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: BG, color: TEXT, fontFamily: BODY }}>
      {/* Top bar */}
      <div style={{
        background: SURFACE, borderBottom: `1px solid ${BORDER}`,
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: HEADING, textTransform: 'uppercase', letterSpacing: '0.05em', color: TEXT }}>
            Deal Bank <span style={{ color: ACCENT }}>Admin</span>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, fontFamily: MONO, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: MUTED,
            background: SURFACE2, border: `1px solid ${BORDER}`,
            padding: '2px 7px', borderRadius: 3,
          }}>Space Rising</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="https://spacerising.org/space-rising/deal-bank"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 11, color: MUTED, textDecoration: 'none', fontFamily: MONO }}
          >
            View live ↗
          </a>
          <button
            onClick={handleLogOut}
            style={{ fontSize: 11, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, padding: 0 }}
          >
            Log out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 80px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
        {/* ── Form ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: 18 }}>
            Log a new closed round
          </div>

          {result && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 7,
              marginBottom: 18,
              background: result.ok ? SUCCESS_BG : ERROR_BG,
              border: `1px solid ${result.ok ? 'rgba(47,158,90,0.3)' : ACCENT_BRD}`,
              color: result.ok ? '#6EE090' : '#F09070',
              fontSize: 13, fontFamily: MONO,
            }}>
              {result.ok ? '✓ ' : '✗ '}{result.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Company <span style={{ color: ACCENT }}>*</span></label>
                <input
                  required
                  value={form.company}
                  onChange={e => set('company', e.target.value)}
                  placeholder="e.g. Apex Space Technologies"
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Round <span style={{ color: ACCENT }}>*</span></label>
                <input
                  required
                  list="round-options"
                  value={form.round}
                  onChange={e => set('round', e.target.value)}
                  placeholder="e.g. Series A"
                  style={inputStyle}
                />
                <datalist id="round-options">
                  {ROUND_EXAMPLES.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Amount Raised (display string)</label>
                <input
                  value={form.amount_raised}
                  onChange={e => set('amount_raised', e.target.value)}
                  placeholder="e.g. $50M"
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Amount USD ($M, numeric)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount_usd_m}
                  onChange={e => set('amount_usd_m', e.target.value)}
                  placeholder="e.g. 50"
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Segment</label>
                <select value={form.segment} onChange={e => set('segment', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
 {SEGMENTS.map(s => <option key={s} value={s}>{s || ', select , '}</option>)}
                </select>
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Region</label>
                <input
                  value={form.region}
                  onChange={e => set('region', e.target.value)}
                  placeholder="e.g. USA, Europe"
                  style={inputStyle}
                />
              </div>

              <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Short Description</label>
                <textarea
                  rows={2}
                  value={form.short_description}
                  onChange={e => set('short_description', e.target.value)}
                  placeholder="One-line summary of what the company does..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 52, lineHeight: 1.5 }}
                />
              </div>

              <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Main Investors</label>
                <textarea
                  rows={2}
                  value={form.investors}
                  onChange={e => set('investors', e.target.value)}
                  placeholder="e.g. a16z, Sequoia, Lockheed Martin Ventures..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 52, lineHeight: 1.5 }}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Source Name</label>
                <input
                  value={form.source}
                  onChange={e => set('source', e.target.value)}
                  placeholder="e.g. SpaceNews"
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Source URL</label>
                <input
                  type="url"
                  value={form.source_url}
                  onChange={e => set('source_url', e.target.value)}
                  placeholder="https://spacenews.com/..."
                  style={inputStyle}
                />
              </div>

              <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Any extra context..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 52, lineHeight: 1.5 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !form.company.trim() || !form.round.trim()}
              style={{
                background: (submitting || !form.company.trim() || !form.round.trim()) ? SURFACE2 : ACCENT,
                color: (submitting || !form.company.trim() || !form.round.trim()) ? MUTED : '#fff',
                border: 'none',
                borderRadius: 7,
                padding: '12px 28px',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: BODY,
                cursor: (submitting || !form.company.trim() || !form.round.trim()) ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                transition: 'background .15s',
              }}
            >
              {submitting ? 'Adding…' : 'Add Round'}
            </button>
          </form>
        </div>

        {/* ── Recent Rounds ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: 14 }}>
            Recent rounds ({recentDeals.length} shown)
          </div>
          {loadingRecent ? (
            <div style={{ fontSize: 12, color: MUTED, fontFamily: MONO }}>Loading…</div>
          ) : recentDeals.length === 0 ? (
            <div style={{ fontSize: 12, color: MUTED, fontFamily: MONO }}>No rounds yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentDeals.map((d, i) => (
                <div key={d.id || i} style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 7,
                  padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: HEADING, textTransform: 'uppercase', letterSpacing: '0.02em', color: TEXT, marginBottom: 3 }}>
                    {d.company}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, fontFamily: MONO, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
 <span style={{ color: ACCENT }}>{d.amount_usd_m ? `$${d.amount_usd_m}M` : d.amount_raised || ', '}</span>
                    <span>{d.round}</span>
                    {d.date && <span>{d.date.slice(0, 7)}</span>}
                    {d.segment && <span style={{ opacity: 0.6 }}>{d.segment}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Inter:wght@400;600;700&display=swap');
        input::placeholder, textarea::placeholder { color: ${MUTED}; opacity: 0.7; }
        input:focus, textarea:focus, select:focus { border-color: ${ACCENT_BRD} !important; outline: none; }
        select option { background: ${SURFACE}; color: ${TEXT}; }
      `}</style>
    </div>
  )
}