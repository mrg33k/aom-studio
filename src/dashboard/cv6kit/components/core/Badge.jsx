import React from 'react';

/**
 * Count / status pill. Default is the accent-weak counter used beside section
 * headers ("Catch up · 4"); `tone="solid"` is the white-on-accent unread badge.
 */
export function Badge({ tone = 'weak', children, style = {} }) {
  const tones = {
    weak: { background: 'var(--accent-weak)', color: 'var(--accent)' },
    solid: { background: 'var(--accent)', color: '#fff' },
    chip: { background: 'var(--chip)', color: 'var(--muted)' },
  };
  const t = tones[tone] || tones.weak;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 20,
      height: 20,
      padding: '0 6px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: 'var(--font-sans)',
      ...t,
      ...style,
    }}>
      {children}
    </span>
  );
}
