import React, { useEffect, useMemo, useState } from 'react'

// Space-company funding rounds tracker, sourced from Blacknight Space Labs.
// Data is refreshed daily by /api/blacknight/refresh (Vercel Cron) and served
// by /api/blacknight/posts. Page is fully public — no auth, no gate.

const V4 = {
  bg: '#0C0C0C',
  card: '#151515',
  cardHover: '#1B1B1B',
  accent: '#E85D26',
  textPrimary: '#F0ECE6',
  textSecondary: '#8A847C',
  textTertiary: '#5C5650',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',
  syne: "'Syne', sans-serif",
  space: "'Space Grotesk', sans-serif",
}

function formatAmount(usd, display) {
  if (display) return display
 if (typeof usd !== 'number' || !Number.isFinite(usd)) return '·'
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(usd % 1e9 === 0 ? 0 : 1)}B`
  if (usd >= 1e6) return `$${Math.round(usd / 1e6)}M`
  if (usd >= 1e3) return `$${Math.round(usd / 1e3)}K`
  return `$${usd}`
}

function formatDate(iso) {
 if (!iso) return '·'
  const d = new Date(iso)
 if (Number.isNaN(d.getTime())) return '·'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatRelative(iso) {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'never'
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

const STAGE_BADGE = {
  Seed:        { bg: 'rgba(168,133,96,0.12)',  fg: '#D4B896' },
  'Series A':  { bg: 'rgba(34,197,94,0.10)',   fg: '#86EFAC' },
  'Series B':  { bg: 'rgba(59,130,246,0.10)',  fg: '#93C5FD' },
  'Series C':  { bg: 'rgba(168,85,247,0.10)',  fg: '#D8B4FE' },
  'Series D':  { bg: 'rgba(236,72,153,0.10)',  fg: '#F9A8D4' },
  'Series E':  { bg: 'rgba(232,93,38,0.12)',   fg: '#F0A882' },
}
function stageBadge(stage) {
  if (!stage) return { bg: 'rgba(138,132,124,0.10)', fg: V4.textSecondary }
  return STAGE_BADGE[stage] || { bg: 'rgba(138,132,124,0.10)', fg: V4.textSecondary }
}

const MOBILE_BREAKPOINT = 760

export default function Blacknight() {
  const [rounds, setRounds] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('amount_usd')
  const [sortDir, setSortDir] = useState('desc')
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch('/api/blacknight/posts')
        if (!r.ok) throw new Error(`API ${r.status}`)
        const j = await r.json()
        if (cancelled) return
        setRounds(Array.isArray(j.rounds) ? j.rounds : [])
        setLastUpdated(j.last_updated || null)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let list = [...rounds]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.company || '').toLowerCase().includes(q) ||
        (r.sector || '').toLowerCase().includes(q) ||
        (r.lead_investor || '').toLowerCase().includes(q) ||
        (r.round_stage || '').toLowerCase().includes(q) ||
        (r.other_investors || []).some(inv => (inv || '').toLowerCase().includes(q))
      )
    }
    list.sort((a, b) => {
      let va, vb
      if (sortCol === 'amount_usd') { va = a.amount_usd ?? -1; vb = b.amount_usd ?? -1 }
      else if (sortCol === 'announced_date') { va = a.announced_date || ''; vb = b.announced_date || '' }
      else if (sortCol === 'company') { va = (a.company || '').toLowerCase(); vb = (b.company || '').toLowerCase() }
      else if (sortCol === 'round_stage') { va = (a.round_stage || '').toLowerCase(); vb = (b.round_stage || '').toLowerCase() }
      else { va = a[sortCol]; vb = b[sortCol] }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [rounds, search, sortCol, sortDir])

  const totalRaised = useMemo(
    () => filtered.reduce((sum, r) => sum + (typeof r.amount_usd === 'number' ? r.amount_usd : 0), 0),
    [filtered],
  )

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'company' || col === 'round_stage' ? 'asc' : 'desc')
    }
  }
  const arrow = (col) => sortCol !== col ? '' : (sortDir === 'asc' ? ' ↑' : ' ↓')

  const thStyle = {
    padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.15em', color: V4.textSecondary,
    borderBottom: `1px solid ${V4.border}`, cursor: 'pointer', fontFamily: V4.space,
    userSelect: 'none', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ minHeight: '100vh', background: V4.bg, color: V4.textPrimary, fontFamily: V4.space }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${V4.border}`, padding: isMobile ? '28px 16px 20px' : '40px 24px 28px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: V4.syne, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
            margin: 0, letterSpacing: '-0.02em',
          }}>
            Space funding tracker
          </h1>
          <span style={{ color: V4.accent, fontSize: 14, fontWeight: 600, letterSpacing: '0.05em' }}>
            2026 YTD
          </span>
        </div>
        <p style={{ color: V4.textSecondary, fontSize: 14, lineHeight: 1.6, maxWidth: 720, marginTop: 14 }}>
 All publicly announced space-industry funding rounds since January 1, 2026, aggregated from{'·'}
          <a href="https://payloadspace.com" target="_blank" rel="noreferrer"
             style={{ color: V4.textPrimary, textDecoration: 'underline', textDecorationColor: V4.border }}>Payload</a>
          {', '}
          <a href="https://spacenews.com" target="_blank" rel="noreferrer"
             style={{ color: V4.textPrimary, textDecoration: 'underline', textDecorationColor: V4.border }}>SpaceNews</a>
          {', '}
          <a href="https://techcrunch.com/tag/space/" target="_blank" rel="noreferrer"
             style={{ color: V4.textPrimary, textDecoration: 'underline', textDecorationColor: V4.border }}>TechCrunch</a>
          {', '}
          <a href="https://www.linkedin.com/company/blacknightspacelabs/posts/?feedView=all"
             target="_blank" rel="noreferrer"
             style={{ color: V4.textPrimary, textDecoration: 'underline', textDecorationColor: V4.border }}>
            Blacknight Space Labs
          </a>
          {', and more. Each row links directly to the source announcement. Refreshed daily.'}
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
          <Stat label="Rounds tracked" value={filtered.length.toString()} />
          <Stat label="Total raised (visible)" value={formatAmount(totalRaised)} />
          <Stat label="Last updated" value={formatRelative(lastUpdated)} />
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: isMobile ? '16px 16px 8px' : '20px 24px 12px', maxWidth: 1400, margin: '0 auto' }}>
        <input
          type="text"
          placeholder="Search company, sector, investor, round..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 480, background: V4.card, border: `1px solid ${V4.border}`,
            borderRadius: 10, padding: '10px 14px', color: V4.textPrimary, fontSize: 14,
            fontFamily: V4.space, outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ padding: isMobile ? '0 16px 48px' : '0 24px 60px', maxWidth: 1400, margin: '0 auto' }}>
        {error && (
          <div style={{ padding: 16, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 10, color: '#FCA5A5', marginBottom: 16 }}>
            Couldn't load rounds: {error}
          </div>
        )}
        {isMobile ? (
          <MobileList
            loading={loading}
            rounds={rounds}
            filtered={filtered}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
          />
        ) : (
        <div style={{ overflowX: 'auto', borderRadius: 14, border: `1px solid ${V4.border}`, background: V4.card }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: V4.bg }}>
                <th onClick={() => handleSort('company')} style={{ ...thStyle, minWidth: 180 }}>Company{arrow('company')}</th>
                <th onClick={() => handleSort('amount_usd')} style={{ ...thStyle, width: 130, textAlign: 'right' }}>Amount{arrow('amount_usd')}</th>
                <th onClick={() => handleSort('round_stage')} style={{ ...thStyle, width: 150 }}>Round{arrow('round_stage')}</th>
                <th style={{ ...thStyle, minWidth: 220, cursor: 'default' }}>Sector</th>
                <th style={{ ...thStyle, minWidth: 200, cursor: 'default' }}>Investors</th>
                <th onClick={() => handleSort('announced_date')} style={{ ...thStyle, width: 120 }}>Announced{arrow('announced_date')}</th>
                <th style={{ ...thStyle, width: 80, cursor: 'default', textAlign: 'center' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: V4.textSecondary }}>Loading rounds…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: V4.textSecondary }}>
                  {rounds.length === 0 ? 'No rounds yet. Waiting for first refresh.' : 'No rounds match your search.'}
                </td></tr>
              )}
              {!loading && filtered.map((r, i) => {
                const badge = stageBadge(r.round_stage)
                const investors = [
                  ...(r.lead_investor ? [r.lead_investor] : []),
                  ...((r.other_investors || []).filter(inv => inv && inv !== r.lead_investor)),
                ]
                const rowBg = i % 2 === 0 ? V4.card : V4.bg
                return (
                  <tr key={r.id || `${r.company}-${r.round_stage}-${i}`}
                    style={{ background: rowBg, borderBottom: `1px solid ${V4.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = V4.cardHover}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: V4.textPrimary }}>
                      {r.company}
                      {r.summary && <div style={{ color: V4.textTertiary, fontSize: 11, fontWeight: 400, marginTop: 3, lineHeight: 1.4 }}>{r.summary}</div>}
                    </td>
                    <td style={{
                      padding: '12px 14px', textAlign: 'right', fontWeight: 700, fontSize: 14,
                      fontFamily: V4.syne, color: V4.accent, whiteSpace: 'nowrap',
                    }}>
                      {formatAmount(r.amount_usd, r.amount_display)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.round_stage && (
                        <span style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                          background: badge.bg, color: badge.fg, fontSize: 11, fontWeight: 600,
                          letterSpacing: '0.05em', whiteSpace: 'nowrap',
                        }}>
                          {r.round_stage}
                        </span>
                      )}
                    </td>
 <td style={{ padding: '12px 14px', color: V4.textSecondary, fontSize: 12 }}>{r.sector || ', '}</td>
                    <td style={{ padding: '12px 14px', color: V4.textSecondary, fontSize: 12 }}>
 {investors.length === 0 ? '·' : investors.join('·')}
                    </td>
                    <td style={{ padding: '12px 14px', color: V4.textSecondary, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(r.announced_date)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {(r.post_url || r.source_url) ? (
                        <a href={r.post_url || r.source_url} target="_blank" rel="noreferrer"
                          style={{ color: V4.accent, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                        >open ↗</a>
 ) : '·'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        <p style={{ color: V4.textTertiary, fontSize: 11, marginTop: 16, fontFamily: V4.space }}>
          Data aggregated by Claude from public sources (Payload, SpaceNews, TechCrunch, Crunchbase, Blacknight Space Labs, and others). Not investment advice.
        </p>
      </div>
    </div>
  )
}

function MobileList({ loading, rounds, filtered, sortCol, sortDir, onSort }) {
  const sortOptions = [
    { key: 'amount_usd', label: 'Amount' },
    { key: 'announced_date', label: 'Date' },
    { key: 'company', label: 'Company' },
    { key: 'round_stage', label: 'Round' },
  ]
  return (
    <div>
 {/* Sort chips, replaces clickable th's on mobile */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 4 }}>
        {sortOptions.map(opt => {
          const active = sortCol === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => onSort(opt.key)}
              style={{
                flexShrink: 0,
                padding: '6px 12px', borderRadius: 999,
                background: active ? 'rgba(232,93,38,0.12)' : V4.card,
                border: `1px solid ${active ? 'rgba(232,93,38,0.40)' : V4.border}`,
                color: active ? V4.accent : V4.textSecondary,
                fontFamily: V4.space, fontSize: 12, fontWeight: 600,
                letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {opt.label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
          )
        })}
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: V4.textSecondary, background: V4.card, border: `1px solid ${V4.border}`, borderRadius: 14 }}>
          Loading rounds…
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: V4.textSecondary, background: V4.card, border: `1px solid ${V4.border}`, borderRadius: 14 }}>
          {rounds.length === 0 ? 'No rounds yet. Waiting for first refresh.' : 'No rounds match your search.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!loading && filtered.map((r, i) => {
          const badge = stageBadge(r.round_stage)
          const investors = [
            ...(r.lead_investor ? [r.lead_investor] : []),
            ...((r.other_investors || []).filter(inv => inv && inv !== r.lead_investor)),
          ]
          return (
            <div key={r.id || `${r.company}-${r.round_stage}-${i}`}
              style={{
                background: V4.card, border: `1px solid ${V4.border}`,
                borderRadius: 12, padding: '14px 14px 12px',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: V4.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.company}
                  </div>
                  {r.round_stage && (
                    <span style={{
                      display: 'inline-block', marginTop: 6, padding: '3px 9px', borderRadius: 6,
                      background: badge.bg, color: badge.fg, fontSize: 10, fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}>
                      {r.round_stage}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: V4.syne, fontWeight: 700, fontSize: 18, color: V4.accent,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {formatAmount(r.amount_usd, r.amount_display)}
                </div>
              </div>

              {r.summary && (
                <div style={{ color: V4.textTertiary, fontSize: 12, lineHeight: 1.45, marginTop: 8 }}>
                  {r.summary}
                </div>
              )}

              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
                marginTop: 10, paddingTop: 10, borderTop: `1px solid ${V4.border}`,
                color: V4.textSecondary, fontSize: 11,
              }}>
                {r.sector && <MetaPill label="Sector" value={r.sector} />}
                {investors.length > 0 && <MetaPill label="Investors" value={investors.join(', ')} />}
                <MetaPill label="Announced" value={formatDate(r.announced_date)} />
              </div>

              {(r.post_url || r.source_url) && (
                <a href={r.post_url || r.source_url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'inline-block', marginTop: 10, color: V4.accent,
                    fontSize: 12, textDecoration: 'none', fontWeight: 600,
                  }}>
                  open source ↗
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MetaPill({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <span style={{ color: V4.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 6, fontSize: 10 }}>
        {label}
      </span>
      <span style={{ color: V4.textSecondary }}>{value}</span>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ color: V4.textTertiary, fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: V4.textPrimary, fontFamily: V4.syne, fontSize: 22, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  )
}