// V2 — BRIEFING (Editorial + Terminal hybrid, balanced).
//
// Full terminal status bar with brackets + cursor up top. Compact italic
// greeting below. Section bars use Terminal `┌── LABEL [04] ─────` frames
// BUT the label is italic Instrument Serif. Rows are denser than V1
// (Letter). Footer keymap visible.
//
// Reads like a personal CLI dashboard with editorial chrome.

import { useEffect, useState } from 'react'
import { useCornerNav } from '../../CornerContext.jsx'
import useHomeData from './useHomeData.js'

function clock() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function glyph(state, kind) {
  if (kind === 'agent') {
    return (state || '').toUpperCase() === 'IDLE' ? '○' : '●'
  }
  return '◇'
}

function statusTone(state) {
  const s = (state || '').toUpperCase()
  if (s === 'IDLE') return 'idle'
  if (s === 'BLOCKED') return 'blocked'
  if (s === 'SHIPPED' || s === 'DONE') return 'shipped'
  if (s === 'BUILDING' || s === 'ACTIVE' || s === 'WORKING' || s === 'BUSY') return 'active'
  return 'quiet'
}

function SectionBar({ label, count }) {
  return (
    <div className="vB__bar">
      <span className="vB__bar-tick">┌──</span>
      <span className="vB__bar-label"><i>{label}</i></span>
      <span className="vB__bar-count">[{count.toString().padStart(2, '0')}]</span>
      <span className="vB__bar-fill" />
    </div>
  )
}

function Line({ glyphChar, glyphTone, name, time, preview, onClick, kind }) {
  return (
    <button className="vB-line" data-kind={kind} onClick={onClick}>
      <span className={`vB-line__glyph vB-line__glyph--${glyphTone}`}>{glyphChar}</span>
      <span className="vB-line__name">{name}</span>
      <span className="vB-line__dot">·</span>
      <span className="vB-line__time">{time || '——'}</span>
      <span className="vB-line__preview">{preview || ''}</span>
    </button>
  )
}

export default function HomeViewV2() {
  const { handleSelectAgent, handleSelectProject } = useCornerNav()
  const data = useHomeData()
  const [now, setNow] = useState(clock)

  useEffect(() => {
    const id = setInterval(() => setNow(clock()), 1000)
    return () => clearInterval(id)
  }, [])

  const openAgent = (a) => handleSelectAgent(a)
  const openProject = (p) => handleSelectProject(p)

  const parts = data.greeting.split(',')
  const prefix = parts[0] + ','
  const name = (parts[1] || '').trim()

  return (
    <div className="cv4-home vB" data-testid="cv4-home-briefing">
      <div className="vB__inner">
        {/* Status line */}
        <div className="vB__statusline">
          <span className="vB__sl-bracket">[</span>
          <span className="vB__sl-time">{now}</span>
          <span className="vB__sl-bracket">]</span>
          <span className="vB__sl-world">{data.worldId || 'aom'}</span>
          <span className="vB__sl-sep">»</span>
          <span className="vB__sl-route">home</span>
          <span className="vB__sl-cursor">▌</span>
        </div>

        {/* Compact greeting */}
        <header className="vB__hero">
          <h1 className="vB__greeting">
            {prefix} <span className="vB__greeting-name">{name}</span>
          </h1>
          <span className="vB__hero-meta">{data.today}</span>
        </header>

        {/* EA card */}
        {data.eaAgent && (
          <button className="vB__ea" onClick={() => openAgent(data.eaAgent)}>
            <div className="vB__ea-head">
              <span className="vB__ea-from"><i>From {data.eaAgent.name}</i></span>
              <span className="vB__ea-time">{data.eaAgent.lastTimeShort || 'idle'}</span>
            </div>
            <div className="vB__ea-body">{data.eaAgent.lastText || 'Ready when you are.'}</div>
          </button>
        )}

        {/* Pinned block */}
        {data.pinned.length > 0 && (
          <section className="vB__block">
            <SectionBar label="On your desk" count={data.pinned.length} />
            <div className="vB__lines">
              {data.pinned.map((p) => (
                <Line
                  key={p.key}
                  kind={p.kind}
                  glyphChar="★"
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

        {/* Agents block */}
        {data.otherAgents.length > 0 && (
          <section className="vB__block">
            <SectionBar label="Agents" count={data.otherAgents.length} />
            <div className="vB__lines">
              {data.otherAgents.map((a) => (
                <Line
                  key={a.slug}
                  kind="agent"
                  glyphChar={glyph(a.state, 'agent')}
                  glyphTone={statusTone(a.state)}
                  name={a.name}
                  time={a.lastTimeShort}
                  preview={a.lastText}
                  onClick={() => openAgent(a)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Projects block */}
        <section className="vB__block">
          <SectionBar label="Projects" count={data.activeProjects.length} />
          <div className="vB__lines">
            {data.activeProjects.map((p) => (
              <Line
                key={p.key}
                kind="project"
                glyphChar={glyph(p.status, 'project')}
                glyphTone={statusTone(p.status)}
                name={p.name}
                time={p.tsShort}
                preview={p.preview}
                onClick={() => openProject(p.data)}
              />
            ))}
          </div>
        </section>

        <footer className="vB__footer">
          <span className="vB__footer-key">/</span><span>search</span>
          <span className="vB__footer-sep">·</span>
          <span className="vB__footer-key">e</span><span>archived</span>
          <span className="vB__footer-sep">·</span>
          <span className="vB__footer-key">↵</span><span>open</span>
        </footer>
      </div>
    </div>
  )
}
