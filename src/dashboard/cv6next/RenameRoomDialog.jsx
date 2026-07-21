import React, { useEffect, useRef, useState } from 'react';
import { authFetch } from '../lib/authFetch';
import { titleForAgent } from './data/agentTitles.js';

function bareMission(room) {
  return String(room?.missionSlug || room?.id || '').split(':').pop();
}

export default function RenameRoomDialog({ room, worldId, onClose, onRenamed }) {
  const [title, setTitle] = useState(room?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const isAgent = !room?.isProject && !room?.isMission;

  useEffect(() => {
    const t = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 20);
    return () => clearTimeout(t);
  }, []);

  const save = async (e) => {
    e?.preventDefault?.();
    const next = title.replace(/\s+/g, ' ').trim();
    if (!next) { setError('Give the chat a name.'); return; }
    if (next.length > 80) { setError('Keep the name to 80 characters or fewer.'); return; }
    setBusy(true); setError('');
    try {
      let url = '/api/dashboard/room-title';
      let body = { client_id: worldId, agent: room.id, title: next };
      if (room.isProject && !room.isMission) {
        url = '/api/dashboard/project-update';
        body = { client_id: worldId, slug: room.id, name: next };
      } else if (room.isMission) {
        url = '/api/dashboard/mission-update';
        body = { client_id: worldId, project_slug: room.projectSlug, mission_slug: bareMission(room), name: next, path: room.path || undefined };
      }
      const r = await authFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) throw new Error(d?.error || 'Could not rename this chat.');
      onRenamed?.(next, { reset: false });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not rename this chat.');
    } finally { setBusy(false); }
  };

  const reset = async () => {
    setBusy(true); setError('');
    try {
      const r = await authFetch('/api/dashboard/room-title', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, agent: room.id }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) throw new Error(d?.error || 'Could not reset this name.');
      onRenamed?.(room.specialistTitle || titleForAgent(room.id), { reset: true });
      onClose?.();
    } catch (err) { setError(err?.message || 'Could not reset this name.'); }
    finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rename-chat-title" data-testid="rename-chat-dialog"
      style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'grid', placeItems: 'center', padding: 18 }}>
      <button type="button" aria-label="Close rename dialog" onClick={onClose}
        style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(0,0,0,.66)', backdropFilter: 'blur(5px)' }} />
      <form onSubmit={save} style={{ position: 'relative', width: 'min(430px, 100%)', border: '1px solid var(--hair)', borderRadius: 18, background: 'var(--surface)', boxShadow: '0 28px 80px rgba(0,0,0,.55)', padding: 20 }}>
        <div id="rename-chat-title" style={{ color: 'var(--fg)', fontSize: 18, fontWeight: 700 }}>Rename chat</div>
        <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.45, marginTop: 5 }}>
          {isAgent ? `Give this conversation a useful name. ${room.specialistTitle || titleForAgent(room.id)} stays the specialist behind it.` : 'This changes the display name; the room and its history stay intact.'}
        </div>
        <label htmlFor="rename-chat-input" className="eyebrow" style={{ display: 'block', marginTop: 18, marginBottom: 7 }}>Chat name</label>
        <input id="rename-chat-input" ref={inputRef} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} disabled={busy}
          style={{ width: '100%', height: 44, boxSizing: 'border-box', borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', padding: '0 12px', font: '500 14px var(--font-sans)', outline: 'none' }} />
        {error ? <div role="alert" style={{ color: '#fb7185', fontSize: 12, marginTop: 9 }}>{error}</div> : null}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 18 }}>
          <div>{isAgent && room.hasCustomTitle ? <button type="button" onClick={reset} disabled={busy} style={{ border: 0, background: 'transparent', color: 'var(--muted)', font: '600 12px var(--font-sans)', cursor: 'pointer', padding: 6 }}>Reset to specialist</button> : null}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={busy} style={{ height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={busy} style={{ height: 38, padding: '0 16px', borderRadius: 10, border: 0, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Saving…' : 'Save name'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
