// V3 — Terminal Briefing.
//
// Aesthetic: power-user ops console. JetBrains Mono throughout. Dense layout.
// Color-coded status pips. Reads like a CLI dashboard. Higher information
// density than V1/V2 — every row is one glance, every column-of-data is
// tight. Hanken Grotesk only used for the preview snippet.

import { useEffect, useState } from 'react'
import { useCornerNav } from '../../CornerContext.jsx'
import useHomeData, { timeISOToFull } from './useHomeData.js'

function clock() {
  const d = new Date()
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

function statusGlyph(state) {
  const s = (state || '').toUpperCase()
  if (s === 'IDLE') return '○'
  if (s === 'WORKING' || s === 'BUSY' || s === 'ACTIVE') return '●'
  if (s === 'BLOCKED') return '✕'
  if (s === 'SHIPPED' || s === 'DONE') return '✓'
  return '◐'
}

function statusClass(state) {
  const s = (state || '').toUpperCase()
  if (s === 'IDLE') return 'idle'
  if (s === 'WORKING' || s === 'ACTIVE' || s === 'BUSY') return 'active'
  if (s === 'BLOCKED') return 'blocked'
  if (s === 'SHIPPED' || s === 'DONE') return 'shipped'
  return 'quiet'
}

function Line({ glyph, glyphClass, slug, time, preview, onClick, kind }) {
  return (
    <button className="v3-line" data-kind={kind} onClick={onClick}>
      <span className="v3-line__glyph">
        <span className={`v3-glyph v3-glyph--${glyphClass}`}>{glyph}</span>
      </span>
      <span className="v3-line__slug">{slug}</span>
      <span className="v3-line__dot">·</span>
      <span className="v3-line__time">{time || '——'}</span>
      {preview && <span className="v3-line__preview">{preview}</span>}
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

  return (
    <div className="cv4-home v3" data-testid="cv4-home-v3">
      <div className="v3__inner">
        {/* Status line */}
        <header className="v3__statusline">
          <span className="v3__statusline-bracket">[</span>
          <span className="v3__statusline-time">{now}</span>
          <span className="v3__statusline-bracket">]</span>
          <span className="v3__statusline-world">{data.worldId || 'aom'}</span>
          <span className="v3__statusline-sep">»</span>
          <span className="v3__statusline-route">home</span>
          <span className="v3__statusline-cursor">▌</span>
        </header>

        <div className="v3__greet">
          // {data.greeting.toLowerCase().replace(',', ',')}
        </div>

        {/* Agents */}
        <section className="v3__block">
          <div className="v3__block-bar">
            <span className="v3__block-tick">┌──</span>
            <span className="v3__block-label">AGENTS</span>
            <span className="v3__block-count">[{data.agents.length}]</span>
            <span className="v3__block-fill" />
          </div>
          <div className="v3__lines">
            {data.agents.map((a) => (
              <Line
                key={a.slug}
                kind="agent"
                glyph={statusGlyph(a.state)}
                glyphClass={statusClass(a.state)}
                slug={a.slug}
                time={a.lastTimeShort}
                preview={a.lastText}
                onClick={() => openAgent(a)}
              />
            ))}
          </div>
        </section>

        {/* Pinned */}
        {data.pinned.length > 0 && (
          <section className="v3__block">
            <div className="v3__block-bar">
              <span className="v3__block-tick">┌──</span>
              <span className="v3__block-label">PINNED</span>
              <span className="v3__block-count">[{data.pinned.length}]</span>
              <span className="v3__block-fill" />
            </div>
            <div className="v3__lines">
              {data.pinned.map((p) => (
                <Line
                  key={p.key}
                  kind={p.kind}
                  glyph="★"
                  glyphClass="pinned"
                  slug={p.slug}
                  time={p.tsShort}
                  preview={p.preview}
                  onClick={() => p.kind === 'agent' ? openAgent(p.data) : openProject(p.data)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        <section className="v3__block">
          <div className="v3__block-bar">
            <span className="v3__block-tick">┌──</span>
            <span className="v3__block-label">PROJECTS</span>
            <span className="v3__block-count">[{data.activeProjects.length}]</span>
            <span className="v3__block-fill" />
          </div>
          <div className="v3__lines">
            {data.activeProjects.map((p) => (
              <Line
                key={p.key}
                kind="project"
                glyph={statusGlyph(p.status)}
                glyphClass={statusClass(p.status)}
                slug={p.slug}
                time={p.tsShort}
                preview={p.preview}
                onClick={() => openProject(p.data)}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="v3__footer">
          <span className="v3__footer-key">/</span>
          <span> search</span>
          <span className="v3__footer-sep">·</span>
          <span className="v3__footer-key">e</span>
          <span> archived</span>
          <span className="v3__footer-sep">·</span>
          <span className="v3__footer-key">↵</span>
          <span> open</span>
        </footer>
      </div>
    </div>
  )
}
