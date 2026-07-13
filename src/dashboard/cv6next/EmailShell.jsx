// EmailShell — the Email tool (corner:campaign-tool R6).
// Support was renamed Email (label only — id/route stay 'support' so deep
// links and downstream keys never re-key, same precedent as Files/organize).
// One slim segmented control flips between:
//   Inbox    — the existing Support surface, passed in untouched as `inbox`
//   Campaign — the campaign mission-control tool
// Tab choice sticks per session so a phone check-in lands where you left off.
import React, { useState } from 'react';
import Campaign from './Campaign.jsx';
import { useWorldId } from './data/useCommandTracker.js';

const TAB_KEY = 'cv6-email-tab';

export default function EmailShell({ isDesktop, inbox, onOpenNav }) {
  const [tab, setTabState] = useState(() => {
    try { return sessionStorage.getItem(TAB_KEY) || 'inbox'; } catch { return 'inbox'; }
  });
  const setTab = (t) => {
    setTabState(t);
    try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private mode */ }
  };
  const worldId = useWorldId();

  const seg = (id, label) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        height: 32, padding: '0 18px', borderRadius: 16, border: 'none',
        background: tab === id ? 'var(--surface-2)' : 'transparent',
        color: tab === id ? 'var(--fg)' : 'var(--muted)',
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
        cursor: 'pointer', transition: 'background .15s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', flex: 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: isDesktop ? '10px 24px 8px' : 'calc(8px + env(safe-area-inset-top)) 14px 6px',
        borderBottom: '1px solid var(--divider)', flexShrink: 0,
        background: 'var(--ground)',
      }}>
        {!isDesktop && onOpenNav && (
          <button
            onClick={onOpenNav}
            aria-label="Menu"
            style={{
              width: 38, height: 38, borderRadius: 12, border: '1px solid var(--hair)',
              background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        )}
        <div style={{
          display: 'inline-flex', gap: 2, padding: 3, borderRadius: 19,
          border: '1px solid var(--hair)', background: 'var(--surface)',
        }}>
          {seg('inbox', 'Inbox')}
          {seg('campaign', 'Campaign')}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'inbox'
          ? inbox
          : <Campaign isDesktop={isDesktop} worldId={worldId} onOpenInbox={() => setTab('inbox')} />}
      </div>
    </div>
  );
}
