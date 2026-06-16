// CV6Gallery.jsx — corner:corner-ui-cv6. The /cv6 COMPONENT GALLERY.
//
// One navigable page that renders the REAL Corner app components (the same
// files /dashboard runs), each shown in every state, on one surface. This is
// the design surface for the CV6 redesign: restyle a piece here and the app
// inherits it, because the gallery imports the live component — it does not
// copy it.
//
// Step one (2026-06-16): the page itself + one real piece (the Skills button)
// so we have a live surface to look at. Adding the rest = appending entries to
// REGISTRY below. Nothing else changes.

import { useState } from 'react'

// ── Real CV4 components (the same files the live app renders) ──
import SkillsBadge from './cv4/SkillsBadge.jsx'

// ── The component registry. One entry per real piece. ──
// Each entry: an id, a display name, what it's for, and the states to show.
// A "state" is just the real component rendered with a given set of props.
const REGISTRY = [
  {
    id: 'skills-badge',
    name: 'Skills button',
    purpose: 'Left-rail button that opens the Skills shelf. Lives on the dark drawer.',
    canvasBg: '#0E1621',
    // stageWidth = how wide the canvas plate is. frame = the component's real
    // width in the app (the rail is ~264), so it renders believably, not tiny.
    stageWidth: 520,
    frame: 264,
    states: [
      { label: 'Resting', render: () => <SkillsBadge open={false} onToggle={() => {}} /> },
      { label: 'Open', render: () => <SkillsBadge open={true} onToggle={() => {}} /> },
    ],
  },
]

const SHELL = {
  bg: '#0A0F14',
  panel: '#121A22',
  line: 'rgba(255,255,255,0.08)',
  text: '#E8EBEF',
  text2: '#9AA4B0',
  text3: '#5E6975',
  accent: '#10B981',
  mono: "'JetBrains Mono', ui-monospace, monospace",
  sans: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
}

export default function CV6Gallery() {
  const [activeId, setActiveId] = useState(REGISTRY[0].id)
  const active = REGISTRY.find((c) => c.id === activeId) || REGISTRY[0]

  return (
    <div
      data-cv6
      style={{
        minHeight: '100vh',
        background: SHELL.bg,
        color: SHELL.text,
        fontFamily: SHELL.sans,
        display: 'flex',
      }}
    >
      {/* ── Left nav: every piece in the app ── */}
      <aside
        style={{
          width: 248,
          flexShrink: 0,
          borderRight: `1px solid ${SHELL.line}`,
          padding: '22px 16px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: SHELL.accent,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
            CV6 Gallery
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: SHELL.text3,
            fontFamily: SHELL.mono,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 20,
            paddingLeft: 16,
          }}
        >
          {REGISTRY.length} {REGISTRY.length === 1 ? 'piece' : 'pieces'}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {REGISTRY.map((c) => {
            const on = c.id === activeId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid transparent',
                  background: on ? 'rgba(16,185,129,0.10)' : 'transparent',
                  borderColor: on ? 'rgba(16,185,129,0.30)' : 'transparent',
                  color: on ? SHELL.text : SHELL.text2,
                  fontSize: 13,
                  fontWeight: on ? 600 : 500,
                  cursor: 'pointer',
                  fontFamily: SHELL.sans,
                }}
              >
                {c.name}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Main stage: the selected piece in all its states ── */}
      <main style={{ flex: 1, padding: '40px 48px', maxWidth: 1100 }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: '0 0 6px',
            }}
          >
            {active.name}
          </h1>
          <p style={{ fontSize: 14, color: SHELL.text2, margin: 0, maxWidth: 620 }}>
            {active.purpose}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {active.states.map((s) => (
            <div
              key={s.label}
              style={{
                border: `1px solid ${SHELL.line}`,
                borderRadius: 14,
                overflow: 'hidden',
                background: SHELL.panel,
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: `1px solid ${SHELL.line}`,
                  fontSize: 11,
                  fontFamily: SHELL.mono,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: SHELL.text3,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  padding: 24,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {/* Defined canvas plate: the component sits on a tightly-sized,
                    centered stage (its home dark surface) rather than swimming
                    in the full panel width. */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: active.stageWidth || 560,
                    background: active.canvasBg || 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    padding: '40px 32px',
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight: 120,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ width: '100%', maxWidth: active.frame || 'none' }}>
                    {s.render()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
