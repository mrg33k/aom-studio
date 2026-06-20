import React from 'react';

const COLORS = {
  online: 'var(--status-online)',
  working: 'var(--status-working)',
  attention: 'var(--status-attention)',
  idle: 'var(--status-idle)',
};

/** Small round presence indicator. `online` carries a soft glow by default. */
export function StatusDot({ status = 'online', size = 9, glow = null, style = {} }) {
  const showGlow = glow == null ? status === 'online' : glow;
  return (
    <span style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: COLORS[status] || COLORS.idle,
      boxShadow: showGlow ? 'var(--glow-online)' : 'none',
      flex: 'none',
      ...style,
    }} />
  );
}
