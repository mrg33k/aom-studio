import React from 'react';
import { ToolTile } from './ToolTile.jsx';
import { Avatar } from '../core/Avatar.jsx';

/**
 * Mobile Discord-style side menu (72px). Profile avatar is the menu button at
 * the top; navigation fills the middle evenly; utilities (search / theme /
 * alerts) stack at the bottom. The right edge carries the active indicator pill.
 *
 * `items` = [{ key, label, icon }]; `active` matches a key.
 */
export function SideRail({ items = [], active, onSelect, onMenu, utilities = ['search', 'theme', 'alerts'], style = {} }) {
  const Divider = () => (
    <span style={{ width: 40, height: 1.5, borderRadius: 1, background: 'rgba(255,255,255,.28)', flex: 'none' }} />
  );

  const util = {
    search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
    theme: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 3a9 9 0 1 0 9 9c-5 0-9-4-9-9Z" /></svg>,
    alerts: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  };

  return (
    <div style={{
      height: '100%', width: 72,
      background: 'var(--nav, rgba(12,12,14,.82))',
      backdropFilter: 'blur(20px) saturate(1.2)', WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      borderLeft: '1px solid var(--divider)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '15px 0 16px',
      ...style,
    }}>
      <div onClick={onMenu} title="Menu" aria-label="Toggle menu" style={{ cursor: 'pointer', flex: 'none', width: 44, height: 44, borderRadius: 14, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
      </div>
      <span style={{ marginTop: 15 }}><Divider /></span>

      <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '6px 0' }}>
        {items.map((it) => (
          <div key={it.key} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            {active === it.key && (
              <span style={{ position: 'absolute', right: 0, top: 19, transform: 'translateY(-50%)', width: 4, height: 24, borderRadius: '4px 0 0 4px', background: 'var(--fg)' }} />
            )}
            <ToolTile layout="rail" icon={it.icon} label={it.label} active={active === it.key} onClick={() => onSelect && onSelect(it.key)} />
          </div>
        ))}
      </div>

      <Divider />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 14, flex: 'none' }}>
        {utilities.map((u) => (
          <div key={u} title={u} style={{ position: 'relative', width: 38, height: 38, borderRadius: 19, background: 'var(--surface-2, rgba(255,255,255,.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)', cursor: 'pointer' }}>
            {util[u]}
            {u === 'alerts' && <span style={{ position: 'absolute', top: 7, right: 9, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid var(--ground)' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
