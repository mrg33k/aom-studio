// HomeShared — primitives that R-CV4-7 home variants reuse.
//
// Console DNA distilled, tightened per Patrik's reference screenshot:
//   - StatusLine: single-line ISO time + world + route + cursor
//   - GreetingComment: `// evening, patrik`
//   - HeroCard: tight EA card, clean sans headline, mono "OPEN THREAD →"
//   - TerminalBlockHeader: `┌── AGENTS [03] ─────`
//   - Row: SINGLE-LINE glyph · slug · time · preview (no stacking)
//   - FooterKeymap: real lucide icons + label

import { useEffect, useState } from 'react'
import { Search, Archive, ExternalLink, ArrowRight } from 'lucide-react'

export function useTickingClock() {
  const fmt = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
  const [now, setNow] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setNow(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function StatusLine({ worldId, route = 'home' }) {
  const now = useTickingClock()
  return (
    <div className="cv4h-status">
      <span className="cv4h-status__time">{now}</span>
      <span className="cv4h-status__sep">»</span>
      <span className="cv4h-status__world">{worldId || 'aom'}</span>
      <span className="cv4h-status__sep">»</span>
      <span className="cv4h-status__route">{route}</span>
      <span className="cv4h-status__cursor">▌</span>
    </div>
  )
}

export function GreetingComment({ text }) {
  return <div className="cv4h-greet">// {(text || '').toLowerCase()}</div>
}

// HeroCard — the EA spotlight at the top. Tight, sans-serif headline,
// mono kicker, body preview, amber "OPEN THREAD →" CTA.
export function HeroCard({ kind = 'AGENT', time, slug, name, body, onClick }) {
  return (
    <button type="button" className="cv4h-hero" onClick={onClick}>
      <div className="cv4h-hero__kicker">
        <span className="cv4h-hero__kicker-kind">{kind}</span>
        <span className="cv4h-hero__kicker-sep">·</span>
        <span className="cv4h-hero__kicker-time">{time}</span>
        <span className="cv4h-hero__kicker-slug">{(slug || '').toUpperCase()}</span>
      </div>
      <h2 className="cv4h-hero__name">{name}</h2>
      <p className="cv4h-hero__body">{body}</p>
      <span className="cv4h-hero__cta">
        Open thread
        <ArrowRight size={12} strokeWidth={2.4} />
      </span>
    </button>
  )
}

export function TerminalBlockHeader({ label, count }) {
  return (
    <div className="cv4h-blockhead">
      <span className="cv4h-blockhead__tick">┌──</span>
      <span className="cv4h-blockhead__label">{label}</span>
      <span className="cv4h-blockhead__count">[{count.toString().padStart(2, '0')}]</span>
      <span className="cv4h-blockhead__fill" />
    </div>
  )
}

export function glyphFor(state, kind) {
  const s = (state || '').toUpperCase()
  if (kind === 'agent') return s === 'IDLE' ? '○' : '●'
  if (s === 'BLOCKED') return '✕'
  if (s === 'SHIPPED' || s === 'DONE') return '✓'
  if (s === 'ARCHIVED') return '◌'
  return '◐'
}

export function toneFor(state) {
  const s = (state || '').toUpperCase()
  if (s === 'IDLE') return 'idle'
  if (s === 'BLOCKED') return 'blocked'
  if (s === 'SHIPPED' || s === 'DONE') return 'shipped'
  if (s === 'BUILDING' || s === 'ACTIVE' || s === 'WORKING' || s === 'BUSY') return 'active'
  return 'quiet'
}

// Row — SINGLE LINE: glyph · slug · time · preview. No stacking.
// On mobile the preview truncates; the row stays one line.
export function Row({
  glyphChar,
  glyphTone = 'quiet',
  slug,
  badge,
  time,
  preview,
  onClick,
  kind,
}) {
  return (
    <button
      type="button"
      className="cv4h-row"
      data-kind={kind}
      onClick={onClick}
    >
      <span className={`cv4h-row__glyph cv4h-row__glyph--${glyphTone}`}>{glyphChar}</span>
      <span className="cv4h-row__slug">{(slug || '').toLowerCase()}</span>
      {badge && <span className="cv4h-row__badge">{badge}</span>}
      <span className="cv4h-row__sep">·</span>
      <span className="cv4h-row__time">{time || '——'}</span>
      <span className="cv4h-row__sep cv4h-row__sep--preview">·</span>
      <span className="cv4h-row__preview">{preview}</span>
    </button>
  )
}

export function FooterKeymap() {
  return (
    <footer className="cv4h-footer">
      <span className="cv4h-footer__item">
        <Search size={13} strokeWidth={1.8} />
        <span>Search</span>
      </span>
      <span className="cv4h-footer__sep" />
      <span className="cv4h-footer__item">
        <Archive size={13} strokeWidth={1.8} />
        <span>Archived</span>
      </span>
      <span className="cv4h-footer__sep" />
      <span className="cv4h-footer__item">
        <ExternalLink size={13} strokeWidth={1.8} />
        <span>Open</span>
      </span>
    </footer>
  )
}
