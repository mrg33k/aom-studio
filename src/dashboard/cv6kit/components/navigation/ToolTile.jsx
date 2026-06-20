import React from 'react';

/**
 * A tool entry in the navigation set (Home, Chat, Organize, Review, Support,
 * Tracker, Command, Live Scribe). Two layouts:
 *  - layout="tile"  → desktop tools row: wide rounded tile, icon over label
 *  - layout="rail"  → mobile side rail: compact icon square + tiny label below
 * Active swaps to an accent fill; idle sits on the chip/surface fill.
 */
export function ToolTile({ icon, label, active = false, layout = 'tile', onClick, style = {} }) {
  const stroke = active ? '#fff' : 'var(--muted)';

  if (layout === 'compact') {
    // top-bar nav tile — shrunk icon over a small label, all eight fit in a row
    return (
      <div
        className={active ? undefined : 'glassy'}
        onClick={onClick}
        style={{
          width: 66, flex: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          padding: '8px 0 7px',
          borderRadius: 'var(--radius-control)',
          background: active ? 'var(--accent)' : 'var(--surface)',
          border: active ? '1px solid transparent' : '1px solid var(--hair)',
          color: stroke,
          cursor: 'pointer',
          ...style,
        }}
      >
        {icon}
        <span style={{ fontSize: 10.5, fontWeight: 600, color: active ? '#fff' : 'var(--muted)' }}>{label}</span>
      </div>
    );
  }

  if (layout === 'rail') {
    return (
      <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', ...style }}>
        <div style={{
          width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: active ? 13 : 19,
          background: active ? 'var(--accent)' : 'var(--surface-2, rgba(255,255,255,.12))',
          color: active ? '#fff' : 'var(--fg)',
          transition: 'border-radius var(--dur-move) var(--ease-out), background var(--dur-move) var(--ease-out)',
        }}>{icon}</div>
        <span style={{ fontSize: 9, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--muted)' }}>{label}</span>
      </div>
    );
  }

  return (
    <div
      className={active ? undefined : 'glassy'}
      onClick={onClick}
      style={{
        width: 150, flex: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
        padding: '15px 0',
        borderRadius: 'var(--radius-button)',
        background: active ? 'var(--accent)' : 'var(--surface)',
        color: stroke,
        cursor: 'pointer',
        ...style,
      }}
    >
      {icon}
      <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : 'var(--muted)' }}>{label}</span>
    </div>
  );
}
