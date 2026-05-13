// CV4 Drawer — left sidebar / file browser.
//
// Two render modes:
//  - overlay (mobile/tablet): position:fixed slide-in with backdrop
//  - docked  (desktop):       inline flex column, part of the layout
//
// R6.1 / R6.3 = projects+missions tree as a file browser.
// R6.6 (2026-05-13) = docked mode so the sidebar is always-on at >=1024px.

import { useEffect, useMemo, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import missionsData from '../data/missions.json'

const PANEL_WIDTH = 300

export default function CV4Drawer({
  open,
  onClose,
  docked = false,
  agents = [],
  projectRooms = [],
  selectedAgentSlug,
  selectedProjectSlug,
  onSelectAgent,
  onSelectProject,
  onSelectMission,
  onLogout,
}) {
  useEffect(() => {
    if (docked || !open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, docked])

  const missionsByProject = useMemo(() => {
    const map = new Map()
    for (const m of (missionsData.missions || [])) {
      if (!m.projectSlug) continue
      const list = map.get(m.projectSlug) || []
      list.push(m)
      map.set(m.projectSlug, list)
    }
    for (const list of map.values()) list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return map
  }, [])

  const [expanded, setExpanded] = useState(() => new Set(selectedProjectSlug ? [selectedProjectSlug] : []))
  useEffect(() => {
    if (selectedProjectSlug && !expanded.has(selectedProjectSlug)) {
      setExpanded(prev => new Set(prev).add(selectedProjectSlug))
    }
  }, [selectedProjectSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (slug) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug); else next.add(slug)
      return next
    })
  }

  const sharedStyles = (
    <style>{`
      @keyframes cv4DrawerFade { from { opacity: 0 } to { opacity: 1 } }
      [data-cv4-drawer] [data-row]:hover { background: rgba(255,255,255,0.035); }
      [data-cv4-drawer] [data-row][data-active="true"] { background: rgba(16,185,129,0.08); }
      [data-cv4-drawer] [data-row][data-active="true"]::before {
        content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 2px;
        background: ${C.accent}; border-radius: 0 2px 2px 0;
      }
      [data-cv4-drawer] [data-row] { position: relative; }
    `}</style>
  )

  const body = (
    <DrawerBody
      projectRooms={projectRooms}
      missionsByProject={missionsByProject}
      expanded={expanded}
      toggle={toggle}
      selectedProjectSlug={selectedProjectSlug}
      selectedAgentSlug={selectedAgentSlug}
      agents={agents}
      onSelectAgent={onSelectAgent}
      onSelectProject={onSelectProject}
      onSelectMission={onSelectMission}
      onLogout={onLogout}
      onClose={docked ? () => {} : onClose}
    />
  )

  if (docked) {
    return (
      <aside
        data-cv4-drawer
        data-cv4-drawer-docked="true"
        data-testid="cv4-drawer"
        style={{
          width: PANEL_WIDTH, flexShrink: 0,
          background: C.bg,
          borderRight: '1px solid ' + C.border,
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter', sans-serif",
          overflow: 'hidden',
        }}
      >
        {sharedStyles}
        <div style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid ' + C.border,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.dim,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Explorer
          </span>
        </div>
        {body}
      </aside>
    )
  }

  return (
    <>
      {sharedStyles}

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

      <aside
        data-cv4-drawer
        data-testid="cv4-drawer"
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: PANEL_WIDTH, maxWidth: '85vw',
          zIndex: 221,
          background: C.bg,
          borderRight: '1px solid ' + C.border,
          boxShadow: open ? '6px 0 24px rgba(0,0,0,0.4)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s cubic-bezier(.2,.8,.2,1)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px 10px',
          borderBottom: '1px solid ' + C.border,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.dim,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Explorer
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, lineHeight: 1,
            }}
          >×</button>
        </div>
        {body}
      </aside>
    </>
  )
}

