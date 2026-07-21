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
  const [actionError, setActionError] = useState('');
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
      <div className="cv6-autoreply-strip is-unavailable" data-layout={isDesktop ? 'desktop' : 'mobile'}>
        <span className="cv6-autoreply-status" data-tone="quiet"><i /> Status unavailable</span>
        <span className="cv6-autoreply-copy">Auto reply could not be checked right now.</span>
      </div>
    );
  }
  const fs = state.file_state || {};
  const on = fs.mode === 'live' || fs.mode === 'test';
  const answering = fs.answer_mode === 'send';
  const pending = !!state.control;
  const syncedAt = fs.synced_at ? new Date(fs.synced_at).getTime() : 0;
  const syncAgeMs = syncedAt ? Math.max(0, Date.now() - syncedAt) : null;
  const stale = syncAgeMs == null || syncAgeMs > 3 * 60 * 1000;
  const relativeSync = syncAgeMs == null
    ? 'Waiting for watcher'
    : syncAgeMs < 60 * 1000
      ? 'Watcher checked just now'
      : syncAgeMs < 60 * 60 * 1000
        ? `Watcher checked ${Math.max(1, Math.round(syncAgeMs / 60000))}m ago`
        : `Watcher checked ${Math.round(syncAgeMs / 3600000)}h ago`;
  const policyLabel = !fs.mode ? 'Syncing' : !on ? 'Off' : answering ? (fs.mode === 'test' ? 'Test' : 'Live') : 'Draft only';
  // Never invent a configuration from this screen (xhigh finding 1): 'off' only
  // requests mode off (remembering what was on); 'restore' brings back exactly
  // the remembered state. A pending request is cancellable, not a lock (finding 2).
  const post = async (action) => {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      const r = await authFetch('/api/dashboard/support-autoreply?world=aom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const d = r ? await r.json().catch(() => null) : null;
      if (r && r.ok && d) setState(d);
      else setActionError(d?.error || 'That change did not apply. Try again.');
    } catch {
      setActionError('That change did not apply. Try again.');
    } finally { setBusy(false); }
  };
  const flip = () => post(on ? 'off' : 'restore');
  const cancel = () => post('clear');
  const label = !fs.mode
    ? 'Policy state has not been reported yet.'
    : on
      ? `${answering ? 'Easy mail can send automatically' : 'Replies are drafted, never sent'}${fs.threshold_min ? ` · holding note after ${fs.threshold_min} min` : ''}`
      : 'Nothing sends without you.';
  return (
    <div className="cv6-autoreply-strip" data-layout={isDesktop ? 'desktop' : 'mobile'} aria-live="polite">
      <div className="cv6-autoreply-primary">
        <span className="cv6-autoreply-status" data-tone={on && !stale ? 'live' : stale ? 'stale' : 'quiet'}>
          <i /> {policyLabel}
        </span>
        {pending ? (
          <button type="button" className="cv6-autoreply-action" data-tone="quiet" onClick={cancel} disabled={busy}>
            Cancel
          </button>
        ) : fs.mode && (on || state.can_restore) ? (
          <button type="button" className="cv6-autoreply-action" data-tone={on ? 'danger' : 'success'} onClick={flip} disabled={busy || (!on && stale)} title={!on && stale ? 'Wait for a fresh watcher check before restoring automation' : undefined}>
            {on ? 'Pause' : 'Restore'}
          </button>
        ) : fs.mode && !on ? <span className="cv6-autoreply-no-restore">No saved mode</span> : null}
      </div>
      <span className="cv6-autoreply-copy">
        <strong>{label}</strong>
        <span data-stale={stale ? '1' : undefined}>{relativeSync}{stale ? ' · may be stale' : ''}</span>
        {pending ? <span data-state="pending">Applying your change…</span> : null}
        {actionError ? <span data-state="error">{actionError}</span> : null}
      </span>
    </div>
  );
}

