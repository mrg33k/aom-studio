import React, { useState, useMemo } from 'react';

// Folder glyph for a project row (matches the rest of the cv6 mobile app).
const FOLDER = (c) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
);

function dot(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('online') || s.includes('active') || s.includes('working') || s.includes('run')) return 'var(--success)';
  if (s.includes('block') || s.includes('wait') || s.includes('need')) return 'var(--warn)';
  return 'var(--faint)';
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).map((w) => w[0] || '').slice(0, 2).join('').toUpperCase() || '?';
}

/**
 * MobileChatList — the cv6 Chat tool's mobile landing (Patrik 2026-06-21): your
 * CONVERSATIONS list (your assistants with a status dot, then your project rooms
 * with their activity), the design's desktop rooms rail brought to the phone. Tap
 * one to open that conversation (the live chat). Back returns home. Additive and
 * mobile-only; the live chat surface itself is untouched.
 */
export function MobileChatList({ agents = [], projectRooms = [], onOpen, onBack }) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => [
    ...(agents || []).map((a) => ({ kind: 'agent', raw: a, name: a.name || a.slug, status: a.status })),
    ...(projectRooms || []).map((p) => ({ kind: 'project', raw: p, name: p.name || p.slug, color: p.color, count: (p.tasks && p.tasks.length) || p.count || 0 })),
  ], [agents, projectRooms]);
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => (r.name || '').toLowerCase().includes(q)) : rows;

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)', overflow: 'hidden' }}>
      {/* status bar */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 16px 12px', fontSize: 15, fontWeight: 600 }}>
        <span>9:41</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>Corner</span>
      </div>

      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px 14px' }}>
        {onBack && (
          <button onClick={onBack} aria-label="Back" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none', marginLeft: -2 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>Chat</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>Your conversations</div>
        </div>
      </div>

      {/* search */}
      <div style={{ flex: 'none', padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 40, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--hair)', padding: '0 13px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontFamily: 'var(--font-sans)', fontSize: 14 }} />
        </div>
      </div>

      {/* list */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        {shown.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>{rows.length === 0 ? 'No conversations yet.' : 'No conversations match.'}</div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, overflow: 'hidden' }}>
            {shown.map((r, i) => (
              <button
                key={(r.kind === 'agent' ? 'a' : 'p') + (r.raw.slug || i)}
                onClick={() => onOpen && onOpen(r.kind === 'agent' ? { type: 'agent', slug: r.raw.slug, name: r.name } : { type: 'project', slug: r.raw.slug, name: r.name })}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--divider)', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
              >
                {r.kind === 'agent' ? (
                  <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', position: 'relative', fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                    {initials(r.name)}
                    <span style={{ position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: '50%', background: dot(r.status), border: '2px solid var(--ground)' }} />
                  </span>
                ) : (
                  <span style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{FOLDER(r.color)}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{r.kind === 'agent' ? 'Assistant' : (r.count ? `${r.count} updates` : 'Project chat')}</div>
                </div>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M9 18l6-6-6-6" /></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileChatList;
