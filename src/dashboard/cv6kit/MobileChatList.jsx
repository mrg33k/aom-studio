import React, { useState, useMemo } from 'react';

/**
 * MobileChatList — the cv6 Chat tool's mobile landing: your CONVERSATIONS list.
 *
 * Built from the design system (BUILD-FROM-THE-SYSTEM): a verbatim translation of
 * `ui_kits/mobile/chat-list.html` — the canonical mobile header (.mhdr), an Agents
 * section then a Projects section of rich rows (avatar + real status dot + status
 * chip + a status line), using the ported shell classes in cv6-frame.css. Sample
 * activity snippets and timestamps from the design are NOT faked: each row shows
 * the agent's REAL status (working / attention / ready) as the dot, the chip, and a
 * truthful one-line descriptor. Tapping a row uses the SAME handlers as Home's All
 * Rooms (Patrik 2026-06-21): an assistant opens its live chat (onOpenAgent), a
 * project opens the project room (onOpenProject). The header menu returns home.
 * Future enrichment: wire useRunningJobs so a live agent's row shows its real job.
 */

// Stable identity hue for an avatar (decorative, like Slack/Gmail — not data).
const HUES = [
  { bg: 'rgba(91,155,255,.18)', fg: 'var(--accent)' },
  { bg: 'rgba(139,124,246,.22)', fg: 'var(--violet-400)' },
  { bg: 'rgba(244,114,182,.18)', fg: 'var(--pink-400)' },
  { bg: 'rgba(52,211,153,.20)', fg: 'var(--success)' },
  { bg: 'rgba(251,191,36,.20)', fg: 'var(--warn)' },
];
function hueFor(key) {
  const s = String(key || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}
function initials(name) {
  const p = String(name || '').trim().split(/\s+/).filter(Boolean);
  // Two-letter monogram, matching the design (EL, RX, GA): two words -> initials,
  // one word -> its first two letters.
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return (p[0] || String(name || '?')).slice(0, 2).toUpperCase();
}

// Map an agent's free-form status onto the fixed vocabulary: live / blocked / ready.
function statusKind(a) {
  const v = String((a && a.status) || '').toLowerCase();
  if (v.includes('work') || v.includes('run') || v.includes('active') || v.includes('live') || v.includes('busy') || v.includes('draft')) return 'live';
  if (v.includes('block') || v.includes('attention') || v.includes('need') || v.includes('wait')) return 'blocked';
  return 'ready';
}
const CHIP = { live: 'LIVE', blocked: 'NEEDS YOU', ready: 'READY' };

// A truthful one-line descriptor (no fabricated activity — restates real state).
function snippetFor(a, kind) {
  if (a && a.is_ea) return kind === 'blocked' ? 'Needs your input' : kind === 'live' ? 'Working now' : 'Your assistant';
  return kind === 'blocked' ? 'Needs your input' : kind === 'live' ? 'Working now' : 'Ready';
}

const Folder = (c) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
);
function projectCount(p) {
  return (p && p.tasks && p.tasks.length) || (p && p.count) || (p && p.missions && p.missions.length) || 0;
}

export function MobileChatList({ agents = [], projectRooms = [], onOpenAgent, onOpenProject, onBack, onMenu }) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const q = query.trim().toLowerCase();

  const agentRows = useMemo(
    () => (agents || []).filter((a) => !q || String(a.name || a.slug || '').toLowerCase().includes(q)),
    [agents, q]
  );
  const projectRows = useMemo(
    () => (projectRooms || []).filter((p) => !q || String(p.name || p.slug || '').toLowerCase().includes(q)),
    [projectRooms, q]
  );
  const empty = agentRows.length === 0 && projectRows.length === 0;

  // Header sub-line, from REAL statuses.
  const liveCount = (agents || []).filter((a) => statusKind(a) === 'live').length;
  const needsCount = (agents || []).filter((a) => statusKind(a) === 'blocked').length;
  const total = (agents || []).length + (projectRooms || []).length;
  const sub = needsCount > 0
    ? `${liveCount} live · ${needsCount} needs you`
    : liveCount > 0
      ? `${liveCount} live`
      : `${(agents || []).length} ${(agents || []).length === 1 ? 'agent' : 'agents'}`;

  const Eyebrow = ({ children, n }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 6px' }}>
      <span className="eyebrow">{children}</span>
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{n}</span>
    </div>
  );

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)', overflow: 'hidden' }}>
      {/* Canonical mobile header (chat-list.html): .mback left · .mhtitle · .mhactions (search then menu LAST) */}
      <div className="mhdr" style={{ height: 'auto', minHeight: 60, boxSizing: 'border-box', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mback" role="button" tabIndex={0} aria-label="Back" onClick={onBack}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </div>
        <div className="mhtitle">
          <div className="mttl">Chat</div>
          <div className="msub">{sub}</div>
        </div>
        <div className="mhactions">
          <div className="ib" role="button" tabIndex={0} aria-label="Search" onClick={() => setSearchOpen((v) => !v)} style={{ color: searchOpen ? 'var(--accent)' : undefined }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </div>
          <div className="ib" role="button" tabIndex={0} aria-label="Menu" onClick={onMenu || onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </div>
        </div>
      </div>

      {/* search field (revealed by the header search icon — real filter) */}
      {searchOpen && (
        <div style={{ flex: 'none', padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 40, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--hair)', padding: '0 13px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rooms…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontFamily: 'var(--font-sans)', fontSize: 14 }} />
          </div>
        </div>
      )}

      {/* list */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
        {empty ? (
          <div className="empty" style={{ paddingTop: 64 }}>
            <div className="e-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
            <div className="e-t">{(agents.length === 0 && projectRooms.length === 0) ? 'No conversations yet' : 'No rooms match'}</div>
            <div className="e-s">{(agents.length === 0 && projectRooms.length === 0) ? 'Your agents and project rooms will show up here.' : 'Try a different search.'}</div>
          </div>
        ) : (
          <>
            {agentRows.length > 0 && (
              <>
                <Eyebrow n={agentRows.length}>Agents</Eyebrow>
                {agentRows.map((a, i) => {
                  const kind = statusKind(a);
                  const hue = hueFor(a.slug || a.name || i);
                  return (
                    <div key={'a' + (a.slug || i)} onClick={() => onOpenAgent && onOpenAgent(a)} role="button" tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}>
                      <div style={{ position: 'relative', flex: 'none' }}>
                        <div className="av" style={{ width: 42, height: 42, fontSize: 14, background: hue.bg, color: hue.fg }}>{initials(a.name || a.slug)}</div>
                        <span className={`sdot is-${kind}`} style={{ position: 'absolute', bottom: -1, right: -1, border: '2px solid var(--ground)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{a.name || a.slug}</span>
                          <span className={`astat is-${kind}`}><span className="sd" />{CHIP[kind]}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{snippetFor(a, kind)}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {projectRows.length > 0 && (
              <>
                <Eyebrow n={projectRows.length}>Projects</Eyebrow>
                {projectRows.map((p, i) => {
                  const count = projectCount(p);
                  return (
                    <div key={'p' + (p.slug || i)} onClick={() => onOpenProject && onOpenProject(p)} role="button" tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: 'var(--accent-weak)' }}>
                        {Folder(p.color || 'var(--accent)')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || p.slug}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{count > 0 ? `${count} ${count === 1 ? 'item' : 'items'}` : 'Project room'}</div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MobileChatList;
