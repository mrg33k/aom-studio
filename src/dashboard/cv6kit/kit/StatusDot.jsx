import React from 'react';

// Ported verbatim from the CV6 design system (components/rooms/StatusDot.jsx).
// Do not restyle here — this IS the design's piece. Change the design, re-sync.

const COLORS = {
  online: 'var(--status-online)',
  working: 'var(--status-working)',
  attention: 'var(--status-attention)',
  ready: 'var(--status-ready)',
};

/** Small round presence indicator. `online` carries a soft glow by default. */
export function StatusDot({ status = 'online', size = 9, glow = null, style = {} }) {
  const showGlow = glow == null ? status === 'online' : glow;
  return (
    <span style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: COLORS[status] || COLORS.ready,
      boxShadow: showGlow ? 'var(--glow-online)' : 'none',
      flex: 'none',
      ...style,
    }} />
  );
}

export default StatusDot;
