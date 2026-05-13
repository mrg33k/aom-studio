// CV4 Drawer — left slide-in panel listing projects + agents + account.
// Triggered by the hamburger button in the top-right corner.
//
// Scoped to /cv4 only. The CV3 theme tokens (cv3Colors) are reused so the
// drawer feels native to the existing aesthetic — this is structural
// reorganization, not a visual redesign.
//
// R5.1 Phase D, 2026-05-13.

import { useEffect } from 'react'
import { C } from '../lib/cv3Colors.js'

const PANEL_WIDTH = 280

export default function CV4Drawer({
  open,
  onClose,
  agents = [],
  projectRooms = [],
  selectedAgentSlug,
  selectedProjectSlug,
  onSelectAgent,
  onSelectProject,
  onLogout,
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <style>{`
        @keyframes cv4DrawerSlide { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @keyframes cv4DrawerFade { from { opacity: 0 } to { opacity: 1 } }
        [data-cv4-drawer] [data-row]:hover { background: rgba(255,255,255,0.04); }
        [data-cv4-drawer] [data-row][data-active="true"] { background: rgba(16,185,129,0.10); }
        [data-cv4-drawer] [data-row][data-active="true"] [data-label] { color: ${C.text}; }
      `}</style>

      {/* Backdrop (click to close) */}
      <div
        data-testid="cv4-drawer-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 220,
          background: 'rgba(0,0,0,0.45)',
          animation: 'cv4DrawerFade 0.15s ease-out',
          pointerEvents: open ? 'auto' : 'none',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.15s ease-out',
        }}
        aria-hidden={!open}
      />

      {/* Slide-in panel */}
      <aside
        data-cv4-drawer
        data-testid="cv4-drawer"
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: PANEL_WIDTH, maxWidth: '85vw',
          zIndex: 221,
          background: C.s1,
          borderRight: '1px solid ' + C.border,
          boxShadow: open ? '6px 0 24px rgba(0,0,0,0.4)' : 'none',
          transform: open ? 'translateX(0)' : `translateX(-100%)`,
          transition: 'transform 0.22s cubic-bezier(.2,.8,.2,1)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 10px',
          borderBottom: '1px solid ' + C.border,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>
            Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {/* Projects */}
          <Section title="Projects" count={projectRooms.length}>
            {projectRooms.length === 0 ? (
              <Empty label="No projects yet" />
            ) : (
              projectRooms.map(p => (
                <Row
                  key={p.slug}
                  active={selectedProjectSlug === p.slug}
                  color={p.color || '#888'}
                  label={p.name}
                  sub={p.slug}
                  onClick={() => { onSelectProject?.(p); onClose() }}
                />
              ))
            )}
          </Section>

          {/* Agents */}
          <Section title="Agents" count={agents.length}>
            {agents.length === 0 ? (
              <Empty label="No agents found" />
            ) : (
              agents.map(a => (
                <Row
                  key={a.slug}
                  active={selectedAgentSlug === a.slug}
                  color={a.color || C.accent}
                  label={a.name}
                  sub={a.role || a.slug}
                  onClick={() => { onSelectAgent?.(a); onClose() }}
                />
              ))
            )}
          </Section>

          {/* Account */}
          <Section title="Account">
            <Row label="Sign out" sub="end session" onClick={() => { onLogout?.(); onClose() }} />
          </Section>
        </div>
      </aside>
    </>
  )
}

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 4px',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: C.dim,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span>{title}</span>
        {typeof count === 'number' && (
          <span style={{ color: C.muted, fontWeight: 600 }}>{count}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

function Row({ active, color, label, sub, onClick }) {
  return (
    <button
      data-row
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px',
        background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left', width: '100%',
        transition: 'background 0.1s',
      }}
    >
      {color !== undefined && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color, flexShrink: 0,
        }} />
      )}
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <span data-label style={{
          fontSize: 13, fontWeight: 600, color: C.text2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</span>
        {sub && (
          <span style={{
            fontSize: 10, fontWeight: 500, color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{sub}</span>
        )}
      </span>
    </button>
  )
}

function Empty({ label }) {
  return (
    <div style={{
      padding: '6px 16px 10px',
      fontSize: 11, color: C.muted,
      fontStyle: 'italic',
    }}>{label}</div>
  )
}
