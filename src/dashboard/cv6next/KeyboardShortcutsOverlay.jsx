import React, { useEffect, useState } from 'react';

const SHORTCUTS = [
  { keys: ['Cmd', 'K'], desc: 'Search rooms and missions' },
  { keys: ['?'], desc: 'Show keyboard shortcuts' },
  { keys: ['Esc'], desc: 'Close overlay / Go back' },
  { keys: ['↑'], desc: 'Previous room' },
  { keys: ['↓'], desc: 'Next room' },
  { keys: ['→'], desc: 'Open room' },
  { keys: ['←'], desc: 'Close folder / Go back' },
  { keys: ['Enter'], desc: 'Send message' },
];

export default function KeyboardShortcutsOverlay({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' || e.key === '?') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(440px, 92%)', background: 'var(--surface, #161b24)', border: '1px solid var(--hair, #222)', borderRadius: 16, boxShadow: '0 30px 80px -20px rgba(0,0,0,.6)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--divider, #1f2937)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg, #e5e7eb)' }}>Keyboard shortcuts</div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--surface-2, #1e2533)', color: 'var(--muted, #8b95a3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ padding: '12px 20px 20px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', alignItems: 'center' }}>
          {SHORTCUTS.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.keys.map((k, j) => (
                  <kbd key={j} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 26, padding: '0 7px', borderRadius: 6, background: 'var(--surface-2, #1e2533)', border: '1px solid var(--hair, #222)', color: 'var(--fg, #e5e7eb)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans, system-ui)' }}>
                    {k === 'Cmd' ? (navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl') : k}
                  </kbd>
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted, #8b95a3)' }}>{s.desc}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
