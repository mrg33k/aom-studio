import React from 'react';

/**
 * A chat message. `from="agent"` renders the labelled left-aligned style
 * (avatar chip + name + time over body text); `from="me"` is the right-aligned
 * accent bubble with the tucked corner.
 */
export function MessageBubble({ from = 'agent', author, initials, time, children, style = {} }) {
  if (from === 'me') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6, ...style }}>
        <div style={{
          maxWidth: '80%',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 13.5,
          lineHeight: 1.5,
          padding: '10px 13px',
          borderRadius: '16px 16px 4px 16px',
        }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--success-weak)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flex: 'none' }}>{initials}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{author}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }}>{time}</span>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--fg)' }}>{children}</div>
    </div>
  );
}
