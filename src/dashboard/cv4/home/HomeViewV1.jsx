// V1 — Editorial Briefing.
//
// Aesthetic: NYT morning-briefing email. Single column. Restrained. Reads top
// to bottom like an email. Italic Instrument Serif accents, Hanken body,
// JetBrains Mono for timestamps. Hairline dividers. AOM amber as accent only.

import { useCornerNav } from '../../CornerContext.jsx'
import useHomeData from './useHomeData.js'

function StatePip({ state }) {
  const cls = state?.toUpperCase() === 'IDLE' ? 'idle' : 'active'
  return <span className={`v1-pip v1-pip--${cls}`} />
}

function Row({ icon, name, time, preview, onClick, kind = 'project' }) {
  return (
    <button className="v1-row" data-kind={kind} onClick={onClick}>
      <span className="v1-row__icon">{icon}</span>
      <span className="v1-row__body">
        <span className="v1-row__head">
          <span className="v1-row__name">{name}</span>
          <span className="v1-row__time">{time}</span>
        </span>
        {preview && <span className="v1-row__preview">{preview}</span>}
      </span>
    </button>
  )
}

export default function HomeViewV1() {
  const { handleSelectAgent, handleSelectProject } = useCornerNav()
  const data = useHomeData()

  const openAgent = (a) => handleSelectAgent(a)
  const openProject = (p) => handleSelectProject(p)

  const greetingParts = data.greeting.split(',')
  const greetingPrefix = greetingParts[0] + ','
  const greetingName = (greetingParts[1] || '').trim()

  return (
    <div className="cv4-home v1" data-testid="cv4-home-v1">
      <div className="v1__inner">
        {/* Eyebrow + greeting */}
        <header className="v1__hero">
          <div className="v1__eyebrow">
            <span className="v1__eyebrow-dot" />
            <span>The Briefing</span>
            <span className="v1__eyebrow-sep">·</span>
            <span>{data.today}</span>
          </div>
          <h1 className="v1__greeting">
            {greetingPrefix}{' '}
            <span className="v1__greeting-name">{greetingName}</span>
          </h1>
        </header>

        {/* EA hero open-letter style */}
        {data.eaAgent && (
          <section className="v1__ea">
            <button
              className="v1__ea-card"
              onClick={() => openAgent(data.eaAgent)}
              aria-label={`Open thread with ${data.eaAgent.name}`}
            >
              <div className="v1__ea-meta">
                <span className="v1__ea-label">From {data.eaAgent.name}</span>
                <span className="v1__ea-time">{data.eaAgent.lastTimeShort || 'idle'}</span>
              </div>
              <div className="v1__ea-body">
                {data.eaAgent.lastText
                  ? data.eaAgent.lastText
                  : `Ready when you are.`}
              </div>
              <div className="v1__ea-cta">
                Open thread
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </button>
          </section>
        )}

        {/* Pinned */}
        {data.pinned.length > 0 && (
          <section className="v1__section">
            <div className="v1__section-head">
              <span className="v1__section-label"><i>On your desk</i></span>
              <span className="v1__section-count">
                {data.pinned.length.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="v1__list">
              {data.pinned.map((p) => (
                <Row
                  key={p.key}
                  kind={p.kind}
                  icon={
                    p.kind === 'agent'
                      ? <StatePip state={p.state} />
                      : <span className="v1-row__pin" aria-hidden="true">⌗</span>
                  }
                  name={p.name}
                  time={p.tsShort}
                  preview={p.preview}
                  onClick={() => p.kind === 'agent' ? openAgent(p.data) : openProject(p.data)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Other agents */}
        {data.otherAgents.length > 0 && (
          <section className="v1__section">
            <div className="v1__section-head">
              <span className="v1__section-label"><i>Agents</i></span>
              <span className="v1__section-count">
                {data.otherAgents.length.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="v1__list">
              {data.otherAgents.map((a) => (
                <Row
                  key={a.slug}
                  kind="agent"
                  icon={<StatePip state={a.state} />}
                  name={a.name}
                  time={a.lastTimeShort}
                  preview={a.lastText}
                  onClick={() => openAgent(a)}
                />
              ))}
            </div>
          </section>
        )}

        {/* All projects */}
        {data.activeProjects.length > 0 && (
          <section className="v1__section">
            <div className="v1__section-head">
              <span className="v1__section-label"><i>Projects</i></span>
              <span className="v1__section-count">
                {data.activeProjects.length.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="v1__list">
              {data.activeProjects.map((p) => (
                <Row
                  key={p.key}
                  kind="project"
                  icon={
                    <span
                      className="v1-row__color-dot"
                      style={{ background: p.color || 'var(--cv4-bone-3)' }}
                      aria-hidden="true"
                    />
                  }
                  name={p.name}
                  time={p.tsShort}
                  preview={p.preview}
                  onClick={() => openProject(p.data)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="v1__footer">
          <span className="v1__footer-line">
            Start a thread below to ask anything.
          </span>
        </footer>
      </div>
    </div>
  )
}
