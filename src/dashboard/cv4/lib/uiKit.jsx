// uiKit.jsx — the shared visual vocabulary for CV4 (corner:support-desk M16-R3).
//
// One object, one identity, everywhere. Before this module, a project was a
// folder icon in the Explorer but a bare bold-text row on Home; a mission was
// a doc icon in the tree but a dot-only row on Home; and the status dots spoke
// three dialects (Explorer amber = unread, Home amber = queued, task rows
// purple = waiting). Patrik 2026-06-09: "theres a lack of consistency among
// icons and even ux between folders and missions."
//
// The vocabulary:
//   FolderIcon  — a project, anywhere it appears.
//   MissionIcon — a mission (doc), anywhere it appears.
//   StatusDot   — ONE semantic scale, everywhere:
//       running   green, breathing — an agent is actively working
//       attention amber, glowing   — something waits on the user (unread,
//                                    needs input, ready to send)
//       idle      neutral          — nothing happening, nothing owed
//     Nothing else. "Queued" is not the user's problem, so it reads idle.

export const DOT = {
  running: '#10B981',
  attention: '#F59E0B',
  idle: 'rgba(140,155,175,0.35)',
}

let dotCssInjected = false
function ensureDotCss() {
  if (dotCssInjected || typeof document === 'undefined') return
  dotCssInjected = true
  const el = document.createElement('style')
  el.textContent = '@keyframes uikit-breathe { 0%,100%{opacity:1} 50%{opacity:.4} }'
  document.head.appendChild(el)
}

export function StatusDot({ state = 'idle', size = 7, title }) {
  ensureDotCss()
  const bg = DOT[state] || DOT.idle
  return (
    <span
      title={title}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: bg,
        boxShadow: state === 'attention' ? '0 0 0 2px rgba(245,158,11,0.20)' : 'none',
        animation: state === 'running' ? 'uikit-breathe 2s ease-in-out infinite' : 'none',
        display: 'inline-block',
      }}
    />
  )
}

export function FolderIcon({ open = false, size = 14, color = 'currentColor' }) {
  if (open) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z"/>
        <path d="M3 10h18l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  )
}

export function MissionIcon({ size = 12, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}
