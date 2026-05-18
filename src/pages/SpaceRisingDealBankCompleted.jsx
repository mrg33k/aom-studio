import React, { useState, useEffect, useMemo } from 'react'

// Space Rising — Deal Bank — Completed Rounds
// Public grid of closed space-industry funding rounds.
// System-managed: no user-add flow. Seeded from blacknight research.
// Route: /space-rising/deal-bank/completed

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

  .db-page { box-sizing: border-box; }
  .db-page *, .db-page *::before, .db-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .db-root {
    --black: #080808;
    --surface: #121212;
    --surface2: #1A1A1A;
    --surface3: #2A2A2A;
    --orange: #E5451F;
    --orange-dim: rgba(229,69,31,0.15);
    --orange-border: rgba(229,69,31,0.3);
    --white: #FFFFFF;
    --gray: #999;
    --gray-l: #CCCCCC;
    --border: #1E1E1E;
    --border-light: rgba(255,255,255,0.08);
    background: var(--black);
    color: var(--white);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    min-height: 100vh;
  }

  /* ── NAV ─────────────────────────────────────────────────────────────── */
  .db-nav {
    border-bottom: 1px solid var(--border);
    padding: 0 32px;
    display: flex; align-items: center; justify-content: space-between;
    height: 60px;
  }
  .db-nav-logo { display: flex; align-items: center; gap: 14px; text-decoration: none; }
  .db-nav-logo img { height: 30px; width: auto; }
  .db-nav-logo-text {
    font-family: 'Oswald', sans-serif; font-size: 15px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .08em; color: var(--white);
  }
  .db-nav-links { display: flex; gap: 24px; align-items: center; }
  .db-nav-link {
    font-size: 12px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase;
    color: var(--gray); text-decoration: none; transition: color .15s;
  }
  .db-nav-link:hover { color: var(--white); }
  .db-nav-link.active { color: var(--orange); }

  /* ── HERO ────────────────────────────────────────────────────────────── */
  .db-hero {
    border-bottom: 1px solid var(--border);
    padding: 64px 32px 48px;
    max-width: 1100px; margin: 0 auto;
  }
  .db-hero-eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: .22em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 14px;
  }
  .db-hero-title {
    font-family: 'Oswald', sans-serif; font-size: clamp(36px, 5vw, 60px);
    font-weight: 700; text-transform: uppercase; line-height: .95;
    letter-spacing: .02em; margin-bottom: 20px;
  }
  .db-hero-title span { color: var(--orange); }
  .db-hero-sub { font-size: 16px; color: var(--gray-l); max-width: 600px; line-height: 1.6; }
  .db-hero-stats {
    display: flex; gap: 32px; margin-top: 32px; flex-wrap: wrap;
  }
  .db-stat { display: flex; flex-direction: column; gap: 4px; }
  .db-stat-val {
    font-family: 'Oswald', sans-serif; font-size: 28px; font-weight: 700;
    color: var(--white); letter-spacing: .02em;
  }
  .db-stat-label { font-size: 11px; color: var(--gray); letter-spacing: .1em; text-transform: uppercase; }

  /* ── SEARCH BAR ──────────────────────────────────────────────────────── */
  .db-search-bar {
    padding: 20px 32px;
    max-width: 1100px; margin: 0 auto;
    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  }
  .db-search {
    flex: 1; min-width: 240px; max-width: 420px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 10px 14px; color: var(--white); font-size: 14px;
    font-family: 'Inter', sans-serif; outline: none; transition: border-color .15s;
  }
  .db-search::placeholder { color: var(--gray); }
  .db-search:focus { border-color: rgba(229,69,31,.4); }
  .db-result-count { font-size: 12px; color: var(--gray); }

  /* ── ROUND BADGE ─────────────────────────────────────────────────────── */
  .db-badge {
    display: inline-flex; align-items: center;
    font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    border-radius: 3px; padding: 3px 8px;
  }

  /* ── GRID ────────────────────────────────────────────────────────────── */
  .db-grid {
    padding: 8px 32px 60px;
    max-width: 1100px; margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  /* ── CARD ────────────────────────────────────────────────────────────── */
  .db-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px; padding: 22px;
    cursor: pointer; transition: border-color .18s, background .18s, transform .15s;
    position: relative; overflow: hidden;
  }
  .db-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--orange); opacity: 0; transition: opacity .18s;
  }
  .db-card:hover { border-color: var(--orange-border); background: var(--surface2); transform: translateY(-2px); }
  .db-card:hover::before { opacity: 1; }
  .db-card.expanded { border-color: var(--orange-border); background: var(--surface2); }
  .db-card.expanded::before { opacity: 1; }

  .db-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
  .db-card-company {
    font-family: 'Oswald', sans-serif; font-size: 20px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .02em; line-height: 1.1;
    flex: 1;
  }
  .db-card-amount {
    font-family: 'Oswald', sans-serif; font-size: 24px; font-weight: 700;
    color: var(--orange); letter-spacing: .01em; white-space: nowrap;
    line-height: 1.1;
  }
  .db-card-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .db-card-date { font-size: 12px; color: var(--gray); }

  /* ── EXPANDED PANEL ──────────────────────────────────────────────────── */
  .db-card-expanded {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-light);
  }
  .db-card-notes { font-size: 13px; color: var(--gray-l); line-height: 1.6; margin-bottom: 12px; }
  .db-card-source {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; letter-spacing: .04em;
    color: var(--orange); text-decoration: none; text-transform: uppercase;
  }
  .db-card-source:hover { opacity: .8; }
  .db-card-expand-hint {
    margin-top: 10px; font-size: 11px; color: var(--gray);
    letter-spacing: .06em; text-transform: uppercase;
    display: flex; align-items: center; gap: 4px;
  }

  /* ── LOADING / EMPTY ─────────────────────────────────────────────────── */
  .db-loading {
    padding: 80px 32px; text-align: center;
    color: var(--gray); font-size: 14px;
    max-width: 1100px; margin: 0 auto;
  }
  .db-empty {
    padding: 60px 32px; text-align: center;
    color: var(--gray); font-size: 14px;
    max-width: 1100px; margin: 0 auto;
  }

  /* ── FOOTER ──────────────────────────────────────────────────────────── */
  .db-footer {
    border-top: 1px solid var(--border);
    padding: 28px 32px;
    max-width: 1100px; margin: 0 auto;
    display: flex; justify-content: space-between; align-items: center; gap: 16px;
    flex-wrap: wrap;
  }
  .db-footer-note { font-size: 12px; color: var(--gray); }
  .db-footer-admin {
    font-size: 11px; color: rgba(255,255,255,.2); letter-spacing: .06em; text-transform: uppercase;
  }

  /* ── MOBILE ──────────────────────────────────────────────────────────── */
  @media (max-width: 680px) {
    .db-nav { padding: 0 16px; }
    .db-nav-links { display: none; }
    .db-hero { padding: 40px 16px 32px; }
    .db-search-bar { padding: 16px 16px 8px; }
    .db-grid { padding: 8px 16px 48px; grid-template-columns: 1fr; }
    .db-footer { padding: 24px 16px; flex-direction: column; align-items: flex-start; }
  }
