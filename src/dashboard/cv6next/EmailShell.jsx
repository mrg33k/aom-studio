// EmailShell — the Email tool (corner:campaign-tool R6).
// Support was renamed Email (label only — id/route stay 'support' so deep
// links and downstream keys never re-key, same precedent as Files/organize).
// One slim segmented control flips between:
//   Inbox    — the existing Support surface, passed in untouched as `inbox`
//   Campaign — the campaign mission-control tool
// Tab choice sticks per session so a phone check-in lands where you left off.
import React, { useState } from 'react';
import Campaign from './Campaign.jsx';
import { useWorldId } from '../lib/tenantContext.jsx';

const TAB_KEY = 'cv6-email-tab';

export default function EmailShell({ isDesktop, inbox, onBack, onOpenNav, onSearch }) {
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
    <div className="cv6-email-shell" data-email-tab={tab} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', flex: 1, position: 'relative' }}>
      {!isDesktop && tab === 'campaign' && (
        <div className="mhdr">
          <button type="button" className="mback" aria-label="Back" onClick={onBack}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="mhtitle"><div className="mttl">Email</div><div className="msub">Campaign</div></div>
          <div className="mhactions">
            <button type="button" className="ib" aria-label="Search" onClick={onSearch}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></button>
            <button type="button" className="ib" aria-label="Menu" onClick={onOpenNav}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg></button>
          </div>
        </div>
      )}
      <div className="cv6-email-tabs" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: isDesktop ? '10px 24px 8px' : '7px 14px',
        borderBottom: '1px solid var(--divider)', flexShrink: 0,
        background: 'var(--ground)',
      }}>
        <div style={{
          display: 'inline-flex', gap: 2, padding: 3, borderRadius: 19,
          border: '1px solid var(--hair)', background: 'var(--surface)',
        }}>
          {seg('inbox', 'Inbox')}
          {seg('campaign', 'Campaign')}
        </div>
      </div>
      <div className="cv6-email-body" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'inbox'
          ? inbox
          : <Campaign isDesktop={isDesktop} worldId={worldId} onOpenInbox={() => setTab('inbox')} />}
      </div>
    </div>
  );
}
