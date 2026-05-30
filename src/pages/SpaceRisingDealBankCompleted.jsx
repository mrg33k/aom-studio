import React, { useState, useEffect, useMemo } from 'react'

// Space Rising — Deal Bank — Completed Rounds
// Public grid of closed space-industry funding rounds.
// Template-aligned with the Space Rising Interactive OS homepage at sourcing.directory/space-rising.
// Route: /space-rising/deal-bank/completed

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

  .sr-page { box-sizing: border-box; }
  .sr-page *, .sr-page *::before, .sr-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .sr-root {
    --black: #050608;
    --bg: #07090C;
    --surface: #0F1216;
    --surface2: #161A1F;
    --surface3: #1E232B;
    --orange: #E5451F;
    --orange-dim: rgba(229,69,31,0.12);
    --orange-border: rgba(229,69,31,0.4);
    --orange-soft: rgba(229,69,31,0.18);
    --white: #FFFFFF;
    --gray: #8B939C;
    --gray-l: #C7CCD1;
    --gray-d: #5A6068;
    --border: rgba(255,255,255,0.06);
    --border-strong: rgba(255,255,255,0.1);
    color: var(--white);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    min-height: 100vh;
    position: relative;
    background:
      radial-gradient(ellipse 800px 600px at 85% 10%, rgba(229,69,31,0.10), transparent 60%),
      radial-gradient(ellipse 1000px 700px at 0% 100%, rgba(50,80,130,0.10), transparent 60%),
      var(--bg);
  }
  .sr-root::before {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      radial-gradient(circle at 18% 22%, rgba(255,255,255,0.5) 1px, transparent 1.6px),
      radial-gradient(circle at 72% 58%, rgba(255,255,255,0.35) 1px, transparent 1.6px),
      radial-gradient(circle at 42% 80%, rgba(255,255,255,0.4) 1px, transparent 1.6px),
      radial-gradient(circle at 88% 30%, rgba(255,255,255,0.3) 1px, transparent 1.6px),
      radial-gradient(circle at 8% 60%, rgba(255,255,255,0.3) 1px, transparent 1.6px),
      radial-gradient(circle at 60% 12%, rgba(255,255,255,0.35) 1px, transparent 1.6px);
    background-size: 400px 400px, 350px 350px, 500px 500px, 280px 280px, 600px 600px, 320px 320px;
    opacity: 0.6;
  }

  .sr-shell {
    position: relative;
    z-index: 1;
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* ── TOP BAR ─────────────────────────────────────────────────────────── */
  .sr-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 0;
  }
  .sr-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--gray); text-decoration: none;
    letter-spacing: 0.04em;
  }
  .sr-back:hover { color: var(--white); }
  .sr-brand {
    display: inline-flex; align-items: center; gap: 10px;
    text-decoration: none;
  }
  .sr-brand img { height: 26px; width: auto; opacity: 0.85; }

  /* ── HERO ────────────────────────────────────────────────────────────── */
  .sr-hero { padding: 36px 0 28px; }
  .sr-eyebrow {
    font-family: 'Inter', sans-serif;
    font-size: 11px; font-weight: 600; letter-spacing: 0.24em;
    text-transform: uppercase; color: var(--orange);
    margin-bottom: 14px;
  }
  .sr-title {
    font-family: 'Oswald', sans-serif;
    font-size: clamp(40px, 6vw, 64px);
    font-weight: 700; line-height: 0.96;
    letter-spacing: 0.02em; text-transform: uppercase;
    margin-bottom: 16px;
  }
  .sr-sub {
    font-size: 15px; color: var(--gray-l); max-width: 620px; line-height: 1.6;
  }

  /* ── SEARCH ──────────────────────────────────────────────────────────── */
  .sr-search-wrap {
    margin: 28px 0 18px;
    display: flex; align-items: center;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    padding: 0 18px;
    max-width: 540px;
    transition: border-color .15s, background .15s;
  }
  .sr-search-wrap:focus-within {
    border-color: var(--orange-border);
    background: rgba(229,69,31,0.05);
  }
  .sr-search-wrap svg { color: var(--gray); flex-shrink: 0; }
  .sr-search {
    flex: 1; background: transparent; border: none; outline: none;
    color: var(--white); font-family: 'Inter', sans-serif; font-size: 14px;
    padding: 13px 12px;
  }
  .sr-search::placeholder { color: var(--gray); }

  /* ── CHIPS ───────────────────────────────────────────────────────────── */
  .sr-chips {
    display: flex; gap: 8px; flex-wrap: wrap; padding: 6px 0 4px;
  }
  .sr-chip {
    display: inline-flex; align-items: center;
    padding: 7px 14px;
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    background: rgba(255,255,255,0.025);
    color: var(--gray-l);
    font-size: 12px; font-weight: 500;
    letter-spacing: 0.02em;
    cursor: pointer;
    text-decoration: none;
    transition: all .12s;
    user-select: none;
  }
  .sr-chip:hover {
    border-color: var(--border-strong);
    color: var(--white);
    background: rgba(255,255,255,0.06);
  }
  .sr-chip.on {
    border-color: var(--orange-border);
    background: var(--orange-dim);
    color: var(--orange);
  }

  /* ── COUNT BAR ───────────────────────────────────────────────────────── */
  .sr-count {
    margin: 20px 0 8px;
    font-size: 11px; color: var(--gray);
    text-transform: uppercase; letter-spacing: 0.14em;
    font-weight: 600;
  }
  .sr-count strong { color: var(--white); font-weight: 700; }

  /* ── LIST (horizontal rows) ──────────────────────────────────────────── */
  .sr-list { display: flex; flex-direction: column; gap: 8px; padding-bottom: 60px; }
  .sr-row {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px 22px;
    display: grid;
    grid-template-columns: 56px 1fr auto;
    gap: 18px;
    align-items: center;
    cursor: pointer;
    transition: border-color .15s, background .15s, transform .12s;
  }
  .sr-row:hover {
    border-color: var(--orange-border);
    background: var(--surface2);
  }
  .sr-row.expanded {
    border-color: var(--orange-border);
    background: var(--surface2);
  }
  .sr-row-letter {
    width: 56px; height: 56px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Oswald', sans-serif;
    font-weight: 700; font-size: 22px;
    letter-spacing: 0.02em;
  }
  .sr-row-mid { min-width: 0; }
  .sr-row-name {
    font-family: 'Oswald', sans-serif;
    font-size: 18px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.01em;
    line-height: 1.15;
    margin-bottom: 6px;
    color: var(--white);
    overflow: hidden; text-overflow: ellipsis;
  }
  .sr-row-meta {
    display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    font-size: 12px; color: var(--gray);
  }
  .sr-badge {
    display: inline-flex; align-items: center;
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: 4px; padding: 3px 8px;
  }
  .sr-tag {
    font-size: 11px; color: var(--gray-l);
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border-strong);
    padding: 3px 9px; border-radius: 4px;
    letter-spacing: 0.02em;
  }
  .sr-date { font-size: 12px; color: var(--gray); }
  .sr-row-right {
    display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
  }
  .sr-amount {
    font-family: 'Oswald', sans-serif;
    font-size: 26px; font-weight: 700;
    color: var(--orange);
    letter-spacing: 0.01em; line-height: 1; white-space: nowrap;
  }
  .sr-region { font-size: 11px; color: var(--gray); letter-spacing: 0.04em; }

  .sr-expanded-body {
    grid-column: 1 / -1;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 10px;
  }
  .sr-desc { font-size: 14px; color: var(--gray-l); line-height: 1.55; }
  .sr-investors {
    font-size: 12px; color: var(--gray-l); line-height: 1.55;
  }
  .sr-investors b { color: var(--white); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; font-size: 11px; }
  .sr-source-link {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--orange); text-decoration: none;
  }
  .sr-source-link:hover { opacity: 0.8; }

  /* ── LOADING / EMPTY ─────────────────────────────────────────────────── */
  .sr-state {
    padding: 60px 24px; text-align: center;
    color: var(--gray); font-size: 14px;
  }

  /* ── FOOTER ──────────────────────────────────────────────────────────── */
  .sr-footer {
    border-top: 1px solid var(--border);
    margin-top: 40px; padding: 28px 0;
    display: flex; justify-content: space-between; align-items: center; gap: 16px;
    flex-wrap: wrap;
    font-size: 12px; color: var(--gray);
  }
  .sr-footer a { color: var(--gray-l); text-decoration: none; border-bottom: 1px dotted var(--gray-d); }
  .sr-footer a:hover { color: var(--white); }

  /* ── MOBILE ──────────────────────────────────────────────────────────── */
  @media (max-width: 720px) {
    .sr-shell { padding: 0 16px; }
    .sr-hero { padding: 24px 0 20px; }
    .sr-row {
      grid-template-columns: 44px 1fr;
      padding: 14px 16px;
      gap: 14px;
    }
    .sr-row-letter { width: 44px; height: 44px; font-size: 18px; border-radius: 10px; }
    .sr-row-right {
      grid-column: 1 / -1;
      flex-direction: row; justify-content: space-between; align-items: center;
      width: 100%;
      margin-top: 4px;
    }
    .sr-amount { font-size: 22px; }
  }