`

const ROUND_BADGE_COLORS = {
  'Seed':       { bg: 'rgba(168,133,96,0.12)', fg: '#D4B896' },
  'Series A':   { bg: 'rgba(34,197,94,0.10)',  fg: '#86EFAC' },
  'Series B':   { bg: 'rgba(59,130,246,0.10)', fg: '#93C5FD' },
  'Series C':   { bg: 'rgba(168,85,247,0.10)', fg: '#D8B4FE' },
  'Series D':   { bg: 'rgba(236,72,153,0.10)', fg: '#F9A8D4' },
  'Series E':   { bg: 'rgba(232,93,38,0.12)',  fg: '#F0A882' },
  'Growth':     { bg: 'rgba(245,158,11,0.10)', fg: '#FCD34D' },
  'default':    { bg: 'rgba(138,132,124,0.10)', fg: '#999' },
}

function roundBadge(round) {
  if (!round) return ROUND_BADGE_COLORS.default
  const key = Object.keys(ROUND_BADGE_COLORS).find(k => round.startsWith(k))
  return ROUND_BADGE_COLORS[key] || ROUND_BADGE_COLORS.default
}

function formatDate(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function RoundCard({ round }) {
  const [expanded, setExpanded] = useState(false)
  const badge = roundBadge(round.round)
  const dateStr = formatDate(round.date)

  return (
    <div
      className={`db-card${expanded ? ' expanded' : ''}`}
      onClick={() => setExpanded(e => !e)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(v => !v) }}
      aria-expanded={expanded}
    >
      <div className="db-card-top">
        <div className="db-card-company">{round.company}</div>
        <div className="db-card-amount">{round.amount_raised}</div>
      </div>

      <div className="db-card-meta">
        {round.round && (
          <span className="db-badge" style={{ background: badge.bg, color: badge.fg, border: `1px solid ${badge.fg}22` }}>
            {round.round}
          </span>
        )}
        {dateStr && <span className="db-card-date">{dateStr}</span>}
      </div>

      {!expanded && (
        <div className="db-card-expand-hint">
          <span>Details</span>
          <span style={{ opacity: .6 }}>↓</span>
        </div>
      )}

      {expanded && (
        <div className="db-card-expanded">
          {round.notes && <p className="db-card-notes">{round.notes}</p>}
          {round.source_url && (
            <a
              className="db-card-source"
              href={round.source_url}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
            >
              Source ↗
            </a>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Collapse</span>
            <span style={{ opacity: .6 }}>↑</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SpaceRisingDealBankCompleted() {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.title = 'Completed Rounds — Deal Bank — Space Rising'
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/deal-bank/completed')
        if (!r.ok) throw new Error(`API ${r.status}`)
        const j = await r.json()
        if (!cancelled) setRounds(Array.isArray(j.rounds) ? j.rounds : [])
      } catch {
        // Fallback: embedded seed (identical to API seed data)
        if (!cancelled) setRounds(SEED_FALLBACK)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return rounds
    const q = search.toLowerCase()
    return rounds.filter(r =>
      r.company.toLowerCase().includes(q) ||
      (r.round || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q)
    )
  }, [rounds, search])

  const totalDisplay = useMemo(() => {
    // Just count the rounds for display — amounts are text strings not numbers
    return `${rounds.length} closed rounds`
  }, [rounds])

  return (
    <div className="db-root db-page">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="db-nav">
        <a className="db-nav-logo" href="/brands/space-rising">
          <img src="/images/space-rising/logo-white.png" alt="Space Rising" />
          <span className="db-nav-logo-text">Space Rising</span>
        </a>
        <div className="db-nav-links">
          <a className="db-nav-link" href="https://sourcing.directory/space-rising" target="_blank" rel="noreferrer">Directory</a>
          <a className="db-nav-link active" href="/space-rising/deal-bank/completed">Deal Bank</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="db-hero">
        <div className="db-hero-eyebrow">Deal Bank — Completed Rounds</div>
        <h1 className="db-hero-title">
          Space Capital<br /><span>Moving</span>
        </h1>
        <p className="db-hero-sub">
          Closed funding rounds across the space industry. Updated by the Space Rising team as deals are announced.
        </p>
        {!loading && (
          <div className="db-hero-stats">
            <div className="db-stat">
              <span className="db-stat-val">{rounds.length}</span>
              <span className="db-stat-label">Rounds tracked</span>
            </div>
            <div className="db-stat">
              <span className="db-stat-val">2026</span>
              <span className="db-stat-label">Vintage</span>
            </div>
          </div>
        )}
      </div>

      {/* SEARCH */}
      <div className="db-search-bar">
        <input
          className="db-search"
          type="text"
          placeholder="Search company, round type, notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {!loading && search && (
          <span className="db-result-count">
            {filtered.length} of {rounds.length}
          </span>
        )}
      </div>

      {/* GRID */}
      {loading ? (
        <div className="db-loading">Loading rounds…</div>
      ) : filtered.length === 0 ? (
        <div className="db-empty">
          {rounds.length === 0
            ? 'No rounds yet. Check back soon.'
            : `No rounds match "${search}".`}
        </div>
      ) : (
        <div className="db-grid">
          {filtered.map(r => (
            <RoundCard key={r.id || `${r.company}-${r.round}`} round={r} />
          ))}
        </div>
      )}

      {/* FOOTER */}
      <footer className="db-footer">
        <p className="db-footer-note">
          Maintained by Space Rising. Contact{' '}
          <a href="mailto:hello@aheadofmarket.com" style={{ color: 'inherit', textDecoration: 'underline' }}>
            hello@aheadofmarket.com
          </a>{' '}
          to report a round or correction.
        </p>
        <span className="db-footer-admin">AOM Team — to add a round, see admin docs or Supabase Studio</span>
      </footer>
    </div>
  )
}

// Inline fallback seed (mirrors the API seed data — used if API is unreachable)
const SEED_FALLBACK = [
  { id: 'sf-1', company: 'ORBCOMM', amount_raised: '$460M', round: 'Refinancing (private credit)', date: '2026-04-29', source_url: 'https://satellitetoday.com', notes: 'Private credit refinancing led by Carlyle. Co-investors: Bain Credit (Private Credit Group), Morgan Stanley Private Credit.' },
  { id: 'sf-2', company: 'Astranis Space Technologies', amount_raised: '$300M', round: 'Series E', date: '2026-05-06', source_url: 'https://spacenews.com', notes: 'microGEO satellite company. Co-led by Snowpoint Ventures and Franklin Templeton. Other investors: a16z, BlackRock, Baillie Gifford, Fidelity, BAM Elevate, Nimble Partners.' },
  { id: 'sf-3', company: 'Cowboy Space Corporation', amount_raised: '$275M', round: 'Series B', date: '2026-05-08', source_url: 'https://spacenews.com', notes: 'Orbital compute and data centers. Led by Index Ventures. Co-investors: IVP, Blossom Capital, SAIC, Breakthrough Energy Ventures, Construct Capital, a16z, NEA, Interlagos.' },
  { id: 'sf-4', company: 'Star Catcher', amount_raised: '$65M', round: 'Series A', date: '2026-05-12', source_url: 'https://spacenews.com', notes: 'Power-beaming networks for orbital infrastructure. Led by B Capital. Co-investors: Shield Capital, Cerberus Ventures, GreatPoint Ventures, Helena, Oceans Ventures, MVP Ventures.' },
  { id: 'sf-5', company: 'Lunar Outpost', amount_raised: '$30M', round: 'Series B', date: '2026-05-07', source_url: 'https://spacenews.com', notes: 'Lunar mobility (rovers). Led by Industrious Ventures. Co-investors: Type One Ventures, Eniac Ventures, Promus Ventures, Reliable Equity.' },
  { id: 'sf-6', company: 'Scout Space', amount_raised: '$18M', round: 'Series A', date: '2026-05-06', source_url: 'https://payloadspace.com', notes: 'Orbital tracking and space domain awareness (SDA). Led by Washington Harbour Partners. Co-investors: VIPC, Noblis Ventures, Decisive Point, Fusion Fund.' },
  { id: 'sf-7', company: 'INTALUS, Inc.', amount_raised: '$11M', round: 'Seed', date: '2026-05-06', source_url: 'https://semafor.com', notes: 'Advanced aerospace materials. Led by Origin Ventures. Co-investors: Lockheed Martin, Scout Ventures.' },
]
