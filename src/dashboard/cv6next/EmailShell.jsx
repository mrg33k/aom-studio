// EmailShell — the Email tool (corner:campaign-tool R6).
// Support was renamed Email (label only — id/route stay 'support' so deep
// links and downstream keys never re-key, same precedent as Files/organize).
// One slim segmented control flips between:
//   Inbox    — the existing Support surface, passed in untouched as `inbox`
//   Campaign — the campaign mission-control tool
// Tab choice sticks per session so a phone check-in lands where you left off.
import React, { useState, useEffect, useCallback } from 'react';
import Campaign from './Campaign.jsx';
import { useWorldId } from '../lib/tenantContext.jsx';
import { authFetch } from '../lib/authFetch';

const TAB_KEY = 'cv6-email-tab';

// The honest auto-reply switch (corner:one-corner drop 3, Patrik 2026-07-20):
// the support pipeline can answer easy mail and send holding notes on its own.
// This strip says whether that is ON, and flips it. Truth = file_state (what is
// actually live on disk, pushed up by the watcher every minute); a just-flipped
// switch shows "applying" until the watcher confirms. Fail-quiet: if the state
// can't be read, the strip says so instead of guessing.
function AutoReplyStrip({ isDesktop }) {
  const [state, setState] = useState(null); // { control, file_state } | 'error'
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    authFetch('/api/dashboard/support-autoreply?world=aom')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d || 'error'))
      .catch(() => setState('error'));
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  if (state === null) return null;
  if (state === 'error') {
    return (
      <div className="cv6-autoreply-strip" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isDesktop ? '7px 24px' : '7px 14px', borderBottom: '1px solid var(--divider)', fontSize: 12, color: 'var(--faint)' }}>
        Auto reply status unavailable right now.
      </div>
    );
  }
  const fs = state.file_state || {};
  const on = fs.mode === 'live' || fs.mode === 'test';
  const answering = fs.answer_mode === 'send';
  const pending = !!state.control;
  // Never invent a configuration from this screen (xhigh finding 1): 'off' only
  // requests mode off (remembering what was on); 'restore' brings back exactly
  // the remembered state. A pending request is cancellable, not a lock (finding 2).
  const post = async (action) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await authFetch('/api/dashboard/support-autoreply?world=aom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      if (r && r.ok) setState(await r.json());
    } finally { setBusy(false); }
  };
  const flip = () => post(on ? 'off' : 'restore');
  const cancel = () => post('clear');
  const label = !fs.mode
    ? 'Auto reply state not reported yet — it syncs within a minute.'
    : on
      ? `Auto reply is ON${fs.mode === 'test' ? ' (test senders only)' : ''}: ${answering ? 'easy mail is answered automatically' : 'replies are drafted, never sent'}${fs.threshold_min ? `, holding note after ${fs.threshold_min} min` : ''}.`
      : 'Auto reply is OFF: nothing sends without you.';
  return (
    <div className="cv6-autoreply-strip" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isDesktop ? '7px 24px' : '7px 14px', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: on ? 'var(--success)' : 'var(--faint)' }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}{pending ? ' Applying your change…' : ''}
      </span>
      {pending ? (
        <button onClick={cancel} disabled={busy}
          style={{ height: 26, padding: '0 12px', borderRadius: 13, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, flex: 'none' }}>
          Cancel change
        </button>
      ) : fs.mode ? (
        <button onClick={flip} disabled={busy}
          style={{ height: 26, padding: '0 12px', borderRadius: 13, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: on ? 'var(--error)' : 'var(--success)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, flex: 'none' }}>
          {on ? 'Turn off' : 'Turn back on'}
        </button>
      ) : null}
    </div>
  );
}

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

  const stripOn = tab === 'inbox' && worldId === 'aom';
  return (
    <div className="cv6-email-shell" data-email-tab={tab} data-autoreply={stripOn ? '1' : undefined} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', flex: 1, position: 'relative' }}>
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
        // Headers are fully transparent in every theme (Patrik 2026-07-20): the
        // one fixed wallpaper shows through — never a locally repainted ground.
        background: 'transparent',
      }}>
        <div style={{
          display: 'inline-flex', gap: 2, padding: 3, borderRadius: 19,
          border: '1px solid var(--hair)', background: 'var(--surface)',
        }}>
          {seg('inbox', 'Inbox')}
          {seg('campaign', 'Campaign')}
        </div>
      </div>
      {stripOn ? <AutoReplyStrip isDesktop={isDesktop} /> : null}
      <div className="cv6-email-body" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'inbox'
          ? inbox
          : <Campaign isDesktop={isDesktop} worldId={worldId} onOpenInbox={() => setTab('inbox')} />}
      </div>
    </div>
  );
}
