import React, { useState, useMemo } from 'react';
import { RoomRow } from './kit/RoomRow.jsx';

// Folder glyph for a project row (matches the design's rooms-rail project rows).
const Folder = (c) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
);

// Map an agent's free-form status onto the kit StatusDot's four states.
function statusFor(a) {
  const s = String(a && a.status || '').toLowerCase();
  if (s.includes('online') || s.includes('active')) return 'online';
  if (s.includes('work') || s.includes('run') || s.includes('draft') || s.includes('busy')) return 'working';
  if (s.includes('block') || s.includes('wait') || s.includes('need') || s.includes('attention')) return 'attention';
  return 'ready';
}

const Eyebrow = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', margin: '4px 6px 8px' }}>{children}</div>
);

/**
 * MobileChatList — the cv6 Chat tool's mobile landing: your CONVERSATIONS list,
 * the design's desktop rooms rail brought to the phone (Patrik 2026-06-21).
 *
 * Composed from the design-system pieces (BUILD-FROM-THE-SYSTEM): the rooms rail
 * layout from the Chat design (a Search rooms field, an Agents group, a Projects
 * group) built out of the kit RoomRow — not hand-drawn. Tapping a row uses the
 * SAME handlers as Home's All Rooms: an assistant opens its chat (onOpenAgent),
 * a project opens the project room (onOpenProject). Back returns home.
 */
export function MobileChatList({ agents = [], projectRooms = [], onOpenAgent, onOpenProject, onBack }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const agentRows = useMemo(() => (agents || []).filter((a) => !q || String(a.name || a.slug || '').toLowerCase().includes(q)), [agents, q]);
  const projectRows = useMemo(() => (projectRooms || []).filter((p) => !q || String(p.name || p.slug || '').toLowerCase().includes(q)), [projectRooms, q]);
  const empty = agentRows.length === 0 && projectRows.length === 0;

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

      {/* search rooms (matches the design rooms-rail search field) */}
      <div style={{ flex: 'none', padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 40, borderRadius: 'var(--radius-control)', background: 'var(--surface-2)', border: '1px solid var(--hair)', padding: '0 13px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rooms…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontFamily: 'var(--font-sans)', fontSize: 14 }} />
        </div>
      </div>

      {/* list — Agents group, then Projects group, each a RoomRow */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 12px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        {empty ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>{(agents.length === 0 && projectRooms.length === 0) ? 'No conversations yet.' : 'No rooms match.'}</div>
        ) : (
          <>
            {agentRows.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <Eyebrow>Agents</Eyebrow>
                {agentRows.map((a, i) => (
                  <RoomRow
                    key={'a' + (a.slug || i)}
                    status={statusFor(a)}
                    name={a.name || a.slug}
                    onClick={() => onOpenAgent && onOpenAgent(a)}
                  />
                ))}
              </div>
            )}
            {projectRows.length > 0 && (
              <div>
                <Eyebrow>Projects</Eyebrow>
                {projectRows.map((p, i) => (
                  <RoomRow
                    key={'p' + (p.slug || i)}
                    leading={Folder(p.color)}
                    name={p.name || p.slug}
                    count={(p.tasks && p.tasks.length) || p.count || null}
                    chevron
                    onClick={() => onOpenProject && onOpenProject(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MobileChatList;
