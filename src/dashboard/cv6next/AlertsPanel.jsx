// AlertsPanel — what the bell opens (Patrik 2026-08-06).
//
// Two switches, both about "tell me when someone messages me": the sound this tab
// makes, and notifications on a phone that is not looking at the dashboard.
//
// The honest part is the iPhone case. Safari only grants push to a site saved to the
// home screen, so on an iPhone in a normal tab the button cannot work no matter what
// we do. Rather than showing a switch that silently fails, we say the one sentence
// that fixes it.

import { useCallback, useEffect, useState } from 'react';
import { chimeMuted, setChimeMuted, playNotifyChime } from './notifyChime.js';
import { pushSupport, pushEnabled, enablePush, disablePush } from './pushNotifications.js';

const REASON_COPY = {
  'ios-needs-home-screen': 'On iPhone, notifications only work once Corner is saved to your home screen. Open the share menu and tap "Add to Home Screen", then open Corner from there and turn this on.',
  unsupported: 'This browser does not support notifications.',
  denied: 'Your browser blocked notifications for this site. Turn them back on in the site settings, then try again.',
  'server-not-configured': 'Notifications are not switched on for this server yet.',
  'worker-failed': "Couldn't start the background piece that receives notifications.",
  'store-failed': "Couldn't save this device. Try again in a moment.",
  'unsubscribe-failed': "Couldn't turn it off cleanly.",
};

function Row({ title, detail, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 2px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.45 }}>{detail}</div>
      </div>
      {children}
    </div>
  );
}

function Switch({ on, onClick, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onClick}
      style={{
        width: 44, height: 26, flex: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer',
        borderRadius: 13, border: `1px solid ${on ? 'var(--accent)' : 'var(--hair)'}`,
        background: on ? 'var(--accent)' : 'var(--surface-2)', opacity: disabled ? 0.45 : 1,
        position: 'relative', transition: 'background .16s, border-color .16s',
      }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%',
        background: on ? '#fff' : 'var(--muted)', transition: 'left .16s',
      }} />
    </button>
  );
}

export default function AlertsPanel({ open, onClose, worldId }) {
  const [muted, setMuted] = useState(() => chimeMuted());
  const [support, setSupport] = useState({ ok: false });
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setSupport(pushSupport());
    pushEnabled().then(setPushOn).catch(() => setPushOn(false));
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const togglePush = useCallback(async () => {
    setBusy(true);
    setNote('');
    try {
      if (pushOn) {
        const res = await disablePush();
        if (res.ok) setPushOn(false); else setNote(REASON_COPY[res.reason] || 'That did not work.');
      } else {
        const res = await enablePush(worldId);
        if (res.ok) { setPushOn(true); setNote('This device is set up. You will get a notification the next time an agent messages you.'); }
        else setNote(REASON_COPY[res.reason] || 'That did not work.');
      }
    } finally { setBusy(false); }
  }, [pushOn, worldId]);

  if (!open) return null;

  const blocked = !support.ok;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.34)' }} />
      <div role="dialog" aria-label="Notification settings" data-testid="cv6-alerts-panel"
        style={{
          position: 'fixed', zIndex: 61, top: 64, right: 18, width: 'min(360px, calc(100vw - 28px))',
          background: 'var(--surface, #14161b)', border: '1px solid var(--hair)', borderRadius: 16,
          boxShadow: '0 24px 60px -18px rgba(0,0,0,.7)', padding: '14px 16px 8px', fontFamily: 'var(--font-sans)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>Notifications</span>
          <button type="button" aria-label="Close" onClick={onClose}
            style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
        </div>

        <Row title="Sound in this tab" detail="A short chime when a room gets a new message.">
          <Switch on={!muted} label="Notification sound"
            onClick={() => { const next = !muted; setMuted(next); setChimeMuted(next); if (!next) playNotifyChime(); }} />
        </Row>

        <div style={{ height: 1, background: 'var(--divider, var(--hair))' }} />

        <Row
          title="Notifications on this device"
          detail={blocked
            ? (REASON_COPY[support.reason] || 'Not available in this browser.')
            : 'Get a notification even when Corner is closed.'}>
          <Switch on={pushOn} disabled={blocked || busy} label="Push notifications" onClick={togglePush} />
        </Row>

        {note ? (
          <div style={{ margin: '2px 0 10px', padding: '9px 11px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.5 }}>
            {note}
          </div>
        ) : <div style={{ height: 6 }} />}
      </div>
    </>
  );
}