function DrawerBody({
  projectRooms,
  missionsByProject,
  expanded,
  toggle,
  selectedProjectSlug,
  selectedAgentSlug,
  agents,
  onSelectAgent,
  onSelectProject,
  onSelectMission,
  onLogout,
  onClose,
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
      <TreeSection title="Projects">
        {projectRooms.length === 0 ? (
          <Empty label="No projects" />
        ) : (
          projectRooms.map(p => {
            const missions = missionsByProject.get(p.slug) || []
            const isExpanded = expanded.has(p.slug)
            const hasMissions = missions.length > 0
            return (
              <div key={p.slug}>
                <FolderRow
                  label={p.name}
                  hasChildren={hasMissions}
                  expanded={isExpanded}
                  active={selectedProjectSlug === p.slug}
                  onToggle={() => toggle(p.slug)}
                  onOpen={() => { onSelectProject?.(p); onClose() }}
                />
                {isExpanded && hasMissions && (
                  <div>
                    {missions.map(m => (
                      <MissionRow
                        key={`${p.slug}-${m.slug}`}
                        mission={m}
                        project={p}
                        onClick={() => {
                          onSelectMission?.(m, p)
                          onClose()
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </TreeSection>

      <TreeSection title="Agents">
        {agents.length === 0 ? (
          <Empty label="No agents" />
        ) : (
          agents.map(a => (
            <AgentRow
              key={a.slug}
              agent={a}
              active={selectedAgentSlug === a.slug}
              onClick={() => { onSelectAgent?.(a); onClose() }}
            />
          ))
        )}
      </TreeSection>

      <TreeSection title="Account">
        <PlainRow icon={<SignOutIcon />} label="Sign out" onClick={() => { onLogout?.(); onClose() }} />
      </TreeSection>
    </div>
  )
}

function TreeSection({ title, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        padding: '8px 14px 4px',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: C.dim,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

function FolderRow({ label, hasChildren, expanded, active, onToggle, onOpen }) {
  return (
    <div
      data-row
      data-active={active ? 'true' : 'false'}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 10px 4px 8px',
        cursor: 'pointer',
      }}
      onClick={onOpen}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle() }}
        aria-label={hasChildren ? (expanded ? 'Collapse' : 'Expand') : undefined}
        style={{
          width: 16, height: 16, padding: 0,
          background: 'none', border: 'none',
          cursor: hasChildren ? 'pointer' : 'default',
          color: C.muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          opacity: hasChildren ? 1 : 0.25,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.12s' }}>
          <polyline points="9 6 15 12 9 18"/>
        </svg>
      </button>
      <FolderIcon open={expanded} />
      <span style={{
        fontSize: 13, fontWeight: 500, color: active ? C.text : C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1,
      }}>{label}</span>
    </div>
  )
}

function MissionRow({ mission, onClick }) {
  return (
    <div
      data-row
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 10px 3px 36px',
        cursor: 'pointer',
      }}
    >
      <DocIcon />
      <span style={{
        fontSize: 12, fontWeight: 500, color: C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1,
      }}>{mission.name}</span>
      {mission.status && mission.status !== 'in-progress' && (
        <span style={{
          fontSize: 9, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: C.muted, fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}>{mission.status}</span>
      )}
    </div>
  )
}

function AgentRow({ agent, active, onClick }) {
  return (
    <div
      data-row
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 14px',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: C.muted,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {(agent.name || '?')[0].toUpperCase()}
      </div>
      <span style={{
        fontSize: 13, fontWeight: 500, color: active ? C.text : C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1,
      }}>{agent.name}</span>
    </div>
  )
}

function PlainRow({ icon, label, onClick }) {
  return (
    <div
      data-row
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 14px',
        cursor: 'pointer',
        color: C.muted,
      }}
    >
      {icon}
      <span style={{ fontSize: 13, fontWeight: 500, color: C.text2 }}>{label}</span>
    </div>
  )
}

function Empty({ label }) {
  return (
    <div style={{
      padding: '4px 14px 8px 30px',
      fontSize: 11, color: C.muted,
      fontStyle: 'italic',
    }}>{label}</div>
  )
}

function FolderIcon({ open }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.muted, flexShrink: 0 }}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z"/>
        <path d="M3 10h18l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.muted, flexShrink: 0 }}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.muted, flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
