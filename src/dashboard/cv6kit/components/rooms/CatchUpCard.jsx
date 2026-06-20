import React from 'react';

/**
 * A Catch Up card — the unit in the swipe-to-triage deck. Header (project glyph,
 * project → mission, time) over the message body. Sits on the frosted Card surface.
 */
export function CatchUpCard({ project, mission, time, text, glyphColor = 'var(--accent)', style = {} }) {
  return (
    <div
      className="glassy"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--hair)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-deck)',
        padding: '14px 16px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={glyphColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mission}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)', flex: 'none' }}>{time}</div>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)' }}>{text}</div>
    </div>
  );
}
