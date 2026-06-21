import React, { useState, useEffect } from 'react';
import { authFetch } from '../lib/authFetch.js';

// Folder glyph (matches the kit Home + design FRAME 3 "Project opened" header).
const FOLDER = (c, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
);

function relTime(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!t) return null;
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return Math.floor(s / 604800) + 'w';
}

// Map a mission's real status onto the design's three badges (LIVE / READY / DONE).
// LIVE only when an agent is actually running — never blanket-green every open mission.
function badgeFor(m) {
  const v = String(m.status || '').toLowerCase();
  const done = m.is_done || v === 'done' || v === 'complete' || v === 'completed';
  const live = v === 'running' || v === 'building' || v === 'active';
  if (live) return { label: 'LIVE', dot: 'var(--success)', glow: 'var(--glow-online)', fg: 'var(--success)', bg: 'var(--success-weak)' };
  if (done) return { label: 'DONE', dot: 'var(--accent)', glow: 'none', fg: 'var(--accent)', bg: 'var(--accent-weak)' };
  return { label: 'READY', dot: 'var(--faint)', glow: 'none', fg: 'var(--muted)', bg: 'var(--chip)' };
}

/**
 * CV6 mobile "Project opened, missions inside" view (design system FRAME 3).
 * Tapping a room on the mobile Home opens this instead of jumping straight to
 * chat: a project header, a "talk to the whole project" chat button, the real
 * list of missions inside (live from /api/dashboard/missions-tree), and a New
 * mission button. Every row is wired:
 *   onBack         → back to Home
 *   onOpenChat     → the project's general chat (the old room-tap behaviour)
 *   onOpenMission  → that mission's room
 *   onNewMission   → the real create-mission flow
 */
export function MobileProjectWired({ project, worldId, sampleMissions, onBack, onOpenChat, onOpenMission, onNewMission }) {
  const [missions, setMissions] = useState(sampleMissions || null); // null = loading, [] = loaded-empty
  const color = project?.color || 'var(--violet-400)';
  const name = project?.name || project?.slug || 'Project';

  useEffect(() => {
    // Preview harness (/cv6kit?screen=project) passes sampleMissions to render
    // the design with no auth; the live CornerVG mount omits it and fetches real.
    if (sampleMissions) { setMissions(sampleMissions); return; }
    let alive = true;
    setMissions(null);
    if (!project?.slug || !worldId) { setMissions([]); return; }
    (async () => {
      try {
        const res = await authFetch('/api/dashboard/missions-tree?client=' + encodeURIComponent(worldId), { credentials: 'include' });
        if (!res.ok) { if (alive) setMissions([]); return; }
        const j = await res.json().catch(() => null);
        const proj = j && Array.isArray(j.projects) ? j.projects.find(p => p?.slug === project.slug) : null;
        const list = (proj?.missions || []).map(m => {
          const tasks = m.tasks || [];
          const running = tasks.find(t => ['running', 'building', 'active'].includes(t.status));
          const hasQueued = tasks.some(t => ['queued', 'planning', 'classifying'].includes(t.status));
          const agent = (running && running.agent) || (tasks.find(t => t.agent)?.agent) || null;
          return {
            slug: m.raw_slug || m.slug,
            name: m.name || m.raw_slug || m.slug,
            last_message_at: m.last_message_at || m.last_updated || null,
            is_done: !!m.is_done,
            status: running ? 'running' : hasQueued ? 'queued' : (m.status || 'idle'),
            agent,
          };
        });
        list.sort((a, b) => {
          if (a.last_message_at && b.last_message_at) return new Date(b.last_message_at) - new Date(a.last_message_at);
          if (a.last_message_at) return -1;
          if (b.last_message_at) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
        if (alive) setMissions(list);
      } catch (_) { if (alive) setMissions([]); }
    })();
    return () => { alive = false; };
  }, [project?.slug, worldId]);

  const count = missions ? missions.length : null;

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, width: '100%', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'absolute', inset: 0, top: 'env(safe-area-inset-top, 0px)', display: 'flex', flexDirection: 'column' }}>

        {/* Header: back chevron · folder · name + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px 12px' }}>
          <button aria-label="Back to home" onClick={() => onBack && onBack()} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{FOLDER(color, 18)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Project{count != null ? ` · ${count} mission${count === 1 ? '' : 's'}` : ''}</div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 16px calc(env(safe-area-inset-bottom, 0px) + 28px)' }}>

          {/* General project chat */}
          <button onClick={() => onOpenChat && onOpenChat(project)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 14, border: '1px solid var(--accent-weak)', background: 'linear-gradient(180deg, var(--accent-weak), transparent)', marginBottom: 18, textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{FOLDER(color, 18)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>General project chat · talk to the whole project</div>
            </div>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M9 18l6-6-6-6" /></svg>
          </button>

          {/* Missions inside */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 2px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Missions inside</span>
            {count != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }}>{count}</span>}
          </div>

          {missions == null ? (
            <div style={{ padding: '14px 12px', color: 'var(--faint)', fontSize: 13 }}>Loading missions…</div>
          ) : missions.length === 0 ? (
            <div style={{ padding: '14px 12px', color: 'var(--faint)', fontSize: 13 }}>No missions yet. Start one below.</div>
          ) : (
            missions.map((m) => {
              const b = badgeFor(m);
              const sub = m.agent || relTime(m.last_message_at) || 'recently';
              return (
                <button key={m.slug} onClick={() => onOpenMission && onOpenMission(project, m)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 10, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.dot, boxShadow: b.glow, flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: b.fg, background: b.bg, padding: '3px 8px', borderRadius: 7, flex: 'none' }}>{b.label}</span>
                </button>
              );
            })
          )}

          {/* New mission */}
          <button onClick={() => onNewMission && onNewMission(project)} style={{ width: '100%', height: 40, marginTop: 8, borderRadius: 10, border: '1px dashed var(--hair)', background: 'transparent', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New mission
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileProjectWired;