`

// Round badge color system — same family as company badges on the OS homepage
const ROUND_BADGE = {
  'Pre-Seed':    { bg: 'rgba(148,163,184,0.10)', fg: '#94A3B8' },
  'Seed':        { bg: 'rgba(168,133,96,0.12)',  fg: '#D4B896' },
  'Series A':    { bg: 'rgba(34,197,94,0.10)',   fg: '#86EFAC' },
  'Series B':    { bg: 'rgba(59,130,246,0.10)',  fg: '#93C5FD' },
  'Series C':    { bg: 'rgba(168,85,247,0.10)',  fg: '#D8B4FE' },
  'Series D':    { bg: 'rgba(236,72,153,0.10)',  fg: '#F9A8D4' },
  'Series E':    { bg: 'rgba(232,93,38,0.12)',   fg: '#F0A882' },
  'Series F':    { bg: 'rgba(232,93,38,0.12)',   fg: '#F0A882' },
  'Growth':      { bg: 'rgba(245,158,11,0.10)',  fg: '#FCD34D' },
  'Bridge':      { bg: 'rgba(96,165,250,0.10)',  fg: '#60A5FA' },
  'Debt':        { bg: 'rgba(244,114,182,0.10)', fg: '#F472B6' },
  'Convertible': { bg: 'rgba(96,165,250,0.10)',  fg: '#60A5FA' },
  'Refinancing': { bg: 'rgba(248,113,113,0.10)', fg: '#F87171' },
  'default':     { bg: 'rgba(139,147,156,0.10)', fg: '#8B939C' },
}
function roundBadge(round) {
  if (!round) return ROUND_BADGE.default
  const key = Object.keys(ROUND_BADGE).find(k => round.startsWith(k))
  return ROUND_BADGE[key] || ROUND_BADGE.default
}

// Round-stage filter chips
const STAGE_FILTERS = [
  { key: 'all',       label: 'All Rounds' },
  { key: 'pre-seed',  label: 'Pre-Seed' },
  { key: 'seed',      label: 'Seed' },
  { key: 'series-a',  label: 'Series A' },
  { key: 'series-b',  label: 'Series B' },
  { key: 'series-c',  label: 'Series C' },
  { key: 'series-d+', label: 'Series D+' },
  { key: 'growth',    label: 'Growth / Other' },
]

function classifyStage(round) {
  if (!round) return 'growth'
  const r = round.toLowerCase()
  if (r.includes('pre-seed') || r.startsWith('pre seed')) return 'pre-seed'
  if (r.startsWith('seed')) return 'seed'
  if (r.startsWith('series a')) return 'series-a'
  if (r.startsWith('series b')) return 'series-b'
  if (r.startsWith('series c')) return 'series-c'
  if (r.startsWith('series d') || r.startsWith('series e') || r.startsWith('series f') || r.startsWith('series g')) return 'series-d+'
  return 'growth'
}

// Color palettes for the round letter avatar — deterministic by company name
const LETTER_PALETTES = [
  { bg: 'rgba(229,69,31,0.16)',  fg: '#F0A882' },
  { bg: 'rgba(59,130,246,0.16)', fg: '#93C5FD' },
  { bg: 'rgba(168,85,247,0.16)', fg: '#D8B4FE' },
  { bg: 'rgba(34,197,94,0.16)',  fg: '#86EFAC' },
  { bg: 'rgba(245,158,11,0.16)', fg: '#FCD34D' },
  { bg: 'rgba(236,72,153,0.16)', fg: '#F9A8D4' },
  { bg: 'rgba(20,184,166,0.16)', fg: '#5EEAD4' },
]
function letterPalette(s) {
  if (!s) return LETTER_PALETTES[0]
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return LETTER_PALETTES[Math.abs(h) % LETTER_PALETTES.length]
}

function formatDate(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return iso }
}

function RoundRow({ round }) {
  const [expanded, setExpanded] = useState(false)
  const badge = roundBadge(round.round)
  const pal = letterPalette(round.company)
  const letter = (round.company || '?').trim().charAt(0).toUpperCase()
  const dateStr = formatDate(round.date)

  return (
    <div
      className={`sr-row${expanded ? ' expanded' : ''}`}
      onClick={() => setExpanded(e => !e)}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v) } }}
      aria-expanded={expanded}
    >
      <div className="sr-row-letter" style={{ background: pal.bg, color: pal.fg }}>{letter}</div>

      <div className="sr-row-mid">
        <div className="sr-row-name">{round.company}</div>
        <div className="sr-row-meta">
          {round.round && (
            <span className="sr-badge" style={{ background: badge.bg, color: badge.fg, border: `1px solid ${badge.fg}28` }}>
              {round.round}
            </span>
          )}
          {round.segment && <span className="sr-tag">{round.segment}</span>}
          {dateStr && <span className="sr-date">{dateStr}</span>}
        </div>
      </div>

      <div className="sr-row-right">
        <div className="sr-amount">{round.amount_raised}</div>
        {round.region && <div className="sr-region">{round.region}</div>}
      </div>

      {expanded && (
        <div className="sr-expanded-body">
          {round.short_description && <div className="sr-desc">{round.short_description}</div>}
          {round.investors && (
            <div className="sr-investors">
              <b>Investors</b><br />
              {round.investors}
            </div>
          )}
          {round.notes && !round.short_description && (
            <div className="sr-desc">{round.notes}</div>
          )}
          {round.source_url && (
            <a
              className="sr-source-link"
              href={round.source_url}
              target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
            >
              {round.source ? `${round.source} ↗` : 'View source ↗'}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function SpaceRisingDealBankCompleted() {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('all')

  useEffect(() => {
    document.title = 'Deal Bank — Space Rising Interactive'
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/deal-bank/completed')
        if (!r.ok) throw new Error(`API ${r.status}`)
        const j = await r.json()
        if (!cancelled) setRounds(Array.isArray(j.rounds) ? j.rounds : [])
      } catch {
        if (!cancelled) setRounds([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rounds.filter(r => {
      if (stage !== 'all' && classifyStage(r.round) !== stage) return false
      if (!q) return true
      return (
        (r.company || '').toLowerCase().includes(q) ||
        (r.round || '').toLowerCase().includes(q) ||
        (r.segment || '').toLowerCase().includes(q) ||
        (r.short_description || '').toLowerCase().includes(q) ||
        (r.investors || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      )
    })
  }, [rounds, search, stage])

  return (
    <div className="sr-root sr-page">
      <style>{CSS}</style>

      <div className="sr-shell">

        {/* TOP BAR */}
        <div className="sr-topbar">
          <a className="sr-back" href="https://sourcing.directory/space-rising">← Back to Directory</a>
          <a className="sr-brand" href="https://sourcing.directory/space-rising">
            <img src="/images/space-rising/logo-white.png" alt="Space Rising Interactive" />
          </a>
        </div>

        {/* HERO */}
        <header className="sr-hero">
          <div className="sr-eyebrow">Space Rising Interactive</div>
          <h1 className="sr-title">Deal Bank</h1>
          <p className="sr-sub">
            Closed funding rounds across the space industry. Pre-seed through growth, curated by the Space Rising team.
          </p>
        </header>

        {/* SEARCH */}
        <div className="sr-search-wrap">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="sr-search"
            type="text"
            placeholder="Search company, segment, investors, round..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* PRIMARY CHIPS — section nav, mirrors the OS homepage */}
        <div className="sr-chips" style={{ paddingBottom: 4 }}>
          <a className="sr-chip" href="https://sourcing.directory/space-rising">Companies</a>
          <a className="sr-chip" href="https://sourcing.directory/space-rising/jobs">Jobs</a>
          <a className="sr-chip" href="https://sourcing.directory/space-rising/events">Events</a>
          <a className="sr-chip" href="https://sourcing.directory/space-rising/reports">Reports</a>
          <a className="sr-chip" href="https://sourcing.directory/space-rising/marketplace">Marketplace</a>
          <a className="sr-chip" href="https://sourcing.directory/space-rising/membership">Membership</a>
          <span className="sr-chip on">Deal Bank</span>
        </div>

        {/* SECONDARY CHIPS — round stage filter */}
        <div className="sr-chips">
          {STAGE_FILTERS.map(s => (
            <button
              key={s.key}
              className={`sr-chip ${stage === s.key ? 'on' : ''}`}
              onClick={() => setStage(s.key)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* COUNT */}
        <div className="sr-count">
          {loading
            ? 'Loading rounds…'
            : <><strong>{filtered.length}</strong> {filtered.length === 1 ? 'round' : 'rounds'}{(search || stage !== 'all') ? ` matching` : ''}{rounds.length !== filtered.length ? ` of ${rounds.length} total` : ''}</>
          }
        </div>

        {/* LIST */}
        {loading ? (
          <div className="sr-state">Loading rounds…</div>
        ) : filtered.length === 0 ? (
          <div className="sr-state">No rounds match these filters.</div>
        ) : (
          <div className="sr-list">
            {filtered.map(r => (
              <RoundRow key={r.id || `${r.company}-${r.round}-${r.date}`} round={r} />
            ))}
          </div>
        )}

        {/* FOOTER */}
        <footer className="sr-footer">
          <span>
            Maintained by the <a href="https://sourcing.directory/space-rising">Space Rising Interactive</a> team.
          </span>
          <span>Have a round to add? <a href="mailto:hello@spacerising.org">hello@spacerising.org</a></span>
        </footer>

      </div>
    </div>
  )
}
