// V2 — Newspaper Front Page.
//
// Aesthetic: Sunday-paper masthead + big display headline + lead story above
// the fold + two-column body. Strong Instrument Serif italics. Date kicker
// in JetBrains Mono. Mobile collapses to single column with the lead story
// staying full-width.

import { useCornerNav } from '../../CornerContext.jsx'
import useHomeData from './useHomeData.js'

function MiniRow({ label, time, kind, color, onClick }) {
  return (
    <button className="v2-mini-row" data-kind={kind} onClick={onClick}>
      {kind === 'project' && (
        <span className="v2-mini-row__dot" style={{ background: color || 'var(--cv4-bone-3)' }} aria-hidden="true" />
      )}
      {kind === 'agent' && <span className="v2-mini-row__bullet" aria-hidden="true">●</span>}
      <span className="v2-mini-row__label">{label}</span>
      <span className="v2-mini-row__time">{time}</span>
    </button>
  )
}

export default function HomeViewV2() {
  const { handleSelectAgent, handleSelectProject } = useCornerNav()
  const data = useHomeData()

  const openAgent = (a) => handleSelectAgent(a)
  const openProject = (p) => handleSelectProject(p)

  const lead = data.leadStory
  const leadOpen = () => {
    if (!lead) return
    if (lead.kind === 'agent') openAgent(lead.target)
    else openProject(lead.target)
  }

  return (
    <div className="cv4-home v2" data-testid="cv4-home-v2">
      <div className="v2__inner">
        {/* Masthead */}
        <header className="v2__masthead">
          <div className="v2__masthead-rule" aria-hidden="true">
            <span className="v2__rule" />
            <span className="v2__masthead-kicker">The Briefing · {data.today}</span>
            <span className="v2__rule" />
          </div>
          <h1 className="v2__title">
            <span className="v2__title-prefix">{data.greeting.split(',')[0]}, </span>
            <span className="v2__title-name">{(data.greeting.split(',')[1] || '').trim()}.</span>
          </h1>
          <div className="v2__masthead-sub">
            <span>{data.pinned.length} pinned</span>
            <span>·</span>
            <span>{data.activeProjects.length} active</span>
            <span>·</span>
            <span>{data.agents.length} agents</span>
          </div>
        </header>

        {/* Lead story */}
        {lead && (
          <section className="v2__lead">
            <div className="v2__lead-kicker">
              <span className="v2__lead-kicker-kind">
                {lead.kind === 'agent' ? 'AGENT' : 'PROJECT'}
              </span>
              <span className="v2__lead-kicker-sep" aria-hidden="true">/</span>
              <span className="v2__lead-kicker-time">{lead.tsShort}</span>
            </div>
            <button className="v2__lead-card" onClick={leadOpen}>
              <h2 className="v2__lead-headline">{lead.label}</h2>
              <p className="v2__lead-body">{lead.preview || 'Open the thread for the latest update.'}</p>
              <span className="v2__lead-cta">
                Read on
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>
          </section>
        )}

        {/* Two-column: Pinned + Wire */}
        <section className="v2__cols">
          <div className="v2__col">
            <div className="v2__col-head">
              <span className="v2__col-kicker">On Your Desk</span>
              <span className="v2__col-count">{data.pinned.length.toString().padStart(2, '0')}</span>
            </div>
            <div className="v2__col-list">
              {data.pinned.length === 0 && (
                <div className="v2__empty">Nothing pinned yet.</div>
              )}
              {data.pinned.map((p) => (
                <MiniRow
                  key={p.key}
                  kind={p.kind}
                  color={p.color}
                  label={p.name}
                  time={p.tsShort}
                  onClick={() => p.kind === 'agent' ? openAgent(p.data) : openProject(p.data)}
                />
              ))}
            </div>
          </div>

          <div className="v2__col">
            <div className="v2__col-head">
              <span className="v2__col-kicker">The Wire</span>
              <span className="v2__col-count">{data.wire.length.toString().padStart(2, '0')}</span>
            </div>
            <div className="v2__col-list">
              {data.wire.slice(0, 10).map((w) => (
                <MiniRow
                  key={w.key}
                  kind={w.kind}
                  label={w.label}
                  time={w.tsShort}
                  onClick={() => w.kind === 'agent' ? openAgent(w.target) : openProject(w.target)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Inactive projects strip */}
        {data.activeProjects.length > 0 && (
          <section className="v2__strip">
            <div className="v2__col-head">
              <span className="v2__col-kicker">Projects</span>
              <span className="v2__col-count">{data.activeProjects.length.toString().padStart(2, '0')}</span>
            </div>
            <div className="v2__strip-grid">
              {data.activeProjects.map((p) => (
                <button
                  key={p.key}
                  className="v2__strip-card"
                  onClick={() => openProject(p.data)}
                >
                  <span className="v2__strip-dot" style={{ background: p.color || 'var(--cv4-bone-3)' }} aria-hidden="true" />
                  <span className="v2__strip-name">{p.name}</span>
                  <span className="v2__strip-time">{p.tsShort}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
