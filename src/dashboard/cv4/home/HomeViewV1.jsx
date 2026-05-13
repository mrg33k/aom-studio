// V1 — LETTER (Editorial + Terminal hybrid, editorial-leaning).
//
// Tiny mono status kicker top-left. Big italic Instrument Serif greeting
// with amber name. EA card reads as an open letter. Rows = mono glyph +
// italic serif name + mono time + Hanken preview. Hairline dividers.
// Footer mono keymap small caps.
//
// Less terminal frame; more newsroom/email feel with mono accents.

import { useEffect, useState } from 'react'
import { useCornerNav } from '../../CornerContext.jsx'
import useHomeData from './useHomeData.js'

function glyphFor(state, kind) {
  if (kind === 'agent') {
    const s = (state || '').toUpperCase()
    if (s === 'IDLE') return '○'
    return '●'
  }
  return '◇'
}

function clockShort() {
  const d = new Date()
  return d.toTimeString().slice(0, 5)
}

function Row({ glyph, glyphTone, name, time, preview, onClick, kind }) {
  return (
    <button className="vL-row" data-kind={kind} onClick={onClick}>
      <span className={`vL-row__glyph vL-row__glyph--${glyphTone}`}>{glyph}</span>
      <span className="vL-row__body">
        <span className="vL-row__head">
          <span className="vL-row__name">{name}</span>
          <span className="vL-row__time">{time || '——'}</span>
        </span>
        {preview && <span className="vL-row__preview">{preview}</span>}
      </span>
    </button>
  )
}

export default function HomeViewV1() {
  const { handleSelectAgent, handleSelectProject } = useCornerNav()
  const data = useHomeData()
  const [now, setNow] = useState(clockShort)

  useEffect(() => {
    const id = setInterval(() => setNow(clockShort()), 30_000)
    return () => clearInterval(id)
  }, [])

  const openAgent = (a) => handleSelectAgent(a)
  const openProject = (p) => handleSelectProject(p)

  const greetingParts = data.greeting.split(',')
  const prefix = greetingParts[0] + ','
  const name = (greetingParts[1] || '').trim()

  return (
    <div className="cv4-home vL" data-testid="cv4-home-letter">
      <div className="vL__inner">
        {/* Mono kicker */}
        <div className="vL__kicker">
          <span className="vL__kicker-dot" />
          <span>{now}</span>
          <span className="vL__kicker-sep">·</span>
          <span>{data.worldId || 'aom'}</span>
          <span className="vL__kicker-sep">·</span>
          <span>home</span>
        </div>

        {/* Greeting */}
        <header className="vL__hero">
          <h1 className="vL__greeting">
            {prefix} <span className="vL__greeting-name">{name}</span>
          </h1>
          <p className="vL__lede">{data.today}.</p>
        </header>

        {/* EA letter card */}
        {data.eaAgent && (
          <section className="vL__ea">
            <button className="vL__ea-card" onClick={() => openAgent(data.eaAgent)}>
              <div className="vL__ea-head">
                <span className="vL__ea-from">From <i>{data.eaAgent.name}</i></span>
                <span className="vL__ea-time">{data.eaAgent.lastTimeShort || 'idle'}</span>
              </div>
              <div className="vL__ea-body">
                {data.eaAgent.lastText || 'Ready when you are.'}
              </div>
              <div className="vL__ea-cta">
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
          <section className="vL__section">
            <div className="vL__section-head">
              <span className="vL__section-label"><i>On your desk</i></span>
              <span className="vL__section-count">[{data.pinned.length.toString().padStart(2, '0')}]</span>
            </div>
            <div className="vL__list">
              {data.pinned.map((p) => (
                <Row
                  key={p.key}
                  kind={p.kind}
                  glyph="★"
                  glyphTone="amber"
                  name={p.name}
                  time={p.tsShort}
                  preview={p.preview}
                  onClick={() => p.kind === 'agent' ? openAgent(p.data) : openProject(p.data)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Agents (other than EA) */}
        {data.otherAgents.length > 0 && (
          <section className="vL__section">
            <div className="vL__section-head">
              <span className="vL__section-label"><i>Agents</i></span>
              <span className="vL__section-count">[{data.otherAgents.length.toString().padStart(2, '0')}]</span>
            </div>
            <div className="vL__list">
              {data.otherAgents.map((a) => (
                <Row
                  key={a.slug}
                  kind="agent"
                  glyph={glyphFor(a.state, 'agent')}
                  glyphTone={(a.state || '').toUpperCase() === 'IDLE' ? 'dim' : 'active'}
                  name={a.name}
                  time={a.lastTimeShort}
                  preview={a.lastText}
                  onClick={() => openAgent(a)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {data.activeProjects.length > 0 && (
          <section className="vL__section">
            <div className="vL__section-head">
              <span className="vL__section-label"><i>Projects</i></span>
              <span className="vL__section-count">[{data.activeProjects.length.toString().padStart(2, '0')}]</span>
            </div>
            <div className="vL__list">
              {data.activeProjects.map((p) => (
                <Row
                  key={p.key}
                  kind="project"
                  glyph="◇"
                  glyphTone="dim"
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
        <footer className="vL__footer">
          <span className="vL__footer-key">/</span><span>search</span>
          <span className="vL__footer-sep">·</span>
          <span className="vL__footer-key">e</span><span>archived</span>
          <span className="vL__footer-sep">·</span>
          <span className="vL__footer-key">↵</span><span>open</span>
        </footer>
      </div>
    </div>
  )
}