function AutoReplySettings() {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ busy: false, message: '', error: false });
  const load = useCallback(() => {
    authFetch('/api/dashboard/support-autoreply?world=aom')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const fs = data?.file_state;
        if (!fs) return;
        setForm({ mode: fs.mode || 'off', answer_mode: fs.answer_mode || 'off', threshold_min: fs.threshold_min || 8, tone: fs.tone || 'warm and direct', instructions: fs.instructions || '', sign_off: fs.sign_off || 'Cheers,' });
      }).catch(() => setStatus({ busy: false, message: 'Auto-reply settings could not be loaded.', error: true }));
  }, []);
  useEffect(() => { load(); }, [load]);
  const set = (key, value) => setForm((current) => ({ ...(current || {}), [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    if (!form || status.busy) return;
    setStatus({ busy: true, message: '', error: false });
    try {
      const response = await authFetch('/api/dashboard/support-autoreply?world=aom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', ...form, threshold_min: Number(form.threshold_min) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Settings did not save.');
      setStatus({ busy: false, message: 'Saved. The mail watcher is applying this policy now.', error: false });
    } catch (error) { setStatus({ busy: false, message: error?.message || 'Settings did not save.', error: true }); }
  };
  if (!form) return <div className="cv6-autoreply-settings"><div className="room-settings-note">{status.message || 'Loading the live auto-reply policy…'}</div></div>;
  return (
    <form className="cv6-autoreply-settings" onSubmit={save}>
      <div className="cv6-autoreply-settings-head"><div><span className="eyebrow">Auto-reply policy</span><h2>Control the reply vibe and safety ceiling.</h2><p>Changes are applied by the mail watcher. High-stakes messages still stay drafts.</p></div><button type="submit" className="room-settings-primary" disabled={status.busy}>{status.busy ? 'Saving…' : 'Save policy'}</button></div>
      <div className="cv6-autoreply-grid">
        <label><span>Holding notes</span><select value={form.mode} onChange={(event) => set('mode', event.target.value)}><option value="off">Off</option><option value="test">Test senders only</option><option value="live">Live</option></select></label>
        <label><span>Easy answers</span><select value={form.answer_mode} onChange={(event) => set('answer_mode', event.target.value)}><option value="off">Off</option><option value="draft">Draft only</option><option value="send">Send low-stakes answers</option></select></label>
        <label><span>Holding-note delay</span><div className="cv6-autoreply-number"><input type="number" min="2" max="240" value={form.threshold_min} onChange={(event) => set('threshold_min', event.target.value)} /><em>minutes</em></div></label>
        <label><span>Reply vibe</span><input value={form.tone} maxLength={40} onChange={(event) => set('tone', event.target.value)} placeholder="Warm, plain, direct" /></label>
        <label className="is-wide"><span>Instructions</span><textarea value={form.instructions} maxLength={2000} onChange={(event) => set('instructions', event.target.value)} placeholder="What should every automatic reply sound like or avoid?" /></label>
        <label className="is-wide"><span>Sign-off</span><textarea value={form.sign_off} maxLength={300} onChange={(event) => set('sign_off', event.target.value)} placeholder="Cheers," /></label>
      </div>
      {status.message ? <div className={`room-settings-note${status.error ? ' is-error' : ' is-saved'}`}>{status.message}</div> : null}
    </form>
  );
}

export default function EmailShell({ isDesktop, inbox, onBack, onOpenNav, onSearch, forceAutoReply = false }) {
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
      className={`cv6-email-tab${tab === id ? ' is-active' : ''}`}
      aria-current={tab === id ? 'page' : undefined}
    >
      {label}
    </button>
  );

  const stripOn = tab === 'inbox' && (worldId === 'aom' || forceAutoReply);
  return (
    <div className="cv6-email-shell" data-email-tab={tab} data-autoreply={stripOn ? '1' : undefined} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', flex: 1, position: 'relative' }}>
      {!isDesktop && tab !== 'inbox' && (
        <div className="mhdr">
          <button type="button" className="mback" aria-label="Back" onClick={onBack}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="mhtitle"><div className="mttl">Email</div><div className="msub">{tab === 'campaign' ? 'Campaign' : 'Auto-reply'}</div></div>
          <div className="mhactions">
            <button type="button" className="ib" aria-label="Search" onClick={onSearch}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></button>
            <button type="button" className="ib" aria-label="Menu" onClick={onOpenNav}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg></button>
          </div>
        </div>
      )}
      <div className="cv6-email-tabs" data-layout={isDesktop ? 'desktop' : 'mobile'}>
        <div className="cv6-email-tablist" role="navigation" aria-label="Email sections">
          {seg('inbox', 'Inbox')}
          {seg('campaign', 'Campaign')}
          {(worldId === 'aom' || forceAutoReply) ? seg('autoreply', 'Auto-reply') : null}
        </div>
      </div>
      {stripOn ? <AutoReplyStrip isDesktop={isDesktop} /> : null}
      <div className="cv6-email-body" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'inbox'
          ? inbox
          : tab === 'campaign'
            ? <Campaign isDesktop={isDesktop} worldId={worldId} onOpenInbox={() => setTab('inbox')} />
            : <AutoReplySettings />}
      </div>
    </div>
  );
}
