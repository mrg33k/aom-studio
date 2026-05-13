// V3 — CONSOLE (Editorial + Terminal hybrid, terminal-leaning).
//
// Live ISO status line + cursor. Greeting embedded as a `//` comment line
// in mono. One BIG editorial lead headline (italic Instrument Serif) on
// the most-recent activity item — the one "moment" of editorial. Below:
// dense terminal blocks for everything else. Footer keymap prominent.
//
// Power-user feel with one editorial flourish.

import { useEffect, useState } from 'react'
import { useCornerNav } from '../../CornerContext.jsx'
import useHomeData from './useHomeData.js'

function clock() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function glyph(state, kind) {
  const s = (state || '').toUpperCase()
  if (kind === 'agent') return s === 'IDLE' ? '○' : '●'
  if (s === 'BLOCKED') return '✕'
  if (s === 'SHIPPED' || s === 'DONE') return '✓'
  return '◐'
}

function tone(state) {
  const s = (state || '').toUpperCase()
  if (s === 'IDLE') return 'idle'
  if (s === 'BLOCKED') return 'blocked'
  if (s === 'SHIPPED' || s === 'DONE') return 'shipped'
  if (s === 'BUILDING' || s === 'ACTIVE' || s === 'WORKING' || s === 'BUSY') return 'active'
  return 'quiet'
}

function Block({ title, count, children }) {
  return (
    <section className="vC__block">
      <div className="vC__block-bar">
        <span className="vC__bar-tick">┌──</span>
        <span className="vC__bar-label">{title}</span>
        <span className="vC__bar-count">[{count.toString().padStart(2, '0')}]</span>
        <span className="vC__bar-fill" />
      </div>
      <div className="vC__lines">{children}</div>
    </section>
  )
}

function Line({ glyphChar, glyphTone, slug, time, preview, onClick, kind }) {
  return (
    <button className="vC-line" data-kind={kind} onClick={onClick}>
      <span className={`vC-line__glyph vC-line__glyph--${glyphTone}`}>{glyphChar}</span>
      <span className="vC-line__slug">{slug}</span>
      <span className="vC-line__dot">·</span>
      <span className="vC-line__time">{time || '——'}</span>
      <span className="vC-line__preview">{preview}</span>
    </button>
  )
}

export default function HomeViewV3() {
  const { handleSelectAgent, handleSelectProject } = useCornerNav()
  const data = useHomeData()
  const [now, setNow] = useState(clock)

  useEffect(() => {
    const id = setInterval(() => setNow(clock()), 1000)
    return () => clearInterval(id)
  }, [])

  const openAgent = (a) => handleSelectAgent(a)
  const openProject = (p) => handleSelectProject(p)

  const lead = data.leadStory
  const openLead = () => {
    if (!lead) return
    if (lead.kind === 'agent') openAgent(lead.target)
    else openProject(lead.target)
  }

  return (
    <div className="cv4-home vC" data-testid="cv4-home-console">
      <div className="vC__inner">
        {/* Status line */}
        <div className="vC__statusline">
          <span className="vC__sl-bracket">[</span>
          <span className="vC__sl-time">{now}</span>
          <span className="vC__sl-bracket">]</span>
          <span className="vC__sl-world">{data.worldId || 'aom'}</span>
          <span className="vC__sl-sep">»</span>
          <span className="vC__sl-route">home</span>
          <span className="vC__sl-cursor">▌</span>
        </div>

        {/* Greeting comment */}
        <div className="vC__greet">// {data.greeting.toLowerCase()}</div>

        {/* Editorial lead — the one moment of typographic warmth */}
        {lead && (
          <section className="vC__lead">
            <div className="vC__lead-kicker">
              <span className="vC__lead-kicker-kind">{lead.kind === 'agent' ? 'AGENT' : 'PROJECT'}</span>
              <span className="vC__lead-kicker-sep">·</span>
              <span className="vC__lead-kicker-time">{lead.tsShort}</span>
              <span className="vC__lead-kicker-slug">{lead.slug}</span>
            </div>
            <button className="vC__lead-card" onClick={openLead}>
              <h2 className="vC__lead-headline">{lead.label}</h2>
              <p className="vC__lead-body">{lead.preview || 'Open the thread for the latest update.'}</p>
              <span className="vC__lead-cta">
                Open thread
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>
          </section>
        )}

        {/* Dense blocks */}
        <Block title="AGENTS" count={data.agents.length}>
          {data.agents.map((a) => (
            <Line
              key={a.slug}
              kind="agent"
              glyphChar={glyph(a.state, 'agent')}
              glyphTone={tone(a.state)}
              slug={a.slug}
              time={a.lastTimeShort}
              preview={a.lastText}
              onClick={() => openAgent(a)}
            />
          ))}
        </Block>

        {data.pinned.length > 0 && (
          <Block title="PINNED" count={data.pinned.length}>
            {data.pinned.map((p) => (
              <Line
                key={p.key}
                kind={p.kind}
                glyphChar="★"
                glyphTone="amber"
                slug={p.slug}
                time={p.tsShort}
                preview={p.preview}
                onClick={() => p.kind === 'agent' ? openAgent(p.data) : openProject(p.data)}
              />
            ))}
          </Block>
        )}

        <Block title="PROJECTS" count={data.activeProjects.length}>
          {data.activeProjects.map((p) => (
            <Line
              key={p.key}
              kind="project"
              glyphChar={glyph(p.status, 'project')}
              glyphTone={tone(p.status)}
              slug={p.slug}
              time={p.tsShort}
              preview={p.preview}
              onClick={() => openProject(p.data)}
            />
          ))}
        </Block>

        <footer className="vC__footer">
          <span className="vC__footer-key">/</span><span>search</span>
          <span className="vC__footer-sep">·</span>
          <span className="vC__footer-key">e</span><span>archived</span>
          <span className="vC__footer-sep">·</span>
          <span className="vC__footer-key">↵</span><span>open</span>
        </footer>
      </div>
    </div>
  )
}
