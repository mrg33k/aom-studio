// CV4 mission attachment chip — shown above the composer pill when the
// user clicks a mission in the file-browser drawer. Carries enough
// context (path + name) to route the next message at that mission.
//
// R6.2 (2026-05-13).

import { C } from '../lib/cv3Colors.js'

export default function MissionChip({ mission, onClear }) {
  if (!mission) return null
  return (
    <div
      data-testid="cv4-mission-chip"
      style={{
        maxWidth: 612,
        margin: '0 auto 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px 6px 12px',
        borderRadius: 10,
        background: 'rgba(167,139,250,0.10)',
        border: '1px solid rgba(167,139,250,0.30)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <span style={{
        flex: 1,
        display: 'flex', alignItems: 'baseline', gap: 6,
        minWidth: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: '#C4B5FD',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>Mission</span>
        <span style={{
          fontSize: 12, fontWeight: 500, color: C.text2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{mission.name}</span>
        <span style={{
          fontSize: 11, color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
        }}>· {mission.path}</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        title="Detach mission"
        style={{
          width: 20, height: 20,
          background: 'none', border: 'none',
          borderRadius: '50%',
          color: C.muted,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
        }}
      >×</button>
    </div>
  )
}
